import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { EVENTS } from '../data/events.js'
import { apiUrl } from '../lib/api.js'

const DISPLAY_FONT = { fontFamily: 'Nevarademo, serif' }

const STUDENT_COLUMNS = ['name', 'roll_no', 'course', 'year', 'email', 'qr_code', 'registered_at']
const PARTICIPANT_COLUMNS = ['name', 'roll_no', 'course', 'year', 'email', 'event_1', 'event_2', 'qr_code', 'registered_at']

const COLUMN_LABELS = {
  roll_no: 'Roll No',
  event_1: 'Event1',
  event_2: 'Event2',
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
]

const DEFAULT_PAGE_SIZE = 25

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

export default function FacultyDashboard() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('students')
  const [facultyPassword, setFacultyPassword] = useState('')
  const [records, setRecords] = useState([])
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalParticipants: 0,
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
  const [bulkAction, setBulkAction] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

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

    const fetchDashboardData = async () => {
      setIsLoading(true)
      setErrorMessage('')

      try {
        const currentEndpoint =
          activeTab === 'students'
            ? `/api/faculty/students?page=${activePage}&page_size=${DEFAULT_PAGE_SIZE}`
            : `/api/faculty/participants?page=${activePage}&page_size=${DEFAULT_PAGE_SIZE}`
        const alternateEndpoint =
          activeTab === 'students'
            ? '/api/faculty/participants?page=1&page_size=5'
            : '/api/faculty/students?page=1&page_size=5'

        const [currentResult, alternateResult] = await Promise.all([
          fetchFacultyList(currentEndpoint),
          fetchFacultyList(alternateEndpoint),
        ])

        const currentRecords = currentResult.records || []
        const currentSummary = currentResult.summary || {}
        const alternateSummary = alternateResult.summary || {}

        const studentsSummary = activeTab === 'students' ? currentSummary : alternateSummary
        const participantsSummary = activeTab === 'participants' ? currentSummary : alternateSummary

        const nextPage = currentResult.pagination?.page || activePage

        setRecords(currentRecords)
        setSelectedIds([])
        setStats({
          totalStudents: Number(studentsSummary.total || 0),
          totalParticipants: Number(participantsSummary.total || 0),
          pendingApprovals:
            Number(studentsSummary.pending || 0) +
            Number(participantsSummary.pending || 0),
          approvedToday:
            Number(studentsSummary.approved_today || 0) +
            Number(participantsSummary.approved_today || 0),
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
        if (error?.message === 'AUTH_UNAUTHORIZED') {
          updateAuthFailure()
          return
        }

        setErrorMessage(error.message || 'Unable to fetch data')
        setRecords([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchDashboardData()
  }, [activeTab, activePage, facultyPassword, refreshKey])

  const courseOptions = useMemo(() => {
    return [...new Set(records.map((record) => record.course).filter(Boolean))]
  }, [records])

  const yearOptions = useMemo(() => {
    return [...new Set(records.map((record) => record.year).filter(Boolean))]
  }, [records])

  const eventOptions = useMemo(() => {
    if (activeTab !== 'participants') return []

    const uniqueEvents = new Set()
    records.forEach((record) => {
      normalizeEvents(record.events).forEach((eventId) => uniqueEvents.add(eventId))
    })

    return [...uniqueEvents]
  }, [activeTab, records])

  const filteredRecords = useMemo(() => {
    const normalizedSearch = nameSearch.trim().toLowerCase()

    return records.filter((record) => {
      if (selectedCourse !== 'all' && record.course !== selectedCourse) return false
      if (selectedYear !== 'all' && record.year !== selectedYear) return false

      if (normalizedSearch) {
        const searchableText = [record.name, record.roll_no, record.email]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        if (!searchableText.includes(normalizedSearch)) return false
      }

      if (activeTab === 'participants' && selectedEvent !== 'all') {
        const eventIds = normalizeEvents(record.events)
        if (!eventIds.includes(selectedEvent)) return false
      }

      return true
    })
  }, [records, activeTab, selectedCourse, selectedYear, selectedEvent, nameSearch])

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

  const columns = activeTab === 'students' ? STUDENT_COLUMNS : PARTICIPANT_COLUMNS
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds])
  const visibleIds = useMemo(() => sortedRecords.map((record) => record.id), [sortedRecords])
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedSet.has(id))

  const selectedPendingIds = useMemo(() => {
    return sortedRecords
      .filter((record) => selectedSet.has(record.id) && !record.qr_code)
      .map((record) => record.id)
  }, [sortedRecords, selectedSet])

  const isBusy =
    isLoading ||
    isExporting ||
    Boolean(approvingId) ||
    Boolean(deletingId) ||
    Boolean(resendingId) ||
    Boolean(bulkAction)

  const approveRecordById = async (recordId) => {
    const endpoint =
      activeTab === 'students'
        ? `/api/faculty/approve/student/${recordId}`
        : `/api/faculty/approve/participant/${recordId}`

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
    const endpoint =
      activeTab === 'students'
        ? `/api/faculty/student/${recordId}`
        : `/api/faculty/participant/${recordId}`

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

  const resendStudentMailById = async (recordId) => {
    const response = await fetch(apiUrl(`/api/faculty/resend/student/${recordId}`), {
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

  const resendParticipantMailById = async (recordId) => {
    const response = await fetch(apiUrl(`/api/faculty/resend/participant/${recordId}`), {
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

  const handleExport = async () => {
    setIsExporting(true)
    setErrorMessage('')
    setInfoMessage('')

    try {
      const exportEndpoint =
        activeTab === 'students'
          ? '/api/faculty/export/students'
          : '/api/faculty/export/participants'

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
      anchor.download = activeTab === 'students' ? 'students_report.csv' : 'participants_report.csv'
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
      } else {
        setInfoMessage('Participant approved successfully.')
      }

      setRefreshKey((previous) => previous + 1)
    } catch (error) {
      setErrorMessage(error.message || 'Approval failed')
    } finally {
      setApprovingId('')
    }
  }

  const handleDeleteOne = async (recordId) => {
    const confirmationText =
      activeTab === 'students'
        ? 'Delete this student registration? This cannot be undone.'
        : 'Delete this participant and linked event records? This cannot be undone.'

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

  const handleResendStudentMail = async (recordId) => {
    setResendingId(recordId)
    setErrorMessage('')
    setInfoMessage('')

    try {
      const result = await resendStudentMailById(recordId)
      if (!result.ok) {
        if (!result.unauthorized) setErrorMessage(result.message || 'Resend failed')
        return
      }

      setInfoMessage('Approval email resent to student successfully.')
    } catch (error) {
      setErrorMessage(error.message || 'Resend failed')
    } finally {
      setResendingId('')
    }
  }

  const handleResendParticipantMail = async (recordId) => {
    setResendingId(recordId)
    setErrorMessage('')
    setInfoMessage('')

    try {
      const result = await resendParticipantMailById(recordId)
      if (!result.ok) {
        if (!result.unauthorized) setErrorMessage(result.message || 'Resend failed')
        return
      }

      setInfoMessage('Approval email resent to participant successfully.')
    } catch (error) {
      setErrorMessage(error.message || 'Resend failed')
    } finally {
      setResendingId('')
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
      setInfoMessage(`Approved ${successCount} participant(s).`)
    }

    setRefreshKey((previous) => previous + 1)
  }

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) {
      setInfoMessage('No selected records to delete.')
      return
    }

    const confirmationText =
      activeTab === 'students'
        ? `Delete ${selectedIds.length} selected student record(s)?`
        : `Delete ${selectedIds.length} selected participant record(s) and linked events?`

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
          width: 14px;
          height: 14px;
          border: 0.5px solid rgba(255,255,255,0.2);
          border-radius: 3px;
          background: transparent;
          cursor: pointer;
          transition: all 150ms ease;
        }

        .dash-checkbox:checked {
          background: rgba(201,168,76,0.2);
          border-color: rgba(201,168,76,0.5);
          box-shadow: inset 0 0 0 2px rgba(201,168,76,0.16);
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
          background: rgba(201,168,76,0.032);
        }

        .dash-row-even {
          background: rgba(255,255,255,0.012);
        }
      `}</style>

      <div className="flex min-h-screen">
        <aside
          className="sticky top-0 h-screen w-[220px] flex-shrink-0 border-r px-0 py-0"
          style={{
            background: 'rgba(8,9,16,0.95)',
            borderRight: '0.5px solid rgba(255,255,255,0.06)',
          }}
        >
          <div className="px-5 pt-6">
            <div className="flex items-center">
              <span className="text-[13px] tracking-[0.16em] text-[#C9A84C]" style={{ fontFamily: 'Montage, serif' }}>
                IZEE
              </span>
              <span className="mx-2 h-4 w-px bg-[rgba(238,230,216,0.35)]" />
              <span className="text-[13px] tracking-[0.16em] text-[#C9A84C]" style={{ fontFamily: 'Montage, serif' }}>
                CULTURALS
              </span>
            </div>
            <p className="mt-3 text-[10px] uppercase tracking-[0.18em] text-[rgba(238,230,216,0.35)]">
              Faculty Console
            </p>
            <div className="mt-4 h-px w-full bg-[rgba(201,168,76,0.2)]" />
          </div>

          <nav className="mt-4">
            {NAV_ITEMS.map((item) => {
              const isActive = activeTab === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
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
                  ) : (
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" aria-hidden="true">
                      <path d="M7 6h10v2a5 5 0 0 1-10 0V6Z" stroke="currentColor" strokeWidth="1.7" />
                      <path d="M9 17h6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                      <path d="M12 13v4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                    </svg>
                  )}
                  <span>{item.label}</span>
                </button>
              )
            })}
          </nav>

          <div className="absolute bottom-0 left-0 w-full px-4 pb-4">
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
          </div>
        </aside>

        <main className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden">
          <div className="h-[52px] border-b px-5 sm:px-6 lg:px-7" style={{ borderBottom: '0.5px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.012)' }}>
            <div className="flex h-full items-center justify-between">
              <div>
                <p className="text-[14px] font-medium text-[#EEE6D8]">{activeTab === 'students' ? 'Students' : 'Participants'}</p>
                <p className="text-[11px] text-[rgba(238,230,216,0.35)]">Showing {sortedRecords.length} records</p>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="hidden h-8 items-center rounded-[6px] border px-3 text-[11px] text-[rgba(238,230,216,0.5)] sm:inline-flex"
                  style={{ border: '0.5px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.02)' }}
                >
                  Filters
                </div>
              </div>
            </div>
          </div>

          <div className="px-5 pb-6 pt-4 sm:px-6 lg:px-7">
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
              <section
                className="mb-4 flex h-16 overflow-hidden"
                style={{
                  background: 'rgba(255,255,255,0.018)',
                  border: '0.5px solid rgba(255,255,255,0.06)',
                  borderRadius: '10px',
                }}
              >
                <div className="flex flex-1 flex-col items-center justify-center">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-[rgba(238,230,216,0.38)]">Total Students</p>
                  <p className="text-[22px] font-semibold text-[#EEE6D8]" style={DISPLAY_FONT}>{stats.totalStudents}</p>
                </div>
                <div className="w-px bg-[rgba(255,255,255,0.06)]" />
                <div className="flex flex-1 flex-col items-center justify-center">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-[rgba(238,230,216,0.38)]">Total Participants</p>
                  <p className="text-[22px] font-semibold text-[#EEE6D8]" style={DISPLAY_FONT}>{stats.totalParticipants}</p>
                </div>
                <div className="w-px bg-[rgba(255,255,255,0.06)]" />
                <div className="flex flex-1 flex-col items-center justify-center">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-[rgba(238,230,216,0.38)]">Pending Approvals</p>
                  <p className="text-[22px] font-semibold" style={{ ...DISPLAY_FONT, color: stats.pendingApprovals > 0 ? '#B22234' : '#EEE6D8' }}>
                    {stats.pendingApprovals}
                  </p>
                </div>
                <div className="w-px bg-[rgba(255,255,255,0.06)]" />
                <div className="flex flex-1 flex-col items-center justify-center">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-[rgba(238,230,216,0.38)]">Approved Today</p>
                  <p className="text-[22px] font-semibold" style={{ ...DISPLAY_FONT, color: stats.approvedToday > 0 ? '#C9A84C' : '#EEE6D8' }}>
                    {stats.approvedToday}
                  </p>
                </div>
              </section>

              <section className="mb-3 flex flex-wrap items-center gap-3">
                <input
                  type="text"
                  value={nameSearch}
                  onChange={(event) => setNameSearch(event.target.value)}
                  placeholder="Search name, roll, or email"
                  className="w-[220px]"
                  style={{
                    ...selectStyle,
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

                {activeTab === 'participants' && (
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
                    <tr className="h-9" style={{ background: 'rgba(255,255,255,0.022)', borderBottom: '0.5px solid rgba(255,255,255,0.08)' }}>
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
                      <tr>
                        <td colSpan={columns.length + 2} className="h-16 px-[14px] text-center text-[13px] text-[rgba(238,230,216,0.5)]">
                          Loading records...
                        </td>
                      </tr>
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
                                const isApproved = Boolean(record.qr_code)
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
                                {!record.qr_code ? (
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
                                    onClick={() =>
                                      activeTab === 'students'
                                        ? handleResendStudentMail(record.id)
                                        : handleResendParticipantMail(record.id)
                                    }
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
    </div>
  )
}
