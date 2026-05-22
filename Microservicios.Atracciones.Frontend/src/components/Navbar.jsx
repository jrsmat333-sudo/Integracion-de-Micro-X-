import { useState, useRef, useEffect } from 'react'
import logo from '../assets/keo-arc.jpg'

// ── Inline SVG icons ─────────────────────────────────────────────────────────

function IconUser() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="8" r="4" />
      <path strokeLinecap="round" d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  )
}

function IconCart() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0" />
    </svg>
  )
}

function IconLogOut() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1" />
    </svg>
  )
}

function IconChevron({ open }) {
  return (
    <svg
      className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
      viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  )
}

// ── Navbar ───────────────────────────────────────────────────────────────────

export default function Navbar({ user, onOpenAuth, onLogout, onOpenProfile }) {
  const [dropOpen, setDropOpen] = useState(false)
  const dropRef = useRef(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e) {
      if (dropRef.current && !dropRef.current.contains(e.target)) {
        setDropOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-cominca-cream/80 border-b border-cominca-border">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">

        {/* Logo */}
        <a href="/" className="flex items-center gap-3 group">
          <img
            src={logo}
            alt="Keo Arc"
            className="h-9 w-9 object-contain rounded-sm opacity-90 group-hover:opacity-100 transition-opacity duration-200"
          />
          <span className="font-serif text-xl font-medium tracking-wide text-cominca-charcoal hidden sm:block">
            Keo Arc
          </span>
        </a>

        {/* Right actions */}
        <div className="flex items-center gap-5">

          {/* Cart icon */}
          <button className="text-cominca-sand hover:text-cominca-charcoal transition-colors duration-200">
            <IconCart />
          </button>

          {/* Profile dropdown */}
          <div className="relative" ref={dropRef}>
            <button
              onClick={() => setDropOpen((v) => !v)}
              className="flex items-center gap-1.5 text-cominca-charcoal hover:text-cominca-forest transition-colors duration-200"
            >
              <div className="w-8 h-8 rounded-full border border-cominca-border bg-cominca-light flex items-center justify-center">
                <IconUser />
              </div>
              <IconChevron open={dropOpen} />
            </button>

            {/* Dropdown menu */}
            {dropOpen && (
              <div className="absolute right-0 top-full mt-2 w-52 bg-white border border-cominca-border shadow-lg animate-fadeSlideDown">

                {user ? (
                  <>
                    {/* User info */}
                    <div className="px-4 py-3 border-b border-cominca-border">
                      <p className="text-xs font-sans text-cominca-sand tracking-widest uppercase mb-0.5">
                        Cuenta
                      </p>
                      <p className="text-sm font-sans font-medium text-cominca-charcoal truncate">
                        {user.email}
                      </p>
                    </div>

                    <DropItem onClick={() => { onOpenProfile(); setDropOpen(false) }}>
                      Mi Perfil
                    </DropItem>
                    <DropItem decorative>Notificaciones</DropItem>
                    <DropItem decorative>Apariencia</DropItem>
                    <DropItem decorative>Soporte</DropItem>

                    <div className="border-t border-cominca-border mt-1">
                      <button
                        onClick={() => { onLogout(); setDropOpen(false) }}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-sans text-red-600 hover:bg-red-50 transition-colors duration-150"
                      >
                        <IconLogOut />
                        Cerrar sesión
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <DropItem onClick={() => { onOpenAuth('login'); setDropOpen(false) }}>
                      Iniciar sesión
                    </DropItem>
                    <DropItem onClick={() => { onOpenAuth('register'); setDropOpen(false) }}>
                      Crear cuenta
                    </DropItem>
                    <div className="border-t border-cominca-border my-1" />
                    <DropItem onClick={() => { onOpenAuth('admin'); setDropOpen(false) }}>
                      Acceso Administrador
                    </DropItem>
                    <div className="border-t border-cominca-border my-1" />
                    <DropItem decorative>Soporte</DropItem>
                    <DropItem decorative>Apariencia</DropItem>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

// ── Dropdown item ────────────────────────────────────────────────────────────

function DropItem({ children, onClick, decorative }) {
  return (
    <button
      onClick={onClick}
      disabled={decorative}
      className={`w-full text-left px-4 py-2.5 text-sm font-sans transition-colors duration-150
        ${decorative
          ? 'text-cominca-sand cursor-default'
          : 'text-cominca-charcoal hover:bg-cominca-light'
        }`}
    >
      {children}
    </button>
  )
}
