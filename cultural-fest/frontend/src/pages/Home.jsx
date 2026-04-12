import { useEffect, useRef, useState } from 'react'
import { motion, useInView } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { EVENTS } from '../data/events.js'

// Color system
// - Crimson: #B22234 (IZee uniform/logo accent, use sparingly)
// - Crimson border: rgba(178,34,52,0.2)
// - Crimson glow: rgba(178,34,52,0.06)

const heroWords = ['Where', 'Talent', 'Meets']

function QrGlyph() {
  return (
    <svg viewBox="0 0 72 72" width="28" height="28" fill="none" aria-hidden="true">
      <rect x="6" y="6" width="20" height="20" rx="2" stroke="#C9A84C" strokeWidth="2" />
      <rect x="10" y="10" width="12" height="12" fill="#C9A84C" fillOpacity="0.12" />
      <rect x="46" y="6" width="20" height="20" rx="2" stroke="#C9A84C" strokeWidth="2" />
      <rect x="50" y="10" width="12" height="12" fill="#C9A84C" fillOpacity="0.12" />
      <rect x="6" y="46" width="20" height="20" rx="2" stroke="#C9A84C" strokeWidth="2" />
      <rect x="10" y="50" width="12" height="12" fill="#C9A84C" fillOpacity="0.12" />
      <rect x="40" y="40" width="7" height="7" fill="#C9A84C" />
      <rect x="53" y="40" width="13" height="5" fill="#C9A84C" fillOpacity="0.75" />
      <rect x="40" y="53" width="5" height="13" fill="#C9A84C" fillOpacity="0.75" />
      <rect x="52" y="52" width="14" height="14" stroke="#C9A84C" strokeWidth="1.5" />
    </svg>
  )
}

export default function Home() {
  const navigate = useNavigate()
  const canvasRef = useRef(null)
  const heroRef = useRef(null)
  const eventsRef = useRef(null)
  const mouseRef = useRef({ x: 0, y: 0 })
  const rafRef = useRef(0)
  const [showScrollIndicator, setShowScrollIndicator] = useState(true)
  const eventsInView = useInView(eventsRef, { once: true, amount: 0.18 })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined

    const ctx = canvas.getContext('2d')
    if (!ctx) return undefined

    const particleCount = 80
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
          alpha: 0.06 + Math.random() * 0.12,
          color: '178,34,52',
        }
      }

      return {
        type,
        x: Math.random() * width,
        y: resetToBottom ? height + Math.random() * 40 : Math.random() * height,
        vx: -0.3 + Math.random() * 0.6,
        vy: -(0.4 + Math.random() * 0.4),
        radius: 1 + Math.random() * 1.5,
        alpha: 0.15 + Math.random() * 0.35,
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
    ]

    const onMouseMove = (event) => {
      mouseRef.current = { x: event.clientX, y: event.clientY }
    }

    const animate = () => {
      ctx.clearRect(0, 0, width, height)

      const offsetX = (mouseRef.current.x - width / 2) * 0.015
      const offsetY = (mouseRef.current.y - height / 2) * 0.015

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

  useEffect(() => {
    const handleScroll = () => {
      if (!heroRef.current) return
      const heroBottom = heroRef.current.offsetTop + heroRef.current.offsetHeight
      setShowScrollIndicator(window.scrollY < heroBottom - 120)
    }

    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#0A0A0A] text-[#F5F0E8] font-body">
      <canvas
        ref={canvasRef}
        className="pointer-events-none fixed inset-0 z-0"
        aria-hidden="true"
      />

      <div
        className="pointer-events-none fixed inset-0 z-[1]"
        style={{
          background:
            'radial-gradient(ellipse at 50% 30%, rgba(201,168,76,0.07) 0%, transparent 65%)',
        }}
      />

      <div
        className="pointer-events-none fixed inset-0 z-[1]"
        style={{
          background:
            'radial-gradient(ellipse at 15% 80%, rgba(178,34,52,0.06) 0%, transparent 45%)',
        }}
      />

      <header
        className="sticky top-0 z-50 border-b backdrop-blur-sm"
        style={{
          background: 'rgba(10,10,10,0.85)',
          borderBottomColor: 'rgba(201,168,76,0.12)',
          borderBottomWidth: '0.5px',
        }}
      >
        <nav className="mx-auto flex h-20 w-full max-w-[1440px] items-center justify-between px-4 sm:px-8 lg:px-[60px]">
          <div className="flex items-center">
            <span className="font-display text-[20px] font-semibold uppercase tracking-[0.12em] text-[#2347B0]">
              IZEE
            </span>
            <span
              className="mx-3 block w-px"
              style={{
                height: '16px',
                background: 'linear-gradient(to bottom, #B22234, #C9A84C)',
              }}
            />
            <span className="font-display text-[20px] font-semibold uppercase tracking-[0.12em] text-[#C9A84C]">
               CULTURALS
            </span>
          </div>

          <button
            type="button"
            onClick={() => navigate('/faculty/login')}
            className="rounded-full border px-5 py-2 text-[12px] font-medium uppercase tracking-[0.1em] text-[#C9A84C] transition hover:bg-[rgba(201,168,76,0.1)]"
            style={{
              borderColor: 'rgba(201,168,76,0.5)',
              borderWidth: '0.5px',
            }}
          >
            Faculty Login
          </button>
        </nav>
      </header>

      <main className="relative z-[2]">
        <section
          ref={heroRef}
          className="mx-auto flex min-h-screen w-full max-w-[1440px] items-center px-4 pb-16 pt-10 sm:px-8 lg:px-[60px]"
        >
          <div className="grid w-full items-center gap-10 lg:grid-cols-[1.5fr_1fr]">
            <div>
              <p className="mb-6 text-[11px] uppercase tracking-[0.25em] text-[#C9A84C]">
                ANNUAL COLLEGE CULTURAL FEST 2026
              </p>

              <h1 className="font-display font-bold leading-[1.05] text-[#F5F0E8] text-[clamp(48px,6vw,80px)]">
                <span className="block">
                  {heroWords.map((word, index) => (
                    <motion.span
                      key={word}
                      initial={{ y: 40, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ duration: 0.7, delay: index * 0.12, ease: 'easeOut' }}
                      className="mr-[0.2em] inline-block"
                    >
                      {word}
                    </motion.span>
                  ))}
                </span>
                <motion.span
                  initial={{ y: 40, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.7, delay: heroWords.length * 0.12, ease: 'easeOut' }}
                  className="block italic text-[#C9A84C]"
                >
                  Legacy
                </motion.span>
              </h1>

              <motion.p
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.6, ease: 'easeOut' }}
                className="mt-5 max-w-[560px] font-display text-[18px] italic text-[rgba(245,240,232,0.5)]"
              >
                Step into a night of rhythm, theatre, style, and unforgettable campus energy.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 0.6, width: 48 }}
                transition={{ duration: 0.5, delay: 0.72, ease: 'easeOut' }}
                className="my-7 h-px bg-[#C9A84C]"
              />

              <motion.div
                initial="hidden"
                animate="show"
                variants={{
                  hidden: {},
                  show: { transition: { staggerChildren: 0.1, delayChildren: 0.8 } },
                }}
                className="flex flex-wrap gap-3"
              >
                {['24 April 2026', 'Main Auditorium & Open Arena', '7 Featured Events'].map((item) => (
                  <motion.span
                    key={item}
                    variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
                    transition={{ duration: 0.45, ease: 'easeOut' }}
                    className="rounded-full border px-4 py-2 text-[12px] text-[rgba(245,240,232,0.6)]"
                    style={{ borderColor: 'rgba(245,240,232,0.15)', borderWidth: '0.5px' }}
                  >
                    {item}
                  </motion.span>
                ))}
              </motion.div>
            </div>

            <div className="space-y-4">
              <motion.div
                initial={{ x: 60, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.55, ease: 'easeOut', delay: 0.22 }}
                className="rounded-xl p-7 transition duration-200 hover:bg-[rgba(201,168,76,0.1)]"
                style={{
                  background: 'rgba(201,168,76,0.06)',
                  border: '0.5px solid rgba(201,168,76,0.3)',
                }}
                whileHover={{ y: -2, borderColor: 'rgba(201,168,76,0.55)' }}
              >
                <div className="mb-5 flex items-start justify-between">
                  <QrGlyph />
                  <span
                    className="rounded px-2.5 py-[3px] text-[9px] uppercase tracking-[0.12em] text-[#C9A84C]"
                    style={{
                      background: 'rgba(201,168,76,0.12)',
                      border: '0.5px solid rgba(201,168,76,0.45)',
                    }}
                  >
                    COMPETE
                  </span>
                </div>

                <div className="mb-2 flex items-center gap-2">
                  <motion.span
                    className="h-1.5 w-1.5 rounded-full bg-[#C9A84C]"
                    animate={{ opacity: [0.35, 1, 0.35] }}
                    transition={{ repeat: Infinity, duration: 2.4, ease: 'easeInOut' }}
                  />
                  <h3 className="font-display text-[20px] text-[#F5F0E8]">Participants Registration</h3>
                </div>

                <p className="text-[13px] leading-[1.6] text-[rgba(245,240,232,0.45)]">
                  Pick your stage, lock up to two events, and receive your competition entry QR instantly.
                </p>

                <button
                  type="button"
                  onClick={() => navigate('/participant/events')}
                  className="mt-4 text-[13px] text-[#C9A84C] transition hover:underline"
                >
                  Register to Compete →
                </button>
              </motion.div>

              <motion.div
                initial={{ x: 60, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.55, ease: 'easeOut', delay: 0.34 }}
                className="rounded-xl p-7 transition duration-200"
                style={{
                  background: 'rgba(178,34,52,0.06)',
                  border: '0.5px solid rgba(178,34,52,0.2)',
                }}
                whileHover={{ y: -2, borderColor: 'rgba(178,34,52,0.4)', backgroundColor: 'rgba(178,34,52,0.1)' }}
              >
                <div className="mb-5 flex items-start justify-between">
                  <QrGlyph />
                  <span
                    className="rounded px-2.5 py-[3px] text-[9px] uppercase tracking-[0.12em] text-[#B22234]"
                    style={{
                      background: 'rgba(178,34,52,0.08)',
                      border: '0.5px solid rgba(178,34,52,0.2)',
                    }}
                  >
                    AUDIENCE
                  </span>
                </div>

                <div className="mb-2 flex items-center gap-2">
                  <motion.span
                    className="h-1.5 w-1.5 rounded-full bg-[#B22234]"
                    animate={{ opacity: [0.2, 0.9, 0.2] }}
                    transition={{ repeat: Infinity, duration: 2.4, ease: 'easeInOut', delay: 0.5 }}
                  />
                  <h3 className="font-display text-[20px] text-[#F5F0E8]">Students Registration</h3>
                </div>

                <p className="text-[13px] leading-[1.6] text-[rgba(245,240,232,0.45)]">
                  Grab your audience pass QR to enter the fest venue and cheer for your classmates live.
                </p>

                <button
                  type="button"
                  onClick={() => navigate('/student/register')}
                  className="mt-4 text-[13px] text-[rgba(178,34,52,0.8)] transition hover:text-[#B22234]"
                >
                  Register as Audience →
                </button>
              </motion.div>

              <motion.div
                initial="hidden"
                animate="show"
                variants={{
                  hidden: {},
                  show: { transition: { staggerChildren: 0.06, delayChildren: 0.48 } },
                }}
              >
                <p className="mb-3 text-[9px] uppercase tracking-[0.2em] text-[rgba(245,240,232,0.25)]">
                  EVENTS THIS YEAR
                </p>
                <div className="flex flex-wrap gap-2">
                  {EVENTS.map((event) => (
                    <motion.span
                      key={event.id}
                      variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }}
                      transition={{ duration: 0.4, ease: 'easeOut' }}
                      className="rounded-full border bg-transparent px-3.5 py-1 text-[11px] text-[rgba(245,240,232,0.4)]"
                      style={{ borderColor: 'rgba(245,240,232,0.12)', borderWidth: '0.5px' }}
                    >
                      {event.name}
                    </motion.span>
                  ))}
                </div>
              </motion.div>
            </div>
          </div>

          {showScrollIndicator && (
            <div className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
                style={{ animation: 'heroScrollBounce 1.8s ease-in-out infinite alternate' }}
              >
                <path
                  d="M6 9l6 6 6-6"
                  stroke="#C9A84C"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          )}
        </section>

        <section ref={eventsRef} className="relative z-[2] px-4 py-20 sm:px-8 lg:px-[60px]">
          <p className="text-[11px] uppercase tracking-[0.2em] text-[#C9A84C]">COMPETE</p>
          <h2 className="mt-2 font-display text-[40px] font-semibold text-[#F5F0E8]">Choose Your Stage</h2>
          <p className="mt-2 text-[14px] text-[rgba(245,240,232,0.35)]">
            Select up to 2 events · Rules shown before selection
          </p>
          <div
            className="my-7 w-full"
            style={{
              height: '0.5px',
              opacity: 0.25,
              background: 'linear-gradient(to right, #B22234, #C9A84C, #1A2B5F)',
            }}
          />

          <motion.div
            initial="hidden"
            animate={eventsInView ? 'show' : 'hidden'}
            variants={{
              hidden: {},
              show: { transition: { staggerChildren: 0.08 } },
            }}
            className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4"
          >
            {EVENTS.map((event) => (
              <motion.button
                key={event.id}
                type="button"
                onClick={() => navigate('/participant/events')}
                variants={{ hidden: { y: 30, opacity: 0 }, show: { y: 0, opacity: 1 } }}
                transition={{ duration: 0.45, ease: 'easeOut' }}
                className="rounded-xl px-5 py-6 text-left transition duration-200 hover:-translate-y-[3px] hover:bg-[rgba(201,168,76,0.05)]"
                style={{
                  background: 'rgba(255,255,255,0.025)',
                  border: '0.5px solid rgba(245,240,232,0.08)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(201,168,76,0.35)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(245,240,232,0.08)'
                }}
              >
                <div className="mb-3.5 text-[28px]">{event.icon}</div>
                <h3 className="font-display text-[18px] text-[#F5F0E8]">{event.name}</h3>
                <p className="mt-1 text-[12px] text-[rgba(201,168,76,0.5)]">{event.category}</p>
              </motion.button>
            ))}
          </motion.div>
        </section>
      </main>

      <div
        className="relative z-[2] h-[3px] w-full"
        style={{
          opacity: 0.4,
          background:
            'linear-gradient(to right, transparent, #B22234 20%, #C9A84C 50%, #1A2B5F 80%, transparent)',
        }}
      />

      <footer
        className="relative z-[2] flex flex-col gap-2 border-t px-4 py-5 text-[11px] sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-[60px]"
        style={{ borderTopColor: 'rgba(245,240,232,0.06)', borderTopWidth: '0.5px' }}
      >
        <span className="text-[rgba(245,240,232,0.2)]">© 2026 Izee College · Cultural Committee</span>
        <span className="text-[rgba(201,168,76,0.3)]">culturals.izeecollege.edu</span>
      </footer>

      <style>{`
        @keyframes heroScrollBounce {
          0% {
            transform: translateY(0px);
          }
          100% {
            transform: translateY(10px);
          }
        }
      `}</style>
    </div>
  )
}
