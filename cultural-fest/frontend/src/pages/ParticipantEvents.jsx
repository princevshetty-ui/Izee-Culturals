import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion, useInView } from 'framer-motion'
import { EVENTS } from '../data/events.js'

const DISPLAY_FONT = { fontFamily: 'Montage, Nevarademo, serif' }

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } },
}

const stagger = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.08,
    },
  },
}

const titleWords = ['Select', 'Your', 'Events']

const getEventAccent = (event) => {
  const name = event.name.toLowerCase()
  if (name.includes('dance') || name.includes('fashion') || name.includes('ramp')) return '💃'
  if (name.includes('sing')) return '🎤'
  if (name.includes('comedy')) return '🎭'
  if (name.includes('skit')) return '🎬'
  return '✨'
}

export default function ParticipantEvents() {
  const navigate = useNavigate()
  const gridRef = useRef(null)
  const gridInView = useInView(gridRef, { once: true, amount: 0.15 })

  const [selectedEventIds, setSelectedEventIds] = useState([])
  const [activeEvent, setActiveEvent] = useState(null)

  const selectedEvents = selectedEventIds
    .map((id) => EVENTS.find((event) => event.id === id))
    .filter(Boolean)

  const atMaxSelection = selectedEventIds.length >= 2
  const isActiveSelected = activeEvent ? selectedEventIds.includes(activeEvent.id) : false
  const selectionBlocked = Boolean(activeEvent) && atMaxSelection && !isActiveSelected

  const openRulesModal = (event) => {
    setActiveEvent(event)
  }

  const closeRulesModal = () => {
    setActiveEvent(null)
  }

  const handleBackdropClick = () => {
    if (selectedEventIds.length < 2) {
      closeRulesModal()
    }
  }

  const handleSelectActiveEvent = () => {
    if (!activeEvent || selectionBlocked || isActiveSelected) {
      return
    }

    setSelectedEventIds((prev) => [...prev, activeEvent.id])
    closeRulesModal()
  }

  const removeSelectedEvent = (idToRemove) => {
    setSelectedEventIds((prev) => prev.filter((id) => id !== idToRemove))
  }

  const handleContinue = () => {
    navigate('/participant/register', {
      state: {
        selectedEventIds,
      },
    })
  }

  const progressPct = (selectedEventIds.length / 2) * 100

  return (
    <div
      className="min-h-screen pb-28 text-[#EEE6D8]"
      style={{
        background:
          'radial-gradient(900px circle at 16% 88%, rgba(178,34,52,0.14), transparent 60%), radial-gradient(700px circle at 82% 12%, rgba(201,168,76,0.07), transparent 62%), radial-gradient(1400px at 50% 50%, rgba(20,28,60,0.3), transparent 70%), #080910',
      }}
    >
      <header className="sticky top-0 z-30 border-b border-[#EEE6D8]/10 bg-[#080910]/88 backdrop-blur-md">
        <div className="mx-auto w-full max-w-6xl px-4 py-4 sm:px-6 lg:px-8">
          <p className="text-[10px] uppercase tracking-[0.18em] text-[#EEE6D8]/38">
            Home → Participant Registration → Select Events
          </p>

          <div className="mt-3 flex items-start justify-between gap-4">
            <div>
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="mb-2 inline-flex items-center gap-2 text-sm text-[#EEE6D8]/78 transition hover:text-[#EEE6D8]"
              >
                <span aria-hidden="true">&larr;</span>
                Back
              </button>

              <h1 className="text-[clamp(30px,5vw,56px)] leading-[1.04]" style={DISPLAY_FONT}>
                {titleWords.map((word, index) => (
                  <motion.span
                    key={word}
                    initial={{ y: 28, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.52, delay: index * 0.1, ease: 'easeOut' }}
                    className="mr-[0.18em] inline-block"
                  >
                    {word}
                  </motion.span>
                ))}
              </h1>
              <p className="mt-2 text-sm text-[#C9A84C]">Choose up to 2 events</p>
            </div>

            <Link
              to="/"
              className="hidden rounded-full border border-[#EEE6D8]/20 px-4 py-2 text-sm text-[#EEE6D8]/75 transition hover:border-[#C9A84C]/50 hover:text-[#EEE6D8] sm:inline-flex"
            >
              Home
            </Link>
          </div>

          <div className="mt-4 max-w-md">
            <div className="mb-1 flex items-center justify-between text-[11px] uppercase tracking-[0.15em]">
              <span className="text-[#EEE6D8]/55">Max 2 events</span>
              <span className="text-[#C9A84C]">{selectedEventIds.length}/2</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full border border-[#C9A84C]/28 bg-[#EEE6D8]/6">
              <motion.div
                className="h-full rounded-full"
                style={{
                  width: `${progressPct}%`,
                  background: 'linear-gradient(90deg, #C9A84C 0%, #A8893C 100%)',
                }}
                initial={{ width: 0 }}
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
              />
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 pt-10 sm:px-6 lg:px-8">
        <motion.div
          ref={gridRef}
          variants={stagger}
          initial="hidden"
          animate={gridInView ? 'show' : 'hidden'}
          className="grid grid-cols-2 gap-4 lg:grid-cols-4"
        >
          {EVENTS.map((event) => {
            const isSelected = selectedEventIds.includes(event.id)
            const isDisabled = atMaxSelection && !isSelected

            return (
              <motion.button
                key={event.id}
                type="button"
                onClick={() => !isDisabled && openRulesModal(event)}
                disabled={isDisabled}
                variants={fadeUp}
                className={`group relative overflow-hidden rounded-2xl border p-4 text-left transition duration-300 ease-out ${
                  isSelected
                    ? 'border-[#C9A84C]/75 shadow-[0_0_0_1px_rgba(201,168,76,0.32),0_0_24px_rgba(201,168,76,0.18)]'
                    : 'border-[#EEE6D8]/12 hover:border-[#C9A84C]/45'
                } ${isDisabled ? 'cursor-not-allowed opacity-40 blur-[0.8px]' : 'hover:-translate-y-1'}`}
                style={{
                  background:
                    'linear-gradient(135deg, rgba(201,168,76,0.055) 0%, rgba(201,168,76,0.02) 100%), rgba(255,255,255,0.022)',
                  backdropFilter: 'blur(12px) saturate(1.4)',
                }}
              >
                <div
                  className="pointer-events-none absolute inset-x-0 top-0 h-[3px]"
                  style={{ background: 'linear-gradient(to right, transparent, rgba(201,168,76,0.85), transparent)' }}
                />

                {isSelected && (
                  <span className="absolute right-3 top-3 inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#C9A84C] text-sm font-semibold text-[#0A0A0A] shadow-[0_0_18px_rgba(201,168,76,0.45)]">
                    ✓
                  </span>
                )}

                <div className="mb-4 text-3xl">{event.icon}</div>
                <h2 className="flex items-center gap-2 text-lg text-[#EEE6D8]" style={DISPLAY_FONT}>
                  <span className="text-base" aria-hidden="true">{getEventAccent(event)}</span>
                  {event.name}
                </h2>
                <p className="mt-1 text-sm text-[#EEE6D8]/62">{event.category}</p>

                <span className="mt-5 inline-flex rounded-full border border-[#C9A84C]/45 px-3 py-1.5 text-xs font-medium text-[#C9A84C] transition group-hover:bg-[#C9A84C]/10">
                  View Rules & Select
                </span>
              </motion.button>
            )
          })}
        </motion.div>
      </main>

      <AnimatePresence>
        {activeEvent && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/72 p-3 backdrop-blur-[4px] sm:p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleBackdropClick}
          >
            <motion.div
              className="card-glass relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl border border-[#EEE6D8]/15 bg-[#111111]/88 p-5 sm:rounded-3xl sm:p-7"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              onClick={(event) => event.stopPropagation()}
            >
              <div
                className="pointer-events-none absolute inset-x-0 top-0 h-[3px]"
                style={{ background: 'linear-gradient(to right, transparent, rgba(201,168,76,0.9), transparent)' }}
              />

              <button
                type="button"
                onClick={closeRulesModal}
                className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#EEE6D8]/18 text-[#EEE6D8]/78 transition hover:border-[#C9A84C]/45 hover:text-[#C9A84C]"
                aria-label="Close rules"
              >
                x
              </button>

              <h3 className="pr-10 text-3xl text-[#EEE6D8]" style={DISPLAY_FONT}>
                {activeEvent.name}
              </h3>
              <p className="mt-2 text-sm uppercase tracking-[0.15em] text-[#C9A84C]">Rules & Eligibility</p>

              <ol className="mt-6 space-y-3">
                {activeEvent.rules.map((rule, index) => (
                  <li key={rule} className="flex items-start gap-3 rounded-xl border border-[#EEE6D8]/10 bg-[#0F0F0F]/85 p-3">
                    <span className="mt-0.5 inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[#C9A84C]/16 text-sm font-semibold text-[#C9A84C]">
                      {index + 1}
                    </span>
                    <span className="text-sm leading-relaxed text-[#EEE6D8]/84">{rule}</span>
                  </li>
                ))}
              </ol>

              <div className="mt-6">
                <button
                  type="button"
                  onClick={handleSelectActiveEvent}
                  disabled={selectionBlocked || isActiveSelected}
                  className={`w-full rounded-xl px-4 py-3 text-sm font-semibold transition ${
                    selectionBlocked || isActiveSelected
                      ? 'cursor-not-allowed bg-[#C9A84C]/28 text-[#0A0A0A]/60'
                      : 'bg-[#C9A84C] text-[#0A0A0A] hover:brightness-105'
                  }`}
                >
                  {isActiveSelected ? 'Event Selected' : 'Select This Event'}
                </button>
                {selectionBlocked && (
                  <p className="mt-2 text-center text-sm text-[#C9A84C]">Max 2 events reached</p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedEventIds.length > 0 && (
          <motion.div
            className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#C9A84C]/25 bg-[#0B0B0B]/95 backdrop-blur-md"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          >
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
              <div className="flex flex-wrap items-center gap-2">
                {selectedEvents.map((event) => (
                  <span
                    key={event.id}
                    className="inline-flex items-center gap-2 rounded-full border border-[#C9A84C]/35 bg-[#C9A84C]/10 px-3 py-1.5 text-xs text-[#EEE6D8]"
                  >
                    {event.name}
                    <button
                      type="button"
                      aria-label={`Remove ${event.name}`}
                      onClick={() => removeSelectedEvent(event.id)}
                      className="rounded-full px-1 text-[#EEE6D8]/70 transition hover:text-[#EEE6D8]"
                    >
                      x
                    </button>
                  </span>
                ))}
              </div>

              <button
                type="button"
                onClick={handleContinue}
                disabled={selectedEventIds.length === 0}
                className="w-full rounded-xl px-5 py-3 text-sm font-semibold text-[#0C0D10] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40 lg:w-auto"
                style={{
                  background: 'linear-gradient(135deg, #C9A84C, #A8893C)',
                  boxShadow: '0 4px 24px rgba(201,168,76,0.25)',
                }}
              >
                Continue to Registration
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
