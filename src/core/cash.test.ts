import { describe, expect, test } from 'vitest'
import { DEFAULT_DENOMINATIONS, changeBreakdown, payableTotal, roundCash } from './cash'

describe('roundCash', () => {
  test('off, or a Rp 0 total, changes nothing', () => {
    expect(roundCash(12300, 0, 'nearest')).toBe(12300)
    expect(roundCash(0, 500, 'up')).toBe(0)
  })

  test('nearest', () => {
    expect(roundCash(12300, 500, 'nearest')).toBe(12500)
    expect(roundCash(12200, 500, 'nearest')).toBe(12000) // negative adjustment
    expect(roundCash(12250, 500, 'nearest')).toBe(12500) // half rounds up
  })

  test('up', () => {
    expect(roundCash(12100, 500, 'up')).toBe(12500)
    expect(roundCash(12000, 500, 'up')).toBe(12000)
  })

  test('step 1000', () => {
    expect(roundCash(15300, 1000, 'nearest')).toBe(15000)
  })
})

describe('payableTotal', () => {
  test('cash is rounded, QRIS is exact', () => {
    const rounding = { step: 500, mode: 'nearest' } as const
    expect(payableTotal(12300, 'cash', rounding)).toBe(12500)
    expect(payableTotal(12300, 'qris', rounding)).toBe(12300)
    expect(payableTotal(12300, 'cash', undefined)).toBe(12300)
  })
})

describe('changeBreakdown', () => {
  test('simple change', () => {
    expect(changeBreakdown(25000, DEFAULT_DENOMINATIONS)).toEqual({
      parts: [{ value: 20000, count: 1 }, { value: 5000, count: 1 }],
      leftover: 0,
    })
  })

  test('uses every coin and note when needed', () => {
    expect(changeBreakdown(8800, DEFAULT_DENOMINATIONS).parts.map(p => p.value))
      .toEqual([5000, 2000, 1000, 500, 200, 100])
  })

  test('respects denominations the booth turned off', () => {
    const noTwoThousand = DEFAULT_DENOMINATIONS.filter(d => d !== 2000)
    expect(changeBreakdown(7000, noTwoThousand).parts).toEqual([
      { value: 5000, count: 1 }, { value: 1000, count: 2 },
    ])
  })

  test('finds exact change where "biggest first" fails', () => {
    expect(changeBreakdown(6000, [5000, 2000])).toEqual({
      parts: [{ value: 2000, count: 3 }], leftover: 0,
    })
  })

  test('flags a leftover when exact change is impossible', () => {
    expect(changeBreakdown(3000, [5000, 2000])).toEqual({
      parts: [{ value: 2000, count: 1 }], leftover: 1000,
    })
  })

  test('amounts smaller than the smallest coin become leftover', () => {
    expect(changeBreakdown(8750, DEFAULT_DENOMINATIONS).leftover).toBe(50)
  })

  test('zero change or no denominations gives no hints', () => {
    expect(changeBreakdown(0, DEFAULT_DENOMINATIONS)).toEqual({ parts: [], leftover: 0 })
    expect(changeBreakdown(5000, [])).toEqual({ parts: [], leftover: 5000 })
  })
})