import { Routes, Route } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { AuthProvider, registerLangSync, useAuth } from './context/AuthContext'
import { LangProvider, useLang } from './context/LangContext'
import { useMobile } from './hooks/useMobile'
import { useTripNotifications } from './hooks/useTripNotifications'
import { API_URL, authFetch } from './utils/api'
import TripStartPopup from './components/TripStartPopup'

import Navbar       from './components/layout/Navbar'
import Footer       from './components/layout/Footer'
import MobileLayout from './pages/MobileLayout'

// Mobile pages
import MobileHome        from './pages/MobileHome'
import MobilePublish     from './pages/MobilePublish'
import MobileMyTrips     from './pages/MobileMyTrips'
import MobileMessages    from './pages/MobileMessages'
import MobileProfile     from './pages/MobileProfile'
import MobileProfileEdit from './pages/MobileProfileEdit'
import MobileTripNavigate from './pages/MobileTripNavigate'

// Shared pages
import Home           from './pages/Home'
import Login          from './pages/Login'
import Register       from './pages/Register'
import SearchTrips    from './pages/SearchTrips'
import PublishTrip    from './pages/PublishTrip'
import Messages       from './pages/Messages'
import MyTrips        from './pages/MyTrips'
import VerifyEmail    from './pages/VerifyEmail'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword  from './pages/ResetPassword'
import Terms          from './pages/Terms'
import Privacy        from './pages/Privacy'
import NotFound       from './pages/NotFound'
import AccountBlocked from './pages/AccountBlocked'
import Profile        from './pages/Profile'
import AlertsPage     from './pages/AlertsPage'
import Contact        from './pages/Contact'
import PaymentWall    from './pages/PaymentWall'

import AdminLayout    from './pages/admin/AdminLayout'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminUsers     from './pages/admin/AdminUsers'
import AdminTrips     from './pages/admin/AdminTrips'
import AdminBookings  from './pages/admin/AdminBookings'
import AdminContacts  from './pages/admin/AdminContacts'
import AdminDebtors   from './pages/admin/AdminDebtors'

function LangSyncer() {
  const { setLang } = useLang()
  registerLangSync(setLang)
  return null
}

// Hook global qui charge les bookings et programme les notifs
function TripMonitor() {
  const { user } = useAuth()
  const [bookings, setBookings] = useState([])

  useEffect(() => {
    if (!user) return
    const load = async () => {
      try {
        const res  = await authFetch(`${API_URL}/api/trips/my-bookings`, {})
        const data = await res.json()
        if (data.success) setBookings(data.bookings || [])
      } catch {}
    }
    load()
    const iv = setInterval(load, 5 * 60 * 1000) // rafraîchir toutes les 5 min
    return () => clearInterval(iv)
  }, [user])

  useTripNotifications(bookings)

  return user ? <TripStartPopup bookings={bookings}/> : null
}

function AppRoutes() {
  const isMobile = useMobile()

  const adminRoutes = (
    <Route path="/admin" element={<AdminLayout />}>
      <Route index           element={<AdminDashboard />} />
      <Route path="users"    element={<AdminUsers />} />
      <Route path="trips"    element={<AdminTrips />} />
      <Route path="bookings" element={<AdminBookings />} />
      <Route path="contacts" element={<AdminContacts />} />
      <Route path="debtors"  element={<AdminDebtors />} />
    </Route>
  )

  if (isMobile) {
    return (
      <>
        <TripMonitor />
        <Routes>
          {adminRoutes}
          <Route path="/login"           element={<Login />} />
          <Route path="/register"        element={<Register />} />
          <Route path="/verify-email"    element={<VerifyEmail />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password"  element={<ResetPassword />} />
          <Route path="/profile/edit"    element={<MobileProfileEdit />} />
          <Route path="/trip/:bookingId/navigate" element={<MobileTripNavigate />} />
          <Route element={<MobileLayout />}>
            <Route path="/"          element={<MobileHome />} />
            <Route path="/search"    element={<SearchTrips />} />
            <Route path="/publish"   element={<MobilePublish />} />
            <Route path="/messages"  element={<MobileMessages />} />
            <Route path="/my-trips"  element={<MobileMyTrips />} />
            <Route path="/profile"   element={<MobileProfile />} />
            <Route path="/alerts"    element={<AlertsPage />} />
            <Route path="/contact"   element={<Contact />} />
            <Route path="/terms"     element={<Terms />} />
            <Route path="/privacy"   element={<Privacy />} />
            <Route path="/payment"   element={<PaymentWall />} />
            <Route path="/account-blocked" element={<AccountBlocked />} />
            <Route path="*"          element={<NotFound />} />
          </Route>
        </Routes>
      </>
    )
  }

  return (
    <>
      <TripMonitor />
      <Routes>
        {adminRoutes}
        <Route path="/*" element={
          <div style={{ display:'flex', flexDirection:'column', minHeight:'100vh' }}>
            <Navbar />
            <main style={{ paddingTop:72, flex:1, display:'flex', flexDirection:'column' }}>
              <Routes>
                <Route path="/"                element={<Home />} />
                <Route path="/search"          element={<SearchTrips />} />
                <Route path="/publish"         element={<PublishTrip />} />
                <Route path="/messages"        element={<Messages />} />
                <Route path="/my-trips"        element={<MyTrips />} />
                <Route path="/trip/:bookingId/navigate" element={<MobileTripNavigate />} />
                <Route path="/login"           element={<Login />} />
                <Route path="/register"        element={<Register />} />
                <Route path="/verify-email"    element={<VerifyEmail />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password"  element={<ResetPassword />} />
                <Route path="/terms"           element={<Terms />} />
                <Route path="/privacy"         element={<Privacy />} />
                <Route path="/account-blocked" element={<AccountBlocked />} />
                <Route path="/profile"         element={<Profile />} />
                <Route path="/alerts"          element={<AlertsPage />} />
                <Route path="/contact"         element={<Contact />} />
                <Route path="/payment"         element={<PaymentWall />} />
                <Route path="*"               element={<NotFound />} />
              </Routes>
            </main>
            <Footer />
          </div>
        } />
      </Routes>
    </>
  )
}

export default function App() {
  return (
    <LangProvider>
      <LangSyncer />
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </LangProvider>
  )
}
