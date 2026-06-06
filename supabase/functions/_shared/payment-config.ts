// Shared payment constants used by both the create and verify PayPal edge functions
export const PRICE_PER_SEAT = 49;
export const DEFAULT_QUANTITY = 10;
export const PAYMENT_CURRENCY = "USD";

export function deriveQuantity(opts: {
  estimated_employees?: number | null;
  requested_credits?: number | null;
}): number {
  return opts.estimated_employees || opts.requested_credits || DEFAULT_QUANTITY;
}
