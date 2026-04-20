import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'

const DISPLAY_FONT = { fontFamily: 'Nevarademo, serif' }
const MotionDiv = motion.div
const MotionH1 = motion.h1
const MotionButton = motion.button

export default function Confirmation() {
  const { type, id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()

  const [qrCode, setQrCode] = useState(location.state?.qr_code || null)
  const [userName, setUserName] = useState(location.state?.name || location.state?.leaderName || location.state?.leader_name || '')
  const [selectedEvents, setSelectedEvents] = useState(location.state?.events || [])
  const [othersSelected, setOthersSelected] = useState(Boolean(location.state?.othersSelected))
  const [othersText, setOthersText] = useState(location.state?.othersText || '')
  const [isLoadingStatus, setIsLoadingStatus] = useState(!location.state?.qr_code)
  const [statusError, setStatusError] = useState('')
  const [isPending, setIsPending] = useState(Boolean(location.state?.pending || !location.state?.qr_code))
  const [teamName, setTeamName] = useState(location.state?.teamName || '')
  const [teamMembers, setTeamMembers] = useState(location.state?.members || [])
  const [eventName, setEventName] = useState(location.state?.eventName || '')
  const [teamAssigned, setTeamAssigned] = useState(location.state?.teamAssigned || null)

  const statusEndpoint = useMemo(() => {
    switch (type) {
      case 'participant':
        return `/api/register/participant/${id}/status`
      case 'volunteer':
        return `/api/register/volunteer/${id}/status`
      case 'group':
        return `/api/register/group/${id}/status`
      default:
        return `/api/register/student/${id}/status`
    }
  }, [type, id])

  const isParticipant = type === 'participant'
  const isVolunteer = type === 'volunteer'
  const isGroup = type === 'group'

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
      if (type === 'group' && data.leader_name) setUserName(data.leader_name)

      // Group specific
      if (data.team_name) setTeamName(data.team_name)
      if (data.members) setTeamMembers(data.members)
      if (data.event_name) setEventName(data.event_name)

      // Volunteer specific
      if (data.team_label) setTeamAssigned(data.team_label)

      if (Array.isArray(data.events)) {
        const mappedEvents = []
        let mappedOthersSelected = false
        let mappedOthersText = ''

        for (const event of data.events) {
          const eventId = event?.event_id || event?.id || ''
          const eventName = event?.event_name || event?.name || ''
          const isOthersEvent = String(eventId).toLowerCase() === 'others' || String(eventName).toLowerCase() === 'others'

          if (isOthersEvent) {
            mappedOthersSelected = true
            if (event?.others_description) mappedOthersText = event.others_description
            continue
          }

          mappedEvents.push({
            id: eventId,
            name: eventName,
            type: event?.type || '',
            categoryId: event?.category_id || event?.categoryId || '',
            categoryLabel: event?.category_label || event?.categoryLabel || '',
          })
        }

        setSelectedEvents(mappedEvents)
        setOthersSelected(mappedOthersSelected)
        setOthersText(mappedOthersText)
      }

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

  const roleConfig = {
    student: {
      accentColor: '#B22234',
      accentBorder: 'rgba(178,34,52,0.3)',
      accentBg: 'rgba(178,34,52,0.06)',
      pendingTitle: 'Registration Submitted',
      pendingSubtext: 'Your audience pass is pending faculty approval. Your digital pass will appear here once approved.',
      approvedTitle: "You're In!",
      approvedSubtext: 'Your audience entry pass is ready.',
      badge: 'AUDIENCE PASS',
      badgeColor: '#B22234',
    },
    participant: {
      accentColor: '#C9A84C',
      accentBorder: 'rgba(201,168,76,0.3)',
      accentBg: 'rgba(201,168,76,0.06)',
      pendingTitle: 'Registration Submitted',
      pendingSubtext: 'Your participant registration is pending faculty approval. Your digital pass will appear here once approved.',
      approvedTitle: "You're Ready to Compete!",
      approvedSubtext: 'Your competition entry pass is ready.',
      badge: 'PARTICIPANT',
      badgeColor: '#C9A84C',
    },
    volunteer: {
      accentColor: '#14B8A6',
      accentBorder: 'rgba(20,184,166,0.3)',
      accentBg: 'rgba(20,184,166,0.06)',
      pendingTitle: 'Registration Submitted',
      pendingSubtext: 'Your volunteer registration is pending approval by the faculty coordinator.',
      approvedTitle: 'You\'re Confirmed!',
      approvedSubtext: 'Show this pass at the volunteer desk.',
      badge: 'VOLUNTEER',
      badgeColor: '#14B8A6',
    },
    group: {
      accentColor: '#C9A84C',
      accentBorder: 'rgba(201,168,76,0.3)',
      accentBg: 'rgba(201,168,76,0.06)',
      pendingTitle: 'Registration Submitted',
      pendingSubtext: 'Your group registration is pending approval by the faculty coordinator.',
      approvedTitle: 'Your Group Entry is Confirmed!',
      approvedSubtext: 'Show this pass at the event desk.',
      badge: 'GROUP EVENT',
      badgeColor: '#C9A84C',
    },
  }

  const config = roleConfig[type] || roleConfig.student
  const groupSubtitle = [teamName, eventName].filter(Boolean).join(' • ')

  if (isPending && !qrCode) {
    return (
      <div style={{
        minHeight: '100vh',
        background: `
          radial-gradient(900px 600px at 15% 85%,
            rgba(158,38,54,0.10) 0%, transparent 60%),
          radial-gradient(700px 500px at 80% 15%,
            rgba(190,163,93,0.07) 0%, transparent 60%),
          #080910
        `,
        color: '#EEE6D8',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}>
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors mb-4 self-start ml-4 mt-4"
        >
          ← Home
        </button>
        <div style={{
          display: 'flex',
          alignItems: 'center',
        justifyContent: 'center',
        padding: '24px'
      }}>
        <MotionDiv
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            width: '100%',
            maxWidth: '520px',
            background: '#0D0E12',
            border: `0.5px solid ${config.accentBorder}`,
            borderRadius: '20px',
            overflow: 'hidden'
          }}
        >
          <div style={{
            height: '3px',
            background: `linear-gradient(to right,
              transparent, ${config.accentColor}, transparent)`
          }} />

          <div style={{ padding: '36px 32px 32px' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '3px 12px',
              borderRadius: '999px',
              background: config.accentBg,
              border: `0.5px solid ${config.accentBorder}`,
              color: config.badgeColor,
              fontSize: '10px',
              fontFamily: 'system-ui, sans-serif',
              fontWeight: '600',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              marginBottom: '20px'
            }}>
              {config.badge}
            </div>

            <div style={{
              width: '52px',
              height: '52px',
              borderRadius: '50%',
              background: config.accentBg,
              border: `0.5px solid ${config.accentBorder}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '22px',
              marginBottom: '20px'
            }}>
              ⏳
            </div>

            <h1 style={{
              fontFamily: 'Montage, Nevarademo, serif',
              fontSize: '26px',
              color: '#EEE6D8',
              marginBottom: '10px',
              lineHeight: 1.2
            }}>
              {config.pendingTitle}
            </h1>

            <p style={{
              fontFamily: 'system-ui, sans-serif',
              fontSize: '14px',
              color: 'rgba(238,230,216,0.58)',
              lineHeight: '1.65',
              marginBottom: '16px'
            }}>
              {config.pendingSubtext}
            </p>

            <div style={{
              background: 'rgba(255,255,255,0.03)',
              border: '0.5px solid rgba(255,255,255,0.07)',
              borderRadius: '8px',
              padding: '10px 14px',
              marginBottom: '20px'
            }}>
              <p style={{
                fontFamily: 'system-ui, sans-serif',
                fontSize: '10px',
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                color: 'rgba(238,230,216,0.35)',
                marginBottom: '4px'
              }}>
                Registration ID
              </p>
              <p style={{
                fontFamily: 'monospace',
                fontSize: '13px',
                color: config.accentColor,
                wordBreak: 'break-all'
              }}>
                {id}
              </p>
            </div>

            {isParticipant && (selectedEvents.length > 0 || othersSelected) && (
              <div
                style={{
                  background: 'rgba(201,168,76,0.05)',
                  border: '0.5px solid rgba(201,168,76,0.2)',
                  borderRadius: '10px',
                  padding: '14px 16px',
                  marginBottom: '20px',
                }}
              >
                <p
                  style={{
                    fontSize: '10px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.14em',
                    color: 'rgba(201,168,76,0.7)',
                    fontFamily: 'system-ui, sans-serif',
                    marginBottom: '10px',
                  }}
                >
                  Selected Events
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {selectedEvents.map((ev) => (
                    <span
                      key={ev.id}
                      style={{
                        padding: '4px 12px',
                        borderRadius: '999px',
                        background: 'rgba(201,168,76,0.08)',
                        border: '0.5px solid rgba(201,168,76,0.25)',
                        color: '#C9A84C',
                        fontSize: '12px',
                        fontFamily: 'system-ui, sans-serif',
                      }}
                    >
                      {ev.type && ev.type.toLowerCase() !== 'solo' ? `${ev.name} · ${ev.type}` : ev.name}
                    </span>
                  ))}
                  {othersSelected && (
                    <span
                      style={{
                        padding: '4px 12px',
                        borderRadius: '999px',
                        background: 'rgba(201,168,76,0.08)',
                        border: '0.5px dashed rgba(201,168,76,0.25)',
                        color: 'rgba(201,168,76,0.8)',
                        fontSize: '12px',
                        fontFamily: 'system-ui, sans-serif',
                      }}
                    >
                      ✦ Others
                    </span>
                  )}
                </div>
                {othersSelected && othersText && (
                  <p
                    style={{
                      fontSize: '12px',
                      color: 'rgba(238,230,216,0.45)',
                      fontFamily: 'system-ui, sans-serif',
                      marginTop: '8px',
                      fontStyle: 'italic',
                    }}
                  >
                    "{othersText}"
                  </p>
                )}
              </div>
            )}

            {isGroup && teamName && (
              <div style={{
                background: 'rgba(255,255,255,0.03)',
                border: '0.5px solid rgba(255,255,255,0.07)',
                borderRadius: '8px',
                padding: '10px 14px',
                marginBottom: '20px'
              }}>
                <p style={{
                  fontSize: '10px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                  color: 'rgba(238,230,216,0.35)',
                  fontFamily: 'system-ui, sans-serif',
                  marginBottom: '6px'
                }}>
                  Team Details
                </p>
                <p style={{
                  fontSize: '14px',
                  color: '#EEE6D8',
                  fontFamily: 'system-ui, sans-serif',
                  fontWeight: '500',
                  overflowWrap: 'anywhere',
                  wordBreak: 'break-word',
                  lineHeight: '1.5',
                }}>
                  {teamName}
                </p>
                {eventName && (
                  <p style={{
                    fontSize: '12px',
                    color: 'rgba(238,230,216,0.5)',
                    fontFamily: 'system-ui, sans-serif',
                    marginTop: '2px',
                    overflowWrap: 'anywhere',
                    wordBreak: 'break-word',
                    lineHeight: '1.5',
                  }}>
                    {eventName}
                  </p>
                )}
              </div>
            )}

            {isVolunteer && (
              <div style={{
                background: 'rgba(20,184,166,0.05)',
                border: '0.5px solid rgba(20,184,166,0.2)',
                borderRadius: '8px',
                padding: '10px 14px',
                marginBottom: '20px'
              }}>
                <p style={{
                  fontSize: '12px',
                  color: 'rgba(20,184,166,0.8)',
                  fontFamily: 'system-ui, sans-serif',
                  lineHeight: '1.6'
                }}>
                  {teamAssigned
                    ? `✓ Team Assigned: ${teamAssigned}`
                    : '⏳ Team assignment pending - faculty will assign your team after review.'}
                </p>
              </div>
            )}

            {statusError && (
              <MotionDiv
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  background: 'rgba(178,34,52,0.08)',
                  border: '0.5px solid rgba(178,34,52,0.25)',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  marginBottom: '16px',
                  color: 'rgba(238,230,216,0.75)',
                  fontSize: '13px',
                  fontFamily: 'system-ui, sans-serif'
                }}
              >
                {statusError}
              </MotionDiv>
            )}

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={checkStatus}
                disabled={isLoadingStatus}
                style={{
                  height: '42px',
                  padding: '0 24px',
                  borderRadius: '8px',
                  background: config.accentColor,
                  color: '#0A0800',
                  fontFamily: 'system-ui, sans-serif',
                  fontWeight: '600',
                  fontSize: '13px',
                  border: 'none',
                  cursor: isLoadingStatus ? 'not-allowed' : 'pointer',
                  opacity: isLoadingStatus ? 0.7 : 1,
                  transition: 'opacity 0.18s ease'
                }}
              >
                {isLoadingStatus ? 'Checking...' : 'Check Status'}
              </button>

              <button
                type="button"
                onClick={() => navigate('/')}
                style={{
                  height: '42px',
                  padding: '0 24px',
                  borderRadius: '8px',
                  background: 'transparent',
                  border: '0.5px solid rgba(255,255,255,0.12)',
                  color: 'rgba(238,230,216,0.65)',
                  fontFamily: 'system-ui, sans-serif',
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                Back to Home
              </button>
            </div>
          </div>
        </MotionDiv>
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: `
          radial-gradient(900px 600px at 15% 85%,
            rgba(158,38,54,0.10) 0%, transparent 60%),
          radial-gradient(700px 500px at 80% 15%,
            rgba(190,163,93,0.07) 0%, transparent 60%),
          #080910
        `,
        color: '#F5F0E8'
      }}
    >
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors mb-4 ml-4 mt-4"
      >
        ← Home
      </button>
      <div className="mx-auto flex max-w-2xl flex-col items-center justify-center px-4 py-8 sm:px-6 lg:px-8 lg:py-16">
        <MotionDiv
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 12, stiffness: 100, delay: 0.2 }}
          className="mb-8 inline-flex h-20 w-20 items-center justify-center rounded-full text-5xl"
          style={{
            background: config.accentBg,
            color: config.accentColor,
            border: `0.5px solid ${config.accentBorder}`
          }}
        >
          ✓
        </MotionDiv>

        <MotionH1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-center text-4xl font-light sm:text-5xl"
          style={DISPLAY_FONT}
        >
          {config.approvedTitle}
        </MotionH1>

        <MotionDiv
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-6 text-center"
        >
          <p className="text-[#F5F0E8]/85">
            {config.approvedSubtext}
          </p>
          {userName && (
            <p className="mt-2 text-lg" style={{ ...DISPLAY_FONT, color: config.accentColor }}>
              {userName}
            </p>
          )}
          {isGroup && groupSubtitle && (
            <p
              className="mt-1 text-sm text-[#F5F0E8]/70"
              style={{ overflowWrap: 'anywhere', wordBreak: 'break-word', lineHeight: '1.5' }}
            >
              {groupSubtitle}
            </p>
          )}
          <p className="mt-1 text-xs text-[#F5F0E8]/60">
            Registration ID: {id}
          </p>
        </MotionDiv>

        <MotionDiv
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-10 rounded-2xl bg-[#111111] p-6 sm:p-8"
          style={{ border: `0.5px solid ${config.accentBorder}` }}
        >
          <p className="mb-4 text-xs uppercase tracking-[0.15em]" style={{ color: config.accentColor }}>
            Your Digital Admit Pass
          </p>

          <div style={{
            width: '100%',
            overflowX: 'auto',
            borderRadius: '12px',
            overflow: 'hidden'
          }}>
            <img
              src={`data:image/png;base64,${qrCode}`}
              alt="Digital Admit Pass"
              style={{
                width: '100%',
                maxWidth: '900px',
                height: 'auto',
                display: 'block',
                borderRadius: '12px'
              }}
            />
          </div>

          {isVolunteer && (
            <div style={{
              marginTop: '16px',
              padding: '12px 14px',
              background: 'rgba(20,184,166,0.06)',
              border: '0.5px solid rgba(20,184,166,0.2)',
              borderRadius: '8px'
            }}>
              <p style={{
                fontSize: '10px',
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                color: 'rgba(20,184,166,0.7)',
                fontFamily: 'system-ui, sans-serif',
                marginBottom: '4px'
              }}>
                Team Assignment
              </p>
              <p style={{
                fontSize: '14px',
                color: '#14B8A6',
                fontFamily: 'system-ui, sans-serif',
                fontWeight: '500'
              }}>
                {teamAssigned || 'Check with faculty for team details'}
              </p>
            </div>
          )}

          {isGroup && teamName && (
            <div style={{
              marginTop: '16px',
              padding: '12px 14px',
              background: 'rgba(201,168,76,0.05)',
              border: '0.5px solid rgba(201,168,76,0.2)',
              borderRadius: '8px'
            }}>
              <p style={{
                fontSize: '10px',
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                color: 'rgba(201,168,76,0.6)',
                fontFamily: 'system-ui, sans-serif',
                marginBottom: '4px'
              }}>
                Team
              </p>
              <p style={{
                fontSize: '14px',
                color: '#C9A84C',
                fontFamily: 'system-ui, sans-serif',
                fontWeight: '500',
                overflowWrap: 'anywhere',
                wordBreak: 'break-word',
                lineHeight: '1.5',
              }}>
                {teamName}{teamMembers.length > 0 ? ` · ${teamMembers.length} member(s)` : ''}
              </p>
              {eventName && (
                <p style={{
                  fontSize: '12px',
                  color: 'rgba(238,230,216,0.5)',
                  fontFamily: 'system-ui, sans-serif',
                  marginTop: '2px',
                  overflowWrap: 'anywhere',
                  wordBreak: 'break-word',
                  lineHeight: '1.5',
                }}>
                  {eventName}
                </p>
              )}
            </div>
          )}

          <MotionDiv
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65 }}
            className="mt-6 rounded-lg border p-4"
            style={{
              borderColor: 'rgba(201,168,76,0.35)',
              background: 'rgba(201,168,76,0.12)'
            }}
          >
            <p className="text-center text-sm font-semibold" style={{ color: '#C9A84C' }}>
              📸 Save or screenshot your admit pass — present it at the entry gate
            </p>
          </MotionDiv>
        </MotionDiv>

        {isParticipant && (selectedEvents.length > 0 || othersSelected) && (
          <div
            style={{
              background: 'rgba(201,168,76,0.05)',
              border: '0.5px solid rgba(201,168,76,0.2)',
              borderRadius: '10px',
              padding: '14px 16px',
              marginTop: '24px',
              width: '100%',
            }}
          >
            <p
              style={{
                fontSize: '10px',
                textTransform: 'uppercase',
                letterSpacing: '0.14em',
                color: 'rgba(201,168,76,0.7)',
                fontFamily: 'system-ui, sans-serif',
                marginBottom: '10px',
              }}
            >
              Selected Events
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {selectedEvents.map((ev) => (
                <span
                  key={ev.id}
                  style={{
                    padding: '4px 12px',
                    borderRadius: '999px',
                    background: 'rgba(201,168,76,0.08)',
                    border: '0.5px solid rgba(201,168,76,0.25)',
                    color: '#C9A84C',
                    fontSize: '12px',
                    fontFamily: 'system-ui, sans-serif',
                  }}
                >
                  {ev.type && ev.type.toLowerCase() !== 'solo' ? `${ev.name} · ${ev.type}` : ev.name}
                </span>
              ))}
              {othersSelected && (
                <span
                  style={{
                    padding: '4px 12px',
                    borderRadius: '999px',
                    background: 'rgba(201,168,76,0.08)',
                    border: '0.5px dashed rgba(201,168,76,0.25)',
                    color: 'rgba(201,168,76,0.8)',
                    fontSize: '12px',
                    fontFamily: 'system-ui, sans-serif',
                  }}
                >
                  ✦ Others
                </span>
              )}
            </div>
            {othersSelected && othersText && (
              <p
                style={{
                  fontSize: '12px',
                  color: 'rgba(238,230,216,0.45)',
                  fontFamily: 'system-ui, sans-serif',
                  marginTop: '8px',
                  fontStyle: 'italic',
                }}
              >
                "{othersText}"
              </p>
            )}
          </div>
        )}

        <MotionButton
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.75 }}
          whileHover={{ y: -2 }}
          onClick={() => navigate('/')}
          className="mt-12 rounded-lg px-8 py-3 font-semibold transition hover:brightness-105"
          style={{ background: config.accentColor, color: '#0A0A0A' }}
        >
          Back to Home
        </MotionButton>
      </div>
    </div>
  )
}
