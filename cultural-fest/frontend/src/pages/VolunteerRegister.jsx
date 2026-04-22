import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { isValidRollNo, normalizeFullNameInput, normalizeRollNoInput } from '../utils/formValidation'
import PageTopBar from '../components/PageTopBar'
import { apiFetch } from '../utils/api'

const DISPLAY_FONT = { fontFamily: 'Montage, Nevarademo, serif' }

const COURSES = ['BCA', 'BBA', 'B.Com']
const YEARS = ['1st', '2nd', '3rd']

const volunteerLabelClass = 'block text-[11px] uppercase tracking-[0.16em] text-[#14B8A6]'
const inputVolunteer =
  'mt-2 w-full rounded-lg border px-4 py-3 text-[#EEE6D8] placeholder:text-[rgba(238,230,216,0.3)] transition focus:outline-none'
const MotionDiv = motion.div
const MotionSpan = motion.span
const MotionAside = motion.aside

const VOLUNTEER_TEAMS = [
  'Registration & Reception Team',
  'Program Coordination Team',
  'Discipline & Security Committee',
  'Hospitality & Welfare Team',
  'Technical Support Team',
]

export default function VolunteerRegister() {
  const navigate = useNavigate()

  const [formData, setFormData] = useState({
    name: '',
    roll_no: '',
    course: '',
    year: '',
    email: '',
    phone: '',
    motivation: '',
  })

  const [errors, setErrors] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  const [apiError, setApiError] = useState('')
  const [isRegistrationOpen, setIsRegistrationOpen] = useState(true)

  useEffect(() => {
    let isMounted = true

    const loadRegistrationConfig = async () => {
      try {
        const response = await apiFetch('/api/config/registrations')
        const payload = await response.json().catch(() => ({}))
        if (!isMounted || !response.ok || !payload?.success || !payload?.data) return
        setIsRegistrationOpen(Boolean(payload.data.volunteer_open))
      } catch {
        // Keep default open if config fetch fails.
      }
    }

    loadRegistrationConfig()
    return () => {
      isMounted = false
    }
  }, [])

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return re.test(email)
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.name.trim()) newErrors.name = 'Name is required'
    if (!formData.roll_no.trim()) {
      newErrors.roll_no = 'Roll No is required'
    } else if (!isValidRollNo(formData.roll_no)) {
      newErrors.roll_no = 'Roll No must be 12 alphanumeric characters'
    }
    if (!formData.course) newErrors.course = 'Course is required'
    if (!formData.year) newErrors.year = 'Year is required'
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Invalid email format'
    }
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required'
    } else if (!/^\d{10}$/.test(formData.phone.trim())) {
      newErrors.phone = 'Enter a valid 10-digit phone number'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    const nextValue =
      name === 'roll_no'
        ? normalizeRollNoInput(value)
        : name === 'name'
          ? normalizeFullNameInput(value)
          : value

    setFormData((prev) => ({ ...prev, [name]: nextValue }))
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setApiError('')

    if (!isRegistrationOpen) {
      setApiError('Registrations are currently closed')
      return
    }

    if (!validateForm()) return

    setIsLoading(true)

    try {
      const response = await apiFetch('/api/register/volunteer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        const registrationId = data.data?.id
        navigate(`/confirmation/volunteer/${registrationId}`, {
          state: {
            name: formData.name,
            pending: true,
            role: 'volunteer',
          },
        })
      } else {
        setApiError(data.message || 'Registration failed. Please try again.')
      }
    } catch {
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
      <PageTopBar
        breadcrumb="Home → Volunteer Registration → Application Form"
        onBack={() => navigate('/')}
      />

      <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[1.25fr_0.75fr]">
          <MotionDiv
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
            className="card-glass rounded-2xl border border-[#EEE6D8]/12 p-6 sm:p-8"
          >
            <h1 className="text-3xl sm:text-4xl" style={DISPLAY_FONT}>
              Volunteer Registration
            </h1>
            <p className="mt-2 text-[#14B8A6]">Join the team behind the fest</p>

            {!isRegistrationOpen && (
              <MotionDiv
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 rounded-xl border border-[#B22234]/40 bg-[#B22234]/12 p-4 text-sm text-[#E8B8BF]"
              >
                Registrations are currently closed
              </MotionDiv>
            )}

            <MotionDiv
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 flex gap-3 rounded-lg border border-[rgba(20,184,166,0.25)] bg-[rgba(20,184,166,0.07)] p-3"
            >
              <span
                style={{
                  fontSize: '14px',
                  color: '#14B8A6',
                  flexShrink: 0,
                  lineHeight: 1,
                }}
              >
                ℹ
              </span>
              <div>
                <p style={{ fontSize: '12px', color: 'rgba(238,230,216,0.55)', lineHeight: '1.6' }}>
                  Volunteer registrations are reviewed by faculty.
                  <br />
                  You will be assigned to a team after approval.
                </p>
              </div>
            </MotionDiv>

            {apiError && (
              <MotionDiv
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 rounded-xl border border-red-500/35 bg-red-500/12 p-4 text-sm text-red-400"
              >
                {apiError}
              </MotionDiv>
            )}

            <form
              onSubmit={handleSubmit}
              className="mt-8 space-y-5"
              style={{ opacity: isRegistrationOpen ? 1 : 0.58, pointerEvents: isRegistrationOpen ? 'auto' : 'none' }}
            >
              <div>
                <label htmlFor="name" className={volunteerLabelClass}>
                  Full Name
                </label>
                <input
                  id="name"
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter Full Name as in ID Card (e.g., Vishesh Vandan)"
                  className={`${inputVolunteer} ${
                    errors.name
                      ? 'border-red-500/60 focus:border-red-500'
                      : 'border-[rgba(238,230,216,0.12)] bg-[rgba(255,255,255,0.04)] focus:border-[rgba(20,184,166,0.45)] focus:shadow-[0_0_0_3px_rgba(20,184,166,0.08)]'
                  }`}
                />
                <p className="mt-1 text-[11px] text-[#EEE6D8]/42">Use full name with each word capitalized.</p>
                {errors.name && <p className="mt-1.5 text-xs text-red-400">{errors.name}</p>}
              </div>

              <div>
                <label htmlFor="roll_no" className={volunteerLabelClass}>
                  Roll No
                </label>
                <input
                  id="roll_no"
                  type="text"
                  name="roll_no"
                  value={formData.roll_no}
                  onChange={handleInputChange}
                  placeholder="e.g., U03EX24S0091"
                  maxLength={12}
                  className={`${inputVolunteer} ${
                    errors.roll_no
                      ? 'border-red-500/60 focus:border-red-500'
                      : 'border-[rgba(238,230,216,0.12)] bg-[rgba(255,255,255,0.04)] focus:border-[rgba(20,184,166,0.45)] focus:shadow-[0_0_0_3px_rgba(20,184,166,0.08)]'
                  }`}
                />
                {errors.roll_no && <p className="mt-1.5 text-xs text-red-400">{errors.roll_no}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="course" className={volunteerLabelClass}>
                    Course
                  </label>
                  <select
                    id="course"
                    name="course"
                    value={formData.course}
                    onChange={handleInputChange}
                    className={`${inputVolunteer} ${
                      errors.course
                        ? 'border-red-500/60 focus:border-red-500'
                        : 'border-[rgba(238,230,216,0.12)] bg-[rgba(255,255,255,0.04)] focus:border-[rgba(20,184,166,0.45)] focus:shadow-[0_0_0_3px_rgba(20,184,166,0.08)]'
                    }`}
                  >
                    <option value="" className="bg-[#111111] text-[#EEE6D8]">Select Course</option>
                    {COURSES.map((course) => (
                      <option key={course} value={course} className="bg-[#111111] text-[#EEE6D8]">
                        {course}
                      </option>
                    ))}
                  </select>
                  {errors.course && <p className="mt-1.5 text-xs text-red-400">{errors.course}</p>}
                </div>

                <div>
                  <label htmlFor="year" className={volunteerLabelClass}>
                    Year
                  </label>
                  <select
                    id="year"
                    name="year"
                    value={formData.year}
                    onChange={handleInputChange}
                    className={`${inputVolunteer} ${
                      errors.year
                        ? 'border-red-500/60 focus:border-red-500'
                        : 'border-[rgba(238,230,216,0.12)] bg-[rgba(255,255,255,0.04)] focus:border-[rgba(20,184,166,0.45)] focus:shadow-[0_0_0_3px_rgba(20,184,166,0.08)]'
                    }`}
                  >
                    <option value="" className="bg-[#111111] text-[#EEE6D8]">Select Year</option>
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
                <label htmlFor="email" className={volunteerLabelClass}>
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="your@email.com"
                  className={`${inputVolunteer} ${
                    errors.email
                      ? 'border-red-500/60 focus:border-red-500'
                      : 'border-[rgba(238,230,216,0.12)] bg-[rgba(255,255,255,0.04)] focus:border-[rgba(20,184,166,0.45)] focus:shadow-[0_0_0_3px_rgba(20,184,166,0.08)]'
                  }`}
                />
                {errors.email && <p className="mt-1.5 text-xs text-red-400">{errors.email}</p>}
              </div>

              <div>
                <label htmlFor="phone" className={volunteerLabelClass}>
                  Phone Number
                </label>
                <input
                  id="phone"
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="10-digit mobile number"
                  className={`${inputVolunteer} ${
                    errors.phone
                      ? 'border-red-500/60 focus:border-red-500'
                      : 'border-[rgba(238,230,216,0.12)] bg-[rgba(255,255,255,0.04)] focus:border-[rgba(20,184,166,0.45)] focus:shadow-[0_0_0_3px_rgba(20,184,166,0.08)]'
                  }`}
                />
                {errors.phone && <p className="mt-1.5 text-xs text-red-400">{errors.phone}</p>}
              </div>

              <div>
                <label htmlFor="motivation" className="block text-[11px] uppercase tracking-[0.16em]">
                  <span style={{ color: '#14B8A6' }}>Why do you want to volunteer?</span>
                  <span style={{ color: 'rgba(238,230,216,0.35)', fontWeight: '400' }}> (Optional)</span>
                </label>
                <textarea
                  id="motivation"
                  name="motivation"
                  value={formData.motivation}
                  onChange={handleInputChange}
                  placeholder="Tell us a bit about yourself and why you'd like to be part of the organizing team..."
                  rows={3}
                  className={`${inputVolunteer} border-[rgba(238,230,216,0.12)] bg-[rgba(255,255,255,0.04)] focus:border-[rgba(20,184,166,0.45)] focus:shadow-[0_0_0_3px_rgba(20,184,166,0.08)] resize-vertical`}
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="mt-8 w-full rounded-lg px-4 py-3 font-semibold text-[#0C0D10] transition hover:brightness-105 active:scale-[0.985] disabled:opacity-70"
                style={{
                  background: 'linear-gradient(135deg, #14B8A6, #0D9488)',
                  boxShadow: '0 4px 24px rgba(20,184,166,0.22)',
                }}
              >
                {isLoading ? (
                  <span className="inline-flex items-center gap-2">
                    <MotionSpan
                      animate={{ rotate: 360 }}
                      transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                      className="inline-block h-4 w-4 rounded-full border-2 border-[#0C0D10]/40 border-t-[#0C0D10]"
                    />
                    Submitting...
                  </span>
                ) : (
                  'Submit Application'
                )}
              </button>
            </form>
          </MotionDiv>

          <MotionAside
            initial={{ opacity: 0, x: 28 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.08, ease: 'easeOut' }}
            className="card-glass hidden rounded-2xl border border-[#EEE6D8]/12 p-6 lg:flex lg:flex-col lg:justify-between"
          >
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-[#14B8A6]">Volunteer Roles</p>
              <h2 className="mt-3 text-2xl" style={DISPLAY_FONT}>
                Be part of something bigger.
              </h2>

              <div className="mt-6 space-y-0">
                {VOLUNTEER_TEAMS.map((team, index) => (
                  <div
                    key={index}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 0',
                      borderBottom: '0.5px solid rgba(255,255,255,0.05)',
                    }}
                  >
                    <div
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: '#14B8A6',
                        opacity: 0.6,
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ fontSize: '13px', color: 'rgba(238,230,216,0.65)' }}>
                      {team}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <p style={{ fontSize: '12px', color: 'rgba(238,230,216,0.4)', lineHeight: '1.65' }}>
              Team assignment is done by faculty after your application is reviewed and approved.
            </p>
          </MotionAside>
        </div>
      </main>
    </div>
  )
}
