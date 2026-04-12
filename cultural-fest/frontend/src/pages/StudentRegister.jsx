import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'

const DISPLAY_FONT = { fontFamily: 'Cormorant Garamond, serif' }

const COURSES = ['BCA', 'BBA', 'B.Com', 'MBA']
const YEARS = ['1st', '2nd', '3rd']

export default function StudentRegister() {
  const navigate = useNavigate()

  const [formData, setFormData] = useState({
    name: '',
    roll_no: '',
    course: '',
    year: '',
    email: '',
    phone: ''
  })

  const [errors, setErrors] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  const [apiError, setApiError] = useState('')

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return re.test(email)
  }

  const validatePhone = (phone) => {
    const re = /^[0-9]{10}$/
    return re.test(phone)
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
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required'
    } else if (!validatePhone(formData.phone)) {
      newErrors.phone = 'Phone must be 10 digits'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    // Clear error for this field when user starts typing
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
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (response.ok && data.success) {
        const registrationId = data.data?.id
        navigate(`/confirmation/student/${registrationId}`, {
          state: {
            qr_code: data.data?.qr_code,
            name: formData.name
          }
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
    <div className="min-h-screen bg-[#0A0A0A] text-[#F5F0E8]">
      <header className="border-b border-[#F5F0E8]/10 bg-[#0A0A0A]">
        <div className="mx-auto flex h-20 w-full max-w-2xl items-center px-4 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="text-sm text-[#F5F0E8]/78 transition hover:text-[#F5F0E8]"
          >
            ← Back
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="text-3xl sm:text-4xl" style={DISPLAY_FONT}>
            Audience Registration
          </h1>
          <p className="mt-2 text-[#C9A84C]">Get your entry pass to the fest</p>

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
              <label htmlFor="name" className="block text-sm font-medium text-[#F5F0E8]/85">
                Full Name
              </label>
              <input
                id="name"
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Your full name"
                className={`mt-2 w-full rounded-lg border bg-[#111111] px-4 py-3 text-[#F5F0E8] transition focus:outline-none ${
                  errors.name
                    ? 'border-red-500/60 focus:border-red-500'
                    : 'border-[#F5F0E8]/15 focus:border-[#C9A84C]/70'
                }`}
              />
              {errors.name && <p className="mt-1.5 text-xs text-red-400">{errors.name}</p>}
            </div>

            <div>
              <label htmlFor="roll_no" className="block text-sm font-medium text-[#F5F0E8]/85">
                Roll No
              </label>
              <input
                id="roll_no"
                type="text"
                name="roll_no"
                value={formData.roll_no}
                onChange={handleInputChange}
                placeholder="e.g., BCA2401"
                className={`mt-2 w-full rounded-lg border bg-[#111111] px-4 py-3 text-[#F5F0E8] transition focus:outline-none ${
                  errors.roll_no
                    ? 'border-red-500/60 focus:border-red-500'
                    : 'border-[#F5F0E8]/15 focus:border-[#C9A84C]/70'
                }`}
              />
              {errors.roll_no && <p className="mt-1.5 text-xs text-red-400">{errors.roll_no}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="course" className="block text-sm font-medium text-[#F5F0E8]/85">
                  Course
                </label>
                <select
                  id="course"
                  name="course"
                  value={formData.course}
                  onChange={handleInputChange}
                  className={`mt-2 w-full rounded-lg border bg-[#111111] px-4 py-3 text-[#F5F0E8] transition focus:outline-none ${
                    errors.course
                      ? 'border-red-500/60 focus:border-red-500'
                      : 'border-[#F5F0E8]/15 focus:border-[#C9A84C]/70'
                  }`}
                >
                  <option value="">Select Course</option>
                  {COURSES.map((course) => (
                    <option key={course} value={course} className="bg-[#111111] text-[#F5F0E8]">
                      {course}
                    </option>
                  ))}
                </select>
                {errors.course && <p className="mt-1.5 text-xs text-red-400">{errors.course}</p>}
              </div>

              <div>
                <label htmlFor="year" className="block text-sm font-medium text-[#F5F0E8]/85">
                  Year
                </label>
                <select
                  id="year"
                  name="year"
                  value={formData.year}
                  onChange={handleInputChange}
                  className={`mt-2 w-full rounded-lg border bg-[#111111] px-4 py-3 text-[#F5F0E8] transition focus:outline-none ${
                    errors.year
                      ? 'border-red-500/60 focus:border-red-500'
                      : 'border-[#F5F0E8]/15 focus:border-[#C9A84C]/70'
                  }`}
                >
                  <option value="">Select Year</option>
                  {YEARS.map((year) => (
                    <option key={year} value={year} className="bg-[#111111] text-[#F5F0E8]">
                      {year} Year
                    </option>
                  ))}
                </select>
                {errors.year && <p className="mt-1.5 text-xs text-red-400">{errors.year}</p>}
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[#F5F0E8]/85">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="your@email.com"
                className={`mt-2 w-full rounded-lg border bg-[#111111] px-4 py-3 text-[#F5F0E8] transition focus:outline-none ${
                  errors.email
                    ? 'border-red-500/60 focus:border-red-500'
                    : 'border-[#F5F0E8]/15 focus:border-[#C9A84C]/70'
                }`}
              />
              {errors.email && <p className="mt-1.5 text-xs text-red-400">{errors.email}</p>}
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-[#F5F0E8]/85">
                Phone Number
              </label>
              <input
                id="phone"
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="10-digit phone number"
                maxLength="10"
                className={`mt-2 w-full rounded-lg border bg-[#111111] px-4 py-3 text-[#F5F0E8] transition focus:outline-none ${
                  errors.phone
                    ? 'border-red-500/60 focus:border-red-500'
                    : 'border-[#F5F0E8]/15 focus:border-[#C9A84C]/70'
                }`}
              />
              {errors.phone && <p className="mt-1.5 text-xs text-red-400">{errors.phone}</p>}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="mt-8 w-full rounded-lg bg-[#C9A84C] px-4 py-3 font-semibold text-[#0A0A0A] transition disabled:opacity-70 hover:brightness-105"
            >
              {isLoading ? (
                <span className="inline-flex items-center gap-2">
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                    className="inline-block h-4 w-4 rounded-full border-2 border-[#0A0A0A]/40 border-t-[#0A0A0A]"
                  />
                  Registering...
                </span>
              ) : (
                'Get Entry Pass'
              )}
            </button>
          </form>
        </motion.div>
      </main>
    </div>
  )
}
