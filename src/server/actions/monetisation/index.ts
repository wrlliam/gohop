"use server";

// NOTE: every export from a "use server" file is a publicly callable endpoint.
// Keep helpers (syncPayoutAccount, queries, etc.) in other files.

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq, lte, sql } from "drizzle-orm";

import { auth } from "~/server/better-auth";
import { db } from "~/server/db";
import {
  ledgerEntry,
  payout,
  payoutAccount,
  redirects,
} from "~/server/db/schema";
import { stripe } from "~/server/stripe";
import { getSettings } from "~/server/monitisation/queries";

type Result = { ok: true; message?: string } | { ok: false; error: string };

async function requireUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Not signed in");
  return session.user;
}

const appUrl = () => process.env.APP_URL ?? "http://localhost:3000";

// Must match the route folder of the page (src/app/app/<this>/page.tsx).
const PAGE_PATH = "/app/monitization";

/** Turn monetisation (ads + billable views) on or off for one of your links. */
export async function setLinkMonetisation(
  linkId: number,
  enabled: boolean,
): Promise<Result> {
  const user = await requireUser();

  const updated = await db
    .update(redirects)
    .set({ monetisationEnabled: enabled })
    .where(and(eq(redirects.id, linkId), eq(redirects.createdById, user.id)))
    .returning({ id: redirects.id });

  if (updated.length === 0) return { ok: false, error: "Link not found." };

  revalidatePath(PAGE_PATH);
  return { ok: true };
}

/** Create the Stripe Express account if needed, then send the user to onboarding. */
export async function startStripeOnboarding(): Promise<void> {
  const user = await requireUser();

  let account = await db.query.payoutAccount.findFirst({
    where: eq(payoutAccount.userId, user.id),
  });

  if (!account) {
    const created = await stripe.accounts.create(
      {
        type: "express",
        email: user.email,
        capabilities: { transfers: { requested: true } },
        // Prefilled info isn't asked for again during onboarding.
        business_profile: {
          product_description:
            "Earns a share of advertising revenue from short links shared on goHop.",
        },
        // Individuals only: Stripe then skips the company questions entirely.
        business_type: "individual",
        individual: { email: user.email },
        metadata: { userId: user.id },
      },
      // Bump the suffix if you change these parameters (Stripe rejects a reused
      // key with different parameters for ~24h).
      { idempotencyKey: `connect_account_v4_${user.id}` },
    );

    await db
      .insert(payoutAccount)
      .values({ userId: user.id, stripeAccountId: created.id })
      .onConflictDoNothing();

    account = await db.query.payoutAccount.findFirst({
      where: eq(payoutAccount.userId, user.id),
    });
  }

  const link = await stripe.accountLinks.create({
    account: account!.stripeAccountId,
    type: "account_onboarding",
    refresh_url: `${appUrl()}${PAGE_PATH}?stripe=refresh`,
    return_url: `${appUrl()}${PAGE_PATH}?stripe=return`,
  });

  redirect(link.url); // must stay outside any try/catch
}

/** Opens the Stripe Express dashboard (bank details, payout history, tax forms). */
export async function openStripeDashboard(): Promise<void> {
  const user = await requireUser();
  const account = await db.query.payoutAccount.findFirst({
    where: eq(payoutAccount.userId, user.id),
  });
  if (!account) redirect(PAGE_PATH);

  const login = await stripe.accounts.createLoginLink(account.stripeAccountId);
  redirect(login.url);
}

/**
 * Withdraws the user's whole available balance (minus the flat withdrawal fee).
 * Funds are reserved in the ledger first, then the Stripe transfer is made with
 * an idempotency key, so a retry can never pay out twice.
 */
export async function requestWithdrawal(): Promise<Result> {
  const user = await requireUser();
  const settings = await getSettings();

  const account = await db.query.payoutAccount.findFirst({
    where: eq(payoutAccount.userId, user.id),
  });
  if (!account?.payoutsEnabled) {
    return { ok: false, error: "Finish setting up Stripe before withdrawing." };
  }

  // 1) Reserve the funds atomically.
  const reserved = await db.transaction(async (tx) => {
    const inFlight = await tx.query.payout.findFirst({
      where: and(eq(payout.userId, user.id), eq(payout.status, "processing")),
    });
    if (inFlight)
      return { error: "You already have a withdrawal in progress." };

    const [bal] = await tx
      .select({
        total: sql<number>`coalesce(sum(${ledgerEntry.amountMinor}), 0)`,
      })
      .from(ledgerEntry)
      .where(
        and(
          eq(ledgerEntry.userId, user.id),
          lte(ledgerEntry.availableAt, new Date()),
        ),
      );

    const available = Number(bal?.total ?? 0);
    const fee = settings.withdrawalFeeMinor;
    const receives = available - fee;

    if (available < settings.minWithdrawalMinor || receives <= 0) {
      return {
        error: "Your available balance is below the minimum withdrawal.",
      };
    }

    const [row] = await tx
      .insert(payout)
      .values({
        userId: user.id,
        amountMinor: receives,
        feeMinor: fee,
        currency: settings.currency,
      })
      .returning();

    const now = new Date();
    await tx.insert(ledgerEntry).values([
      {
        userId: user.id,
        payoutId: row!.id,
        type: "withdrawal",
        amountMinor: -receives,
        availableAt: now,
      },
      {
        userId: user.id,
        payoutId: row!.id,
        type: "withdrawal_fee",
        amountMinor: -fee,
        availableAt: now,
      },
    ]);

    return { payout: row! };
  });

  if ("error" in reserved) return { ok: false, error: reserved.error! };
  const p = reserved.payout;

  // 2) Move the money. The platform's Stripe balance must hold enough funds.
  try {
    const transfer = await stripe.transfers.create(
      {
        amount: p.amountMinor,
        currency: p.currency,
        destination: account.stripeAccountId,
        transfer_group: `payout_${p.id}`,
        metadata: { payoutId: String(p.id), userId: user.id },
      },
      { idempotencyKey: `payout_${p.id}` },
    );

    await db
      .update(payout)
      .set({
        status: "sent",
        stripeTransferId: transfer.id,
        completedAt: new Date(),
      })
      .where(eq(payout.id, p.id));
  } catch (e) {
    // 3) Failed: give the money back with reversing ledger rows.
    const reason =
      e instanceof Error ? e.message.slice(0, 500) : "Transfer failed";
    const now = new Date();
    await db.transaction(async (tx) => {
      await tx
        .update(payout)
        .set({ status: "failed", failureReason: reason, completedAt: now })
        .where(eq(payout.id, p.id));
      await tx.insert(ledgerEntry).values([
        {
          userId: user.id,
          payoutId: p.id,
          type: "reversal",
          amountMinor: p.amountMinor,
          availableAt: now,
          note: "Withdrawal failed",
        },
        {
          userId: user.id,
          payoutId: p.id,
          type: "reversal",
          amountMinor: p.feeMinor,
          availableAt: now,
          note: "Withdrawal fee refunded",
        },
      ]);
    });
    const insufficient =
      (e as { code?: string }).code === "balance_insufficient";
    if (insufficient)
      console.error("Platform balance too low for payout", p.id);
    revalidatePath(PAGE_PATH);
    return {
      ok: false,
      error: insufficient
        ? "Withdrawals are temporarily delayed. Your balance is safe; try again later."
        : "The transfer failed. Your balance has been restored.",
    };
  }

  revalidatePath(PAGE_PATH);
  return { ok: true, message: "Withdrawal sent to your Stripe account." };
}
