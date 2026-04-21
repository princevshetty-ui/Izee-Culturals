import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { EVENTS } from '../data/events.js'
import { apiFetch } from '../utils/api'

const _MOTION = motion

// Color system
// - Crimson: #B22234 (IZee uniform/logo accent, use sparingly)
// - Crimson border: rgba(178,34,52,0.2)
// - Crimson glow: rgba(178,34,52,0.06)

const heroWords = ['Where', 'Talent', 'Meets', 'Legacy']
const heroMeta = [
  { label: '24 April 2026', icon: '📅' },
  { label: 'Main Auditorium & Open Arena', icon: '📍' },
  { label: '7 Featured Events', icon: '✦' },
]

const ui = {
  goldSoftStrong: 'rgba(201,168,76,0.1)',
  goldBorder: 'rgba(201,168,76,0.24)',
  goldBorderBright: 'rgba(201,168,76,0.42)',
  goldBorderMid: 'rgba(201,168,76,0.36)',
  crimsonSoft: 'rgba(178,34,52,0.08)',
  crimsonSoftHover: 'rgba(178,34,52,0.12)',
  crimsonBorder: 'rgba(178,34,52,0.2)',
  crimsonBorderBright: 'rgba(178,34,52,0.34)',
}

function QrGlyph() {
  return (
    <svg viewBox="0 0 80 80" width="28" height="28" fill="none" aria-hidden="true">
      {/* Animated pulse ring around outer edge */}
      <circle
        cx="40"
        cy="40"
        r="36"
        stroke="#C9A84C"
        strokeWidth="0.8"
        opacity="0.3"
        style={{ animation: 'pulse-glow 2s ease-in-out infinite' }}
      />
      
      {/* Top-left position finder */}
      <rect x="6" y="6" width="20" height="20" rx="2" stroke="#C9A84C" strokeWidth="2" />
      <rect x="10" y="10" width="12" height="12" fill="#C9A84C" fillOpacity="0.2" />
      
      {/* Top-right position finder */}
      <rect x="46" y="6" width="20" height="20" rx="2" stroke="#C9A84C" strokeWidth="2" />
      <rect x="50" y="10" width="12" height="12" fill="#C9A84C" fillOpacity="0.2" />
      
      {/* Bottom-left position finder */}
      <rect x="6" y="46" width="20" height="20" rx="2" stroke="#C9A84C" strokeWidth="2" />
      <rect x="10" y="50" width="12" height="12" fill="#C9A84C" fillOpacity="0.2" />
      
      {/* Data matrix — bottom-right pattern at increased opacity */}
      <rect x="40" y="40" width="7" height="7" fill="#C9A84C" />
      <rect x="53" y="40" width="13" height="5" fill="#C9A84C" fillOpacity="0.9" />
      <rect x="40" y="53" width="5" height="13" fill="#C9A84C" fillOpacity="0.9" />
      <rect x="52" y="52" width="14" height="14" stroke="#C9A84C" strokeWidth="1.5" />
    </svg>
  )
}

function FestEmblem() {
  return (
    <motion.svg
      viewBox="0 0 48 48"
      width="48"
      height="48"
      fill="none"
      initial={{ rotate: -90 }}
      animate={{ rotate: 0 }}
      transition={{ duration: 1.2, ease: 'easeOut' }}
      aria-hidden="true"
    >
      {/* Outer circle outline */}
      <circle cx="24" cy="24" r="22" stroke="#C9A84C" strokeWidth="1" opacity="0.6" />
      
      {/* Diamond tick marks at 8 compass points */}
      <polygon points="24,2 26,4 24,6 22,4" fill="#C9A84C" opacity="0.6" />
      <polygon points="37,11 39,13 37,15 35,13" fill="#C9A84C" opacity="0.6" />
      <polygon points="46,22 44,24 46,26 48,24" fill="#C9A84C" opacity="0.6" />
      <polygon points="37,37 39,35 37,33 35,35" fill="#C9A84C" opacity="0.6" />
      <polygon points="24,46 26,44 24,42 22,44" fill="#C9A84C" opacity="0.6" />
      <polygon points="11,37 13,35 11,33 9,35" fill="#C9A84C" opacity="0.6" />
      <polygon points="2,22 4,24 2,26 0,24" fill="#C9A84C" opacity="0.6" />
      <polygon points="11,11 13,13 11,15 9,13" fill="#C9A84C" opacity="0.6" />
      
      {/* Center numeral "26" */}
      <text
        x="24"
        y="30"
        textAnchor="middle"
        fontSize="18"
        fontWeight="bold"
        fill="#C9A84C"
        opacity="0.6"
        fontFamily="serif"
      >
        26
      </text>
    </motion.svg>
  )
}

export default function Home() {
  const navigate = useNavigate()
  const canvasRef = useRef(null)
  const mouseRef = useRef({ x: 0, y: 0 })
  const rafRef = useRef(0)
  const [registrationConfig, setRegistrationConfig] = useState({
    student_open: true,
    participant_open: true,
    volunteer_open: true,
  })

  useEffect(() => {
    let isMounted = true

    const loadRegistrationConfig = async () => {
      try {
        const response = await apiFetch('/api/config/registrations')
        const payload = await response.json().catch(() => ({}))
        if (!isMounted || !response.ok || !payload?.success || !payload?.data) return

        setRegistrationConfig((previous) => ({
          ...previous,
          student_open: Boolean(payload.data.student_open),
          participant_open: Boolean(payload.data.participant_open),
          volunteer_open: Boolean(payload.data.volunteer_open),
        }))
      } catch {
        // Keep defaults open when config cannot be loaded.
      }
    }

    loadRegistrationConfig()
    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined

    const ctx = canvas.getContext('2d')
    if (!ctx) return undefined

    const particleCount = 90
    let width = 0
    let height = 0
    let dpr = Math.max(window.devicePixelRatio || 1, 1)

    const createParticle = (type = 'gold', resetToBottom = false) => {
      if (type === 'crimson') {
        return {
          type,
          x: Math.random() * width,
          y: resetToBottom ? height + Math.random() * 40 : Math.random() * height,
          vx: -0.2 + Math.random() * 0.4,
          vy: -(0.4 + Math.random() * 0.3),
          radius: 1 + Math.random(),
          alpha: 0.035 + Math.random() * 0.08,
          color: '178,34,52',
        }
      }

      if (type === 'blue') {
        return {
          type,
          x: Math.random() * width,
          y: resetToBottom ? height + Math.random() * 40 : Math.random() * height,
          vx: -0.2 + Math.random() * 0.4,
          vy: -(0.4 + Math.random() * 0.3),
          radius: 0.8 + Math.random() * 0.6,
          alpha: 0.03 + Math.random() * 0.03,
          color: '30,50,140',
        }
      }

      return {
        type,
        x: Math.random() * width,
        y: resetToBottom ? height + Math.random() * 40 : Math.random() * height,
        vx: -0.3 + Math.random() * 0.6,
        vy: -(0.4 + Math.random() * 0.4),
        radius: 0.8 + Math.random() * 1.2,
        alpha: 0.08 + Math.random() * 0.22,
        color: '201,168,76',
      }
    }

    const resize = () => {
      dpr = Math.max(window.devicePixelRatio || 1, 1)
      width = window.innerWidth
      height = window.innerHeight
      mouseRef.current = { x: width / 2, y: height / 2 }
      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    resize()

    const particles = [
      ...Array.from({ length: particleCount }, () => createParticle('gold', false)),
      ...Array.from({ length: 15 }, () => createParticle('crimson', false)),
      ...Array.from({ length: 8 }, () => createParticle('blue', false)),
    ]

    const onMouseMove = (event) => {
      mouseRef.current = { x: event.clientX, y: event.clientY }
    }

    const animate = () => {
      ctx.clearRect(0, 0, width, height)

      // Apply vignette effect
      const vignette = ctx.createRadialGradient(
        width / 2,
        height / 2,
        0,
        width / 2,
        height / 2,
        Math.hypot(width, height) / 2
      )
      vignette.addColorStop(0, 'rgba(12,13,16,0)')
      vignette.addColorStop(1, 'rgba(8,9,16,0.4)')
      ctx.fillStyle = vignette
      ctx.fillRect(0, 0, width, height)

      const offsetX = (mouseRef.current.x - width / 2) * 0.022
      const offsetY = (mouseRef.current.y - height / 2) * 0.022

      for (let i = 0; i < particles.length; i += 1) {
        const p = particles[i]
        p.x += p.vx
        p.y += p.vy

        if (p.y < -10) {
          particles[i] = createParticle(p.type, true)
          continue
        }

        if (p.x < -20) p.x = width + 20
        if (p.x > width + 20) p.x = -20

        ctx.beginPath()
        ctx.arc(p.x + offsetX, p.y + offsetY, p.radius, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${p.color},${p.alpha})`
        ctx.fill()
      }

      rafRef.current = window.requestAnimationFrame(animate)
    }

    window.addEventListener('resize', resize)
    window.addEventListener('mousemove', onMouseMove, { passive: true })
    rafRef.current = window.requestAnimationFrame(animate)

    return () => {
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', onMouseMove)
      window.cancelAnimationFrame(rafRef.current)
    }
  }, [])

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#0C0D10] text-[#EEE6D8] font-body">
      <canvas
        ref={canvasRef}
        className="pointer-events-none fixed inset-0 z-0"
        aria-hidden="true"
      />

      <div
        className="pointer-events-none fixed inset-0 z-[1]"
        style={{
          background:
            'radial-gradient(ellipse at 50% 30%, rgba(190,163,93,0.05) 0%, transparent 72%)',
        }}
      />

      <div
        className="pointer-events-none fixed inset-0 z-[1]"
        style={{
          background:
            'radial-gradient(ellipse at 15% 80%, rgba(158,38,54,0.045) 0%, transparent 52%)',
        }}
      />

      <header
        className="sticky top-0 z-50 border-b backdrop-blur-md"
        style={{
          background: 'rgba(12,13,16,0.78)',
          borderBottomColor: ui.goldSoftStrong,
          borderBottomWidth: '0.5px',
        }}
      >
        <nav className="mx-auto flex h-[72px] w-full max-w-[1440px] items-center justify-between px-4 sm:px-8 lg:px-[60px]">
          <div className="flex items-center">
            <img 
              src="/college-logo.png" 
              alt="IZee Got Talent"
              style={{ height: '72px', width: 'auto', objectFit: 'contain' }}
              onError={(e) => {
                e.target.style.display = 'none'
                e.target.nextSibling.style.display = 'block'
              }}
            />
            <span 
              style={{display: 'none'}}
              className="text-xl font-bold tracking-widest text-[#C9A84C]"
            >
              IZEE GOT TALENT
            </span>
          </div>

          <button
            type="button"
            onClick={() => navigate('/faculty/login')}
            className="rounded-full border px-5 py-2 text-[12px] font-medium uppercase tracking-[0.1em] text-[#BEA35D] transition duration-300 ease-out hover:bg-[rgba(201,168,76,0.1)]"
            style={{
              borderColor: ui.goldBorderMid,
              borderWidth: '0.5px',
            }}
          >
            Faculty Login <span className="ml-1 inline-block">→</span>
          </button>
        </nav>

        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-px"
          style={{
            opacity: 0.4,
            background: 'linear-gradient(to right, transparent, rgba(201,168,76,0.8) 30%, rgba(201,168,76,0.95) 50%, rgba(201,168,76,0.8) 70%, transparent)',
          }}
        />
      </header>

      <main className="relative z-[2]">
        <section className="mx-auto flex min-h-screen w-full max-w-[1440px] items-center px-4 pb-16 pt-10 sm:px-8 lg:px-[60px]">
          <div className="grid w-full items-center gap-10 lg:grid-cols-[1.5fr_1fr]">
            <div className="relative">
              <div className="mb-5 flex justify-start">
                <FestEmblem />
              </div>

              <div className="relative z-[1] inline-block">
                <p
                  className="mb-1 font-display uppercase text-[#BEA35D]"
                  style={{
                    fontWeight: 700,
                    fontSize: '13px',
                    letterSpacing: '0.20em',
                    color: 'rgba(201,168,76,0.85)',
                    WebkitFontSmoothing: 'antialiased',
                    MozOsxFontSmoothing: 'grayscale',
                  }}
                >
                  IZEE GOT TALENT 2026
                </p>
                <motion.span
                  initial={{ scaleX: 0, opacity: 0.7 }}
                  animate={{ scaleX: 1, opacity: 1 }}
                  transition={{ duration: 0.55, delay: 0.2, ease: 'easeOut' }}
                  className="block h-px origin-left"
                  style={{ background: 'linear-gradient(to right, rgba(201,168,76,0.1), rgba(201,168,76,0.7), rgba(201,168,76,0.1))' }}
                />
              </div>

              <h1 className="mt-6 font-display font-bold leading-[1.04] text-[#EEE6D8] text-[clamp(32px,5vw,72px)]">
                <motion.span
                  initial={{ y: 32, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.58, delay: 0.05, ease: 'easeOut' }}
                  className="mr-[0.2em] inline-block font-display"
                >
                  {heroWords[0]}
                </motion.span>
                <motion.span
                  initial={{ y: 32, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.58, delay: 0.14, ease: 'easeOut' }}
                  className="mr-[0.2em] inline-block font-display"
                >
                  {heroWords[1]}
                </motion.span>
                <span className="inline-block whitespace-nowrap font-display">
                  <motion.span
                    initial={{ y: 32, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.58, delay: 0.24, ease: 'easeOut' }}
                    className="mr-[0.2em] inline-block font-display"
                  >
                    {heroWords[2]}
                  </motion.span>
                  <motion.span
                    initial={{ y: 32, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.58, delay: 0.34, ease: 'easeOut' }}
                    className="inline-block font-display italic font-bold text-[#BEA35D]"
                  >
                    {heroWords[3]}
                  </motion.span>
                </span>
              </h1>

              <motion.p
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.44, ease: 'easeOut' }}
                className="mt-5 max-w-[560px] text-[18px] text-[rgba(238,230,216,0.72)]"
                style={{
                  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  letterSpacing: '0.01em',
                  lineHeight: 1.55,
                  textShadow: 'none',
                }}
              >
                Step into a night of rhythm, theatre, style, and unforgettable campus energy.
              </motion.p>

              <motion.div
                initial={{ opacity: 0.35, scaleX: 0 }}
                animate={{ opacity: 0.7, scaleX: 1 }}
                transition={{ duration: 0.55, delay: 0.58, ease: 'easeOut' }}
                className="my-7 h-px w-20 origin-center bg-[#BEA35D]"
                style={{ boxShadow: '0 0 12px rgba(201,168,76,0.3)' }}
              />

              <motion.div
                initial="hidden"
                animate="show"
                variants={{
                  hidden: {},
                  show: { transition: { staggerChildren: 0.1, delayChildren: 0.7 } },
                }}
                className="flex flex-wrap gap-3"
              >
                {heroMeta.map((item) => (
                  <motion.span
                    key={item.label}
                    variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    className="group rounded-full border px-5 py-2.5 text-[rgba(238,230,216,0.72)] transition duration-200 ease-out animate-[shimmer_4.2s_linear_infinite] hover:text-[rgba(238,230,216,0.88)] hover:[box-shadow:inset_0_0_20px_rgba(201,168,76,0.08)]"
                    style={{
                      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                      fontSize: '12px',
                      fontWeight: 500,
                      letterSpacing: '0.04em',
                      WebkitFontSmoothing: 'antialiased',
                      MozOsxFontSmoothing: 'grayscale',
                      borderColor: 'rgba(238,230,216,0.28)',
                      borderWidth: '0.5px',
                      backgroundImage: 'linear-gradient(120deg, transparent 35%, rgba(201,168,76,0.2) 50%, transparent 65%)',
                      backgroundSize: '220% 100%',
                    }}
                  >
                    <span className="mr-2 opacity-85">{item.icon}</span>
                    {item.label}
                  </motion.span>
                ))}
              </motion.div>
            </div>

            <div className="space-y-4">
              <motion.div
                initial={{ x: 60, opacity: 0 }}
                animate={{
                  x: 0,
                  opacity: 1,
                  borderColor: [
                    'rgba(201,168,76,0.22)',
                    'rgba(201,168,76,0.34)',
                    'rgba(201,168,76,0.22)',
                  ],
                  boxShadow: [
                    '0 0 0 rgba(201,168,76,0)',
                    '0 0 20px rgba(201,168,76,0.096)',
                    '0 0 0 rgba(201,168,76,0)',
                  ],
                }}
                transition={{
                  x: { duration: 0.55, ease: 'easeOut', delay: 0.22 },
                  opacity: { duration: 0.55, ease: 'easeOut', delay: 0.22 },
                  borderColor: { duration: 10, ease: 'easeInOut', repeat: Infinity },
                  boxShadow: { duration: 10, ease: 'easeInOut', repeat: Infinity },
                }}
                className="relative overflow-hidden rounded-xl p-8 transition duration-300 ease-out backdrop-blur-[2px] hover:bg-[rgba(201,168,76,0.07)]"
                style={{
                  background: 'rgba(201,168,76,0.045)',
                  borderStyle: 'solid',
                  borderWidth: '0.5px',
                  borderColor: ui.goldBorder,
                }}
                whileHover={{
                  y: -2,
                  borderColor: ui.goldBorderBright,
                  boxShadow: '0 0 24px rgba(201,168,76,0.08)',
                }}
              >
                <div
                  className="pointer-events-none absolute inset-x-0 top-0 h-[3px]"
                  style={{ background: 'linear-gradient(to right, transparent, rgba(201,168,76,0.85), transparent)' }}
                />

                <div className="relative mb-5 flex items-start">
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-full"
                    style={{
                      background: 'rgba(201,168,76,0.08)',
                      border: `0.5px solid ${ui.goldBorder}`,
                      boxShadow: '0 0 18px rgba(201,168,76,0.14)',
                    }}
                  >
                    <QrGlyph />
                  </div>
                  <span
                    className="absolute right-0 top-0 rounded-full px-3 py-1 uppercase text-[#BEA35D]"
                    style={{
                      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                      fontSize: '10px',
                      fontWeight: 600,
                      letterSpacing: '0.14em',
                      WebkitFontSmoothing: 'antialiased',
                      MozOsxFontSmoothing: 'grayscale',
                      background: 'linear-gradient(135deg, rgba(201,168,76,0.22), rgba(201,168,76,0.06))',
                      border: `0.5px solid ${ui.goldBorderMid}`,
                    }}
                  >
                    COMPETE
                  </span>
                </div>

                <div className="mb-2 flex items-center gap-2">
                  <motion.span
                    className="h-1.5 w-1.5 rounded-full bg-[#BEA35D]"
                    animate={{ opacity: [0.35, 1, 0.35] }}
                    transition={{ repeat: Infinity, duration: 0.62, ease: 'easeOut' }}
                  />
                  <h3 className="font-display text-[22px] tracking-[0.015em] text-[#EEE6D8]">Participants Registration</h3>
                </div>

                <p
                  className="text-[rgba(238,230,216,0.68)]"
                  style={{
                    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    fontSize: '14px',
                    lineHeight: 1.65,
                    fontWeight: 400,
                    WebkitFontSmoothing: 'antialiased',
                    MozOsxFontSmoothing: 'grayscale',
                  }}
                >
                  Pick your stage, lock up to two events, and receive your competition entry QR.
                </p>

                <button
                  type="button"
                  onClick={() => navigate('/participant/events')}
                  disabled={!registrationConfig.participant_open}
                  className="group mt-5 inline-flex items-center rounded-full border px-4 py-2 text-[#BEA35D] transition duration-300 ease-out hover:bg-[rgba(201,168,76,0.18)] hover:text-[#EBD08F] disabled:cursor-not-allowed disabled:opacity-55"
                  style={{
                    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    fontSize: '13px',
                    fontWeight: 500,
                    WebkitFontSmoothing: 'antialiased',
                    MozOsxFontSmoothing: 'grayscale',
                    background: ui.goldSoftStrong,
                    borderColor: ui.goldBorder,
                    borderWidth: '0.5px',
                  }}
                >
                  {registrationConfig.participant_open ? 'Register to Compete' : 'Registrations Closed'}
                  <span className="ml-2 inline-block transition-transform duration-300 ease-out group-hover:translate-x-[3px]">{registrationConfig.participant_open ? '→' : '•'}</span>
                </button>
              </motion.div>

              <div
                className="h-px w-full"
                style={{ background: 'linear-gradient(to right, transparent, rgba(238,230,216,0.08), transparent)' }}
              />

              <motion.div
                initial={{ x: 60, opacity: 0 }}
                animate={{
                  x: 0,
                  opacity: 1,
                  borderColor: [
                    'rgba(178,34,52,0.2)',
                    'rgba(178,34,52,0.29)',
                    'rgba(178,34,52,0.2)',
                  ],
                  boxShadow: [
                    '0 0 0 rgba(178,34,52,0)',
                    '0 0 20px rgba(178,34,52,0.096)',
                    '0 0 0 rgba(178,34,52,0)',
                  ],
                }}
                transition={{
                  x: { duration: 0.55, ease: 'easeOut', delay: 0.34 },
                  opacity: { duration: 0.55, ease: 'easeOut', delay: 0.34 },
                  borderColor: { duration: 10, ease: 'easeInOut', repeat: Infinity },
                  boxShadow: { duration: 10, ease: 'easeInOut', repeat: Infinity },
                }}
                className="relative overflow-hidden rounded-xl p-8 transition duration-300 ease-out backdrop-blur-[2px]"
                style={{
                  background: 'rgba(178,34,52,0.045)',
                  borderStyle: 'solid',
                  borderWidth: '0.5px',
                  borderColor: ui.crimsonBorder,
                }}
                whileHover={{
                  y: -2,
                  borderColor: ui.crimsonBorderBright,
                  backgroundColor: ui.crimsonSoftHover,
                  boxShadow: '0 0 24px rgba(178,34,52,0.08)',
                }}
              >
                <div
                  className="pointer-events-none absolute inset-x-0 top-0 h-[3px]"
                  style={{ background: 'linear-gradient(to right, transparent, #D44455, transparent)' }}
                />

                <div className="relative mb-5 flex items-start">
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-full"
                    style={{
                      background: ui.crimsonSoft,
                      border: `0.5px solid ${ui.crimsonBorder}`,
                      boxShadow: '0 0 18px rgba(178,34,52,0.14)',
                    }}
                  >
                    <QrGlyph />
                  </div>
                  <span
                    className="absolute right-0 top-0 rounded-full px-3 py-1 uppercase text-[#B22234]"
                    style={{
                      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                      fontSize: '10px',
                      fontWeight: 600,
                      letterSpacing: '0.14em',
                      WebkitFontSmoothing: 'antialiased',
                      MozOsxFontSmoothing: 'grayscale',
                      background: 'linear-gradient(135deg, rgba(178,34,52,0.2), rgba(178,34,52,0.06))',
                      border: `0.5px solid ${ui.crimsonBorder}`,
                    }}
                  >
                    AUDIENCE
                  </span>
                </div>

                <div className="mb-2 flex items-center gap-2">
                  <motion.span
                    className="h-1.5 w-1.5 rounded-full bg-[#B22234]"
                    animate={{ opacity: [0.2, 0.9, 0.2] }}
                    transition={{ repeat: Infinity, duration: 0.62, ease: 'easeOut', delay: 0.12 }}
                  />
                  <h3 className="font-display text-[22px] tracking-[0.015em] text-[#EEE6D8]">Students Registration</h3>
                </div>

                <p
                  className="text-[rgba(238,230,216,0.68)]"
                  style={{
                    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    fontSize: '14px',
                    lineHeight: 1.65,
                    fontWeight: 400,
                    WebkitFontSmoothing: 'antialiased',
                    MozOsxFontSmoothing: 'grayscale',
                  }}
                >
                  Grab your audience pass QR to enter the fest venue and cheer for your classmates live.
                </p>

                <button
                  type="button"
                  onClick={() => navigate('/student/register')}
                  disabled={!registrationConfig.student_open}
                  className="group mt-5 inline-flex items-center rounded-full border px-4 py-2 text-[#D44455] transition duration-300 ease-out hover:bg-[rgba(178,34,52,0.18)] hover:text-[#E45B6C] disabled:cursor-not-allowed disabled:opacity-55"
                  style={{
                    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    fontSize: '13px',
                    fontWeight: 500,
                    WebkitFontSmoothing: 'antialiased',
                    MozOsxFontSmoothing: 'grayscale',
                    background: ui.crimsonSoft,
                    borderColor: ui.crimsonBorder,
                    borderWidth: '0.5px',
                  }}
                >
                  {registrationConfig.student_open ? 'Register as Audience' : 'Registrations Closed'}
                  <span className="ml-2 inline-block transition-transform duration-300 ease-out group-hover:translate-x-[3px]">{registrationConfig.student_open ? '→' : '•'}</span>
                </button>
              </motion.div>

              <motion.div
                initial="hidden"
                animate="show"
                variants={{
                  hidden: {},
                  show: { transition: { staggerChildren: 0.06, delayChildren: 0.44 } },
                }}
              >
                <div className="mb-3 flex items-center gap-3 text-[9px] uppercase text-[rgba(238,230,216,0.52)]">
                  <span className="h-px flex-1" style={{ background: 'rgba(238,230,216,0.16)' }} />
                  <p
                    style={{
                      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                      fontWeight: 700,
                      fontSize: '10px',
                      letterSpacing: '0.18em',
                      color: 'rgba(238,230,216,0.45)',
                      WebkitFontSmoothing: 'antialiased',
                      MozOsxFontSmoothing: 'grayscale',
                    }}
                  >
                    EVENTS THIS YEAR
                  </p>
                  <span className="h-px flex-1" style={{ background: 'rgba(238,230,216,0.16)' }} />
                </div>
                <div className="flex flex-wrap gap-2">
                  {EVENTS.map((event) => (
                    <motion.span
                      key={event.id}
                      variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                      className="cursor-default rounded-full border bg-transparent px-3.5 py-1 text-[rgba(238,230,216,0.5)] transition duration-200 ease-out hover:bg-[rgba(201,168,76,0.08)] hover:text-[rgba(238,230,216,0.8)]"
                      style={{
                        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                        fontSize: '12px',
                        letterSpacing: '0.05em',
                        WebkitFontSmoothing: 'antialiased',
                        MozOsxFontSmoothing: 'grayscale',
                        borderColor: 'rgba(238,230,216,0.18)',
                        borderWidth: '0.5px',
                      }}
                      whileHover={{ borderColor: 'rgba(201,168,76,0.3)' }}
                    >
                      {event.name}
                    </motion.span>
                  ))}
                </div>
              </motion.div>
            </div>
          </div>
        </section>
      </main>

      <div
        className="relative z-[2] h-px w-full"
        style={{
          opacity: 0.5,
          background:
            'linear-gradient(to right, transparent, #7C1F2B 20%, #BEA35D 50%, #1A2B5F 80%, transparent)',
          boxShadow: '0 6px 14px rgba(201,168,76,0.08)',
        }}
      />

      <footer
        className="relative z-[2] flex flex-col gap-2 border-t px-4 py-5 text-[11px] sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-[60px]"
        style={{ borderTopColor: 'rgba(238,230,216,0.08)', borderTopWidth: '0.5px' }}
      >
        <span
          className="text-[rgba(238,230,216,0.3)]"
          style={{
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            letterSpacing: '0.03em',
            WebkitFontSmoothing: 'antialiased',
            MozOsxFontSmoothing: 'grayscale',
          }}
        >
          © 2026 IZee · Cultural Committee
        </span>
      </footer>

    </div>
  )
}
