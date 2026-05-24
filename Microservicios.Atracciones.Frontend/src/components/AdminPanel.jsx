import { useState, useEffect, useCallback, Component } from 'react'
import imagenUbicaciones from '../assets/imagen-ubicaciones1.jpg'
import necoJobGif from '../assets/neco-arc-job.gif'
import {
  getUsers, createUser, updateUserStatus, deleteUser,
  getClients, deleteClient,
  getLocations, createLocation, updateLocation, deleteLocation,
  getTicketCategories, createTicketCategory, updateTicketCategory, deleteTicketCategory,
  getAttractionManagement, createAttraction, updateAttraction, deleteAttraction,
  toggleAttractionStatus, toggleAttractionActive,
  getProductOptionsByAttraction, createProductOption, updateProductOption,
  toggleProductOption, deleteProductOption,
  getAdminBookings, getBookingByPnr, getBookingDetail, cancelAdminBooking,
  getAdminInvoices, voidInvoice,
  createInventorySlot,
} from '../services/api'
import Toast from './Toast'
import logo from '../assets/keo-arc.jpg'
import iconoAdvertencia from '../assets/icono-advertenciadmin.jpg'

// ── Error Boundary ────────────────────────────────────────────────────────────

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
          <button onClick={() => this.setState({ error: null })} className="btn-ghost text-xs px-4 py-2">
            Reintentar
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function toSafeArray(raw) {
  if (Array.isArray(raw)) return raw
  const payload = (raw?.data !== undefined && raw?.data !== null) ? raw.data : raw
  if (Array.isArray(payload)) return payload
  if (payload && Array.isArray(payload.$values)) return payload.$values
  if (payload && Array.isArray(payload.items)) return payload.items
  return []
}

function buildFlatMap(nodes, map = {}) {
  for (const n of nodes) {
    map[n.id] = n
    if (n.children?.length) buildFlatMap(n.children, map)
  }
  return map
}

function flattenTree(nodes, parentName = null, depth = 0) {
  const result = []
  for (const n of nodes) {
    result.push({ ...n, parentName, depth })
    if (n.children?.length) result.push(...flattenTree(n.children, n.name, depth + 1))
  }
  return result
}

function getProvinces(countryNode) {
  if (!countryNode?.children?.length) return []
  if (countryNode.children[0]?.type === 'region') {
    return countryNode.children.flatMap(r => r.children || [])
  }
  return countryNode.children
}

// ── Icons ─────────────────────────────────────────────────────────────────────

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
function IconMap() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
    </svg>
  )
}
function IconTag() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
    </svg>
  )
}
function IconStar() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
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
function IconEdit() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  )
}
function IconLayers() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
    </svg>
  )
}
function IconCalendar() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path strokeLinecap="round" d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  )
}
function IconBookmark() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
    </svg>
  )
}
function IconReceipt() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
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
        className="inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform duration-200"
        style={{ transform: checked ? 'translateX(18px)' : 'translateX(2px)' }}
      />
    </button>
  )
}

// ── Role badge ─────────────────────────────────────────────────────────────────

function RoleBadge({ role }) {
  const roleStr = typeof role === 'string' ? role : (role?.name || role?.Name || role?.roleName || '')
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

// ── Confirm Dialog ─────────────────────────────────────────────────────────────

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
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-xs font-sans font-medium bg-red-600 text-white hover:bg-red-700 transition-colors"
          >
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

// ── Location Cascade (reusable) ───────────────────────────────────────────────
// 4-level: País → Región → Provincia → Ciudad
// Falls back to 3-level (sin Región) si el país no tiene nodos de tipo "region".

function LocationCascade({ locationTree, value, onChange }) {
  const [selCountry,  setSelCountry]  = useState('')
  const [selRegion,   setSelRegion]   = useState('')
  const [selProvince, setSelProvince] = useState('')

  // Pre-populate all selects from a stored cityId
  useEffect(() => {
    if (!value || !locationTree.length) return
    const flat = buildFlatMap(locationTree)
    const city = flat[value]
    if (!city) return
    const level3 = flat[city.parentId]   // province (or region if 3-level)
    if (!level3) return
    const level2 = flat[level3.parentId] // region (or country if 3-level)
    if (!level2) return
    const level1 = flat[level2.parentId] // country (undefined if level2 is country)

    if (level1) {
      // 4-level: country(level1) → region(level2) → province(level3) → city(value)
      setSelCountry(level1.id)
      setSelRegion(level2.id)
      setSelProvince(level3.id)
    } else {
      // 3-level: country(level2) → province(level3) → city(value)
      setSelCountry(level2.id)
      setSelRegion('')
      setSelProvince(level3.id)
    }
  }, [value, locationTree])

  const countries       = locationTree
  const selCountryNode  = countries.find(c => c.id === selCountry)
  const countryChildren = selCountryNode?.children || []

  // Detect 4-level hierarchy (Country → Region → Province → City) structurally:
  // if a country-child's child also has children, there are 3 levels below country.
  const hasRegions = !!(countryChildren[0]?.children?.[0]?.children?.length)

  const regions         = hasRegions ? countryChildren : []
  const selRegionNode   = regions.find(r => r.id === selRegion)
  const provinces       = hasRegions ? (selRegionNode?.children || []) : countryChildren
  const selProvinceNode = provinces.find(p => p.id === selProvince)
  const cities          = selProvinceNode?.children || []

  return (
    <div className="grid grid-cols-2 gap-3">
      {/* País */}
      <div>
        <label className="label-elegant block mb-1.5">País</label>
        <select
          value={selCountry}
          onChange={e => { setSelCountry(e.target.value); setSelRegion(''); setSelProvince(''); onChange('') }}
          className="input-elegant cursor-pointer"
        >
          <option value="">Seleccionar…</option>
          {countries.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* Región */}
      <div>
        <label className="label-elegant block mb-1.5">Región</label>
        <select
          value={selRegion}
          onChange={e => { setSelRegion(e.target.value); setSelProvince(''); onChange('') }}
          disabled={!hasRegions || !regions.length}
          className="input-elegant cursor-pointer disabled:opacity-40"
        >
          <option value="">Seleccionar…</option>
          {regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
      </div>

      {/* Provincia */}
      <div>
        <label className="label-elegant block mb-1.5">Provincia</label>
        <select
          value={selProvince}
          onChange={e => { setSelProvince(e.target.value); onChange('') }}
          disabled={!provinces.length}
          className="input-elegant cursor-pointer disabled:opacity-40"
        >
          <option value="">Seleccionar…</option>
          {provinces.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {/* Ciudad */}
      <div>
        <label className="label-elegant block mb-1.5">Ciudad</label>
        <select
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          disabled={!cities.length}
          className="input-elegant cursor-pointer disabled:opacity-40"
        >
          <option value="">Seleccionar…</option>
          {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
    </div>
  )
}

// ── Create User Modal ─────────────────────────────────────────────────────────

function CreateUserModal({ onClose, onCreated }) {
  const [form, setForm]     = useState({ name: '', email: '', password: '', role: 'Partner' })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
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
            <div className="px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-xs font-sans">{error}</div>
          )}
          <div>
            <label className="label-elegant block mb-1.5">Nombre</label>
            <input type="text" required value={form.name} onChange={set('name')} placeholder="Nombre completo" className="input-elegant" />
          </div>
          <div>
            <label className="label-elegant block mb-1.5">Correo electrónico</label>
            <input type="email" required value={form.email} onChange={set('email')} placeholder="usuario@keoarc.com" className="input-elegant" />
          </div>
          <div>
            <label className="label-elegant block mb-1.5">Contraseña temporal</label>
            <input type="text" required value={form.password} onChange={set('password')} placeholder="Mínimo 8 caracteres" className="input-elegant" />
          </div>
          <div>
            <label className="label-elegant block mb-1.5">Rol</label>
            <select value={form.role} onChange={set('role')} className="input-elegant cursor-pointer">
              <option value="Admin">Administrador</option>
              <option value="Partner">Partner</option>
              <option value="Client">Cliente</option>
            </select>
          </div>
          <div className="pt-2 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="btn-ghost text-xs px-4 py-2">Cancelar</button>
            <button type="submit" disabled={loading} className="btn-primary text-xs px-5 py-2">
              {loading ? 'Creando…' : 'Crear usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Sections: Users ───────────────────────────────────────────────────────────

const ROLE_FILTERS = ['Todos', 'Admin', 'Partner', 'Client']

function UsersSection({ onToast }) {
  const [users, setUsers]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [toggling, setToggling] = useState({})
  const [confirm, setConfirm]   = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const [roleFilter, setRoleFilter] = useState('Todos')

  const load = useCallback(() => {
    setLoading(true)
    getUsers()
      .then(data => setUsers(toSafeArray(data)))
      .catch(err => onToast(err.message, 'error'))
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

  const roleStr = u => typeof u.role === 'string' ? u.role : (u.role?.name || u.role?.Name || u.roleName || '')
  const visibleUsers = roleFilter === 'Todos' ? users : users.filter(u => roleStr(u) === roleFilter)

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="label-elegant mb-1">Panel de administración</p>
          <h2 className="font-serif text-2xl font-light">Gestión de Usuarios</h2>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2 text-xs px-4 py-2.5">
          <IconPlus /> Nuevo usuario
        </button>
      </div>

      <div className="flex items-center gap-2 mb-5">
        {ROLE_FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setRoleFilter(f)}
            className={`px-3 py-1.5 text-xs font-sans font-medium transition-colors border
              ${roleFilter === f
                ? 'bg-cominca-charcoal text-white border-cominca-charcoal'
                : 'bg-white text-cominca-sand border-cominca-border hover:text-cominca-charcoal hover:border-cominca-charcoal/40'
              }`}
          >
            {f}
          </button>
        ))}
        {roleFilter !== 'Todos' && (
          <span className="text-xs font-sans text-cominca-sand ml-1">
            {visibleUsers.length} resultado{visibleUsers.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">{[1,2,3,4].map(i => <div key={i} className="h-10 bg-cominca-light animate-pulse" />)}</div>
        ) : visibleUsers.length === 0 ? (
          <div className="p-12 text-center text-cominca-sand font-sans text-sm">
            {users.length === 0 ? 'No hay usuarios registrados' : `No hay usuarios con rol "${roleFilter}"`}
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
              {visibleUsers.map((u, i) => (
                <tr key={u.id} className={`border-b border-cominca-border/50 hover:bg-cominca-cream transition-colors ${i % 2 === 0 ? '' : 'bg-cominca-cream/40'}`}>
                  <td className="px-5 py-3.5 text-cominca-charcoal">{u.email}</td>
                  <td className="px-5 py-3.5"><RoleBadge role={u.role || u.roleName} /></td>
                  <td className="px-5 py-3.5 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <ToggleSwitch checked={u.isActive ?? true} onChange={() => handleToggle(u)} loading={!!toggling[u.id]} />
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

      {confirm && (
        <ConfirmDialog
          message={`¿Eliminar permanentemente las credenciales de "${confirm.name}"?`}
          onConfirm={() => handleDelete(confirm.id)}
          onCancel={() => setConfirm(null)}
        />
      )}
      {showCreate && (
        <CreateUserModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { load(); onToast('Usuario creado correctamente', 'success') }}
        />
      )}
    </>
  )
}

// ── Sections: Clients ─────────────────────────────────────────────────────────

function ClientsSection({ onToast }) {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [confirm, setConfirm] = useState(null)

  useEffect(() => {
    setLoading(true)
    getClients()
      .then(data => setClients(toSafeArray(data)))
      .catch(err => onToast(err.message, 'error'))
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
          <div className="p-8 space-y-3">{[1,2,3,4].map(i => <div key={i} className="h-10 bg-cominca-light animate-pulse" />)}</div>
        ) : clients.length === 0 ? (
          <div className="p-12 text-center text-cominca-sand font-sans text-sm">No hay clientes registrados</div>
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

// ── Sections: Locations ───────────────────────────────────────────────────────

function LocationModal({ initial, allLocations, onClose, onSaved, onToast }) {
  const isEdit = !!initial
  const [form, setForm] = useState({
    name:        initial?.name        || '',
    type:        initial?.type        || 'city',
    parentId:    initial?.parentId    || '',
    countryCode: initial?.countryCode || '',
  })
  const [loading, setLoading] = useState(false)
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      const body = {
        name:        form.name,
        type:        form.type,
        parentId:    form.parentId   || null,
        countryCode: form.countryCode || null,
      }
      if (isEdit) {
        await updateLocation(initial.id, body)
      } else {
        await createLocation(body)
      }
      onSaved()
      onClose()
    } catch (err) {
      onToast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const locTypeLabel = { country: 'País', region: 'Región', province: 'Provincia', city: 'Ciudad', state: 'Estado' }

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-cominca-charcoal/40 backdrop-blur-sm animate-fadeIn">
      <div className="bg-cominca-cream border border-cominca-border shadow-xl w-full max-w-md mx-4 animate-fadeSlideUp">
        <div className="flex items-center justify-between px-8 py-6 border-b border-cominca-border">
          <h3 className="font-serif text-xl font-medium">{isEdit ? 'Editar ubicación' : 'Nueva ubicación'}</h3>
          <button onClick={onClose} className="text-cominca-sand hover:text-cominca-charcoal transition-colors"><IconClose /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-8 py-7 space-y-5">
          <div>
            <label className="label-elegant block mb-1.5">Nombre</label>
            <input type="text" required value={form.name} onChange={set('name')} placeholder="Nombre de la ubicación" className="input-elegant" />
          </div>
          <div>
            <label className="label-elegant block mb-1.5">Tipo</label>
            <select value={form.type} onChange={set('type')} className="input-elegant cursor-pointer">
              {['country', 'region', 'province', 'city'].map(t => (
                <option key={t} value={t}>{locTypeLabel[t]}</option>
              ))}
            </select>
          </div>
          {form.type !== 'country' && (
            <div>
              <label className="label-elegant block mb-1.5">Ubicación padre</label>
              <select value={form.parentId} onChange={set('parentId')} className="input-elegant cursor-pointer">
                <option value="">Sin padre (raíz)</option>
                {allLocations.filter(l => l.id !== initial?.id).map(l => (
                  <option key={l.id} value={l.id}>
                    {'  '.repeat(l.depth)}{l.name} ({locTypeLabel[l.type] || l.type})
                  </option>
                ))}
              </select>
            </div>
          )}
          {form.type === 'country' && (
            <div>
              <label className="label-elegant block mb-1.5">Código de país (ej: EC, US)</label>
              <input type="text" maxLength={4} value={form.countryCode} onChange={set('countryCode')} placeholder="EC" className="input-elegant" />
            </div>
          )}
          <div className="pt-2 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="btn-ghost text-xs px-4 py-2">Cancelar</button>
            <button type="submit" disabled={loading} className="btn-primary text-xs px-5 py-2">
              {loading ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear ubicación'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function LocationsSection({ onToast }) {
  const [tree, setTree]         = useState([])
  const [flat, setFlat]         = useState([])
  const [loading, setLoading]   = useState(true)
  const [editing, setEditing]   = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const [confirm, setConfirm]   = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    getLocations()
      .then(raw => {
        const arr = toSafeArray(raw)
        setTree(arr)
        setFlat(flattenTree(arr))
      })
      .catch(err => onToast(err.message, 'error'))
      .finally(() => setLoading(false))
  }, [onToast])

  useEffect(() => { load() }, [load])

  async function handleDelete(id) {
    try {
      await deleteLocation(id)
      onToast('Ubicación eliminada', 'success')
      load()
    } catch (err) {
      onToast(err.message, 'error')
    } finally {
      setConfirm(null)
    }
  }

  const locTypeLabel = { country: 'País', region: 'Región', province: 'Provincia', city: 'Ciudad', state: 'Estado' }
  const locTypeColor = {
    country:  'bg-cominca-charcoal/10 text-cominca-charcoal',
    region:   'bg-cominca-forest/10 text-cominca-forest',
    province: 'bg-cominca-sand/20 text-cominca-sand',
    city:     'bg-cominca-border text-cominca-charcoal/60',
    state:    'bg-cominca-sand/20 text-cominca-sand',
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="label-elegant mb-1">Catálogo</p>
          <h2 className="font-serif text-2xl font-light">Gestión de Locaciones</h2>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2 text-xs px-4 py-2.5">
          <IconPlus /> Nueva ubicación
        </button>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">{[1,2,3,4,5].map(i => <div key={i} className="h-10 bg-cominca-light animate-pulse" />)}</div>
        ) : flat.length === 0 ? (
          <div className="p-12 text-center text-cominca-sand font-sans text-sm">No hay ubicaciones registradas</div>
        ) : (
          <table className="w-full text-sm font-sans">
            <thead>
              <tr className="border-b border-cominca-border bg-cominca-light">
                <th className="text-left px-5 py-3 label-elegant">Nombre</th>
                <th className="text-left px-5 py-3 label-elegant">Tipo</th>
                <th className="text-left px-5 py-3 label-elegant">Padre</th>
                <th className="text-center px-5 py-3 label-elegant">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {flat.map((loc, i) => (
                <tr key={loc.id} className={`border-b border-cominca-border/50 hover:bg-cominca-cream transition-colors ${i % 2 === 0 ? '' : 'bg-cominca-cream/40'}`}>
                  <td className="px-5 py-3 text-cominca-charcoal" style={{ paddingLeft: `${20 + loc.depth * 16}px` }}>
                    {loc.name}
                    {loc.countryCode && <span className="ml-2 text-xs text-cominca-sand">{loc.countryCode}</span>}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2 py-0.5 font-sans font-medium ${locTypeColor[loc.type] || ''}`}>
                      {locTypeLabel[loc.type] || loc.type}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-cominca-sand text-xs">{loc.parentName || '—'}</td>
                  <td className="px-5 py-3 text-center">
                    <div className="flex items-center justify-center gap-3">
                      <button onClick={() => setEditing(loc)} className="text-cominca-sand hover:text-cominca-charcoal transition-colors">
                        <IconEdit />
                      </button>
                      <button onClick={() => setConfirm({ id: loc.id, name: loc.name })} className="text-red-400 hover:text-red-600 transition-colors">
                        <IconTrash />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showCreate && (
        <LocationModal
          allLocations={flat}
          onClose={() => setShowCreate(false)}
          onSaved={() => { load(); onToast('Ubicación creada', 'success') }}
          onToast={onToast}
        />
      )}
      {editing && (
        <LocationModal
          initial={editing}
          allLocations={flat}
          onClose={() => setEditing(null)}
          onSaved={() => { load(); onToast('Ubicación actualizada', 'success'); setEditing(null) }}
          onToast={onToast}
        />
      )}
      {confirm && (
        <ConfirmDialog
          message={`¿Eliminar la ubicación "${confirm.name}" y todos sus hijos?`}
          onConfirm={() => handleDelete(confirm.id)}
          onCancel={() => setConfirm(null)}
        />
      )}
    </>
  )
}

// ── Sections: Ticket Categories ───────────────────────────────────────────────

function TicketCategoryModal({ initial, onClose, onSaved, onToast }) {
  const isEdit = !!initial
  const [form, setForm]     = useState({
    name:        initial?.name        || '',
    nameEn:      initial?.nameEn      || '',
    ageRangeMin: initial?.ageRangeMin ?? '',
    ageRangeMax: initial?.ageRangeMax ?? '',
    sortOrder:   initial?.sortOrder   ?? 0,
  })
  const [loading, setLoading] = useState(false)
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      const body = {
        name:        form.name,
        nameEn:      form.nameEn      || null,
        ageRangeMin: form.ageRangeMin !== '' ? Number(form.ageRangeMin) : null,
        ageRangeMax: form.ageRangeMax !== '' ? Number(form.ageRangeMax) : null,
        sortOrder:   Number(form.sortOrder) || 0,
      }
      if (isEdit) {
        await updateTicketCategory(initial.id, body)
      } else {
        await createTicketCategory(body)
      }
      onSaved()
      onClose()
    } catch (err) {
      onToast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-cominca-charcoal/40 backdrop-blur-sm animate-fadeIn">
      <div className="bg-cominca-cream border border-cominca-border shadow-xl w-full max-w-md mx-4 animate-fadeSlideUp">
        <div className="flex items-center justify-between px-8 py-6 border-b border-cominca-border">
          <h3 className="font-serif text-xl font-medium">{isEdit ? 'Editar categoría' : 'Nueva categoría de ticket'}</h3>
          <button onClick={onClose} className="text-cominca-sand hover:text-cominca-charcoal transition-colors"><IconClose /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-8 py-7 space-y-5">
          <div>
            <label className="label-elegant block mb-1.5">Nombre (es)</label>
            <input type="text" required value={form.name} onChange={set('name')} placeholder="Ej: Adulto" className="input-elegant" />
          </div>
          <div>
            <label className="label-elegant block mb-1.5">Nombre (en)</label>
            <input type="text" value={form.nameEn} onChange={set('nameEn')} placeholder="Ej: Adult" className="input-elegant" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-elegant block mb-1.5">Edad mínima</label>
              <input type="number" min={0} max={120} value={form.ageRangeMin} onChange={set('ageRangeMin')} placeholder="—" className="input-elegant" />
            </div>
            <div>
              <label className="label-elegant block mb-1.5">Edad máxima</label>
              <input type="number" min={0} max={120} value={form.ageRangeMax} onChange={set('ageRangeMax')} placeholder="—" className="input-elegant" />
            </div>
          </div>
          <div>
            <label className="label-elegant block mb-1.5">Orden</label>
            <input type="number" min={0} value={form.sortOrder} onChange={set('sortOrder')} className="input-elegant" />
          </div>
          <div className="pt-2 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="btn-ghost text-xs px-4 py-2">Cancelar</button>
            <button type="submit" disabled={loading} className="btn-primary text-xs px-5 py-2">
              {loading ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear categoría'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function TicketCategoriesSection({ onToast }) {
  const [categories, setCategories] = useState([])
  const [loading, setLoading]       = useState(true)
  const [editing, setEditing]       = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const [confirm, setConfirm]       = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    getTicketCategories()
      .then(raw => setCategories(toSafeArray(raw)))
      .catch(err => onToast(err.message, 'error'))
      .finally(() => setLoading(false))
  }, [onToast])

  useEffect(() => { load() }, [load])

  async function handleDelete(id) {
    try {
      await deleteTicketCategory(id)
      setCategories(cs => cs.filter(c => c.id !== id))
      onToast('Categoría eliminada', 'success')
    } catch (err) {
      onToast(err.message, 'error')
    } finally {
      setConfirm(null)
    }
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="label-elegant mb-1">Catálogo</p>
          <h2 className="font-serif text-2xl font-light">Categorías de Ticket</h2>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2 text-xs px-4 py-2.5">
          <IconPlus /> Nueva categoría
        </button>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">{[1,2,3].map(i => <div key={i} className="h-10 bg-cominca-light animate-pulse" />)}</div>
        ) : categories.length === 0 ? (
          <div className="p-12 text-center text-cominca-sand font-sans text-sm">No hay categorías registradas</div>
        ) : (
          <table className="w-full text-sm font-sans">
            <thead>
              <tr className="border-b border-cominca-border bg-cominca-light">
                <th className="text-left px-5 py-3 label-elegant">Nombre</th>
                <th className="text-left px-5 py-3 label-elegant">EN</th>
                <th className="text-left px-5 py-3 label-elegant">Rango edad</th>
                <th className="text-center px-5 py-3 label-elegant">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat, i) => (
                <tr key={cat.id} className={`border-b border-cominca-border/50 hover:bg-cominca-cream transition-colors ${i % 2 === 0 ? '' : 'bg-cominca-cream/40'}`}>
                  <td className="px-5 py-3.5 font-medium text-cominca-charcoal">{cat.name}</td>
                  <td className="px-5 py-3.5 text-cominca-sand">{cat.nameEn || '—'}</td>
                  <td className="px-5 py-3.5 text-cominca-sand text-xs">
                    {cat.ageRangeMin != null || cat.ageRangeMax != null
                      ? `${cat.ageRangeMin ?? '0'} – ${cat.ageRangeMax ?? '∞'}`
                      : '—'
                    }
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <div className="flex items-center justify-center gap-3">
                      <button onClick={() => setEditing(cat)} className="text-cominca-sand hover:text-cominca-charcoal transition-colors">
                        <IconEdit />
                      </button>
                      <button onClick={() => setConfirm({ id: cat.id, name: cat.name })} className="text-red-400 hover:text-red-600 transition-colors">
                        <IconTrash />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showCreate && (
        <TicketCategoryModal
          onClose={() => setShowCreate(false)}
          onSaved={() => { load(); onToast('Categoría creada', 'success') }}
          onToast={onToast}
        />
      )}
      {editing && (
        <TicketCategoryModal
          initial={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { load(); onToast('Categoría actualizada', 'success'); setEditing(null) }}
          onToast={onToast}
        />
      )}
      {confirm && (
        <ConfirmDialog
          message={`¿Eliminar la categoría "${confirm.name}"?`}
          onConfirm={() => handleDelete(confirm.id)}
          onCancel={() => setConfirm(null)}
        />
      )}
    </>
  )
}

// ── Product Options Modal ─────────────────────────────────────────────────────

function PriceTierFields({ tiers, onChange, categories }) {
  function addTier() {
    onChange([...tiers, { ticketCategoryId: '', price: '', currencyCode: 'USD' }])
  }
  function removeTier(idx) {
    onChange(tiers.filter((_, i) => i !== idx))
  }
  function updateTier(idx, key, val) {
    onChange(tiers.map((t, i) => i === idx ? { ...t, [key]: val } : t))
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="label-elegant">Precios por categoría</label>
        <button type="button" onClick={addTier} className="text-xs font-sans text-cominca-forest hover:underline flex items-center gap-1">
          <IconPlus /> Agregar precio
        </button>
      </div>
      {tiers.length === 0 && (
        <p className="text-xs text-cominca-sand font-sans py-2">Sin precios definidos</p>
      )}
      <div className="space-y-2">
        {tiers.map((tier, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <select
              value={tier.ticketCategoryId}
              onChange={e => updateTier(idx, 'ticketCategoryId', e.target.value)}
              className="input-elegant flex-1 text-xs"
            >
              <option value="">Categoría…</option>
              {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
            </select>
            <input
              type="number"
              min={0}
              step="0.01"
              placeholder="Precio"
              value={tier.price}
              onChange={e => updateTier(idx, 'price', e.target.value)}
              className="input-elegant w-24 text-xs"
            />
            <input
              type="text"
              maxLength={3}
              placeholder="USD"
              value={tier.currencyCode}
              onChange={e => updateTier(idx, 'currencyCode', e.target.value.toUpperCase())}
              className="input-elegant w-14 text-xs"
            />
            <button type="button" onClick={() => removeTier(idx)} className="text-red-400 hover:text-red-600 flex-shrink-0">
              <IconClose />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

function ProductOptionFormModal({ attractionId, initial, categories, onClose, onSaved, onToast }) {
  const isEdit = !!initial
  const [form, setForm] = useState({
    title:               initial?.title               || '',
    description:         initial?.description         || '',
    durationMinutes:     initial?.durationMinutes      ?? '',
    durationDescription: initial?.durationDescription || '',
    cancelPolicyHours:   initial?.cancelPolicyHours   ?? 24,
    cancelPolicyText:    initial?.cancelPolicyText     || '',
    maxGroupSize:        initial?.maxGroupSize          ?? '',
    minParticipants:     initial?.minParticipants       ?? 1,
    isPrivate:           initial?.isPrivate             ?? false,
    isActive:            initial?.isActive              ?? true,
    priceTiers: (initial?.priceTiers || []).map(t => ({
      ticketCategoryId: t.ticketCategoryId,
      price:            t.price,
      currencyCode:     t.currencyCode || 'USD',
    })),
  })
  const [loading, setLoading] = useState(false)
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))
  const setChk = k => e => setForm(f => ({ ...f, [k]: e.target.checked }))

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      const body = {
        attractionId,
        title:               form.title,
        description:         form.description         || null,
        durationMinutes:     form.durationMinutes     !== '' ? Number(form.durationMinutes) : null,
        durationDescription: form.durationDescription || null,
        cancelPolicyHours:   Number(form.cancelPolicyHours) || 24,
        cancelPolicyText:    form.cancelPolicyText    || null,
        maxGroupSize:        form.maxGroupSize        !== '' ? Number(form.maxGroupSize) : null,
        minParticipants:     Number(form.minParticipants) || 1,
        isPrivate:           form.isPrivate,
        isActive:            form.isActive,
        priceTiers: form.priceTiers
          .filter(t => t.ticketCategoryId && t.price !== '')
          .map(t => ({ ticketCategoryId: t.ticketCategoryId, price: Number(t.price), currencyCode: t.currencyCode || 'USD' })),
      }
      if (isEdit) {
        await updateProductOption(initial.id, body)
      } else {
        await createProductOption(body)
      }
      onSaved()
      onClose()
    } catch (err) {
      onToast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-cominca-charcoal/40 backdrop-blur-sm animate-fadeIn">
      <div className="bg-cominca-cream border border-cominca-border shadow-xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col animate-fadeSlideUp">
        <div className="flex items-center justify-between px-8 py-5 border-b border-cominca-border flex-shrink-0">
          <h3 className="font-serif text-lg font-medium">{isEdit ? 'Editar modalidad' : 'Nueva modalidad'}</h3>
          <button onClick={onClose} className="text-cominca-sand hover:text-cominca-charcoal transition-colors"><IconClose /></button>
        </div>
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-8 py-6 space-y-5">
          <div>
            <label className="label-elegant block mb-1.5">Título</label>
            <input type="text" required value={form.title} onChange={set('title')} placeholder="Ej: Entrada general" className="input-elegant" />
          </div>
          <div>
            <label className="label-elegant block mb-1.5">Descripción</label>
            <textarea rows={2} value={form.description} onChange={set('description')} className="input-elegant resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-elegant block mb-1.5">Duración (min)</label>
              <input type="number" min={0} value={form.durationMinutes} onChange={set('durationMinutes')} placeholder="—" className="input-elegant" />
            </div>
            <div>
              <label className="label-elegant block mb-1.5">Cancelación (h)</label>
              <input type="number" min={0} value={form.cancelPolicyHours} onChange={set('cancelPolicyHours')} className="input-elegant" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-elegant block mb-1.5">Mín. participantes</label>
              <input type="number" min={1} value={form.minParticipants} onChange={set('minParticipants')} className="input-elegant" />
            </div>
            <div>
              <label className="label-elegant block mb-1.5">Máx. grupo</label>
              <input type="number" min={1} value={form.maxGroupSize} onChange={set('maxGroupSize')} placeholder="—" className="input-elegant" />
            </div>
          </div>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.isPrivate} onChange={setChk('isPrivate')} className="rounded" />
              <span className="text-sm font-sans text-cominca-charcoal">Privado</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.isActive} onChange={setChk('isActive')} className="rounded" />
              <span className="text-sm font-sans text-cominca-charcoal">Activo</span>
            </label>
          </div>
          <PriceTierFields
            tiers={form.priceTiers}
            onChange={tiers => setForm(f => ({ ...f, priceTiers: tiers }))}
            categories={categories}
          />
          <div className="pt-2 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="btn-ghost text-xs px-4 py-2">Cancelar</button>
            <button type="submit" disabled={loading} className="btn-primary text-xs px-5 py-2">
              {loading ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear modalidad'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function SlotFormModal({ opt, onClose, onToast }) {
  const [form, setForm] = useState({ slotDate: '', startTime: '', endTime: '', capacityTotal: 1 })
  const [loading, setLoading] = useState(false)
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.slotDate || !form.startTime || form.capacityTotal < 1) return
    setLoading(true)
    try {
      await createInventorySlot({
        productOptionId: opt.id,
        slotDate:        form.slotDate,
        startTime:       form.startTime,
        endTime:         form.endTime || null,
        capacityTotal:   Number(form.capacityTotal),
      })
      onToast('Cupos asignados correctamente', 'success')
      onClose()
    } catch (err) {
      onToast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[170] flex items-center justify-center bg-cominca-charcoal/50 backdrop-blur-sm animate-fadeIn">
      <div className="bg-cominca-cream border border-cominca-border shadow-xl w-full max-w-sm mx-4 animate-fadeSlideUp">
        <div className="flex items-center justify-between px-6 py-4 border-b border-cominca-border">
          <div>
            <p className="label-elegant mb-0.5">Asignar disponibilidad</p>
            <h4 className="font-serif text-base font-light text-cominca-charcoal">{opt.title}</h4>
          </div>
          <button onClick={onClose} className="text-cominca-sand hover:text-cominca-charcoal transition-colors"><IconClose /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="label-elegant block mb-1">Fecha *</label>
            <input type="date" required className="input-elegant w-full" value={form.slotDate} onChange={set('slotDate')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-elegant block mb-1">Hora inicio *</label>
              <input type="time" required className="input-elegant w-full" value={form.startTime} onChange={set('startTime')} />
            </div>
            <div>
              <label className="label-elegant block mb-1">Hora fin</label>
              <input type="time" className="input-elegant w-full" value={form.endTime} onChange={set('endTime')} />
            </div>
          </div>
          <div>
            <label className="label-elegant block mb-1">Cupos totales *</label>
            <input type="number" min="1" max="9999" required className="input-elegant w-full"
              value={form.capacityTotal} onChange={e => setForm(f => ({ ...f, capacityTotal: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost text-xs px-4 py-2">Cancelar</button>
            <button type="submit" disabled={loading} className="btn-primary text-xs px-4 py-2 disabled:opacity-40">
              {loading ? 'Guardando…' : 'Guardar cupos'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ProductOptionsModal({ attraction, onClose, onToast }) {
  const [options, setOptions]       = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading]       = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing]       = useState(null)
  const [confirm, setConfirm]       = useState(null)
  const [slotModal, setSlotModal]   = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([
      getProductOptionsByAttraction(attraction.id),
      getTicketCategories(),
    ])
      .then(([optRaw, catRaw]) => {
        setOptions(toSafeArray(optRaw))
        setCategories(toSafeArray(catRaw))
      })
      .catch(err => onToast(err.message, 'error'))
      .finally(() => setLoading(false))
  }, [attraction.id, onToast])

  useEffect(() => { load() }, [load])

  async function handleToggle(opt) {
    try {
      await toggleProductOption(opt.id, !opt.isActive)
      setOptions(os => os.map(o => o.id === opt.id ? { ...o, isActive: !o.isActive } : o))
      onToast(`Modalidad ${!opt.isActive ? 'activada' : 'desactivada'}`, 'success')
    } catch (err) {
      onToast(err.message, 'error')
    }
  }

  async function handleDelete(id) {
    try {
      await deleteProductOption(id)
      setOptions(os => os.filter(o => o.id !== id))
      onToast('Modalidad eliminada', 'success')
    } catch (err) {
      onToast(err.message, 'error')
    } finally {
      setConfirm(null)
    }
  }

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center bg-cominca-charcoal/40 backdrop-blur-sm animate-fadeIn">
      <div className="bg-cominca-cream border border-cominca-border shadow-xl w-full max-w-3xl mx-4 max-h-[88vh] flex flex-col animate-fadeSlideUp">
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-cominca-border flex-shrink-0">
          <div>
            <p className="label-elegant mb-0.5">Gestión de Modalidades</p>
            <h3 className="font-serif text-xl font-medium">{attraction.name}</h3>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2 text-xs px-4 py-2.5">
              <IconPlus /> Nueva modalidad
            </button>
            <button onClick={onClose} className="text-cominca-sand hover:text-cominca-charcoal transition-colors"><IconClose /></button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-8">
          {loading ? (
            <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 bg-cominca-light animate-pulse" />)}</div>
          ) : options.length === 0 ? (
            <div className="py-16 text-center text-cominca-sand font-sans text-sm">
              No hay modalidades. Crea la primera con el botón de arriba.
            </div>
          ) : (
            <div className="space-y-4">
              {options.map(opt => (
                <div key={opt.id} className="card p-5">
                  <div className="flex items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-serif text-base font-medium text-cominca-charcoal">{opt.title}</h4>
                        <span className={`text-xs px-2 py-0.5 font-sans ${opt.isActive ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-cominca-light text-cominca-sand'}`}>
                          {opt.isActive ? 'Activa' : 'Inactiva'}
                        </span>
                        {opt.isPrivate && <span className="text-xs px-2 py-0.5 font-sans border border-cominca-border text-cominca-sand">Privada</span>}
                      </div>
                      {opt.description && <p className="text-xs text-cominca-sand mb-2">{opt.description}</p>}
                      <div className="flex flex-wrap gap-3 text-xs text-cominca-sand">
                        {opt.durationMinutes && <span>{opt.durationMinutes}min</span>}
                        <span>Mín: {opt.minParticipants}</span>
                        {opt.maxGroupSize && <span>Máx grupo: {opt.maxGroupSize}</span>}
                        <span>Cancel: {opt.cancelPolicyHours}h</span>
                      </div>
                      {opt.priceTiers?.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {opt.priceTiers.map(t => (
                            <span key={t.id} className="text-xs bg-cominca-light px-2 py-0.5 font-sans">
                              {t.categoryName}: ${t.price} {t.currencyCode}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 pt-0.5">
                      <button
                        onClick={() => setSlotModal(opt)}
                        title="Asignar disponibilidad"
                        className="text-cominca-sand hover:text-cominca-forest transition-colors p-1"
                      >
                        <IconCalendar />
                      </button>
                      <ToggleSwitch checked={opt.isActive} onChange={() => handleToggle(opt)} />
                      <button onClick={() => setEditing(opt)} className="text-cominca-sand hover:text-cominca-charcoal transition-colors p-1">
                        <IconEdit />
                      </button>
                      <button onClick={() => setConfirm({ id: opt.id, name: opt.title })} className="text-red-400 hover:text-red-600 transition-colors p-1">
                        <IconTrash />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showCreate && (
        <ProductOptionFormModal
          attractionId={attraction.id}
          categories={categories}
          onClose={() => setShowCreate(false)}
          onSaved={() => { load(); onToast('Modalidad creada', 'success') }}
          onToast={onToast}
        />
      )}
      {editing && (
        <ProductOptionFormModal
          attractionId={attraction.id}
          initial={editing}
          categories={categories}
          onClose={() => setEditing(null)}
          onSaved={() => { load(); onToast('Modalidad actualizada', 'success'); setEditing(null) }}
          onToast={onToast}
        />
      )}
      {confirm && (
        <ConfirmDialog
          message={`¿Eliminar la modalidad "${confirm.name}"?`}
          onConfirm={() => handleDelete(confirm.id)}
          onCancel={() => setConfirm(null)}
        />
      )}
      {slotModal && (
        <SlotFormModal
          opt={slotModal}
          onClose={() => setSlotModal(null)}
          onToast={onToast}
        />
      )}
    </div>
  )
}

// ── Create/Edit Attraction Modal ───────────────────────────────────────────────

function AttractionModal({ initial, locationTree, onClose, onSaved, onToast }) {
  const isEdit = !!initial
  const [form, setForm] = useState({
    name:             initial?.name             || '',
    locationId:       initial?.locationId       || '',
    imageUrl:         initial?.imageUrl         || '',
    descriptionShort: initial?.descriptionShort || '',
    descriptionFull:  initial?.descriptionFull  || '',
    address:          initial?.address          || '',
    difficultyLevel:  initial?.difficultyLevel  || '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.locationId) { setError('Selecciona una ciudad'); return }
    setLoading(true)
    setError('')
    try {
      const body = {
        name:             form.name,
        locationId:       form.locationId,
        imageUrl:         form.imageUrl         || null,
        descriptionShort: form.descriptionShort || null,
        descriptionFull:  form.descriptionFull  || null,
        address:          form.address          || null,
        difficultyLevel:  form.difficultyLevel  || null,
      }
      if (isEdit) {
        await updateAttraction(initial.id, body)
      } else {
        await createAttraction(body)
      }
      onSaved()
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-cominca-charcoal/40 backdrop-blur-sm animate-fadeIn">
      <div className="bg-cominca-cream border border-cominca-border shadow-xl w-full max-w-xl mx-4 max-h-[90vh] flex flex-col animate-fadeSlideUp">
        <div className="flex items-center justify-between px-8 py-6 border-b border-cominca-border flex-shrink-0">
          <h3 className="font-serif text-xl font-medium">{isEdit ? 'Editar atracción' : 'Nueva atracción'}</h3>
          <button onClick={onClose} className="text-cominca-sand hover:text-cominca-charcoal transition-colors"><IconClose /></button>
        </div>
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-8 py-7 space-y-5">
          {error && <div className="px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-xs font-sans">{error}</div>}
          <div>
            <label className="label-elegant block mb-1.5">Nombre</label>
            <input type="text" required value={form.name} onChange={set('name')} placeholder="Nombre de la atracción" className="input-elegant" />
          </div>
          <div>
            <label className="label-elegant block mb-2">Ubicación</label>
            <LocationCascade
              locationTree={locationTree}
              value={form.locationId}
              onChange={id => setForm(f => ({ ...f, locationId: id }))}
            />
          </div>
          <div>
            <label className="label-elegant block mb-1.5">URL de imagen</label>
            <input type="url" value={form.imageUrl} onChange={set('imageUrl')} placeholder="https://…" className="input-elegant" />
          </div>
          <div>
            <label className="label-elegant block mb-1.5">Descripción corta</label>
            <textarea rows={2} value={form.descriptionShort} onChange={set('descriptionShort')} className="input-elegant resize-none" />
          </div>
          <div>
            <label className="label-elegant block mb-1.5">Descripción completa</label>
            <textarea rows={3} value={form.descriptionFull} onChange={set('descriptionFull')} className="input-elegant resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-elegant block mb-1.5">Dirección</label>
              <input type="text" value={form.address} onChange={set('address')} className="input-elegant" />
            </div>
            <div>
              <label className="label-elegant block mb-1.5">Dificultad</label>
              <select value={form.difficultyLevel} onChange={set('difficultyLevel')} className="input-elegant cursor-pointer">
                <option value="">—</option>
                <option value="Easy">Fácil</option>
                <option value="Moderate">Moderado</option>
                <option value="Hard">Difícil</option>
                <option value="Expert">Experto</option>
              </select>
            </div>
          </div>
          <div className="pt-2 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="btn-ghost text-xs px-4 py-2">Cancelar</button>
            <button type="submit" disabled={loading} className="btn-primary text-xs px-5 py-2">
              {loading ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear atracción'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Sections: Attractions ─────────────────────────────────────────────────────

function AttractionsSection({ onToast, userRole }) {
  const [attractions, setAttractions] = useState([])
  const [locationTree, setLocationTree] = useState([])
  const [loading, setLoading]   = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing]   = useState(null)
  const [options, setOptions]   = useState(null) // attraction for ProductOptionsModal
  const [confirm, setConfirm]   = useState(null)
  const [toggling, setToggling] = useState({})

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([
      getAttractionManagement({ pageSize: 50 }),
      getLocations(),
    ])
      .then(([attRaw, locRaw]) => {
        setAttractions(toSafeArray(attRaw))
        setLocationTree(toSafeArray(locRaw))
      })
      .catch(err => onToast(err.message, 'error'))
      .finally(() => setLoading(false))
  }, [onToast])

  useEffect(() => { load() }, [load])

  async function handleTogglePublished(att) {
    const key = `pub_${att.id}`
    setToggling(t => ({ ...t, [key]: true }))
    try {
      await toggleAttractionStatus(att.id, !att.isPublished)
      setAttractions(as => as.map(a => a.id === att.id ? { ...a, isPublished: !a.isPublished } : a))
      onToast(`Atracción ${!att.isPublished ? 'publicada' : 'despublicada'}`, 'success')
    } catch (err) {
      onToast(err.message, 'error')
    } finally {
      setToggling(t => ({ ...t, [key]: false }))
    }
  }

  async function handleToggleActive(att) {
    const key = `act_${att.id}`
    setToggling(t => ({ ...t, [key]: true }))
    try {
      await toggleAttractionActive(att.id, !att.isActive)
      setAttractions(as => as.map(a => a.id === att.id ? { ...a, isActive: !a.isActive } : a))
      onToast(`Atracción ${!att.isActive ? 'activada' : 'desactivada'}`, 'success')
    } catch (err) {
      onToast(err.message, 'error')
    } finally {
      setToggling(t => ({ ...t, [key]: false }))
    }
  }

  async function handleDelete(id) {
    try {
      await deleteAttraction(id)
      setAttractions(as => as.filter(a => a.id !== id))
      onToast('Atracción eliminada', 'success')
    } catch (err) {
      onToast(err.message, 'error')
    } finally {
      setConfirm(null)
    }
  }

  const isAdmin = userRole === 'Admin'

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <img
            src={imagenUbicaciones}
            alt="Atracciones"
            className="h-14 w-14 object-cover rounded-sm border border-cominca-border shadow-sm flex-shrink-0"
          />
          <div>
            <p className="label-elegant mb-1">Catálogo</p>
            <h2 className="font-serif text-2xl font-light">Gestión de Atracciones</h2>
          </div>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2 text-xs px-4 py-2.5">
          <IconPlus /> Nueva atracción
        </button>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">{[1,2,3,4].map(i => <div key={i} className="h-12 bg-cominca-light animate-pulse" />)}</div>
        ) : attractions.length === 0 ? (
          <div className="p-12 text-center text-cominca-sand font-sans text-sm">No hay atracciones registradas</div>
        ) : (
          <table className="w-full text-sm font-sans">
            <thead>
              <tr className="border-b border-cominca-border bg-cominca-light">
                <th className="text-left px-4 py-3 label-elegant">Nombre</th>
                <th className="text-left px-4 py-3 label-elegant">Locación</th>
                <th className="text-center px-4 py-3 label-elegant">Activa</th>
                <th className="text-center px-4 py-3 label-elegant">Publicada</th>
                <th className="text-left px-4 py-3 label-elegant">Precio</th>
                <th className="text-center px-4 py-3 label-elegant">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {attractions.map((att, i) => (
                <tr key={att.id} className={`border-b border-cominca-border/50 hover:bg-cominca-cream transition-colors ${i % 2 === 0 ? '' : 'bg-cominca-cream/40'} ${!att.isActive ? 'opacity-60' : ''}`}>
                  <td className="px-4 py-3 font-medium text-cominca-charcoal max-w-[200px]">
                    <div className="truncate">{att.name}</div>
                    {att.difficultyLevel && <div className="text-xs text-cominca-sand">{att.difficultyLevel}</div>}
                  </td>
                  <td className="px-4 py-3 text-cominca-sand text-xs">{att.locationName}</td>
                  <td className="px-4 py-3 text-center">
                    <ToggleSwitch
                      checked={att.isActive}
                      onChange={() => handleToggleActive(att)}
                      loading={!!toggling[`act_${att.id}`]}
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <ToggleSwitch
                      checked={att.isPublished}
                      onChange={() => handleTogglePublished(att)}
                      loading={!!toggling[`pub_${att.id}`]}
                    />
                  </td>
                  <td className="px-4 py-3 text-cominca-sand text-xs">
                    {att.startingPrice > 0 ? `$${att.startingPrice}` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => setOptions(att)}
                        title="Gestionar opciones de producto"
                        className="flex items-center gap-1 text-cominca-forest hover:text-cominca-forest/70 transition-colors text-xs px-2 py-1 border border-cominca-forest/30 hover:border-cominca-forest"
                      >
                        <IconLayers />
                        <span className="hidden xl:inline">Modalidades</span>
                      </button>
                      <button
                        onClick={() => setEditing(att)}
                        className="text-cominca-sand hover:text-cominca-charcoal transition-colors p-1"
                        title="Editar"
                      >
                        <IconEdit />
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() => setConfirm({ id: att.id, name: att.name })}
                          className="text-red-400 hover:text-red-600 transition-colors p-1"
                          title="Eliminar"
                        >
                          <IconTrash />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showCreate && (
        <AttractionModal
          locationTree={locationTree}
          onClose={() => setShowCreate(false)}
          onSaved={() => { load(); onToast('Atracción creada', 'success') }}
          onToast={onToast}
        />
      )}
      {editing && (
        <AttractionModal
          initial={editing}
          locationTree={locationTree}
          onClose={() => setEditing(null)}
          onSaved={() => { load(); onToast('Atracción actualizada', 'success'); setEditing(null) }}
          onToast={onToast}
        />
      )}
      {options && (
        <ProductOptionsModal
          attraction={options}
          onClose={() => setOptions(null)}
          onToast={onToast}
        />
      )}
      {confirm && (
        <ConfirmDialog
          message={`¿Eliminar permanentemente la atracción "${confirm.name}"?`}
          onConfirm={() => handleDelete(confirm.id)}
          onCancel={() => setConfirm(null)}
        />
      )}
    </>
  )
}

// ── AdminInventory Section ────────────────────────────────────────────────────

function AdminInventorySection({ onToast }) {
  const [form, setForm] = useState({
    productOptionId: '', slotDate: '', startTime: '', endTime: '', capacityTotal: 10, notes: '',
  })
  const [submitting, setSubmitting] = useState(false)

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    try {
      await createInventorySlot({
        productOptionId: form.productOptionId,
        slotDate: form.slotDate,
        startTime: form.startTime + ':00',
        endTime:   form.endTime  ? form.endTime + ':00' : null,
        capacityTotal: Number(form.capacityTotal),
        notes: form.notes || null,
      })
      onToast('Slot de disponibilidad creado correctamente', 'success')
      setForm({ productOptionId: '', slotDate: '', startTime: '', endTime: '', capacityTotal: 10, notes: '' })
    } catch (err) {
      onToast(err.message || 'Error al crear el slot', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <div className="mb-8">
        <p className="label-elegant mb-1">Operaciones</p>
        <h1 className="font-serif text-3xl font-light text-cominca-charcoal">Gestión de Cupos</h1>
      </div>
      <div className="max-w-xl bg-white border border-cominca-border p-8">
        <p className="label-elegant mb-5">Nuevo slot de disponibilidad</p>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="label-elegant block mb-1.5">ID de ProductOption</label>
            <input required className="input-elegant w-full" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" value={form.productOptionId} onChange={set('productOptionId')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-elegant block mb-1.5">Fecha</label>
              <input required type="date" className="input-elegant w-full" value={form.slotDate} onChange={set('slotDate')} />
            </div>
            <div>
              <label className="label-elegant block mb-1.5">Capacidad total</label>
              <input required type="number" min="1" className="input-elegant w-full" value={form.capacityTotal} onChange={set('capacityTotal')} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-elegant block mb-1.5">Hora inicio</label>
              <input required type="time" className="input-elegant w-full" value={form.startTime} onChange={set('startTime')} />
            </div>
            <div>
              <label className="label-elegant block mb-1.5">Hora fin (opcional)</label>
              <input type="time" className="input-elegant w-full" value={form.endTime} onChange={set('endTime')} />
            </div>
          </div>
          <div>
            <label className="label-elegant block mb-1.5">Notas internas</label>
            <input className="input-elegant w-full" placeholder="Opcional" value={form.notes} onChange={set('notes')} />
          </div>
          <button type="submit" disabled={submitting} className="btn-primary disabled:opacity-40">
            {submitting ? 'Creando…' : 'Crear slot'}
          </button>
        </form>
      </div>
    </>
  )
}

// ── AdminBookings Section ─────────────────────────────────────────────────────

const BOOKING_STATUS = { 1: 'Pendiente', 2: 'Confirmada', 3: 'Completada', 4: 'Cancelada' }
const BOOKING_STATUS_COLOR = { 1: 'text-amber-600', 2: 'text-cominca-forest', 3: 'text-blue-600', 4: 'text-red-500' }

function AdminBookingsSection({ onToast }) {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading]   = useState(true)
  const [pnrSearch, setPnrSearch] = useState('')
  const [selectedDetail, setSelectedDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    getAdminBookings()
      .then(raw => {
        const d = raw?.data ?? raw
        const items = Array.isArray(d) ? d : (d?.items ?? d?.data ?? [])
        setBookings(items)
      })
      .catch(() => setBookings([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  async function handlePnrSearch(e) {
    e.preventDefault()
    if (!pnrSearch.trim()) return
    setDetailLoading(true)
    try {
      const raw = await getBookingByPnr(pnrSearch.trim().toUpperCase())
      const d   = raw?.data ?? raw
      setSelectedDetail(d)
    } catch (err) {
      onToast(err.message || 'Reserva no encontrada', 'error')
    } finally {
      setDetailLoading(false)
    }
  }

  async function handleViewDetail(id) {
    setDetailLoading(true)
    try {
      const raw = await getBookingDetail(id)
      setSelectedDetail(raw?.data ?? raw)
    } catch (err) {
      onToast(err.message || 'Error al cargar detalle', 'error')
    } finally {
      setDetailLoading(false)
    }
  }

  async function handleForceCancel() {
    if (!selectedDetail) return
    if (!window.confirm('¿Forzar cancelación de esta reserva?')) return
    setCancelling(true)
    try {
      const pnr = selectedDetail.pnrCode ?? selectedDetail.PnrCode
      await cancelAdminBooking({ pnrCode: pnr, cancelReason: 'Cancelación forzada por administrador' })
      onToast('Reserva cancelada', 'success')
      setSelectedDetail(null)
      load()
    } catch (err) {
      onToast(err.message || 'Error al cancelar', 'error')
    } finally {
      setCancelling(false)
    }
  }

  return (
    <>
      <div className="mb-8 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="label-elegant mb-1">Operaciones</p>
          <h1 className="font-serif text-3xl font-light text-cominca-charcoal">Reservas</h1>
        </div>
        {/* PNR Search */}
        <form onSubmit={handlePnrSearch} className="flex gap-2">
          <input
            className="input-elegant"
            placeholder="Buscar por PNR…"
            value={pnrSearch}
            onChange={e => setPnrSearch(e.target.value)}
          />
          <button type="submit" disabled={detailLoading} className="btn-primary text-xs px-4">
            {detailLoading ? '…' : 'Buscar'}
          </button>
        </form>
      </div>

      {/* Detail modal */}
      {selectedDetail && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-cominca-charcoal/50 backdrop-blur-sm" onClick={() => setSelectedDetail(null)} />
          <div className="relative bg-cominca-cream w-full max-w-xl shadow-2xl p-8 animate-fadeSlideUp max-h-[90vh] overflow-y-auto">
            <button onClick={() => setSelectedDetail(null)} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center border border-cominca-border hover:bg-cominca-light">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <p className="label-elegant mb-4">Detalle de reserva</p>
            <div className="space-y-3 text-sm font-sans">
              <div className="flex justify-between"><span className="text-cominca-sand">PNR</span><span className="font-mono font-bold text-cominca-charcoal">{selectedDetail.pnrCode ?? selectedDetail.PnrCode}</span></div>
              <div className="flex justify-between"><span className="text-cominca-sand">Estado</span><span>{selectedDetail.statusName ?? selectedDetail.status}</span></div>
              <div className="flex justify-between"><span className="text-cominca-sand">Total</span><span className="font-medium">${Number(selectedDetail.totalAmount ?? 0).toFixed(2)} {selectedDetail.currencyCode ?? selectedDetail.currency}</span></div>
              {selectedDetail.contactName && <div className="flex justify-between"><span className="text-cominca-sand">Contacto</span><span>{selectedDetail.contactName}</span></div>}
              {selectedDetail.details?.length > 0 && (
                <div className="border-t border-cominca-border pt-3 mt-2">
                  <p className="label-elegant mb-2">Pasajeros</p>
                  {selectedDetail.details.map((d, i) => (
                    <p key={i} className="text-cominca-charcoal">{d.firstName} {d.lastName} — {d.priceTierLabel ?? d.tierNameSnapshot} · ${Number(d.unitPrice).toFixed(2)}</p>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={handleForceCancel}
              disabled={cancelling}
              className="mt-6 w-full py-2 text-sm font-sans font-medium text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-40"
            >
              {cancelling ? 'Cancelando…' : '⚠ Forzar Cancelación'}
            </button>
          </div>
        </div>
      )}

      {/* Bookings table */}
      {loading ? (
        <div className="space-y-3">{[1,2,3,4,5].map(i => <div key={i} className="h-12 bg-cominca-light animate-pulse" />)}</div>
      ) : bookings.length === 0 ? (
        <p className="font-sans text-cominca-sand text-sm py-12 text-center">No hay reservas registradas.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm font-sans border-collapse">
            <thead>
              <tr className="border-b border-cominca-border">
                {['PNR','Atracción','Estado','Total','Fecha'].map(h => (
                  <th key={h} className="text-left px-3 py-3 label-elegant text-cominca-sand font-normal">{h}</th>
                ))}
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody>
              {bookings.map(b => (
                <tr key={b.id ?? b.bookingId} className="border-b border-cominca-border hover:bg-cominca-light/40 transition-colors">
                  <td className="px-3 py-3 font-mono text-xs font-bold text-cominca-charcoal">{b.pnrCode}</td>
                  <td className="px-3 py-3 text-cominca-charcoal max-w-[180px] truncate">{b.attractionName ?? '—'}</td>
                  <td className={`px-3 py-3 font-medium ${BOOKING_STATUS_COLOR[b.statusId] ?? 'text-cominca-sand'}`}>{BOOKING_STATUS[b.statusId] ?? b.statusName}</td>
                  <td className="px-3 py-3 text-cominca-charcoal">${Number(b.totalAmount ?? 0).toFixed(2)}</td>
                  <td className="px-3 py-3 text-cominca-sand text-xs">{b.createdAt ? new Date(b.createdAt).toLocaleDateString('es-EC') : '—'}</td>
                  <td className="px-3 py-3">
                    <button onClick={() => handleViewDetail(b.id ?? b.bookingId)} className="text-xs text-cominca-forest hover:text-cominca-charcoal transition-colors">
                      Ver detalle
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}

// ── AdminBilling Section ──────────────────────────────────────────────────────

function AdminBillingSection({ onToast }) {
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading]   = useState(true)
  const [voiding, setVoiding]   = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    getAdminInvoices()
      .then(raw => {
        const d = raw?.data ?? raw
        const items = Array.isArray(d) ? d : (d?.items ?? d?.data ?? [])
        setInvoices(items)
      })
      .catch(() => setInvoices([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  async function handleVoid(id, invoiceNumber) {
    if (!window.confirm(`¿Anular la factura ${invoiceNumber}? Esta acción no se puede deshacer.`)) return
    setVoiding(id)
    try {
      await voidInvoice(id)
      onToast('Factura anulada', 'success')
      load()
    } catch (err) {
      onToast(err.message || 'Error al anular', 'error')
    } finally {
      setVoiding(null)
    }
  }

  return (
    <>
      <div className="mb-8">
        <p className="label-elegant mb-1">Operaciones</p>
        <h1 className="font-serif text-3xl font-light text-cominca-charcoal">Facturación</h1>
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3,4,5].map(i => <div key={i} className="h-12 bg-cominca-light animate-pulse" />)}</div>
      ) : invoices.length === 0 ? (
        <p className="font-sans text-cominca-sand text-sm py-12 text-center">No hay facturas registradas.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm font-sans border-collapse">
            <thead>
              <tr className="border-b border-cominca-border">
                {['Nº Factura','Cliente','Total','Moneda','Fecha'].map(h => (
                  <th key={h} className="text-left px-3 py-3 label-elegant text-cominca-sand font-normal">{h}</th>
                ))}
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody>
              {invoices.map(inv => (
                <tr key={inv.id} className="border-b border-cominca-border hover:bg-cominca-light/40 transition-colors">
                  <td className="px-3 py-3 font-mono text-xs font-bold text-cominca-charcoal">{inv.invoiceNumber}</td>
                  <td className="px-3 py-3 text-cominca-charcoal max-w-[200px] truncate">{inv.customerName}</td>
                  <td className="px-3 py-3 text-cominca-charcoal font-medium">${Number(inv.total).toFixed(2)}</td>
                  <td className="px-3 py-3 text-cominca-sand">{inv.currencyCode ?? 'USD'}</td>
                  <td className="px-3 py-3 text-cominca-sand text-xs">{inv.createdAt ? new Date(inv.createdAt).toLocaleDateString('es-EC') : '—'}</td>
                  <td className="px-3 py-3">
                    <button
                      onClick={() => handleVoid(inv.id, inv.invoiceNumber)}
                      disabled={voiding === inv.id}
                      className="text-xs font-sans text-red-500 hover:text-red-700 transition-colors disabled:opacity-40"
                    >
                      {voiding === inv.id ? 'Anulando…' : 'Anular'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}

// ── Navigation groups ─────────────────────────────────────────────────────────

const NAV_GROUPS = [
  {
    label: 'Gestión',
    items: [
      { id: 'users',       label: 'Usuarios',     Icon: IconUsers    },
      { id: 'clients',     label: 'Clientes',     Icon: IconClients  },
    ],
  },
  {
    label: 'Catálogo',
    items: [
      { id: 'locations',   label: 'Locaciones',   Icon: IconMap      },
      { id: 'categories',  label: 'Cat. Tickets', Icon: IconTag      },
      { id: 'attractions', label: 'Atracciones',  Icon: IconStar     },
    ],
  },
  {
    label: 'Operaciones',
    items: [
      { id: 'bookings',    label: 'Reservas',     Icon: IconBookmark },
      { id: 'billing',     label: 'Facturación',  Icon: IconReceipt  },
    ],
  },
]

// ── Admin Panel ───────────────────────────────────────────────────────────────

export default function AdminPanel({ user, onLogout }) {
  const [section, setSection] = useState('users')
  const [toast, setToast]     = useState(null)

  const showToast   = useCallback((message, type = 'success') => setToast({ message, type }), [])
  const closeToast  = useCallback(() => setToast(null), [])

  return (
    <div className="min-h-screen flex bg-cominca-cream font-sans">

      {/* ── Sidebar ── */}
      <aside className="w-56 bg-cominca-charcoal flex flex-col fixed top-0 left-0 bottom-0 z-10">

        <div className="flex items-center gap-3 px-5 py-6 border-b border-white/10">
          <img src={logo} alt="Keo Arc" className="h-7 w-7 object-contain rounded-sm opacity-80" />
          <div className="flex-1 min-w-0">
            <p className="font-serif text-white text-base font-medium leading-tight">Keo Arc</p>
            <p className="text-white/40 text-xs font-sans">{user?.role === 'Admin' ? 'Admin' : 'Partner'}</p>
          </div>
          <img src={necoJobGif} alt="" className="h-9 w-9 object-contain flex-shrink-0 rounded-sm" />
        </div>

        <nav className="flex-1 pt-4 overflow-y-auto">
          {NAV_GROUPS.map(group => (
            <div key={group.label} className="mb-4">
              <p className="px-5 mb-1.5 label-elegant text-white/30">{group.label}</p>
              {group.items.map(({ id, label, Icon }) => (
                <button
                  key={id}
                  onClick={() => setSection(id)}
                  className={`w-full flex items-center gap-3 px-5 py-2.5 text-sm font-sans transition-all duration-150
                    ${section === id
                      ? 'bg-white/10 text-white font-medium'
                      : 'text-white/50 hover:bg-white/5 hover:text-white/80'
                    }`}
                >
                  <Icon />
                  {label}
                </button>
              ))}
            </div>
          ))}
        </nav>

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

      {/* ── Main ── */}
      <main className="flex-1 ml-56 p-10 min-h-screen">
        <ErrorBoundary>
          {section === 'users'       && <UsersSection            onToast={showToast} />}
          {section === 'clients'     && <ClientsSection          onToast={showToast} />}
          {section === 'locations'   && <LocationsSection        onToast={showToast} />}
          {section === 'categories'  && <TicketCategoriesSection onToast={showToast} />}
          {section === 'attractions' && <AttractionsSection      onToast={showToast} userRole={user?.role} />}
          {section === 'bookings'    && <AdminBookingsSection    onToast={showToast} />}
          {section === 'billing'     && <AdminBillingSection     onToast={showToast} />}
        </ErrorBoundary>
      </main>

      {toast && <Toast message={toast.message} type={toast.type} onClose={closeToast} />}
    </div>
  )
}
