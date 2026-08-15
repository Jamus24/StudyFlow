import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, fail, ApiError } from "@/lib/api";

const PRICES: Record<string, { tier: string; label: string }> = {
  pro_monthly: { tier: "pro", label: "Pro · monthly" },
  pro_yearly: { tier: "pro", label: "Pro · yearly" },
  scholar_monthly: { tier: "scholar", label: "Scholar · monthly" },
  scholar_yearly: { tier: "scholar", label: "Scholar · yearly" },
};

// NOTE: This stubs a Stripe checkout. In production, create a Stripe
// Checkout Session here and return its URL. We record the upgrade
// locally so the experience is fully functional in this environment.
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new ApiError("UNAUTHORIZED", "Sign in first.", 401);
    const { priceId } = await req.json().catch(() => ({}));
    const price = PRICES[priceId];
    if (!price) throw new ApiError("BAD_PRICE", "Unknown plan.", 400);

    const updated = await db.user.update({
      where: { id: user.id },
      data: {
        planTier: price.tier,
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
        title: "Plan upgraded",
        body: `You're now on ${price.label}.`,
        link: "billing",
      },
    });
    await db.activityLog.create({ data: { userId: user.id, action: "billing.upgrade", meta: price.label } });
    return ok({ subscription: updated, label: price.label });
  } catch (e) {
    return fail(e);
  }
}

export async function DELETE() {
  try {
    const user = await getCurrentUser();
    if (!user) throw new ApiError("UNAUTHORIZED", "Sign in first.", 401);
    const updated = await db.user.update({
      where: { id: user.id },
      data: { planTier: "free", planStatus: "active", stripeSubId: null },
      select: { planTier: true, planStatus: true },
    });
    await db.notification.create({
      data: { userId: user.id, type: "billing", title: "Subscription canceled", body: "You'll keep access until the end of the cycle." },
    });
    await db.activityLog.create({ data: { userId: user.id, action: "billing.cancel" } });
    return ok({ subscription: updated });
  } catch (e) {
    return fail(e);
  }
}
