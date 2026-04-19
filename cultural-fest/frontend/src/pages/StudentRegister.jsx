import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'

const DISPLAY_FONT = { fontFamily: 'Montage, Nevarademo, serif' }

const COURSES = ['BCA', 'BBA', 'BBA - Aviation']
const YEARS = ['1st', '2nd', '3rd']

const labelClass = 'block text-[11px] uppercase tracking-[0.16em] text-[#DC4B5D]'
const inputBase =
  'mt-2 w-full rounded-lg border px-4 py-3 text-[#EEE6D8] placeholder:text-[rgba(238,230,216,0.3)] transition focus:outline-none'

export default function StudentRegister() {
  const navigate = useNavigate()

  const [formData, setFormData] = useState({
    name: '',
    roll_no: '',
    course: '',
    year: '',
    email: '',
  })

  const [errors, setErrors] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  const [apiError, setApiError] = useState('')

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return re.test(email)
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.name.trim()) newErrors.name = 'Name is required'
    if (!formData.roll_no.trim()) newErrors.roll_no = 'Roll No is required'
    if (!formData.course) newErrors.course = 'Course is required'
    if (!formData.year) newErrors.year = 'Year is required'
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Invalid email format'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setApiError('')

    if (!validateForm()) return

    setIsLoading(true)

    try {
      const response = await fetch('/api/register/student', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        const registrationId = data.data?.id
        navigate(`/confirmation/student/${registrationId}`, {
          state: {
            qr_code: data.data?.qr_code || null,
            name: formData.name,
            pending: !data.data?.qr_code,
          },
        })
      } else {
        setApiError(data.message || 'Registration failed. Please try again.')
      }
    } catch (error) {
      setApiError('Network error. Please check your connection and try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen text-[#EEE6D8]"
      style={{
        background:
          'radial-gradient(900px circle at 16% 88%, rgba(178,34,52,0.14), transparent 60%), radial-gradient(700px circle at 82% 12%, rgba(201,168,76,0.07), transparent 62%), radial-gradient(1400px at 50% 50%, rgba(20,28,60,0.3), transparent 70%), #080910',
      }}
    >
      <header className="border-b border-[#EEE6D8]/10 bg-[#080910]/88 backdrop-blur-md">
        <div className="mx-auto w-full max-w-6xl px-4 py-4 sm:px-6 lg:px-8">
          <p className="text-[10px] uppercase tracking-[0.18em] text-[#EEE6D8]/38">
            Home → Audience Registration → Student Form
          </p>
          <div className="mt-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="text-sm text-[#EEE6D8]/78 transition hover:text-[#EEE6D8]"
            >
              ← Back
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[1.25fr_0.75fr]">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
            className="card-glass rounded-2xl border border-[#EEE6D8]/12 p-6 sm:p-8"
          >
            <h1 className="text-3xl sm:text-4xl" style={DISPLAY_FONT}>
              Audience Registration
            </h1>
            <p className="mt-2 text-[#DC4B5D]">Get your entry pass to the fest</p>

            {apiError && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 rounded-xl border border-red-500/35 bg-red-500/12 p-4 text-sm text-red-400"
              >
                {apiError}
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div>
                <label htmlFor="name" className={labelClass}>
                  Full Name
                </label>
                <input
                  id="name"
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="V S"
                  className={`${inputBase} ${
                    errors.name
                      ? 'border-red-500/60 focus:border-red-500'
                      : 'border-[rgba(238,230,216,0.12)] bg-[rgba(255,255,255,0.04)] focus:border-[rgba(220,75,93,0.55)] focus:shadow-[0_0_0_3px_rgba(220,75,93,0.12)]'
                  }`}
                />
                {errors.name && <p className="mt-1.5 text-xs text-red-400">{errors.name}</p>}
              </div>

              <div>
                <label htmlFor="roll_no" className={labelClass}>
                  Roll No
                </label>
                <input
                  id="roll_no"
                  type="text"
                  name="roll_no"
                  value={formData.roll_no}
                  onChange={handleInputChange}
                  placeholder="e.g., U03EX24S0091"
                  className={`${inputBase} ${
                    errors.roll_no
                      ? 'border-red-500/60 focus:border-red-500'
                      : 'border-[rgba(238,230,216,0.12)] bg-[rgba(255,255,255,0.04)] focus:border-[rgba(220,75,93,0.55)] focus:shadow-[0_0_0_3px_rgba(220,75,93,0.12)]'
                  }`}
                />
                {errors.roll_no && <p className="mt-1.5 text-xs text-red-400">{errors.roll_no}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="course" className={labelClass}>
                    Course
                  </label>
                  <select
                    id="course"
                    name="course"
                    value={formData.course}
                    onChange={handleInputChange}
                    className={`${inputBase} ${
                      errors.course
                        ? 'border-red-500/60 focus:border-red-500'
                        : 'border-[rgba(238,230,216,0.12)] bg-[rgba(255,255,255,0.04)] focus:border-[rgba(220,75,93,0.55)] focus:shadow-[0_0_0_3px_rgba(220,75,93,0.12)]'
                    }`}
                  >
                    <option value="">Select Course</option>
                    {COURSES.map((course) => (
                      <option key={course} value={course} className="bg-[#111111] text-[#EEE6D8]">
                        {course}
                      </option>
                    ))}
                  </select>
                  {errors.course && <p className="mt-1.5 text-xs text-red-400">{errors.course}</p>}
                </div>

                <div>
                  <label htmlFor="year" className={labelClass}>
                    Year
                  </label>
                  <select
                    id="year"
                    name="year"
                    value={formData.year}
                    onChange={handleInputChange}
                    className={`${inputBase} ${
                      errors.year
                        ? 'border-red-500/60 focus:border-red-500'
                        : 'border-[rgba(238,230,216,0.12)] bg-[rgba(255,255,255,0.04)] focus:border-[rgba(220,75,93,0.55)] focus:shadow-[0_0_0_3px_rgba(220,75,93,0.12)]'
                    }`}
                  >
                    <option value="">Select Year</option>
                    {YEARS.map((year) => (
                      <option key={year} value={year} className="bg-[#111111] text-[#EEE6D8]">
                        {year} Year
                      </option>
                    ))}
                  </select>
                  {errors.year && <p className="mt-1.5 text-xs text-red-400">{errors.year}</p>}
                </div>
              </div>

              <div>
                <label htmlFor="email" className={labelClass}>
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="your@email.com"
                  className={`${inputBase} ${
                    errors.email
                      ? 'border-red-500/60 focus:border-red-500'
                      : 'border-[rgba(238,230,216,0.12)] bg-[rgba(255,255,255,0.04)] focus:border-[rgba(220,75,93,0.55)] focus:shadow-[0_0_0_3px_rgba(220,75,93,0.12)]'
                  }`}
                />
                {errors.email && <p className="mt-1.5 text-xs text-red-400">{errors.email}</p>}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="mt-8 w-full rounded-lg px-4 py-3 font-semibold text-white transition hover:brightness-105 active:scale-[0.985] disabled:opacity-70"
                style={{
                  background: 'linear-gradient(135deg, #B22234, #7D1F2A)',
                  boxShadow: '0 4px 24px rgba(178,34,52,0.32)',
                }}
              >
                {isLoading ? (
                  <span className="inline-flex items-center gap-2">
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                      className="inline-block h-4 w-4 rounded-full border-2 border-[#0C0D10]/40 border-t-[#0C0D10]"
                    />
                    Registering...
                  </span>
                ) : (
                  'Get Entry Pass'
                )}
              </button>
            </form>
          </motion.div>

          <motion.aside
            initial={{ opacity: 0, x: 28 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.08, ease: 'easeOut' }}
            className="card-glass hidden rounded-2xl border border-[#EEE6D8]/12 p-6 lg:flex lg:flex-col lg:justify-between"
          >
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-[#DC4B5D]">Festival Note</p>
              <h2 className="mt-3 text-2xl" style={DISPLAY_FONT}>
                "Your pass.
                Your moment."
              </h2>
            </div>
            <p className="mt-6 text-sm leading-relaxed text-[#EEE6D8]/62">
              Submit accurate details. QR appears after faculty approval.
            </p>
          </motion.aside>
        </div>
      </main>
    </div>
  )
}
