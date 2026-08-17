import { NextRequest } from "next/server";
import { db } from "lib/db";
import { getCurrentUser } from "lib/auth";
import { ok, fail, ApiError } from "lib/api";
import { isStripeConfigured, getStripe } from "lib/stripe";

// POST /api/billing (legacy — now handled by /api/billing/checkout)
// Redirects to the new endpoint for backward compatibility.
// DELETE /api/billing — cancel subscription (direct DB update for demo,
// or redirect to Stripe portal for real Stripe).
export async function DELETE() {
  try {
    const user = await getCurrentUser();
    if (!user) throw new ApiError("UNAUTHORIZED", "Sign in first.", 401);

    // In demo mode, cancel directly in DB
    if (!isStripeConfigured() || !user.stripeSubId || user.stripeSubId.startsWith("sub_demo_")) {
      const updated = await db.user.update({
        where: { id: user.id },
        data: { planTier: "free", planStatus: "active", stripeSubId: null },
        select: { planTier: true, planStatus: true },
      });
      await db.notification.create({
        data: { userId: user.id, type: "billing", title: "Subscription canceled", body: "You've been downgraded to the Free plan." },
      });
      await db.activityLog.create({ data: { userId: user.id, action: "billing.cancel" } });
      return ok({ subscription: updated });
    }

    // Real Stripe: cancel via API
    const stripe = getStripe();
    if (user.stripeSubId) {
      await stripe.subscriptions.cancel(user.stripeSubId);
    }
    const updated = await db.user.update({
      where: { id: user.id },
      data: { planStatus: "canceled" },
      select: { planTier: true, planStatus: true },
    });
    await db.notification.create({
      data: { userId: user.id, type: "billing", title: "Subscription canceled", body: "You'll keep access until the end of your billing cycle." },
    });
    await db.activityLog.create({ data: { userId: user.id, action: "billing.cancel" } });
    return ok({ subscription: updated });
  } catch (e) {
    return fail(e);
  }
}
