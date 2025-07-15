import type Stripe from "stripe";
import type { OrderStatus } from "@/app/types/order";

/**
 * Maps a verified Stripe event to the order status transition it implies.
 * Pure function (no I/O) so the webhook's business rules are unit-tested.
 *
 * Orders are found by Checkout Session ID, falling back to the order ID we
 * attach as `client_reference_id` / `metadata.order_id` (in case linking the
 * session to the order failed), or by Payment Intent ID for refunds, which
 * arrive as charge events with no session.
 */
export interface Transition {
  sessionId: string | null;
  orderId: string | null;
  status: OrderStatus;
  paymentIntentId: string | null;
}

export function statusForEvent(event: Stripe.Event): Transition | null {
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const session = event.data.object;
      // `completed` can fire before funds clear for delayed payment methods.
      if (session.payment_status !== "paid") return null;
      return {
        sessionId: session.id,
        orderId: orderIdOf(session),
        status: "paid",
        paymentIntentId: intentId(session.payment_intent),
      };
    }
    case "checkout.session.async_payment_failed":
      return { sessionId: event.data.object.id, orderId: orderIdOf(event.data.object), status: "failed", paymentIntentId: null };
    case "checkout.session.expired":
      return { sessionId: event.data.object.id, orderId: orderIdOf(event.data.object), status: "canceled", paymentIntentId: null };
    case "charge.refunded": {
      const charge = event.data.object;
      // Partial refunds leave the order paid; only a full refund changes it.
      const paymentIntentId = intentId(charge.payment_intent);
      if (!charge.refunded || !paymentIntentId) return null;
      return { sessionId: null, orderId: charge.metadata?.order_id || null, status: "refunded", paymentIntentId };
    }
    default:
      return null;
  }
}

function orderIdOf(session: Stripe.Checkout.Session): string | null {
  return session.metadata?.order_id || session.client_reference_id || null;
}

function intentId(value: string | Stripe.PaymentIntent | null): string | null {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}
