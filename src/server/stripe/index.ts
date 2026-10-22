import Stripe from "stripe";
import { eq } from "drizzle-orm";
import { db } from "~/server/db";
import { payoutAccount } from "~/server/db/schema";
import { env } from "~/env";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is not set");
}

export const stripe = new Stripe(env.STRIPE_SECRET_KEY);

/**
 * Pull the connected account's current state from Stripe into our DB.
 * Called from the webhook and when the user returns from onboarding.
 * (Not a server action: this file has no "use server".)
 */
export async function syncPayoutAccount(stripeAccountId: string) {
  const acct = await stripe.accounts.retrieve(stripeAccountId);
  const transfersActive = acct.capabilities?.transfers === "active";

  await db
    .update(payoutAccount)
    .set({
      detailsSubmitted: acct.details_submitted ?? false,
      payoutsEnabled: transfersActive && (acct.payouts_enabled ?? false),
    })
    .where(eq(payoutAccount.stripeAccountId, stripeAccountId));
}
