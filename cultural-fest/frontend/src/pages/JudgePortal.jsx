import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'

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
      const configRes = await fetch('/api/voting/config', {
        headers: { Authorization: `Bearer ${token}` }
      })
      const configData = await configRes.json()
      if (configData.success) {
        setVotingConfig(configData.data)
      }

      // Fetch performances
      const perfRes = await fetch('/api/voting/performances', {
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
      const response = await fetch('/api/voting/judge/score', {
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
    <div className="min-h-screen bg-base text-white">
      {/* Header */}
      <div className="border-b border-gold/20 bg-surface sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold" style={DISPLAY_FONT}>
              Judge Portal
            </h1>
            <p className="text-gold text-sm mt-1">{judgeData.name}</p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-crimson hover:bg-crimson/90 rounded text-white text-sm font-medium transition"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Voting Closed Overlay */}
        {!isVotingOpen && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-surface border border-gold/20 rounded-lg p-8 text-center">
              <h2 className="text-2xl font-bold mb-2" style={DISPLAY_FONT}>
                Voting Not Open
              </h2>
              <p className="text-white/60">Voting is not open yet. Please check back later.</p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-crimson/20 border border-crimson rounded p-4 text-crimson mb-6"
          >
            {error}
          </motion.div>
        )}

        {/* Categories */}
        <div className="space-y-12">
          {Object.entries(groupedByCategory).map(([categoryId, perfs]) => (
            <motion.div
              key={categoryId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <h2 className="text-2xl font-bold mb-6 text-gold">
                {CATEGORY_MAP[categoryId] || categoryId}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {perfs.map((perf) => {
                  const isSubmitted = submittedScores.has(perf.id)
                  const currentScore = scores[perf.id] ?? 0

                  return (
                    <motion.div
                      key={perf.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className={`border rounded-lg p-6 transition ${
                        isSubmitted
                          ? 'border-green-500/50 bg-green-500/5'
                          : 'border-gold/20 bg-surface/50 hover:border-gold/40'
                      }`}
                    >
                      {/* Performance Info */}
                      <div className="mb-4">
                        <h3 className="text-lg font-semibold">{perf.title}</h3>
                        <p className="text-white/60 text-sm">{perf.performer_name}</p>
                        <div className="flex gap-2 mt-2">
                          <span className="text-xs px-2 py-1 bg-gold/10 text-gold rounded">
                            {perf.event_name}
                          </span>
                          {perf.is_withdrawn && (
                            <span className="text-xs px-2 py-1 bg-crimson/10 text-crimson rounded">
                              Withdrawn
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Submitted Badge */}
                      {isSubmitted && (
                        <div className="flex items-center gap-2 text-green-400 mb-4">
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" />
                          </svg>
                          <span className="text-sm font-medium">Score Submitted</span>
                        </div>
                      )}

                      {/* Score Input */}
                      {!isSubmitted && (
                        <div className="mb-4">
                          <div className="flex justify-between items-center mb-2">
                            <label className="text-sm font-medium">Score</label>
                            <span className="text-gold text-lg font-semibold">{currentScore}</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={currentScore}
                            onChange={(e) => handleScoreChange(perf.id, e.target.value)}
                            className="w-full h-2 bg-gold/20 rounded-lg appearance-none cursor-pointer accent-gold"
                            disabled={submitting === perf.id}
                          />
                          <div className="flex justify-between text-xs text-white/40 mt-1">
                            <span>0</span>
                            <span>100</span>
                          </div>
                        </div>
                      )}

                      {/* Submit Button */}
                      {!isSubmitted && (
                        <button
                          onClick={() => handleSubmitScore(perf.id)}
                          disabled={submitting === perf.id || isVotingOpen === false}
                          className="w-full bg-gold text-base font-semibold py-2 rounded hover:bg-gold/90 disabled:bg-gold/50 disabled:cursor-not-allowed transition"
                        >
                          {submitting === perf.id ? 'Submitting...' : 'Submit Score'}
                        </button>
                      )}
                    </motion.div>
                  )
                })}
              </div>
            </motion.div>
          ))}
        </div>

        {performances.length === 0 && (
          <div className="text-center py-12">
            <p className="text-white/60">No performances to judge</p>
          </div>
        )}
      </div>
    </div>
  )
}
