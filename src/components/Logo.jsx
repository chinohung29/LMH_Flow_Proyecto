// Logo oficial de LMH (public/logo.png = isotipo + wordmark,
// public/logo-mark.png = solo el isotipo, para espacios angostos).
export default function Logo({ variant = 'full', className = 'h-9' }) {
  const src = variant === 'mark' ? '/logo-mark.png' : '/logo.png'
  const alt = variant === 'mark' ? 'LMH' : 'LMH Flow-Finance'
  return <img src={src} alt={alt} className={`w-auto ${className}`} />
}
