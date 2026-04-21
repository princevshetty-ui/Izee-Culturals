import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { EVENTS } from '../data/events.js'
import { apiFetch } from '../utils/api'

const _MOTION = motion

const DISPLAY_FONT = { fontFamily: 'Nevarademo, serif' }

const STUDENT_COLUMNS = ['name', 'roll_no', 'course', 'year', 'email', 'qr_code', 'registered_at']
const PARTICIPANT_COLUMNS = ['name', 'roll_no', 'course', 'year', 'email', 'event_1', 'event_2', 'qr_code', 'registered_at']
const VOLUNTEER_COLUMNS = ['name', 'roll_no', 'course', 'year', 'team_label', 'motivation', 'email', 'phone', 'registered_at', 'qr_code']
const GROUP_COLUMNS = ['team_name', 'event_name', 'leader_name', 'leader_roll_no', 'leader_course', 'leader_year', 'leader_email', 'leader_phone', 'registered_at', 'qr_code']

const COLUMN_LABELS = {
  roll_no: 'Roll No',
  event_1: 'Event1',
  event_2: 'Event2',
  team_label: 'Team Label',
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
  { id: 'voting', label: 'Voting Controls' },
]

const CATEGORIES = {
  performance: { label: 'Performance Based', events: ['Singing', 'Singing - Band', 'Dance', 'Dance - Crew', 'Instrumental'] },
  expression: { label: 'Expression Based', events: ['Standup Comedy', 'Poetry', 'Rap', 'Beatboxing'] },
  creative: { label: 'Creative Talents', events: ['Live Painting', 'Fashion Walk', 'Reel-making', 'Content Creation'] },
  wildcard: { label: 'Wildcard', events: ['Magic', 'Mimicry', 'Freestyle'] },
}

const VOLUNTEER_TEAM_OPTIONS = [
  'Registration & Reception Team',
  'Program Coordination Team',
  'Discipline & Security Committee',
  'Hospitality & Welfare Team',
]

const STUDENT_COURSES = ['BCA', 'BBA', 'BBA - Aviation']
const STUDENT_YEARS = ['1st', '2nd', '3rd']

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
  if (tabId === 'voting') return 'Voting Controls'
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

function makeEventIdFromName(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function parseWeightInput(value, fallback) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return parsed
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
  const [assigningTeamId, setAssigningTeamId] = useState('')
  const [teamDraftById, setTeamDraftById] = useState({})
  const [bulkTeamLabel, setBulkTeamLabel] = useState('')
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false)

  const [isVotingLoading, setIsVotingLoading] = useState(false)
  const [votingConfig, setVotingConfig] = useState(null)
  const [judgeWeightDraft, setJudgeWeightDraft] = useState('0.8')
  const [audienceWeightDraft, setAudienceWeightDraft] = useState('0.2')
  const [votingPerformances, setVotingPerformances] = useState([])
  const [votingVoters, setVotingVoters] = useState([])
  const [isPerformanceModalOpen, setIsPerformanceModalOpen] = useState(false)
  const [isVoterModalOpen, setIsVoterModalOpen] = useState(false)
  const [performanceDraft, setPerformanceDraft] = useState({
    title: '',
    performer_name: '',
    category_id: 'performance',
    event_name: CATEGORIES.performance.events[0],
  })
  const [voterDraft, setVoterDraft] = useState({
    name: '',
    roll_no: '',
    role: 'judge',
    password: '',
  })
  const [isSavingVotingConfig, setIsSavingVotingConfig] = useState(false)
  const [isSavingPerformance, setIsSavingPerformance] = useState(false)
  const [isSavingVoter, setIsSavingVoter] = useState(false)
  const [withdrawingPerformanceId, setWithdrawingPerformanceId] = useState('')
  const [deletingVoterId, setDeletingVoterId] = useState('')

  const [selectedCourse, setSelectedCourse] = useState('all')
  const [selectedYear, setSelectedYear] = useState('all')
  const [selectedEvent, setSelectedEvent] = useState('all')
  const [selectedTeamLabel, setSelectedTeamLabel] = useState('all')
  const [nameSearch, setNameSearch] = useState('')
  const [sortKey, setSortKey] = useState('registered_desc')
  const [pageByTab, setPageByTab] = useState({ students: 1, participants: 1, volunteers: 1, groups: 1, voting: 1 })
  const [paginationByTab, setPaginationByTab] = useState({
    students: { page: 1, pageSize: DEFAULT_PAGE_SIZE, total: 0, totalPages: 1 },
    participants: { page: 1, pageSize: DEFAULT_PAGE_SIZE, total: 0, totalPages: 1 },
    volunteers: { page: 1, pageSize: DEFAULT_PAGE_SIZE, total: 0, totalPages: 1 },
    groups: { page: 1, pageSize: DEFAULT_PAGE_SIZE, total: 0, totalPages: 1 },
    voting: { page: 1, pageSize: DEFAULT_PAGE_SIZE, total: 0, totalPages: 1 },
  })
  const [summaryByTab, setSummaryByTab] = useState({
    students: { total: 0, approved_count: 0, pending_count: 0, approved_today: 0 },
    participants: { total: 0, approved_count: 0, pending_count: 0, approved_today: 0 },
    volunteers: { total: 0, approved_count: 0, pending_count: 0, approved_today: 0 },
    groups: { total: 0, approved_count: 0, pending_count: 0, approved_today: 0 },
    voting: { total: 0, approved_count: 0, pending_count: 0, approved_today: 0 },
  })
  const [tabCache, setTabCache] = useState({
    students: null,
    participants: null,
    volunteers: null,
    groups: null,
    voting: null,
  })
  const [selectedIds, setSelectedIds] = useState([])
  const [registrationConfig, setRegistrationConfig] = useState({
    student_open: true,
    participant_open: true,
    volunteer_open: true,
  })
  const [isSavingRegistrationConfig, setIsSavingRegistrationConfig] = useState(false)
  const [isOnspotStudentModalOpen, setIsOnspotStudentModalOpen] = useState(false)
  const [isSavingOnspotStudent, setIsSavingOnspotStudent] = useState(false)
  const [onspotStudentDraft, setOnspotStudentDraft] = useState({
    name: '',
    roll_no: '',
    course: '',
    year: '',
    email: '',
  })
  const tabCacheRef = useRef(tabCache)
  const fetchRequestRef = useRef(0)

  const activePage = pageByTab[activeTab] || 1
  const currentPagination =
    paginationByTab[activeTab] ||
    { page: 1, pageSize: DEFAULT_PAGE_SIZE, total: 0, totalPages: 1 }

  const updateAuthFailure = () => {
    sessionStorage.removeItem('authenticated')
    sessionStorage.removeItem('facultyPassword')
    navigate('/faculty/login', { replace: true })
  }

  useEffect(() => {
    tabCacheRef.current = tabCache
  }, [tabCache])

  const fetchFacultyList = async (endpoint, signal) => {
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      const response = await apiFetch(endpoint, {
        signal,
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

  const fetchVotingPayload = async (endpoint, options = {}) => {
    const response = await apiFetch(endpoint, options)
    if (response.status === 401) {
      throw new Error('AUTH_UNAUTHORIZED')
    }

    const payload = await response.json().catch(() => ({}))
    if (!response.ok || !payload?.success) {
      throw new Error(getApiErrorMessage(payload, 'Voting request failed'))
    }

    return payload
  }

  const loadVotingControlsData = async (signal) => {
    const [configPayload, performancesPayload, votersPayload] = await Promise.all([
      fetchVotingPayload('/api/voting/config', { signal }),
      fetchVotingPayload('/api/voting/performances', {
        signal,
        headers: {
          Authorization: `Bearer ${facultyPassword}`,
        },
      }),
      fetchVotingPayload('/api/faculty/voting/voters', {
        signal,
        headers: {
          Authorization: `Bearer ${facultyPassword}`,
        },
      }),
    ])

    const config = configPayload.data || null
    setVotingConfig(config)
    setJudgeWeightDraft(String(config?.judge_weight ?? 0.8))
    setAudienceWeightDraft(String(config?.audience_weight ?? 0.2))
    setVotingPerformances(Array.isArray(performancesPayload.data) ? performancesPayload.data : [])
    setVotingVoters(Array.isArray(votersPayload.data) ? votersPayload.data : [])
  }

  const loadRegistrationConfig = async () => {
    const response = await apiFetch('/api/config/registrations')
    const payload = await response.json().catch(() => ({}))
    if (!response.ok || !payload?.success || !payload?.data) return

    setRegistrationConfig((previous) => ({
      ...previous,
      student_open: Boolean(payload.data.student_open),
      participant_open: Boolean(payload.data.participant_open),
      volunteer_open: Boolean(payload.data.volunteer_open),
    }))
  }

  const handleToggleRegistrationConfig = async (key) => {
    if (!facultyPassword || isSavingRegistrationConfig) return

    const nextValue = !Boolean(registrationConfig[key])
    setIsSavingRegistrationConfig(true)

    try {
      const response = await apiFetch('/api/faculty/config/registrations', {
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
      if (!response.ok || !payload?.success) {
        throw new Error(getApiErrorMessage(payload, 'Failed to update registration controls'))
      }

      setRegistrationConfig((previous) => ({
        ...previous,
        student_open: Boolean(payload.data?.student_open ?? previous.student_open),
        participant_open: Boolean(payload.data?.participant_open ?? previous.participant_open),
        volunteer_open: Boolean(payload.data?.volunteer_open ?? previous.volunteer_open),
      }))
      setInfoMessage(payload.message || 'Registration controls updated')
      setErrorMessage('')
    } catch (error) {
      setErrorMessage(error.message || 'Failed to update registration controls')
    } finally {
      setIsSavingRegistrationConfig(false)
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

    loadRegistrationConfig().catch(() => {
      // Keep defaults open if fetch fails.
    })
  }, [facultyPassword])

  useEffect(() => {
    setSelectedCourse('all')
    setSelectedYear('all')
    setSelectedEvent('all')
    setSelectedTeamLabel('all')
    setNameSearch('')
    setSelectedIds([])
    setBulkTeamLabel('')
    setInfoMessage('')
    setErrorMessage('')
    setIsMobileDrawerOpen(false)
  }, [activeTab])

  useEffect(() => {
    if (!isMobileDrawerOpen) return undefined

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsMobileDrawerOpen(false)
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [isMobileDrawerOpen])

  useEffect(() => {
    if (activeTab !== 'volunteers') {
      setTeamDraftById({})
      return
    }

    setTeamDraftById(
      records.reduce((accumulator, record) => {
        accumulator[record.id] = record.team_label || ''
        return accumulator
      }, {})
    )
  }, [activeTab, records])

  useEffect(() => {
    if (!facultyPassword) return

    const abortController = new AbortController()
    const requestId = fetchRequestRef.current + 1
    fetchRequestRef.current = requestId

    const isStaleRequest = () => abortController.signal.aborted || fetchRequestRef.current !== requestId

    if (activeTab === 'voting') {
      setIsVotingLoading(true)
      setErrorMessage('')
      setInfoMessage('')

      loadVotingControlsData(abortController.signal)
        .catch((error) => {
          if (error?.name === 'AbortError' || isStaleRequest()) return
          if (error?.message === 'AUTH_UNAUTHORIZED') {
            updateAuthFailure()
            return
          }
          setErrorMessage(error.message || 'Unable to load voting controls')
        })
        .finally(() => {
          if (!isStaleRequest()) {
            setIsVotingLoading(false)
            setIsLoading(false)
          }
        })

      return () => {
        abortController.abort()
      }
    }

    const fetchDashboardData = async () => {
      // Check if tab cache exists and use it instead of fetching
      if (tabCacheRef.current[activeTab] !== null && activePage === 1) {
        if (isStaleRequest()) return
        setIsLoading(false)
        const cachedData = tabCacheRef.current[activeTab]
        setRecords(cachedData.records)
        setSelectedIds([])
        setSummaryByTab((previous) => ({
          ...previous,
          [activeTab]: cachedData.summary,
        }))
        setPaginationByTab((previous) => ({
          ...previous,
          [activeTab]: cachedData.pagination,
        }))
        return
      }

      if (isStaleRequest()) return
      setIsLoading(true)
      setErrorMessage('')

      try {
        const endpointByTab = {
          students: '/api/faculty/students',
          participants: '/api/faculty/participants',
          volunteers: '/api/faculty/volunteers',
          groups: '/api/faculty/groups',
        }

        const currentEndpoint = `${endpointByTab[activeTab]}?page=${activePage}&page_size=${DEFAULT_PAGE_SIZE}`
        const shouldFetchAlternateSummary =
          (activeTab === 'students' || activeTab === 'participants') &&
          (activePage === 1 || refreshKey > 0)
        const alternateTab = activeTab === 'students' ? 'participants' : 'students'
        const alternateEndpoint = `${endpointByTab[alternateTab]}?page=1&page_size=5`

        const [currentResult, alternateResult] = await Promise.all([
          fetchFacultyList(currentEndpoint, abortController.signal),
          shouldFetchAlternateSummary
            ? fetchFacultyList(alternateEndpoint, abortController.signal)
            : Promise.resolve(null),
        ])

        if (isStaleRequest()) return

        const currentRecords = normalizeDashboardRecords(activeTab, currentResult.records || [])
        const currentSummary = normalizeSummaryPayload(currentResult.summary || {}, currentRecords)
        
        // Cache the fetched data for this tab
        if (activePage === 1) {
          setTabCache((previous) => ({
            ...previous,
            [activeTab]: {
              records: currentRecords,
              summary: currentSummary,
              pagination: currentResult.pagination || null,
            },
          }))
        }

        const nextPage = currentResult.pagination?.page || activePage

        setRecords(currentRecords)
        setSelectedIds([])
        setSummaryByTab((previous) => ({
          ...previous,
          [activeTab]: currentSummary,
        }))

        if (shouldFetchAlternateSummary && alternateResult) {
          const alternateRecords = normalizeDashboardRecords(alternateTab, alternateResult.records || [])
          const alternateSummary = normalizeSummaryPayload(alternateResult.summary || {}, alternateRecords)

          setSummaryByTab((previous) => ({
            ...previous,
            [activeTab]: currentSummary,
            [alternateTab]: alternateSummary,
          }))

          const studentsSummary = activeTab === 'students' ? currentSummary : alternateSummary
          const participantsSummary = activeTab === 'participants' ? currentSummary : alternateSummary

          setStats({
            totalStudents: Number(studentsSummary.total || 0),
            totalParticipants: Number(participantsSummary.total || 0),
            pendingApprovals:
              Number(studentsSummary.pending_count || 0) +
              Number(participantsSummary.pending_count || 0),
            approvedToday:
              Number(studentsSummary.approved_today || 0) +
              Number(participantsSummary.approved_today || 0),
          })
        }

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
        if (error?.name === 'AbortError' || isStaleRequest()) return

        if (error?.message === 'AUTH_UNAUTHORIZED') {
          updateAuthFailure()
          return
        }

        setErrorMessage(error.message || 'Unable to fetch data')
        setRecords([])
      } finally {
        if (!isStaleRequest()) {
          setIsLoading(false)
        }
      }
    }

    fetchDashboardData()
    return () => {
      abortController.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, activePage, facultyPassword, refreshKey])

  const invalidateActiveTabCache = () => {
    setTabCache((previous) => ({ ...previous, [activeTab]: null }))
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
        const currentTeam = (record.team_label || '').trim()
        if (selectedTeamLabel === 'unassigned') {
          if (currentTeam) return false
        } else if (currentTeam !== selectedTeamLabel) {
          return false
        }
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
    isLoading ||
    isVotingLoading ||
    isExporting ||
    Boolean(approvingId) ||
    Boolean(deletingId) ||
    Boolean(resendingId) ||
    Boolean(bulkAction) ||
    isSavingVotingConfig ||
    isSavingPerformance ||
    isSavingVoter ||
    Boolean(withdrawingPerformanceId) ||
    Boolean(deletingVoterId)

  const runWithConcurrency = async (ids, limit, worker) => {
    const queue = [...ids]
    const outcomes = []
    const workers = Array.from({ length: Math.max(1, Math.min(limit, queue.length || 1)) }, async () => {
      while (queue.length > 0) {
        const id = queue.shift()
        if (!id) continue
        try {
          const value = await worker(id)
          outcomes.push({ id, ok: true, value })
        } catch (error) {
          outcomes.push({ id, ok: false, error })
        }
      }
    })

    await Promise.all(workers)
    return outcomes
  }

  const approveRecordById = async (recordId) => {
    const approveEndpointByTab = {
      students: `/api/faculty/approve/student/${recordId}`,
      participants: `/api/faculty/approve/participant/${recordId}`,
      volunteers: `/api/faculty/approve/volunteer/${recordId}`,
      groups: `/api/faculty/approve/group/${recordId}`,
    }
    const endpoint = approveEndpointByTab[activeTab]

    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const response = await apiFetch(endpoint, {
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
        if (response.ok && payload.success) {
          return { ok: true, emailSent: payload.data?.email_sent }
        }

        const isRetriableStatus = response.status === 429 || response.status >= 500
        if (isRetriableStatus && attempt < 2) {
          await new Promise((resolve) => setTimeout(resolve, 200 * (attempt + 1)))
          continue
        }

        return { ok: false, message: getApiErrorMessage(payload, 'Approval failed') }
      } catch (error) {
        if (attempt < 2) {
          await new Promise((resolve) => setTimeout(resolve, 200 * (attempt + 1)))
          continue
        }

        return { ok: false, message: error.message || 'Approval failed' }
      }
    }

    return { ok: false, message: 'Approval failed' }
  }

  const deleteRecordById = async (recordId) => {
    const deleteEndpointByTab = {
      students: `/api/faculty/student/${recordId}`,
      participants: `/api/faculty/participant/${recordId}`,
      volunteers: `/api/faculty/volunteer/${recordId}`,
      groups: `/api/faculty/group/${recordId}`,
    }
    const endpoint = deleteEndpointByTab[activeTab]

    const response = await apiFetch(endpoint, {
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
    const response = await apiFetch(`/api/faculty/resend/student/${recordId}`, {
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
    const response = await apiFetch(`/api/faculty/resend/participant/${recordId}`, {
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
    const response = await apiFetch(`/api/faculty/resend/volunteer/${recordId}`, {
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
    const response = await apiFetch(`/api/faculty/resend/group/${recordId}`, {
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
    const response = await apiFetch(`/api/faculty/volunteer/${recordId}/assign-team`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${facultyPassword}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ team_label: teamLabel }),
    })

    if (response.status === 401) {
      updateAuthFailure()
      return { ok: false, unauthorized: true }
    }

    const payload = await response.json().catch(() => ({}))
    if (!response.ok || !payload.success) {
      return { ok: false, message: getApiErrorMessage(payload, 'Unable to assign volunteer team') }
    }

    return { ok: true, data: payload.data || {} }
  }

  const handleAssignVolunteerTeam = async (record) => {
    if (activeTab !== 'volunteers') return

    const selectedTeam = (teamDraftById[record.id] || '').trim()
    if (!selectedTeam) {
      setErrorMessage('Pick a team label before assigning.')
      return
    }

    if (selectedTeam === (record.team_label || '').trim()) {
      setInfoMessage('Team label already up to date.')
      return
    }

    setAssigningTeamId(record.id)
    setErrorMessage('')
    setInfoMessage('')

    try {
      const result = await assignVolunteerTeamById(record.id, selectedTeam)
      if (!result.ok) {
        if (!result.unauthorized) setErrorMessage(result.message || 'Unable to assign volunteer team')
        return
      }

      const assignedLabel = result.data?.team_label || selectedTeam
      setRecords((previous) =>
        previous.map((entry) =>
          entry.id === record.id ? { ...entry, team_label: assignedLabel } : entry
        )
      )
      setTabCache((previous) => {
        const volunteerCache = previous.volunteers
        if (!volunteerCache) return previous

        return {
          ...previous,
          volunteers: {
            ...volunteerCache,
            records: (volunteerCache.records || []).map((entry) =>
              entry.id === record.id ? { ...entry, team_label: assignedLabel } : entry
            ),
          },
        }
      })
      setTeamDraftById((previous) => ({ ...previous, [record.id]: assignedLabel }))
      setInfoMessage('Volunteer team assigned successfully.')
    } catch (error) {
      setErrorMessage(error.message || 'Unable to assign volunteer team')
    } finally {
      setAssigningTeamId('')
    }
  }

  const handleExport = async () => {
    if (activeTab === 'voting') {
      setInfoMessage('Voting controls do not have CSV export.')
      return
    }

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

      const response = await apiFetch(exportEndpoint, {
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

  const refreshVotingData = async () => {
    await loadVotingControlsData()
  }

  const patchVotingConfig = async (payload) => {
    const responsePayload = await fetchVotingPayload('/api/faculty/voting/config', {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${facultyPassword}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    const nextConfig = responsePayload.data || votingConfig
    setVotingConfig(nextConfig)
    setJudgeWeightDraft(String(nextConfig?.judge_weight ?? judgeWeightDraft))
    setAudienceWeightDraft(String(nextConfig?.audience_weight ?? audienceWeightDraft))
  }

  const handleToggleVotingOpen = async () => {
    if (!votingConfig) return
    setIsSavingVotingConfig(true)
    setErrorMessage('')
    setInfoMessage('')

    try {
      await patchVotingConfig({ voting_open: !Boolean(votingConfig.voting_open) })
      setInfoMessage(`Voting is now ${!Boolean(votingConfig.voting_open) ? 'open' : 'closed'}.`)
    } catch (error) {
      if (error?.message === 'AUTH_UNAUTHORIZED') {
        updateAuthFailure()
      } else {
        setErrorMessage(error.message || 'Unable to update voting status')
      }
    } finally {
      setIsSavingVotingConfig(false)
    }
  }

  const handleSaveVotingWeights = async () => {
    const judgeWeight = parseWeightInput(judgeWeightDraft, NaN)
    const audienceWeight = parseWeightInput(audienceWeightDraft, NaN)

    if (!Number.isFinite(judgeWeight) || !Number.isFinite(audienceWeight)) {
      setErrorMessage('Judge and Audience weights must be valid numbers.')
      return
    }

    const sum = judgeWeight + audienceWeight
    if (Math.abs(sum - 1) > 0.0001) {
      setErrorMessage('Judge Weight and Audience Weight must sum to 1.0.')
      return
    }

    setIsSavingVotingConfig(true)
    setErrorMessage('')
    setInfoMessage('')

    try {
      await patchVotingConfig({ judge_weight: judgeWeight, audience_weight: audienceWeight })
      setInfoMessage('Voting weights saved successfully.')
    } catch (error) {
      if (error?.message === 'AUTH_UNAUTHORIZED') {
        updateAuthFailure()
      } else {
        setErrorMessage(error.message || 'Unable to save voting weights')
      }
    } finally {
      setIsSavingVotingConfig(false)
    }
  }

  const handleTriggerReveal = async () => {
    if (Boolean(votingConfig?.voting_open)) return

    if (!window.confirm('Trigger Grand Reveal now? This action should only be done once voting is closed.')) {
      return
    }

    setIsSavingVotingConfig(true)
    setErrorMessage('')
    setInfoMessage('')

    try {
      await patchVotingConfig({ reveal_triggered: true })
      setInfoMessage('Grand Reveal triggered successfully.')
    } catch (error) {
      if (error?.message === 'AUTH_UNAUTHORIZED') {
        updateAuthFailure()
      } else {
        setErrorMessage(error.message || 'Unable to trigger grand reveal')
      }
    } finally {
      setIsSavingVotingConfig(false)
    }
  }

  const resetPerformanceDraft = () => {
    setPerformanceDraft({
      title: '',
      performer_name: '',
      category_id: 'performance',
      event_name: CATEGORIES.performance.events[0],
    })
  }

  const handlePerformanceCategoryChange = (categoryId) => {
    const fallbackEvent = CATEGORIES[categoryId]?.events?.[0] || ''
    setPerformanceDraft((previous) => ({
      ...previous,
      category_id: categoryId,
      event_name: fallbackEvent,
    }))
  }

  const handleAddPerformance = async () => {
    const title = performanceDraft.title.trim()
    const performerName = performanceDraft.performer_name.trim()
    const categoryId = performanceDraft.category_id
    const eventName = performanceDraft.event_name

    if (!title || !performerName || !categoryId || !eventName) {
      setErrorMessage('Fill all performance fields before saving.')
      return
    }

    setIsSavingPerformance(true)
    setErrorMessage('')
    setInfoMessage('')

    try {
      await fetchVotingPayload('/api/faculty/voting/performance', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${facultyPassword}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          performer_name: performerName,
          category_id: categoryId,
          category_label: CATEGORIES[categoryId]?.label || categoryId,
          event_id: makeEventIdFromName(eventName),
          event_name: eventName,
        }),
      })

      await refreshVotingData()
      setInfoMessage('Performance added successfully.')
      setIsPerformanceModalOpen(false)
      resetPerformanceDraft()
    } catch (error) {
      if (error?.message === 'AUTH_UNAUTHORIZED') {
        updateAuthFailure()
      } else {
        setErrorMessage(error.message || 'Unable to add performance')
      }
    } finally {
      setIsSavingPerformance(false)
    }
  }

  const handleToggleWithdrawPerformance = async (performance) => {
    setWithdrawingPerformanceId(performance.id)
    setErrorMessage('')
    setInfoMessage('')

    try {
      await fetchVotingPayload(`/api/faculty/voting/performance/${performance.id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${facultyPassword}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_withdrawn: !Boolean(performance.is_withdrawn) }),
      })

      await refreshVotingData()
      setInfoMessage('Performance status updated.')
    } catch (error) {
      if (error?.message === 'AUTH_UNAUTHORIZED') {
        updateAuthFailure()
      } else {
        setErrorMessage(error.message || 'Unable to update performance')
      }
    } finally {
      setWithdrawingPerformanceId('')
    }
  }

  const resetVoterDraft = () => {
    setVoterDraft({
      name: '',
      roll_no: '',
      role: 'judge',
      password: '',
    })
  }

  const handleAddVoter = async () => {
    const name = voterDraft.name.trim()
    const rollNo = voterDraft.roll_no.trim()
    const password = voterDraft.password

    if (!name || !rollNo || !password) {
      setErrorMessage('Fill all voter fields before saving.')
      return
    }

    setIsSavingVoter(true)
    setErrorMessage('')
    setInfoMessage('')

    try {
      await fetchVotingPayload('/api/faculty/voting/voter', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${facultyPassword}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          roll_no: rollNo,
          role: voterDraft.role,
          password,
        }),
      })

      await refreshVotingData()
      setInfoMessage('Voter added successfully.')
      setIsVoterModalOpen(false)
      resetVoterDraft()
    } catch (error) {
      if (error?.message === 'AUTH_UNAUTHORIZED') {
        updateAuthFailure()
      } else {
        setErrorMessage(error.message || 'Unable to add voter')
      }
    } finally {
      setIsSavingVoter(false)
    }
  }

  const handleDeleteVoter = async (voterId) => {
    if (!window.confirm('Delete this voter? This action cannot be undone.')) return

    setDeletingVoterId(voterId)
    setErrorMessage('')
    setInfoMessage('')

    try {
      await fetchVotingPayload(`/api/faculty/voting/voter/${voterId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${facultyPassword}`,
        },
      })

      await refreshVotingData()
      setInfoMessage('Voter deleted successfully.')
    } catch (error) {
      if (error?.message === 'AUTH_UNAUTHORIZED') {
        updateAuthFailure()
      } else {
        setErrorMessage(error.message || 'Unable to delete voter')
      }
    } finally {
      setDeletingVoterId('')
    }
  }

  const handleOnspotStudentInput = (event) => {
    const { name, value } = event.target
    setOnspotStudentDraft((previous) => ({ ...previous, [name]: value }))
  }

  const handleSubmitOnspotStudent = async () => {
    const payload = {
      name: onspotStudentDraft.name.trim(),
      roll_no: onspotStudentDraft.roll_no.trim(),
      course: onspotStudentDraft.course.trim(),
      year: onspotStudentDraft.year.trim(),
      email: onspotStudentDraft.email.trim(),
    }

    if (!payload.name || !payload.roll_no || !payload.course || !payload.year || !payload.email) {
      setErrorMessage('All on-spot registration fields are required.')
      return
    }

    setIsSavingOnspotStudent(true)
    setErrorMessage('')
    setInfoMessage('')

    try {
      const response = await apiFetch('/api/faculty/onspot/student', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${facultyPassword}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (response.status === 401) {
        updateAuthFailure()
        return
      }

      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data?.success) {
        throw new Error(getApiErrorMessage(data, 'On-spot registration failed'))
      }

      setIsOnspotStudentModalOpen(false)
      setOnspotStudentDraft({
        name: '',
        roll_no: '',
        course: '',
        year: '',
        email: '',
      })

      invalidateActiveTabCache()
      setRefreshKey((previous) => previous + 1)
      setInfoMessage(`On-spot student registered successfully. ID: ${data?.data?.id || '-'}`)
    } catch (error) {
      setErrorMessage(error.message || 'On-spot registration failed')
    } finally {
      setIsSavingOnspotStudent(false)
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

      invalidateActiveTabCache()
      setRefreshKey((previous) => previous + 1)
    } catch (error) {
      setErrorMessage(error.message || 'Approval failed')
    } finally {
      setApprovingId('')
    }
  }

  const handleDeleteOne = async (recordId) => {
    const confirmationByTab = {
      students: 'Delete this student registration? This cannot be undone.',
      participants: 'Delete this participant and linked event records? This cannot be undone.',
      volunteers: 'Delete this volunteer registration? This cannot be undone.',
      groups: 'Delete this group registration and linked group members? This cannot be undone.',
    }
    const confirmationText = confirmationByTab[activeTab] || 'Delete this record? This cannot be undone.'

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
      invalidateActiveTabCache()
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

    const approvalConcurrency = activeTab === 'students' ? 8 : 6
    const outcomes = await runWithConcurrency(selectedPendingIds, approvalConcurrency, async (recordId) => {
      const result = await approveRecordById(recordId)
      return { result }
    })

    outcomes.forEach((outcome) => {
      if (!outcome.ok) {
        failedIds.push(outcome.id)
        return
      }

      const result = outcome.value.result
      if (result.ok) {
        successCount += 1
        if (activeTab === 'students' && result.emailSent) mailCount += 1
      } else if (!result.unauthorized) {
        failedIds.push(outcome.id)
      }
    })

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

    invalidateActiveTabCache()
    setRefreshKey((previous) => previous + 1)
  }

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) {
      setInfoMessage('No selected records to delete.')
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

    const removedIds = []
    const failedIds = []

    const outcomes = await runWithConcurrency(selectedIds, 6, async (recordId) => {
      const result = await deleteRecordById(recordId)
      return { result }
    })

    outcomes.forEach((outcome) => {
      if (!outcome.ok) {
        failedIds.push(outcome.id)
        return
      }

      const result = outcome.value.result
      if (result.ok) {
        removedIds.push(outcome.id)
      } else if (!result.unauthorized) {
        failedIds.push(outcome.id)
      }
    })

    setBulkAction('')

    if (failedIds.length > 0) {
      setErrorMessage(`Deleted ${removedIds.length}. Failed for ${failedIds.length} record(s).`)
    } else {
      setInfoMessage(`Deleted ${removedIds.length} record(s) successfully.`)
    }

    invalidateActiveTabCache()
    setRefreshKey((previous) => previous + 1)
  }

  const clearFilters = () => {
    setSelectedCourse('all')
    setSelectedYear('all')
    setSelectedEvent('all')
    setSelectedTeamLabel('all')
    setNameSearch('')
    setSortKey('registered_desc')
  }

  const selectedVolunteerIds = useMemo(() => {
    if (activeTab !== 'volunteers') return []
    return sortedRecords.filter((record) => selectedSet.has(record.id)).map((record) => record.id)
  }, [activeTab, sortedRecords, selectedSet])

  const handleAssignSelectedVolunteers = async () => {
    if (activeTab !== 'volunteers') return

    const selectedTeam = bulkTeamLabel.trim()
    if (!selectedTeam) {
      setErrorMessage('Pick a team label before bulk assignment.')
      return
    }
    if (selectedVolunteerIds.length === 0) {
      setInfoMessage('No selected volunteers to assign.')
      return
    }

    setBulkAction('assigning_teams')
    setErrorMessage('')
    setInfoMessage('')

    const outcomes = await runWithConcurrency(selectedVolunteerIds, 6, async (recordId) => {
      const result = await assignVolunteerTeamById(recordId, selectedTeam)
      return { result }
    })

    const succeededIds = []
    const failedIds = []

    outcomes.forEach((outcome) => {
      if (!outcome.ok) {
        failedIds.push(outcome.id)
        return
      }

      const result = outcome.value.result
      if (result.ok) {
        succeededIds.push(outcome.id)
      } else if (!result.unauthorized) {
        failedIds.push(outcome.id)
      }
    })

    if (succeededIds.length > 0) {
      const successSet = new Set(succeededIds)
      setRecords((previous) =>
        previous.map((entry) =>
          successSet.has(entry.id) ? { ...entry, team_label: selectedTeam } : entry
        )
      )

      setTabCache((previous) => {
        const volunteerCache = previous.volunteers
        if (!volunteerCache) return previous

        return {
          ...previous,
          volunteers: {
            ...volunteerCache,
            records: (volunteerCache.records || []).map((entry) =>
              successSet.has(entry.id) ? { ...entry, team_label: selectedTeam } : entry
            ),
          },
        }
      })

      setTeamDraftById((previous) => {
        const next = { ...previous }
        succeededIds.forEach((id) => {
          next[id] = selectedTeam
        })
        return next
      })
    }

    if (failedIds.length > 0) {
      setErrorMessage(`Assigned ${succeededIds.length} volunteer(s). Failed for ${failedIds.length} record(s).`)
    } else {
      setInfoMessage(`Assigned ${succeededIds.length} volunteer(s) to ${selectedTeam}.`)
    }

    setBulkAction('')
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
  const actionColumnWidth = activeTab === 'volunteers' ? 380 : 160

  return (
    <div
      className="min-h-screen text-[#EEE6D8]"
      style={{
        background:
          'radial-gradient(960px circle at 14% 10%, rgba(201,168,76,0.08), transparent 60%), radial-gradient(900px circle at 88% 88%, rgba(178,34,52,0.08), transparent 58%), #080910',
      }}
    >
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

        .dash-panel {
          background: rgba(255,255,255,0.018);
          border: 0.5px solid rgba(255,255,255,0.08);
          border-radius: 10px;
          backdrop-filter: blur(8px);
        }
      `}</style>

      <div className="flex min-h-screen">
        <aside
          className="sticky top-0 hidden h-screen w-[220px] flex-shrink-0 border-r px-0 py-0 md:block"
          style={{
            background: 'rgba(8,9,16,0.95)',
            borderRight: '0.5px solid rgba(255,255,255,0.06)',
          }}
        >
          <div className="px-5 pt-6">
            <div className="flex items-center gap-3">
              <img
                src="/college-logo.png"
                alt="IZee Got Talent"
                className="h-[50px] w-auto object-contain"
              />
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

        <AnimatePresence>
          {isMobileDrawerOpen && (
            <>
              <motion.button
                type="button"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={() => setIsMobileDrawerOpen(false)}
                className="fixed inset-0 z-40 bg-black/55 md:hidden"
                aria-label="Close navigation drawer"
              />

              <motion.aside
                initial={{ x: -260, opacity: 0.96 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -260, opacity: 0.96 }}
                transition={{ duration: 0.24, ease: 'easeOut' }}
                className="fixed inset-y-0 left-0 z-50 w-[250px] border-r md:hidden"
                style={{
                  background: 'rgba(8,9,16,0.98)',
                  borderRight: '0.5px solid rgba(255,255,255,0.09)',
                }}
              >
                <div className="flex h-full flex-col">
                  <div className="px-5 pt-6">
                    <div className="flex items-center justify-between gap-3">
                      <img
                        src="/college-logo.png"
                        alt="IZee Got Talent"
                        className="h-[50px] w-auto object-contain"
                      />
                      <button
                        type="button"
                        onClick={() => setIsMobileDrawerOpen(false)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[rgba(238,230,216,0.7)]"
                        style={{ border: '0.5px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.03)' }}
                        aria-label="Close drawer"
                      >
                        ×
                      </button>
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
                          key={`mobile-${item.id}`}
                          type="button"
                          onClick={() => {
                            setActiveTab(item.id)
                            setIsMobileDrawerOpen(false)
                          }}
                          className="flex h-10 w-full items-center gap-2 px-4 text-left text-[13px] tracking-[0.04em] transition"
                          style={{
                            color: isActive ? '#C9A84C' : 'rgba(238,230,216,0.55)',
                            background: isActive ? 'rgba(201,168,76,0.09)' : 'transparent',
                            borderLeft: isActive ? '2px solid #C9A84C' : '2px solid transparent',
                            fontWeight: isActive ? 500 : 400,
                          }}
                        >
                          <span>{item.label}</span>
                        </button>
                      )
                    })}
                  </nav>

                  <div className="mt-auto px-4 pb-4">
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
                    >
                      Logout
                    </button>
                  </div>
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        <main className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden">
          <div className="h-[58px] border-b px-5 sm:px-6 lg:px-7" style={{ borderBottom: '0.5px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
            <div className="flex h-full items-center justify-between">
              <div>
                <p className="text-[14px] font-medium text-[#EEE6D8]">{getTabTitle(activeTab)}</p>
                <p className="text-[11px] text-[rgba(238,230,216,0.45)]">
                  {activeTab === 'voting'
                    ? `Performances: ${votingPerformances.length} | Voters: ${votingVoters.length}`
                    : `Showing ${sortedRecords.length} records`}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setIsMobileDrawerOpen(true)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-[6px] md:hidden"
                  style={{ border: '0.5px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.03)', color: 'rgba(238,230,216,0.78)' }}
                  aria-label="Open navigation drawer"
                >
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" aria-hidden="true">
                    <path d="M4 7h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    <path d="M4 12h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    <path d="M4 17h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </button>

                <button
                  onClick={() => navigate('/')}
                  className="inline-flex items-center gap-2 rounded-full border border-[#EEE6D8]/16 bg-[rgba(255,255,255,0.04)] px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.08em] text-[rgba(238,230,216,0.82)] transition hover:border-[#EEE6D8]/28 hover:bg-[rgba(255,255,255,0.07)] hover:text-[#EEE6D8]"
                  aria-label="Home"
                >
                  <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-[#BEA35D]/45 bg-[rgba(190,163,93,0.12)] text-[#BEA35D]">
                    <svg viewBox="0 0 16 16" width="8" height="8" fill="none" aria-hidden="true">
                      <path d="M9.75 3.25 5 8l4.75 4.75" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  Home
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
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              >
              {activeTab === 'voting' ? (
                <>
                  <section className="dash-panel mb-4 p-4 sm:p-5">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                      <h3 className="text-[14px] font-semibold text-[#EEE6D8]">Section 1 - Config Panel</h3>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                      <div className="rounded-[10px] border p-4" style={{ border: '0.5px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.015)' }}>
                        <p className="text-[11px] uppercase tracking-[0.12em] text-[rgba(238,230,216,0.45)]">Voting Open / Closed</p>
                        <div className="mt-3 flex items-center gap-3">
                          <button
                            type="button"
                            onClick={handleToggleVotingOpen}
                            disabled={!votingConfig || isSavingVotingConfig}
                            className="relative h-7 w-14 rounded-full transition"
                            style={{
                              background: votingConfig?.voting_open ? 'rgba(20,184,166,0.5)' : 'rgba(178,34,52,0.55)',
                              border: '0.5px solid rgba(255,255,255,0.2)',
                              opacity: !votingConfig || isSavingVotingConfig ? 0.55 : 1,
                            }}
                            aria-label="Toggle voting open"
                          >
                            <span
                              className="absolute top-[2px] h-[22px] w-[22px] rounded-full bg-[#EEE6D8] transition"
                              style={{ left: votingConfig?.voting_open ? '30px' : '2px' }}
                            />
                          </button>
                          <span className="text-[13px] font-medium" style={{ color: votingConfig?.voting_open ? '#14B8A6' : '#B22234' }}>
                            {votingConfig?.voting_open ? 'Voting Open' : 'Voting Closed'}
                          </span>
                        </div>
                      </div>

                      <div className="rounded-[10px] border p-4" style={{ border: '0.5px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.015)' }}>
                        <p className="text-[11px] uppercase tracking-[0.12em] text-[rgba(238,230,216,0.45)]">Weights</p>
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          <label className="text-[11px] text-[rgba(238,230,216,0.55)]">
                            Judge Weight
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              max="1"
                              value={judgeWeightDraft}
                              onChange={(event) => setJudgeWeightDraft(event.target.value)}
                              className="mt-1 h-[34px] w-full rounded-[6px] px-3 text-[12px]"
                              style={{ border: '0.5px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.03)', color: '#EEE6D8' }}
                            />
                          </label>
                          <label className="text-[11px] text-[rgba(238,230,216,0.55)]">
                            Audience Weight
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              max="1"
                              value={audienceWeightDraft}
                              onChange={(event) => setAudienceWeightDraft(event.target.value)}
                              className="mt-1 h-[34px] w-full rounded-[6px] px-3 text-[12px]"
                              style={{ border: '0.5px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.03)', color: '#EEE6D8' }}
                            />
                          </label>
                        </div>
                        <div className="mt-3 flex items-center justify-between">
                          <p className="text-[11px] text-[rgba(238,230,216,0.45)]">Sum should be exactly 1.0</p>
                          <button
                            type="button"
                            onClick={handleSaveVotingWeights}
                            disabled={isSavingVotingConfig}
                            className="h-[30px] rounded-[6px] px-3 text-[11px]"
                            style={{ border: '0.5px solid rgba(201,168,76,0.35)', color: '#C9A84C', background: 'transparent' }}
                          >
                            {isSavingVotingConfig ? 'Saving...' : 'Save Weights'}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-end">
                      <button
                        type="button"
                        onClick={handleTriggerReveal}
                        disabled={Boolean(votingConfig?.voting_open) || isSavingVotingConfig}
                        className="h-[34px] rounded-[8px] px-4 text-[11px] font-medium uppercase tracking-[0.08em]"
                        style={{
                          border: '0.5px solid rgba(178,34,52,0.45)',
                          color: '#F2D7DB',
                          background: 'rgba(178,34,52,0.35)',
                          opacity: Boolean(votingConfig?.voting_open) || isSavingVotingConfig ? 0.45 : 1,
                        }}
                      >
                        Trigger Grand Reveal
                      </button>
                    </div>
                  </section>

                  <section className="dash-panel mb-4 p-4 sm:p-5">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                      <h3 className="text-[14px] font-semibold text-[#EEE6D8]">Section 2 - Performances Management</h3>
                      <button
                        type="button"
                        onClick={() => setIsPerformanceModalOpen(true)}
                        className="h-[32px] rounded-[6px] px-3 text-[11px]"
                        style={{ border: '0.5px solid rgba(201,168,76,0.35)', color: '#C9A84C', background: 'transparent' }}
                      >
                        Add Performance
                      </button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="min-w-full border-separate border-spacing-0">
                        <thead>
                          <tr className="h-9" style={{ background: 'rgba(255,255,255,0.022)' }}>
                            <th className="px-3 text-left text-[10px] uppercase tracking-[0.14em] text-[rgba(201,168,76,0.7)]">Title</th>
                            <th className="px-3 text-left text-[10px] uppercase tracking-[0.14em] text-[rgba(201,168,76,0.7)]">Performer</th>
                            <th className="px-3 text-left text-[10px] uppercase tracking-[0.14em] text-[rgba(201,168,76,0.7)]">Category</th>
                            <th className="px-3 text-left text-[10px] uppercase tracking-[0.14em] text-[rgba(201,168,76,0.7)]">Event</th>
                            <th className="px-3 text-left text-[10px] uppercase tracking-[0.14em] text-[rgba(201,168,76,0.7)]">Active</th>
                            <th className="px-3 text-left text-[10px] uppercase tracking-[0.14em] text-[rgba(201,168,76,0.7)]">Withdraw</th>
                          </tr>
                        </thead>
                        <tbody>
                          {isVotingLoading && (
                            <tr>
                              <td colSpan={6} className="h-14 px-3 text-center text-[12px] text-[rgba(238,230,216,0.45)]">Loading performances...</td>
                            </tr>
                          )}
                          {!isVotingLoading && votingPerformances.length === 0 && (
                            <tr>
                              <td colSpan={6} className="h-14 px-3 text-center text-[12px] text-[rgba(238,230,216,0.45)]">No performances found.</td>
                            </tr>
                          )}
                          {!isVotingLoading && votingPerformances.map((performance) => (
                            <tr key={performance.id} className="h-10" style={{ borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
                              <td className="px-3 text-[12px] text-[#EEE6D8]">{performance.title || '-'}</td>
                              <td className="px-3 text-[12px] text-[rgba(238,230,216,0.72)]">{performance.performer_name || '-'}</td>
                              <td className="px-3 text-[12px] text-[rgba(238,230,216,0.72)]">{performance.category_label || performance.category_id || '-'}</td>
                              <td className="px-3 text-[12px] text-[rgba(238,230,216,0.72)]">{performance.event_name || '-'}</td>
                              <td className="px-3 text-[11px]" style={{ color: performance.is_active ? '#14B8A6' : '#B22234' }}>
                                {performance.is_active ? 'Active' : 'Inactive'}
                              </td>
                              <td className="px-3">
                                <label className="inline-flex items-center gap-2 text-[11px] text-[rgba(238,230,216,0.62)]">
                                  <input
                                    type="checkbox"
                                    className="dash-checkbox"
                                    checked={Boolean(performance.is_withdrawn)}
                                    onChange={() => handleToggleWithdrawPerformance(performance)}
                                    disabled={withdrawingPerformanceId === performance.id}
                                  />
                                  {withdrawingPerformanceId === performance.id ? 'Saving...' : (performance.is_withdrawn ? 'Withdrawn' : 'Open')}
                                </label>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>

                  <section className="dash-panel p-4 sm:p-5">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                      <h3 className="text-[14px] font-semibold text-[#EEE6D8]">Section 3 - Voter Management</h3>
                      <button
                        type="button"
                        onClick={() => setIsVoterModalOpen(true)}
                        className="h-[32px] rounded-[6px] px-3 text-[11px]"
                        style={{ border: '0.5px solid rgba(201,168,76,0.35)', color: '#C9A84C', background: 'transparent' }}
                      >
                        Add Voter
                      </button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="min-w-full border-separate border-spacing-0">
                        <thead>
                          <tr className="h-9" style={{ background: 'rgba(255,255,255,0.022)' }}>
                            <th className="px-3 text-left text-[10px] uppercase tracking-[0.14em] text-[rgba(201,168,76,0.7)]">Name</th>
                            <th className="px-3 text-left text-[10px] uppercase tracking-[0.14em] text-[rgba(201,168,76,0.7)]">Roll No</th>
                            <th className="px-3 text-left text-[10px] uppercase tracking-[0.14em] text-[rgba(201,168,76,0.7)]">Role</th>
                            <th className="px-3 text-left text-[10px] uppercase tracking-[0.14em] text-[rgba(201,168,76,0.7)]">Created</th>
                            <th className="px-3 text-left text-[10px] uppercase tracking-[0.14em] text-[rgba(201,168,76,0.7)]">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {isVotingLoading && (
                            <tr>
                              <td colSpan={5} className="h-14 px-3 text-center text-[12px] text-[rgba(238,230,216,0.45)]">Loading voters...</td>
                            </tr>
                          )}
                          {!isVotingLoading && votingVoters.length === 0 && (
                            <tr>
                              <td colSpan={5} className="h-14 px-3 text-center text-[12px] text-[rgba(238,230,216,0.45)]">No voters found.</td>
                            </tr>
                          )}
                          {!isVotingLoading && votingVoters.map((voter) => (
                            <tr key={voter.id} className="h-10" style={{ borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
                              <td className="px-3 text-[12px] text-[#EEE6D8]">{voter.name || '-'}</td>
                              <td className="px-3 font-mono text-[12px] text-[rgba(238,230,216,0.72)]">{voter.roll_no || '-'}</td>
                              <td className="px-3 text-[12px] capitalize text-[rgba(238,230,216,0.72)]">{voter.role || '-'}</td>
                              <td className="px-3 text-[11px] text-[rgba(238,230,216,0.52)]">{formatTimestamp(voter.created_at)}</td>
                              <td className="px-3">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteVoter(voter.id)}
                                  disabled={deletingVoterId === voter.id}
                                  className="h-[26px] rounded-[5px] px-3 text-[11px]"
                                  style={{ border: '0.5px solid rgba(178,34,52,0.2)', color: 'rgba(178,34,52,0.65)', background: 'transparent' }}
                                >
                                  {deletingVoterId === voter.id ? 'Deleting...' : 'Delete'}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>

                  <AnimatePresence>
                    {isPerformanceModalOpen && (
                      <>
                        <motion.button
                          type="button"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          onClick={() => {
                            if (isSavingPerformance) return
                            setIsPerformanceModalOpen(false)
                          }}
                          className="fixed inset-0 z-40 bg-black/60"
                        />
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 20 }}
                          className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-[12px] border p-4 sm:p-5"
                          style={{ border: '0.5px solid rgba(255,255,255,0.12)', background: '#0C0D12' }}
                        >
                          <h4 className="text-[14px] font-semibold text-[#EEE6D8]">Add Performance</h4>
                          <div className="mt-4 grid gap-3">
                            <input
                              type="text"
                              value={performanceDraft.title}
                              onChange={(event) => setPerformanceDraft((previous) => ({ ...previous, title: event.target.value }))}
                              placeholder="Title"
                              className="h-[36px] rounded-[6px] px-3 text-[12px]"
                              style={{ border: '0.5px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.03)', color: '#EEE6D8' }}
                            />
                            <input
                              type="text"
                              value={performanceDraft.performer_name}
                              onChange={(event) => setPerformanceDraft((previous) => ({ ...previous, performer_name: event.target.value }))}
                              placeholder="Performer Name"
                              className="h-[36px] rounded-[6px] px-3 text-[12px]"
                              style={{ border: '0.5px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.03)', color: '#EEE6D8' }}
                            />

                            <select
                              value={performanceDraft.category_id}
                              onChange={(event) => handlePerformanceCategoryChange(event.target.value)}
                              className="dash-select h-[36px] rounded-[6px] px-3 text-[12px]"
                              style={selectStyle}
                            >
                              {Object.entries(CATEGORIES).map(([id, config]) => (
                                <option key={id} value={id}>{config.label}</option>
                              ))}
                            </select>

                            <select
                              value={performanceDraft.event_name}
                              onChange={(event) => setPerformanceDraft((previous) => ({ ...previous, event_name: event.target.value }))}
                              className="dash-select h-[36px] rounded-[6px] px-3 text-[12px]"
                              style={selectStyle}
                            >
                              {(CATEGORIES[performanceDraft.category_id]?.events || []).map((eventName) => (
                                <option key={eventName} value={eventName}>{eventName}</option>
                              ))}
                            </select>

                            <input
                              type="text"
                              value={performanceDraft.event_name}
                              onChange={(event) => setPerformanceDraft((previous) => ({ ...previous, event_name: event.target.value }))}
                              placeholder="Event Name"
                              className="h-[36px] rounded-[6px] px-3 text-[12px]"
                              style={{ border: '0.5px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.03)', color: '#EEE6D8' }}
                            />
                          </div>

                          <div className="mt-4 flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                if (isSavingPerformance) return
                                setIsPerformanceModalOpen(false)
                              }}
                              className="h-[32px] rounded-[6px] px-3 text-[11px]"
                              style={{ border: '0.5px solid rgba(255,255,255,0.15)', color: 'rgba(238,230,216,0.72)', background: 'transparent' }}
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={handleAddPerformance}
                              disabled={isSavingPerformance}
                              className="h-[32px] rounded-[6px] px-3 text-[11px]"
                              style={{ border: '0.5px solid rgba(201,168,76,0.35)', color: '#C9A84C', background: 'transparent' }}
                            >
                              {isSavingPerformance ? 'Saving...' : 'Save Performance'}
                            </button>
                          </div>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>

                  <AnimatePresence>
                    {isVoterModalOpen && (
                      <>
                        <motion.button
                          type="button"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          onClick={() => {
                            if (isSavingVoter) return
                            setIsVoterModalOpen(false)
                          }}
                          className="fixed inset-0 z-40 bg-black/60"
                        />
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 20 }}
                          className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-[12px] border p-4 sm:p-5"
                          style={{ border: '0.5px solid rgba(255,255,255,0.12)', background: '#0C0D12' }}
                        >
                          <h4 className="text-[14px] font-semibold text-[#EEE6D8]">Add Voter</h4>
                          <div className="mt-4 grid gap-3">
                            <input
                              type="text"
                              value={voterDraft.name}
                              onChange={(event) => setVoterDraft((previous) => ({ ...previous, name: event.target.value }))}
                              placeholder="Name"
                              className="h-[36px] rounded-[6px] px-3 text-[12px]"
                              style={{ border: '0.5px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.03)', color: '#EEE6D8' }}
                            />
                            <input
                              type="text"
                              value={voterDraft.roll_no}
                              onChange={(event) => setVoterDraft((previous) => ({ ...previous, roll_no: event.target.value }))}
                              placeholder="Roll No"
                              className="h-[36px] rounded-[6px] px-3 text-[12px]"
                              style={{ border: '0.5px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.03)', color: '#EEE6D8' }}
                            />
                            <select
                              value={voterDraft.role}
                              onChange={(event) => setVoterDraft((previous) => ({ ...previous, role: event.target.value }))}
                              className="dash-select h-[36px] rounded-[6px] px-3 text-[12px]"
                              style={selectStyle}
                            >
                              <option value="judge">judge</option>
                              <option value="staff">staff</option>
                              <option value="student">student</option>
                            </select>
                            <input
                              type="password"
                              value={voterDraft.password}
                              onChange={(event) => setVoterDraft((previous) => ({ ...previous, password: event.target.value }))}
                              placeholder="Password"
                              className="h-[36px] rounded-[6px] px-3 text-[12px]"
                              style={{ border: '0.5px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.03)', color: '#EEE6D8' }}
                            />
                          </div>

                          <div className="mt-4 flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                if (isSavingVoter) return
                                setIsVoterModalOpen(false)
                              }}
                              className="h-[32px] rounded-[6px] px-3 text-[11px]"
                              style={{ border: '0.5px solid rgba(255,255,255,0.15)', color: 'rgba(238,230,216,0.72)', background: 'transparent' }}
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={handleAddVoter}
                              disabled={isSavingVoter}
                              className="h-[32px] rounded-[6px] px-3 text-[11px]"
                              style={{ border: '0.5px solid rgba(201,168,76,0.35)', color: '#C9A84C', background: 'transparent' }}
                            >
                              {isSavingVoter ? 'Saving...' : 'Save Voter'}
                            </button>
                          </div>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </>
              ) : (
              <>
              <section
                className="dash-panel mb-4 flex h-16 overflow-hidden"
                style={{
                  boxShadow: '0 10px 30px rgba(0,0,0,0.18)',
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

              <section className="dash-panel mb-3 p-3 sm:p-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-[rgba(238,230,216,0.5)]">Registration Controls</p>
                  <span className="text-[10px] text-[rgba(238,230,216,0.38)]">Public Forms</span>
                </div>

                <div className="grid gap-2 sm:grid-cols-3">
                  {[
                    { key: 'student_open', label: 'Student' },
                    { key: 'participant_open', label: 'Participant' },
                    { key: 'volunteer_open', label: 'Volunteer' },
                  ].map((item) => {
                    const isOpen = Boolean(registrationConfig[item.key])
                    return (
                      <div
                        key={item.key}
                        className="flex items-center justify-between rounded-[8px] border px-3 py-2"
                        style={{ border: '0.5px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.015)' }}
                      >
                        <p className="text-[12px] text-[rgba(238,230,216,0.78)]">{item.label}</p>
                        <button
                          type="button"
                          onClick={() => handleToggleRegistrationConfig(item.key)}
                          disabled={isSavingRegistrationConfig}
                          className="relative h-6 w-12 rounded-full transition disabled:opacity-55"
                          style={{
                            background: isOpen ? 'rgba(20,184,166,0.45)' : 'rgba(178,34,52,0.55)',
                            border: '0.5px solid rgba(255,255,255,0.18)',
                          }}
                          aria-label={`Toggle ${item.label} registration`}
                        >
                          <span
                            className="absolute top-[2px] h-[18px] w-[18px] rounded-full bg-[#EEE6D8] transition"
                            style={{ left: isOpen ? '26px' : '2px' }}
                          />
                        </button>
                      </div>
                    )
                  })}
                </div>
              </section>

              <section className="dash-panel mb-3 flex flex-wrap items-center gap-3 px-3 py-3">
                {activeTab === 'students' && (
                  <button
                    type="button"
                    onClick={() => setIsOnspotStudentModalOpen(true)}
                    className="h-[30px] rounded-[999px] px-4 text-[11px]"
                    style={{
                      border: '0.5px solid rgba(20,184,166,0.45)',
                      color: '#14B8A6',
                      background: 'transparent',
                    }}
                  >
                    On-Spot Audience Registration
                  </button>
                )}

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
                    <option value="unassigned">Unassigned</option>
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

              <section className="mb-1 flex items-center justify-between gap-3 rounded-[8px] py-[6px]">
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

              <section className="mb-2 flex items-center justify-between gap-3 rounded-[8px] py-[10px]">
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

                  {activeTab === 'volunteers' && (
                    <>
                      <select
                        value={bulkTeamLabel}
                        onChange={(event) => setBulkTeamLabel(event.target.value)}
                        disabled={isBusy}
                        className="dash-select h-[30px] w-[230px] rounded-[999px] px-3 text-[11px]"
                        style={selectStyle}
                      >
                        <option value="">Assign Team (Selected)</option>
                        {VOLUNTEER_TEAM_OPTIONS.map((teamOption) => (
                          <option key={teamOption} value={teamOption}>
                            {teamOption}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={handleAssignSelectedVolunteers}
                        disabled={selectedVolunteerIds.length === 0 || !bulkTeamLabel.trim() || isBusy}
                        className="h-[30px] px-4 text-[11px] disabled:cursor-not-allowed"
                        style={{
                          border: '0.5px solid rgba(20,184,166,0.45)',
                          color: '#14B8A6',
                          background: 'transparent',
                          borderRadius: '999px',
                          opacity: selectedVolunteerIds.length === 0 || !bulkTeamLabel.trim() || isBusy ? 0.3 : 1,
                        }}
                      >
                        {bulkAction === 'assigning_teams' ? 'Assigning...' : `Assign Team (${selectedVolunteerIds.length})`}
                      </button>
                    </>
                  )}

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

              <AnimatePresence>
                {isOnspotStudentModalOpen && activeTab === 'students' && (
                  <>
                    <motion.button
                      type="button"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => {
                        if (isSavingOnspotStudent) return
                        setIsOnspotStudentModalOpen(false)
                      }}
                      className="fixed inset-0 z-40 bg-black/60"
                    />

                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 20 }}
                      className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-[12px] border p-4 sm:p-5"
                      style={{ border: '0.5px solid rgba(255,255,255,0.12)', background: '#0C0D12' }}
                    >
                      <h4 className="text-[14px] font-semibold text-[#EEE6D8]">On-Spot Audience Registration</h4>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <input
                          type="text"
                          name="name"
                          value={onspotStudentDraft.name}
                          onChange={handleOnspotStudentInput}
                          placeholder="Full Name"
                          className="h-[36px] rounded-[6px] px-3 text-[12px] sm:col-span-2"
                          style={{ border: '0.5px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.03)', color: '#EEE6D8' }}
                        />
                        <input
                          type="text"
                          name="roll_no"
                          value={onspotStudentDraft.roll_no}
                          onChange={handleOnspotStudentInput}
                          placeholder="Roll No"
                          className="h-[36px] rounded-[6px] px-3 text-[12px]"
                          style={{ border: '0.5px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.03)', color: '#EEE6D8' }}
                        />
                        <select
                          name="course"
                          value={onspotStudentDraft.course}
                          onChange={handleOnspotStudentInput}
                          className="h-[36px] rounded-[6px] px-3 text-[12px]"
                          style={{ border: '0.5px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.03)', color: '#EEE6D8' }}
                        >
                          <option value="" className="bg-[#111111] text-[#EEE6D8]">Select Course</option>
                          {STUDENT_COURSES.map((course) => (
                            <option key={course} value={course} className="bg-[#111111] text-[#EEE6D8]">
                              {course}
                            </option>
                          ))}
                        </select>
                        <select
                          name="year"
                          value={onspotStudentDraft.year}
                          onChange={handleOnspotStudentInput}
                          className="h-[36px] rounded-[6px] px-3 text-[12px]"
                          style={{ border: '0.5px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.03)', color: '#EEE6D8' }}
                        >
                          <option value="" className="bg-[#111111] text-[#EEE6D8]">Select Year</option>
                          {STUDENT_YEARS.map((year) => (
                            <option key={year} value={year} className="bg-[#111111] text-[#EEE6D8]">
                              {year} Year
                            </option>
                          ))}
                        </select>
                        <input
                          type="email"
                          name="email"
                          value={onspotStudentDraft.email}
                          onChange={handleOnspotStudentInput}
                          placeholder="Email"
                          className="h-[36px] rounded-[6px] px-3 text-[12px] sm:col-span-2"
                          style={{ border: '0.5px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.03)', color: '#EEE6D8' }}
                        />
                      </div>

                      <div className="mt-4 flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (isSavingOnspotStudent) return
                            setIsOnspotStudentModalOpen(false)
                          }}
                          className="h-[32px] rounded-[6px] px-3 text-[11px]"
                          style={{ border: '0.5px solid rgba(255,255,255,0.15)', color: 'rgba(238,230,216,0.72)', background: 'transparent' }}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleSubmitOnspotStudent}
                          disabled={isSavingOnspotStudent}
                          className="h-[32px] rounded-[6px] px-3 text-[11px]"
                          style={{ border: '0.5px solid rgba(20,184,166,0.45)', color: '#14B8A6', background: 'transparent' }}
                        >
                          {isSavingOnspotStudent ? 'Registering...' : 'Register & Approve'}
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>

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
                        style={{ minWidth: `${actionColumnWidth}px`, width: `${actionColumnWidth}px`, borderBottom: '0.5px solid rgba(255,255,255,0.08)' }}
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

                              return (
                                <td key={column} className="overflow-hidden px-[14px] align-middle text-[13px] text-[#EEE6D8]" style={{ whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                                  {record[column] || '-'}
                                </td>
                              )
                            })}

                            <td className="overflow-hidden px-[14px] align-middle" style={{ width: `${actionColumnWidth}px`, minWidth: `${actionColumnWidth}px` }}>
                              <div className="flex flex-nowrap items-center gap-2">
                                {activeTab === 'volunteers' && (
                                  <>
                                    <select
                                      value={teamDraftById[record.id] || ''}
                                      onChange={(event) =>
                                        setTeamDraftById((previous) => ({
                                          ...previous,
                                          [record.id]: event.target.value,
                                        }))
                                      }
                                      disabled={assigningTeamId === record.id || isBusy}
                                      className="h-[26px] rounded-[5px] px-2 text-[10px]"
                                      style={{
                                        border: '0.5px solid rgba(255,255,255,0.12)',
                                        background: 'rgba(255,255,255,0.03)',
                                        color: '#EEE6D8',
                                        minWidth: '170px',
                                      }}
                                    >
                                      <option value="">Choose Team</option>
                                      {VOLUNTEER_TEAM_OPTIONS.map((teamOption) => (
                                        <option key={teamOption} value={teamOption}>
                                          {teamOption}
                                        </option>
                                      ))}
                                    </select>

                                    <button
                                      type="button"
                                      onClick={() => handleAssignVolunteerTeam(record)}
                                      disabled={
                                        assigningTeamId === record.id ||
                                        isBusy ||
                                        !(teamDraftById[record.id] || '').trim() ||
                                        (teamDraftById[record.id] || '').trim() === (record.team_label || '').trim()
                                      }
                                      className="h-[26px] rounded-[5px] px-3 text-[10px]"
                                      style={{
                                        border: '0.5px solid rgba(20,184,166,0.35)',
                                        color: '#14B8A6',
                                        background: 'transparent',
                                      }}
                                    >
                                      {assigningTeamId === record.id ? 'Saving...' : 'Assign Team'}
                                    </button>
                                  </>
                                )}

                                {!isRecordApproved(record) && (
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
                                )}

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
                                  disabled={!isRecordApproved(record) || resendingId === record.id || isBusy}
                                  className="h-[26px] rounded-[5px] px-3 text-[11px]"
                                  style={{
                                    border: '0.5px solid rgba(255,255,255,0.1)',
                                    color: 'rgba(238,230,216,0.45)',
                                    background: 'transparent',
                                    opacity: !isRecordApproved(record) ? 0.45 : 1,
                                  }}
                                  onMouseEnter={(event) => {
                                    if (!(!isRecordApproved(record) || resendingId === record.id || isBusy)) {
                                      event.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'
                                      event.currentTarget.style.color = 'rgba(238,230,216,0.7)'
                                    }
                                  }}
                                  onMouseLeave={(event) => {
                                    if (!(!isRecordApproved(record) || resendingId === record.id || isBusy)) {
                                      event.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'
                                      event.currentTarget.style.color = 'rgba(238,230,216,0.45)'
                                    }
                                  }}
                                >
                                  {resendingId === record.id ? 'Sending...' : 'Resend'}
                                </button>

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
              </>
              )}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  )
}
