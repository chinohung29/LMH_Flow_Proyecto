// Placeholder de marca: mark tipo "flujo ascendente" + wordmark "LMH Flow".
// Reemplazar por el logo oficial de LMH Consulting cuando esté disponible
// (actualizar también /public/logo.png, /public/favicon.svg e /public/icons).
export default function Logo({ withWordmark = true, className = '' }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg width="28" height="28" viewBox="0 0 64 64" aria-hidden="true">
        <rect width="64" height="64" rx="14" fill="#0F1216" />
        <rect x="14" y="34" width="9" height="16" fill="#2B7BFF" />
        <rect x="27.5" y="24" width="9" height="26" fill="#2B7BFF" />
        <rect x="41" y="12" width="9" height="38" fill="#2B7BFF" />
        <polyline
          points="18.5,32 32,22 45.5,10"
          fill="none"
          stroke="#5C9AFF"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {withWordmark && (
        <span className="text-lg font-semibold tracking-tight text-white">
          LMH <span className="text-electric-400">Flow</span>
        </span>
      )}
    </div>
  )
}
