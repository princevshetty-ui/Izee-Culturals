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
      const response = await apiFetch('/api/voting/audience/vote', {
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
    <div className="relative min-h-screen overflow-hidden bg-[#0C0D10] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute -top-24 right-0 h-[460px] w-[460px]"
          style={{ background: 'radial-gradient(ellipse, rgba(190,163,93,0.08), transparent 60%)' }}
        />
        <div
          className="absolute -bottom-20 left-[-100px] h-[400px] w-[400px]"
          style={{ background: 'radial-gradient(ellipse, rgba(158,38,54,0.08), transparent 60%)' }}
        />
      </div>

      <header className="sticky top-0 z-40 border-b border-[rgba(190,163,93,0.15)] bg-[#121317]/95 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <h1 className="text-3xl text-[#BEA35D]" style={DISPLAY_FONT}>Audience Voting</h1>
          <div className="flex items-center gap-3">
            <p className="text-sm text-white/80">{voterData.name}</p>
            <span
              className={`rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.16em] ${
                voterRoleBadge === 'Staff'
                  ? 'border-[rgba(190,163,93,0.45)] text-[#BEA35D]'
                  : 'border-white/35 text-white/85'
              }`}
            >
              {voterRoleBadge === 'Staff' ? 'STAFF VOTER' : 'STUDENT'}
            </span>
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
          {Object.entries(groupedByCategory).map(([categoryId, perfs]) => {
            const isVoted = submittedCategories.has(categoryId)
            const selectedPerfId = selectedPerfs[categoryId]

            return (
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
                  <p className="text-xs uppercase tracking-[0.18em] text-white/40">One vote per category</p>
                </div>

                <div className="space-y-4">
                  {perfs.map((perf) => {
                    const isSelected = selectedPerfId === perf.id
                    const canSelect = !isVoted

                    return (
                      <motion.button
                        key={perf.id}
                        onClick={() => canSelect && handleSelectPerformance(categoryId, perf.id)}
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`relative w-full overflow-hidden rounded-2xl border p-6 text-left transition ${
                          isVoted ? 'cursor-not-allowed opacity-40' : ''
                        }`}
                        style={{
                          background: 'rgba(18,19,23,0.8)',
                          backdropFilter: 'blur(16px)',
                          borderColor: isSelected ? 'rgba(190,163,93,0.95)' : 'rgba(190,163,93,0.2)',
                          borderWidth: isSelected ? '2px' : '1px',
                          boxShadow: isSelected ? '0 0 24px rgba(190,163,93,0.28)' : 'none'
                        }}
                        disabled={isVoted}
                      >
                        {isSelected && (
                          <span className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full border border-[rgba(190,163,93,0.45)] bg-[#BEA35D]/20 text-[#BEA35D]">
                            ✓
                          </span>
                        )}

                        <div className="pr-10">
                          <p className="text-[13px] uppercase tracking-[0.15em] text-[#BEA35D]/70">{perf.event_name}</p>
                          <h3 className="mt-1 text-[22px] leading-tight text-white" style={DISPLAY_FONT}>{perf.performer_name}</h3>
                          <p className="mt-1 text-sm text-white/55">{perf.title}</p>
                          {perf.is_withdrawn && (
                            <span className="mt-3 inline-flex rounded-full border border-[#9E2636]/50 bg-[#9E2636]/15 px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-[#d86b79]">
                              Withdrawn
                            </span>
                          )}
                        </div>

                        {isVoted && isSelected && (
                          <div className="mt-4 rounded-lg border border-green-400/35 bg-green-400/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-green-300">
                            Vote Recorded ✓
                          </div>
                        )}
                      </motion.button>
                    )
                  })}
                </div>

                {!isVoted ? (
                  <button
                    onClick={() => handleSubmitVote(categoryId)}
                    disabled={!selectedPerfId || submitting === categoryId}
                    className="w-full rounded-lg py-3 text-sm font-bold uppercase tracking-[0.16em] text-[#0C0D10] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                    style={{
                      background: 'linear-gradient(135deg, #BEA35D, #8B6914)',
                      boxShadow: '0 0 20px rgba(190,163,93,0.2)'
                    }}
                  >
                    {submitting === categoryId
                      ? 'Submitting Vote...'
                      : `Submit Vote for ${CATEGORY_MAP[categoryId] || categoryId}`}
                  </button>
                ) : (
                  <div className="w-full rounded-lg border border-green-400/35 bg-green-400/10 px-4 py-3 text-center text-xs font-semibold uppercase tracking-[0.16em] text-green-300">
                    Vote Recorded
                  </div>
                )}
              </motion.section>
            )
          })}
        </div>

        {performances.length === 0 && (
          <div className="py-14 text-center text-white/55">No performances available for voting</div>
        )}
      </main>
    </div>
  )
}
