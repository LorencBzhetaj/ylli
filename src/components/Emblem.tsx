/** Four-point star with a tilted orbit — the NADIA mark from the approved mockup. */
export default function Emblem({ className, title }: { className?: string; title?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" role={title ? 'img' : undefined} aria-hidden={title ? undefined : true}>
      {title ? <title>{title}</title> : null}
      <ellipse cx="32" cy="33" rx="25" ry="9.5" transform="rotate(-24 32 33)" stroke="currentColor" strokeWidth="1.6" opacity="0.9" />
      <path
        d="M32 6 C33.2 22 34.5 29.5 52 32 C34.5 34.5 33.2 42 32 58 C30.8 42 29.5 34.5 12 32 C29.5 29.5 30.8 22 32 6 Z"
        fill="currentColor"
      />
    </svg>
  )
}
