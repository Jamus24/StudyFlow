import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getStripe, tierFromSubscription, subscriptionStatus } from "@/lib/stripe";
import { ApiError } from "@/lib/api";
import Stripe from "stripe";

// POST /api/billing/webhook
// Receives Stripe webhook events. Must be raw-body (no JSON parse).
export async function POST(req: NextRequest) {
  try {
    const stripe = getStripe();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      // In dev without webhook secret, skip verification
      const body = await req.json();
      await handleEvent(body);
      return new Response("{\"received\": true}", { status: 200 });
    }

    // Verify webhook signature
    const body = await req.text();
    const sig = req.headers.get("stripe-signature") || "";
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    } catch {
      return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 400 });
    }

    await handleEvent(event);
    return new Response("{\"received\": true}", { status: 200 });
  } catch (e) {
    if (e instanceof ApiError) {
      return new Response(JSON.stringify({ error: e.message }), { status: e.status });
    }
    console.error("[webhook] error", e);
    return new Response(JSON.stringify({ error: "Webhook handler failed" }), { status: 500 });
  }
}

async function handleEvent(event: Stripe.Event) {
  const data = event.data.object as Record<string, any>;

  switch (event.type) {
    case "checkout.session.completed": {
      // First payment — activate subscription
      const session = data as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      const subId = session.subscription as string;
      const email = session.customer_email || session.customer_details?.email;

      // Find user by ID or email
      const user = userId
        ? await db.user.findUnique({ where: { id: userId } })
        : email
          ? await db.user.findUnique({ where: { email } })
          : null;
      if (!user) { console.warn("[webhook] user not found for checkout"); return; }

      const tier = session.metadata?.tier || "pro";
      await db.user.update({
        where: { id: user.id },
        data: { planTier: tier, planStatus: "active", stripeCustomerId: (session.customer as string) || user.stripeCustomerId, stripeSubId: subId },
      });
      await db.notification.create({ data: { userId: user.id, type: "billing", title: "Welcome! 🎉", body: `Your ${tier} subscription is now active.`, link: "billing" } });
      await db.activityLog.create({ data: { userId: user.id, action: "billing.upgrade", meta: `${tier} (stripe checkout)` } });
      console.log(`[webhook] upgraded ${user.email} to ${tier}`);
      break;
    }

    case "customer.subscription.updated": {
      // Plan change, trial end, renewal
      const sub = data as Stripe.Subscription;
      const customerId = sub.customer as string;
      const user = await db.user.findFirst({ where: { stripeCustomerId: customerId } });
      if (!user) { console.warn("[webhook] user not found for customer", customerId); return; }

      const tier = tierFromSubscription(sub);
      const status = subscriptionStatus(sub.status);
      await db.user.update({
        where: { id: user.id },
        data: { planTier: tier, planStatus: status, stripeSubId: sub.id, trialEndsAt: sub.trial_end ? new Date(sub.trial_end * 1000) : null },
      });
      console.log(`[webhook] subscription updated: ${user.email} → ${tier}/${status}`);
      break;
    }

    case "customer.subscription.deleted": {
      // Canceled or expired
      const sub = data as Stripe.Subscription;
      const customerId = sub.customer as string;
      const user = await db.user.findFirst({ where: { stripeCustomerId: customerId } });
      if (!user) { console.warn("[webhook] user not found for deleted sub"); return; }

      await db.user.update({
        where: { id: user.id },
        data: { planTier: "free", planStatus: "active", stripeSubId: null },
      });
      await db.notification.create({ data: { userId: user.id, type: "billing", title: "Subscription ended", body: "Your paid plan has ended. You can upgrade again anytime." } });
      await db.activityLog.create({ data: { userId: user.id, action: "billing.cancel" } });
      console.log(`[webhook] subscription canceled: ${user.email}`);
      break;
    }

    case "invoice.payment_failed": {
      const invoice = data as Stripe.Invoice;
      const customerId = invoice.customer as string;
      const user = await db.user.findFirst({ where: { stripeCustomerId: customerId } });
      if (!user) return;

      await db.user.update({ where: { id: user.id }, data: { planStatus: "past_due" } });
      await db.notification.create({ data: { userId: user.id, type: "billing", title: "Payment failed", body: "We couldn't process your last payment. Please update your payment method.", link: "billing" } });
      console.log(`[webhook] payment failed: ${user.email}`);
      break;
    }

    default:
      console.log(`[webhook] unhandled event: ${event.type}`);
  }
}

// Disable Next.js body parsing — Stripe needs the raw body for signature verification
export const runtime = "nodejs";
export const maxDuration = 30;
