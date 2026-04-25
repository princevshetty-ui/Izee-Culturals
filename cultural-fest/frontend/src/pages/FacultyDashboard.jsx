import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { EVENTS } from '../data/events.js'
import { apiUrl } from '../utils/api.js'

const DISPLAY_FONT = { fontFamily: 'Nevarademo, serif' }

const STUDENT_COLUMNS = ['name', 'roll_no', 'course', 'year', 'email', 'qr_code', 'registered_at']
const PARTICIPANT_COLUMNS = ['name', 'roll_no', 'course', 'year', 'email', 'event_1', 'event_2', 'qr_code', 'registered_at']
const VOLUNTEER_COLUMNS = ['name', 'roll_no', 'course', 'year', 'email', 'team_label', 'qr_code', 'registered_at']
const GROUP_COLUMNS = ['group_name', 'event_name', 'name', 'roll_no', 'email', 'qr_code', 'registered_at']

const COLUMN_LABELS = {
  roll_no: 'Roll No',
  event_1: 'Event1',
  event_2: 'Event2',
  group_name: 'Team',
  event_name: 'Event',
  team_label: 'Team Assignment',
  qr_code: 'Status',
  registered_at: 'Registered At',
}

const EVENT_NAME_BY_ID = EVENTS.reduce((accumulator, event) => {
  accumulator[event.id] = event.name
  return accumulator
}, {})

const NAV_ITEMS = [
  { id: 'students', label: 'Students' },
  { id: 'participants', label: 'Participants' },
  { id: 'volunteers', label: 'Volunteers' },
  { id: 'groups', label: 'Groups' },
]

const DEFAULT_PAGE_SIZE = 25

const TAB_CONFIG = {
  students: {
    label: 'Students',
    listPath: '/api/faculty/students',
    approvePath: (id) => `/api/faculty/approve/student/${id}`,
    deletePath: (id) => `/api/faculty/student/${id}`,
    resendPath: (id) => `/api/faculty/resend/student/${id}`,
    exportPath: '/api/faculty/export/students',
    columns: STUDENT_COLUMNS,
    deleteMessage: 'Delete this student registration? This cannot be undone.',
    bulkDeleteMessage: (count) => `Delete ${count} selected student record(s)?`,
  },
  participants: {
    label: 'Participants',
    listPath: '/api/faculty/participants',
    approvePath: (id) => `/api/faculty/approve/participant/${id}`,
    deletePath: (id) => `/api/faculty/participant/${id}`,
    resendPath: (id) => `/api/faculty/resend/participant/${id}`,
    exportPath: '/api/faculty/export/participants',
    columns: PARTICIPANT_COLUMNS,
    deleteMessage: 'Delete this participant and linked event records? This cannot be undone.',
    bulkDeleteMessage: (count) => `Delete ${count} selected participant record(s) and linked events?`,
  },
  volunteers: {
    label: 'Volunteers',
    listPath: '/api/faculty/volunteers',
    approvePath: (id) => `/api/faculty/approve/volunteer/${id}`,
    deletePath: (id) => `/api/faculty/volunteer/${id}`,
    resendPath: (id) => `/api/faculty/resend/volunteer/${id}`,
    exportPath: '/api/faculty/export/volunteers',
    columns: VOLUNTEER_COLUMNS,
    deleteMessage: 'Delete this volunteer registration? This cannot be undone.',
    bulkDeleteMessage: (count) => `Delete ${count} selected volunteer record(s)?`,
  },
  groups: {
    label: 'Groups',
    listPath: '/api/faculty/groups',
    approvePath: (id) => `/api/faculty/approve/group/${id}`,
    deletePath: (id) => `/api/faculty/group/${id}`,
    resendPath: (id) => `/api/faculty/resend/group/${id}`,
    exportPath: '/api/faculty/export/groups',
    columns: GROUP_COLUMNS,
    deleteMessage: 'Delete this group registration and linked group members? This cannot be undone.',
    bulkDeleteMessage: (count) => `Delete ${count} selected group record(s) and linked members?`,
  },
}

const VOLUNTEER_TEAM_OPTIONS = [
  'Registration & Reception Team',
  'Program Coordination Team',
  'Discipline & Security Committee',
  'Hospitality & Welfare Team',
  'Technical Support Team',
]

function isRecordApproved(record) {
  return Boolean(record?.qr_code || record?.is_approved || record?.approved)
}

function titleCaseFromSnakeCase(value) {
  return value
    .split('_')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ')
}

function normalizeEvents(events) {
  if (!events) return []
  if (Array.isArray(events)) return events
  if (typeof events === 'string') {
    return events
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  }
  return []
}

function getApiErrorMessage(payload, fallback) {
  return payload?.detail || payload?.message || fallback
}

function ExportIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
      <path d="M10 2v9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="m6.8 8.8 3.2 3.4 3.2-3.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 14.5h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <rect x="3" y="14.5" width="14" height="3" rx="1.2" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  )
}

function UsersIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
      <path d="M16 11a3 3 0 1 0-2.9-3.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="10" cy="8" r="3" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4.5 18.2a5.5 5.5 0 0 1 11 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M15.8 14.8a4.8 4.8 0 0 1 3.7 3.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function PerformanceIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
      <rect x="4" y="5" width="16" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 15h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M8 11h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="17" cy="11" r="1" fill="currentColor" />
    </svg>
  )
}

function PendingIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 8v4l2.3 2.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ApprovedIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.5" />
      <path d="m8.6 12.4 2.3 2.2 4.5-4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function formatTimestamp(value) {
  if (!value) return '-'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)

  return date.toLocaleString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const SPOT_COURSES = ['BCA', 'BBA', 'B.Com']
const SPOT_YEARS = ['1st', '2nd', '3rd']

function SpotRegisterModal({ onClose, onSuccess, apiPassword }) {
  const [form, setForm] = useState({ name: '', roll_no: '', course: '', year: '', email: '' })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [apiError, setApiError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [checkingRoll, setCheckingRoll] = useState(false)

  // Check for duplicate roll number on blur
  const checkDuplicateRoll = async (rollNo) => {
    const cleaned = rollNo.trim().toUpperCase()
    if (!cleaned || cleaned.length < 4) return
    setCheckingRoll(true)
    try {
      const res = await fetch(
        apiUrl(`/api/faculty/students?page=1&page_size=5&search=${encodeURIComponent(cleaned)}`),
        { headers: { Authorization: `Bearer ${apiPassword}` } }
      )
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.success) {
        const match = (data.data || []).find(
          (s) => (s.roll_no || '').toUpperCase() === cleaned
        )
        if (match) {
          setErrors((prev) => ({ ...prev, roll_no: `Already registered: ${match.name}` }))
        }
      }
    } catch {
      // silently ignore — backend will catch on submit
    } finally {
      setCheckingRoll(false)
    }
  }

  const validate = () => {
    const e = {}
    if (!form.name.trim()) e.name = 'Required'
    if (!form.roll_no.trim()) e.roll_no = 'Required'
    else if (errors.roll_no && errors.roll_no.startsWith('Already')) e.roll_no = errors.roll_no
    if (!form.course) e.course = 'Required'
    if (!form.year) e.year = 'Required'
    if (!form.email.trim()) e.email = 'Required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((p) => ({ ...p, [name]: value }))
    if (name === 'roll_no') setErrors((p) => ({ ...p, roll_no: '' }))
    else if (errors[name]) setErrors((p) => ({ ...p, [name]: '' }))
  }

  const handleRollBlur = () => {
    if (form.roll_no.trim()) checkDuplicateRoll(form.roll_no)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setApiError('')
    setSuccessMsg('')
    if (!validate()) return
    setLoading(true)
    try {
      // Step 1: Register student via public endpoint
      const regRes = await fetch(apiUrl('/api/register/student'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const regData = await regRes.json()
      if (!regRes.ok || !regData.success) {
        setApiError(regData.message || 'Registration failed. Please try again.')
        setLoading(false)
        return
      }
      const studentId = regData.data?.id
      if (!studentId) {
        setApiError('Registration succeeded but no ID returned.')
        setLoading(false)
        return
      }
      // Step 2: Immediately approve using faculty credentials
      const approveRes = await fetch(apiUrl(`/api/faculty/approve/student/${studentId}`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiPassword}` },
      })
      const approveData = await approveRes.json().catch(() => ({}))
      if (!approveRes.ok || !approveData.success) {
        setSuccessMsg(`✓ ${form.name} registered. Auto-approval failed — please approve manually.`)
      } else {
        const emailNote = approveData.data?.email_sent ? ' Pass sent to email.' : ''
        setSuccessMsg(`✓ ${form.name} registered & approved!${emailNote}`)
      }
      setForm({ name: '', roll_no: '', course: '', year: '', email: '' })
      setErrors({})
      onSuccess()
    } catch {
      setApiError('Network error. Please check your connection.')
    } finally {
      setLoading(false)
    }
  }

  const fieldStyle = (hasErr) => ({
    width: '100%',
    background: 'rgba(255,255,255,0.04)',
    border: `1px solid ${hasErr ? 'rgba(239,68,68,0.6)' : 'rgba(238,230,216,0.12)'}`,
    borderRadius: '8px',
    padding: '10px 14px',
    color: '#EEE6D8',
    fontSize: '13px',
    outline: 'none',
    marginTop: '6px',
    boxSizing: 'border-box',
  })

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.72)',
        backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        style={{
          background: 'rgba(13,14,18,0.98)',
          border: '1px solid rgba(201,168,76,0.25)',
          borderRadius: '16px',
          padding: '32px',
          width: '100%',
          maxWidth: '480px',
          boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span style={{ fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#C9A84C' }}>
            Faculty Console
          </span>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'rgba(238,230,216,0.4)', fontSize: '20px', cursor: 'pointer', lineHeight: 1 }}
          >×</button>
        </div>
        <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#EEE6D8', marginBottom: '6px', marginTop: '4px' }}>
          Register &amp; Approve
        </h2>
        <p style={{ fontSize: '12px', color: 'rgba(238,230,216,0.45)', marginBottom: '20px' }}>
          Student will be registered and approved instantly.
        </p>

        {apiError && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', color: '#f87171', fontSize: '13px' }}>
            {apiError}
          </div>
        )}
        {successMsg && (
          <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', color: '#4ade80', fontSize: '13px' }}>
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C9A84C' }}>Full Name</label>
            <input name="name" value={form.name} onChange={handleChange} placeholder="Student full name" style={fieldStyle(errors.name)} />
            {errors.name && <p style={{ color: '#f87171', fontSize: '11px', marginTop: '4px' }}>{errors.name}</p>}
          </div>

          <div>
            <label style={{ fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C9A84C' }}>
              Roll No
              {checkingRoll && <span style={{ marginLeft: '8px', color: 'rgba(238,230,216,0.35)', fontWeight: 400, textTransform: 'none', letterSpacing: 0, fontSize: '10px' }}>checking…</span>}
            </label>
            <input
              name="roll_no"
              value={form.roll_no}
              onChange={handleChange}
              onBlur={handleRollBlur}
              placeholder="e.g. U03EX24S0091"
              style={fieldStyle(errors.roll_no)}
              autoComplete="off"
            />
            {errors.roll_no && (
              <p style={{ color: errors.roll_no.startsWith('Already') ? '#fb923c' : '#f87171', fontSize: '11px', marginTop: '4px' }}>
                {errors.roll_no.startsWith('Already') ? '⚠ ' : ''}{errors.roll_no}
              </p>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C9A84C' }}>Course</label>
              <select name="course" value={form.course} onChange={handleChange} className="dash-select" style={fieldStyle(errors.course)}>
                <option value="">Select</option>
                {SPOT_COURSES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              {errors.course && <p style={{ color: '#f87171', fontSize: '11px', marginTop: '4px' }}>{errors.course}</p>}
            </div>
            <div>
              <label style={{ fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C9A84C' }}>Year</label>
              <select name="year" value={form.year} onChange={handleChange} className="dash-select" style={fieldStyle(errors.year)}>
                <option value="">Select</option>
                {SPOT_YEARS.map((y) => <option key={y} value={y}>{y} Year</option>)}
              </select>
              {errors.year && <p style={{ color: '#f87171', fontSize: '11px', marginTop: '4px' }}>{errors.year}</p>}
            </div>
          </div>

          <div>
            <label style={{ fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C9A84C' }}>Email</label>
            <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="student@gmail.com" style={fieldStyle(errors.email)} />
            {errors.email && <p style={{ color: '#f87171', fontSize: '11px', marginTop: '4px' }}>{errors.email}</p>}
          </div>

          <button
            type="submit"
            disabled={loading || checkingRoll || (errors.roll_no && errors.roll_no.startsWith('Already'))}
            style={{
              marginTop: '4px',
              width: '100%',
              padding: '12px',
              borderRadius: '8px',
              border: 'none',
              background: (loading || checkingRoll || (errors.roll_no && errors.roll_no.startsWith('Already')))
                ? 'rgba(201,168,76,0.3)'
                : 'linear-gradient(135deg,#C9A84C,#A8893C)',
              color: '#0C0D10',
              fontWeight: 700,
              fontSize: '13px',
              cursor: (loading || checkingRoll || (errors.roll_no && errors.roll_no.startsWith('Already'))) ? 'not-allowed' : 'pointer',
              letterSpacing: '0.05em',
            }}
          >
            {loading ? 'Registering & Approving…' : checkingRoll ? 'Checking…' : 'Register & Approve'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function FacultyDashboard() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('students')
  const [showSpotRegister, setShowSpotRegister] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [facultyPassword, setFacultyPassword] = useState('')
  const [records, setRecords] = useState([])
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalParticipants: 0,
    totalVolunteers: 0,
    totalGroups: 0,
    pendingApprovals: 0,
    approvedToday: 0,
  })

  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [infoMessage, setInfoMessage] = useState('')
  const [isExporting, setIsExporting] = useState(false)
  const [approvingId, setApprovingId] = useState('')
  const [deletingId, setDeletingId] = useState('')
  const [resendingId, setResendingId] = useState('')
  const [assigningTeamId, setAssigningTeamId] = useState('')
  const [bulkAction, setBulkAction] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const [registrationConfig, setRegistrationConfig] = useState({
    student_open: true,
    participant_open: true,
    volunteer_open: true,
  })
  const [configLoadingKey, setConfigLoadingKey] = useState('')

  const [selectedCourse, setSelectedCourse] = useState('all')
  const [selectedYear, setSelectedYear] = useState('all')
  const [selectedEvent, setSelectedEvent] = useState('all')
  const [nameSearch, setNameSearch] = useState('')
  const [sortKey, setSortKey] = useState('registered_desc')
  const [pageByTab, setPageByTab] = useState({ students: 1, participants: 1 })
  const [paginationByTab, setPaginationByTab] = useState({
    students: { page: 1, pageSize: DEFAULT_PAGE_SIZE, total: 0, totalPages: 1 },
    participants: { page: 1, pageSize: DEFAULT_PAGE_SIZE, total: 0, totalPages: 1 },
  })
  const [selectedIds, setSelectedIds] = useState([])

  const currentTabConfig = TAB_CONFIG[activeTab] || TAB_CONFIG.students
  const activePage = pageByTab[activeTab] || 1
  const currentPagination =
    paginationByTab[activeTab] ||
    { page: 1, pageSize: DEFAULT_PAGE_SIZE, total: 0, totalPages: 1 }

  const updateAuthFailure = () => {
    sessionStorage.removeItem('authenticated')
    sessionStorage.removeItem('facultyPassword')
    navigate('/faculty/login', { replace: true })
  }

  const fetchFacultyList = async (endpoint) => {
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      const response = await fetch(apiUrl(endpoint), {
        headers: {
          Authorization: `Bearer ${facultyPassword}`,
        },
      })

      if (response.status === 401) {
        throw new Error('AUTH_UNAUTHORIZED')
      }

      const payload = await response.json().catch(() => ({}))

      if (response.ok && payload?.success) {
        return {
          records: payload.data || [],
          pagination: payload.pagination || null,
          summary: payload.summary || null,
        }
      }

      const isServerError = response.status >= 500
      if (isServerError && attempt < 2) {
        await new Promise((resolve) => setTimeout(resolve, 250))
        continue
      }

      throw new Error(getApiErrorMessage(payload, 'Failed to fetch dashboard data'))
    }

    return {
      records: [],
      pagination: null,
      summary: null,
    }
  }

  useEffect(() => {
    const isAuthenticated = sessionStorage.getItem('authenticated') === 'true'
    const storedPassword = sessionStorage.getItem('facultyPassword') || ''

    if (!isAuthenticated || !storedPassword) {
      navigate('/faculty/login', { replace: true })
      return
    }

    setFacultyPassword(storedPassword)
  }, [navigate])

  useEffect(() => {
    if (!facultyPassword) return

    const fetchRegistrationConfig = async () => {
      try {
        const response = await fetch(apiUrl('/api/config/registrations'))
        const payload = await response.json().catch(() => ({}))
        if (response.ok && payload?.success && payload.data) {
          setRegistrationConfig({
            student_open: Boolean(payload.data.student_open),
            participant_open: Boolean(payload.data.participant_open),
            volunteer_open: Boolean(payload.data.volunteer_open),
          })
        }
      } catch (error) {
        // Keep dashboard usable if config fetch fails.
      }
    }

    fetchRegistrationConfig()
  }, [facultyPassword])

  useEffect(() => {
    setRecords([])
    setSelectedCourse('all')
    setSelectedYear('all')
    setSelectedEvent('all')
    setNameSearch('')
    setSelectedIds([])
    setInfoMessage('')
    setErrorMessage('')
  }, [activeTab])

  useEffect(() => {
    if (!facultyPassword) return
    let isCurrentRequest = true

    const fetchDashboardData = async () => {
      setIsLoading(true)
      setErrorMessage('')

      try {
        const buildEndpoint = (tabId, page = 1, pageSize = DEFAULT_PAGE_SIZE, searchTerm = '') => {
          let url = `${TAB_CONFIG[tabId].listPath}?page=${page}&page_size=${pageSize}`
          if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`
          return url
        }

        const tabIds = NAV_ITEMS.map((item) => item.id)
        const summaryResults = await Promise.all(
          tabIds.map((tabId) =>
            fetchFacultyList(buildEndpoint(
              tabId,
              tabId === activeTab ? activePage : 1,
              tabId === activeTab ? DEFAULT_PAGE_SIZE : 5,
              tabId === activeTab ? nameSearch : '',
            ))
          )
        )
        const resultByTab = tabIds.reduce((accumulator, tabId, index) => {
          accumulator[tabId] = summaryResults[index]
          return accumulator
        }, {})

        const currentResult = resultByTab[activeTab] || { records: [], pagination: null, summary: null }

        const currentRecords = currentResult.records || []
        const studentsSummary = resultByTab.students?.summary || {}
        const participantsSummary = resultByTab.participants?.summary || {}
        const volunteersSummary = resultByTab.volunteers?.summary || {}
        const groupsSummary = resultByTab.groups?.summary || {}

        const nextPage = currentResult.pagination?.page || activePage

        if (!isCurrentRequest) return

        setRecords(currentRecords)
        setSelectedIds([])
        setStats({
          totalStudents: Number(studentsSummary.total || 0),
          totalParticipants: Number(participantsSummary.total || 0),
          totalVolunteers: Number(volunteersSummary.total || 0),
          totalGroups: Number(groupsSummary.total || 0),
          pendingApprovals:
            Number(studentsSummary.pending || 0) +
            Number(participantsSummary.pending || 0) +
            Number(volunteersSummary.pending_count || volunteersSummary.pending || 0) +
            Number(groupsSummary.pending_count || groupsSummary.pending || 0),
          approvedToday:
            Number(studentsSummary.approved_today || 0) +
            Number(participantsSummary.approved_today || 0) +
            Number(volunteersSummary.approved_today || 0) +
            Number(groupsSummary.approved_today || 0),
        })

        setPaginationByTab((previous) => ({
          ...previous,
          [activeTab]: {
            page: nextPage,
            pageSize: currentResult.pagination?.page_size || DEFAULT_PAGE_SIZE,
            total: currentResult.pagination?.total || 0,
            totalPages: currentResult.pagination?.total_pages || 1,
          },
        }))

        if (nextPage !== activePage) {
          setPageByTab((previous) => ({ ...previous, [activeTab]: nextPage }))
        }
      } catch (error) {
        if (!isCurrentRequest) return

        if (error?.message === 'AUTH_UNAUTHORIZED') {
          updateAuthFailure()
          return
        }

        setErrorMessage(error.message || 'Unable to fetch data')
        setRecords([])
      } finally {
        if (isCurrentRequest) setIsLoading(false)
      }
    }

    fetchDashboardData()

    return () => {
      isCurrentRequest = false
    }
  }, [activeTab, activePage, facultyPassword, refreshKey, nameSearch])

  useEffect(() => {
    setPageByTab((previous) => ({ ...previous, [activeTab]: 1 }))
  }, [nameSearch, activeTab])

  const courseOptions = useMemo(() => {
    return [...new Set(records.map((record) => record.course).filter(Boolean))]
  }, [records])

  const yearOptions = useMemo(() => {
    return [...new Set(records.map((record) => record.year).filter(Boolean))]
  }, [records])

  const eventOptions = useMemo(() => {
    if (activeTab !== 'participants' && activeTab !== 'groups') return []

    const uniqueEvents = new Set()
    records.forEach((record) => {
      if (activeTab === 'groups') {
        if (record.event_name || record.event_id) uniqueEvents.add(record.event_name || record.event_id)
        return
      }
      normalizeEvents(record.events).forEach((eventId) => uniqueEvents.add(eventId))
    })

    return [...uniqueEvents]
  }, [activeTab, records])

  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      if (selectedCourse !== 'all' && record.course !== selectedCourse) return false
      if (selectedYear !== 'all' && record.year !== selectedYear) return false

      if (activeTab === 'participants' && selectedEvent !== 'all') {
        const eventIds = normalizeEvents(record.events)
        if (!eventIds.includes(selectedEvent)) return false
      }

      if (activeTab === 'groups' && selectedEvent !== 'all') {
        if ((record.event_name || record.event_id) !== selectedEvent) return false
      }

      return true
    })
  }, [records, activeTab, selectedCourse, selectedYear, selectedEvent])

  const sortedRecords = useMemo(() => {
    const output = [...filteredRecords]

    output.sort((left, right) => {
      if (sortKey === 'name_asc') {
        return String(left.name || '').localeCompare(String(right.name || ''), undefined, { sensitivity: 'base' })
      }

      if (sortKey === 'name_desc') {
        return String(right.name || '').localeCompare(String(left.name || ''), undefined, { sensitivity: 'base' })
      }

      if (sortKey === 'course_asc') {
        return String(left.course || '').localeCompare(String(right.course || ''), undefined, { sensitivity: 'base' })
      }

      const leftTs = new Date(left.registered_at || 0).getTime()
      const rightTs = new Date(right.registered_at || 0).getTime()

      if (sortKey === 'registered_asc') return leftTs - rightTs
      return rightTs - leftTs
    })

    return output
  }, [filteredRecords, sortKey])

  const columns = currentTabConfig.columns
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds])
  const visibleIds = useMemo(() => sortedRecords.map((record) => record.id), [sortedRecords])
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedSet.has(id))

  const selectedPendingIds = useMemo(() => {
    return sortedRecords
      .filter((record) => selectedSet.has(record.id) && !isRecordApproved(record))
      .map((record) => record.id)
  }, [sortedRecords, selectedSet])

  const isBusy =
    isLoading ||
    isExporting ||
    Boolean(approvingId) ||
    Boolean(deletingId) ||
    Boolean(resendingId) ||
    Boolean(assigningTeamId) ||
    Boolean(bulkAction)

  const approveRecordById = async (recordId) => {
    const endpoint = currentTabConfig.approvePath(recordId)

    const response = await fetch(apiUrl(endpoint), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${facultyPassword}`,
      },
    })

    if (response.status === 401) {
      updateAuthFailure()
      return { ok: false, unauthorized: true }
    }

    const payload = await response.json().catch(() => ({}))
    if (!response.ok || !payload.success) {
      return { ok: false, message: getApiErrorMessage(payload, 'Approval failed') }
    }

    return { ok: true, emailSent: payload.data?.email_sent }
  }

  const deleteRecordById = async (recordId) => {
    const endpoint = currentTabConfig.deletePath(recordId)

    const response = await fetch(apiUrl(endpoint), {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${facultyPassword}`,
      },
    })

    if (response.status === 401) {
      updateAuthFailure()
      return { ok: false, unauthorized: true }
    }

    const payload = await response.json().catch(() => ({}))
    if (!response.ok || !payload.success) {
      return { ok: false, message: getApiErrorMessage(payload, 'Delete failed') }
    }

    return { ok: true }
  }

  const resendMailById = async (recordId) => {
    const response = await fetch(apiUrl(currentTabConfig.resendPath(recordId)), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${facultyPassword}`,
      },
    })

    if (response.status === 401) {
      updateAuthFailure()
      return { ok: false, unauthorized: true }
    }

    const payload = await response.json().catch(() => ({}))
    if (!response.ok || !payload.success) {
      return { ok: false, message: getApiErrorMessage(payload, 'Resend failed') }
    }

    return { ok: true }
  }

  const assignVolunteerTeamById = async (recordId, teamLabel) => {
    const response = await fetch(apiUrl(`/api/faculty/volunteer/${recordId}/assign-team`), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${facultyPassword}`,
      },
      body: JSON.stringify({ team_label: teamLabel }),
    })

    if (response.status === 401) {
      updateAuthFailure()
      return { ok: false, unauthorized: true }
    }

    const payload = await response.json().catch(() => ({}))
    if (!response.ok || !payload.success) {
      return { ok: false, message: getApiErrorMessage(payload, 'Team assignment failed') }
    }

    return { ok: true, passUpdated: payload.data?.pass_updated }
  }

  const handleExport = async () => {
    setIsExporting(true)
    setErrorMessage('')
    setInfoMessage('')

    try {
      const exportEndpoint = currentTabConfig.exportPath

      const response = await fetch(apiUrl(exportEndpoint), {
        headers: {
          Authorization: `Bearer ${facultyPassword}`,
        },
      })

      if (response.status === 401) {
        updateAuthFailure()
        return
      }

      if (!response.ok) {
        throw new Error('CSV export failed')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `${activeTab}_report.csv`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      window.URL.revokeObjectURL(url)
      setInfoMessage('CSV exported successfully')
    } catch (error) {
      setErrorMessage(error.message || 'CSV export failed')
    } finally {
      setIsExporting(false)
    }
  }

  const handleLogout = () => {
    sessionStorage.removeItem('authenticated')
    sessionStorage.removeItem('facultyPassword')
    navigate('/faculty/login', { replace: true })
  }

  const handleApproveOne = async (recordId) => {
    setApprovingId(recordId)
    setErrorMessage('')
    setInfoMessage('')

    try {
      const result = await approveRecordById(recordId)
      if (!result.ok) {
        if (!result.unauthorized) setErrorMessage(result.message || 'Approval failed')
        return
      }

      if (activeTab === 'students') {
        setInfoMessage(result.emailSent ? 'Student approved and email sent.' : 'Student approved.')
      } else if (activeTab === 'participants') {
        setInfoMessage('Participant approved successfully.')
      } else if (activeTab === 'volunteers') {
        setInfoMessage('Volunteer approved successfully.')
      } else {
        setInfoMessage('Group approved successfully.')
      }

      setRefreshKey((previous) => previous + 1)
    } catch (error) {
      setErrorMessage(error.message || 'Approval failed')
    } finally {
      setApprovingId('')
    }
  }

  const handleDeleteOne = async (recordId) => {
    const confirmationText = currentTabConfig.deleteMessage

    if (!window.confirm(confirmationText)) return

    setDeletingId(recordId)
    setErrorMessage('')
    setInfoMessage('')

    try {
      const result = await deleteRecordById(recordId)
      if (!result.ok) {
        if (!result.unauthorized) setErrorMessage(result.message || 'Delete failed')
        return
      }

      setInfoMessage('Record deleted successfully.')
      setRefreshKey((previous) => previous + 1)
    } catch (error) {
      setErrorMessage(error.message || 'Delete failed')
    } finally {
      setDeletingId('')
    }
  }

  const handleResendMail = async (recordId) => {
    setResendingId(recordId)
    setErrorMessage('')
    setInfoMessage('')

    try {
      const result = await resendMailById(recordId)
      if (!result.ok) {
        if (!result.unauthorized) setErrorMessage(result.message || 'Resend failed')
        return
      }

      setInfoMessage('Approval email resent successfully.')
    } catch (error) {
      setErrorMessage(error.message || 'Resend failed')
    } finally {
      setResendingId('')
    }
  }

  const handleAssignVolunteerTeam = async (recordId, teamLabel) => {
    if (!teamLabel) return
    setAssigningTeamId(recordId)
    setErrorMessage('')
    setInfoMessage('')

    try {
      const result = await assignVolunteerTeamById(recordId, teamLabel)
      if (!result.ok) {
        if (!result.unauthorized) setErrorMessage(result.message || 'Team assignment failed')
        return
      }

      setInfoMessage(result.passUpdated ? 'Team assigned and volunteer pass updated.' : 'Team assigned successfully.')
      setRefreshKey((previous) => previous + 1)
    } catch (error) {
      setErrorMessage(error.message || 'Team assignment failed')
    } finally {
      setAssigningTeamId('')
    }
  }

  const handleSelectRow = (id) => {
    setSelectedIds((previous) =>
      previous.includes(id)
        ? previous.filter((selectedId) => selectedId !== id)
        : [...previous, id]
    )
  }

  const handleSelectAllVisible = () => {
    setSelectedIds((previous) => {
      const merged = new Set([...previous, ...visibleIds])
      return [...merged]
    })
  }

  const handleUnselectAllVisible = () => {
    const visibleSet = new Set(visibleIds)
    setSelectedIds((previous) => previous.filter((id) => !visibleSet.has(id)))
  }

  const handleToggleSelectAll = () => {
    if (allVisibleSelected) {
      handleUnselectAllVisible()
    } else {
      handleSelectAllVisible()
    }
  }

  const handleApproveSelected = async () => {
    if (selectedPendingIds.length === 0) {
      setInfoMessage('No pending selected records to approve.')
      return
    }

    setBulkAction('approving')
    setErrorMessage('')
    setInfoMessage('')

    let successCount = 0
    let mailCount = 0
    const failedIds = []

    for (const recordId of selectedPendingIds) {
      try {
        const result = await approveRecordById(recordId)
        if (result.ok) {
          successCount += 1
          if (activeTab === 'students' && result.emailSent) mailCount += 1
        } else if (!result.unauthorized) {
          failedIds.push(recordId)
        }
      } catch (error) {
        failedIds.push(recordId)
      }
    }

    setBulkAction('')

    if (failedIds.length > 0) {
      setErrorMessage(`Approved ${successCount}. Failed for ${failedIds.length} record(s).`)
    } else if (activeTab === 'students') {
      setInfoMessage(`Approved ${successCount} student(s). Emails sent: ${mailCount}.`)
    } else {
      setInfoMessage(`Approved ${successCount} ${currentTabConfig.label.toLowerCase()} record(s).`)
    }

    setRefreshKey((previous) => previous + 1)
  }

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) {
      setInfoMessage('No selected records to delete.')
      return
    }

    const confirmationText = currentTabConfig.bulkDeleteMessage(selectedIds.length)

    if (!window.confirm(confirmationText)) return

    setBulkAction('deleting')
    setErrorMessage('')
    setInfoMessage('')

    const removedIds = []
    const failedIds = []

    for (const recordId of selectedIds) {
      try {
        const result = await deleteRecordById(recordId)
        if (result.ok) {
          removedIds.push(recordId)
        } else if (!result.unauthorized) {
          failedIds.push(recordId)
        }
      } catch (error) {
        failedIds.push(recordId)
      }
    }

    setBulkAction('')

    if (failedIds.length > 0) {
      setErrorMessage(`Deleted ${removedIds.length}. Failed for ${failedIds.length} record(s).`)
    } else {
      setInfoMessage(`Deleted ${removedIds.length} record(s) successfully.`)
    }

    setRefreshKey((previous) => previous + 1)
  }

  const clearFilters = () => {
    setSelectedCourse('all')
    setSelectedYear('all')
    setSelectedEvent('all')
    setNameSearch('')
    setSortKey('registered_desc')
  }

  const handleToggleRegistration = async (key) => {
    const nextValue = !registrationConfig[key]
    setConfigLoadingKey(key)
    setErrorMessage('')
    setInfoMessage('')

    try {
      const response = await fetch(apiUrl('/api/faculty/config/registrations'), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${facultyPassword}`,
        },
        body: JSON.stringify({ [key]: nextValue }),
      })

      if (response.status === 401) {
        updateAuthFailure()
        return
      }

      const payload = await response.json().catch(() => ({}))
      if (!response.ok || !payload.success) {
        throw new Error(getApiErrorMessage(payload, 'Unable to update registration setting'))
      }

      setRegistrationConfig((previous) => ({ ...previous, ...payload.data }))
      setInfoMessage('Registration setting updated.')
    } catch (error) {
      setErrorMessage(error.message || 'Unable to update registration setting')
    } finally {
      setConfigLoadingKey('')
    }
  }

  const handlePrevPage = () => {
    if (currentPagination.page <= 1 || isBusy) return
    setPageByTab((previous) => ({
      ...previous,
      [activeTab]: Math.max(1, (previous[activeTab] || 1) - 1),
    }))
  }

  const handleNextPage = () => {
    if (currentPagination.page >= currentPagination.totalPages || isBusy) return
    setPageByTab((previous) => ({
      ...previous,
      [activeTab]: Math.min(currentPagination.totalPages, (previous[activeTab] || 1) + 1),
    }))
  }

  const selectStyle = {
    height: '34px',
    background: 'rgba(255,255,255,0.04)',
    border: '0.5px solid rgba(255,255,255,0.1)',
    borderRadius: '6px',
    color: '#EEE6D8',
    fontSize: '12px',
    padding: '0 12px',
  }

  const getColumnMinWidth = (column) => {
    if (column === 'name') return 140
    if (column === 'roll_no') return 150
    if (column === 'course') return 80
    if (column === 'year') return 70
    if (column === 'email') return 200
    if (column === 'group_name') return 160
    if (column === 'event_name') return 150
    if (column === 'team_label') return 210
    if (column === 'event_1') return 130
    if (column === 'event_2') return 130
    if (column === 'qr_code') return 100
    if (column === 'registered_at') return 160
    return 110
  }

  return (
    <div className="min-h-screen bg-[#080910] text-[#EEE6D8]">
      <style>{`
        .dash-checkbox {
          appearance: none;
          -webkit-appearance: none;
          width: 15px;
          height: 15px;
          border: 1px solid rgba(255,255,255,0.18);
          border-radius: 4px;
          background: transparent;
          cursor: pointer;
          transition: all 150ms ease;
        }

        .dash-checkbox:checked {
          background: rgba(201,168,76,0.22);
          border-color: rgba(201,168,76,0.6);
          box-shadow: inset 0 0 0 2px rgba(201,168,76,0.18);
        }

        .dash-select {
          appearance: none;
          -webkit-appearance: none;
          -moz-appearance: none;
          background-image:
            linear-gradient(45deg, transparent 50%, rgba(238,230,216,0.55) 50%),
            linear-gradient(135deg, rgba(238,230,216,0.55) 50%, transparent 50%);
          background-position:
            calc(100% - 14px) calc(50% - 2px),
            calc(100% - 9px) calc(50% - 2px);
          background-size: 5px 5px, 5px 5px;
          background-repeat: no-repeat;
          padding-right: 28px;
        }

        .dash-select:focus {
          border-color: rgba(201,168,76,0.45) !important;
          outline: none;
          box-shadow: 0 0 0 2px rgba(201,168,76,0.06);
        }

        .dash-select option {
          background: #0D0E12;
          color: #EEE6D8;
        }

        .dash-row {
          transition: background 150ms ease;
        }

        .dash-row:hover {
          background: rgba(201,168,76,0.04) !important;
        }

        .dash-row-even {
          background: rgba(255,255,255,0.012);
        }

        .dash-sidebar {
          transform: translateX(-100%);
        }

        @keyframes shimmer-sweep {
          0% { background-position: -400px 0; }
          100% { background-position: 400px 0; }
        }

        .skel-bar {
          background: linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.09) 50%, rgba(255,255,255,0.04) 75%);
          background-size: 400px 100%;
          animation: shimmer-sweep 1.6s ease-in-out infinite;
          border-radius: 6px;
        }

        @media (min-width: 640px) {
          .dash-sidebar {
            transform: translateX(0) !important;
          }
        }

        .dash-sidebar-open {
          transform: translateX(0) !important;
        }
      `}</style>

      <div className="flex min-h-screen relative">
        {/* Mobile sidebar overlay backdrop */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 sm:hidden"
            style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(2px)' }}
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar — fixed drawer on mobile, sticky column on desktop */}
        <aside
          className={`fixed sm:sticky top-0 h-screen w-[240px] sm:w-[220px] flex-shrink-0 z-50 sm:z-auto flex flex-col transition-transform duration-300 dash-sidebar${sidebarOpen ? ' dash-sidebar-open' : ''}`}
          style={{
            background: 'rgba(8,9,16,0.98)',
            borderRight: '0.5px solid rgba(201,168,76,0.1)',
            boxShadow: '4px 0 32px rgba(0,0,0,0.4)',
          }}
        >
          <div className="flex flex-col h-full overflow-y-auto">
          <div className="px-4 pt-5 pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src="/college-logo.png"
                  alt="College Logo"
                  style={{ height: '44px', width: 'auto', objectFit: 'contain', filter: 'drop-shadow(0 0 8px rgba(201,168,76,0.25))' }}
                />
              </div>
              <button
                type="button"
                className="sm:hidden"
                onClick={() => setSidebarOpen(false)}
                style={{ background: 'none', border: 'none', color: 'rgba(238,230,216,0.5)', fontSize: '20px', cursor: 'pointer', lineHeight: 1 }}
              >×</button>
            </div>
            <p className="mt-3 text-[9px] uppercase tracking-[0.22em]" style={{ color: 'rgba(201,168,76,0.55)' }}>
              Faculty Console
            </p>
            <div className="mt-3 h-px w-full" style={{ background: 'linear-gradient(90deg, rgba(201,168,76,0.4) 0%, rgba(201,168,76,0.05) 100%)' }} />
          </div>

          <nav className="mt-4">
            {NAV_ITEMS.map((item) => {
              const isActive = activeTab === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => { setActiveTab(item.id); setSidebarOpen(false) }}
                  className="flex h-10 w-full items-center gap-2 px-4 text-left text-[13px] tracking-[0.04em] transition"
                  style={{
                    color: isActive ? '#C9A84C' : 'rgba(238,230,216,0.55)',
                    background: isActive ? 'rgba(201,168,76,0.09)' : 'transparent',
                    borderLeft: isActive ? '2px solid #C9A84C' : '2px solid transparent',
                    fontWeight: isActive ? 500 : 400,
                  }}
                  onMouseEnter={(event) => {
                    if (!isActive) event.currentTarget.style.background = 'rgba(255,255,255,0.04)'
                  }}
                  onMouseLeave={(event) => {
                    if (!isActive) event.currentTarget.style.background = 'transparent'
                  }}
                >
                  {item.id === 'students' ? (
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" aria-hidden="true">
                      <circle cx="12" cy="8" r="3" stroke="currentColor" strokeWidth="1.7" />
                      <path d="M5.5 19a6.5 6.5 0 0 1 13 0" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                    </svg>
                  ) : item.id === 'participants' ? (
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" aria-hidden="true">
                      <path d="M7 6h10v2a5 5 0 0 1-10 0V6Z" stroke="currentColor" strokeWidth="1.7" />
                      <path d="M9 17h6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                      <path d="M12 13v4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                    </svg>
                  ) : item.id === 'volunteers' ? (
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" aria-hidden="true">
                      <path d="M12 3 5 6v5c0 4.2 2.8 7.4 7 9 4.2-1.6 7-4.8 7-9V6l-7-3Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
                      <path d="m9 12 2 2 4-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" aria-hidden="true">
                      <path d="M4 18V8l8-4 8 4v10" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
                      <path d="M8 18v-5h8v5" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
                    </svg>
                  )}
                  <span>{item.label}</span>
                </button>
              )
            })}
          </nav>

          <nav className="mt-auto px-4 pb-4 pt-2">
            <div className="mb-3 h-px w-full bg-[rgba(255,255,255,0.06)]" />
            <button
              type="button"
              onClick={handleExport}
              disabled={isExporting || isLoading}
              className="mb-2 inline-flex h-9 w-full items-center justify-center gap-2 text-[11px] transition disabled:opacity-50"
              style={{
                border: '0.5px solid rgba(201,168,76,0.3)',
                color: '#C9A84C',
                background: 'transparent',
                borderRadius: '6px',
              }}
              onMouseEnter={(event) => {
                if (!isExporting && !isLoading) event.currentTarget.style.background = 'rgba(201,168,76,0.07)'
              }}
              onMouseLeave={(event) => {
                if (!isExporting && !isLoading) event.currentTarget.style.background = 'transparent'
              }}
            >
              <span aria-hidden="true">↓</span>
              <span>{isExporting ? 'Exporting...' : 'Export CSV'}</span>
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="h-9 w-full text-[11px] transition"
              style={{
                color: 'rgba(238,230,216,0.4)',
                border: 'none',
                background: 'transparent',
              }}
              onMouseEnter={(event) => {
                event.currentTarget.style.color = 'rgba(178,34,52,0.8)'
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.color = 'rgba(238,230,216,0.4)'
              }}
            >
              Logout
            </button>
          </nav>
          </div>
        </aside>

        <main className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden">
          {/* Top header bar */}
          <div className="h-[56px] border-b px-4 sm:px-6 lg:px-7" style={{ borderBottom: '0.5px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.018)', backdropFilter: 'blur(12px)' }}>
            <div className="flex h-full items-center justify-between gap-3">
              {/* Hamburger on mobile */}
              <button
                type="button"
                className="flex sm:hidden items-center justify-center h-8 w-8 rounded-[6px] flex-shrink-0"
                style={{ background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.1)', color: '#EEE6D8' }}
                onClick={() => setSidebarOpen(true)}
                aria-label="Open menu"
              >
                <svg viewBox="0 0 20 20" width="16" height="16" fill="none">
                  <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </button>
              <div className="min-w-0">
                <p className="text-[14px] font-medium text-[#EEE6D8] truncate">{currentTabConfig.label}</p>
                <p className="text-[11px] text-[rgba(238,230,216,0.35)]">Showing {sortedRecords.length} records</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {activeTab === 'students' && (
                  <button
                    type="button"
                    id="spot-register-btn"
                    onClick={() => setShowSpotRegister(true)}
                    className="inline-flex h-8 items-center gap-1.5 rounded-[6px] px-3 text-[11px]"
                    style={{
                      background: 'linear-gradient(135deg, rgba(201,168,76,0.18), rgba(201,168,76,0.08))',
                      border: '0.5px solid rgba(201,168,76,0.4)',
                      color: '#C9A84C',
                      fontWeight: 500,
                      letterSpacing: '0.04em',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(201,168,76,0.22)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(201,168,76,0.18), rgba(201,168,76,0.08))' }}
                  >
                    <svg viewBox="0 0 16 16" width="12" height="12" fill="none" aria-hidden="true">
                      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M8 5v6M5 8h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                    <span className="hidden xs:inline">Spot Register</span>
                    <span className="xs:hidden">+ Reg</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="px-4 pb-6 pt-4 sm:px-6 lg:px-7">
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
              {/* Stats cards */}
              <section className="mb-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                  { label: 'Students', value: stats.totalStudents, color: '#C9A84C', glow: 'rgba(201,168,76,0.15)', icon: <UsersIcon /> },
                  { label: 'Participants', value: stats.totalParticipants, color: '#a78bfa', glow: 'rgba(167,139,250,0.12)', icon: <PerformanceIcon /> },
                  { label: 'Volunteers', value: stats.totalVolunteers, color: '#34d399', glow: 'rgba(52,211,153,0.12)', icon: <ApprovedIcon /> },
                  { label: 'Groups', value: stats.totalGroups, color: '#60a5fa', glow: 'rgba(96,165,250,0.12)', icon: <UsersIcon /> },
                  { label: 'Pending', value: stats.pendingApprovals, color: stats.pendingApprovals > 0 ? '#f87171' : 'rgba(238,230,216,0.4)', glow: stats.pendingApprovals > 0 ? 'rgba(248,113,113,0.12)' : 'transparent', icon: <PendingIcon /> },
                  { label: 'Approved Today', value: stats.approvedToday, color: stats.approvedToday > 0 ? '#C9A84C' : 'rgba(238,230,216,0.4)', glow: stats.approvedToday > 0 ? 'rgba(201,168,76,0.15)' : 'transparent', icon: <ApprovedIcon /> },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    style={{
                      background: 'rgba(255,255,255,0.026)',
                      border: '0.5px solid rgba(255,255,255,0.08)',
                      borderRadius: '12px',
                      padding: '14px 16px',
                      boxShadow: `0 0 20px ${stat.glow}`,
                      transition: 'box-shadow 0.3s ease',
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[9px] uppercase tracking-[0.16em]" style={{ color: 'rgba(238,230,216,0.38)' }}>{stat.label}</span>
                      <span style={{ color: stat.color, opacity: 0.7 }}>{stat.icon}</span>
                    </div>
                    <p className="text-[26px] font-semibold leading-none" style={{ ...DISPLAY_FONT, color: stat.color }}>
                      {isLoading ? <span className="inline-block w-8 h-5 rounded" style={{ background: 'rgba(255,255,255,0.08)', animation: 'shimmer 1.5s infinite' }} /> : stat.value}
                    </p>
                  </div>
                ))}
              </section>

              <section className="mb-3 flex flex-wrap items-center gap-2">
                {[
                  ['student_open', 'Audience'],
                  ['participant_open', 'Participants'],
                  ['volunteer_open', 'Volunteers'],
                ].map(([key, label]) => {
                  const isOpen = Boolean(registrationConfig[key])
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleToggleRegistration(key)}
                      disabled={configLoadingKey === key || isBusy}
                      className="h-[30px] rounded-[999px] px-3 text-[11px] disabled:cursor-not-allowed"
                      style={{
                        border: isOpen ? '0.5px solid rgba(201,168,76,0.32)' : '0.5px solid rgba(178,34,52,0.32)',
                        color: isOpen ? '#C9A84C' : '#B22234',
                        background: isOpen ? 'rgba(201,168,76,0.07)' : 'rgba(178,34,52,0.07)',
                        opacity: configLoadingKey === key || isBusy ? 0.55 : 1,
                      }}
                    >
                      {label}: {configLoadingKey === key ? 'Saving...' : isOpen ? 'Open' : 'Closed'}
                    </button>
                  )
                })}
              </section>

              <section className="mb-3 flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  value={nameSearch}
                  onChange={(event) => setNameSearch(event.target.value)}
                  placeholder="Search name, roll, or email"
                  className="w-full sm:w-[220px]"
                  style={{
                    ...selectStyle,
                    height: '36px',
                    appearance: 'none',
                    WebkitAppearance: 'none',
                    MozAppearance: 'none',
                    paddingRight: '12px',
                  }}
                />

                <select
                  value={selectedCourse}
                  onChange={(event) => setSelectedCourse(event.target.value)}
                  className="dash-select w-[190px]"
                  style={selectStyle}
                >
                  <option value="all">All Courses</option>
                  {courseOptions.map((course) => (
                    <option key={course} value={course}>
                      {course}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedYear}
                  onChange={(event) => setSelectedYear(event.target.value)}
                  className="dash-select w-[150px]"
                  style={selectStyle}
                >
                  <option value="all">All Years</option>
                  {yearOptions.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>

                <select
                  value={sortKey}
                  onChange={(event) => setSortKey(event.target.value)}
                  className="dash-select w-[180px]"
                  style={selectStyle}
                >
                  <option value="registered_desc">Newest First</option>
                  <option value="registered_asc">Oldest First</option>
                  <option value="name_asc">Name A-Z</option>
                  <option value="name_desc">Name Z-A</option>
                  <option value="course_asc">Course A-Z</option>
                </select>

                {(activeTab === 'participants' || activeTab === 'groups') && (
                  <select
                    value={selectedEvent}
                    onChange={(event) => setSelectedEvent(event.target.value)}
                    className="dash-select w-[190px]"
                    style={selectStyle}
                  >
                    <option value="all">All Events</option>
                    {eventOptions.map((eventId) => (
                      <option key={eventId} value={eventId}>
                        {EVENT_NAME_BY_ID[eventId] || eventId}
                      </option>
                    ))}
                  </select>
                )}

                <button
                  type="button"
                  onClick={clearFilters}
                  className="ml-auto text-[11px]"
                  style={{ color: 'rgba(201,168,76,0.6)', border: 'none', background: 'transparent', cursor: 'pointer' }}
                  onMouseEnter={(event) => {
                    event.currentTarget.style.color = '#C9A84C'
                  }}
                  onMouseLeave={(event) => {
                    event.currentTarget.style.color = 'rgba(201,168,76,0.6)'
                  }}
                >
                  Clear Filters
                </button>
              </section>

              <section className="mb-1 flex items-center justify-between gap-3 py-[6px]">
                <p className="text-[11px] text-[rgba(238,230,216,0.35)]">
                  Page {currentPagination.page} / {currentPagination.totalPages} | Total Records: {currentPagination.total}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePrevPage}
                    disabled={currentPagination.page <= 1 || isBusy}
                    className="h-[28px] rounded-[6px] px-3 text-[11px] disabled:cursor-not-allowed"
                    style={{
                      border: '0.5px solid rgba(255,255,255,0.12)',
                      color: 'rgba(238,230,216,0.7)',
                      background: 'transparent',
                      opacity: currentPagination.page <= 1 || isBusy ? 0.35 : 1,
                    }}
                  >
                    Prev
                  </button>
                  <button
                    type="button"
                    onClick={handleNextPage}
                    disabled={currentPagination.page >= currentPagination.totalPages || isBusy}
                    className="h-[28px] rounded-[6px] px-3 text-[11px] disabled:cursor-not-allowed"
                    style={{
                      border: '0.5px solid rgba(201,168,76,0.3)',
                      color: '#C9A84C',
                      background: 'transparent',
                      opacity: currentPagination.page >= currentPagination.totalPages || isBusy ? 0.35 : 1,
                    }}
                  >
                    Next
                  </button>
                </div>
              </section>

              <section className="mb-2 flex items-center justify-between gap-3 py-[10px]">
                <p className="text-[11px] text-[rgba(238,230,216,0.38)]">Visible: {visibleIds.length} | Selected: {selectedIds.length}</p>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleToggleSelectAll}
                    disabled={visibleIds.length === 0 || isBusy}
                    className="text-[11px] disabled:cursor-not-allowed"
                    style={{ border: 'none', background: 'transparent', color: 'rgba(238,230,216,0.5)' }}
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={handleUnselectAllVisible}
                    disabled={selectedIds.length === 0 || isBusy}
                    className="text-[11px] disabled:cursor-not-allowed"
                    style={{ border: 'none', background: 'transparent', color: 'rgba(238,230,216,0.35)' }}
                  >
                    Clear
                  </button>

                  <button
                    type="button"
                    onClick={handleApproveSelected}
                    disabled={selectedPendingIds.length === 0 || isBusy}
                    className="h-[30px] px-4 text-[11px] disabled:cursor-not-allowed"
                    style={{
                      border: '0.5px solid rgba(201,168,76,0.35)',
                      color: '#C9A84C',
                      background: 'transparent',
                      borderRadius: '999px',
                      opacity: selectedPendingIds.length === 0 || isBusy ? 0.3 : 1,
                    }}
                    onMouseEnter={(event) => {
                      if (selectedPendingIds.length !== 0 && !isBusy) event.currentTarget.style.background = 'rgba(201,168,76,0.09)'
                    }}
                    onMouseLeave={(event) => {
                      if (selectedPendingIds.length !== 0 && !isBusy) event.currentTarget.style.background = 'transparent'
                    }}
                  >
                    {bulkAction === 'approving' ? 'Approving...' : `Approve Selected (${selectedPendingIds.length})`}
                  </button>

                  <button
                    type="button"
                    onClick={handleDeleteSelected}
                    disabled={selectedIds.length === 0 || isBusy}
                    className="h-[30px] px-4 text-[11px] disabled:cursor-not-allowed"
                    style={{
                      border: '0.5px solid rgba(178,34,52,0.35)',
                      color: 'rgba(178,34,52,0.8)',
                      background: 'transparent',
                      borderRadius: '999px',
                      opacity: selectedIds.length === 0 || isBusy ? 0.3 : 1,
                    }}
                    onMouseEnter={(event) => {
                      if (selectedIds.length !== 0 && !isBusy) event.currentTarget.style.background = 'rgba(178,34,52,0.08)'
                    }}
                    onMouseLeave={(event) => {
                      if (selectedIds.length !== 0 && !isBusy) event.currentTarget.style.background = 'transparent'
                    }}
                  >
                    {bulkAction === 'deleting' ? 'Deleting...' : `Delete Selected (${selectedIds.length})`}
                  </button>
                </div>
              </section>

              {errorMessage && (
                <div className="mb-3 rounded-[10px] border px-3 py-2 text-[12px]" style={{ border: '0.5px solid rgba(178,34,52,0.35)', background: 'rgba(178,34,52,0.08)', color: '#B22234' }}>
                  {errorMessage}
                </div>
              )}

              {infoMessage && (
                <div className="mb-3 rounded-[10px] border px-3 py-2 text-[12px]" style={{ border: '0.5px solid rgba(201,168,76,0.22)', background: 'rgba(201,168,76,0.08)', color: '#EEE6D8' }}>
                  {infoMessage}
                </div>
              )}

              <section className="overflow-x-auto">
                <table className="min-w-full border-separate border-spacing-0" style={{ tableLayout: 'fixed' }}>
                  <thead>
                    <tr className="h-10" style={{ background: 'rgba(201,168,76,0.04)' }}>
                      <th
                        className="px-[14px] text-left text-[10px] font-medium uppercase tracking-[0.16em] text-[rgba(201,168,76,0.7)]"
                        style={{ minWidth: '40px', width: '40px', borderBottom: '0.5px solid rgba(255,255,255,0.08)' }}
                      >
                        <input
                          type="checkbox"
                          checked={allVisibleSelected}
                          onChange={handleToggleSelectAll}
                          disabled={visibleIds.length === 0 || isBusy}
                          className="dash-checkbox"
                        />
                      </th>

                      {columns.map((column) => (
                        <th
                          key={column}
                          className="px-[14px] text-left text-[10px] font-medium uppercase tracking-[0.16em] text-[rgba(201,168,76,0.7)]"
                          style={{
                            minWidth: `${getColumnMinWidth(column)}px`,
                            width: `${getColumnMinWidth(column)}px`,
                            borderBottom: '0.5px solid rgba(255,255,255,0.08)',
                          }}
                        >
                          {COLUMN_LABELS[column] || titleCaseFromSnakeCase(column)}
                        </th>
                      ))}

                      <th
                        className="px-[14px] text-left text-[10px] font-medium uppercase tracking-[0.16em] text-[rgba(201,168,76,0.7)]"
                        style={{ minWidth: '160px', width: '160px', borderBottom: '0.5px solid rgba(255,255,255,0.08)' }}
                      >
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {isLoading && (
                      Array.from({ length: 7 }).map((_, i) => (
                        <tr key={`skel-${i}`} style={{ borderBottom: '0.5px solid rgba(255,255,255,0.04)' }}>
                          <td className="px-[14px] py-[11px]" colSpan={columns.length + 2}>
                            <div className="flex gap-3 items-center">
                              <div className="skel-bar" style={{ width: 15, height: 15, borderRadius: 4, flexShrink: 0 }} />
                              <div className="skel-bar" style={{ flex: 1, height: 11 }} />
                              <div className="skel-bar" style={{ width: '20%', height: 11 }} />
                              <div className="skel-bar" style={{ width: '14%', height: 11 }} />
                              <div className="skel-bar" style={{ width: '10%', height: 24, borderRadius: 20 }} />
                            </div>
                          </td>
                        </tr>
                      ))
                    )}

                    {!isLoading && sortedRecords.length === 0 && (
                      <tr>
                        <td colSpan={columns.length + 2} className="h-36 px-[14px] text-center">
                          <div className="mx-auto flex w-full max-w-[260px] flex-col items-center">
                            <svg viewBox="0 0 24 24" width="40" height="40" fill="none" aria-hidden="true">
                              <path d="M3 7h18v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" stroke="rgba(238,230,216,0.2)" strokeWidth="1.5" />
                              <path d="M3 7l3-4h12l3 4" stroke="rgba(238,230,216,0.2)" strokeWidth="1.5" />
                              <path d="M9 12h6" stroke="rgba(238,230,216,0.2)" strokeWidth="1.5" strokeLinecap="round" />
                            </svg>
                            <p className="mt-3 text-[13px] text-[rgba(238,230,216,0.3)]">No records found</p>
                            <p className="mt-1 text-[11px] text-[rgba(238,230,216,0.2)]">Try adjusting your filters</p>
                          </div>
                        </td>
                      </tr>
                    )}

                    {!isLoading &&
                      sortedRecords.map((record, rowIndex) => {
                        const isRowSelected = selectedSet.has(record.id)

                        return (
                          <tr
                            key={record.id}
                            className={`dash-row h-11 border-b ${rowIndex % 2 === 0 ? 'dash-row-even' : ''}`}
                            style={{
                              borderBottom: '0.5px solid rgba(255,255,255,0.04)',
                              background: isRowSelected ? 'rgba(201,168,76,0.06)' : undefined,
                            }}
                          >
                            <td className="overflow-hidden px-[14px] align-middle text-[13px]">
                              <input
                                type="checkbox"
                                checked={isRowSelected}
                                onChange={() => handleSelectRow(record.id)}
                                disabled={isBusy}
                                className="dash-checkbox"
                              />
                            </td>

                            {columns.map((column) => {
                              if (column === 'qr_code') {
                                const isApproved = isRecordApproved(record)
                                return (
                                  <td key={column} className="overflow-hidden px-[14px] align-middle text-[13px] text-[#EEE6D8]">
                                    {isApproved ? (
                                      <span
                                        className="inline-flex items-center rounded-full px-[10px] py-[2px] text-[11px]"
                                        style={{
                                          background: 'rgba(201,168,76,0.1)',
                                          border: '0.5px solid rgba(201,168,76,0.25)',
                                          color: '#C9A84C',
                                        }}
                                      >
                                        <span className="mr-[5px] h-[5px] w-[5px] rounded-full bg-[#C9A84C]" />
                                        Approved
                                      </span>
                                    ) : (
                                      <span
                                        className="inline-flex items-center rounded-full px-[10px] py-[2px] text-[11px]"
                                        style={{
                                          background: 'rgba(178,34,52,0.1)',
                                          border: '0.5px solid rgba(178,34,52,0.25)',
                                          color: '#B22234',
                                        }}
                                      >
                                        <span className="mr-[5px] h-[5px] w-[5px] rounded-full bg-[#B22234]" />
                                        Pending
                                      </span>
                                    )}
                                  </td>
                                )
                              }

                              if (column === 'registered_at') {
                                return (
                                  <td key={column} className="overflow-hidden px-[14px] align-middle text-[11px] text-[rgba(238,230,216,0.45)]" style={{ whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                                    {formatTimestamp(record[column])}
                                  </td>
                                )
                              }

                              if (column === 'event_1' || column === 'event_2') {
                                const eventIndex = column === 'event_1' ? 0 : 1
                                const events = normalizeEvents(record.events)
                                  .map((eventId) => EVENT_NAME_BY_ID[eventId] || eventId)
                                const eventLabel = events[eventIndex] || '-'

                                return (
                                  <td key={column} className="overflow-hidden px-[14px] align-middle text-[13px] text-[#EEE6D8]" style={{ whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                                    {eventLabel}
                                  </td>
                                )
                              }

                              if (column === 'team_label') {
                                return (
                                  <td key={column} className="overflow-hidden px-[14px] align-middle text-[12px] text-[rgba(238,230,216,0.65)]">
                                    <select
                                      value={record.team_label || ''}
                                      onChange={(event) => handleAssignVolunteerTeam(record.id, event.target.value)}
                                      disabled={assigningTeamId === record.id || isBusy}
                                      className="dash-select w-full"
                                      style={{ ...selectStyle, height: '28px', fontSize: '11px' }}
                                    >
                                      <option value="">Unassigned</option>
                                      {VOLUNTEER_TEAM_OPTIONS.map((team) => (
                                        <option key={team} value={team}>
                                          {team}
                                        </option>
                                      ))}
                                    </select>
                                  </td>
                                )
                              }

                              if (column === 'name') {
                                return (
                                  <td key={column} className="overflow-hidden px-[14px] align-middle text-[13px] font-medium text-[#EEE6D8]" style={{ whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                                    {record[column] || '-'}
                                  </td>
                                )
                              }

                              if (column === 'roll_no') {
                                return (
                                  <td key={column} className="overflow-hidden px-[14px] align-middle font-mono text-[12px] text-[rgba(238,230,216,0.65)]" style={{ whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                                    {record[column] || '-'}
                                  </td>
                                )
                              }

                              if (column === 'email') {
                                return (
                                  <td key={column} className="overflow-hidden px-[14px] align-middle text-[12px] text-[rgba(238,230,216,0.65)]" style={{ whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                                    {record[column] || '-'}
                                  </td>
                                )
                              }

                              return (
                                <td key={column} className="overflow-hidden px-[14px] align-middle text-[13px] text-[#EEE6D8]" style={{ whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                                  {record[column] || '-'}
                                </td>
                              )
                            })}

                            <td className="overflow-hidden px-[14px] align-middle" style={{ width: '160px', minWidth: '160px' }}>
                              <div className="flex flex-nowrap items-center gap-2">
                                {!isRecordApproved(record) ? (
                                  <button
                                    type="button"
                                    onClick={() => handleApproveOne(record.id)}
                                    disabled={approvingId === record.id || isBusy}
                                    className="h-[26px] rounded-[5px] px-3 text-[11px]"
                                    style={{
                                      border: '0.5px solid rgba(201,168,76,0.3)',
                                      color: 'rgba(201,168,76,0.8)',
                                      background: 'transparent',
                                    }}
                                    onMouseEnter={(event) => {
                                      if (!(approvingId === record.id || isBusy)) {
                                        event.currentTarget.style.background = 'rgba(201,168,76,0.08)'
                                        event.currentTarget.style.color = '#C9A84C'
                                      }
                                    }}
                                    onMouseLeave={(event) => {
                                      if (!(approvingId === record.id || isBusy)) {
                                        event.currentTarget.style.background = 'transparent'
                                        event.currentTarget.style.color = 'rgba(201,168,76,0.8)'
                                      }
                                    }}
                                  >
                                    {approvingId === record.id ? 'Approving...' : 'Approve'}
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleResendMail(record.id)}
                                    disabled={resendingId === record.id || isBusy}
                                    className="h-[26px] rounded-[5px] px-3 text-[11px]"
                                    style={{
                                      border: '0.5px solid rgba(255,255,255,0.1)',
                                      color: 'rgba(238,230,216,0.45)',
                                      background: 'transparent',
                                    }}
                                    onMouseEnter={(event) => {
                                      if (!(resendingId === record.id || isBusy)) {
                                        event.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'
                                        event.currentTarget.style.color = 'rgba(238,230,216,0.7)'
                                      }
                                    }}
                                    onMouseLeave={(event) => {
                                      if (!(resendingId === record.id || isBusy)) {
                                        event.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'
                                        event.currentTarget.style.color = 'rgba(238,230,216,0.45)'
                                      }
                                    }}
                                  >
                                    {resendingId === record.id ? 'Sending...' : 'Resend'}
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => handleDeleteOne(record.id)}
                                  disabled={deletingId === record.id || isBusy}
                                  className="h-[26px] rounded-[5px] px-3 text-[11px]"
                                  style={{
                                    border: '0.5px solid rgba(178,34,52,0.2)',
                                    color: 'rgba(178,34,52,0.55)',
                                    background: 'transparent',
                                  }}
                                  onMouseEnter={(event) => {
                                    if (!(deletingId === record.id || isBusy)) {
                                      event.currentTarget.style.background = 'rgba(178,34,52,0.07)'
                                      event.currentTarget.style.color = '#B22234'
                                    }
                                  }}
                                  onMouseLeave={(event) => {
                                    if (!(deletingId === record.id || isBusy)) {
                                      event.currentTarget.style.background = 'transparent'
                                      event.currentTarget.style.color = 'rgba(178,34,52,0.55)'
                                    }
                                  }}
                                >
                                  {deletingId === record.id ? 'Deleting...' : 'Delete'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                  </tbody>
                </table>
              </section>
            </motion.div>
          </div>
        </main>
      </div>

      {showSpotRegister && (
        <SpotRegisterModal
          onClose={() => setShowSpotRegister(false)}
          onSuccess={() => setRefreshKey((k) => k + 1)}
          apiPassword={facultyPassword}
        />
      )}
    </div>
  )
}
