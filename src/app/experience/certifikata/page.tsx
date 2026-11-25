import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Certificate from '@/components/Certificate'
import PrintBar from '@/components/PrintBar'
import { isAuthenticated } from '@/lib/session'
import { certificateProps } from '@/lib/dedication'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Certifikata — Nadia' }

export default async function CertificatePage() {
  if (!(await isAuthenticated())) redirect('/')
  return (
    <main className="print-page">
      <PrintBar />
      <Certificate {...await certificateProps()} />
      <p className="print-hint">
        Për PDF: “Printo” → zgjidh “Ruaj si PDF”, madhësia A4, pa margjina, me grafikat e sfondit të aktivizuara. Versioni për printim
        profesional (me bleed 3 mm) vjen në hapin M6.
      </p>
    </main>
  )
}
