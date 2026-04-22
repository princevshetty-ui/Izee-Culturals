import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { apiUrl } from '../utils/api.js'

const DISPLAY_FONT = { fontFamily: 'Montage, Nevarademo, serif' }

export default function ParticipantGroupRegister() {
  const navigate = useNavigate()
  const location = useLocation()
  const groupEvent = location.state?.groupEvent || null

  const [teamName, setTeamName] = useState('')
  const [leader, setLeader] = useState({
    name: '',
    roll_no: '',
    course: '',
    year: '',
    email: '',
    phone: '',
  })
  const [members, setMembers] = useState([
    { id: 1, name: '', roll_no: '', course: '', year: '' },
  ])
  const [focusedField, setFocusedField] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!groupEvent) {
      navigate('/participant/events', { replace: true })
    }
  }, [groupEvent, navigate])

  if (!groupEvent) return null

  function getInputStyle(fieldKey) {
    const isFocused = focusedField === fieldKey
    return {
      background: 'rgba(255,255,255,0.04)',
      border: isFocused ? '0.5px solid rgba(201,168,76,0.45)' : '0.5px solid rgba(255,255,255,0.12)',
      borderRadius: '8px',
      color: '#EEE6D8',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '13px',
      padding: '10px 14px',
      outline: 'none',
      width: '100%',
      boxShadow: isFocused ? '0 0 0 3px rgba(201,168,76,0.06)' : 'none',
      transition: 'border-color 0.18s ease, box-shadow 0.18s ease',
    }
  }

  function getLabelStyle() {
    return {
      display: 'block',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '10px',
      fontWeight: '600',
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
      color: 'rgba(201,168,76,0.7)',
      marginBottom: '6px',
    }
  }

  function addMember() {
    setMembers((prev) => [
      ...prev,
      { id: Date.now(), name: '', roll_no: '', course: '', year: '' },
    ])
  }

  function removeMember(id) {
    if (members.length <= 1) return
    setMembers((prev) => prev.filter((m) => m.id !== id))
  }

  function updateMember(id, field, value) {
    setMembers((prev) =>
      prev.map((m) =>
        m.id === id ? { ...m, [field]: value } : m
      )
    )
  }

  function updateLeader(field, value) {
    setLeader((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!groupEvent) {
      setError('No event selected. Please go back and try again.')
      return
    }

    if (!teamName.trim()) {
      setError('Team name is required')
      return
    }

    const leaderFields = ['name', 'roll_no', 'course', 'year', 'email', 'phone']
    for (const field of leaderFields) {
      if (!leader[field].trim()) {
        setError('All team leader fields are required')
        return
      }
    }

    for (let i = 0; i < members.length; i++) {
      const m = members[i]
      if (!m.name.trim() || !m.roll_no.trim() || !m.course.trim() || !m.year.trim()) {
        setError(`All fields for Member ${i + 1} are required`)
        return
      }
    }

    setSubmitting(true)

    try {
      const res = await fetch(apiUrl('/api/register/group-participant'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          team_name: teamName,
          event_id: groupEvent.id,
          event_name: groupEvent.name,
          event_type: groupEvent.type,
          category_id: groupEvent.categoryId || '',
          leader,
          members: members.map(({ id, ...rest }) => rest),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.detail || 'Registration failed. Please try again.')
        return
      }

      const registrationId = data?.data?.id
      if (!registrationId) {
        setError('Registration failed — no ID returned.')
        return
      }

      navigate('/confirmation/group/' + registrationId)
    } catch {
      setError('Network error. Please check your connection.')
    } finally {
      setSubmitting(false)
    }
  }

  const cardWrapperStyle = {
    background: 'rgba(255,255,255,0.022)',
    border: '0.5px solid rgba(255,255,255,0.07)',
    borderRadius: '12px',
    padding: '24px',
    marginBottom: '20px',
  }

  const sectionTitleStyle = {
    ...DISPLAY_FONT,
    fontSize: '16px',
    color: '#EEE6D8',
    marginBottom: '16px',
  }

  const goldUnderlineStyle = {
    height: '1px',
    width: '40px',
    background: 'rgba(201,168,76,0.4)',
    marginBottom: '16px',
  }

  const infoNoteStyle = {
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fontSize: '12px',
    color: 'rgba(238,230,216,0.4)',
    marginBottom: '20px',
    lineHeight: '1.6',
  }

  const addMemberButtonHoverStyle = {
    borderColor: 'rgba(201,168,76,0.3)',
    color: 'rgba(201,168,76,0.8)',
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: `
          radial-gradient(900px 600px at 15% 85%, 
            rgba(158,38,54,0.10) 0%, transparent 60%),
          radial-gradient(700px 500px at 80% 15%, 
            rgba(190,163,93,0.07) 0%, transparent 60%),
          #080910
        `,
        color: '#EEE6D8',
        paddingBottom: '100px',
      }}
    >
      <div
        style={{
          maxWidth: '680px',
          margin: '0 auto',
          padding: '32px 24px',
        }}
      >
        <p
          style={{
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontSize: '11px',
            letterSpacing: '0.05em',
            color: 'rgba(238,230,216,0.3)',
            marginBottom: '16px',
          }}
        >
          Home → Participant Registration → Group Registration
        </p>

        <button
          type="button"
          onClick={() => navigate(-1)}
          style={{
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontSize: '14px',
            background: 'none',
            border: 'none',
            color: 'rgba(238,230,216,0.72)',
            cursor: 'pointer',
            padding: 0,
            marginBottom: '16px',
            transition: 'color 0.18s ease',
          }}
          onMouseEnter={(e) => (e.target.style.color = '#EEE6D8')}
          onMouseLeave={(e) => (e.target.style.color = 'rgba(238,230,216,0.72)')}
        >
          ← Back
        </button>

        <div
          style={{
            display: 'inline-flex',
            padding: '4px 14px',
            borderRadius: '999px',
            background: 'rgba(201,168,76,0.08)',
            border: '0.5px solid rgba(201,168,76,0.25)',
            color: '#C9A84C',
            fontSize: '12px',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            marginTop: '16px',
            marginBottom: '12px',
          }}
        >
          {groupEvent.name} · {groupEvent.type} · Group Event 👥
        </div>

        <h1
          style={{
            ...DISPLAY_FONT,
            fontSize: 'clamp(26px, 3.5vw, 42px)',
            color: '#EEE6D8',
            marginBottom: '12px',
          }}
        >
          Group Registration
        </h1>

        <p
          style={{
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontSize: '14px',
            color: 'rgba(238,230,216,0.55)',
            lineHeight: '1.65',
            marginBottom: '32px',
          }}
        >
          All members must be students of our college. The team leader's details will appear on the group pass.
        </p>

        <form onSubmit={handleSubmit}>
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                style={{
                  background: 'rgba(178,34,52,0.08)',
                  border: '0.5px solid rgba(178,34,52,0.25)',
                  borderRadius: '8px',
                  padding: '12px 16px',
                  marginBottom: '16px',
                  color: 'rgba(238,230,216,0.8)',
                  fontSize: '13px',
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  lineHeight: '1.5',
                }}
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0 }}
            style={cardWrapperStyle}
          >
            <div style={sectionTitleStyle}>Team Name</div>
            <div style={goldUnderlineStyle} />

            <div style={{ marginBottom: 0 }}>
              <label style={getLabelStyle()}>Team Name *</label>
              <input
                type="text"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                onFocus={() => setFocusedField('teamName')}
                onBlur={() => setFocusedField(null)}
                placeholder="Enter your team name"
                style={getInputStyle('teamName')}
              />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            style={cardWrapperStyle}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div style={sectionTitleStyle}>Team Leader</div>
              <div
                style={{
                  display: 'inline-flex',
                  padding: '2px 10px',
                  borderRadius: '999px',
                  background: 'rgba(201,168,76,0.1)',
                  border: '0.5px solid rgba(201,168,76,0.3)',
                  color: '#C9A84C',
                  fontSize: '10px',
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  fontWeight: '600',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}
              >
                Organiser
              </div>
            </div>
            <div style={goldUnderlineStyle} />

            <p style={infoNoteStyle}>
              The leader submits this form and receives the group pass on approval.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
              <div>
                <label style={getLabelStyle()}>Full Name *</label>
                <input
                  type="text"
                  value={leader.name}
                  onChange={(e) => updateLeader('name', e.target.value)}
                  onFocus={() => setFocusedField('leader-name')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Your full name"
                  style={getInputStyle('leader-name')}
                />
              </div>
              <div>
                <label style={getLabelStyle()}>Roll No *</label>
                <input
                  type="text"
                  value={leader.roll_no}
                  onChange={(e) => updateLeader('roll_no', e.target.value)}
                  onFocus={() => setFocusedField('leader-roll')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Your roll number"
                  style={getInputStyle('leader-roll')}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
              <div>
                <label style={getLabelStyle()}>Course *</label>
                <input
                  type="text"
                  value={leader.course}
                  onChange={(e) => updateLeader('course', e.target.value)}
                  onFocus={() => setFocusedField('leader-course')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Your course"
                  style={getInputStyle('leader-course')}
                />
              </div>
              <div>
                <label style={getLabelStyle()}>Year *</label>
                <select
                  value={leader.year}
                  onChange={(e) => updateLeader('year', e.target.value)}
                  onFocus={() => setFocusedField('leader-year')}
                  onBlur={() => setFocusedField(null)}
                  style={{
                    ...getInputStyle('leader-year'),
                    appearance: 'none',
                    backgroundImage:
                      'url("data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%228%22 viewBox=%220 0 12 8%22%3E%3Cpath fill=%22%23C9A84C%22 d=%22M1 1l5 5 5-5%22/%3E%3C/svg%3E")',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 12px center',
                    paddingRight: '36px',
                  }}
                >
                  <option value="">Select year</option>
                  <option value="1st Year">1st Year</option>
                  <option value="2nd Year">2nd Year</option>
                  <option value="3rd Year">3rd Year</option>
                  <option value="4th Year">4th Year</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={getLabelStyle()}>Email *</label>
              <input
                type="email"
                value={leader.email}
                onChange={(e) => updateLeader('email', e.target.value)}
                onFocus={() => setFocusedField('leader-email')}
                onBlur={() => setFocusedField(null)}
                placeholder="Your email"
                style={getInputStyle('leader-email')}
              />
            </div>

            <div>
              <label style={getLabelStyle()}>Phone *</label>
              <input
                type="tel"
                value={leader.phone}
                onChange={(e) => updateLeader('phone', e.target.value)}
                onFocus={() => setFocusedField('leader-phone')}
                onBlur={() => setFocusedField(null)}
                placeholder="Your phone number"
                style={getInputStyle('leader-phone')}
              />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            style={cardWrapperStyle}
          >
            <div style={sectionTitleStyle}>Team Members</div>
            <div style={goldUnderlineStyle} />

            <p style={infoNoteStyle}>All members must be from our college.</p>

            <AnimatePresence mode="popLayout">
              {members.map((member, idx) => (
                <motion.div
                  key={member.id}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.28 }}
                  style={{
                    paddingBottom: '20px',
                    marginBottom: '20px',
                    borderBottom: idx < members.length - 1 ? '0.5px solid rgba(255,255,255,0.05)' : 'none',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '14px',
                    }}
                  >
                    <div
                      style={{
                        fontFamily: 'system-ui, -apple-system, sans-serif',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: 'rgba(238,230,216,0.5)',
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                      }}
                    >
                      Member {idx + 1}
                    </div>
                    {members.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeMember(member.id)}
                        style={{
                          fontFamily: 'system-ui, -apple-system, sans-serif',
                          fontSize: '11px',
                          color: 'rgba(178,34,52,0.6)',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: 0,
                          transition: 'color 0.18s ease',
                        }}
                        onMouseEnter={(e) => (e.target.style.color = '#B22234')}
                        onMouseLeave={(e) => (e.target.style.color = 'rgba(178,34,52,0.6)')}
                      >
                        ✕ Remove
                      </button>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                    <div>
                      <label style={getLabelStyle()}>Full Name *</label>
                      <input
                        type="text"
                        value={member.name}
                        onChange={(e) => updateMember(member.id, 'name', e.target.value)}
                        onFocus={() => setFocusedField(`member-${idx}-name`)}
                        onBlur={() => setFocusedField(null)}
                        placeholder="Member's full name"
                        style={getInputStyle(`member-${idx}-name`)}
                      />
                    </div>
                    <div>
                      <label style={getLabelStyle()}>Roll No *</label>
                      <input
                        type="text"
                        value={member.roll_no}
                        onChange={(e) => updateMember(member.id, 'roll_no', e.target.value)}
                        onFocus={() => setFocusedField(`member-${idx}-roll`)}
                        onBlur={() => setFocusedField(null)}
                        placeholder="Member's roll number"
                        style={getInputStyle(`member-${idx}-roll`)}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    <div>
                      <label style={getLabelStyle()}>Course *</label>
                      <input
                        type="text"
                        value={member.course}
                        onChange={(e) => updateMember(member.id, 'course', e.target.value)}
                        onFocus={() => setFocusedField(`member-${idx}-course`)}
                        onBlur={() => setFocusedField(null)}
                        placeholder="Member's course"
                        style={getInputStyle(`member-${idx}-course`)}
                      />
                    </div>
                    <div>
                      <label style={getLabelStyle()}>Year *</label>
                      <select
                        value={member.year}
                        onChange={(e) => updateMember(member.id, 'year', e.target.value)}
                        onFocus={() => setFocusedField(`member-${idx}-year`)}
                        onBlur={() => setFocusedField(null)}
                        style={{
                          ...getInputStyle(`member-${idx}-year`),
                          appearance: 'none',
                          backgroundImage:
                            'url("data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%228%22 viewBox=%220 0 12 8%22%3E%3Cpath fill=%22%23C9A84C%22 d=%22M1 1l5 5 5-5%22/%3E%3C/svg%3E")',
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'right 12px center',
                          paddingRight: '36px',
                        }}
                      >
                        <option value="">Select year</option>
                        <option value="1st Year">1st Year</option>
                        <option value="2nd Year">2nd Year</option>
                        <option value="3rd Year">3rd Year</option>
                        <option value="4th Year">4th Year</option>
                      </select>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            <button
              type="button"
              onClick={addMember}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                marginTop: '16px',
                padding: '8px 18px',
                borderRadius: '999px',
                border: '0.5px solid rgba(255,255,255,0.12)',
                background: 'transparent',
                color: 'rgba(238,230,216,0.5)',
                fontSize: '13px',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                cursor: 'pointer',
                transition: 'border-color 0.18s ease, color 0.18s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(201,168,76,0.3)'
                e.currentTarget.style.color = 'rgba(201,168,76,0.8)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'
                e.currentTarget.style.color = 'rgba(238,230,216,0.5)'
              }}
            >
              + Add Another Member
            </button>
          </motion.div>

          <div
            style={{
              fontFamily: 'system-ui, -apple-system, sans-serif',
              fontSize: '12px',
              color: 'rgba(238,230,216,0.4)',
              textAlign: 'center',
              marginBottom: '16px',
            }}
          >
            Team: <strong>{teamName || '—'}</strong> · Leader + {members.length} member(s) · {groupEvent.name}
          </div>

          <button
            type="submit"
            disabled={submitting}
            style={{
              width: '100%',
              height: '48px',
              borderRadius: '10px',
              background: submitting
                ? 'rgba(201,168,76,0.25)'
                : 'linear-gradient(135deg, #C9A84C 0%, #A8893C 100%)',
              color: submitting ? 'rgba(201,168,76,0.4)' : '#0A0800',
              fontWeight: '600',
              fontSize: '15px',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              border: 'none',
              cursor: submitting ? 'not-allowed' : 'pointer',
              boxShadow: submitting ? 'none' : '0 4px 20px rgba(201,168,76,0.25)',
              letterSpacing: '0.02em',
              transition: 'all 0.18s ease',
              opacity: submitting ? 0.7 : 1,
            }}
          >
            {submitting ? 'Submitting...' : 'Register Group'}
          </button>

          <p
            style={{
              fontFamily: 'system-ui, -apple-system, sans-serif',
              fontSize: '11px',
              color: 'rgba(238,230,216,0.28)',
              textAlign: 'center',
              marginTop: '10px',
              lineHeight: '1.5',
            }}
          >
            By submitting, you confirm all members are enrolled students of this college.
          </p>
        </form>
      </div>
    </div>
  )
}
