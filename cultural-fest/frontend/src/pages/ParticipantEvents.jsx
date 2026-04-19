import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'

const DISPLAY_FONT = { fontFamily: 'Montage, Nevarademo, serif' }

const CATEGORIES = [
  {
    id: 'performance',
    label: 'Performance-Based',
    icon: '🎭',
    events: [
      { id: 'singing-solo', name: 'Singing', type: 'Solo', isGroup: false },
      { id: 'singing-band', name: 'Singing', type: 'Band', isGroup: true },
      { id: 'dance-solo', name: 'Dance', type: 'Solo', isGroup: false },
      { id: 'dance-crew', name: 'Dance', type: 'Crew', isGroup: true },
      { id: 'instrumental', name: 'Instrumental', type: 'Solo', isGroup: false },
    ],
  },
  {
    id: 'expression',
    label: 'Expression-Based',
    icon: '🎤',
    events: [
      { id: 'standup-comedy', name: 'Stand-up Comedy', type: 'Solo', isGroup: false },
      { id: 'poetry', name: 'Poetry', type: 'Solo', isGroup: false },
      { id: 'rap', name: 'Rap', type: 'Solo', isGroup: false },
      { id: 'beatboxing', name: 'Beatboxing', type: 'Solo', isGroup: false },
    ],
  },
  {
    id: 'creative',
    label: 'Creative Talents',
    icon: '🎨',
    events: [
      { id: 'art-painting', name: 'Art', type: 'Live Painting', isGroup: false },
      { id: 'fashion-walk', name: 'Fashion Walk', type: 'Styling', isGroup: false },
      { id: 'reel-making', name: 'Reel-making', type: 'Solo', isGroup: false },
      { id: 'content-creation', name: 'Content Creation', type: 'Solo', isGroup: false },
    ],
  },
  {
    id: 'wildcard',
    label: 'Wildcard Category',
    icon: '⚡',
    events: [
      { id: 'magic', name: 'Magic', type: 'Solo', isGroup: false },
      { id: 'mimicry', name: 'Mimicry', type: 'Solo', isGroup: false },
      { id: 'freestyle', name: 'Freestyle', type: 'Solo', isGroup: false },
    ],
  },
]

const OTHERS_EVENT_ID = 'others'

const getEventPillLabel = (event) => {
  const hasMeaningfulType = event.type && event.type.toLowerCase() !== 'solo'
  return hasMeaningfulType ? `${event.name} · ${event.type}` : event.name
}

const getSelectionMessage = (count) => {
  if (count === 0) return 'Select up to 2 events to continue'
  if (count === 1) return '1 event selected · 1 more allowed'
  return '2 events selected · Maximum reached'
}

export default function ParticipantEvents() {
  const navigate = useNavigate()

  const [selectedIds, setSelectedIds] = useState([])
  const [othersText, setOthersText] = useState('')
  const [groupModalEvent, setGroupModalEvent] = useState(null)

  const totalSelected = selectedIds.length
  const othersSelected = selectedIds.includes(OTHERS_EVENT_ID)
  const othersNeedsText = othersSelected && othersText.trim().length === 0
  const canContinue = totalSelected >= 1 && !othersNeedsText

  useEffect(() => {
    if (!groupModalEvent) return undefined

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setGroupModalEvent(null)
      }
    }

    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = prevOverflow
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [groupModalEvent])

  function handleEventClick(event) {
    if (event.isGroup) {
      setGroupModalEvent(event)
      return
    }

    if (selectedIds.includes(event.id)) {
      setSelectedIds((prev) => prev.filter((id) => id !== event.id))
      return
    }

    if (totalSelected >= 2) return

    setSelectedIds((prev) => [...prev, event.id])
  }

  function handleOthersToggle() {
    if (selectedIds.includes(OTHERS_EVENT_ID)) {
      setSelectedIds((prev) => prev.filter((id) => id !== OTHERS_EVENT_ID))
      setOthersText('')
    } else {
      if (totalSelected >= 2) return
      setSelectedIds((prev) => [...prev, OTHERS_EVENT_ID])
    }
  }

  function handleContinue() {
    if (!canContinue) return

    const selectedEvents = CATEGORIES.flatMap((cat) => cat.events).filter((ev) => selectedIds.includes(ev.id))

    navigate('/participant/register', {
      state: {
        events: selectedEvents,
        othersSelected: selectedIds.includes(OTHERS_EVENT_ID),
        othersText,
      },
    })
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: `
        radial-gradient(ellipse at top,
          rgba(184,134,11,0.08) 0%, transparent 60%),
        radial-gradient(ellipse at bottom,
          rgba(74,0,128,0.08) 0%, transparent 60%),
        #0a0a0a
      `,
      color: '#EEE6D8',
      paddingBottom: '100px'
    }}>
      <div style={{
        maxWidth: '820px',
        margin: '0 auto',
        padding: '32px 24px 0'
      }}>
        <p className="text-[11px] tracking-[0.05em] text-[#EEE6D8]/30">
          Home → Participant Registration → Select Events
        </p>

        <button
          type="button"
          onClick={() => navigate('/')}
          className="mt-3 inline-flex items-center text-sm text-[#EEE6D8]/72 transition hover:text-[#EEE6D8]"
        >
          ← Back
        </button>

        <h1 className="mt-4 text-[clamp(28px,4vw,48px)] leading-[1.06] text-[#EEE6D8]" style={DISPLAY_FONT}>
          Select Your Events
        </h1>
        <p className="mt-2 text-[15px] text-[#EEE6D8]/55">Choose up to 2 events from any category below</p>

        <div style={{
          marginBottom: '36px',
          marginTop: '8px'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px'
          }}>
            <span style={{
              fontFamily: 'system-ui, -apple-system, sans-serif',
              fontSize: '10px',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'rgba(238,230,216,0.35)'
            }}>MAX 2 EVENTS</span>
            <span style={{
              fontFamily: 'system-ui, -apple-system, sans-serif',
              fontSize: '12px',
              fontWeight: '600',
              color: totalSelected > 0 ? '#C9A84C' : 'rgba(238,230,216,0.35)'
            }}>{totalSelected} / 2</span>
          </div>
          <div style={{
            width: '100%',
            height: '2px',
            background: 'rgba(255,255,255,0.07)',
            borderRadius: '999px',
            overflow: 'hidden'
          }}>
            <div
              className="bg-gradient-to-r from-amber-600 to-amber-400"
              style={{
                height: '100%',
                width: `${(totalSelected / 2) * 100}%`,
                borderRadius: '999px',
                transition: 'width 0.35s ease'
              }}
            />
          </div>
        </div>

        <div className="mt-8">
          {CATEGORIES.map((category, index) => (
            <motion.section
              key={category.id}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.08 }}
              style={{ marginBottom: '40px' }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '16px'
              }}>
                <span style={{
                  fontSize: '18px',
                  lineHeight: 1,
                  flexShrink: 0
                }} aria-hidden="true">
                  {category.icon}
                </span>
                <span className="mr-2 text-amber-500" aria-hidden="true">●</span>
                <span
                  className="tracking-widest uppercase text-xs font-semibold text-[#EEE6D8]/75"
                  style={{
                    fontFamily: "'Montage', serif",
                    flexShrink: 0,
                  }}
                >
                  {category.label}
                </span>
                <div style={{
                  flex: 1,
                  height: '0.5px',
                  background: 'rgba(255,255,255,0.07)'
                }} />
              </div>

              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '10px',
                marginTop: '14px'
              }}>
                {category.events.map((event) => {
                  const isGroup = event.isGroup
                  const isSelected = selectedIds.includes(event.id)
                  const isDisabled = totalSelected >= 2 && !isSelected

                  const basePillStyle = {
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    transition: 'all 0.18s ease',
                    pointerEvents: isDisabled ? 'none' : 'auto'
                  }

                  const pillClassName = [
                    'inline-flex items-center gap-1.5 h-9 px-[18px] rounded-full text-[13px] select-none whitespace-nowrap transition-all duration-200',
                    isSelected
                      ? 'bg-gradient-to-r from-amber-700 to-amber-900 border border-amber-600 text-white font-semibold shadow-lg shadow-amber-900/30'
                      : 'border border-white/10 bg-white/5 hover:border-amber-600/50 hover:shadow-amber-900/20',
                    isDisabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer',
                  ].join(' ')

                  return (
                    <motion.button
                      key={event.id}
                      type="button"
                      onClick={() => handleEventClick(event)}
                      whileTap={{ scale: 0.96 }}
                      layout
                      className={pillClassName}
                      style={basePillStyle}
                    >
                      {isSelected ? <span aria-hidden="true">✓</span> : null}
                      <span>{getEventPillLabel(event)}</span>
                      {isGroup ? <span aria-hidden="true" style={{ fontSize: '12px', opacity: 0.7 }}>👥</span> : null}
                    </motion.button>
                  )
                })}
              </div>
            </motion.section>
          ))}

          <motion.section
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: CATEGORIES.length * 0.08 }}
            style={{
              marginTop: '8px',
              marginBottom: '40px',
              paddingTop: '24px',
              borderTop: '0.5px solid rgba(255,255,255,0.06)'
            }}
          >
            <label style={{
              fontFamily: 'system-ui, -apple-system, sans-serif',
              fontSize: '10px',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'rgba(238,230,216,0.35)',
              marginBottom: '10px',
              display: 'block'
            }}>✦ OTHERS / UNIQUE TALENT</label>

            <button
              type="button"
              onClick={handleOthersToggle}
              disabled={!othersSelected && totalSelected >= 2}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                height: '36px',
                padding: '0 18px',
                borderRadius: '999px',
                border: othersSelected ? '1px dashed rgba(201,168,76,0.45)' : '1px dashed rgba(255,255,255,0.18)',
                background: othersSelected ? 'rgba(201,168,76,0.07)' : 'transparent',
                color: othersSelected ? '#C9A84C' : 'rgba(238,230,216,0.5)',
                fontSize: '13px',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                cursor: !othersSelected && totalSelected >= 2 ? 'not-allowed' : 'pointer',
                opacity: !othersSelected && totalSelected >= 2 ? 0.3 : 1
              }}
            >
              <span>✦ Others / Unique Talent</span>
            </button>

            <AnimatePresence initial={false}>
              {othersSelected && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.28, ease: 'easeOut' }}
                  style={{ overflow: 'hidden' }}
                >
                  <textarea
                    rows={3}
                    value={othersText}
                    onChange={(event) => setOthersText(event.target.value)}
                    placeholder="Describe your unique talent or performance idea..."
                    style={{
                      width: '100%',
                      maxWidth: '560px',
                      marginTop: '12px',
                      background: 'rgba(255,255,255,0.04)',
                      border: '0.5px solid rgba(201,168,76,0.22)',
                      borderRadius: '10px',
                      color: '#EEE6D8',
                      fontFamily: 'system-ui, -apple-system, sans-serif',
                      fontSize: '13px',
                      lineHeight: '1.6',
                      padding: '12px 16px',
                      resize: 'vertical',
                      outline: 'none',
                      display: 'block'
                    }}
                  />
                  {othersNeedsText && (
                    <p style={{
                      marginTop: '8px',
                      fontSize: '11px',
                      color: 'rgba(178,34,52,0.8)'
                    }}>Please describe your talent to continue</p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.section>
        </div>
      </div>

      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 40,
        background: 'rgba(8,9,16,0.95)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderTop: '0.5px solid rgba(255,255,255,0.08)',
        padding: '14px 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <p
          style={{
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontSize: '13px',
            color: totalSelected === 2
              ? '#C9A84C'
              : totalSelected === 1
                ? 'rgba(238,230,216,0.6)'
                : 'rgba(238,230,216,0.35)'
          }}
        >
          {getSelectionMessage(totalSelected)}
        </p>

        <button
          type="button"
          onClick={handleContinue}
          disabled={!canContinue}
          className={canContinue
            ? 'bg-gradient-to-r from-amber-600 to-amber-800 text-white font-semibold hover:shadow-lg hover:shadow-amber-900/40 transition-all'
            : 'bg-amber-900/20 text-amber-500/50 font-semibold cursor-not-allowed'}
          style={canContinue
            ? {
                height: '42px',
                padding: '0 32px',
                borderRadius: '999px',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                fontSize: '14px',
                border: 'none',
                cursor: 'pointer',
                letterSpacing: '0.03em'
              }
            : {
                height: '42px',
                padding: '0 32px',
                borderRadius: '999px',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                fontSize: '14px',
                border: '0.5px solid rgba(201,168,76,0.15)',
                cursor: 'not-allowed'
              }}
        >
          Continue →
        </button>
      </div>

      <AnimatePresence>
        {groupModalEvent && (
          <motion.div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.75)',
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
              zIndex: 50,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '24px'
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setGroupModalEvent(null)}
          >
            <motion.div
              style={{
                width: '100%',
                maxWidth: '460px',
                background: '#0D0E12',
                border: '0.5px solid rgba(201,168,76,0.2)',
                borderRadius: '16px',
                overflow: 'hidden'
              }}
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              onClick={(event) => event.stopPropagation()}
            >
              <div
                style={{
                  height: '3px',
                  background: 'linear-gradient(to right, transparent, #C9A84C, transparent)'
                }}
              />

              <div style={{ padding: '28px 28px 24px' }}>
                <h3 style={{
                  fontFamily: "'Montage', serif",
                  fontSize: '22px',
                  color: '#EEE6D8',
                  marginBottom: '8px'
                }}>
                  Group Registration
                </h3>

                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '3px 12px',
                  borderRadius: '999px',
                  background: 'rgba(201,168,76,0.1)',
                  border: '0.5px solid rgba(201,168,76,0.3)',
                  color: '#C9A84C',
                  fontSize: '12px',
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  marginBottom: '16px'
                }}>
                  {groupModalEvent.name} · {groupModalEvent.type}
                </div>

                <p style={{
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  fontSize: '14px',
                  lineHeight: '1.7',
                  color: 'rgba(238,230,216,0.62)',
                  marginBottom: '24px'
                }}>
                  This is a group event. The team leader should register the entire team together - including all
                  member names and roll numbers.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() =>
                      navigate('/participant/group-register', {
                        state: { groupEvent: groupModalEvent },
                      })
                    }
                    style={{
                      width: '100%',
                      height: '44px',
                      borderRadius: '10px',
                      background: 'linear-gradient(135deg, #C9A84C, #A8893C)',
                      color: '#0A0800',
                      fontWeight: '600',
                      fontSize: '14px',
                      fontFamily: 'system-ui, -apple-system, sans-serif',
                      border: 'none',
                      cursor: 'pointer',
                      marginBottom: '10px'
                    }}
                  >
                    Register as Group →
                  </button>

                  <button
                    type="button"
                    onClick={() => setGroupModalEvent(null)}
                    style={{
                      width: '100%',
                      height: '36px',
                      background: 'transparent',
                      border: 'none',
                      color: 'rgba(238,230,216,0.35)',
                      fontSize: '13px',
                      fontFamily: 'system-ui, -apple-system, sans-serif',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
