import { newId } from "./ids";
import { isPickupOnly, stockFor, unitPrice } from "./cart";
import type { Cart } from "./cart";
import type {
  Creator,
  ID,
  Item,
  ItemType,
  PaymentMethod,
  Rupiah,
  Sale,
  SaleLine,
  StockPool,
  Timestamp,
} from "./types";
import { payableTotal } from "./cash";
import type { RoundingSetting } from "./cash";

export type PaymentInput =
  | { method: "cash"; cashReceived: Rupiah }
  | { method: "qris" };

export interface CheckoutContext {
  items: ReadonlyMap<ID, Item>;
  types: ReadonlyMap<ID, ItemType>;
  creators: ReadonlyMap<ID, Creator>;
  rounding?: RoundingSetting; // from Settings; omitted = rounding off
}

export interface CheckoutOptions {
  now?: Timestamp;
  makeId?: () => ID; // injectable so tests are predictable
}

export interface StockChange {
  itemId: ID;
  pool: StockPool;
  delta: number; // negative on a sale
}

export type CheckoutError =
  | { reason: "empty_cart" }
  | { reason: "missing_item"; itemId: ID }
  | { reason: "not_enough_stock"; itemId: ID; left: number }
  | { reason: "payment_required" }
  | { reason: "cash_too_low"; short: Rupiah };

export type CheckoutResult =
  | { ok: true; sale: Sale; lines: SaleLine[]; stockChanges: StockChange[] }
  | { ok: false; error: CheckoutError };

const fail = (error: CheckoutError): CheckoutResult => ({ ok: false, error });

export function checkout(
  cart: Cart,
  ctx: CheckoutContext,
  payment?: PaymentInput,
  opts: CheckoutOptions = {},
): CheckoutResult {
  const now = opts.now ?? Date.now();
  const makeId = opts.makeId ?? newId;

  if (cart.lines.length === 0) return fail({ reason: "empty_cart" });

  const lines: SaleLine[] = [];
  const stockChanges: StockChange[] = [];
  let subtotal: Rupiah = 0;

  for (const cl of cart.lines) {
    const item = ctx.items.get(cl.itemId);
    if (!item) return fail({ reason: "missing_item", itemId: cl.itemId });

    // Stock can never go negative (spec 14), re-checked here at Paid time.
    const available = stockFor(item, cl.kind);
    if (cl.quantity > available) {
      return fail({
        reason: "not_enough_stock",
        itemId: item.id,
        left: available,
      });
    }

    const price = unitPrice(item, cl.kind);
    subtotal += price * cl.quantity;

    lines.push({
      id: makeId(),
      createdAt: now,
      updatedAt: now,
      saleId: cart.saleId,
      itemId: item.id,
      nameSnapshot: item.name,
      priceSnapshot: price,
      typeNameSnapshot:
        (item.typeId && ctx.types.get(item.typeId)?.name) || "Unassigned",
      creatorNameSnapshot:
        (item.creatorId && ctx.creators.get(item.creatorId)?.name) ||
        "Unassigned",
      kind: cl.kind,
      quantity: cl.quantity,
    });
    stockChanges.push({
      itemId: item.id,
      pool: cl.kind === "regular" ? "regular" : "po",
      delta: -cl.quantity,
    });
  }

  // Payment method rules (spec 5.2 + 17.2)
  let method: PaymentMethod;
  let total: Rupiah = subtotal;
  let cashReceived: Rupiah | undefined;
  let change: Rupiah | undefined;

  if (subtotal === 0) {
    method = isPickupOnly(cart) ? "pickup" : "none";
  } else {
    if (!payment) return fail({ reason: "payment_required" });
    // Rounding is cash only; QRIS charges the exact total (spec 5.4)
    total = payableTotal(subtotal, payment.method, ctx.rounding);
    if (payment.method === "cash") {
      if (payment.cashReceived < total) {
        return fail({
          reason: "cash_too_low",
          short: total - payment.cashReceived,
        });
      }
      cashReceived = payment.cashReceived;
      change = payment.cashReceived - total;
    }
    method = payment.method;
  }

  const sale: Sale = {
    id: cart.saleId, // same cart = same sale id, so saving twice can't duplicate
    createdAt: now,
    updatedAt: now,
    eventId: cart.eventId,
    paymentMethod: method,
    subtotal,
    discount: 0, // v2
    roundingAdjustment: total - subtotal, // can be negative
    total,
    status: "paid",
    ...(cashReceived !== undefined && { cashReceived, change }),
  };

  return { ok: true, sale, lines, stockChanges };
}

// Spec 17.2: ask for confirmation when cash received is more than ~10x the total.
export const looksLikeCashTypo = (
  total: Rupiah,
  cashReceived: Rupiah,
): boolean => total > 0 && cashReceived > total * 10;
