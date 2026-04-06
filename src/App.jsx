import { Routes, Route } from 'react-router-dom'
import { AuthProvider, registerLangSync }  from './context/AuthContext'
import { LangProvider, useLang }           from './context/LangContext'
import Navbar              from './components/layout/Navbar'
import Footer              from './components/layout/Footer'
import Home                from './pages/Home'
import Login               from './pages/Login'
import Register            from './pages/Register'
import SearchTrips         from './pages/SearchTrips'
import PublishTrip         from './pages/PublishTrip'
import Messages            from './pages/Messages'
import MyTrips             from './pages/MyTrips'
import VerifyEmail         from './pages/VerifyEmail'
import ForgotPassword      from './pages/ForgotPassword'
import ResetPassword       from './pages/ResetPassword'
import Terms               from './pages/Terms'
import Privacy             from './pages/Privacy'
import NotFound            from './pages/NotFound'
import AccountBlocked      from './pages/AccountBlocked'
import Profile             from './pages/Profile'
import AlertsPage          from './pages/AlertsPage'
import Contact             from './pages/Contact'
import PaymentWall         from './pages/PaymentWall'

// Admin
import AdminLayout         from './pages/admin/AdminLayout'
import AdminDashboard      from './pages/admin/AdminDashboard'
import AdminUsers          from './pages/admin/AdminUsers'
import AdminTrips          from './pages/admin/AdminTrips'
import AdminBookings       from './pages/admin/AdminBookings'
import AdminContacts       from './pages/admin/AdminContacts'
import AdminDebtors        from './pages/admin/AdminDebtors'

// Composant interne qui enregistre le callback de synchronisation langue
function LangSyncer() {
  const { setLang } = useLang()
  registerLangSync(setLang)
  return null
}

export default function App() {
  return (
    <LangProvider>
      <LangSyncer />
      <AuthProvider>
        <Routes>

          {/* ── Admin (layout séparé, sans Navbar/Footer) ── */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index          element={<AdminDashboard />} />
            <Route path="users"    element={<AdminUsers />} />
            <Route path="trips"    element={<AdminTrips />} />
            <Route path="bookings" element={<AdminBookings />} />
            <Route path="contacts" element={<AdminContacts />} />
            <Route path="debtors"  element={<AdminDebtors />} />
          </Route>

          {/* ── App principale ── */}
          <Route path="/*" element={
            <div style={{ display:'flex', flexDirection:'column', minHeight:'100vh' }}>
              <Navbar />
              <main style={{ paddingTop: 72, flex: 1, display:'flex', flexDirection:'column' }}>
                <Routes>
                  <Route path="/"                element={<Home />} />
                  <Route path="/search"          element={<SearchTrips />} />
                  <Route path="/publish"         element={<PublishTrip />} />
                  <Route path="/messages"        element={<Messages />} />
                  <Route path="/my-trips"        element={<MyTrips />} />
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
      </AuthProvider>
    </LangProvider>
  )
}
