import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import confetti from 'canvas-confetti'

const DISPLAY_FONT = { fontFamily: 'Nevarademo, serif' }
const GOLD = '#BEA35D'
const CRIMSON = '#9E2636'
const BASE = '#0C0D10'

const CATEGORY_MAP = {
  performance: 'Performance Based',
  expression: 'Expression Based',
  creative: 'Creative Talents',
  wildcard: 'Wildcard'
}

export default function WinnerReveal() {
  const [votingConfig, setVotingConfig] = useState(null)
  const [results, setResults] = useState(null)
  const [revealTriggered, setRevealTriggered] = useState(false)
  const [currentStage, setCurrentStage] = useState(0) // 0: waiting, 1: calculating, 2: revealing
  const [revealedCategories, setRevealedCategories] = useState(new Set())
  const [showFinalGrid, setShowFinalGrid] = useState(false)

  useEffect(() => {
    const poll = async () => {
      try {
        const configRes = await fetch('/api/voting/config')
        const configData = await configRes.json()
        if (configData.success) {
          setVotingConfig(configData.data)
          if (configData.data.reveal_triggered && !revealTriggered) {
            setRevealTriggered(true)
            setCurrentStage(1)
          }
        }

        const resultsRes = await fetch('/api/voting/results')
        const resultsData = await resultsRes.json()
        if (resultsData.success) {
          setResults(resultsData.data)
        }
      } catch (err) {
        console.error('Polling error:', err)
      }
    }

    const interval = setInterval(poll, 3000)
    poll()
    return () => clearInterval(interval)
  }, [revealTriggered])

  useEffect(() => {
    if (currentStage === 1) {
      const timer = setTimeout(() => {
        setCurrentStage(2)
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [currentStage])

  useEffect(() => {
    if (currentStage === 2 && results && results.categories) {
      const timers = results.categories.map((category, index) => {
        return setTimeout(() => {
          setRevealedCategories((prev) => new Set(prev).add(category.category_id))
        }, index * 500)
      })
      return () => timers.forEach(clearTimeout)
    }
  }, [currentStage, results])

  const allCategoriesRevealed = useMemo(() => {
    if (!results?.categories?.length) return false
    return results.categories.every((category) => revealedCategories.has(category.category_id))
  }, [results, revealedCategories])

  useEffect(() => {
    if (!allCategoriesRevealed) {
      setShowFinalGrid(false)
      return
    }
    const timer = setTimeout(() => {
      setShowFinalGrid(true)
    }, 2200)
    return () => clearTimeout(timer)
  }, [allCategoriesRevealed])

  const revealNextCategory = (categoryId) => {
    setRevealedCategories((prev) => new Set(prev).add(categoryId))
  }

  if (!revealTriggered) {
    return (
      <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-[#0C0D10] px-4">
        <div className="pointer-events-none absolute inset-0">
          <div
            className="absolute -top-20 right-0 h-[520px] w-[520px]"
            style={{ background: 'radial-gradient(ellipse, rgba(190,163,93,0.09), transparent 60%)' }}
          />
          <div
            className="absolute bottom-0 left-[-120px] h-[520px] w-[520px]"
            style={{ background: 'radial-gradient(ellipse, rgba(158,38,54,0.09), transparent 60%)' }}
          />
        </div>

        <motion.div
          className="relative z-10 text-center"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="mx-auto mb-8 flex h-28 w-28 items-center justify-center rounded-full border border-[rgba(190,163,93,0.45)] gold-pulse" />
          <h1 className="text-5xl text-[#BEA35D] md:text-7xl" style={DISPLAY_FONT}>IZee Got Talent</h1>
          <p className="mt-6 text-base text-white/55 md:text-lg">Results will be revealed soon...</p>
        </motion.div>

        <style>{`
          @keyframes goldPulse {
            0% { box-shadow: 0 0 20px rgba(190,163,93,0.3); }
            50% { box-shadow: 0 0 60px rgba(190,163,93,0.7); }
            100% { box-shadow: 0 0 20px rgba(190,163,93,0.3); }
          }
          .gold-pulse {
            animation: goldPulse 2.4s ease-in-out infinite;
          }
        `}</style>
      </div>
    )
  }

  if (currentStage === 1) {
    return (
      <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-[#0C0D10]">
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(circle at 50% 50%, rgba(190,163,93,0.12), transparent 62%)' }}
        />
        <motion.h1
          className="relative z-10 text-center text-4xl tracking-[0.2em] text-[#BEA35D] md:text-6xl"
          style={DISPLAY_FONT}
          animate={{ opacity: [0.45, 1, 0.45] }}
          transition={{ duration: 1.8, repeat: Infinity }}
        >
          CALCULATING RESULTS
        </motion.h1>
      </div>
    )
  }

  if (!results || !results.categories) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0C0D10] text-white/60">
        Loading results...
      </div>
    )
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#0C0D10] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(circle at 50% 20%, rgba(190,163,93,0.08), transparent 60%)' }}
        />
      </div>

      <motion.div
        className="pointer-events-none absolute inset-0 z-0 bg-black"
        animate={{ opacity: currentStage === 2 ? 0.7 : 0 }}
        transition={{ duration: 1.2 }}
      />

      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 py-12">
        <motion.h1
          className="mb-14 text-center text-5xl text-[#BEA35D] md:text-6xl"
          style={DISPLAY_FONT}
          initial={{ opacity: 0, y: -18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          Winners Reveal
        </motion.h1>

        <div className="space-y-14">
          {results.categories.map((categoryResult, categoryIndex) => {
            const categoryId = categoryResult.category_id
            const isRevealed = revealedCategories.has(categoryId)
            const awardName = CATEGORY_MAP[categoryId] || categoryId.toUpperCase()
            const topPerformers = (categoryResult.performances || []).slice(0, 3)

            return (
              <section key={categoryId} className="space-y-6">
                <motion.div
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: categoryIndex * 0.15, duration: 0.45 }}
                  className="text-center"
                >
                  <h2 className="text-xs uppercase tracking-[0.3em] text-[#BEA35D]">{awardName}</h2>
                  <div className="mx-auto mt-3 h-px w-32 bg-[rgba(190,163,93,0.3)]" />
                </motion.div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                  {topPerformers.map((performer, performerIndex) => (
                    <CategoryRevealer
                      key={performer.id}
                      performer={{
                        performance_id: performer.id,
                        performer_name: performer.performer_name,
                        performance_title: performer.title,
                        final_score: performer.final_score,
                        award_name: awardName
                      }}
                      isWinner={performerIndex === 0}
                      isRevealed={isRevealed}
                      categoryId={categoryId}
                      categoryIndex={categoryIndex}
                      performerIndex={performerIndex}
                      onReveal={revealNextCategory}
                    />
                  ))}
                </div>
              </section>
            )
          })}
        </div>

        {showFinalGrid && (
          <motion.section
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mt-20"
          >
            <h2 className="mb-8 text-center text-4xl text-[#BEA35D]" style={DISPLAY_FONT}>
              IZee Got Talent 2026
            </h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {results.categories.map((category) => {
                const winner = (category.performances || [])[0]
                if (!winner) return null
                return (
                  <div
                    key={category.category_id}
                    className="shimmer-border rounded-2xl border p-6"
                    style={{
                      background: 'rgba(18,19,23,0.8)',
                      backdropFilter: 'blur(16px)',
                      borderColor: 'rgba(190,163,93,0.25)'
                    }}
                  >
                    <p className="text-xs uppercase tracking-[0.24em] text-[#BEA35D]/80">
                      {CATEGORY_MAP[category.category_id] || category.category_id}
                    </p>
                    <h3 className="mt-3 text-3xl text-white" style={DISPLAY_FONT}>{winner.performer_name}</h3>
                    <p className="mt-1 text-sm text-white/60">{winner.title}</p>
                    <p className="mt-6 text-sm uppercase tracking-[0.22em] text-[#BEA35D]">Final Score</p>
                    <p className="text-3xl text-[#BEA35D]" style={DISPLAY_FONT}>
                      {winner.final_score?.toFixed(2) || 'N/A'}
                    </p>
                  </div>
                )
              })}
            </div>
          </motion.section>
        )}
      </div>

      <style>{`
        @keyframes shimmer {
          0% { box-shadow: 0 0 0 1px rgba(190,163,93,0.2), 0 0 10px rgba(190,163,93,0.12); }
          50% { box-shadow: 0 0 0 1px rgba(190,163,93,0.45), 0 0 28px rgba(190,163,93,0.32); }
          100% { box-shadow: 0 0 0 1px rgba(190,163,93,0.2), 0 0 10px rgba(190,163,93,0.12); }
        }
        .shimmer-border {
          animation: shimmer 3.8s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}

function CategoryRevealer({
  performer,
  isWinner,
  isRevealed,
  categoryId,
  categoryIndex,
  performerIndex,
  onReveal
}) {
  const [shouldReveal, setShouldReveal] = useState(false)
  const [confettiDone, setConfettiDone] = useState(false)

  useEffect(() => {
    if (isRevealed && isWinner && !shouldReveal) {
      const timer = setTimeout(() => {
        setShouldReveal(true)
        onReveal(categoryId)
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [isRevealed, isWinner, shouldReveal, categoryId, onReveal])

  const winnerGlow = isWinner && shouldReveal

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: isRevealed ? 1 : 0, y: isRevealed ? 0 : 30 }}
      transition={{ delay: categoryIndex * 0.1 + performerIndex * 0.15, duration: 0.45 }}
      className="relative"
    >
      <motion.div
        className="rounded-2xl border p-6"
        style={{
          background: 'rgba(18,19,23,0.8)',
          backdropFilter: 'blur(16px)',
          borderColor: winnerGlow ? '#BEA35D' : 'rgba(190,163,93,0.2)'
        }}
        animate={winnerGlow ? {
          scale: 1.06,
          boxShadow: '0 0 0 1px #BEA35D, 0 0 40px rgba(190,163,93,0.5)'
        } : {
          scale: 1,
          boxShadow: '0 0 0 0px rgba(190,163,93,0)'
        }}
        transition={{ type: 'spring', stiffness: 180, damping: 16 }}
      >
        <motion.p
          className="text-[11px] uppercase tracking-[0.24em] text-[#BEA35D]/80"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: isRevealed ? 1 : 0, y: isRevealed ? 0 : 8 }}
          transition={{ delay: isWinner && shouldReveal ? 0 : 0.1, duration: 0.4 }}
        >
          {performer.award_name}
        </motion.p>

        <motion.h3
          className="mt-3 text-3xl text-white"
          style={DISPLAY_FONT}
          initial={{ opacity: 0.8, filter: 'blur(8px)' }}
          animate={{
            opacity: isRevealed ? 1 : 0.8,
            filter: isWinner && shouldReveal ? 'blur(0px)' : 'blur(8px)'
          }}
          transition={{ delay: isWinner && shouldReveal ? 0.6 : 0.1, duration: 0.7 }}
          onAnimationComplete={() => {
            if (isWinner && shouldReveal && !confettiDone) {
              fireConfetti()
              setConfettiDone(true)
            }
          }}
        >
          {performer.performer_name}
        </motion.h3>

        <p className="mt-2 text-sm text-white/55">{performer.performance_title}</p>

        <div className="mt-6 border-t border-[rgba(190,163,93,0.2)] pt-4">
          <p className="text-[11px] uppercase tracking-[0.2em] text-[#BEA35D]/80">Final Score</p>
          <p className="text-3xl text-[#BEA35D]" style={DISPLAY_FONT}>
            {performer.final_score?.toFixed(2) || 'N/A'}
          </p>
        </div>
      </motion.div>
    </motion.div>
  )
}

function fireConfetti() {
  const defaults = {
    spread: 360,
    ticks: 72,
    gravity: 0,
    decay: 0.95,
    startVelocity: 48,
    colors: ['#BEA35D', '#9E2636', '#ffffff', '#FFD700'],
    shapes: ['circle', 'square']
  }

  confetti({
    ...defaults,
    particleCount: 55,
    angle: 60,
    origin: { x: 0.2, y: 0.55 }
  })

  confetti({
    ...defaults,
    particleCount: 55,
    angle: 120,
    origin: { x: 0.8, y: 0.55 }
  })

  confetti({
    ...defaults,
    particleCount: 90,
    origin: { x: 0.5, y: 0.35 }
  })
}
