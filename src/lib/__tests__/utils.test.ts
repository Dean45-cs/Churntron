import { describe, expect, it } from 'vitest'
import { cn, eingabeAlsCents, formatEuro, formatDate, initials } from '@/lib/utils'

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

describe('eingabeAlsCents', () => {
  it('nimmt Komma und Punkt', () => {
    expect(eingabeAlsCents('12,50')).toBe(1250)
    expect(eingabeAlsCents('12.50')).toBe(1250)
  })
  it('wirft Waehrungszeichen und Leerzeichen weg', () => {
    expect(eingabeAlsCents(' 137,50 € ')).toBe(13750)
  })
  it('liest den Punkt als Tausendertrenner, wenn drei Ziffern folgen', () => {
    expect(eingabeAlsCents('1.500')).toBe(150000)
    expect(eingabeAlsCents('1.234,56')).toBe(123456)
  })
  it('meldet Unsinn als null statt als NaN', () => {
    expect(eingabeAlsCents('')).toBeNull()
    expect(eingabeAlsCents('keine Ahnung')).toBeNull()
  })
})

describe('formatEuro', () => {
  it('zeigt zwei Nachkommastellen – 6,50 EUR darf nicht zu 7 EUR werden', () => {
    expect(formatEuro(650)).toMatch(/6,50/)
    expect(formatEuro(100)).toMatch(/1,00/)
  })
})
