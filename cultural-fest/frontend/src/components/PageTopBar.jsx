export default function PageTopBar({
  breadcrumb,
  onBack,
  backLabel = 'Back',
  rightSlot = null,
  maxWidthClass = 'max-w-6xl',
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-[#EEE6D8]/10 bg-[#080910]/88 backdrop-blur-md">
      <div className={`mx-auto w-full ${maxWidthClass} px-4 py-3 sm:px-6 lg:px-8`}>
        <div className="flex items-center justify-between gap-4">
          <div className="inline-flex min-w-0 items-center gap-3.5">
            <img
              src="/college-logo.png"
              alt="IZee Got Talent"
              className="h-10 w-auto object-contain"
            />
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#BEA35D]/90">IZee Got Talent</p>
              <p className="truncate text-[10px] uppercase tracking-[0.14em] text-[#EEE6D8]/38">{breadcrumb}</p>
            </div>
          </div>

          <div className="inline-flex items-center gap-3">
            {rightSlot}
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-2 rounded-full border border-[#EEE6D8]/16 bg-[rgba(255,255,255,0.04)] px-3 py-1.5 text-xs font-medium uppercase tracking-[0.08em] text-[#EEE6D8]/82 transition hover:border-[#EEE6D8]/28 hover:bg-[rgba(255,255,255,0.07)] hover:text-[#EEE6D8]"
              aria-label={backLabel}
            >
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-[#BEA35D]/45 bg-[rgba(190,163,93,0.12)] text-[13px] leading-none text-[#BEA35D]">
                <svg viewBox="0 0 16 16" width="10" height="10" fill="none" aria-hidden="true">
                  <path d="M9.75 3.25 5 8l4.75 4.75" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              {backLabel}
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
