import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { EVENTS } from '../data/events.js'

// Color system
// - Crimson: #B22234 (IZee uniform/logo accent, use sparingly)
// - Crimson border: rgba(178,34,52,0.2)
// - Crimson glow: rgba(178,34,52,0.06)

const heroWords = ['Where', 'Talent', 'Meets', 'Legacy']

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
  const mouseRef = useRef({ x: 0, y: 0 })
  const rafRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined

    const ctx = canvas.getContext('2d')
    if (!ctx) return undefined

    const particleCount = 66
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
          borderBottomColor: 'rgba(190,163,93,0.1)',
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
            <span className="font-display text-[20px] font-semibold uppercase tracking-[0.12em] text-[#BEA35D]">
              CULTURALS
            </span>
          </div>

          <button
            type="button"
            onClick={() => navigate('/faculty/login')}
            className="rounded-full border px-5 py-2 text-[12px] font-medium uppercase tracking-[0.1em] text-[#BEA35D] transition hover:bg-[rgba(190,163,93,0.08)]"
            style={{
              borderColor: 'rgba(190,163,93,0.36)',
              borderWidth: '0.5px',
            }}
          >
            Faculty Login
          </button>
        </nav>
      </header>

      <main className="relative z-[2]">
        <section className="mx-auto flex min-h-screen w-full max-w-[1440px] items-center px-4 pb-16 pt-10 sm:px-8 lg:px-[60px]">
          <div className="grid w-full items-center gap-10 lg:grid-cols-[1.5fr_1fr]">
            <div>
              <p className="mb-6 text-[14px] uppercase tracking-[0.22em] text-[#BEA35D] font-display">
                ANNUAL COLLEGE CULTURAL FEST 2026
              </p>

              <h1 className="font-display font-bold leading-[1.05] text-[#EEE6D8] text-[clamp(26px,4vw,56px)] whitespace-nowrap">
                {heroWords.map((word, index) => (
                  <motion.span
                    key={word}
                    initial={{ y: 40, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.7, delay: index * 0.12, ease: 'easeOut' }}
                    className={`mr-[0.2em] inline-block ${word === 'Legacy' ? 'italic text-[#BEA35D]' : ''}`}
                  >
                    {word}
                  </motion.span>
                ))}
              </h1>

              <motion.p
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.6, ease: 'easeOut' }}
                className="mt-5 max-w-[560px] font-display text-[18px] italic text-[rgba(238,230,216,0.62)]"
              >
                Step into a night of rhythm, theatre, style, and unforgettable campus energy.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 0.6, width: 48 }}
                transition={{ duration: 0.5, delay: 0.72, ease: 'easeOut' }}
                className="my-7 h-px bg-[#BEA35D]"
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
                    className="rounded-full border px-4 py-2 text-[12px] text-[rgba(238,230,216,0.72)] font-display"
                    style={{ borderColor: 'rgba(238,230,216,0.2)', borderWidth: '0.5px' }}
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
                className="rounded-xl p-7 transition duration-200 backdrop-blur-[2px] hover:bg-[rgba(190,163,93,0.07)]"
                style={{
                  background: 'rgba(190,163,93,0.045)',
                  border: '0.5px solid rgba(190,163,93,0.24)',
                }}
                whileHover={{ y: -2, borderColor: 'rgba(190,163,93,0.42)' }}
              >
                <div className="mb-5 flex items-start justify-between">
                  <QrGlyph />
                  <span
                    className="rounded px-2.5 py-[3px] text-[9px] uppercase tracking-[0.12em] text-[#BEA35D]"
                    style={{
                      background: 'rgba(190,163,93,0.1)',
                      border: '0.5px solid rgba(190,163,93,0.34)',
                    }}
                  >
                    COMPETE
                  </span>
                </div>

                <div className="mb-2 flex items-center gap-2">
                  <motion.span
                    className="h-1.5 w-1.5 rounded-full bg-[#BEA35D]"
                    animate={{ opacity: [0.35, 1, 0.35] }}
                    transition={{ repeat: Infinity, duration: 2.4, ease: 'easeInOut' }}
                  />
                  <h3 className="font-display text-[20px] text-[#EEE6D8]">Participants Registration</h3>
                </div>

                <p className="text-[13px] leading-[1.6] text-[rgba(238,230,216,0.58)]">
                  Pick your stage, lock up to two events, and receive your competition entry QR after faculty approval.
                </p>

                <button
                  type="button"
                  onClick={() => navigate('/participant/events')}
                  className="mt-4 text-[13px] text-[#BEA35D] transition hover:underline"
                >
                  Register to Compete →
                </button>
              </motion.div>

              <motion.div
                initial={{ x: 60, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.55, ease: 'easeOut', delay: 0.34 }}
                className="rounded-xl p-7 transition duration-200 backdrop-blur-[2px]"
                style={{
                  background: 'rgba(158,38,54,0.045)',
                  border: '0.5px solid rgba(158,38,54,0.18)',
                }}
                whileHover={{ y: -2, borderColor: 'rgba(158,38,54,0.32)', backgroundColor: 'rgba(158,38,54,0.08)' }}
              >
                <div className="mb-5 flex items-start justify-between">
                  <QrGlyph />
                  <span
                    className="rounded px-2.5 py-[3px] text-[9px] uppercase tracking-[0.12em] text-[#B22234]"
                    style={{
                      background: 'rgba(158,38,54,0.08)',
                      border: '0.5px solid rgba(158,38,54,0.18)',
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
                  <h3 className="font-display text-[20px] text-[#EEE6D8]">Students Registration</h3>
                </div>

                <p className="text-[13px] leading-[1.6] text-[rgba(238,230,216,0.58)]">
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
                <p className="mb-3 text-[9px] uppercase tracking-[0.2em] text-[rgba(238,230,216,0.34)]">
                  EVENTS THIS YEAR
                </p>
                <div className="flex flex-wrap gap-2">
                  {EVENTS.map((event) => (
                    <motion.span
                      key={event.id}
                      variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }}
                      transition={{ duration: 0.4, ease: 'easeOut' }}
                      className="rounded-full border bg-transparent px-3.5 py-1 text-[11px] text-[rgba(238,230,216,0.5)] font-display"
                      style={{ borderColor: 'rgba(238,230,216,0.18)', borderWidth: '0.5px' }}
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
        className="relative z-[2] h-[3px] w-full"
        style={{
          opacity: 0.3,
          background:
            'linear-gradient(to right, transparent, #7C1F2B 20%, #BEA35D 50%, #1A2B5F 80%, transparent)',
        }}
      />

      <footer
        className="relative z-[2] flex flex-col gap-2 border-t px-4 py-5 text-[11px] sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-[60px]"
        style={{ borderTopColor: 'rgba(238,230,216,0.08)', borderTopWidth: '0.5px' }}
      >
        <span className="text-[rgba(238,230,216,0.3)]">© 2026 Izee College · Cultural Committee</span>
      </footer>

    </div>
  )
}
