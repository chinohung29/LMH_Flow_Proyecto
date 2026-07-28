export default function ComingSoon({ title, description, sprint }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <span className="mb-4 inline-block rounded-full border border-electric-500/40 bg-electric-500/10 px-3 py-1 text-xs font-medium text-electric-300">
        {sprint}
      </span>
      <h1 className="font-display text-2xl font-semibold text-white">{title}</h1>
      <p className="mt-2 max-w-md text-metal-300">{description}</p>
    </div>
  )
}
