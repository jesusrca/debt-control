import { describe, it, expect } from 'vitest'
import {
  formatCurrency,
  formatPercent,
  formatAmount,
  parseAmount,
} from '../utils/format'

describe('format.ts', () => {
  describe('formatCurrency', () => {
    it('formats USD by default', () => {
      const result = formatCurrency(1234.56)
      expect(result).toMatch(/1/)
      expect(result).toMatch(/234/)
    })

    it('formats MXN correctly', () => {
      const result = formatCurrency(500, 'MXN')
      expect(result).toMatch(/500/)
    })
  })

  describe('formatPercent', () => {
    it('formats with default 0 decimals', () => {
      expect(formatPercent(75)).toBe('75%')
    })

    it('formats with custom decimals', () => {
      expect(formatPercent(57.5, 1)).toBe('57.5%')
    })
  })

  describe('formatAmount', () => {
    it('formats with locale thousands separator', () => {
      const result = formatAmount(1500)
      expect(result).toMatch(/1/)
      expect(result).toMatch(/500/)
    })

    it('formats with 2 decimal places', () => {
      const result = formatAmount(1500)
      expect(result).toMatch(/1500,00/)
    })
  })

  describe('parseAmount', () => {
    it('parses simple number string', () => {
      expect(parseAmount('1234')).toBe(1234)
    })

    it('strips non-numeric characters', () => {
      expect(parseAmount('$1,234.56')).toBe(1234.56)
    })
  })
})