import { Html5Qrcode } from 'html5-qrcode'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const SCANNER_REGION_ID = 'entry-gate-qr-scanner'
const SCAN_THROTTLE_MS = 1800
const UUID_REGEX =
  /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i

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

export default function QRValidator() {
  const navigate = useNavigate()
  const [regId, setRegId] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [scanMode, setScanMode] = useState(false)
  const [scanActive, setScanActive] = useState(false)
  const [scanStatus, setScanStatus] = useState('')
  const [cameraState, setCameraState] = useState('idle')

  const scannerRef = useRef(null)
  const lastScanRef = useRef({ value: '', ts: 0 })

  const validateById = useCallback(async (rawId, source = 'manual') => {
    const lookupId = (rawId || '').trim()
    if (!lookupId) return

    if (source === 'scan') {
      setRegId(lookupId)
      setScanStatus('Code detected. Validating...')
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/validate/${lookupId}`)
      const data = await res.json()
      setResult(data)

      if (source === 'manual') {
        // Auto clear input after 5 seconds for manual checks.
        setTimeout(() => setRegId(''), 5000)
      } else {
        setScanStatus('Ready for next scan')
      }
    } catch {
      setResult({ valid: false, message: 'Connection error' })
      if (source === 'scan') {
        setScanStatus('Validation request failed. Try again.')
      }
    }
    setLoading(false)
  }, [])

  const stopScanner = useCallback(async () => {
    const scanner = scannerRef.current
    scannerRef.current = null

    if (!scanner) {
      setScanActive(false)
      return
    }

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

    setScanActive(false)
  }, [])

  const startScanner = useCallback(async () => {
    if (scannerRef.current || loading) return

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraState('unsupported')
      setScanStatus('Camera API not available. Use manual entry.')
      return
    }

    const mountNode = document.getElementById(SCANNER_REGION_ID)
    if (!mountNode) {
      setCameraState('error')
      setScanStatus('Scanner view is not ready. Try again.')
      return
    }

    setCameraState('starting')
    setScanStatus('Requesting camera permission...')

    const scanner = new Html5Qrcode(SCANNER_REGION_ID, { verbose: false })
    scannerRef.current = scanner

    try {
      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.333334,
        },
        (decodedText) => {
          const normalizedId = extractRegistrationId(decodedText)
          if (!normalizedId) {
            setResult({ valid: false, message: 'Could not read registration ID from QR.' })
            return
          }

          const now = Date.now()
          if (
            normalizedId === lastScanRef.current.value &&
            now - lastScanRef.current.ts < SCAN_THROTTLE_MS
          ) {
            return
          }

          lastScanRef.current = { value: normalizedId, ts: now }
          void validateById(normalizedId, 'scan')
        },
        () => {
          // Frame decode misses are expected; no-op.
        },
      )

      setScanActive(true)
      setCameraState('active')
      setScanStatus('Scanner active. Point camera at QR code.')
    } catch (err) {
      const message = String(err || '')
      if (/NotAllowedError|Permission denied/i.test(message)) {
        setCameraState('denied')
        setScanStatus('Camera access denied. Use manual entry or allow permission.')
      } else {
        setCameraState('error')
        setScanStatus('Could not start camera scanner. Try manual entry.')
      }
      await stopScanner()
    }
  }, [loading, stopScanner, validateById])

  useEffect(() => {
    return () => {
      const scanner = scannerRef.current
      if (!scanner) return

      scannerRef.current = null
      void (async () => {
        try {
          await scanner.stop()
        } catch {
          // Ignore stop errors when scanner was not fully started.
        }
        try {
          await scanner.clear()
        } catch {
          // Ignore clear errors during passive cleanup.
        }
      })()
    }
  }, [])

  const validate = async () => {
    await validateById(regId, 'manual')
  }

  const switchToManualMode = () => {
    setScanMode(false)
    setScanActive(false)
    setScanStatus('')
    setCameraState('idle')
    void stopScanner()
  }

  const switchToScanMode = () => {
    setScanMode(true)
    setResult(null)
    setScanStatus('Initializing scanner...')
    setTimeout(() => {
      void startScanner()
    }, 0)
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6">
      <button
        onClick={() => navigate('/')}
        className="absolute top-4 left-4 text-gray-400 hover:text-white text-sm"
      >
        {'<- Home'}
      </button>

      <h1 className="text-2xl font-bold text-amber-400 mb-2 text-center">IZee Got Talent</h1>
      <p className="text-gray-400 mb-8 text-center">Entry Gate Validation</p>

      <div className="w-full max-w-md mb-4 grid grid-cols-2 gap-2">
        <button
          onClick={switchToManualMode}
          className={`rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
            !scanMode
              ? 'border-amber-500 bg-amber-700/30 text-amber-300'
              : 'border-gray-700 bg-gray-900 text-gray-300 hover:border-gray-500'
          }`}
        >
          Manual Mode
        </button>
        <button
          onClick={switchToScanMode}
          className={`rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
            scanMode
              ? 'border-amber-500 bg-amber-700/30 text-amber-300'
              : 'border-gray-700 bg-gray-900 text-gray-300 hover:border-gray-500'
          }`}
        >
          Scan Mode
        </button>
      </div>

      {scanMode && (
        <div className="w-full max-w-md mb-6 rounded-xl border border-gray-700 bg-gray-950 p-4">
          <div
            id={SCANNER_REGION_ID}
            className="min-h-[280px] overflow-hidden rounded-lg border border-gray-800 bg-black"
          />

          <p className="mt-3 text-sm text-gray-300">{scanStatus || 'Starting scanner...'}</p>

          {(cameraState === 'denied' || cameraState === 'unsupported' || cameraState === 'error') && (
            <p className="mt-2 text-sm text-red-300">
              Camera is unavailable. Continue using manual ID validation below.
            </p>
          )}

          <div className="mt-3 flex gap-2">
            <button
              onClick={() => void startScanner()}
              disabled={scanActive || loading}
              className="flex-1 rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-sm font-semibold text-gray-200 transition-colors hover:border-gray-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Start Camera
            </button>
            <button
              onClick={() => void stopScanner()}
              disabled={!scanActive}
              className="flex-1 rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm font-semibold text-gray-300 transition-colors hover:border-gray-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Stop Camera
            </button>
          </div>
        </div>
      )}

      <div className="w-full max-w-md">
        <p className="mb-2 text-sm text-gray-400">Manual entry fallback</p>
        <input
          type="text"
          value={regId}
          onChange={(e) => setRegId(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && validate()}
          placeholder="Enter Registration ID"
          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-4 text-lg text-white placeholder-gray-500 mb-4 focus:outline-none focus:border-amber-500"
        />
        <button
          onClick={validate}
          disabled={loading}
          className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-4 rounded-lg text-lg transition-colors disabled:opacity-50"
        >
          {loading ? 'Checking...' : 'Validate Entry'}
        </button>
      </div>

      {result && (
        <div
          className={`mt-8 w-full max-w-md rounded-xl p-6 ${
            result.valid
              ? 'bg-green-900/40 border border-green-500'
              : 'bg-red-900/40 border border-red-500'
          }`}
        >
          <p className="text-2xl font-bold mb-4">
            {result.valid ? 'ENTRY ALLOWED' : 'ENTRY DENIED'}
          </p>
          {result.valid && result.data && (
            <div className="space-y-2 text-lg">
              <p>
                <span className="text-gray-400">Name:</span> {result.data.name}
              </p>
              <p>
                <span className="text-gray-400">Role:</span> {result.data.role}
              </p>
              <p>
                <span className="text-gray-400">Course:</span> {result.data.course}
              </p>
              <p>
                <span className="text-gray-400">Year:</span> {result.data.year}
              </p>
              <p>
                <span className="text-gray-400">Roll No:</span> {result.data.roll_no}
              </p>
              {result.data.events && (
                <p>
                  <span className="text-gray-400">Events:</span> {result.data.events.join(', ')}
                </p>
              )}
              {result.data.team_label && (
                <p>
                  <span className="text-gray-400">Team:</span> {result.data.team_label}
                </p>
              )}
            </div>
          )}
          {!result.valid && <p className="text-lg text-red-300">{result.message}</p>}
        </div>
      )}
    </div>
  )
}
