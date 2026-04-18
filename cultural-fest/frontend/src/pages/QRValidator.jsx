import { useEffect, useRef, useState } from 'react'

export default function QRValidator() {
  const [enteredId, setEnteredId] = useState('')
  const [isValidating, setIsValidating] = useState(false)
  const [result, setResult] = useState(null)
  const clearTimerRef = useRef(null)

  useEffect(() => {
    return () => {
      if (clearTimerRef.current) {
        clearTimeout(clearTimerRef.current)
      }
    }
  }, [])

  const scheduleInputClear = () => {
    if (clearTimerRef.current) {
      clearTimeout(clearTimerRef.current)
    }

    clearTimerRef.current = setTimeout(() => {
      setEnteredId('')
      clearTimerRef.current = null
    }, 5000)
  }

  const handleValidate = async () => {
    const trimmedId = enteredId.trim()
    if (!trimmedId || isValidating) return

    setIsValidating(true)

    try {
      const response = await fetch(`/api/validate/${encodeURIComponent(trimmedId)}`)
      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        setResult({
          valid: false,
          message: 'Unable to validate right now. Please retry.',
        })
      } else {
        setResult({
          valid: Boolean(payload?.valid),
          message: payload?.message || '',
          data: payload?.data || null,
        })
      }
    } catch {
      setResult({
        valid: false,
        message: 'Network error. Please check connection and retry.',
      })
    } finally {
      setIsValidating(false)
      scheduleInputClear()
    }
  }

  const isValid = Boolean(result?.valid)

  return (
    <div className="min-h-screen bg-[#0A0A0A] px-4 py-6 text-[18px] text-[#F5F0E8] sm:px-6">
      <div className="mx-auto w-full max-w-[560px]">
        <h1 className="text-[30px] font-semibold leading-tight text-[#F5F0E8]">
          IZee Got Talent — Entry Gate
        </h1>
        <p className="mt-2 text-[18px] text-[rgba(245,240,232,0.68)]">
          Registration & Reception Team Validation Panel
        </p>

        <div
          className="relative mt-6 aspect-square w-full overflow-hidden rounded-2xl border"
          style={{
            borderColor: 'rgba(201,168,76,0.28)',
            background:
              'radial-gradient(circle at 50% 0%, rgba(201,168,76,0.12), rgba(201,168,76,0.03) 38%, rgba(245,240,232,0.04) 100%)',
          }}
        >
          <div className="absolute inset-0 border-2 border-dashed border-[rgba(201,168,76,0.25)] m-4 rounded-xl" />
          <div className="scan-line absolute left-4 right-4 h-[2px] rounded-full bg-[#C9A84C] shadow-[0_0_20px_rgba(201,168,76,0.8)]" />
          <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-[20px] font-medium text-[#F5F0E8]">
            Enter Registration ID shown below the QR pass
          </div>
        </div>

        <label htmlFor="registration-id" className="mt-6 block text-[20px] font-semibold text-[#F5F0E8]">
          Enter Registration ID manually
        </label>
        <div className="mt-3 flex gap-3">
          <input
            id="registration-id"
            value={enteredId}
            onChange={(event) => setEnteredId(event.target.value)}
            placeholder="e.g. 3f1f66ab-..."
            className="h-14 flex-1 rounded-xl border bg-transparent px-4 text-[20px] outline-none"
            style={{
              borderColor: 'rgba(245,240,232,0.2)',
              color: '#F5F0E8',
            }}
          />
          <button
            type="button"
            onClick={handleValidate}
            disabled={isValidating || !enteredId.trim()}
            className="h-14 rounded-xl px-5 text-[20px] font-semibold disabled:opacity-50"
            style={{
              background: '#C9A84C',
              color: '#0A0A0A',
            }}
          >
            {isValidating ? 'Validating...' : 'Validate Entry'}
          </button>
        </div>

        {result && (
          <div
            className="mt-6 rounded-2xl border px-5 py-5"
            style={
              isValid
                ? {
                    borderColor: 'rgba(74,222,128,0.45)',
                    background: 'rgba(22,101,52,0.28)',
                  }
                : {
                    borderColor: 'rgba(248,113,113,0.5)',
                    background: 'rgba(127,29,29,0.26)',
                  }
            }
          >
            {isValid ? (
              <div>
                <p className="text-[30px] font-extrabold text-[#86EFAC]">ENTRY ALLOWED</p>
                <p className="mt-4 text-[20px]"><span className="font-semibold">Name:</span> {result.data?.name || '-'}</p>
                <p className="mt-2 text-[20px]"><span className="font-semibold">Role:</span> {result.data?.role || '-'}</p>
                <p className="mt-2 text-[20px]">
                  <span className="font-semibold">Course:</span> {result.data?.course || '-'}
                  {' '}|{' '}
                  <span className="font-semibold">Year:</span> {result.data?.year || '-'}
                </p>
                <p className="mt-2 text-[20px]"><span className="font-semibold">Roll No:</span> {result.data?.roll_no || '-'}</p>

                {Array.isArray(result.data?.events) && result.data.events.length > 0 && (
                  <p className="mt-2 text-[20px]"><span className="font-semibold">Events:</span> {result.data.events.join(', ')}</p>
                )}

                {result.data?.team_label && (
                  <p className="mt-2 text-[20px]"><span className="font-semibold">Team:</span> {result.data.team_label}</p>
                )}

                {result.data?.group_name && (
                  <p className="mt-2 text-[20px]"><span className="font-semibold">Group:</span> {result.data.group_name}</p>
                )}
              </div>
            ) : (
              <div>
                <p className="text-[30px] font-extrabold text-[#FCA5A5]">ENTRY DENIED</p>
                <p className="mt-4 text-[20px] text-[#FECACA]">{result.message || 'Validation failed.'}</p>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        .scan-line {
          top: 14%;
          animation: scanner-move 2s linear infinite;
        }

        @keyframes scanner-move {
          0% {
            top: 14%;
            opacity: 0.95;
          }
          50% {
            top: 82%;
            opacity: 1;
          }
          100% {
            top: 14%;
            opacity: 0.95;
          }
        }
      `}</style>
    </div>
  )
}
