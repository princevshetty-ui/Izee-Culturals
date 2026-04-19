import { Html5Qrcode } from 'html5-qrcode'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const SCANNER_REGION_ID = 'entry-gate-qr-scanner'
const SCAN_THROTTLE_MS = 1400
const VALIDATION_TIMEOUT_MS = 8000
const UUID_REGEX =
  /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i
const SHORT_ID_REGEX = /^[0-9a-fA-F]{8}$/

const preferredCameraScore = (label = '') => {
  const normalized = label.toLowerCase()
  if (normalized.includes('back') || normalized.includes('rear') || normalized.includes('environment')) {
    return 3
  }
  if (normalized.includes('front') || normalized.includes('user') || normalized.includes('face')) {
    return 2
  }
  return 1
}

function extractRegistrationId(rawValue) {
  const value = (rawValue || '').trim()
  if (!value) return ''

  try {
    const parsed = JSON.parse(value)
    if (parsed && typeof parsed === 'object' && typeof parsed.id === 'string') {
      const idFromPayload = parsed.id.trim()
      const uuidInPayload = idFromPayload.match(UUID_REGEX)
      return uuidInPayload ? uuidInPayload[0].toLowerCase() : idFromPayload
    }
  } catch {
    // Non-JSON QR values are handled below.
  }

  const uuidMatch = value.match(UUID_REGEX)
  if (uuidMatch) return uuidMatch[0].toLowerCase()

  return value
}

function resolveValidationEndpoint(normalizedId) {
  if (SHORT_ID_REGEX.test(normalizedId) && !UUID_REGEX.test(normalizedId)) {
    return `/api/validate/short/${normalizedId.toLowerCase()}`
  }
  return `/api/validate/${normalizedId.toLowerCase()}`
}

function getCameraBadgeStyle(cameraState) {
  if (cameraState === 'active') {
    return 'border-emerald-500/45 bg-emerald-900/25 text-emerald-200'
  }
  if (cameraState === 'starting') {
    return 'border-amber-500/45 bg-amber-900/25 text-amber-200'
  }
  if (cameraState === 'denied' || cameraState === 'error' || cameraState === 'unsupported') {
    return 'border-red-500/45 bg-red-900/25 text-red-200'
  }
  return 'border-white/15 bg-[#1A1D24] text-[#EEE6D8]/75'
}

export default function QRValidator() {
  const navigate = useNavigate()
  const [regId, setRegId] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [scanMode, setScanMode] = useState('manual')
  const [scanActive, setScanActive] = useState(false)
  const [scanStatus, setScanStatus] = useState('Ready')
  const [cameraState, setCameraState] = useState('idle')
  const [cameras, setCameras] = useState([])
  const [selectedCameraId, setSelectedCameraId] = useState('')

  const scannerRef = useRef(null)
  const lastScanRef = useRef({ value: '', ts: 0 })
  const scanInFlightRef = useRef(false)
  const scannerStartingRef = useRef(false)

  const validateById = useCallback(async (rawId, source = 'manual') => {
    const normalizedId = extractRegistrationId(rawId)
    if (!normalizedId) {
      setResult({ valid: false, message: 'Please enter a valid registration ID or short pass ID.' })
      return
    }

    if (scanInFlightRef.current) return
    scanInFlightRef.current = true

    if (source === 'scan') {
      setRegId(normalizedId)
      setScanStatus('Code detected. Validating...')
    }

    setLoading(true)
    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => controller.abort(), VALIDATION_TIMEOUT_MS)

    try {
      const endpoint = resolveValidationEndpoint(normalizedId)
      const res = await fetch(endpoint, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      })

      if (!res.ok) {
        throw new Error(`Validation request failed (${res.status})`)
      }

      const data = await res.json()
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid server response')
      }

      setResult(data)

      if (source === 'manual') {
        // Auto clear input after 5 seconds for manual checks.
        setTimeout(() => setRegId(''), 5000)
      } else {
        setScanStatus(data.valid ? 'Entry allowed. Scanner resumed.' : 'Entry denied. Scanner resumed.')
      }
    } catch (err) {
      const aborted = err?.name === 'AbortError'
      setResult({
        valid: false,
        message: aborted
          ? 'Validation timed out. Check connection and retry.'
          : 'Connection error. Please try again.',
      })
      if (source === 'scan') {
        setScanStatus('Validation request failed. Scanner resumed.')
      }
    } finally {
      window.clearTimeout(timeoutId)
      scanInFlightRef.current = false
      setLoading(false)
    }
  }, [])

  const releaseScannerResources = useCallback(async (scanner) => {
    if (!scanner) return

    try {
      await scanner.stop()
    } catch {
      // Ignore stop errors when scanner was not fully started.
    }

    try {
      await scanner.clear()
    } catch {
      // Ignore clear errors to keep shutdown resilient.
    }
  }, [])

  const stopScanner = useCallback(async () => {
    const scanner = scannerRef.current
    scannerRef.current = null

    await releaseScannerResources(scanner)

    setScanActive(false)
  }, [releaseScannerResources])

  const getAvailableCameras = useCallback(async () => {
    const listedCameras = await Html5Qrcode.getCameras()
    if (!listedCameras || listedCameras.length === 0) {
      return []
    }

    return [...listedCameras].sort(
      (a, b) => preferredCameraScore(b.label) - preferredCameraScore(a.label),
    )
  }, [])

  const resumeScannerIfRunning = useCallback(() => {
    const scanner = scannerRef.current
    if (!scanner) return

    try {
      scanner.resume()
    } catch {
      // Resume can fail if scanner already stopped; ignore.
    }
  }, [])

  const handleDecodedText = useCallback(
    async (decodedText) => {
      const normalizedId = extractRegistrationId(decodedText)
      if (!normalizedId) {
        setScanStatus('QR detected but ID payload was invalid.')
        return
      }

      const now = Date.now()
      if (
        normalizedId.toLowerCase() === lastScanRef.current.value &&
        now - lastScanRef.current.ts < SCAN_THROTTLE_MS
      ) {
        return
      }

      lastScanRef.current = { value: normalizedId.toLowerCase(), ts: now }

      const scanner = scannerRef.current
      try {
        scanner?.pause(true)
      } catch {
        // Pause failures are non-fatal.
      }

      await validateById(normalizedId, 'scan')
      resumeScannerIfRunning()
    },
    [resumeScannerIfRunning, validateById],
  )

  const startScanner = useCallback(
    async (explicitCameraId = '') => {
      if (scannerStartingRef.current || loading) return

      scannerStartingRef.current = true

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraState('unsupported')
        setScanStatus('Camera API not available. Use manual entry.')
        scannerStartingRef.current = false
        return
      }

      const mountNode = document.getElementById(SCANNER_REGION_ID)
      if (!mountNode) {
        setCameraState('error')
        setScanStatus('Scanner view is not ready. Try again.')
        scannerStartingRef.current = false
        return
      }

      setCameraState('starting')
      setScanStatus('Detecting cameras...')

      try {
        const listedCameras = await getAvailableCameras()
        setCameras(listedCameras)

        if (listedCameras.length === 0) {
          setCameraState('unsupported')
          setScanStatus('No camera detected. Use manual entry.')
          scannerStartingRef.current = false
          return
        }

        const fallbackCameraId =
          explicitCameraId || selectedCameraId || listedCameras[0]?.id || ''

        if (!fallbackCameraId) {
          setCameraState('unsupported')
          setScanStatus('No camera detected. Use manual entry.')
          scannerStartingRef.current = false
          return
        }

        await stopScanner()
        setScanStatus('Requesting camera permission...')

        const scanner = new Html5Qrcode(SCANNER_REGION_ID, { verbose: false })
        scannerRef.current = scanner

        await scanner.start(
          fallbackCameraId,
          {
            fps: 12,
            qrbox: { width: 260, height: 260 },
            aspectRatio: 1.333334,
          },
          (decodedText) => {
            if (scanInFlightRef.current) return
            scanInFlightRef.current = true
            void handleDecodedText(decodedText).finally(() => {
              scanInFlightRef.current = false
            })
          },
          () => {
            // Frame decode misses are expected; no-op.
          },
        )

        setSelectedCameraId(fallbackCameraId)
        setScanActive(true)
        setCameraState('active')
        setScanStatus('Scanner active. Point camera at the QR code.')
      } catch (err) {
        const message = String(err || '')
        if (/NotAllowedError|Permission denied|PermissionDismissed/i.test(message)) {
          setCameraState('denied')
          setScanStatus('Camera access denied. Allow permission or use manual entry.')
        } else {
          setCameraState('error')
          setScanStatus('Could not start camera scanner. Try manual entry.')
        }
        await stopScanner()
      } finally {
        scannerStartingRef.current = false
      }
    },
    [getAvailableCameras, handleDecodedText, loading, selectedCameraId, stopScanner],
  )

  useEffect(() => {
    return () => {
      const scanner = scannerRef.current
      scannerRef.current = null
      void releaseScannerResources(scanner)
    }
  }, [releaseScannerResources])

  const validate = async () => {
    await validateById(regId, 'manual')
  }

  const switchToManualMode = () => {
    setScanMode('manual')
    setScanActive(false)
    setScanStatus('Ready')
    setCameraState('idle')
    void stopScanner()
  }

  const switchToScanMode = () => {
    setScanMode('scan')
    setResult(null)
    setScanStatus('Initializing scanner...')
    window.requestAnimationFrame(() => {
      void startScanner()
    })
  }

  const onManualInputChange = (value) => {
    setRegId(value.replace(/\s+/g, ''))
  }

  const onCameraChange = (cameraId) => {
    setSelectedCameraId(cameraId)
    if (scanMode === 'scan') {
      void startScanner(cameraId)
    }
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#0C0D10] text-[#EEE6D8] font-body">
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            'radial-gradient(ellipse at 50% 20%, rgba(190,163,93,0.08) 0%, transparent 68%)',
        }}
      />
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            'radial-gradient(ellipse at 15% 80%, rgba(158,38,54,0.06) 0%, transparent 52%)',
        }}
      />

      <main className="relative z-10 mx-auto w-full max-w-6xl px-4 py-8 sm:px-8">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <button
            onClick={() => navigate('/')}
            className="inline-flex w-fit items-center rounded-full border border-[#C9A84C]/30 bg-[#131419]/70 px-4 py-2 text-sm text-[#EEE6D8]/80 transition hover:border-[#C9A84C]/70 hover:text-[#EEE6D8]"
          >
            {'<- Home'}
          </button>

          <div className="text-right">
            <p className="text-xs uppercase tracking-[0.24em] text-[#C9A84C]/80">IZee Got Talent</p>
            <h1 className="font-display text-3xl leading-tight text-[#EEE6D8] sm:text-4xl">
              Entry Gate Validation
            </h1>
            <p className="text-sm text-[#EEE6D8]/60">Fast scan with resilient manual fallback</p>
            <div className="mt-2 flex flex-wrap justify-end gap-2">
              <span className="rounded-full border border-[#C9A84C]/30 bg-[#C9A84C]/10 px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-[#EAD79B]">
                Gate Desk Mode
              </span>
              <span className="rounded-full border border-white/15 bg-[#191c23] px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-[#EEE6D8]/70">
                No Page Reload Needed
              </span>
            </div>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1.12fr_0.88fr]">
          <article className="rounded-2xl border border-[#C9A84C]/30 bg-[linear-gradient(180deg,rgba(18,19,24,0.96)_0%,rgba(14,15,20,0.88)_100%)] p-5 shadow-[0_0_0_1px_rgba(201,168,76,0.06),0_20px_60px_rgba(0,0,0,0.45)]">
            <div className="mb-4 grid grid-cols-2 gap-2">
              <button
                onClick={switchToManualMode}
                className={`rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                  scanMode === 'manual'
                    ? 'border-[#C9A84C] bg-[#C9A84C]/15 text-[#E8D7A1]'
                    : 'border-white/10 bg-[#1A1C22] text-[#EEE6D8]/70 hover:border-[#C9A84C]/45'
                }`}
              >
                Manual Mode
              </button>
              <button
                onClick={switchToScanMode}
                className={`rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                  scanMode === 'scan'
                    ? 'border-[#C9A84C] bg-[#C9A84C]/15 text-[#E8D7A1]'
                    : 'border-white/10 bg-[#1A1C22] text-[#EEE6D8]/70 hover:border-[#C9A84C]/45'
                }`}
              >
                Scan Mode
              </button>
            </div>

            {scanMode === 'scan' ? (
              <>
                <div className="relative">
                  <div
                    className="pointer-events-none absolute inset-0 z-10 rounded-xl border border-[#C9A84C]/25"
                    aria-hidden="true"
                  />
                  <div
                    className="pointer-events-none absolute inset-0 z-10 rounded-xl"
                    style={{
                      background:
                        'linear-gradient(120deg, rgba(201,168,76,0.1) 0%, rgba(201,168,76,0.02) 45%, rgba(201,168,76,0.08) 100%)',
                    }}
                    aria-hidden="true"
                  />
                  <div
                    id={SCANNER_REGION_ID}
                    className="relative z-0 min-h-[320px] overflow-hidden rounded-xl border border-white/10 bg-black"
                  />
                  <span className="pointer-events-none absolute left-3 top-3 z-20 rounded border border-[#C9A84C]/55 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#EAD79B]">
                    Scan Zone
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${getCameraBadgeStyle(cameraState)}`}
                  >
                    Camera: {cameraState}
                  </span>
                  <span className="rounded-full border border-white/15 bg-[#1A1D24] px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-[#EEE6D8]/70">
                    Mode: Scan
                  </span>
                </div>

                <p className="mt-3 rounded-lg border border-white/10 bg-[#171a21] px-3 py-2 text-sm text-[#EEE6D8]/85">
                  {scanStatus}
                </p>

                {(cameraState === 'denied' || cameraState === 'unsupported' || cameraState === 'error') && (
                  <p className="mt-2 rounded-lg border border-red-500/40 bg-red-900/20 px-3 py-2 text-sm text-red-200">
                    Camera could not start. Use manual mode or allow browser camera permission.
                  </p>
                )}

                {cameras.length > 1 && (
                  <div className="mt-3">
                    <label className="mb-1 block text-xs uppercase tracking-[0.18em] text-[#EEE6D8]/55">
                      Camera Source
                    </label>
                    <select
                      value={selectedCameraId}
                      onChange={(e) => onCameraChange(e.target.value)}
                      className="w-full rounded-lg border border-white/10 bg-[#181A20] px-3 py-2 text-sm text-[#EEE6D8] outline-none focus:border-[#C9A84C]/60"
                    >
                      {cameras.map((camera, index) => (
                        <option key={camera.id} value={camera.id}>
                          {camera.label || `Camera ${index + 1}`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => void startScanner()}
                    disabled={scanActive || loading}
                    className="rounded-lg border border-[#C9A84C]/35 bg-[#22262f] px-3 py-2 text-sm font-semibold text-[#EEE6D8] transition-colors hover:border-[#C9A84C]/70 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Start Camera
                  </button>
                  <button
                    onClick={() => void stopScanner()}
                    disabled={!scanActive}
                    className="rounded-lg border border-white/15 bg-[#16181f] px-3 py-2 text-sm font-semibold text-[#EEE6D8]/85 transition-colors hover:border-white/40 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Stop Camera
                  </button>
                </div>
              </>
            ) : (
              <div className="rounded-xl border border-white/10 bg-[#16181f] p-4">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-[#C9A84C]/35 bg-[#C9A84C]/10 px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-[#EAD79B]">
                    Mode: Manual
                  </span>
                  <span className="rounded-full border border-white/15 bg-[#1A1D24] px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-[#EEE6D8]/70">
                    Faster with Short ID
                  </span>
                </div>
                <p className="text-sm text-[#EEE6D8]/85">
                  Manual mode now accepts both:
                </p>
                <ul className="mt-2 space-y-1 text-sm text-[#EEE6D8]/70">
                  <li>- Full registration ID (UUID)</li>
                  <li>- Short Pass ID (first 8 characters shown near QR)</li>
                </ul>
                <p className="mt-3 text-xs uppercase tracking-[0.16em] text-[#C9A84C]/80">
                  Example short ID: 36F6D3AE
                </p>
              </div>
            )}
          </article>

          <article className="rounded-2xl border border-white/10 bg-[#121318]/85 p-5 shadow-[0_18px_50px_rgba(0,0,0,0.35)]">
            <label className="mb-2 block text-xs uppercase tracking-[0.2em] text-[#EEE6D8]/55">
              Registration ID or Short Pass ID
            </label>
            <input
              type="text"
              value={regId}
              onChange={(e) => onManualInputChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && validate()}
              placeholder="Paste full ID or enter 8-char Pass ID"
              className="w-full rounded-lg border border-white/10 bg-[#1A1D24] px-4 py-4 text-lg text-[#EEE6D8] placeholder:text-[#EEE6D8]/35 focus:border-[#C9A84C]/65 focus:outline-none"
            />
            <p className="mt-2 text-xs text-[#EEE6D8]/55">
              Tip: Enter the 8-character ID printed under QR for fastest manual verification.
            </p>

            <button
              onClick={validate}
              disabled={loading}
              className="mt-3 w-full rounded-lg bg-gradient-to-r from-amber-700 to-amber-500 px-4 py-4 text-lg font-semibold text-white shadow-[0_12px_28px_rgba(180,120,20,0.35)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-55"
            >
              {loading ? 'Validating...' : 'Validate Entry'}
            </button>

            {result && (
              <div
                className={`mt-5 rounded-xl border p-5 ${
                  result.valid
                    ? 'border-emerald-500/55 bg-emerald-900/20'
                    : 'border-red-500/55 bg-red-900/20'
                }`}
              >
                <p className="mb-3 text-2xl font-bold tracking-wide">
                  {result.valid ? 'ENTRY ALLOWED' : 'ENTRY DENIED'}
                </p>

                {result.valid && result.data && (
                  <div className="space-y-1.5 text-[15px]">
                    <p>
                      <span className="text-[#EEE6D8]/60">Name:</span> {result.data.name}
                    </p>
                    <p>
                      <span className="text-[#EEE6D8]/60">Role:</span> {result.data.role}
                    </p>
                    <p>
                      <span className="text-[#EEE6D8]/60">Course:</span> {result.data.course}
                    </p>
                    <p>
                      <span className="text-[#EEE6D8]/60">Year:</span> {result.data.year}
                    </p>
                    <p>
                      <span className="text-[#EEE6D8]/60">Roll No:</span> {result.data.roll_no}
                    </p>
                    {result.data.registration_id && (
                      <p>
                        <span className="text-[#EEE6D8]/60">Reg ID:</span> {result.data.registration_id}
                      </p>
                    )}
                    {result.data.events && (
                      <p>
                        <span className="text-[#EEE6D8]/60">Events:</span> {result.data.events.join(', ')}
                      </p>
                    )}
                    {result.data.team_label && (
                      <p>
                        <span className="text-[#EEE6D8]/60">Team:</span> {result.data.team_label}
                      </p>
                    )}
                  </div>
                )}

                {!result.valid && <p className="text-base text-red-200">{result.message}</p>}
              </div>
            )}
          </article>
        </section>
      </main>
    </div>
  )
}
