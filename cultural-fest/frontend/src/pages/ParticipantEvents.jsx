import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion, useInView } from 'framer-motion'
import { EVENTS } from '../data/events.js'

const DISPLAY_FONT = { fontFamily: 'Nevarademo, serif' }

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } }
}

const stagger = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.08
    }
  }
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
        selectedEventIds
      }
    })
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] pb-28 text-[#F5F0E8]">
      <header className="sticky top-0 z-30 border-b border-[#F5F0E8]/10 bg-[#0A0A0A]/92 backdrop-blur-md">
        <div className="mx-auto flex h-20 w-full max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="mb-1 inline-flex items-center gap-2 text-sm text-[#F5F0E8]/78 transition hover:text-[#F5F0E8]"
            >
              <span aria-hidden="true">&larr;</span>
              Back
            </button>
            <h1 className="text-2xl sm:text-3xl" style={DISPLAY_FONT}>
              Select Your Events
            </h1>
            <p className="text-sm text-[#C9A84C]">Choose up to 2 events</p>
          </div>
          <Link
            to="/"
            className="hidden rounded-full border border-[#F5F0E8]/20 px-4 py-2 text-sm text-[#F5F0E8]/75 transition hover:border-[#C9A84C]/50 hover:text-[#F5F0E8] sm:inline-flex"
          >
            Home
          </Link>
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

            return (
              <motion.button
                key={event.id}
                type="button"
                onClick={() => openRulesModal(event)}
                variants={fadeUp}
                className={`group relative rounded-2xl border bg-[#111111] p-4 text-left transition hover:-translate-y-1 hover:bg-[#151515] ${
                  isSelected
                    ? 'border-[#C9A84C]/70 shadow-[0_0_0_1px_rgba(201,168,76,0.35)]'
                    : 'border-[#F5F0E8]/12 hover:border-[#C9A84C]/45'
                }`}
              >
                {isSelected && (
                  <span className="absolute right-3 top-3 inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#C9A84C] text-sm font-semibold text-[#0A0A0A]">
                    ✓
                  </span>
                )}
                <div className="mb-4 text-3xl">{event.icon}</div>
                <h2 className="text-lg text-[#F5F0E8]" style={DISPLAY_FONT}>
                  {event.name}
                </h2>
                <p className="mt-1 text-sm text-[#F5F0E8]/62">{event.category}</p>

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
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-3 sm:p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleBackdropClick}
          >
            <motion.div
              className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl border border-[#F5F0E8]/15 bg-[#111111] p-5 sm:rounded-3xl sm:p-7"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                onClick={closeRulesModal}
                className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#F5F0E8]/18 text-[#F5F0E8]/78 transition hover:border-[#C9A84C]/45 hover:text-[#F5F0E8]"
                aria-label="Close rules"
              >
                x
              </button>

              <h3 className="pr-10 text-3xl text-[#F5F0E8]" style={DISPLAY_FONT}>
                {activeEvent.name}
              </h3>
              <p className="mt-2 text-sm uppercase tracking-[0.15em] text-[#C9A84C]">Rules & Eligibility</p>

              <ol className="mt-6 space-y-3">
                {activeEvent.rules.map((rule, index) => (
                  <li key={rule} className="flex items-start gap-3 rounded-xl border border-[#F5F0E8]/10 bg-[#0F0F0F] p-3">
                    <span className="mt-0.5 inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[#C9A84C]/16 text-sm font-semibold text-[#C9A84C]">
                      {index + 1}
                    </span>
                    <span className="text-sm leading-relaxed text-[#F5F0E8]/84">{rule}</span>
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
                    className="inline-flex items-center gap-2 rounded-full border border-[#C9A84C]/35 bg-[#C9A84C]/10 px-3 py-1.5 text-xs text-[#F5F0E8]"
                  >
                    {event.name}
                    <button
                      type="button"
                      aria-label={`Remove ${event.name}`}
                      onClick={() => removeSelectedEvent(event.id)}
                      className="rounded-full px-1 text-[#F5F0E8]/70 transition hover:text-[#F5F0E8]"
                    >
                      x
                    </button>
                  </span>
                ))}
              </div>

              <button
                type="button"
                onClick={handleContinue}
                className="rounded-xl bg-[#C9A84C] px-5 py-3 text-sm font-semibold text-[#0A0A0A] transition hover:brightness-105"
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
