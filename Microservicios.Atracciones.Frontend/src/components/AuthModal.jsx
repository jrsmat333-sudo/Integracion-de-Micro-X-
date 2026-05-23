import { useState } from 'react'
import { smartLogin, registerCliente } from '../services/api'

// ── Icons ────────────────────────────────────────────────────────────────────

function IconClose() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

function IconEye({ show }) {
  return show ? (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  ) : (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  )
}

// ── Sub-forms ─────────────────────────────────────────────────────────────────

function LoginForm({ onSuccess, onError, loading, setLoading }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      const user = await smartLogin(email, password)
      onSuccess(user)
    } catch (err) {
      onError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Field label="Correo electrónico">
        <input
          type="email" required value={email} onChange={e => setEmail(e.target.value)}
          placeholder="tu@correo.com" className="input-elegant"
        />
      </Field>
      <Field label="Contraseña">
        <div className="relative">
          <input
            type={showPw ? 'text' : 'password'} required value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••" className="input-elegant pr-8"
          />
          <button type="button" onClick={() => setShowPw(v => !v)}
            className="absolute right-0 bottom-2 text-cominca-sand hover:text-cominca-charcoal transition-colors">
            <IconEye show={showPw} />
          </button>
        </div>
      </Field>
      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading ? 'Iniciando sesión…' : 'Iniciar sesión'}
      </button>
    </form>
  )
}

function RegisterForm({ onSuccess, onError, loading, setLoading }) {
  const [form, setForm] = useState({ email: '', password: '', firstName: '', lastName: '' })
  const [showPw, setShowPw] = useState(false)
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      const user = await registerCliente(form)
      onSuccess(user)
    } catch (err) {
      onError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Nombre">
          <input type="text" required value={form.firstName} onChange={set('firstName')}
            placeholder="María" className="input-elegant" />
        </Field>
        <Field label="Apellido">
          <input type="text" required value={form.lastName} onChange={set('lastName')}
            placeholder="García" className="input-elegant" />
        </Field>
      </div>
      <Field label="Correo electrónico">
        <input type="email" required value={form.email} onChange={set('email')}
          placeholder="tu@correo.com" className="input-elegant" />
      </Field>
      <Field label="Contraseña">
        <div className="relative">
          <input type={showPw ? 'text' : 'password'} required value={form.password}
            onChange={set('password')} placeholder="Mínimo 8 caracteres" className="input-elegant pr-8" />
          <button type="button" onClick={() => setShowPw(v => !v)}
            className="absolute right-0 bottom-2 text-cominca-sand hover:text-cominca-charcoal transition-colors">
            <IconEye show={showPw} />
          </button>
        </div>
      </Field>
      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading ? 'Creando cuenta…' : 'Crear cuenta'}
      </button>
    </form>
  )
}

// ── Main Modal ────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'login',    label: 'Iniciar sesión' },
  { id: 'register', label: 'Registrarse' },
]

export default function AuthModal({ initialTab = 'login', onClose, onAuth }) {
  const [tab, setTab] = useState(initialTab)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function handleSuccess(user) {
    setError('')
    onAuth(user)
    onClose()
  }

  function handleError(msg) {
    setError(msg)
  }

  const sharedProps = { onSuccess: handleSuccess, onError: handleError, loading, setLoading }

  return (
    // Overlay
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-cominca-charcoal/40 backdrop-blur-sm animate-fadeIn"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Card */}
      <div className="bg-cominca-cream w-full max-w-md border border-cominca-border shadow-2xl animate-fadeSlideUp">

        {/* Header */}
        <div className="flex items-center justify-between px-8 pt-8 pb-6">
          <h2 className="font-serif text-2xl font-medium text-cominca-charcoal">
            {tab === 'login' ? 'Bienvenido de vuelta' : 'Crea tu cuenta'}
          </h2>
          <button onClick={onClose}
            className="text-cominca-sand hover:text-cominca-charcoal transition-colors duration-200">
            <IconClose />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-cominca-border px-8">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); setError('') }}
              className={`mr-6 pb-2.5 text-sm font-sans font-medium transition-all duration-200 border-b-2 -mb-px
                ${tab === t.id
                  ? 'border-cominca-forest text-cominca-charcoal'
                  : 'border-transparent text-cominca-sand hover:text-cominca-charcoal'
                }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Form */}
        <div className="px-8 py-8">
          {error && (
            <div className="mb-5 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm font-sans animate-fadeIn">
              {error}
            </div>
          )}

          {tab === 'login'    && <LoginForm    {...sharedProps} />}
          {tab === 'register' && <RegisterForm {...sharedProps} />}
        </div>

        {/* Footer */}
        <div className="px-8 pb-8 text-center">
          {tab === 'login' && (
            <p className="text-xs font-sans text-cominca-sand">
              ¿No tienes cuenta?{' '}
              <button onClick={() => setTab('register')}
                className="text-cominca-forest hover:underline transition-all">
                Regístrate
              </button>
            </p>
          )}
          {tab === 'register' && (
            <p className="text-xs font-sans text-cominca-sand">
              ¿Ya tienes cuenta?{' '}
              <button onClick={() => setTab('login')}
                className="text-cominca-forest hover:underline transition-all">
                Inicia sesión
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Field wrapper ─────────────────────────────────────────────────────────────

function Field({ label, children }) {
  return (
    <div>
      <label className="label-elegant block mb-1.5">{label}</label>
      {children}
    </div>
  )
}
