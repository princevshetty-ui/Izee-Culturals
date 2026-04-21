import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'

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
      const response = await fetch('/api/voting/login', {
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
    <div className="min-h-screen bg-base text-white flex items-center justify-center px-4">
      {/* Background glow effect */}
      <div className="fixed inset-0 opacity-30 pointer-events-none">
        <div
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
          style={{
            width: '500px',
            height: '500px',
            background: 'radial-gradient(circle, rgba(190,163,93,0.15) 0%, transparent 70%)',
            filter: 'blur(40px)'
          }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md z-10"
      >
        <div className="bg-surface border border-gold/20 rounded-lg p-8 shadow-lg">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-2" style={DISPLAY_FONT}>
              Voting Portal
            </h1>
            <p className="text-gold text-sm">Judge & Audience Voting</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Roll Number */}
            <div>
              <label htmlFor="rollNo" className="block text-sm font-medium text-white mb-2">
                Roll Number
              </label>
              <input
                id="rollNo"
                type="text"
                value={rollNo}
                onChange={(e) => setRollNo(e.target.value)}
                placeholder="Enter your roll number"
                className="w-full px-4 py-3 bg-base border border-gold/20 rounded text-white placeholder-white/40 focus:outline-none focus:border-gold/50 transition"
                required
                disabled={isLoading}
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-white mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full px-4 py-3 bg-base border border-gold/20 rounded text-white placeholder-white/40 focus:outline-none focus:border-gold/50 transition"
                required
                disabled={isLoading}
              />
            </div>

            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-crimson/20 border border-crimson rounded p-3 text-crimson text-sm"
              >
                {error}
              </motion.div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !rollNo || !password}
              className="w-full bg-gold text-base font-semibold py-3 rounded hover:bg-gold/90 disabled:bg-gold/50 disabled:cursor-not-allowed transition"
            >
              {isLoading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          {/* Footer */}
          <p className="text-center text-white/40 text-xs mt-6">
            For judges and authorized voters only
          </p>
        </div>
      </motion.div>
    </div>
  )
}
