import { describe, it, expect } from 'vitest'
import {
  formatDate,
  getMonthName,
  daysUntil,
  calculateDueDate,
} from '../utils/date'

describe('date.ts', () => {
  describe('formatDate', () => {
    it('formats date in Spanish', () => {
      const result = formatDate('2026-05-15')
      expect(result).toMatch(/15/)
      expect(result).toMatch(/mayo/i)
      expect(result).toMatch(/2026/)
    })
    
    it('handles Date object input', () => {
      const result = formatDate(new Date('2026-01-01'))
      expect(result).toMatch(/enero/i)
    })
  })

  describe('getMonthName', () => {
    it('returns full month name in Spanish', () => {
      expect(getMonthName('2026-05-01')).toBe('mayo')
      expect(getMonthName('2026-01-15')).toBe('enero')
      expect(getMonthName('2026-12-25')).toBe('diciembre')
    })
  })

  describe('daysUntil', () => {
    it('returns positive for future dates', () => {
      const future = new Date()
      future.setDate(future.getDate() + 10)
      const result = daysUntil(future)
      expect(result).toBeGreaterThanOrEqual(9)
      expect(result).toBeLessThanOrEqual(11)
    })

    it('returns negative for past dates', () => {
      const past = new Date()
      past.setDate(past.getDate() - 5)
      const result = daysUntil(past)
      expect(result).toBeLessThan(0)
    })
  })

  describe('calculateDueDate', () => {
    it('calculates monthly due date with day', () => {
      const result = calculateDueDate('monthly', 15)
      expect(result).toBeInstanceOf(Date)
      expect(result.getDate()).toBe(15)
    })
  })
})