import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'

const DISPLAY_FONT = { fontFamily: 'Montage, Nevarademo, serif' }
const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '')
const apiUrl = (path) => `${API_BASE_URL}${path}`

const COURSES = ['BCA', 'BBA', 'B.Com']
const YEARS = ['1st', '2nd', '3rd']

const labelClass = 'block text-[11px] uppercase tracking-[0.16em] text-[#C9A84C]'
const inputBase =
  'mt-2 w-full rounded-lg border px-4 py-3 text-[#EEE6D8] placeholder:text-[rgba(238,230,216,0.3)] transition focus:outline-none'

export default function StudentRegister() {
  const navigate = useNavigate()
  const [rulesAccepted, setRulesAccepted] = useState(false)
  const [ruleChecked, setRuleChecked] = useState(false)

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
      const response = await fetch(apiUrl('/api/register/student'), {
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

  if (!rulesAccepted) {
    const rules = [
      {
        title: 'Zero Tolerance for Misconduct',
        text: 'Any student found engaging in fights, verbal altercations, or deliberate disturbances during the event will face immediate removal and strict disciplinary action by the institution.',
      },
      {
        title: 'Registration is Mandatory — No Exceptions',
        text: 'Unregistered students will be denied entry at the gate, no matter the reason. Walk-ins will not be entertained under any condition.',
      },
      {
        title: 'Use Your Own Personal Gmail ID',
        text: "Your event pass will be sent to the Gmail address you provide during registration. You must enter your own personal Gmail. If you submit someone else's email, your pass will not reach you.",
      },
      {
        title: 'Automated Verification After Submission',
        text: 'Once you submit your registration, our system will automatically verify the details. If any detail is found to be incorrect or falsified, your registration will be rejected and your pass will not be issued.',
      },
    ]

    return (
      <div
        style={{
          minHeight: '100vh',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          background:
            'radial-gradient(900px circle at 16% 88%, rgba(178,34,52,0.14), transparent 60%), radial-gradient(700px circle at 82% 12%, rgba(201,168,76,0.07), transparent 62%), radial-gradient(1400px at 50% 50%, rgba(20,28,60,0.3), transparent 70%), #080910',
        }}
      >
        <div
          style={{
            background: 'rgba(18, 19, 23, 0.85)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(190, 163, 93, 0.3)',
            borderRadius: '16px',
            padding: '40px',
            maxWidth: '640px',
            width: '90%',
            maxHeight: '80vh',
            overflowY: 'auto',
            color: 'white',
            boxShadow: '0 24px 80px rgba(0,0,0,0.45)',
          }}
        >
          <p
            style={{
              color: '#BEA35D',
              fontSize: '14px',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              marginBottom: '4px',
              fontWeight: 700,
            }}
          >
            IZee Got Talent 2026
          </p>
          <h1
            style={{
              color: 'white',
              fontSize: '22px',
              fontWeight: 600,
              marginBottom: '24px',
              lineHeight: 1.25,
            }}
          >
            Entry Rules & Code of Conduct
          </h1>

          <div
            style={{
              height: '1px',
              width: '100%',
              background: 'rgba(190, 163, 93, 0.55)',
              marginBottom: '24px',
            }}
          />

          <div style={{ display: 'grid', gap: '20px' }}>
            {rules.map((rule, index) => (
              <section key={rule.title}>
                <h2
                  style={{
                    color: '#BEA35D',
                    fontSize: '15px',
                    fontWeight: 700,
                    marginBottom: '8px',
                    lineHeight: 1.35,
                  }}
                >
                  {index + 1}. {rule.title}
                </h2>
                <p
                  style={{
                    color: 'rgba(255,255,255,0.78)',
                    fontSize: '14px',
                    lineHeight: 1.7,
                  }}
                >
                  {rule.text}
                </p>
              </section>
            ))}
          </div>

          <label
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              marginTop: '28px',
              color: 'white',
              fontSize: '14px',
              lineHeight: 1.5,
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={ruleChecked}
              onChange={(event) => setRuleChecked(event.target.checked)}
              style={{
                marginTop: '3px',
                width: '16px',
                height: '16px',
                accentColor: '#BEA35D',
                flexShrink: 0,
              }}
            />
            <span>I have read, understood, and agree to all the rules and conditions above.</span>
          </label>

          <button
            type="button"
            disabled={!ruleChecked}
            onClick={() => {
              if (ruleChecked) setRulesAccepted(true)
            }}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '8px',
              border: 'none',
              marginTop: '22px',
              fontWeight: 700,
              background: 'linear-gradient(135deg, #BEA35D, #8B6914)',
              color: '#111111',
              opacity: ruleChecked ? 1 : 0.4,
              cursor: ruleChecked ? 'pointer' : 'not-allowed',
            }}
          >
            Continue &rarr;
          </button>
        </div>
      </div>
    )
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
                      : 'border-[rgba(238,230,216,0.12)] bg-[rgba(255,255,255,0.04)] focus:border-[rgba(201,168,76,0.5)] focus:shadow-[0_0_0_3px_rgba(201,168,76,0.08)]'
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
                      : 'border-[rgba(238,230,216,0.12)] bg-[rgba(255,255,255,0.04)] focus:border-[rgba(201,168,76,0.5)] focus:shadow-[0_0_0_3px_rgba(201,168,76,0.08)]'
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
                        : 'border-[rgba(238,230,216,0.12)] bg-[rgba(255,255,255,0.04)] focus:border-[rgba(201,168,76,0.5)] focus:shadow-[0_0_0_3px_rgba(201,168,76,0.08)]'
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
                        : 'border-[rgba(238,230,216,0.12)] bg-[rgba(255,255,255,0.04)] focus:border-[rgba(201,168,76,0.5)] focus:shadow-[0_0_0_3px_rgba(201,168,76,0.08)]'
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
                      : 'border-[rgba(238,230,216,0.12)] bg-[rgba(255,255,255,0.04)] focus:border-[rgba(201,168,76,0.5)] focus:shadow-[0_0_0_3px_rgba(201,168,76,0.08)]'
                  }`}
                />
                {errors.email && <p className="mt-1.5 text-xs text-red-400">{errors.email}</p>}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="mt-8 w-full rounded-lg px-4 py-3 font-semibold text-[#0C0D10] transition hover:brightness-105 disabled:opacity-70"
                style={{
                  background: 'linear-gradient(135deg, #C9A84C, #A8893C)',
                  boxShadow: '0 4px 24px rgba(201,168,76,0.25)',
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
              <p className="text-[11px] uppercase tracking-[0.18em] text-[#C9A84C]">Festival Note</p>
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
