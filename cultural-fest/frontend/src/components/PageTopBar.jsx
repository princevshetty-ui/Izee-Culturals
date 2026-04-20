export default function PageTopBar({
  breadcrumb,
  onBack,
  backLabel = '← Back',
  rightSlot = null,
  maxWidthClass = 'max-w-6xl',
}) {
  return (
    <header className="border-b border-[#EEE6D8]/10 bg-[#080910]/88 backdrop-blur-md">
      <div className={`mx-auto w-full ${maxWidthClass} px-4 py-4 sm:px-6 lg:px-8`}>
        <div className="flex items-center justify-between gap-4">
          <div className="inline-flex min-w-0 items-center gap-3">
            <img
              src="/college-logo.png"
              alt="IZee Got Talent"
              className="h-9 w-9 rounded-full border border-[#C9A84C]/35 bg-[#0E0F18]/80 object-cover p-0.5"
            />
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#C9A84C]/85">IZee Got Talent</p>
              <p className="truncate text-[10px] uppercase tracking-[0.14em] text-[#EEE6D8]/38">{breadcrumb}</p>
            </div>
          </div>

          <div className="inline-flex items-center gap-3">
            {rightSlot}
            <button
              type="button"
              onClick={onBack}
              className="text-sm text-[#EEE6D8]/78 transition hover:text-[#EEE6D8]"
            >
              {backLabel}
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
