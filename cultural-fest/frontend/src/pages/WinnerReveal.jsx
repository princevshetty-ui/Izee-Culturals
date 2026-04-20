import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import confetti from 'canvas-confetti'

const DISPLAY_FONT = { fontFamily: 'Nevarademo, serif' }
const GOLD = '#BEA35D'
const CRIMSON = '#9E2636'
const SURFACE = '#121317'
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

  // Poll config and results every 3 seconds
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
    poll() // Immediate first poll
    return () => clearInterval(interval)
  }, [revealTriggered])

  // Stage 1: Calculating Results (2 seconds)
  useEffect(() => {
    if (currentStage === 1) {
      const timer = setTimeout(() => {
        setCurrentStage(2)
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [currentStage])

  // Auto-reveal categories with staggered timing (0.5s between each)
  useEffect(() => {
    if (currentStage === 2 && results && results.categories) {
      const timers = results.categories.map((category, index) => {
        return setTimeout(() => {
          setRevealedCategories((prev) => new Set(prev).add(category.category_id))
        }, index * 500) // 0.5s stagger between categories
      })
      return () => timers.forEach(clearTimeout)
    }
  }, [currentStage, results])

  // Handle category reveal timing (2 second pause between categories)
  const getIsRevealed = (categoryId) => revealedCategories.has(categoryId)

  const revealNextCategory = (categoryId) => {
    setRevealedCategories((prev) => new Set(prev).add(categoryId))
  }

  // Waiting State (reveal_triggered = false)
  if (!revealTriggered) {
    return (
      <div
        className="relative w-full min-h-screen flex flex-col items-center justify-center overflow-hidden"
        style={{ backgroundColor: BASE }}
      >
        {/* Animated background */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background: `radial-gradient(circle at 50% 50%, ${GOLD} 0%, transparent 70%)`
          }}
        />

        <motion.div
          className="relative z-10 text-center"
          initial={{ opacity: 0, y: -40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
        >
          <h1
            className="text-6xl md:text-7xl font-bold mb-8 tracking-widest uppercase"
            style={{ ...DISPLAY_FONT, color: GOLD }}
          >
            IZee Got Talent
          </h1>

          {/* Animated pulse circle */}
          <div className="flex justify-center mb-12">
            <motion.div
              className="w-32 h-32 rounded-full border-2"
              style={{ borderColor: GOLD }}
              animate={{
                boxShadow: [
                  `0 0 20px ${GOLD}40`,
                  `0 0 60px ${GOLD}80`,
                  `0 0 20px ${GOLD}40`
                ]
              }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </div>

          <motion.p
            className="text-2xl md:text-3xl tracking-widest uppercase"
            style={{ color: 'rgba(245, 240, 232, 0.6)' }}
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            Results coming soon...
          </motion.p>
        </motion.div>
      </div>
    )
  }

  // Stage 1: Calculating Results
  if (currentStage === 1) {
    return (
      <div
        className="relative w-full min-h-screen flex flex-col items-center justify-center overflow-hidden"
        style={{ backgroundColor: BASE }}
      >
        <div
          className="absolute inset-0 opacity-20"
          style={{
            background: `radial-gradient(circle at 50% 50%, ${GOLD} 0%, transparent 70%)`
          }}
        />

        <motion.h1
          className="relative z-10 text-5xl md:text-6xl font-bold tracking-widest uppercase"
          style={{ ...DISPLAY_FONT, color: GOLD }}
          animate={{ filter: ['blur(0px)', 'blur(3px)', 'blur(0px)'] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          Calculating Results...
        </motion.h1>
      </div>
    )
  }

  // Stage 2 & 3: Revealing Winners
  if (!results || !results.categories) {
    return (
      <div
        className="relative w-full min-h-screen flex items-center justify-center"
        style={{ backgroundColor: BASE }}
      >
        <motion.p
          className="text-2xl"
          style={{ color: 'rgba(245, 240, 232, 0.5)' }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          Loading results...
        </motion.p>
      </div>
    )
  }

  return (
    <div
      className="relative w-full min-h-screen"
      style={{ backgroundColor: BASE }}
    >
      {/* Background gradient */}
      <div
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          background: `radial-gradient(circle at 50% 30%, ${GOLD} 0%, transparent 60%)`
        }}
      />

      <div className="relative z-10 py-12 px-4 max-w-7xl mx-auto">
        {/* Title */}
        <motion.h1
          className="text-6xl md:text-7xl font-bold mb-16 text-center tracking-widest uppercase"
          style={{ ...DISPLAY_FONT, color: GOLD }}
          initial={{ opacity: 0, y: -40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          Winners Revealed
        </motion.h1>

        {/* Categories */}
        <div className="space-y-24">
          {results.categories.map((categoryResult, categoryIndex) => {
            const categoryId = categoryResult.category_id
            const isRevealed = revealedCategories.has(categoryId)
            const categoryName =
              CATEGORY_MAP[categoryId] || categoryId.toUpperCase()
            const topPerformers = (categoryResult.performances || []).slice(0, 3)

            return (
              <motion.div
                key={categoryId}
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: categoryIndex * 0.5, duration: 0.8 }}
              >
                {/* Category Name */}
                <motion.h2
                  className="text-4xl md:text-5xl font-bold mb-12 text-center tracking-wide uppercase"
                  style={{
                    ...DISPLAY_FONT,
                    color: isRevealed ? GOLD : 'rgba(245, 240, 232, 0.3)'
                  }}
                  animate={{
                    textShadow: isRevealed
                      ? [
                          `0 0 10px ${GOLD}40`,
                          `0 0 30px ${GOLD}80`,
                          `0 0 10px ${GOLD}40`
                        ]
                      : 'none'
                  }}
                  transition={{ duration: 1.5, repeat: isRevealed ? Infinity : 0 }}
                >
                  {categoryName}
                </motion.h2>

                {/* Top 3 Performers - Blurred before reveal */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  {topPerformers.map((performer, idx) => (
                    <CategoryRevealer
                      key={performer.id}
                      performer={{
                        performance_id: performer.id,
                        performer_name: performer.performer_name,
                        performance_title: performer.title,
                        final_score: performer.final_score
                      }}
                      isWinner={idx === 0}
                      isRevealed={isRevealed}
                      categoryId={categoryId}
                      categoryIndex={categoryIndex}
                      performerIndex={idx}
                      onReveal={revealNextCategory}
                    />
                  ))}
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
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

  // Trigger reveal animation 2 seconds after category appears
  useEffect(() => {
    if (isRevealed && performerIndex === 0 && !shouldReveal) {
      const timer = setTimeout(() => {
        setShouldReveal(true)
        onReveal(categoryId)
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [isRevealed, performerIndex, shouldReveal, categoryId, onReveal])

  // Fire confetti on winner reveal
  useEffect(() => {
    if (isWinner && shouldReveal) {
      fireConfetti()
    }
  }, [isWinner, shouldReveal])

  const isBlurred = isRevealed && !shouldReveal && performerIndex === 0
  const showWinnerGlow = isWinner && shouldReveal

  return (
    <motion.div
      className="relative"
      initial={{ opacity: 0, y: 20 }}
      animate={{
        opacity: isRevealed ? 1 : 0,
        y: isRevealed ? 0 : 20
      }}
      transition={{ delay: categoryIndex * 0.5 + 0.1, duration: 0.6 }}
    >
      {/* Glow background for winner */}
      {showWinnerGlow && (
        <motion.div
          className="absolute -inset-4 rounded-xl blur-xl"
          style={{
            background: `radial-gradient(circle, ${GOLD}40, transparent)`,
            boxShadow: `0 0 40px ${GOLD}60`
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
        />
      )}

      {/* Card */}
      <motion.div
        className="relative p-6 rounded-xl border backdrop-blur-sm"
        style={{
          borderColor: showWinnerGlow
            ? `${GOLD}80`
            : 'rgba(245, 240, 232, 0.1)',
          backgroundColor: 'rgba(18, 19, 23, 0.8)',
          boxShadow: showWinnerGlow
            ? `0 0 30px ${GOLD}80, inset 0 0 20px ${GOLD}20`
            : 'none'
        }}
        animate={{
          filter: isBlurred ? 'blur(8px)' : 'blur(0px)',
          scale: showWinnerGlow ? 1.05 : 1
        }}
        transition={{ duration: 0.8 }}
      >
        {/* Rank Badge */}
        <div className="absolute top-4 right-4">
          <motion.div
            className="w-10 h-10 rounded-full flex items-center justify-center font-bold"
            style={{
              backgroundColor: isWinner ? GOLD : CRIMSON,
              color: BASE
            }}
            initial={{ scale: 0, rotate: -180 }}
            animate={{
              scale: isRevealed ? 1 : 0,
              rotate: isRevealed ? 0 : -180
            }}
            transition={{
              delay: categoryIndex * 0.5 + (isWinner ? 1.8 : 0.3),
              duration: 0.6
            }}
          >
            #{performerIndex + 1}
          </motion.div>
        </div>

        {/* Winner Crown */}
        {isWinner && shouldReveal && (
          <motion.div
            className="text-4xl text-center mb-3"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            👑
          </motion.div>
        )}

        {/* Performer Info */}
        <motion.div
          className="text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: isRevealed ? 1 : 0 }}
          transition={{ delay: categoryIndex * 0.5 + 0.2, duration: 0.6 }}
        >
          <h3
            className="text-xl md:text-2xl font-bold mb-2 tracking-wide"
            style={{ color: GOLD }}
          >
            {performer.performer_name}
          </h3>
          <p style={{ color: 'rgba(245, 240, 232, 0.6)' }}>
            {performer.performance_title}
          </p>
        </motion.div>

        {/* Score - Only show for revealed winner */}
        {isWinner && shouldReveal && (
          <motion.div
            className="mt-4 pt-4 border-t text-center"
            style={{ borderColor: 'rgba(201, 168, 76, 0.2)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: categoryIndex * 0.5 + 1.8, duration: 0.6 }}
          >
            <p className="text-sm uppercase tracking-widest" style={{ color: GOLD }}>
              Final Score
            </p>
            <p
              className="text-3xl font-bold"
              style={{ color: GOLD }}
            >
              {performer.final_score?.toFixed(2) || 'N/A'}
            </p>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  )
}

function fireConfetti() {
  const defaults = {
    spread: 360,
    ticks: 60,
    gravity: 0,
    decay: 0.96,
    startVelocity: 45,
    colors: [GOLD, CRIMSON],
    shapes: ['circle', 'square']
  }

  // Left burst
  confetti({
    ...defaults,
    particleCount: 50,
    angle: 60,
    origin: { x: 0.2, y: 0.5 }
  })

  // Right burst
  confetti({
    ...defaults,
    particleCount: 50,
    angle: 120,
    origin: { x: 0.8, y: 0.5 }
  })

  // Center burst
  confetti({
    ...defaults,
    particleCount: 80,
    origin: { x: 0.5, y: 0.3 }
  })
}
