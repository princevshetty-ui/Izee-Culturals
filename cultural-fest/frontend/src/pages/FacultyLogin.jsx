import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'

const DISPLAY_FONT = { fontFamily: 'Cormorant Garamond, serif' }

export default function FacultyLogin() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    setErrorMessage('')

    if (!password.trim()) {
      setErrorMessage('Password is required')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/faculty/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      })

      const payload = await response.json()

      if (!response.ok || !payload.success) {
        throw new Error(payload?.message || 'Invalid faculty password')
      }

      sessionStorage.setItem('authenticated', 'true')
      sessionStorage.setItem('facultyPassword', password)
      navigate('/faculty/dashboard')
    } catch (error) {
      setErrorMessage(error.message || 'Login failed. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#F5F0E8]">
      <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md rounded-3xl border border-[#C9A84C]/25 bg-[#111111] p-6 sm:p-8"
        >
          <p className="text-xs uppercase tracking-[0.2em] text-[#C9A84C]">Cultural Committee</p>
          <h1 className="mt-2 text-4xl text-[#F5F0E8]" style={DISPLAY_FONT}>
            Faculty Login
          </h1>
          <p className="mt-2 text-sm text-[#F5F0E8]/70">
            Sign in to view registration reports and export event records.
          </p>

          {errorMessage && (
            <div className="mt-5 rounded-xl border border-red-500/35 bg-red-500/12 p-3 text-sm text-red-400">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="faculty-password" className="block text-sm text-[#F5F0E8]/82">
                Password
              </label>
              <input
                id="faculty-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter faculty password"
                className="mt-2 w-full rounded-lg border border-[#F5F0E8]/15 bg-[#0D0D0D] px-4 py-3 text-[#F5F0E8] outline-none transition focus:border-[#C9A84C]/70"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#C9A84C] px-4 py-3 font-semibold text-[#0A0A0A] transition hover:brightness-110 disabled:opacity-70"
            >
              {isSubmitting && (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#0A0A0A]/35 border-t-[#0A0A0A]" />
              )}
              {isSubmitting ? 'Signing In...' : 'Sign In'}
            </button>
          </form>

          <Link to="/" className="mt-5 inline-block text-sm text-[#F5F0E8]/68 transition hover:text-[#C9A84C]">
            Back to Home
          </Link>
        </motion.div>
      </div>
    </div>
  )
}
