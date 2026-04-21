import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { apiFetch } from '../utils/api'

const DISPLAY_FONT = { fontFamily: 'Nevarademo, serif' }

const CATEGORY_MAP = {
  performance: 'Performance Based',
  expression: 'Expression Based',
  creative: 'Creative Talents',
  wildcard: 'Wildcard'
}

export default function JudgePortal() {
  const navigate = useNavigate()
  const [judgeData, setJudgeData] = useState({
    name: sessionStorage.getItem('voter_name') || 'Judge',
    role: sessionStorage.getItem('voter_role') || 'judge'
  })
  const [performances, setPerformances] = useState([])
  const [votingConfig, setVotingConfig] = useState(null)
  const [scores, setScores] = useState({})
  const [submittedScores, setSubmittedScores] = useState(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(null)

  useEffect(() => {
    const token = sessionStorage.getItem('VOTER_TOKEN')
    if (!token) {
      navigate('/voting/login')
      return
    }

    loadData()
  }, [])

  const loadData = async () => {
    try {
      const token = sessionStorage.getItem('VOTER_TOKEN')

      // Fetch config
      const configRes = await apiFetch('/api/voting/config', {
        headers: { Authorization: `Bearer ${token}` }
      })
      const configData = await configRes.json()
      if (configData.success) {
        setVotingConfig(configData.data)
      }

      // Fetch performances
      const perfRes = await apiFetch('/api/voting/performances', {
        headers: { Authorization: `Bearer ${token}` }
      })
      const perfData = await perfRes.json()
      if (perfData.success) {
        setPerformances(perfData.data || [])
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleScoreChange = (performanceId, value) => {
    setScores({
      ...scores,
      [performanceId]: Math.min(100, Math.max(0, parseInt(value) || 0))
    })
  }

  const handleSubmitScore = async (performanceId) => {
    const token = sessionStorage.getItem('VOTER_TOKEN')
    const score = scores[performanceId]

    if (score === undefined) {
      setError('Please select a score')
      return
    }

    setSubmitting(performanceId)

    try {
      const response = await apiFetch('/api/voting/judge/score', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          performance_id: performanceId,
          score,
          idempotency_key: crypto.randomUUID()
        })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setSubmittedScores(new Set([...submittedScores, performanceId]))
      } else {
        setError(data.message || 'Failed to submit score')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(null)
    }
  }

  const handleLogout = () => {
    sessionStorage.removeItem('VOTER_TOKEN')
    sessionStorage.removeItem('voter_role')
    sessionStorage.removeItem('voter_name')
    navigate('/voting/login')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-base text-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-gold border-t-transparent mb-4" />
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  const groupedByCategory = performances.reduce((acc, perf) => {
    const cat = perf.category_id || 'wildcard'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(perf)
    return acc
  }, {})

  const isVotingOpen = votingConfig?.voting_open ?? false

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0C0D10] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute -top-24 right-0 h-[460px] w-[460px]"
          style={{ background: 'radial-gradient(ellipse, rgba(190,163,93,0.08), transparent 60%)' }}
        />
        <div
          className="absolute bottom-0 left-[-120px] h-[420px] w-[420px]"
          style={{ background: 'radial-gradient(ellipse, rgba(158,38,54,0.08), transparent 60%)' }}
        />
      </div>

      <header className="sticky top-0 z-40 border-b border-[rgba(190,163,93,0.15)] bg-[#121317]/95 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <h1 className="text-3xl text-[#BEA35D]" style={DISPLAY_FONT}>Judge Portal</h1>
          <div className="flex items-center gap-3">
            <p className="text-sm text-white/70">{judgeData.name}</p>
            <button
              onClick={handleLogout}
              className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white transition hover:border-[rgba(190,163,93,0.4)] hover:text-[#BEA35D]"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-6xl px-6 py-8">
        {!isVotingOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(12,13,16,0.95)] px-6">
            <div
              className="w-full max-w-lg rounded-2xl border p-10 text-center"
              style={{
                background: 'rgba(18,19,23,0.8)',
                borderColor: 'rgba(190,163,93,0.2)',
                backdropFilter: 'blur(16px)'
              }}
            >
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-[rgba(190,163,93,0.35)] text-2xl text-[#BEA35D]">
                🔒
              </div>
              <h2 className="text-3xl text-[#BEA35D]" style={DISPLAY_FONT}>Voting is not open</h2>
              <p className="mt-3 text-sm text-white/60">Please wait for the administrator to open voting</p>
            </div>
          </div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-6 rounded-xl border border-[#9E2636]/60 bg-[#9E2636]/15 p-4 text-sm text-[#d86b79]"
          >
            {error}
          </motion.div>
        )}

        <div className="space-y-12">
          {Object.entries(groupedByCategory).map(([categoryId, perfs]) => (
            <motion.section
              key={categoryId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="space-y-6"
            >
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#BEA35D]" />
                  <h2 className="text-xs uppercase tracking-[0.28em] text-[#BEA35D]">
                    {CATEGORY_MAP[categoryId] || categoryId}
                  </h2>
                </div>
                <div className="h-px w-full bg-[rgba(190,163,93,0.22)]" />
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {perfs.map((perf) => {
                  const isSubmitted = submittedScores.has(perf.id)
                  const currentScore = scores[perf.id] ?? 0

                  return (
                    <motion.div
                      key={perf.id}
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="relative overflow-hidden rounded-2xl border p-6"
                      style={{
                        background: 'rgba(18,19,23,0.8)',
                        backdropFilter: 'blur(16px)',
                        borderColor: isSubmitted ? 'rgba(34,197,94,0.4)' : 'rgba(190,163,93,0.2)'
                      }}
                    >
                      <span className="absolute right-4 top-4 rounded-full border border-[rgba(190,163,93,0.35)] bg-[rgba(190,163,93,0.15)] px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-[#BEA35D]">
                        {CATEGORY_MAP[categoryId] || categoryId}
                      </span>

                      <div className="mb-6 pr-24">
                        <p className="text-[13px] uppercase tracking-[0.15em] text-[#BEA35D]/70">{perf.event_name}</p>
                        <h3 className="mt-2 text-[22px] leading-tight text-white" style={DISPLAY_FONT}>{perf.performer_name}</h3>
                        <p className="mt-1 text-sm text-white/55">{perf.title}</p>
                        {perf.is_withdrawn && (
                          <span className="mt-3 inline-flex rounded-full border border-[#9E2636]/50 bg-[#9E2636]/15 px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-[#d86b79]">
                            Withdrawn
                          </span>
                        )}
                      </div>

                      {!isSubmitted && (
                        <div className="mb-5">
                          <div className="mb-2 flex items-end justify-between">
                            <span className="text-[11px] uppercase tracking-[0.32em] text-[#BEA35D]">Score</span>
                            <span className="text-5xl leading-none text-[#BEA35D]" style={DISPLAY_FONT}>{currentScore}</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={currentScore}
                            onChange={(e) => handleScoreChange(perf.id, e.target.value)}
                            className="award-slider h-2 w-full cursor-pointer appearance-none rounded-full"
                            disabled={submitting === perf.id}
                          />
                          <div className="mt-1 flex justify-between text-[11px] text-white/40">
                            <span>0</span>
                            <span>100</span>
                          </div>
                        </div>
                      )}

                      {!isSubmitted && (
                        <button
                          onClick={() => handleSubmitScore(perf.id)}
                          disabled={submitting === perf.id || isVotingOpen === false}
                          className="w-full rounded-lg py-3 text-sm font-bold uppercase tracking-[0.16em] text-[#0C0D10] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                          style={{
                            background: 'linear-gradient(135deg, #BEA35D, #8B6914)',
                            boxShadow: '0 0 20px rgba(190,163,93,0.2)'
                          }}
                        >
                          {submitting === perf.id ? 'Submitting...' : 'Submit Score'}
                        </button>
                      )}

                      {isSubmitted && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.94 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="absolute inset-0 flex items-center justify-center rounded-2xl border border-green-400/45 bg-[rgba(12,26,16,0.82)] backdrop-blur-sm"
                        >
                          <motion.div
                            initial={{ scale: 0.6, rotate: -18 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ type: 'spring', stiffness: 260, damping: 16 }}
                            className="text-center text-green-300"
                          >
                            <div className="mb-2 text-3xl">✓</div>
                            <p className="text-sm font-semibold uppercase tracking-[0.14em]">Score Submitted</p>
                          </motion.div>
                        </motion.div>
                      )}
                    </motion.div>
                  )
                })}
              </div>
            </motion.section>
          ))}
        </div>

        {performances.length === 0 && (
          <div className="py-14 text-center text-white/55">No performances to judge</div>
        )}
      </main>

      <style>{`
        .award-slider {
          background: rgba(190, 163, 93, 0.2);
        }
        .award-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 999px;
          background: #BEA35D;
          border: 2px solid #0C0D10;
          box-shadow: 0 0 10px rgba(190, 163, 93, 0.5);
          cursor: pointer;
        }
        .award-slider::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 999px;
          background: #BEA35D;
          border: 2px solid #0C0D10;
          box-shadow: 0 0 10px rgba(190, 163, 93, 0.5);
          cursor: pointer;
        }
      `}</style>
    </div>
  )
}
