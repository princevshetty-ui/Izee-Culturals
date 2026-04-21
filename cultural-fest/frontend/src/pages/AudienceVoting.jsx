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

export default function AudienceVoting() {
  const navigate = useNavigate()
  const [voterData, setVoterData] = useState({
    name: sessionStorage.getItem('voter_name') || 'Voter',
    role: sessionStorage.getItem('voter_role') || 'student'
  })
  const [performances, setPerformances] = useState([])
  const [votingConfig, setVotingConfig] = useState(null)
  const [selectedPerfs, setSelectedPerfs] = useState({})
  const [submittedCategories, setSubmittedCategories] = useState(new Set())
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

  const handleSelectPerformance = (categoryId, performanceId) => {
    setSelectedPerfs({
      ...selectedPerfs,
      [categoryId]: performanceId
    })
  }

  const handleSubmitVote = async (categoryId) => {
    const token = sessionStorage.getItem('VOTER_TOKEN')
    const performanceId = selectedPerfs[categoryId]

    if (!performanceId) {
      setError('Please select a performance first')
      return
    }

    setSubmitting(categoryId)

    try {
      const response = await fetch('/api/voting/audience/vote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          performance_id: performanceId,
          idempotency_key: crypto.randomUUID()
        })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setSubmittedCategories(new Set([...submittedCategories, categoryId]))
      } else {
        setError(data.message || 'Failed to submit vote')
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
  const voterRoleBadge = voterData.role === 'staff' ? 'Staff' : 'Student'

  return (
    <div className="min-h-screen bg-base text-white">
      {/* Header */}
      <div className="border-b border-gold/20 bg-surface sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold" style={DISPLAY_FONT}>
              Voting Portal
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-white/80">{voterData.name}</p>
              <span className="text-xs px-2 py-1 bg-gold/20 text-gold rounded">
                {voterRoleBadge}
              </span>
            </div>
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
          {Object.entries(groupedByCategory).map(([categoryId, perfs]) => {
            const isVoted = submittedCategories.has(categoryId)
            const selectedPerfId = selectedPerfs[categoryId]

            return (
              <motion.div
                key={categoryId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gold">
                    {CATEGORY_MAP[categoryId] || categoryId}
                  </h2>
                  {isVoted && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="flex items-center gap-2 text-green-400"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" />
                      </svg>
                      <span className="font-medium">Vote Recorded</span>
                    </motion.div>
                  )}
                </div>

                {/* Performance Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                  {perfs.map((perf) => {
                    const isSelected = selectedPerfId === perf.id
                    const canSelect = !isVoted

                    return (
                      <motion.button
                        key={perf.id}
                        onClick={() => canSelect && handleSelectPerformance(categoryId, perf.id)}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={`text-left border rounded-lg p-6 transition ${
                          isVoted
                            ? 'border-gold/20 opacity-50 cursor-not-allowed bg-surface/30'
                            : isSelected
                              ? 'border-gold bg-gold/5 hover:bg-gold/10'
                              : 'border-gold/20 bg-surface/50 hover:border-gold/40 hover:bg-surface'
                        }`}
                        disabled={isVoted}
                      >
                        {/* Radio Button */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold">{perf.title}</h3>
                            <p className="text-white/60 text-sm">{perf.performer_name}</p>
                          </div>
                          <div
                            className={`w-5 h-5 rounded-full border-2 flex-shrink-0 mt-1 transition ${
                              isSelected
                                ? 'border-gold bg-gold'
                                : 'border-gold/40'
                            }`}
                          >
                            {isSelected && (
                              <div className="w-full h-full rounded-full flex items-center justify-center">
                                <div className="w-1.5 h-1.5 bg-base rounded-full" />
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Event Badge */}
                        <div className="flex gap-2 flex-wrap">
                          <span className="text-xs px-2 py-1 bg-gold/10 text-gold rounded">
                            {perf.event_name}
                          </span>
                          {perf.is_withdrawn && (
                            <span className="text-xs px-2 py-1 bg-crimson/10 text-crimson rounded">
                              Withdrawn
                            </span>
                          )}
                        </div>
                      </motion.button>
                    )
                  })}
                </div>

                {/* Submit Vote Button */}
                {!isVoted && (
                  <button
                    onClick={() => handleSubmitVote(categoryId)}
                    disabled={!selectedPerfId || submitting === categoryId}
                    className="px-6 py-2 bg-gold text-base font-semibold rounded hover:bg-gold/90 disabled:bg-gold/50 disabled:cursor-not-allowed transition"
                  >
                    {submitting === categoryId
                      ? 'Submitting Vote...'
                      : `Submit Vote for ${CATEGORY_MAP[categoryId] || categoryId}`}
                  </button>
                )}
              </motion.div>
            )
          })}
        </div>

        {performances.length === 0 && (
          <div className="text-center py-12">
            <p className="text-white/60">No performances available for voting</p>
          </div>
        )}
      </div>
    </div>
  )
}
