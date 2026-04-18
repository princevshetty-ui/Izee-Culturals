import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion as Motion } from 'framer-motion'
import { EVENTS } from '../data/events.js'

const DISPLAY_FONT = { fontFamily: 'Nevarademo, serif' }

const STUDENT_COLUMNS = ['name', 'roll_no', 'course', 'year', 'email', 'qr_code', 'registered_at']
const PARTICIPANT_COLUMNS = ['name', 'roll_no', 'course', 'year', 'email', 'event_1', 'event_2', 'qr_code', 'registered_at']
const VOLUNTEER_COLUMNS = ['name', 'roll_no', 'course', 'year', 'team_label', 'motivation', 'email', 'phone', 'registered_at', 'qr_code']
const GROUP_COLUMNS = ['team_name', 'event_name', 'leader_name', 'leader_roll_no', 'leader_course', 'leader_year', 'leader_email', 'leader_phone', 'registered_at', 'qr_code']

const COLUMN_LABELS = {
  roll_no: 'Roll No',
  event_1: 'Event1',
  event_2: 'Event2',
  team_label: 'Team',
  team_name: 'Team Name',
  event_name: 'Event Name',
  leader_name: 'Leader Name',
  leader_roll_no: 'Leader Roll No',
  leader_course: 'Leader Course',
  leader_year: 'Leader Year',
  leader_email: 'Leader Email',
  leader_phone: 'Leader Phone',
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

const OFFICIAL_VOLUNTEER_TEAMS = [
  { team_id: 'reg_reception', team_label: 'Registration & Reception' },
  { team_id: 'prog_coord', team_label: 'Program Coordination' },
  { team_id: 'discipline_sec', team_label: 'Discipline & Security' },
  { team_id: 'hospitality', team_label: 'Hospitality & Welfare' },
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

function getTabTitle(tabId) {
  if (tabId === 'students') return 'Students'
  if (tabId === 'participants') return 'Participants'
  if (tabId === 'volunteers') return 'Volunteers'
  return 'Groups'
}

function isRecordApproved(record) {
  return Boolean(record?.qr_code || record?.is_approved)
}

function getCourseByTab(record, tabId) {
  if (tabId === 'groups') return record.leader_course || record.course || ''
  return record.course || ''
}

function getYearByTab(record, tabId) {
  if (tabId === 'groups') return record.leader_year || record.year || ''
  return record.year || ''
}

function getSearchFieldsByTab(record, tabId) {
  if (tabId === 'groups') {
    return [record.leader_name, record.leader_roll_no, record.leader_email]
  }

  return [record.name, record.roll_no, record.email]
}

function getNameByTab(record, tabId) {
  if (tabId === 'groups') return record.leader_name || ''
  return record.name || ''
}

function normalizeDashboardRecords(tabId, records) {
  if (!Array.isArray(records)) return []

  if (tabId === 'volunteers') {
    return records.map((record) => ({
      ...record,
      team_id: record.team_id || '',
      team_label: record.team_label || '',
      motivation: record.motivation || '',
    }))
  }

  if (tabId === 'groups') {
    return records.map((record) => ({
      ...record,
      team_name: record.team_name || record.group_name || '',
      event_name: record.event_name || EVENT_NAME_BY_ID[record.event_id] || record.event_id || '',
      leader_name: record.leader_name || record.name || '',
      leader_roll_no: record.leader_roll_no || record.roll_no || '',
      leader_course: record.leader_course || record.course || '',
      leader_year: record.leader_year || record.year || '',
      leader_email: record.leader_email || record.email || '',
      leader_phone: record.leader_phone || record.phone || '',
    }))
  }

  return records
}

function normalizeSummaryPayload(summary, fallbackRecords) {
  const total = Number(summary?.total ?? fallbackRecords?.length ?? 0)
  const approvedCount = Number(
    summary?.approved_count ??
      summary?.approved ??
      Math.max(total - Number(summary?.pending_count ?? summary?.pending ?? 0), 0)
  )
  const pendingCount = Number(summary?.pending_count ?? summary?.pending ?? Math.max(total - approvedCount, 0))

  return {
    total,
    approved_count: approvedCount,
    pending_count: pendingCount,
    approved_today: Number(summary?.approved_today || 0),
  }
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

// Loading skeleton component with Tailwind animate-pulse
function TableLoadingSkeleton() {
  return (
    <div className="space-y-3 p-4">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="flex gap-4">
          <div className="h-10 w-10 flex-shrink-0 rounded bg-slate-700 animate-pulse" />
          <div className="flex flex-1 flex-col gap-2">
            <div className="h-4 w-3/4 rounded bg-slate-700 animate-pulse" />
            <div className="h-3 w-1/2 rounded bg-slate-700 animate-pulse" />
          </div>
          <div className="h-4 w-20 rounded bg-slate-700 animate-pulse" />
        </div>
      ))}
    </div>
  )
}

export default function FacultyDashboard() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('students')
  const [facultyPassword, setFacultyPassword] = useState('')
  const [records, setRecords] = useState([])
  const [stats, _setStats] = useState({
    totalStudents: 0,
    totalParticipants: 0,
    pendingApprovals: 0,
    approvedToday: 0,
  })

  // Per-tab cache to avoid refetching when switching tabs
  const [tabCache, setTabCache] = useState({
    students: null,
    participants: null,
    volunteers: null,
    groups: null,
  })

  // Per-tab loading state for individual tab load indicators
  const [tabLoading, setTabLoading] = useState({
    students: false,
    participants: false,
    volunteers: false,
    groups: false,
  })

  const [errorMessage, setErrorMessage] = useState('')
  const [infoMessage, setInfoMessage] = useState('')
  const [isExporting, setIsExporting] = useState(false)
  const [approvingId, setApprovingId] = useState('')
  const [deletingId, setDeletingId] = useState('')
  const [resendingId, setResendingId] = useState('')
  const [bulkAction, setBulkAction] = useState('')
  const [assigningTeamById, setAssigningTeamById] = useState({})
  const [statusToast, setStatusToast] = useState(null)
  const [undoDeleteToast, setUndoDeleteToast] = useState(null)
  const [undoBulkDeleteToast, setUndoBulkDeleteToast] = useState(null)
  const statusToastTimerRef = useRef(null)
  const pendingDeletesRef = useRef({})
  const pendingBulkDeleteRef = useRef(null)

  const [selectedCourse, setSelectedCourse] = useState('all')
  const [selectedYear, setSelectedYear] = useState('all')
  const [selectedEvent, setSelectedEvent] = useState('all')
  const [selectedTeamLabel, setSelectedTeamLabel] = useState('all')
  const [nameSearch, setNameSearch] = useState('')
  const [sortKey, setSortKey] = useState('registered_desc')
  const [pageByTab, setPageByTab] = useState({ students: 1, participants: 1, volunteers: 1, groups: 1 })
  const [paginationByTab, setPaginationByTab] = useState({
    students: { page: 1, pageSize: DEFAULT_PAGE_SIZE, total: 0, totalPages: 1 },
    participants: { page: 1, pageSize: DEFAULT_PAGE_SIZE, total: 0, totalPages: 1 },
    volunteers: { page: 1, pageSize: DEFAULT_PAGE_SIZE, total: 0, totalPages: 1 },
    groups: { page: 1, pageSize: DEFAULT_PAGE_SIZE, total: 0, totalPages: 1 },
  })
  const [summaryByTab, setSummaryByTab] = useState({
    students: { total: 0, approved_count: 0, pending_count: 0, approved_today: 0 },
    participants: { total: 0, approved_count: 0, pending_count: 0, approved_today: 0 },
    volunteers: { total: 0, approved_count: 0, pending_count: 0, approved_today: 0 },
    groups: { total: 0, approved_count: 0, pending_count: 0, approved_today: 0 },
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
      const response = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${facultyPassword}`,
        },
      })

      if (response.status === 401) {
        throw new Error('AUTH_UNAUTHORIZED')
      }

      const payload = await response.json().catch(() => ({}))

      if (response.ok && payload?.success) {
        const payloadData = payload.data
        const records = Array.isArray(payloadData)
          ? payloadData
          : Array.isArray(payloadData?.records)
            ? payloadData.records
            : []

        const pagination = payload.pagination || (
          payloadData
            ? {
                page: payloadData.page,
                page_size: payloadData.page_size,
                total: payloadData.total,
                total_pages: payloadData.total_pages || payloadData.totalPages,
              }
            : null
        )

        const summary = payload.summary || (
          payloadData
            ? {
                total: payloadData.total,
                approved_count: payloadData.approved_count,
                pending_count: payloadData.pending_count,
                pending: payloadData.pending,
                approved_today: payloadData.approved_today,
              }
            : null
        )

        return {
          records,
          pagination: pagination || null,
          summary: summary || null,
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

  const showStatusToast = (message, tone = 'success', durationMs = 3000) => {
    if (statusToastTimerRef.current) {
      clearTimeout(statusToastTimerRef.current)
    }

    const toastId = Date.now() + Math.random()
    setStatusToast({ id: toastId, message, tone })

    statusToastTimerRef.current = setTimeout(() => {
      setStatusToast((previous) => (previous?.id === toastId ? null : previous))
      statusToastTimerRef.current = null
    }, durationMs)
  }

  const mutateRecordsForTab = (tabId, mutateFn) => {
    if (activeTab === tabId) {
      setRecords((previous) => mutateFn(previous))
    }

    setTabCache((previous) => {
      const cachedTab = previous[tabId]
      if (!cachedTab) return previous

      return {
        ...previous,
        [tabId]: {
          ...cachedTab,
          records: mutateFn(cachedTab.records || []),
        },
      }
    })
  }

  const assignVolunteerTeamById = async (volunteerId, teamPayload) => {
    const response = await fetch(`/api/faculty/volunteer/${volunteerId}/assign-team`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${facultyPassword}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(teamPayload),
    })

    if (response.status === 401) {
      updateAuthFailure()
      return { ok: false, unauthorized: true }
    }

    const payload = await response.json().catch(() => ({}))
    if (!response.ok || !payload.success) {
      return { ok: false, message: getApiErrorMessage(payload, 'Failed to assign team') }
    }

    return { ok: true }
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
    return () => {
      if (statusToastTimerRef.current) {
        clearTimeout(statusToastTimerRef.current)
      }

      Object.values(pendingDeletesRef.current).forEach((entry) => {
        if (entry?.timerId) clearTimeout(entry.timerId)
      })
      pendingDeletesRef.current = {}

      if (pendingBulkDeleteRef.current?.timerId) {
        clearTimeout(pendingBulkDeleteRef.current.timerId)
      }
      pendingBulkDeleteRef.current = null
    }
  }, [])

  useEffect(() => {
    setSelectedCourse('all')
    setSelectedYear('all')
    setSelectedEvent('all')
    setSelectedTeamLabel('all')
    setNameSearch('')
    setSelectedIds([])
    setInfoMessage('')
    setErrorMessage('')
  }, [activeTab])

  useEffect(() => {
    if (!facultyPassword) return

    // If cache exists for this tab, load from cache instantly
    if (tabCache[activeTab]) {
      const cached = tabCache[activeTab]
      setRecords(cached.records)
      setSummaryByTab((previous) => ({
        ...previous,
        [activeTab]: cached.summary,
      }))
      setPaginationByTab((previous) => ({
        ...previous,
        [activeTab]: cached.pagination,
      }))
      setErrorMessage('')
      return
    }

    // Fetch data only if not cached
    const fetchDashboardData = async () => {
      setTabLoading((previous) => ({ ...previous, [activeTab]: true }))
      setErrorMessage('')

      try {
        const endpointByTab = {
          students: '/api/faculty/students',
          participants: '/api/faculty/participants',
          volunteers: '/api/faculty/volunteers',
          groups: '/api/faculty/groups',
        }

        const currentEndpoint = `${endpointByTab[activeTab]}?page=${activePage}&page_size=${DEFAULT_PAGE_SIZE}`
        const currentResult = await fetchFacultyList(currentEndpoint)
        const currentRecords = normalizeDashboardRecords(activeTab, currentResult.records || [])
        const currentSummary = normalizeSummaryPayload(currentResult.summary || {}, currentRecords)

        const nextPage = currentResult.pagination?.page || activePage

        // Store in cache
        const cacheData = {
          records: currentRecords,
          summary: currentSummary,
          pagination: {
            page: nextPage,
            pageSize: currentResult.pagination?.page_size || DEFAULT_PAGE_SIZE,
            total: currentResult.pagination?.total || 0,
            totalPages: currentResult.pagination?.total_pages || 1,
          },
        }

        setTabCache((previous) => ({
          ...previous,
          [activeTab]: cacheData,
        }))

        setRecords(currentRecords)
        setSelectedIds([])
        setSummaryByTab((previous) => ({
          ...previous,
          [activeTab]: currentSummary,
        }))

        setPaginationByTab((previous) => ({
          ...previous,
          [activeTab]: cacheData.pagination,
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
        setTabLoading((previous) => ({ ...previous, [activeTab]: false }))
      }
    }

    fetchDashboardData()
  }, [activeTab, activePage, facultyPassword, tabCache])

  // Refresh handler: clears cache for active tab and triggers re-fetch
  const handleRefreshTab = () => {
    setTabCache((previous) => ({
      ...previous,
      [activeTab]: null,
    }))
    // Clearing cache will trigger useEffect re-run since tabCache is in dependency array
  }

  const courseOptions = useMemo(() => {
    return [...new Set(records.map((record) => getCourseByTab(record, activeTab)).filter(Boolean))]
  }, [records, activeTab])

  const yearOptions = useMemo(() => {
    return [...new Set(records.map((record) => getYearByTab(record, activeTab)).filter(Boolean))]
  }, [records, activeTab])

  const eventOptions = useMemo(() => {
    if (activeTab !== 'participants' && activeTab !== 'groups') return []

    const uniqueEvents = new Set()
    records.forEach((record) => {
      if (activeTab === 'participants') {
        normalizeEvents(record.events).forEach((eventId) => uniqueEvents.add(eventId))
      } else if (record.event_id) {
        uniqueEvents.add(record.event_id)
      }
    })

    return [...uniqueEvents]
  }, [activeTab, records])

  const teamLabelOptions = useMemo(() => {
    if (activeTab !== 'volunteers') return []
    return [...new Set(records.map((record) => record.team_label).filter(Boolean))]
  }, [activeTab, records])

  const filteredRecords = useMemo(() => {
    const normalizedSearch = nameSearch.trim().toLowerCase()

    return records.filter((record) => {
      const courseValue = getCourseByTab(record, activeTab)
      const yearValue = getYearByTab(record, activeTab)

      if (selectedCourse !== 'all' && courseValue !== selectedCourse) return false
      if (selectedYear !== 'all' && yearValue !== selectedYear) return false

      if (activeTab === 'volunteers' && selectedTeamLabel !== 'all') {
        if ((record.team_label || '') !== selectedTeamLabel) return false
      }

      if (normalizedSearch) {
        const searchableText = getSearchFieldsByTab(record, activeTab)
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        if (!searchableText.includes(normalizedSearch)) return false
      }

      if ((activeTab === 'participants' || activeTab === 'groups') && selectedEvent !== 'all') {
        if (activeTab === 'groups') {
          if ((record.event_id || '') !== selectedEvent) return false
          return true
        }

        const eventIds = normalizeEvents(record.events)
        if (!eventIds.includes(selectedEvent)) return false
      }

      return true
    })
  }, [records, activeTab, selectedCourse, selectedYear, selectedEvent, selectedTeamLabel, nameSearch])

  const sortedRecords = useMemo(() => {
    const output = [...filteredRecords]

    output.sort((left, right) => {
      if (sortKey === 'name_asc') {
        return String(getNameByTab(left, activeTab)).localeCompare(String(getNameByTab(right, activeTab)), undefined, { sensitivity: 'base' })
      }

      if (sortKey === 'name_desc') {
        return String(getNameByTab(right, activeTab)).localeCompare(String(getNameByTab(left, activeTab)), undefined, { sensitivity: 'base' })
      }

      if (sortKey === 'course_asc') {
        return String(getCourseByTab(left, activeTab)).localeCompare(String(getCourseByTab(right, activeTab)), undefined, { sensitivity: 'base' })
      }

      const leftTs = new Date(left.registered_at || 0).getTime()
      const rightTs = new Date(right.registered_at || 0).getTime()

      if (sortKey === 'registered_asc') return leftTs - rightTs
      return rightTs - leftTs
    })

    return output
  }, [filteredRecords, sortKey, activeTab])

  const columns =
    activeTab === 'students'
      ? STUDENT_COLUMNS
      : activeTab === 'participants'
        ? PARTICIPANT_COLUMNS
        : activeTab === 'volunteers'
          ? VOLUNTEER_COLUMNS
          : GROUP_COLUMNS
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds])
  const visibleIds = useMemo(() => sortedRecords.map((record) => record.id), [sortedRecords])
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedSet.has(id))

  const selectedPendingIds = useMemo(() => {
    return sortedRecords
      .filter((record) => selectedSet.has(record.id) && !isRecordApproved(record))
      .map((record) => record.id)
  }, [sortedRecords, selectedSet])

  const isBusy =
    isExporting ||
    Boolean(approvingId) ||
    Boolean(deletingId) ||
    Boolean(resendingId) ||
    Boolean(bulkAction)

  const approveRecordById = async (recordId) => {
    const approveEndpointByTab = {
      students: `/api/faculty/approve/student/${recordId}`,
      participants: `/api/faculty/approve/participant/${recordId}`,
      volunteers: `/api/faculty/approve/volunteer/${recordId}`,
      groups: `/api/faculty/approve/group/${recordId}`,
    }
    const endpoint = approveEndpointByTab[activeTab]

    const response = await fetch(endpoint, {
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

  const deleteRecordById = async (recordId, tabId = activeTab) => {
    const deleteEndpointByTab = {
      students: `/api/faculty/student/${recordId}`,
      participants: `/api/faculty/participant/${recordId}`,
      volunteers: `/api/faculty/volunteer/${recordId}`,
      groups: `/api/faculty/group/${recordId}`,
    }
    const endpoint = deleteEndpointByTab[tabId]

    const response = await fetch(endpoint, {
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
    const response = await fetch(`/api/faculty/resend/student/${recordId}`, {
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
    const response = await fetch(`/api/faculty/resend/participant/${recordId}`, {
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

  const resendVolunteerMailById = async (recordId) => {
    const response = await fetch(`/api/faculty/resend/volunteer/${recordId}`, {
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

  const resendGroupMailById = async (recordId) => {
    const response = await fetch(`/api/faculty/resend/group/${recordId}`, {
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
      const exportEndpointByTab = {
        students: '/api/faculty/export/students',
        participants: '/api/faculty/export/participants',
        volunteers: '/api/faculty/export/volunteers',
        groups: '/api/faculty/export/groups',
      }
      const exportFileByTab = {
        students: 'students_report.csv',
        participants: 'participants_report.csv',
        volunteers: 'volunteers_report.csv',
        groups: 'groups_report.csv',
      }

      const exportEndpoint = exportEndpointByTab[activeTab]

      const response = await fetch(exportEndpoint, {
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
      anchor.download = exportFileByTab[activeTab] || 'dashboard_report.csv'
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

      mutateRecordsForTab(activeTab, (previous) =>
        previous.map((record) =>
          record.id === recordId
            ? { ...record, qr_code: record.qr_code || 'approved', is_approved: true }
            : record
        )
      )
    } catch (error) {
      setErrorMessage(error.message || 'Approval failed')
    } finally {
      setApprovingId('')
    }
  }

  const handleUndoDelete = (recordId) => {
    const pending = pendingDeletesRef.current[recordId]
    if (!pending) return

    clearTimeout(pending.timerId)
    delete pendingDeletesRef.current[recordId]

    mutateRecordsForTab(pending.tabId, (previous) => {
      if (previous.some((record) => record.id === pending.record.id)) return previous

      const next = [...previous]
      const insertAt = Math.min(pending.recordIndex, next.length)
      next.splice(insertAt, 0, pending.record)
      return next
    })

    setUndoDeleteToast((previous) => (previous?.recordId === recordId ? null : previous))
    showStatusToast('Deletion undone', 'success', 2000)
  }

  const handleDeleteOne = (recordId) => {
    const confirmationByTab = {
      students: 'Delete this student registration? This cannot be undone.',
      participants: 'Delete this participant and linked event records? This cannot be undone.',
      volunteers: 'Delete this volunteer registration? This cannot be undone.',
      groups: 'Delete this group registration and linked group members? This cannot be undone.',
    }
    const confirmationText = confirmationByTab[activeTab] || 'Delete this record? This cannot be undone.'

    if (!window.confirm(confirmationText)) return
    if (undoDeleteToast) {
      setInfoMessage('Finish the current undo window before deleting another record.')
      return
    }

    const sourceRecords = activeTab === 'students' || activeTab === 'participants' || activeTab === 'volunteers' || activeTab === 'groups'
      ? records
      : []
    const recordIndex = sourceRecords.findIndex((record) => record.id === recordId)
    if (recordIndex === -1) return

    const removedRecord = sourceRecords[recordIndex]
    const tabId = activeTab

    setErrorMessage('')
    setInfoMessage('')
    setSelectedIds((previous) => previous.filter((id) => id !== recordId))

    mutateRecordsForTab(tabId, (previous) => previous.filter((record) => record.id !== recordId))

    const timerId = setTimeout(async () => {
      const pending = pendingDeletesRef.current[recordId]
      if (!pending) return

      delete pendingDeletesRef.current[recordId]
      setUndoDeleteToast((previous) => (previous?.recordId === recordId ? null : previous))

      setDeletingId(recordId)
      try {
        const result = await deleteRecordById(recordId, pending.tabId)
        if (!result.ok) {
          mutateRecordsForTab(pending.tabId, (previous) => {
            if (previous.some((record) => record.id === pending.record.id)) return previous

            const next = [...previous]
            const insertAt = Math.min(pending.recordIndex, next.length)
            next.splice(insertAt, 0, pending.record)
            return next
          })
          if (!result.unauthorized) showStatusToast('Failed to delete record', 'error', 3000)
          return
        }

        showStatusToast('Record deleted', 'success', 3000)
      } catch {
        mutateRecordsForTab(pending.tabId, (previous) => {
          if (previous.some((record) => record.id === pending.record.id)) return previous

          const next = [...previous]
          const insertAt = Math.min(pending.recordIndex, next.length)
          next.splice(insertAt, 0, pending.record)
          return next
        })
        showStatusToast('Failed to delete record', 'error', 3000)
      } finally {
        setDeletingId('')
      }
    }, 3000)

    pendingDeletesRef.current[recordId] = {
      timerId,
      tabId,
      record: removedRecord,
      recordIndex,
    }

    setUndoDeleteToast({
      recordId,
      message: 'Record removed. Undo?',
    })
  }

  const handleVolunteerTeamChange = async (record, selectedTeamLabel) => {
    const selectedTeam = OFFICIAL_VOLUNTEER_TEAMS.find((team) => team.team_label === selectedTeamLabel)
    const nextTeam = {
      team_id: selectedTeam?.team_id || '',
      team_label: selectedTeam?.team_label || '',
    }

    const previousTeam = {
      team_id: record.team_id || '',
      team_label: record.team_label || '',
    }

    mutateRecordsForTab('volunteers', (previous) =>
      previous.map((item) =>
        item.id === record.id
          ? { ...item, team_id: nextTeam.team_id, team_label: nextTeam.team_label }
          : item
      )
    )

    setAssigningTeamById((previous) => ({ ...previous, [record.id]: true }))

    try {
      const result = await assignVolunteerTeamById(record.id, nextTeam)
      if (!result.ok) {
        if (!result.unauthorized) {
          mutateRecordsForTab('volunteers', (previous) =>
            previous.map((item) =>
              item.id === record.id
                ? { ...item, team_id: previousTeam.team_id, team_label: previousTeam.team_label }
                : item
            )
          )
          showStatusToast('Failed to assign team', 'error', 3000)
        }
        return
      }

      showStatusToast('Assigned', 'success', 2000)
    } catch {
      mutateRecordsForTab('volunteers', (previous) =>
        previous.map((item) =>
          item.id === record.id
            ? { ...item, team_id: previousTeam.team_id, team_label: previousTeam.team_label }
            : item
        )
      )
      showStatusToast('Failed to assign team', 'error', 3000)
    } finally {
      setAssigningTeamById((previous) => {
        const next = { ...previous }
        delete next[record.id]
        return next
      })
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

  const handleResendVolunteerMail = async (recordId) => {
    setResendingId(recordId)
    setErrorMessage('')
    setInfoMessage('')

    try {
      const result = await resendVolunteerMailById(recordId)
      if (!result.ok) {
        if (!result.unauthorized) setErrorMessage(result.message || 'Resend failed')
        return
      }

      setInfoMessage('Approval email resent to volunteer successfully.')
    } catch (error) {
      setErrorMessage(error.message || 'Resend failed')
    } finally {
      setResendingId('')
    }
  }

  const handleResendGroupMail = async (recordId) => {
    setResendingId(recordId)
    setErrorMessage('')
    setInfoMessage('')

    try {
      const result = await resendGroupMailById(recordId)
      if (!result.ok) {
        if (!result.unauthorized) setErrorMessage(result.message || 'Resend failed')
        return
      }

      setInfoMessage('Approval email resent to group leader successfully.')
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
      } catch {
        failedIds.push(recordId)
      }
    }

    setBulkAction('')

    if (failedIds.length > 0) {
      setErrorMessage(`Approved ${successCount}. Failed for ${failedIds.length} record(s).`)
    } else if (activeTab === 'students') {
      setInfoMessage(`Approved ${successCount} student(s). Emails sent: ${mailCount}.`)
    } else if (activeTab === 'participants') {
      setInfoMessage(`Approved ${successCount} participant(s).`)
    } else if (activeTab === 'volunteers') {
      setInfoMessage(`Approved ${successCount} volunteer(s).`)
    } else {
      setInfoMessage(`Approved ${successCount} group record(s).`)
    }

    handleRefreshTab()
  }

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) {
      setInfoMessage('No selected records to delete.')
      return
    }

    if (undoDeleteToast || undoBulkDeleteToast) {
      setInfoMessage('Finish the current undo window before deleting more records.')
      return
    }

    const confirmationByTab = {
      students: `Delete ${selectedIds.length} selected student record(s)?`,
      participants: `Delete ${selectedIds.length} selected participant record(s) and linked events?`,
      volunteers: `Delete ${selectedIds.length} selected volunteer record(s)?`,
      groups: `Delete ${selectedIds.length} selected group record(s) and linked group members?`,
    }
    const confirmationText = confirmationByTab[activeTab] || `Delete ${selectedIds.length} selected record(s)?`

    if (!window.confirm(confirmationText)) return

    setBulkAction('deleting')
    setErrorMessage('')
    setInfoMessage('')
    const tabId = activeTab
    const selectedSetForDelete = new Set(selectedIds)
    const sourceRecords = records
    const removedRecords = sourceRecords
      .map((record, index) => ({ record, index }))
      .filter((entry) => selectedSetForDelete.has(entry.record.id))

    if (removedRecords.length === 0) {
      setBulkAction('')
      return
    }

    mutateRecordsForTab(tabId, (previous) =>
      previous.filter((record) => !selectedSetForDelete.has(record.id))
    )
    setSelectedIds([])

    const restoreRecords = (entriesToRestore) => {
      mutateRecordsForTab(tabId, (previous) => {
        const next = [...previous]
        const orderedEntries = [...entriesToRestore].sort((left, right) => left.index - right.index)

        orderedEntries.forEach((entry) => {
          if (next.some((record) => record.id === entry.record.id)) return
          const insertAt = Math.min(entry.index, next.length)
          next.splice(insertAt, 0, entry.record)
        })

        return next
      })
    }

    const timerId = setTimeout(async () => {
      const pending = pendingBulkDeleteRef.current
      if (!pending) return

      pendingBulkDeleteRef.current = null
      setUndoBulkDeleteToast(null)

      const failedIds = []
      let successCount = 0

      for (const recordId of pending.recordIds) {
        try {
          const result = await deleteRecordById(recordId, pending.tabId)
          if (result.ok) {
            successCount += 1
          } else {
            failedIds.push(recordId)
          }
        } catch {
          failedIds.push(recordId)
        }
      }

      if (failedIds.length > 0) {
        const entriesToRestore = pending.records.filter((entry) => failedIds.includes(entry.record.id))
        restoreRecords(entriesToRestore)
        showStatusToast(`Deleted ${successCount}. Failed for ${failedIds.length} record(s).`, 'error', 3000)
      } else {
        showStatusToast(`Deleted ${successCount} record(s).`, 'success', 3000)
      }

      setBulkAction('')
    }, 3000)

    pendingBulkDeleteRef.current = {
      timerId,
      tabId,
      records: removedRecords,
      recordIds: removedRecords.map((entry) => entry.record.id),
      restoreRecords,
    }

    setUndoBulkDeleteToast({
      tabId,
      count: removedRecords.length,
      message: `${removedRecords.length} record(s) removed. Undo?`,
    })
  }

  const handleUndoBulkDelete = () => {
    const pending = pendingBulkDeleteRef.current
    if (!pending) return

    clearTimeout(pending.timerId)
    pending.restoreRecords(pending.records)

    pendingBulkDeleteRef.current = null
    setUndoBulkDeleteToast(null)
    setBulkAction('')
    showStatusToast('Deletion undone', 'success', 2000)
  }

  const clearFilters = () => {
    setSelectedCourse('all')
    setSelectedYear('all')
    setSelectedEvent('all')
    setSelectedTeamLabel('all')
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
    if (column === 'team_label') return 140
    if (column === 'motivation') return 240
    if (column === 'phone') return 130
    if (column === 'team_name') return 170
    if (column === 'event_name') return 170
    if (column === 'leader_name') return 150
    if (column === 'leader_roll_no') return 150
    if (column === 'leader_course') return 130
    if (column === 'leader_year') return 110
    if (column === 'leader_email') return 220
    if (column === 'leader_phone') return 140
    if (column === 'event_1') return 130
    if (column === 'event_2') return 130
    if (column === 'qr_code') return 100
    if (column === 'registered_at') return 160
    return 110
  }

  const activeSummary =
    summaryByTab[activeTab] || { total: 0, approved_count: 0, pending_count: 0, approved_today: 0 }
  const isStudentOrParticipantTab = activeTab === 'students' || activeTab === 'participants'

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
                  ) : item.id === 'participants' ? (
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" aria-hidden="true">
                      <path d="M7 6h10v2a5 5 0 0 1-10 0V6Z" stroke="currentColor" strokeWidth="1.7" />
                      <path d="M9 17h6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                      <path d="M12 13v4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                    </svg>
                  ) : item.id === 'volunteers' ? (
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" aria-hidden="true">
                      <circle cx="9" cy="8" r="2.6" stroke="currentColor" strokeWidth="1.7" />
                      <path d="M3.8 18a5.2 5.2 0 0 1 10.4 0" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                      <path d="M15.5 7.5h4.7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                      <path d="M17.85 5.15V9.8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" aria-hidden="true">
                      <path d="M4 8h16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                      <path d="M4 12h16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                      <path d="M4 16h9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                    </svg>
                  )}
                  <span>{item.label}</span>
                </button>
              )
            })}

            <a
              href="/validate"
              target="_blank"
              rel="noreferrer"
              className="mt-2 flex h-10 w-full items-center gap-2 px-4 text-left text-[13px] tracking-[0.04em] transition"
              style={{
                color: 'rgba(238,230,216,0.7)',
                borderLeft: '2px solid rgba(201,168,76,0.35)',
              }}
              onMouseEnter={(event) => {
                event.currentTarget.style.background = 'rgba(201,168,76,0.08)'
                event.currentTarget.style.color = '#C9A84C'
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.background = 'transparent'
                event.currentTarget.style.color = 'rgba(238,230,216,0.7)'
              }}
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" aria-hidden="true">
                <rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="1.6" />
                <path d="M8 12h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                <path d="M12 8v8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
              <span>Entry Gate</span>
            </a>
          </nav>

          <div className="absolute bottom-0 left-0 w-full px-4 pb-4">
            <div className="mb-3 h-px w-full bg-[rgba(255,255,255,0.06)]" />
            <button
              type="button"
              onClick={handleExport}
              disabled={isExporting || tabLoading[activeTab]}
              className="mb-2 inline-flex h-9 w-full items-center justify-center gap-2 text-[11px] transition disabled:opacity-50"
              style={{
                border: '0.5px solid rgba(201,168,76,0.3)',
                color: '#C9A84C',
                background: 'transparent',
                borderRadius: '6px',
              }}
              onMouseEnter={(event) => {
                if (!isExporting && !tabLoading[activeTab]) event.currentTarget.style.background = 'rgba(201,168,76,0.07)'
              }}
              onMouseLeave={(event) => {
                if (!isExporting && !tabLoading[activeTab]) event.currentTarget.style.background = 'transparent'
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
              <div className="flex items-center gap-3">
                <div>
                  <p className="text-[14px] font-medium text-[#EEE6D8]">{getTabTitle(activeTab)}</p>
                  <p className="text-[11px] text-[rgba(238,230,216,0.35)]">Showing {sortedRecords.length} records</p>
                </div>
                <button
                  type="button"
                  onClick={handleRefreshTab}
                  disabled={tabLoading[activeTab]}
                  className="ml-2 inline-flex h-8 items-center gap-1 rounded-[4px] px-2 text-[11px] transition hover:bg-[rgba(201,168,76,0.1)] disabled:opacity-50"
                  style={{ color: '#C9A84C' }}
                  title="Refresh this tab's data"
                >
                  <svg viewBox="0 0 16 16" width="12" height="12" fill="none" className={tabLoading[activeTab] ? 'animate-spin' : ''} aria-hidden="true">
                    <path d="M2 6c0-2.2 1.8-4 4-4m8 2c0 2.2-1.8 4-4 4m2 4c0 2.2-1.8 4-4 4m-8-2c0-2.2 1.8-4 4-4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                  </svg>
                  <span>Refresh</span>
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate('/')}
                  className="hidden sm:flex items-center gap-1 text-[11px] text-[rgba(238,230,216,0.45)] hover:text-[#EEE6D8] transition-colors group px-2"
                >
                  <span className="group-hover:-translate-x-0.5 transition-transform">←</span>
                  <span>Home</span>
                </button>
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
            <AnimatePresence mode="wait">
              <Motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
              <section
                className="mb-4 flex h-16 overflow-hidden"
                style={{
                  background: 'rgba(255,255,255,0.018)',
                  border: '0.5px solid rgba(255,255,255,0.06)',
                  borderRadius: '10px',
                }}
              >
                  {isStudentOrParticipantTab ? (
                    <>
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
                    </>
                  ) : (
                    <>
                      <div className="flex flex-1 flex-col items-center justify-center">
                        <p className="text-[10px] uppercase tracking-[0.14em] text-[rgba(238,230,216,0.38)]">Total</p>
                        <p className="text-[22px] font-semibold text-[#EEE6D8]" style={DISPLAY_FONT}>{activeSummary.total}</p>
                      </div>
                      <div className="w-px bg-[rgba(255,255,255,0.06)]" />
                      <div className="flex flex-1 flex-col items-center justify-center">
                        <p className="text-[10px] uppercase tracking-[0.14em] text-[rgba(238,230,216,0.38)]">Approved</p>
                        <p className="text-[22px] font-semibold" style={{ ...DISPLAY_FONT, color: '#C9A84C' }}>
                          {activeSummary.approved_count}
                        </p>
                      </div>
                      <div className="w-px bg-[rgba(255,255,255,0.06)]" />
                      <div className="flex flex-1 flex-col items-center justify-center">
                        <p className="text-[10px] uppercase tracking-[0.14em] text-[rgba(238,230,216,0.38)]">Pending</p>
                        <p className="text-[22px] font-semibold" style={{ ...DISPLAY_FONT, color: activeSummary.pending_count > 0 ? '#B22234' : '#EEE6D8' }}>
                          {activeSummary.pending_count}
                        </p>
                      </div>
                    </>
                  )}
              </section>

              <section className="mb-3 flex flex-wrap items-center gap-3">
                <input
                  type="text"
                  value={nameSearch}
                  onChange={(event) => setNameSearch(event.target.value)}
                  placeholder={activeTab === 'groups' ? 'Search leader name, roll, or email' : 'Search name, roll, or email'}
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
                  <option value="all">{activeTab === 'groups' ? 'All Leader Courses' : 'All Courses'}</option>
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
                  <option value="all">{activeTab === 'groups' ? 'All Leader Years' : 'All Years'}</option>
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

                {activeTab === 'volunteers' && (
                  <select
                    value={selectedTeamLabel}
                    onChange={(event) => setSelectedTeamLabel(event.target.value)}
                    className="dash-select w-[190px]"
                    style={selectStyle}
                  >
                    <option value="all">All Team Labels</option>
                    {teamLabelOptions.map((teamLabel) => (
                      <option key={teamLabel} value={teamLabel}>
                        {teamLabel}
                      </option>
                    ))}
                  </select>
                )}

                {(activeTab === 'participants' || activeTab === 'groups') && (
                  <select
                    value={selectedEvent}
                    onChange={(event) => setSelectedEvent(event.target.value)}
                    className="dash-select w-[190px]"
                    style={selectStyle}
                  >
                    <option value="all">{activeTab === 'participants' ? 'All Events' : 'All Event IDs'}</option>
                    {eventOptions.map((eventId) => (
                      <option key={eventId} value={eventId}>
                        {activeTab === 'participants' ? (EVENT_NAME_BY_ID[eventId] || eventId) : eventId}
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
                    {tabLoading[activeTab] && (
                      <tr>
                        <td colSpan={columns.length + 2} className="px-[14px]">
                          <TableLoadingSkeleton />
                        </td>
                      </tr>
                    )}

                    {!tabLoading[activeTab] && sortedRecords.length === 0 && (
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

                    {!tabLoading[activeTab] &&
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

                              if (column === 'name' || column === 'leader_name') {
                                return (
                                  <td key={column} className="overflow-hidden px-[14px] align-middle text-[13px] font-medium text-[#EEE6D8]" style={{ whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                                    {record[column] || '-'}
                                  </td>
                                )
                              }

                              if (column === 'roll_no' || column === 'leader_roll_no') {
                                return (
                                  <td key={column} className="overflow-hidden px-[14px] align-middle font-mono text-[12px] text-[rgba(238,230,216,0.65)]" style={{ whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                                    {record[column] || '-'}
                                  </td>
                                )
                              }

                              if (column === 'email' || column === 'leader_email') {
                                return (
                                  <td key={column} className="overflow-hidden px-[14px] align-middle text-[12px] text-[rgba(238,230,216,0.65)]" style={{ whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                                    {record[column] || '-'}
                                  </td>
                                )
                              }

                              if (activeTab === 'volunteers' && column === 'team_label') {
                                const hasCustomTeamLabel =
                                  Boolean(record.team_label) &&
                                  !OFFICIAL_VOLUNTEER_TEAMS.some((team) => team.team_label === record.team_label)

                                return (
                                  <td key={column} className="overflow-hidden px-[14px] align-middle text-[13px] text-[#EEE6D8]">
                                    <div className="flex items-center gap-2">
                                      <select
                                        value={record.team_label || ''}
                                        onChange={(event) => handleVolunteerTeamChange(record, event.target.value)}
                                        disabled={Boolean(assigningTeamById[record.id])}
                                        className="dash-select h-[30px] w-full rounded-[6px] border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.03)] px-2 text-[11px] text-[#EEE6D8] disabled:opacity-60"
                                      >
                                        <option value="">-- Unassigned --</option>
                                        {hasCustomTeamLabel && (
                                          <option value={record.team_label}>{record.team_label}</option>
                                        )}
                                        {OFFICIAL_VOLUNTEER_TEAMS.map((team) => (
                                          <option key={team.team_id} value={team.team_label}>
                                            {team.team_label}
                                          </option>
                                        ))}
                                      </select>

                                      {assigningTeamById[record.id] && (
                                        <span className="inline-flex h-4 w-4 items-center justify-center" aria-label="Assigning team">
                                          <span className="h-3 w-3 animate-spin rounded-full border border-[rgba(201,168,76,0.3)] border-t-[#C9A84C]" />
                                        </span>
                                      )}
                                    </div>
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
                                    onClick={() =>
                                      activeTab === 'students'
                                        ? handleResendStudentMail(record.id)
                                        : activeTab === 'participants'
                                          ? handleResendParticipantMail(record.id)
                                          : activeTab === 'volunteers'
                                            ? handleResendVolunteerMail(record.id)
                                            : handleResendGroupMail(record.id)
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
                                  disabled={deletingId === record.id || isBusy || Boolean(undoDeleteToast)}
                                  className="h-[26px] rounded-[5px] px-3 text-[11px]"
                                  style={{
                                    border: '0.5px solid rgba(178,34,52,0.2)',
                                    color: 'rgba(178,34,52,0.55)',
                                    background: 'transparent',
                                  }}
                                  onMouseEnter={(event) => {
                                    if (!(deletingId === record.id || isBusy || undoDeleteToast)) {
                                      event.currentTarget.style.background = 'rgba(178,34,52,0.07)'
                                      event.currentTarget.style.color = '#B22234'
                                    }
                                  }}
                                  onMouseLeave={(event) => {
                                    if (!(deletingId === record.id || isBusy || undoDeleteToast)) {
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

              <AnimatePresence>
                {statusToast && (
                  <Motion.div
                    key={`status-${statusToast.id}`}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 12 }}
                    transition={{ duration: 0.18 }}
                    className="fixed bottom-5 right-5 z-50 rounded-[10px] border px-4 py-2 text-[12px] shadow-[0_8px_28px_rgba(0,0,0,0.35)]"
                    style={
                      statusToast.tone === 'error'
                        ? {
                            borderColor: 'rgba(178,34,52,0.45)',
                            background: 'rgba(178,34,52,0.15)',
                            color: '#F6D6D9',
                          }
                        : {
                            borderColor: 'rgba(82,196,26,0.35)',
                            background: 'rgba(82,196,26,0.14)',
                            color: '#D8F7C5',
                          }
                    }
                  >
                    {statusToast.message}
                  </Motion.div>
                )}

                {undoDeleteToast && (
                  <Motion.div
                    key={`undo-${undoDeleteToast.recordId}`}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 12 }}
                    transition={{ duration: 0.18 }}
                    className="fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-[10px] border px-4 py-2 text-[12px] shadow-[0_8px_28px_rgba(0,0,0,0.35)]"
                    style={{
                      borderColor: 'rgba(201,168,76,0.35)',
                      background: 'rgba(22,23,31,0.96)',
                      color: '#EEE6D8',
                    }}
                  >
                    <span>{undoDeleteToast.message}</span>
                    <button
                      type="button"
                      onClick={() => handleUndoDelete(undoDeleteToast.recordId)}
                      className="rounded-[5px] px-2 py-[2px] text-[11px]"
                      style={{
                        border: '0.5px solid rgba(201,168,76,0.38)',
                        color: '#C9A84C',
                        background: 'transparent',
                      }}
                    >
                      Undo
                    </button>
                  </Motion.div>
                )}

                {undoBulkDeleteToast && (
                  <Motion.div
                    key={`undo-bulk-${undoBulkDeleteToast.tabId}`}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 12 }}
                    transition={{ duration: 0.18 }}
                    className="fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-[10px] border px-4 py-2 text-[12px] shadow-[0_8px_28px_rgba(0,0,0,0.35)]"
                    style={{
                      borderColor: 'rgba(201,168,76,0.35)',
                      background: 'rgba(22,23,31,0.96)',
                      color: '#EEE6D8',
                    }}
                  >
                    <span>{undoBulkDeleteToast.message}</span>
                    <button
                      type="button"
                      onClick={handleUndoBulkDelete}
                      className="rounded-[5px] px-2 py-[2px] text-[11px]"
                      style={{
                        border: '0.5px solid rgba(201,168,76,0.38)',
                        color: '#C9A84C',
                        background: 'transparent',
                      }}
                    >
                      Undo
                    </button>
                  </Motion.div>
                )}
              </AnimatePresence>
              </Motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  )
}
