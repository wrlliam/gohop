import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { stripe, syncPayoutAccount } from "~/server/stripe";

export const runtime = "nodejs";

/**
 * Create this endpoint in Stripe as a *Connect* webhook ("Listen to events on
 * Connected accounts") and subscribe to `account.updated`.
 * Your middleware must leave this path public: Stripe authenticates via the signature.
 */
export async function POST(req: NextRequest) {
  const signature = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !secret) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    // Must be the raw body, not parsed JSON.
    event = stripe.webhooks.constructEvent(await req.text(), signature, secret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "account.updated") {
    await syncPayoutAccount(event.data.object.id);
  }

  return NextResponse.json({ received: true });
}
