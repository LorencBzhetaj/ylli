'use client'

import Link from 'next/link'

export default function PrintBar() {
  return (
    <div className="print-bar">
      <button className="btn btn--gold" type="button" onClick={() => window.print()}>
        Printo / Ruaj si PDF
      </button>
      <Link className="btn btn--ghost" href="/experience">
        Kthehu
      </Link>
    </div>
  )
}
