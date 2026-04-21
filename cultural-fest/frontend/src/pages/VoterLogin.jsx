import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { apiFetch } from '../utils/api'

const DISPLAY_FONT = { fontFamily: 'Nevarademo, serif' }

export default function VoterLogin() {
  const navigate = useNavigate()
  const [rollNo, setRollNo] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const response = await apiFetch('/api/voting/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roll_no: rollNo, password })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.message || 'Login failed. Please check your credentials.')
        setIsLoading(false)
        return
      }

      if (data.success && data.data) {
        // Store JWT token and voter info
        sessionStorage.setItem('VOTER_TOKEN', data.data.token)
        sessionStorage.setItem('voter_role', data.data.voter.role)
        sessionStorage.setItem('voter_name', data.data.voter.name)

        // Redirect based on role
        if (data.data.voter.role === 'judge') {
          navigate('/voting/judge')
        } else if (data.data.voter.role === 'staff' || data.data.voter.role === 'student') {
          navigate('/voting/audience')
        } else {
          setError('Unknown role. Please contact support.')
        }
      } else {
        setError(data.message || 'Login failed')
      }
    } catch (err) {
      setError(err.message || 'Network error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0C0D10] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute -top-28 right-[-120px] h-[520px] w-[520px]"
          style={{ background: 'radial-gradient(ellipse, rgba(190,163,93,0.06), transparent 60%)' }}
        />
        <div
          className="absolute -bottom-28 left-[-120px] h-[520px] w-[520px]"
          style={{ background: 'radial-gradient(ellipse, rgba(158,38,54,0.06), transparent 60%)' }}
        />
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="w-full max-w-md"
        >
          <div
            className="rounded-2xl border p-10"
            style={{
              background: 'rgba(18,19,23,0.8)',
              backdropFilter: 'blur(16px)',
              borderColor: 'rgba(190,163,93,0.2)'
            }}
          >
            <div className="mb-8 text-center">
              <p className="text-[14px] uppercase tracking-[0.32em] text-[#BEA35D]">IZee Got Talent</p>
              <h1 className="mt-2 text-[32px] leading-none text-white" style={DISPLAY_FONT}>
                Voter Portal
              </h1>
              <div className="mx-auto mb-8 mt-4 h-px w-12" style={{ background: 'rgba(190,163,93,0.3)' }} />
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label
                  htmlFor="rollNo"
                  className="mb-2 block text-xs uppercase tracking-[0.24em] text-white/50"
                >
                  Roll Number
                </label>
                <input
                  id="rollNo"
                  type="text"
                  value={rollNo}
                  onChange={(e) => setRollNo(e.target.value)}
                  placeholder="Enter your roll number"
                  className="w-full rounded-lg border border-[rgba(190,163,93,0.2)] bg-white/[0.04] px-4 py-3 text-white placeholder-white/40 outline-none transition-colors duration-200 focus:border-[#BEA35D]"
                  required
                  disabled={isLoading}
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-xs uppercase tracking-[0.24em] text-white/50"
                >
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full rounded-lg border border-[rgba(190,163,93,0.2)] bg-white/[0.04] px-4 py-3 text-white placeholder-white/40 outline-none transition-colors duration-200 focus:border-[#BEA35D]"
                  required
                  disabled={isLoading}
                />
              </div>

              <button
                type="submit"
                disabled={isLoading || !rollNo || !password}
                className="w-full rounded-lg py-3 text-sm font-bold tracking-[0.16em] text-[#0C0D10] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
                style={{
                  background: 'linear-gradient(135deg, #BEA35D, #8B6914)',
                  boxShadow: '0 0 0 rgba(190,163,93,0)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 0 22px rgba(190,163,93,0.28)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 0 0 rgba(190,163,93,0)'
                }}
              >
                {isLoading ? 'Logging in...' : 'Login'}
              </button>

              {error && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center text-xs text-[#9E2636]"
                >
                  {error}
                </motion.p>
              )}

              <p className="pt-1 text-center text-xs text-white/30">
                Students can use their QR ID password. For judges and authorized voters only.
              </p>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
