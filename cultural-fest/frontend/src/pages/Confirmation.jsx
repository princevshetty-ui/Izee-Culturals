import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useEffect } from 'react'
import { EVENTS } from '../data/events.js'

const DISPLAY_FONT = { fontFamily: 'Cormorant Garamond, serif' }

export default function Confirmation() {
  const { type, id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()

  const qrCode = location.state?.qr_code
  const userName = location.state?.name
  const selectedEventIds = location.state?.selectedEventIds || []

  useEffect(() => {
    if (!qrCode) {
      // Redirect if no QR code in state
      setTimeout(() => {
        navigate('/')
      }, 3000)
    }
  }, [qrCode, navigate])

  const selectedEvents = selectedEventIds
    .map((eventId) => EVENTS.find((event) => event.id === eventId))
    .filter(Boolean)

  const isParticipant = type === 'participant'

  if (!qrCode) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A] px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md text-center"
        >
          <h1 className="text-2xl text-[#F5F0E8]" style={DISPLAY_FONT}>
            Registration Data Not Found
          </h1>
          <p className="mt-3 text-sm text-[#F5F0E8]/70">
            Redirecting to home page...
          </p>
        </motion.div>
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
