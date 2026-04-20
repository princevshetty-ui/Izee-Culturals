import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { isValidRollNo, normalizeFullNameInput, normalizeRollNoInput } from '../utils/formValidation'
import PageTopBar from '../components/PageTopBar'

const DISPLAY_FONT = { fontFamily: 'Montage, Nevarademo, serif' }

const COURSES = ['BCA', 'BBA', 'BBA - Aviation']
const YEARS = ['1st', '2nd', '3rd']

const labelClass = 'block text-[11px] uppercase tracking-[0.16em] text-[#BEA35D]'
const inputBase =
  'mt-2 w-full rounded-lg border px-4 py-3 text-[#EEE6D8] placeholder:text-[rgba(238,230,216,0.3)] transition focus:outline-none'
const MotionDiv = motion.div
const MotionSpan = motion.span
const MotionAside = motion.aside

export default function ParticipantRegister() {
  const navigate = useNavigate()
  const location = useLocation()
  const locationState = location.state

  const selectedEvents = useMemo(() => locationState?.events || [], [locationState])
  const othersSelected = locationState?.othersSelected || false
  const othersText = locationState?.othersText || ''
  const selectedEventCount = selectedEvents.length

  useEffect(() => {
    if (!locationState || (selectedEventCount === 0 && !othersSelected)) {
      navigate('/participant/events', { replace: true })
    }
  }, [locationState, selectedEventCount, othersSelected, navigate])

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

    if (!validateForm()) return

    setIsLoading(true)

    try {
      const response = await fetch('/api/register/participant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          roll_no: formData.roll_no,
          course: formData.course,
          year: formData.year,
          email: formData.email,
          phone: formData.phone || '',
          events: selectedEvents.map((ev) => ({
            event_id: ev.id,
            event_name: ev.name,
            category_id: ev.categoryId || '',
            category_label: ev.categoryLabel || '',
            is_group: false,
          })),
          others_selected: othersSelected,
          others_description: othersText || null,
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        const registrationId = data?.data?.id
        if (!registrationId) {
          setApiError('Registration failed. No registration ID returned.')
          return
        }

        navigate(`/confirmation/participant/${registrationId}`, {
          state: {
            name: formData.name,
            pending: true,
            events: selectedEvents,
            othersSelected,
            othersText,
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
          'radial-gradient(900px circle at 16% 88%, rgba(178,34,52,0.14), transparent 60%), radial-gradient(700px circle at 82% 12%, rgba(190,163,93,0.07), transparent 62%), radial-gradient(1400px at 50% 50%, rgba(20,28,60,0.3), transparent 70%), #080910',
      }}
    >
      <PageTopBar
        breadcrumb="Home → Participant Registration → Participant Form"
        onBack={() => navigate('/participant/events')}
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
              Complete Registration
            </h1>
            <p className="mt-2 text-[#BEA35D]">Participant Details</p>

            {(selectedEvents.length > 0 || othersSelected) && (
              <div
                style={{
                  background: 'rgba(190,163,93,0.05)',
                  border: '0.5px solid rgba(190,163,93,0.2)',
                  borderRadius: '10px',
                  padding: '14px 16px',
                  marginBottom: '24px',
                  marginTop: '8px',
                }}
              >
                <p
                  style={{
                    fontSize: '10px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.14em',
                    color: 'rgba(190,163,93,0.7)',
                    fontFamily: 'system-ui, sans-serif',
                    marginBottom: '10px',
                  }}
                >
                  Selected Events
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {selectedEvents.map((ev) => (
                    <span
                      key={ev.id}
                      style={{
                        padding: '4px 12px',
                        borderRadius: '999px',
                        background: 'rgba(190,163,93,0.08)',
                        border: '0.5px solid rgba(190,163,93,0.25)',
                        color: '#BEA35D',
                        fontSize: '12px',
                        fontFamily: 'system-ui, sans-serif',
                      }}
                    >
                      {ev.type && ev.type.toLowerCase() !== 'solo' ? `${ev.name} · ${ev.type}` : ev.name}
                    </span>
                  ))}
                  {othersSelected && (
                    <span
                      style={{
                        padding: '4px 12px',
                        borderRadius: '999px',
                        background: 'rgba(190,163,93,0.08)',
                        border: '0.5px dashed rgba(190,163,93,0.25)',
                        color: 'rgba(190,163,93,0.8)',
                        fontSize: '12px',
                        fontFamily: 'system-ui, sans-serif',
                      }}
                    >
                      ✦ Others
                    </span>
                  )}
                </div>
                {othersSelected && othersText && (
                  <p
                    style={{
                      fontSize: '12px',
                      color: 'rgba(238,230,216,0.45)',
                      fontFamily: 'system-ui, sans-serif',
                      marginTop: '8px',
                      fontStyle: 'italic',
                    }}
                  >
                    "{othersText}"
                  </p>
                )}
              </div>
            )}

            {apiError && (
              <MotionDiv
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 rounded-xl border border-red-500/35 bg-red-500/12 p-4 text-sm text-red-400"
              >
                {apiError}
              </MotionDiv>
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
                  placeholder="Full Name (e.g., Vishesh Vandan)"
                  className={`${inputBase} ${
                    errors.name
                      ? 'border-red-500/60 focus:border-red-500'
                      : 'border-[rgba(238,230,216,0.12)] bg-[rgba(255,255,255,0.04)] focus:border-[rgba(190,163,93,0.5)] focus:shadow-[0_0_0_3px_rgba(190,163,93,0.08)]'
                  }`}
                />
                <p className="mt-1 text-[11px] text-[#EEE6D8]/42">Use full name with each word capitalized.</p>
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
                  maxLength={12}
                  className={`${inputBase} ${
                    errors.roll_no
                      ? 'border-red-500/60 focus:border-red-500'
                      : 'border-[rgba(238,230,216,0.12)] bg-[rgba(255,255,255,0.04)] focus:border-[rgba(190,163,93,0.5)] focus:shadow-[0_0_0_3px_rgba(190,163,93,0.08)]'
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
                        : 'border-[rgba(238,230,216,0.12)] bg-[rgba(255,255,255,0.04)] focus:border-[rgba(190,163,93,0.5)] focus:shadow-[0_0_0_3px_rgba(190,163,93,0.08)]'
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
                        : 'border-[rgba(238,230,216,0.12)] bg-[rgba(255,255,255,0.04)] focus:border-[rgba(190,163,93,0.5)] focus:shadow-[0_0_0_3px_rgba(190,163,93,0.08)]'
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
                      : 'border-[rgba(238,230,216,0.12)] bg-[rgba(255,255,255,0.04)] focus:border-[rgba(190,163,93,0.5)] focus:shadow-[0_0_0_3px_rgba(190,163,93,0.08)]'
                  }`}
                />
                {errors.email && <p className="mt-1.5 text-xs text-red-400">{errors.email}</p>}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="mt-8 w-full rounded-lg px-4 py-3 font-semibold text-[#0C0D10] transition hover:brightness-105 active:scale-[0.985] disabled:opacity-70"
                style={{
                  background: 'linear-gradient(135deg, #BEA35D, #A8893C)',
                  boxShadow: '0 4px 24px rgba(190,163,93,0.25)',
                }}
              >
                {isLoading ? (
                  <span className="inline-flex items-center gap-2">
                    <MotionSpan
                      animate={{ rotate: 360 }}
                      transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                      className="inline-block h-4 w-4 rounded-full border-2 border-[#0C0D10]/40 border-t-[#0C0D10]"
                    />
                    Registering...
                  </span>
                ) : (
                  'Register as Participant'
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
              <p className="text-[11px] uppercase tracking-[0.18em] text-[#BEA35D]">Stage Note</p>
              <h2 className="mt-3 text-2xl" style={DISPLAY_FONT}>
                "Two events.
                One stage."
              </h2>
            </div>
            <p className="mt-6 text-sm leading-relaxed text-[#EEE6D8]/62">
              Check your details once and submit with confidence.
            </p>
          </MotionAside>
        </div>
      </main>
    </div>
  )
}
