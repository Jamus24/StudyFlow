import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ok, fail, ApiError } from "@/lib/api";
import { getStripe, isStripeConfigured, getPriceId, PRICE_LOOKUP } from "@/lib/stripe";

// POST /api/billing/checkout
// Creates a Stripe Checkout Session and returns its URL.
// Falls back to demo mode (direct DB update) if Stripe keys are not configured.
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const { priceId } = await req.json().catch(() => ({}));

    const priceConfig = PRICE_LOOKUP[priceId];
    if (!priceConfig) throw new ApiError("BAD_PRICE", "Unknown plan.", 400);

    // ---- DEMO MODE (no Stripe keys) ----
    if (!isStripeConfigured()) {
      const updated = await db.user.update({
        where: { id: user.id },
        data: {
          planTier: priceConfig.tier,
          planStatus: "active",
          stripeCustomerId: `cust_demo_${user.id}`,
          stripeSubId: `sub_demo_${user.id}_${Date.now()}`,
        },
        select: { planTier: true, planStatus: true },
      });
      await db.notification.create({
        data: {
          userId: user.id,
          type: "billing",
          title: "Plan upgraded (demo)",
          body: `You're now on ${priceConfig.label}. No real charges — Stripe is not configured.`,
          link: "billing",
        },
      });
      await db.activityLog.create({ data: { userId: user.id, action: "billing.upgrade", meta: priceConfig.label } });
      return ok({ mode: "demo", subscription: updated, label: priceConfig.label });
    }

    // ---- REAL STRIPE MODE ----
    const stripe = getStripe();
    const stripePriceId = getPriceId(priceConfig.tier, priceConfig.interval);
    if (!stripePriceId) {
      throw new ApiError(
        "CONFIG_ERROR",
        `Stripe price ID for ${priceConfig.label} is not configured. Set STRIPE_${priceConfig.tier.toUpperCase()}_${priceConfig.interval.toUpperCase()} in .env.local.`,
        500
      );
    }

    // Get or create Stripe customer
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: { userId: user.id },
      });
      customerId = customer.id;
      await db.user.update({ where: { id: user.id }, data: { stripeCustomerId: customerId } });
    }

    const origin = req.headers.get("origin") || process.env.NEXT_PUBLIC_URL || "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: stripePriceId, quantity: 1 }],
      success_url: `${origin}/?billing=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?billing=canceled`,
      subscription_data: {
        trial_period_days: priceConfig.tier === "pro" ? 14 : undefined,
        metadata: {
          userId: user.id,
          tier: priceConfig.tier,
        },
      },
      allow_promotion_codes: true,
    });

    await db.activityLog.create({
      data: { userId: user.id, action: "billing.checkout_created", meta: priceConfig.label },
    });

    return ok({ mode: "stripe", url: session.url, sessionId: session.id });
  } catch (e) {
    return fail(e);
  }
}
