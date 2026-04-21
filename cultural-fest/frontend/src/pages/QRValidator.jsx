import { Html5Qrcode } from 'html5-qrcode'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PageTopBar from '../components/PageTopBar'
import { apiFetch } from '../utils/api'

const SCANNER_REGION_ID = 'entry-gate-qr-scanner'
const SCAN_THROTTLE_MS = 1400
const VALIDATION_TIMEOUT_MS = 8000
const ACCESS_TIMEOUT_MS = 7000
const GATE_ACCESS_SESSION_KEY = 'gate-access-session-v1'
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

const sleep = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms))

function withNoCache(url) {
  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}_ts=${Date.now()}`
}

async function fetchJsonWithRetry(url, options = {}, config = {}) {
  const {
    timeoutMs = VALIDATION_TIMEOUT_MS,
    retries = 2,
    retryDelayMs = 350,
  } = config

  let lastError

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs)

    try {
      const response = await apiFetch(withNoCache(url), {
        ...options,
        cache: 'no-store',
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          ...(options.headers || {}),
        },
      })

      const retryableStatus = response.status >= 500 || response.status === 429 || response.status === 408

      if (!response.ok) {
        const bodyText = await response.text().catch(() => '')
        const error = new Error(bodyText || `Request failed (${response.status})`)
        error.retryable = retryableStatus
        throw error
      }

      const data = await response.json()
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid server response')
      }

      return data
    } catch (error) {
      lastError = error
      const aborted = error?.name === 'AbortError'
      const retryable = aborted || error?.retryable || error instanceof TypeError

      if (attempt < retries && retryable) {
        await sleep(retryDelayMs * (attempt + 1))
        continue
      }

      throw error
    } finally {
      window.clearTimeout(timeoutId)
    }
  }

  throw lastError || new Error('Request failed')
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
    return 'border-teal-500/45 bg-teal-900/25 text-teal-200'
  }
  if (cameraState === 'denied' || cameraState === 'error' || cameraState === 'unsupported') {
    return 'border-red-500/45 bg-red-900/25 text-red-200'
  }
  return 'border-white/15 bg-[#1A1D24] text-[#EEE6D8]/75'
}

function readGateSession() {
  try {
    const raw = sessionStorage.getItem(GATE_ACCESS_SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || !parsed.id) return null
    return parsed
  } catch {
    return null
  }
}

export default function QRValidator() {
  const navigate = useNavigate()
  const [gateUser, setGateUser] = useState(() => readGateSession())
  const [accessRollNo, setAccessRollNo] = useState('')
  const [accessEmail, setAccessEmail] = useState('')
  const [accessLoading, setAccessLoading] = useState(false)
  const [accessError, setAccessError] = useState('')

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

    if (source === 'manual' && loading) return

    if (source === 'scan') {
      setRegId(normalizedId)
      setScanStatus('Code detected. Validating...')
    }

    setLoading(true)

    try {
      const endpoint = resolveValidationEndpoint(normalizedId)
      const data = await fetchJsonWithRetry(endpoint, {}, { timeoutMs: VALIDATION_TIMEOUT_MS, retries: 2 })
      setResult(data)

      if (source === 'manual') {
        window.setTimeout(() => setRegId(''), 5000)
      } else {
        setScanStatus(data.valid ? 'Entry allowed. Scanner resumed.' : 'Entry denied. Scanner resumed.')
      }
    } catch (error) {
      const aborted = error?.name === 'AbortError'
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
      setLoading(false)
    }
  }, [loading])

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
        normalizedId.toLowerCase() === lastScanRef.current.value
        && now - lastScanRef.current.ts < SCAN_THROTTLE_MS
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

  const handleAccessLogin = async (event) => {
    event.preventDefault()
    if (accessLoading) return

    const rollNo = accessRollNo.trim()
    const email = accessEmail.trim().toLowerCase()

    if (!rollNo || !email) {
      setAccessError('Enter volunteer roll number and email.')
      return
    }

    setAccessLoading(true)
    setAccessError('')

    try {
      const data = await fetchJsonWithRetry(
        '/api/validate/access/login',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ roll_no: rollNo, email }),
        },
        {
          timeoutMs: ACCESS_TIMEOUT_MS,
          retries: 1,
          retryDelayMs: 300,
        },
      )

      if (!data.success || !data.data?.authorized || !data.data?.volunteer) {
        setAccessError(data.message || 'Access denied.')
        return
      }

      const volunteer = data.data.volunteer
      setGateUser(volunteer)
      setAccessRollNo('')
      setAccessEmail('')
      setResult(null)
      sessionStorage.setItem(GATE_ACCESS_SESSION_KEY, JSON.stringify(volunteer))
    } catch {
      setAccessError('Unable to sign in now. Check network and retry.')
    } finally {
      setAccessLoading(false)
    }
  }

  const handleGateLogout = () => {
    sessionStorage.removeItem(GATE_ACCESS_SESSION_KEY)
    setGateUser(null)
    setResult(null)
    switchToManualMode()
  }

  if (!gateUser) {
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

        <PageTopBar
          breadcrumb="Home → Gate Validation → Access Login"
          onBack={() => navigate('/')}
          backLabel="Home"
          maxWidthClass="max-w-lg"
        />

        <main className="relative z-10 mx-auto flex w-full max-w-lg flex-col justify-center px-5 py-8">

          <section className="rounded-2xl border border-[#14B8A6]/30 bg-[#121318]/90 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.35)]">
            <p className="text-xs uppercase tracking-[0.24em] text-[#14B8A6]/85">IZee Got Talent</p>
            <h1 className="mt-1 font-display text-3xl leading-tight text-[#EEE6D8]">
              Gate Access Login
            </h1>
            <p className="mt-2 text-sm text-[#EEE6D8]/70">
              Only registered volunteers can access entry validation.
            </p>

            <form onSubmit={handleAccessLogin} className="mt-5 space-y-3">
              <div>
                <label className="mb-1 block text-xs uppercase tracking-[0.16em] text-[#EEE6D8]/55">
                  Volunteer Roll Number
                </label>
                <input
                  value={accessRollNo}
                  onChange={(e) => setAccessRollNo(e.target.value)}
                  placeholder="Enter roll number"
                  className="w-full rounded-lg border border-white/10 bg-[#1A1D24] px-4 py-3 text-[#EEE6D8] placeholder:text-[#EEE6D8]/35 focus:border-[#14B8A6]/65 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs uppercase tracking-[0.16em] text-[#EEE6D8]/55">
                  Volunteer Email
                </label>
                <input
                  type="email"
                  value={accessEmail}
                  onChange={(e) => setAccessEmail(e.target.value)}
                  placeholder="Enter registered email"
                  className="w-full rounded-lg border border-white/10 bg-[#1A1D24] px-4 py-3 text-[#EEE6D8] placeholder:text-[#EEE6D8]/35 focus:border-[#14B8A6]/65 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={accessLoading}
                className="w-full rounded-lg bg-gradient-to-r from-teal-700 to-teal-500 px-4 py-3 text-base font-semibold text-white shadow-[0_12px_28px_rgba(20,184,166,0.3)] transition hover:brightness-110 active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-55"
              >
                {accessLoading ? 'Verifying...' : 'Unlock Validator'}
              </button>
            </form>

            {accessError && (
              <p className="mt-3 rounded-lg border border-red-500/40 bg-red-900/20 px-3 py-2 text-sm text-red-200">
                {accessError}
              </p>
            )}
          </section>
        </main>
      </div>
    )
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

      <PageTopBar
        breadcrumb="Home → Gate Validation → Entry Checkpoint"
        onBack={() => navigate('/')}
        backLabel="Home"
        maxWidthClass="max-w-6xl"
        rightSlot={
          <button
            onClick={handleGateLogout}
            className="inline-flex w-fit items-center rounded-full border border-white/20 bg-[#191c23] px-4 py-2 text-sm text-[#EEE6D8]/80 transition hover:border-white/40 hover:text-[#EEE6D8]"
          >
            Logout
          </button>
        }
      />

      <main className="relative z-10 mx-auto w-full max-w-6xl px-4 py-8 sm:px-8">
        <header className="mb-8">
          <h1 className="font-display text-3xl leading-tight text-[#EEE6D8] sm:text-4xl">
            Entry Gate Validation
          </h1>
          <p className="mt-2 text-sm text-[#EEE6D8]/65">
            Signed in: {gateUser.name || gateUser.roll_no || gateUser.email}
          </p>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1.12fr_0.88fr]">
          <article className="rounded-2xl border border-[#14B8A6]/30 bg-[linear-gradient(180deg,rgba(18,19,24,0.96)_0%,rgba(14,15,20,0.88)_100%)] p-5 shadow-[0_0_0_1px_rgba(20,184,166,0.08),0_20px_60px_rgba(0,0,0,0.45)]">
            <div className="mb-4 grid grid-cols-2 gap-2">
              <button
                onClick={switchToManualMode}
                className={`rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                  scanMode === 'manual'
                    ? 'border-[#14B8A6] bg-[#14B8A6]/15 text-[#9EF4EA]'
                    : 'border-white/10 bg-[#1A1C22] text-[#EEE6D8]/70 hover:border-[#14B8A6]/45'
                }`}
              >
                Manual Mode
              </button>
              <button
                onClick={switchToScanMode}
                className={`rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                  scanMode === 'scan'
                    ? 'border-[#14B8A6] bg-[#14B8A6]/15 text-[#9EF4EA]'
                    : 'border-white/10 bg-[#1A1C22] text-[#EEE6D8]/70 hover:border-[#14B8A6]/45'
                }`}
              >
                Scan Mode
              </button>
            </div>

            {scanMode === 'scan' ? (
              <>
                <div className="relative">
                  <div
                    className="pointer-events-none absolute inset-0 z-10 rounded-xl border border-[#14B8A6]/25"
                    aria-hidden="true"
                  />
                  <div
                    className="pointer-events-none absolute inset-0 z-10 rounded-xl"
                    style={{
                      background:
                        'linear-gradient(120deg, rgba(20,184,166,0.12) 0%, rgba(20,184,166,0.03) 45%, rgba(20,184,166,0.1) 100%)',
                    }}
                    aria-hidden="true"
                  />
                  <div
                    id={SCANNER_REGION_ID}
                    className="relative z-0 min-h-[320px] overflow-hidden rounded-xl border border-white/10 bg-black"
                  />
                  <span className="pointer-events-none absolute left-3 top-3 z-20 rounded border border-[#14B8A6]/55 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#9EF4EA]">
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
                      className="w-full rounded-lg border border-white/10 bg-[#181A20] px-3 py-2 text-sm text-[#EEE6D8] outline-none focus:border-[#14B8A6]/60"
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
                    className="rounded-lg border border-[#14B8A6]/35 bg-[#22262f] px-3 py-2 text-sm font-semibold text-[#EEE6D8] transition-colors hover:border-[#14B8A6]/70 active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-50"
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
                  <span className="rounded-full border border-[#14B8A6]/35 bg-[#14B8A6]/10 px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-[#9EF4EA]">
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
                <p className="mt-3 text-xs uppercase tracking-[0.16em] text-[#14B8A6]/80">
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
              className="w-full rounded-lg border border-white/10 bg-[#1A1D24] px-4 py-4 text-lg text-[#EEE6D8] placeholder:text-[#EEE6D8]/35 focus:border-[#14B8A6]/65 focus:outline-none"
            />
            <p className="mt-2 text-xs text-[#EEE6D8]/55">
              Tip: Enter the 8-character ID printed under QR for fastest manual verification.
            </p>

            <button
              onClick={validate}
              disabled={loading}
              className="mt-3 w-full rounded-lg bg-gradient-to-r from-teal-700 to-teal-500 px-4 py-4 text-lg font-semibold text-white shadow-[0_12px_28px_rgba(20,184,166,0.3)] transition hover:brightness-110 active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-55"
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
                      <span className="text-[#EEE6D8]/60">Name:</span> {result.data.name || '—'}
                    </p>
                    <p>
                      <span className="text-[#EEE6D8]/60">Role:</span> {result.data.role || '—'}
                    </p>
                    <p>
                      <span className="text-[#EEE6D8]/60">Course:</span> {result.data.course || '—'}
                    </p>
                    <p>
                      <span className="text-[#EEE6D8]/60">Year:</span> {result.data.year || '—'}
                    </p>
                    <p>
                      <span className="text-[#EEE6D8]/60">Roll No:</span> {result.data.roll_no || '—'}
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

                    {result.data.already_scanned && (
                      <p className="mt-2 rounded-lg border border-amber-400/35 bg-amber-900/20 px-3 py-2 text-sm text-amber-200">
                        {result.message || 'Entry Valid. Already Scanned.'}
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
