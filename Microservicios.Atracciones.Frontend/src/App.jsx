import { useState, useEffect } from 'react'
import Navbar from './components/Navbar'
import AuthModal from './components/AuthModal'
import UserProfile from './components/UserProfile'
import AdminPanel from './components/AdminPanel'
import { getCurrentUser, removeToken } from './services/api'
import logo from './assets/keo-arc.jpg'

// ── Coming Soon landing page ──────────────────────────────────────────────────

function LandingPage({ onOpenAuth }) {
  return (
    <div className="min-h-screen flex flex-col">

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 text-center pt-24 pb-16 relative overflow-hidden">

        {/* Subtle background texture */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `repeating-linear-gradient(45deg, #1F1E1C 0, #1F1E1C 1px, transparent 0, transparent 50%)`,
            backgroundSize: '20px 20px',
          }}
        />

        {/* Logo mark */}
        <div className="relative mb-8">
          <div className="w-20 h-20 border border-cominca-border rounded-sm mx-auto flex items-center justify-center bg-white shadow-sm">
            <img src={logo} alt="Keo Arc" className="w-14 h-14 object-contain" />
          </div>
          <div className="absolute -inset-3 border border-cominca-border/30 rounded-sm pointer-events-none" />
        </div>

        {/* Label */}
        <p className="label-elegant mb-4 text-cominca-sand">Atracciones · Experiencias · Destinos</p>

        {/* Title */}
        <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-light text-cominca-charcoal leading-tight mb-6 max-w-3xl">
          Descubre el mundo
          <br />
          <em className="text-cominca-forest not-italic">a tu ritmo</em>
        </h1>

        {/* Subtitle */}
        <p className="font-sans text-cominca-sand text-base sm:text-lg font-light max-w-xl leading-relaxed mb-10">
          Estamos preparando algo extraordinario. Una plataforma diseñada para los viajeros
          que aprecian las cosas bien hechas.
        </p>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row gap-3 items-center">
          <button
            onClick={() => onOpenAuth('register')}
            className="btn-primary px-8 py-3 text-sm tracking-widest"
          >
            Ser de los primeros
          </button>
          <button
            onClick={() => onOpenAuth('login')}
            className="btn-ghost px-8 py-3 text-sm tracking-widest"
          >
            Iniciar sesión
          </button>
        </div>

        {/* Coming soon chip */}
        <div className="mt-16 flex items-center gap-2.5">
          <div className="w-1.5 h-1.5 rounded-full bg-cominca-forest animate-pulse" />
          <span className="text-xs font-sans text-cominca-sand tracking-widest uppercase">
            Próximamente — 2026
          </span>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-cominca-border px-8 py-5 flex items-center justify-between">
        <p className="font-serif text-cominca-sand text-sm">Keo Arc</p>
        <p className="text-xs font-sans text-cominca-border">
          © 2026 · Todos los derechos reservados
        </p>
      </footer>
    </div>
  )
}

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  const [user, setUser] = useState(null)
  const [authModal, setAuthModal] = useState(null) // null | 'login' | 'register' | 'admin'
  const [showProfile, setShowProfile] = useState(false)

  // Restore session from localStorage on mount (reads keo_user saved at login)
  useEffect(() => {
    const saved = getCurrentUser()
    if (saved) setUser(saved)
  }, [])

  function handleAuth(loggedUser) {
    setUser(loggedUser)
    setAuthModal(null)
  }

  function handleLogout() {
    removeToken()
    setUser(null)
    setShowProfile(false)
  }

  const isAdmin = user?.role === 'Admin'

  // ── Admin view ──────────────────────────────────────────────────────────────
  if (isAdmin) {
    return (
      <AdminPanel user={user} onLogout={handleLogout} />
    )
  }

  // ── Public / Client view ────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-cominca-cream">

      <Navbar
        user={user}
        onOpenAuth={(tab) => setAuthModal(tab)}
        onLogout={handleLogout}
        onOpenProfile={() => setShowProfile(true)}
      />

      {/* Main content */}
      <LandingPage onOpenAuth={(tab) => setAuthModal(tab)} />

      {/* User profile overlay */}
      {showProfile && user && (
        <UserProfile user={user} onClose={() => setShowProfile(false)} />
      )}

      {/* Auth modal */}
      {authModal && (
        <AuthModal
          initialTab={authModal}
          onClose={() => setAuthModal(null)}
          onAuth={handleAuth}
        />
      )}
    </div>
  )
}
