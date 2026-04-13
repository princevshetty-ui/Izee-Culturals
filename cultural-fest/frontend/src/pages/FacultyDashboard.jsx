import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { EVENTS } from '../data/events.js'

const DISPLAY_FONT = { fontFamily: 'Nevarademo, serif' }

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

function getApiErrorMessage(payload, fallback) {
  return payload?.detail || payload?.message || fallback
}

export default function FacultyDashboard() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('students')
  const [facultyPassword, setFacultyPassword] = useState('')
  const [records, setRecords] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [infoMessage, setInfoMessage] = useState('')
  const [isExporting, setIsExporting] = useState(false)
  const [approvingId, setApprovingId] = useState('')
  const [deletingId, setDeletingId] = useState('')
  const [resendingId, setResendingId] = useState('')
  const [bulkAction, setBulkAction] = useState('')

  const [selectedCourse, setSelectedCourse] = useState('all')
  const [selectedYear, setSelectedYear] = useState('all')
  const [selectedEvent, setSelectedEvent] = useState('all')
  const [selectedIds, setSelectedIds] = useState([])

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
    setSelectedIds([])
    setInfoMessage('')
    setErrorMessage('')
  }, [activeTab])

  useEffect(() => {
    if (!facultyPassword) return

    const fetchRecords = async () => {
      setIsLoading(true)
      setErrorMessage('')

      try {
        const endpoint = activeTab === 'students' ? '/api/faculty/students' : '/api/faculty/participants'
        let successPayload = null

        for (let attempt = 1; attempt <= 2; attempt += 1) {
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

          const payload = await response.json().catch(() => ({}))

          if (response.ok && payload?.success) {
            successPayload = payload
            break
          }

          const isServerError = response.status >= 500
          if (isServerError && attempt < 2) {
            await new Promise((resolve) => setTimeout(resolve, 250))
            continue
          }

          throw new Error(getApiErrorMessage(payload, 'Failed to fetch dashboard data'))
        }

        setRecords(successPayload?.data || [])
        setSelectedIds([])
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

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds])
  const visibleIds = useMemo(() => filteredRecords.map((record) => record.id), [filteredRecords])
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedSet.has(id))

  const selectedPendingIds = useMemo(() => {
    return filteredRecords
      .filter((record) => selectedSet.has(record.id) && !record.qr_code)
      .map((record) => record.id)
  }, [filteredRecords, selectedSet])

  const isBusy =
    isLoading ||
    isExporting ||
    Boolean(approvingId) ||
    Boolean(deletingId) ||
    Boolean(resendingId) ||
    Boolean(bulkAction)

  const updateAuthFailure = () => {
    sessionStorage.removeItem('authenticated')
    sessionStorage.removeItem('facultyPassword')
    navigate('/faculty/login', { replace: true })
  }

  const approveRecordById = async (recordId) => {
    const endpoint =
      activeTab === 'students'
        ? `/api/faculty/approve/student/${recordId}`
        : `/api/faculty/approve/participant/${recordId}`

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${facultyPassword}`
      }
    })

    if (response.status === 401) {
      updateAuthFailure()
      return { ok: false, unauthorized: true }
    }

    const payload = await response.json()
    if (!response.ok || !payload.success) {
      return { ok: false, message: getApiErrorMessage(payload, 'Approval failed') }
    }

    const qrCode = payload.data?.qr_code || null
    const emailSent = payload.data?.email_sent
    return { ok: true, qrCode, emailSent }
  }

  const deleteRecordById = async (recordId) => {
    const endpoint =
      activeTab === 'students'
        ? `/api/faculty/student/${recordId}`
        : `/api/faculty/participant/${recordId}`

    const response = await fetch(endpoint, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${facultyPassword}`
      }
    })

    if (response.status === 401) {
      updateAuthFailure()
      return { ok: false, unauthorized: true }
    }

    const payload = await response.json()
    if (!response.ok || !payload.success) {
      return { ok: false, message: getApiErrorMessage(payload, 'Delete failed') }
    }

    return { ok: true }
  }

  const resendStudentMailById = async (recordId) => {
    const response = await fetch(`/api/faculty/resend/student/${recordId}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${facultyPassword}`
      }
    })

    if (response.status === 401) {
      updateAuthFailure()
      return { ok: false, unauthorized: true }
    }

    const payload = await response.json()
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

      const response = await fetch(exportEndpoint, {
        headers: {
          Authorization: `Bearer ${facultyPassword}`
        }
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
      anchor.download = activeTab === 'students' ? 'students.csv' : 'participants.csv'
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
        if (!result.unauthorized) {
          setErrorMessage(result.message || 'Approval failed')
        }
        return
      }

      setRecords((prev) =>
        prev.map((record) =>
          record.id === recordId
            ? { ...record, qr_code: result.qrCode, approved: true }
            : record
        )
      )

      if (activeTab === 'students') {
        const mailText = result.emailSent
          ? 'Student approved and email sent'
          : 'Student approved. Email was not sent (check SMTP config).'
        setInfoMessage(mailText)
      } else {
        setInfoMessage('Participant approved successfully')
      }
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
        if (!result.unauthorized) {
          setErrorMessage(result.message || 'Delete failed')
        }
        return
      }

      setRecords((prev) => prev.filter((record) => record.id !== recordId))
      setSelectedIds((prev) => prev.filter((id) => id !== recordId))
      setInfoMessage('Record deleted successfully')
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
      const result = await resendStudentMailById(recordId)
      if (!result.ok) {
        if (!result.unauthorized) {
          setErrorMessage(result.message || 'Resend failed')
        }
        return
      }

      setInfoMessage('Approval email resent successfully')
    } catch (error) {
      setErrorMessage(error.message || 'Resend failed')
    } finally {
      setResendingId('')
    }
  }

  const handleSelectRow = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id)
        ? prev.filter((selectedId) => selectedId !== id)
        : [...prev, id]
    )
  }

  const handleSelectAllVisible = () => {
    setSelectedIds((prev) => {
      const merged = new Set([...prev, ...visibleIds])
      return [...merged]
    })
  }

  const handleUnselectAllVisible = () => {
    const visibleSet = new Set(visibleIds)
    setSelectedIds((prev) => prev.filter((id) => !visibleSet.has(id)))
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
      setInfoMessage('No pending selected records to approve')
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
          if (activeTab === 'students' && result.emailSent) {
            mailCount += 1
          }
          setRecords((prev) =>
            prev.map((record) =>
              record.id === recordId
                ? { ...record, qr_code: result.qrCode, approved: true }
                : record
            )
          )
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
  }

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) {
      setInfoMessage('No selected records to delete')
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

    if (removedIds.length > 0) {
      const removedSet = new Set(removedIds)
      setRecords((prev) => prev.filter((record) => !removedSet.has(record.id)))
      setSelectedIds((prev) => prev.filter((id) => !removedSet.has(id)))
    }

    setBulkAction('')

    if (failedIds.length > 0) {
      setErrorMessage(`Deleted ${removedIds.length}. Failed for ${failedIds.length} record(s).`)
    } else {
      setInfoMessage(`Deleted ${removedIds.length} record(s) successfully.`)
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#F5F0E8]">
      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="rounded-3xl border border-[#F5F0E8]/10 bg-gradient-to-b from-[#111111] to-[#0D0D0D] p-5 shadow-[0_22px_80px_rgba(0,0,0,0.42)] sm:p-7"
        >
          <div className="flex flex-col gap-4 border-b border-[#F5F0E8]/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[#C9A84C]">Cultural Committee</p>
              <h1 className="mt-2 text-4xl text-[#F5F0E8]" style={DISPLAY_FONT}>
                Faculty Dashboard
              </h1>
              <p className="mt-1 text-sm text-[#F5F0E8]/62">Manage approvals, bulk actions, and event records.</p>
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

          <div className="mt-5 rounded-xl border border-[#C9A84C]/25 bg-[#C9A84C]/6 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleToggleSelectAll}
                disabled={visibleIds.length === 0 || isBusy}
                className="rounded-md border border-[#C9A84C]/45 px-3 py-1.5 text-xs text-[#C9A84C] transition hover:bg-[#C9A84C]/12 disabled:opacity-50"
              >
                {allVisibleSelected ? 'Unselect All (Visible)' : 'Select All (Visible)'}
              </button>
              <button
                type="button"
                onClick={handleUnselectAllVisible}
                disabled={selectedIds.length === 0 || isBusy}
                className="rounded-md border border-[#F5F0E8]/25 px-3 py-1.5 text-xs text-[#F5F0E8]/85 transition hover:border-[#C9A84C]/45 hover:text-[#F5F0E8] disabled:opacity-50"
              >
                Clear Selection
              </button>
              <button
                type="button"
                onClick={handleApproveSelected}
                disabled={selectedPendingIds.length === 0 || isBusy}
                className="rounded-md border border-emerald-400/45 px-3 py-1.5 text-xs text-emerald-300 transition hover:bg-emerald-500/10 disabled:opacity-50"
              >
                {bulkAction === 'approving' ? 'Approving...' : `Approve Selected (${selectedPendingIds.length})`}
              </button>
              <button
                type="button"
                onClick={handleDeleteSelected}
                disabled={selectedIds.length === 0 || isBusy}
                className="rounded-md border border-red-400/45 px-3 py-1.5 text-xs text-red-300 transition hover:bg-red-500/10 disabled:opacity-50"
              >
                {bulkAction === 'deleting' ? 'Deleting...' : `Delete Selected (${selectedIds.length})`}
              </button>
            </div>
            <p className="mt-2 text-xs text-[#F5F0E8]/62">
              Visible records: {visibleIds.length} | Selected: {selectedIds.length}
            </p>
          </div>

          {errorMessage && (
            <div className="mt-5 rounded-xl border border-red-500/35 bg-red-500/10 p-3 text-sm text-red-400">
              {errorMessage}
            </div>
          )}

          {infoMessage && (
            <div className="mt-3 rounded-xl border border-[#C9A84C]/35 bg-[#C9A84C]/10 p-3 text-sm text-[#F5F0E8]">
              {infoMessage}
            </div>
          )}

          <div className="mt-6 overflow-x-auto rounded-2xl border border-[#F5F0E8]/10">
            <table className="min-w-full border-collapse text-sm">
              <thead className="bg-[#151515]">
                <tr>
                  <th className="w-12 px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={handleToggleSelectAll}
                      disabled={visibleIds.length === 0 || isBusy}
                      className="h-4 w-4 accent-[#C9A84C]"
                    />
                  </th>
                  {columns.map((column) => (
                    <th key={column} className="whitespace-nowrap px-4 py-3 text-left font-medium text-[#C9A84C]">
                      {titleCaseFromSnakeCase(column)}
                    </th>
                  ))}
                  <th className="whitespace-nowrap px-4 py-3 text-left font-medium text-[#C9A84C]">Action</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr>
                    <td colSpan={columns.length + 2} className="px-4 py-10 text-center text-[#F5F0E8]/66">
                      Loading records...
                    </td>
                  </tr>
                )}

                {!isLoading && filteredRecords.length === 0 && (
                  <tr>
                    <td colSpan={columns.length + 2} className="px-4 py-10 text-center text-[#F5F0E8]/66">
                      No records found for selected filters.
                    </td>
                  </tr>
                )}

                {!isLoading &&
                  filteredRecords.map((record) => {
                    const isRowSelected = selectedSet.has(record.id)

                    return (
                      <tr
                        key={record.id}
                        className={`border-t border-[#F5F0E8]/8 transition ${isRowSelected ? 'bg-[#C9A84C]/8' : 'hover:bg-[#131313]'}`}
                      >
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={isRowSelected}
                            onChange={() => handleSelectRow(record.id)}
                            disabled={isBusy}
                            className="h-4 w-4 accent-[#C9A84C]"
                          />
                        </td>
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
                        <td className="whitespace-nowrap px-4 py-3 text-[#F5F0E8]/85">
                          <div className="flex items-center gap-2">
                            {record.qr_code ? (
                              <>
                                <span className="rounded-full border border-emerald-400/35 bg-emerald-500/12 px-3 py-1 text-xs text-emerald-300">
                                  Approved
                                </span>
                                {activeTab === 'students' && (
                                  <button
                                    type="button"
                                    onClick={() => handleResendMail(record.id)}
                                    disabled={resendingId === record.id || isBusy}
                                    className="rounded-md border border-sky-400/45 px-3 py-1.5 text-xs text-sky-300 transition hover:bg-sky-500/10 disabled:opacity-60"
                                  >
                                    {resendingId === record.id ? 'Sending...' : 'Resend Mail'}
                                  </button>
                                )}
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleApproveOne(record.id)}
                                disabled={approvingId === record.id || isBusy}
                                className="rounded-md border border-[#C9A84C]/45 px-3 py-1.5 text-xs text-[#C9A84C] transition hover:bg-[#C9A84C]/10 disabled:opacity-60"
                              >
                                {approvingId === record.id ? 'Approving...' : 'Approve'}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDeleteOne(record.id)}
                              disabled={deletingId === record.id || isBusy}
                              className="rounded-md border border-red-400/45 px-3 py-1.5 text-xs text-red-300 transition hover:bg-red-500/10 disabled:opacity-60"
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
          </div>
        </motion.div>
      </main>
    </div>
  )
}
