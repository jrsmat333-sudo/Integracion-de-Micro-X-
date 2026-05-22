import { useState, useEffect, useCallback, Component } from 'react'
import {
  getUsers, createUser, updateUserStatus, deleteUser,
  getClients, deleteClient,
} from '../services/api'
import Toast from './Toast'
import logo from '../assets/keo-arc.jpg'
import iconoAdvertencia from '../assets/icono-advertenciadmin.jpg'

// ── Error Boundary ───────────────────────────────────────────────────────────

class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(e) { return { error: e } }
  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
          <p className="font-sans text-sm text-red-500 font-medium">
            Error al renderizar el panel — revisa la consola del navegador (F12)
          </p>
          <pre className="text-xs text-cominca-sand bg-cominca-light p-4 max-w-lg w-full overflow-auto text-left rounded">
            {this.state.error?.message}
          </pre>
          <button
            onClick={() => this.setState({ error: null })}
            className="btn-ghost text-xs px-4 py-2"
          >
            Reintentar
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

// ── Safe array extractor ──────────────────────────────────────────────────────
// Handles: plain array, { success, data: [...] }, { success, data: { $values } },
// { success, data: { items } }, and nested ApiResponse wrapper patterns.

function toSafeArray(raw) {
  if (Array.isArray(raw)) return raw
  const payload = (raw?.data !== undefined && raw?.data !== null) ? raw.data : raw
  if (Array.isArray(payload)) return payload
  if (payload && Array.isArray(payload.$values)) return payload.$values
  if (payload && Array.isArray(payload.items)) return payload.items
  return []
}

// ── Icons ────────────────────────────────────────────────────────────────────

function IconUsers() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path strokeLinecap="round" d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
    </svg>
  )
}

function IconClients() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path strokeLinecap="round" d="M8 21h8M12 17v4" />
    </svg>
  )
}

function IconTrash() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <polyline points="3 6 5 6 21 6" />
      <path strokeLinecap="round" d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2" />
    </svg>
  )
}

function IconPlus() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" d="M12 5v14M5 12h14" />
    </svg>
  )
}

function IconClose() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

function IconLogout() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1" />
    </svg>
  )
}

// ── Toggle Switch ─────────────────────────────────────────────────────────────

function ToggleSwitch({ checked, onChange, loading }) {
  return (
    <button
      type="button"
      onClick={onChange}
      disabled={loading}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none
        ${checked ? 'bg-cominca-forest' : 'bg-cominca-border'}
        ${loading ? 'opacity-50 cursor-wait' : 'cursor-pointer'}`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform duration-200
          ${checked ? 'translate-x-4.5' : 'translate-x-0.5'}`}
        style={{ transform: checked ? 'translateX(18px)' : 'translateX(2px)' }}
      />
    </button>
  )
}

// ── Role badge ────────────────────────────────────────────────────────────────

function RoleBadge({ role }) {
  const roleStr = typeof role === 'string' ? role
    : (role?.name || role?.Name || role?.roleName || '')
  const styles = {
    Admin:   'bg-cominca-charcoal/10 text-cominca-charcoal',
    Partner: 'bg-cominca-forest/10 text-cominca-forest',
    Client:  'bg-cominca-sand/20 text-cominca-sand',
  }
  return (
    <span className={`inline-block px-2 py-0.5 text-xs font-sans font-medium rounded-sm ${styles[roleStr] || styles.Client}`}>
      {roleStr || 'Client'}
    </span>
  )
}

// ── Confirm Dialog ────────────────────────────────────────────────────────────

const warnWiggleStyle = `
  @keyframes warnWiggle {
    0%, 100% { transform: rotate(0deg); }
    20%       { transform: rotate(-8deg); }
    40%       { transform: rotate(8deg); }
    60%       { transform: rotate(-5deg); }
    80%       { transform: rotate(5deg); }
  }
`

function ConfirmDialog({ message, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-cominca-charcoal/40 backdrop-blur-sm animate-fadeIn">
      <style>{warnWiggleStyle}</style>
      <div className="relative bg-white border border-cominca-border shadow-xl p-8 max-w-sm w-full mx-4 animate-fadeSlideUp">
        <p className="font-sans text-cominca-charcoal text-sm mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="btn-ghost text-xs px-4 py-2">Cancelar</button>
          <button onClick={onConfirm}
            className="px-4 py-2 text-xs font-sans font-medium bg-red-600 text-white hover:bg-red-700 transition-colors">
            Eliminar
          </button>
        </div>
        <img
          src={iconoAdvertencia}
          alt=""
          className="absolute bottom-3 left-3 w-16 h-16 object-contain rounded-sm opacity-80"
          style={{ animation: 'warnWiggle 1.4s ease-in-out infinite' }}
        />
      </div>
    </div>
  )
}

// ── Create User Modal ─────────────────────────────────────────────────────────

function CreateUserModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'Partner' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      await createUser(form)
      onCreated()
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-cominca-charcoal/40 backdrop-blur-sm animate-fadeIn">
      <div className="bg-cominca-cream border border-cominca-border shadow-xl w-full max-w-md mx-4 animate-fadeSlideUp">
        <div className="flex items-center justify-between px-8 py-6 border-b border-cominca-border">
          <h3 className="font-serif text-xl font-medium">Nuevo usuario</h3>
          <button onClick={onClose} className="text-cominca-sand hover:text-cominca-charcoal transition-colors">
            <IconClose />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-8 py-7 space-y-5">
          {error && (
            <div className="px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-xs font-sans">
              {error}
            </div>
          )}
          <div>
            <label className="label-elegant block mb-1.5">Nombre</label>
            <input type="text" required value={form.name} onChange={set('name')}
              placeholder="Nombre completo" className="input-elegant" />
          </div>
          <div>
            <label className="label-elegant block mb-1.5">Correo electrónico</label>
            <input type="email" required value={form.email} onChange={set('email')}
              placeholder="usuario@keoarc.com" className="input-elegant" />
          </div>
          <div>
            <label className="label-elegant block mb-1.5">Contraseña temporal</label>
            <input type="text" required value={form.password} onChange={set('password')}
              placeholder="Mínimo 8 caracteres" className="input-elegant" />
          </div>
          <div>
            <label className="label-elegant block mb-1.5">Rol</label>
            <select value={form.role} onChange={set('role')}
              className="input-elegant cursor-pointer">
              <option value="Admin">Administrador</option>
              <option value="Partner">Partner</option>
              <option value="Client">Cliente</option>
            </select>
          </div>
          <div className="pt-2 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="btn-ghost text-xs px-4 py-2">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="btn-primary text-xs px-5 py-2">
              {loading ? 'Creando…' : 'Crear usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Sections ──────────────────────────────────────────────────────────────────

function UsersSection({ onToast }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState({})
  const [confirm, setConfirm] = useState(null)
  const [showCreate, setShowCreate] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    getUsers()
      .then(data => { console.log('[Users] raw response:', data); setUsers(toSafeArray(data)) })
      .catch(err => { console.error('[Users] getUsers error:', err); onToast('Error cargando usuarios', 'error') })
      .finally(() => setLoading(false))
  }, [onToast])

  useEffect(() => { load() }, [load])

  async function handleToggle(user) {
    setToggling(t => ({ ...t, [user.id]: true }))
    try {
      const newStatus = !user.isActive
      await updateUserStatus(user.id, newStatus)
      setUsers(us => us.map(u => u.id === user.id ? { ...u, isActive: newStatus } : u))
      onToast(`Usuario ${newStatus ? 'activado' : 'desactivado'}`, 'success')
    } catch (err) {
      onToast(err.message, 'error')
    } finally {
      setToggling(t => ({ ...t, [user.id]: false }))
    }
  }

  async function handleDelete(id) {
    try {
      await deleteUser(id)
      setUsers(us => us.filter(u => u.id !== id))
      onToast('Usuario eliminado', 'success')
    } catch (err) {
      onToast(err.message, 'error')
    } finally {
      setConfirm(null)
    }
  }

  return (
    <>
      {/* Section header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="label-elegant mb-1">Panel de administración</p>
          <h2 className="font-serif text-2xl font-light">Gestión de Usuarios</h2>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2 text-xs px-4 py-2.5">
          <IconPlus />
          Nuevo usuario
        </button>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">
            {[1,2,3,4].map(i => <div key={i} className="h-10 bg-cominca-light animate-pulse" />)}
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-cominca-sand font-sans text-sm">
            No hay usuarios registrados
          </div>
        ) : (
          <table className="w-full text-sm font-sans">
            <thead>
              <tr className="border-b border-cominca-border bg-cominca-light">
                <th className="text-left px-5 py-3 label-elegant">Correo</th>
                <th className="text-left px-5 py-3 label-elegant">Rol</th>
                <th className="text-center px-5 py-3 label-elegant">Estado</th>
                <th className="text-center px-5 py-3 label-elegant">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <tr key={u.id} className={`border-b border-cominca-border/50 hover:bg-cominca-cream transition-colors ${i % 2 === 0 ? '' : 'bg-cominca-cream/40'}`}>
                  <td className="px-5 py-3.5 text-cominca-charcoal">{u.email}</td>
                  <td className="px-5 py-3.5">
                    <RoleBadge role={u.role || u.roleName} />
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <ToggleSwitch
                        checked={u.isActive ?? true}
                        onChange={() => handleToggle(u)}
                        loading={!!toggling[u.id]}
                      />
                      <span className={`text-xs ${u.isActive ? 'text-cominca-forest' : 'text-cominca-sand'}`}>
                        {u.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <button
                      onClick={() => setConfirm({ id: u.id, name: u.email })}
                      className="inline-flex items-center gap-1.5 text-red-500 hover:text-red-700 transition-colors text-xs"
                    >
                      <IconTrash />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Confirm delete dialog */}
      {confirm && (
        <ConfirmDialog
          message={`¿Eliminar permanentemente las credenciales de "${confirm.name}"?`}
          onConfirm={() => handleDelete(confirm.id)}
          onCancel={() => setConfirm(null)}
        />
      )}

      {/* Create modal */}
      {showCreate && (
        <CreateUserModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { load(); onToast('Usuario creado correctamente', 'success') }}
        />
      )}
    </>
  )
}

function ClientsSection({ onToast }) {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [confirm, setConfirm] = useState(null)

  useEffect(() => {
    setLoading(true)
    getClients()
      .then(data => { console.log('[Clients] raw response:', data); setClients(toSafeArray(data)) })
      .catch(err => { console.error('[Clients] getClients error:', err); onToast('Error cargando clientes', 'error') })
      .finally(() => setLoading(false))
  }, [onToast])

  async function handleDelete(id) {
    try {
      await deleteClient(id)
      setClients(cs => cs.filter(c => c.id !== id))
      onToast('Cliente eliminado', 'success')
    } catch (err) {
      onToast(err.message, 'error')
    } finally {
      setConfirm(null)
    }
  }

  return (
    <>
      <div className="mb-6">
        <p className="label-elegant mb-1">Panel de administración</p>
        <h2 className="font-serif text-2xl font-light">Gestión de Clientes</h2>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">
            {[1,2,3,4].map(i => <div key={i} className="h-10 bg-cominca-light animate-pulse" />)}
          </div>
        ) : clients.length === 0 ? (
          <div className="p-12 text-center text-cominca-sand font-sans text-sm">
            No hay clientes registrados
          </div>
        ) : (
          <table className="w-full text-sm font-sans">
            <thead>
              <tr className="border-b border-cominca-border bg-cominca-light">
                <th className="text-left px-5 py-3 label-elegant">Nombre</th>
                <th className="text-left px-5 py-3 label-elegant">Correo</th>
                <th className="text-left px-5 py-3 label-elegant">Documento</th>
                <th className="text-left px-5 py-3 label-elegant">Teléfono</th>
                <th className="text-center px-5 py-3 label-elegant">Acción</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c, i) => (
                <tr key={c.id} className={`border-b border-cominca-border/50 hover:bg-cominca-cream transition-colors ${i % 2 === 0 ? '' : 'bg-cominca-cream/40'}`}>
                  <td className="px-5 py-3.5 font-medium text-cominca-charcoal">
                    {[c.firstName, c.lastName].filter(Boolean).join(' ') || '—'}
                  </td>
                  <td className="px-5 py-3.5 text-cominca-charcoal/80">{c.email || '—'}</td>
                  <td className="px-5 py-3.5 text-cominca-sand">{c.documentNumber || '—'}</td>
                  <td className="px-5 py-3.5 text-cominca-sand">{c.phone || '—'}</td>
                  <td className="px-5 py-3.5 text-center">
                    <button
                      onClick={() => setConfirm({ id: c.id, name: [c.firstName, c.lastName].filter(Boolean).join(' ') || c.email })}
                      className="inline-flex items-center gap-1.5 text-red-500 hover:text-red-700 transition-colors text-xs"
                    >
                      <IconTrash />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {confirm && (
        <ConfirmDialog
          message={`¿Eliminar permanentemente la ficha de "${confirm.name}"?`}
          onConfirm={() => handleDelete(confirm.id)}
          onCancel={() => setConfirm(null)}
        />
      )}
    </>
  )
}

// ── Admin Panel ───────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { id: 'users',   label: 'Usuarios',  Icon: IconUsers },
  { id: 'clients', label: 'Clientes',  Icon: IconClients },
]

export default function AdminPanel({ user, onLogout }) {
  const [section, setSection] = useState('users')
  const [toast, setToast] = useState(null)

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type })
  }, [])

  const handleCloseToast = useCallback(() => setToast(null), [])

  return (
    <div className="min-h-screen flex bg-cominca-cream font-sans">

      {/* ── Sidebar ──────────────────────────────────────────────────── */}
      <aside className="w-56 bg-cominca-charcoal flex flex-col fixed top-0 left-0 bottom-0 z-10">

        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-6 border-b border-white/10">
          <img src={logo} alt="Keo Arc" className="h-7 w-7 object-contain rounded-sm opacity-80" />
          <div>
            <p className="font-serif text-white text-base font-medium leading-tight">Keo Arc</p>
            <p className="text-white/40 text-xs font-sans">Admin</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 pt-4">
          <p className="px-5 mb-2 label-elegant text-white/30">Gestión</p>
          {NAV_ITEMS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setSection(id)}
              className={`w-full flex items-center gap-3 px-5 py-3 text-sm font-sans transition-all duration-150
                ${section === id
                  ? 'bg-white/10 text-white font-medium'
                  : 'text-white/50 hover:bg-white/5 hover:text-white/80'
                }`}
            >
              <Icon />
              {label}
            </button>
          ))}
        </nav>

        {/* User + logout */}
        <div className="p-5 border-t border-white/10 space-y-3">
          <p className="text-xs font-sans text-white/40 truncate">{user?.email}</p>
          <button
            onClick={onLogout}
            className="flex items-center gap-2 text-white/40 hover:text-white/70 text-sm font-sans transition-colors"
          >
            <IconLogout />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* ── Main content ───────────────────────────────────────────────── */}
      <main className="flex-1 ml-56 p-10 min-h-screen">
        <ErrorBoundary>
          {section === 'users'   && <UsersSection   onToast={showToast} />}
          {section === 'clients' && <ClientsSection onToast={showToast} />}
        </ErrorBoundary>
      </main>

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={handleCloseToast}
        />
      )}
    </div>
  )
}
