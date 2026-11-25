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

/** Certificate data — shared by the in-experience preview and the printable page. */
export async function certificateProps() {
  const { regulus } = await import('./astronomy')
  return {
    recipient: dedication.recipient,
    starName: regulus.name,
    designation: regulus.designation,
    constellationSq: regulus.constellationSq,
    ra: regulus.ra,
    dec: regulus.dec,
    epoch: regulus.epoch,
    distanceLy: regulus.distanceLy,
    magnitude: regulus.apparentMagnitude,
    dedicationDate: dedication.dedicationDate ? formatDateSq(dedication.dedicationDate) : null,
    privateId: dedication.privateId,
    qrReady: false, // QR is added only after the final HTTPS URL is approved and tested (M7)
  }
}

/** "14 Mars 2006" — Albanian month names, no locale dependency. */
const MONTHS_SQ = ['Janar', 'Shkurt', 'Mars', 'Prill', 'Maj', 'Qershor', 'Korrik', 'Gusht', 'Shtator', 'Tetor', 'Nëntor', 'Dhjetor']
export function formatDateSq(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return `${d} ${MONTHS_SQ[m - 1]} ${y}`
}
