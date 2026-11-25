/**
 * Digital certificate — same design language as the physical A4 certificate in the approved mockup
 * (ivory sheet, gold double frame & corner flourishes, seal). Pure markup: works on server and client,
 * scales with its container (cqw units) and prints at exactly A4.
 * Wording: symbolic private dedication — never official naming.
 */
import Emblem from './Emblem'

export type CertificateProps = {
  recipient: string
  starName: string
  designation: string
  constellationSq: string
  ra: string
  dec: string
  epoch: string
  distanceLy: number
  magnitude: number
  dedicationDate: string | null
  privateId: string
  qrReady: boolean
}

function Corner({ className }: { className: string }) {
  return (
    <svg className={`cert__corner ${className}`} viewBox="0 0 60 60" aria-hidden="true">
      <path d="M2 58 V18 C2 8 8 2 18 2 H58" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M8 58 V22 C8 14 14 8 22 8 H58" fill="none" stroke="currentColor" strokeWidth="0.7" />
      <path d="M14 30 C14 20 20 14 30 14 M22 14 C24 20 20 24 14 22" fill="none" stroke="currentColor" strokeWidth="1" />
      <circle cx="14" cy="14" r="2.2" fill="currentColor" />
    </svg>
  )
}

export default function Certificate(p: CertificateProps) {
  return (
    <div className="cert-wrap">
      <article className="cert" aria-label={`Certifikata e dedikimit të yllit për ${p.recipient}`}>
        <div className="cert__frame">
          <Corner className="cert__corner--tl" />
          <Corner className="cert__corner--tr" />
          <Corner className="cert__corner--bl" />
          <Corner className="cert__corner--br" />

          <header className="cert__head">
            <Emblem className="cert__emblem" />
            <p className="cert__name-top">{p.recipient.toUpperCase()}</p>
            <span className="cert__star-divider" aria-hidden="true">✦</span>
            <h1 className="cert__title">Certifikatë</h1>
            <p className="cert__subtitle">Dedikimi simbolik i një ylli</p>
          </header>

          <p className="cert__intro">
            Me këtë certifikatë konfirmohet se një yll në qiell
            <br />
            është dedikuar simbolikisht në emrin
          </p>
          <p className="cert__recipient">{p.recipient}</p>
          <span className="cert__star-divider" aria-hidden="true">✦</span>

          <dl className="cert__grid">
            <div>
              <dt>Ylli astronomik</dt>
              <dd>
                {p.starName} ({p.designation})
              </dd>
            </div>
            <div>
              <dt>Konstelacioni</dt>
              <dd>{p.constellationSq}</dd>
            </div>
            <div>
              <dt>RA ({p.epoch})</dt>
              <dd>{p.ra}</dd>
            </div>
            <div>
              <dt>Dec ({p.epoch})</dt>
              <dd>{p.dec}</dd>
            </div>
            <div>
              <dt>Distanca nga Toka</dt>
              <dd>≈ {p.distanceLy} vite-dritë</dd>
            </div>
            <div>
              <dt>Magnituda</dt>
              <dd>{p.magnitude.toFixed(2)}</dd>
            </div>
          </dl>

          <p className="cert__closing">
            Ky yll do të mbajë simbolikisht emrin {p.recipient},
            <br />
            si një dritë e veçantë në univers, përgjithmonë.
          </p>

          <footer className="cert__foot">
            <div className="cert__meta">
              <span className="cert__meta-label">Data e dedikimit</span>
              <span className={p.dedicationDate ? 'cert__meta-value' : 'cert__meta-value cert__pending'}>{p.dedicationDate ?? 'në pritje'}</span>
            </div>
            <div className="cert__seal" aria-hidden="true">
              <Emblem />
            </div>
            <div className="cert__meta cert__meta--right">
              <span className="cert__meta-label">ID private</span>
              <span className="cert__meta-value">{p.privateId}</span>
              <span className={p.qrReady ? 'cert__qr' : 'cert__qr cert__qr--placeholder'} aria-label={p.qrReady ? 'Kodi QR' : 'Vendi i kodit QR — do të shtohet pas aprovimit të adresës'}>
                {p.qrReady ? null : 'QR'}
              </span>
            </div>
          </footer>

          <p className="cert__fine">
            Dedikim simbolik privat — nuk është emërtim zyrtar astronomik i Unionit Ndërkombëtar Astronomik (IAU). Të dhënat e yllit:
            SIMBAD (CDS, Strasbourg), ICRS {p.epoch}.
          </p>
        </div>
      </article>
    </div>
  )
}
