import { Suspense, lazy } from 'react'
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'

const Home = lazy(() => import('./pages/Home'))
const ParticipantEvents = lazy(() => import('./pages/ParticipantEvents'))
const ParticipantRegister = lazy(() => import('./pages/ParticipantRegister'))
const ParticipantGroupRegister = lazy(() => import('./pages/ParticipantGroupRegister'))
const VolunteerRegister = lazy(() => import('./pages/VolunteerRegister'))
const StudentRegister = lazy(() => import('./pages/StudentRegister'))
const Confirmation = lazy(() => import('./pages/Confirmation'))
const FacultyLogin = lazy(() => import('./pages/FacultyLogin'))
const FacultyDashboard = lazy(() => import('./pages/FacultyDashboard'))

function PageLoader() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0A0A0A'
      }}
    >
      <motion.div
        aria-label="Loading"
        role="status"
        animate={{ rotate: 360 }}
        transition={{ duration: 0.8, ease: 'linear', repeat: Infinity }}
        style={{
          width: '44px',
          height: '44px',
          border: '3px solid rgba(201, 168, 76, 0.25)',
          borderTop: '3px solid #C9A84C',
          borderRadius: '9999px'
        }}
      />
    </div>
  )
}

function PageTransition({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4 }}
    >
      {children}
    </motion.div>
  )
}

function AppRoutes() {
  const location = useLocation()

  return (
    <AnimatePresence mode="wait">
      <Suspense fallback={<PageLoader />}>
        <Routes location={location} key={location.pathname}>
          <Route
            path="/"
            element={
              <PageTransition>
                <Home />
              </PageTransition>
            }
          />
          <Route
            path="/participant/events"
            element={
              <PageTransition>
                <ParticipantEvents />
              </PageTransition>
            }
          />
          <Route
            path="/participant/register"
            element={
              <PageTransition>
                <ParticipantRegister />
              </PageTransition>
            }
          />
          <Route
            path="/participant/group-register"
            element={
              <PageTransition>
                <ParticipantGroupRegister />
              </PageTransition>
            }
          />
          <Route
            path="/student/register"
            element={
              <PageTransition>
                <StudentRegister />
              </PageTransition>
            }
          />
          <Route
            path="/volunteer/register"
            element={
              <PageTransition>
                <VolunteerRegister />
              </PageTransition>
            }
          />
          <Route
            path="/confirmation/:type/:id"
            element={
              <PageTransition>
                <Confirmation />
              </PageTransition>
            }
          />
          <Route
            path="/faculty/login"
            element={
              <PageTransition>
                <FacultyLogin />
              </PageTransition>
            }
          />
          <Route
            path="/faculty/dashboard"
            element={
              <PageTransition>
                <FacultyDashboard />
              </PageTransition>
            }
          />
        </Routes>
      </Suspense>
    </AnimatePresence>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}

export default App
