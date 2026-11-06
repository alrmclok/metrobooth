import type { Rupiah, RoundingMode, RoundingStep } from './types'

export interface RoundingSetting {
  step: RoundingStep
  mode: RoundingMode
}

// Default Indonesian notes and coins (the booth can switch some off in settings).
export const DEFAULT_DENOMINATIONS: readonly number[] = [
  100000, 50000, 20000, 10000, 5000, 2000, 1000, 500, 200, 100,
]

// Cash rounding (spec 5.4). 'nearest' rounds halves up (12250 -> 12500 at step 500).
export function roundCash(total: Rupiah, step: RoundingStep, mode: RoundingMode): Rupiah {
  if (step === 0 || total <= 0) return total
  return mode === 'up'
    ? Math.ceil(total / step) * step
    : Math.round(total / step) * step
}

// What the customer actually pays. Rounding is CASH ONLY; QRIS is always exact.
export function payableTotal(
  subtotal: Rupiah,
  method: 'cash' | 'qris',
  rounding?: RoundingSetting,
): Rupiah {
  if (method === 'qris' || !rounding) return subtotal
  return roundCash(subtotal, rounding.step, rounding.mode)
}

export interface ChangeBreakdown {
  parts: { value: number; count: number }[] // biggest first
  leftover: Rupiah // part of the change that can't be formed (0 = exact)
}

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b))

// Suggested notes/coins for the change (spec 5.4). Uses the fewest pieces and
// only the denominations the booth has. A plain "biggest first" approach fails
// on sets like [5000, 2000] for 6000, so this finds the best combination.
// If the exact change can't be formed, it shows the closest amount below it
// and reports the leftover. Hints only: the app never tracks the cash drawer.
export function changeBreakdown(
  change: Rupiah,
  denominations: readonly number[],
): ChangeBreakdown {
  const denoms = [...new Set(denominations)]
    .filter(d => Number.isInteger(d) && d > 0)
    .sort((a, b) => b - a)

  if (change <= 0 || denoms.length === 0) {
    return { parts: [], leftover: Math.max(change, 0) }
  }

  const unit = denoms.reduce(gcd)
  const n = Math.floor(change / unit)

  const best: number[] = new Array(n + 1).fill(Infinity) // fewest pieces for i*unit
  const used: number[] = new Array(n + 1).fill(0)        // last piece used
  best[0] = 0
  for (let i = 1; i <= n; i++) {
    for (const d of denoms) {
      const u = d / unit
      if (u <= i && best[i - u] + 1 < best[i]) {
        best[i] = best[i - u] + 1
        used[i] = d
      }
    }
  }

  let target = n
  while (target > 0 && best[target] === Infinity) target--

  const counts = new Map<number, number>()
  for (let i = target; i > 0; i -= used[i] / unit) {
    counts.set(used[i], (counts.get(used[i]) ?? 0) + 1)
  }

  return {
    parts: denoms.filter(d => counts.has(d)).map(d => ({ value: d, count: counts.get(d)! })),
    leftover: change - target * unit,
  }
}