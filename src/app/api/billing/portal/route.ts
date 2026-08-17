import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { ok, fail, ApiError } from "@/lib/api";
import { getStripe, isStripeConfigured } from "@/lib/stripe";

// POST /api/billing/portal
// Returns a Stripe Customer Portal URL for managing subscription.
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();

    if (!isStripeConfigured()) {
      throw new ApiError(
        "NOT_CONFIGURED",
        "Stripe is not configured. Portal is only available in production with Stripe keys.",
        400
      );
    }

    if (!user.stripeCustomerId) {
      throw new ApiError("NO_CUSTOMER", "No billing account found.", 404);
    }

    const stripe = getStripe();
    const origin = req.headers.get("origin") || process.env.NEXT_PUBLIC_URL || "http://localhost:3000";

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${origin}/?billing=portal`,
    });

    return ok({ url: session.url });
  } catch (e) {
    return fail(e);
  }
}
