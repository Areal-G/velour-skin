import type { OrderStatus } from "@/app/types/order";

/** Statuses an order may move to from each state (prevents regressions). */
export const ALLOWED_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  pending: ["paid", "failed", "canceled"],
  paid: ["fulfilled", "refunded"],
  fulfilled: ["refunded"],
  failed: ["paid"],
  canceled: [],
  refunded: [],
};

/** The states from which an order may legally transition to `target`. */
export function sourceStatesFor(target: OrderStatus): OrderStatus[] {
  return (Object.keys(ALLOWED_TRANSITIONS) as OrderStatus[]).filter((s) =>
    ALLOWED_TRANSITIONS[s].includes(target),
  );
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Awaiting payment",
  paid: "Confirmed",
  fulfilled: "Dispatched",
  failed: "Payment failed",
  canceled: "Canceled",
  refunded: "Refunded",
};
