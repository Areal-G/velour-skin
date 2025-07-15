import type Stripe from "stripe";
import { describe, expect, it } from "vitest";
import { ALLOWED_TRANSITIONS, sourceStatesFor } from "@/app/lib/order-status";
import { statusForEvent } from "@/app/lib/payment-events";

describe("order status transitions", () => {
  it("only lets pending (or failed) orders become paid", () => {
    expect(sourceStatesFor("paid").sort()).toEqual(["failed", "pending"]);
  });

  it("never lets a terminal order change state", () => {
    expect(ALLOWED_TRANSITIONS.canceled).toEqual([]);
    expect(ALLOWED_TRANSITIONS.refunded).toEqual([]);
  });

  it("never moves a paid order back to pending", () => {
    expect(sourceStatesFor("pending")).toEqual([]);
  });
});

const sessionEvent = (type: string, session: Partial<Stripe.Checkout.Session>) =>
  ({ type, data: { object: { id: "cs_test_123", ...session } } }) as unknown as Stripe.Event;

describe("statusForEvent (Stripe webhook mapping)", () => {
  it("marks paid sessions as paid", () => {
    expect(
      statusForEvent(sessionEvent("checkout.session.completed", { payment_status: "paid", payment_intent: "pi_1" })),
    ).toEqual({ sessionId: "cs_test_123", orderId: null, status: "paid", paymentIntentId: "pi_1" });
  });

  it("carries our order ID so the order can be found if the session was never linked", () => {
    expect(
      statusForEvent(
        sessionEvent("checkout.session.completed", { payment_status: "paid", payment_intent: "pi_1", client_reference_id: "ord-1" }),
      ),
    ).toMatchObject({ orderId: "ord-1" });
  });

  it("does not mark an order paid before funds have cleared", () => {
    expect(statusForEvent(sessionEvent("checkout.session.completed", { payment_status: "unpaid" }))).toBeNull();
  });

  it("handles delayed payment outcomes and expiry", () => {
    expect(
      statusForEvent(sessionEvent("checkout.session.async_payment_succeeded", { payment_status: "paid", payment_intent: null })),
    ).toMatchObject({ status: "paid" });
    expect(statusForEvent(sessionEvent("checkout.session.async_payment_failed", {}))).toMatchObject({ status: "failed" });
    expect(statusForEvent(sessionEvent("checkout.session.expired", {}))).toMatchObject({ status: "canceled" });
  });

  it("marks fully refunded charges as refunded, matched by payment intent", () => {
    const charge = (refunded: boolean) =>
      ({ type: "charge.refunded", data: { object: { id: "ch_1", refunded, payment_intent: "pi_1", metadata: {} } } }) as unknown as Stripe.Event;
    expect(statusForEvent(charge(true))).toEqual({ sessionId: null, orderId: null, status: "refunded", paymentIntentId: "pi_1" });
    expect(statusForEvent(charge(false))).toBeNull();
  });

  it("ignores unrelated events", () => {
    expect(statusForEvent({ type: "customer.created", data: { object: {} } } as unknown as Stripe.Event)).toBeNull();
  });
});
