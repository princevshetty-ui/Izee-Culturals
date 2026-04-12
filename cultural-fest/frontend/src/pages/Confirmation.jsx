import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { EVENTS } from '../data/events.js'

const DISPLAY_FONT = { fontFamily: 'Nevarademo, serif' }

export default function Confirmation() {
  const { type, id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()

  const [qrCode, setQrCode] = useState(location.state?.qr_code || null)
  const [userName, setUserName] = useState(location.state?.name || '')
  const [selectedEventIds, setSelectedEventIds] = useState(location.state?.selectedEventIds || [])
  const [isLoadingStatus, setIsLoadingStatus] = useState(!location.state?.qr_code)
  const [statusError, setStatusError] = useState('')
  const [isPending, setIsPending] = useState(Boolean(location.state?.pending || !location.state?.qr_code))

  const statusEndpoint = useMemo(() => {
    if (type === 'participant') return `/api/register/participant/${id}/status`
    return `/api/register/student/${id}/status`
  }, [type, id])

  const selectedEvents = selectedEventIds
    .map((eventId) => EVENTS.find((event) => event.id === eventId))
    .filter(Boolean)

  const isParticipant = type === 'participant'

  const checkStatus = async () => {
    setIsLoadingStatus(true)
    setStatusError('')

    try {
      const response = await fetch(statusEndpoint)
      const payload = await response.json()

      if (!response.ok || !payload.success) {
        throw new Error(payload?.message || 'Unable to fetch approval status')
      }

      const data = payload.data || {}
      if (data.name) setUserName(data.name)
      if (Array.isArray(data.events)) setSelectedEventIds(data.events)

      if (data.qr_code) {
        setQrCode(data.qr_code)
        setIsPending(false)
      } else {
        setIsPending(true)
      }
    } catch (error) {
      setStatusError(error.message || 'Unable to fetch approval status')
    } finally {
      setIsLoadingStatus(false)
    }
  }

  useEffect(() => {
    if (!qrCode || isPending) {
      checkStatus()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, type])

  if (isPending && !qrCode) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] px-4 text-[#F5F0E8]">
        <div className="mx-auto flex min-h-screen max-w-2xl items-center justify-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full rounded-2xl border border-[#C9A84C]/30 bg-[#111111] p-8 text-center"
          >
            <h1 className="text-3xl text-[#F5F0E8]" style={DISPLAY_FONT}>
              Registration Submitted
            </h1>
            <p className="mt-3 text-sm text-[#F5F0E8]/72">
              Your registration is pending faculty approval. Your QR code will appear here once approved.
            </p>
            <p className="mt-2 text-xs text-[#C9A84C]">Registration ID: {id}</p>

            {statusError && (
              <div className="mt-4 rounded-lg border border-red-500/35 bg-red-500/10 p-3 text-sm text-red-400">
                {statusError}
              </div>
            )}

            <button
              type="button"
              onClick={checkStatus}
              disabled={isLoadingStatus}
              className="mt-6 rounded-lg bg-[#C9A84C] px-5 py-2.5 text-sm font-semibold text-[#0A0A0A] transition hover:brightness-105 disabled:opacity-70"
            >
              {isLoadingStatus ? 'Checking Status...' : 'Check Approval Status'}
            </button>

            <button
              type="button"
              onClick={() => navigate('/')}
              className="ml-3 mt-6 rounded-lg border border-[#F5F0E8]/20 px-5 py-2.5 text-sm text-[#F5F0E8]/80 transition hover:border-[#C9A84C]/45 hover:text-[#F5F0E8]"
            >
              Back to Home
            </button>
          </motion.div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#F5F0E8]">
      <div className="mx-auto flex max-w-2xl flex-col items-center justify-center px-4 py-8 sm:px-6 lg:px-8 lg:py-16">
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 12, stiffness: 100, delay: 0.2 }}
          className="mb-8 inline-flex h-20 w-20 items-center justify-center rounded-full bg-[#C9A84C]/20 text-5xl"
        >
          ✓
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-center text-4xl font-light sm:text-5xl"
          style={DISPLAY_FONT}
        >
          Registration Complete
        </motion.h1>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-6 text-center"
        >
          <p className="text-[#F5F0E8]/85">
            {isParticipant ? 'You are all set to compete!' : 'Your entry pass is ready!'}
          </p>
          {userName && (
            <p className="mt-2 text-lg text-[#C9A84C]" style={DISPLAY_FONT}>
              {userName}
            </p>
          )}
          <p className="mt-1 text-xs text-[#F5F0E8]/60">
            Registration ID: {id}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-10 rounded-2xl border border-[#C9A84C]/40 bg-[#111111] p-6 sm:p-8"
        >
          <p className="mb-4 text-xs uppercase tracking-[0.15em] text-[#C9A84C]">
            Your QR Code
          </p>

          <div className="flex justify-center rounded-lg bg-[#0A0A0A] p-4">
            <img
              src={`data:image/png;base64,${qrCode}`}
              alt="Registration QR Code"
              className="h-48 w-48"
            />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65 }}
            className="mt-6 rounded-lg border border-amber-500/35 bg-amber-500/12 p-4"
          >
            <p className="text-center text-sm font-semibold text-amber-400">
              📸 Screenshot or save this QR code — it is required for entry
            </p>
          </motion.div>
        </motion.div>

        {isParticipant && selectedEvents.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="mt-8 w-full"
          >
            <p className="mb-3 text-xs uppercase tracking-[0.15em] text-[#C9A84C]">
              Your Events
            </p>
            <div className="flex flex-wrap gap-2">
              {selectedEvents.map((event) => (
                <span
                  key={event.id}
                  className="rounded-full border border-[#C9A84C]/45 bg-[#C9A84C]/12 px-3 py-1.5 text-xs text-[#F5F0E8]"
                >
                  {event.name}
                </span>
              ))}
            </div>
          </motion.div>
        )}

        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.75 }}
          whileHover={{ y: -2 }}
          onClick={() => navigate('/')}
          className="mt-12 rounded-lg bg-[#C9A84C] px-8 py-3 font-semibold text-[#0A0A0A] transition hover:brightness-105"
        >
          Back to Home
        </motion.button>


      </div>
    </div>
  )
}
