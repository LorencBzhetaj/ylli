import raw from '@config/dedication.json'

export type Dedication = {
  recipient: string
  symbolicStarName: string
  birthday: string
  birthLocation: string
  birthTime: string | null
  timezone: string
  catalogStar: string
  privateId: string
  dedicationDate: string | null
  giver: string | null
  language: string
  astronomyVerified: boolean
  publicUrl: string | null
  gallery: unknown[]
  officialNaming: boolean
}

export const dedication = raw as Dedication

/** "14 Mars 2006" — Albanian month names, no locale dependency. */
const MONTHS_SQ = ['Janar', 'Shkurt', 'Mars', 'Prill', 'Maj', 'Qershor', 'Korrik', 'Gusht', 'Shtator', 'Tetor', 'Nëntor', 'Dhjetor']
export function formatDateSq(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return `${d} ${MONTHS_SQ[m - 1]} ${y}`
}
