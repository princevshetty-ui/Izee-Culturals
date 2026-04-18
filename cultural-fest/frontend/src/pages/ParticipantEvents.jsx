import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'

const DISPLAY_FONT = { fontFamily: 'Montage, Nevarademo, serif' }
const MotionSection = motion.section
const MotionButton = motion.button
const MotionDiv = motion.div

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
      {
        id: 'anything-talent',
        name: 'Anything Talent',
        type: 'magic · mimicry · freestyle',
        isGroup: false,
      },
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
      position: 'relative',
      overflow: 'hidden',
      background: '#07070B',
      color: '#EEE6D8',
      paddingBottom: '100px'
    }}>
      <style>{`
        @keyframes festival-breathe {
          0% {
            transform: scale(1) translate3d(0, 0, 0);
            opacity: 0.72;
          }
          50% {
            transform: scale(1.06) translate3d(1.5%, -1.5%, 0);
            opacity: 1;
          }
          100% {
            transform: scale(1) translate3d(0, 0, 0);
            opacity: 0.72;
          }
        }

        @keyframes festival-shimmer {
          0% {
            transform: translateX(-130%);
          }
          100% {
            transform: translateX(130%);
          }
        }
      `}</style>

      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: '-12%',
          pointerEvents: 'none',
          zIndex: 0,
          background: `
            radial-gradient(60% 55% at 18% 78%, rgba(184,134,11,0.15) 0%, rgba(184,134,11,0) 70%),
            radial-gradient(55% 48% at 82% 18%, rgba(74,0,128,0.14) 0%, rgba(74,0,128,0) 72%),
            radial-gradient(40% 35% at 50% 52%, rgba(184,134,11,0.08) 0%, rgba(184,134,11,0) 70%)
          `,
          animation: 'festival-breathe 8s ease-in-out infinite'
        }}
      />

      <div style={{
        maxWidth: '820px',
        margin: '0 auto',
        padding: '32px 24px 0',
        position: 'relative',
        zIndex: 1
      }}>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="mb-3 inline-flex items-center text-[12px] tracking-[0.06em] text-[#EEE6D8]/45 transition hover:text-[#EEE6D8]/78"
        >
          ← Back to Home
        </button>

        <p className="text-[11px] tracking-[0.05em] text-[#EEE6D8]/30">
          Home → Participant Registration → Select Events
        </p>

        <h1
          className="mt-4 text-[clamp(28px,4vw,48px)] leading-[1.06] text-[#EEE6D8]"
          style={{ ...DISPLAY_FONT, textShadow: '0 0 30px rgba(184,134,11,0.3)' }}
        >
          Select Your Events
        </h1>
        <p className="mt-2 text-[15px] text-[#CFC6B7]/78">Choose up to 2 events from any category below</p>

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
            }}>MAX 2 EVENTS — {totalSelected}/2</span>
            <span style={{
              fontFamily: 'system-ui, -apple-system, sans-serif',
              fontSize: '12px',
              fontWeight: '600',
              color: totalSelected > 0 ? '#B8860B' : 'rgba(238,230,216,0.35)'
            }}>{totalSelected} / 2</span>
          </div>
          <div style={{
            width: '100%',
            height: '6px',
            background: 'rgba(255,255,255,0.07)',
            borderRadius: '999px',
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.06)'
          }}>
            <div
              style={{
                position: 'relative',
                height: '100%',
                width: `${(totalSelected / 2) * 100}%`,
                background: 'linear-gradient(90deg, #8B6914 0%, #B8860B 45%, #D1A032 100%)',
                borderRadius: '999px',
                transition: 'width 0.35s ease',
                boxShadow: totalSelected === 2 ? '0 0 18px rgba(184,134,11,0.45)' : 'none'
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(110deg, transparent 20%, rgba(255,255,255,0.35) 50%, transparent 80%)',
                  animation: 'festival-shimmer 1.8s linear infinite'
                }}
              />
            </div>
          </div>
        </div>

        <div className="mt-8">
          {CATEGORIES.map((category, index) => (
            <MotionSection
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
                  color: 'rgba(184,134,11,0.96)',
                  fontSize: '13px',
                  lineHeight: 1,
                  flexShrink: 0
                }} aria-hidden="true">
                  ●
                </span>
                <span style={{
                  fontSize: '18px',
                  lineHeight: 1,
                  flexShrink: 0,
                  opacity: 0.72
                }} aria-hidden="true">
                  {category.icon}
                </span>
                <span style={{
                  fontFamily: "'Montage', serif",
                  fontSize: '13px',
                  fontWeight: '600',
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: 'rgba(238,230,216,0.82)',
                  flexShrink: 0
                }}>
                  {category.label}
                </span>
                <div style={{
                  flex: 1,
                  height: '1px',
                  background: 'rgba(184,134,11,0.3)'
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
                  const isSelected = !isGroup && selectedIds.includes(event.id)
                  const isDisabled = totalSelected >= 2 && !isSelected

                  const basePillStyle = {
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    height: '36px',
                    padding: '0 18px',
                    borderRadius: '999px',
                    fontSize: '13px',
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    fontWeight: '400',
                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                    border: '1px solid rgba(255,255,255,0.15)',
                    background: 'rgba(255,255,255,0.05)',
                    color: 'rgba(238,230,216,0.76)',
                    transition: 'all 200ms ease',
                    userSelect: 'none',
                    whiteSpace: 'nowrap',
                    opacity: isDisabled ? 0.3 : 1,
                    pointerEvents: isDisabled ? 'none' : 'auto'
                  }

                  let pillStyle = { ...basePillStyle }

                  if (isSelected) {
                    pillStyle.background = 'linear-gradient(135deg, #B8860B, #8B6914)'
                    pillStyle.border = '1px solid #B8860B'
                    pillStyle.color = '#FFFFFF'
                    pillStyle.fontWeight = '600'
                    pillStyle.boxShadow = '0 0 16px rgba(184,134,11,0.4)'
                  } else if (isGroup) {
                    pillStyle.border = '1px solid rgba(255,255,255,0.15)'
                  }

                  return (
                    <MotionButton
                      key={event.id}
                      type="button"
                      onClick={() => handleEventClick(event)}
                      whileTap={{ scale: 0.96 }}
                      whileHover={isDisabled || isSelected
                        ? undefined
                        : {
                            borderColor: 'rgba(184,134,11,0.6)',
                            boxShadow: '0 0 12px rgba(184,134,11,0.2)',
                            y: -1,
                          }}
                      layout
                      style={pillStyle}
                    >
                      {isSelected ? <span aria-hidden="true">✓</span> : null}
                      <span>{getEventPillLabel(event)}</span>
                      {isGroup ? <span aria-hidden="true" style={{ fontSize: '12px', opacity: 0.7 }}>👥</span> : null}
                    </MotionButton>
                  )
                })}
              </div>
            </MotionSection>
          ))}

          <MotionSection
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
                <MotionDiv
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
                </MotionDiv>
              )}
            </AnimatePresence>
          </MotionSection>
        </div>
      </div>

      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 40,
        background: 'rgba(184,134,11,0.1)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        borderTop: '1px solid rgba(184,134,11,0.3)',
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
              ? '#D7AD41'
              : totalSelected === 1
                ? 'rgba(238,230,216,0.76)'
                : 'rgba(238,230,216,0.52)'
          }}
        >
          {getSelectionMessage(totalSelected)}
        </p>

        <MotionButton
          type="button"
          onClick={handleContinue}
          disabled={!canContinue}
          whileTap={canContinue ? { scale: 0.97 } : undefined}
          whileHover={canContinue
            ? {
                boxShadow: '0 0 22px rgba(184,134,11,0.4)',
                y: -1,
              }
            : undefined}
          style={canContinue
            ? {
                height: '42px',
                padding: '0 32px',
                borderRadius: '999px',
                background: 'linear-gradient(135deg, #B8860B 0%, #8B6914 100%)',
                color: '#0A0800',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                fontWeight: '600',
                fontSize: '14px',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 6px 20px rgba(184,134,11,0.3)',
                letterSpacing: '0.03em'
              }
            : {
                height: '42px',
                padding: '0 32px',
                borderRadius: '999px',
                background: 'rgba(201,168,76,0.15)',
                color: 'rgba(201,168,76,0.4)',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                fontWeight: '600',
                fontSize: '14px',
                border: '1px solid rgba(201,168,76,0.15)',
                cursor: 'not-allowed'
              }}
        >
          Continue →
        </MotionButton>
      </div>

      <AnimatePresence>
        {groupModalEvent && (
          <MotionDiv
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
            <MotionDiv
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
            </MotionDiv>
          </MotionDiv>
        )}
      </AnimatePresence>
    </div>
  )
}
