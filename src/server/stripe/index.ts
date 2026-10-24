import Stripe from "stripe";
import { eq } from "drizzle-orm";
import { db } from "~/server/db";
import { payoutAccount } from "~/server/db/schema";

let client: Stripe | undefined;

/**
 * Created on first use, not at import time: `next build` imports route files
 * in an environment that has no secrets, and must not fail because of that.
 */
function getStripe(): Stripe {
  if (!client) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
    client = new Stripe(key);
  }
  return client;
}

// Same `stripe.accounts.create(...)` call style as before, but lazy.
export const stripe = new Proxy({} as Stripe, {
  get: (_target, prop) => Reflect.get(getStripe(), prop) as unknown,
});

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
