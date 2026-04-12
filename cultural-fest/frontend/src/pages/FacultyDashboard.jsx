import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { EVENTS } from '../data/events.js'

const DISPLAY_FONT = { fontFamily: 'Cormorant Garamond, serif' }

const STUDENT_COLUMNS = [
  'id',
  'name',
  'roll_no',
  'course',
  'year',
  'email',
  'phone',
  'qr_code',
  'registered_at'
]

const PARTICIPANT_COLUMNS = [
  'id',
  'name',
  'roll_no',
  'course',
  'year',
  'email',
  'phone',
  'qr_code',
  'events',
  'registered_at'
]

const EVENT_NAME_BY_ID = EVENTS.reduce((accumulator, event) => {
  accumulator[event.id] = event.name
  return accumulator
}, {})

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

export default function FacultyDashboard() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('students')
  const [facultyPassword, setFacultyPassword] = useState('')
  const [records, setRecords] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [isExporting, setIsExporting] = useState(false)

  const [selectedCourse, setSelectedCourse] = useState('all')
  const [selectedYear, setSelectedYear] = useState('all')
  const [selectedEvent, setSelectedEvent] = useState('all')

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
  }, [activeTab])

  useEffect(() => {
    if (!facultyPassword) return

    const fetchRecords = async () => {
      setIsLoading(true)
      setErrorMessage('')

      try {
        const endpoint = activeTab === 'students' ? '/api/faculty/students' : '/api/faculty/participants'
        const response = await fetch(endpoint, {
          headers: {
            Authorization: `Bearer ${facultyPassword}`
          }
        })

        if (response.status === 401) {
          sessionStorage.removeItem('authenticated')
          sessionStorage.removeItem('facultyPassword')
          navigate('/faculty/login', { replace: true })
          return
        }

        const payload = await response.json()
        if (!response.ok || !payload.success) {
          throw new Error(payload?.message || 'Failed to fetch dashboard data')
        }

        setRecords(payload.data || [])
      } catch (error) {
        setErrorMessage(error.message || 'Unable to fetch data')
        setRecords([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchRecords()
  }, [activeTab, facultyPassword, navigate])

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
      normalizeEvents(record.events).forEach((eventId) => {
        uniqueEvents.add(eventId)
      })
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

      return true
    })
  }, [records, activeTab, selectedCourse, selectedYear, selectedEvent])

  const columns = activeTab === 'students' ? STUDENT_COLUMNS : PARTICIPANT_COLUMNS

  const handleExport = async () => {
    setIsExporting(true)
    setErrorMessage('')

    try {
      const exportEndpoint =
        activeTab === 'students'
          ? '/api/faculty/export/students'
          : '/api/faculty/export/participants'

      const response = await fetch(exportEndpoint, {
        headers: {
          Authorization: `Bearer ${facultyPassword}`
        }
      })

      if (response.status === 401) {
        sessionStorage.removeItem('authenticated')
        sessionStorage.removeItem('facultyPassword')
        navigate('/faculty/login', { replace: true })
        return
      }

      if (!response.ok) {
        throw new Error('CSV export failed')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = activeTab === 'students' ? 'students.csv' : 'participants.csv'
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      window.URL.revokeObjectURL(url)
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

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#F5F0E8]">
      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="rounded-3xl border border-[#F5F0E8]/10 bg-[#101010] p-5 sm:p-7"
        >
          <div className="flex flex-col gap-4 border-b border-[#F5F0E8]/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[#C9A84C]">Cultural Committee</p>
              <h1 className="mt-2 text-4xl text-[#F5F0E8]" style={DISPLAY_FONT}>
                Faculty Dashboard
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleExport}
                disabled={isExporting || isLoading}
                className="rounded-lg border border-[#C9A84C]/45 px-4 py-2 text-sm font-medium text-[#C9A84C] transition hover:bg-[#C9A84C]/10 disabled:opacity-60"
              >
                {isExporting ? 'Exporting...' : 'Export CSV'}
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-lg border border-[#F5F0E8]/20 px-4 py-2 text-sm text-[#F5F0E8]/80 transition hover:border-[#C9A84C]/45 hover:text-[#F5F0E8]"
              >
                Logout
              </button>
            </div>
          </div>

          <div className="mt-6 flex items-end gap-6 border-b border-[#F5F0E8]/10">
            <button
              type="button"
              onClick={() => setActiveTab('students')}
              className={`pb-3 text-sm uppercase tracking-[0.12em] transition ${
                activeTab === 'students'
                  ? 'border-b-2 border-[#C9A84C] text-[#C9A84C]'
                  : 'text-[#F5F0E8]/62 hover:text-[#F5F0E8]'
              }`}
            >
              Students
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('participants')}
              className={`pb-3 text-sm uppercase tracking-[0.12em] transition ${
                activeTab === 'participants'
                  ? 'border-b-2 border-[#C9A84C] text-[#C9A84C]'
                  : 'text-[#F5F0E8]/62 hover:text-[#F5F0E8]'
              }`}
            >
              Participants
            </button>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <select
              value={selectedCourse}
              onChange={(event) => setSelectedCourse(event.target.value)}
              className="rounded-lg border border-[#F5F0E8]/15 bg-[#0D0D0D] px-3 py-2 text-sm text-[#F5F0E8] outline-none transition focus:border-[#C9A84C]/65"
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
              className="rounded-lg border border-[#F5F0E8]/15 bg-[#0D0D0D] px-3 py-2 text-sm text-[#F5F0E8] outline-none transition focus:border-[#C9A84C]/65"
            >
              <option value="all">All Years</option>
              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>

            {activeTab === 'participants' && (
              <select
                value={selectedEvent}
                onChange={(event) => setSelectedEvent(event.target.value)}
                className="rounded-lg border border-[#F5F0E8]/15 bg-[#0D0D0D] px-3 py-2 text-sm text-[#F5F0E8] outline-none transition focus:border-[#C9A84C]/65"
              >
                <option value="all">All Events</option>
                {eventOptions.map((eventId) => (
                  <option key={eventId} value={eventId}>
                    {EVENT_NAME_BY_ID[eventId] || eventId}
                  </option>
                ))}
              </select>
            )}
          </div>

          {errorMessage && (
            <div className="mt-5 rounded-xl border border-red-500/35 bg-red-500/10 p-3 text-sm text-red-400">
              {errorMessage}
            </div>
          )}

          <div className="mt-6 overflow-x-auto rounded-2xl border border-[#F5F0E8]/10">
            <table className="min-w-full border-collapse text-sm">
              <thead className="bg-[#151515]">
                <tr>
                  {columns.map((column) => (
                    <th key={column} className="whitespace-nowrap px-4 py-3 text-left font-medium text-[#C9A84C]">
                      {titleCaseFromSnakeCase(column)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr>
                    <td colSpan={columns.length} className="px-4 py-10 text-center text-[#F5F0E8]/66">
                      Loading records...
                    </td>
                  </tr>
                )}

                {!isLoading && filteredRecords.length === 0 && (
                  <tr>
                    <td colSpan={columns.length} className="px-4 py-10 text-center text-[#F5F0E8]/66">
                      No records found for selected filters.
                    </td>
                  </tr>
                )}

                {!isLoading &&
                  filteredRecords.map((record) => (
                    <tr key={record.id} className="border-t border-[#F5F0E8]/8 hover:bg-[#131313]">
                      {columns.map((column) => {
                        let value = record[column]

                        if (column === 'events') {
                          const ids = normalizeEvents(value)
                          value = ids.map((eventId) => EVENT_NAME_BY_ID[eventId] || eventId).join(', ')
                        }

                        if (column === 'registered_at' && value) {
                          value = new Date(value).toLocaleString()
                        }

                        if (column === 'qr_code' && value) {
                          value = `${String(value).slice(0, 24)}...`
                        }

                        return (
                          <td key={column} className="whitespace-nowrap px-4 py-3 text-[#F5F0E8]/85">
                            {value || '-'}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </main>
    </div>
  )
}
