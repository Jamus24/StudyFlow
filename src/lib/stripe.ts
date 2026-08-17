import Stripe from "stripe";

/**
 * Lumina Stripe integration.
 *
 * SETUP (one-time):
 * 1. Create a Stripe account at https://dashboard.stripe.com/register
 * 2. Create 4 Price objects in Stripe Dashboard → Products:
 *    - Pro Monthly   → price ID stored in env STRIPE_PRO_MONTHLY
 *    - Pro Yearly    → price ID stored in env STRIPE_PRO_YEARLY
 *    - Scholar Monthly → price ID stored in env STRIPE_SCHOLAR_MONTHLY
 *    - Scholar Yearly  → price ID stored in env STRIPE_SCHOLAR_YEARLY
 * 3. Add your keys to .env.local (see below)
 * 4. Add the webhook endpoint URL in Stripe Dashboard → Developers → Webhooks:
 *    https://your-domain.com/api/billing/webhook
 *    Events: customer.subscription.created, customer.subscription.updated,
 *            customer.subscription.deleted, checkout.session.completed,
 *            invoice.payment_failed
 * 5. Set STRIPE_WEBHOOK_SECRET to the signing secret Stripe gives you
 */

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set. Add it to .env.local");
  _stripe = new Stripe(key, { apiVersion: "2025-04-30.basil" });
  return _stripe;
}

/** Whether Stripe is configured (has keys) or running in demo/stub mode */
export function isStripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

// ---- Price ID helpers ----

export function getPriceId(planTier: string, interval: string): string | null {
  const map: Record<string, Record<string, string | undefined>> = {
    pro: {
      monthly: process.env.STRIPE_PRO_MONTHLY,
      yearly: process.env.STRIPE_PRO_YEARLY,
    },
    scholar: {
      monthly: process.env.STRIPE_SCHOLAR_MONTHLY,
      yearly: process.env.STRIPE_SCHOLAR_YEARLY,
    },
  };
  return map[planTier]?.[interval] ?? null;
}

export const PRICE_LOOKUP: Record<string, { tier: string; interval: string; label: string }> = {
  pro_monthly: { tier: "pro", interval: "monthly", label: "Pro · monthly" },
  pro_yearly: { tier: "pro", interval: "yearly", label: "Pro · yearly" },
  scholar_monthly: { tier: "scholar", interval: "monthly", label: "Scholar · monthly" },
  scholar_yearly: { tier: "scholar", interval: "yearly", label: "Scholar · yearly" },
};

// ---- Plan metadata stored on Stripe products ----

export function tierFromSubscription(sub: Stripe.Subscription): string {
  // The plan tier is encoded in the product metadata or price lookup
  const priceId = sub.items.data[0]?.price?.id;
  if (!priceId) return "free";
  for (const [key, val] of Object.entries(PRICE_LOOKUP)) {
    if (getPriceId(val.tier, val.interval) === priceId) return val.tier;
  }
  // Fallback: check metadata on the price
  const meta = sub.items.data[0]?.price?.metadata;
  if (meta?.tier === "pro" || meta?.tier === "scholar") return meta.tier;
  return "free";
}

export function subscriptionStatus(stripeStatus: string): string {
  const map: Record<string, string> = {
    active: "active",
    trialing: "trialing",
    past_due: "past_due",
    canceled: "canceled",
    unpaid: "past_due",
    paused: "canceled",
  };
  return map[stripeStatus] || "active";
}
