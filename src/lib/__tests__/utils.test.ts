import { describe, expect, it } from 'vitest'
import { cn, formatEuro, formatDate, initials } from '@/lib/utils'

describe('formatEuro', () => {
  it('rechnet Cent in Euro um', () => {
    expect(formatEuro(12000)).toMatch(/120/)
  })
  it('kommt mit 0 klar', () => {
    expect(formatEuro(0)).toMatch(/0/)
  })
})

describe('formatDate', () => {
  it('zeigt einen Gedankenstrich statt "Invalid Date"', () => {
    expect(formatDate(null)).toBe('—')
    expect(formatDate(undefined)).toBe('—')
  })
})

describe('cn', () => {
  it('laesst die spaetere Tailwind-Klasse gewinnen', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4')
  })
})

describe('initials', () => {
  it('nimmt die ersten Buchstaben zweier Namensteile', () => {
    expect(initials('Mika Falk')).toBe('MF')
  })
  it('ignoriert Klammern und Satzzeichen', () => {
    expect(initials('Kevin (Azubi)')).toBe('KA')
  })
  it('kommt mit einem einzelnen Namen klar', () => {
    expect(initials('Kevin')).toBe('K')
  })
  it('liefert bei leerem Namen nichts statt zu werfen', () => {
    expect(initials('')).toBe('')
  })
})
