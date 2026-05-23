import { useState, useEffect } from 'react'
import { getClientById, updateClient, getLocations } from '../services/api'
import Toast from './Toast'
import iconoCambioPerfil from '../assets/icono-cambioperfil.jpg'

// ── Edit-mode icon animation ──────────────────────────────────────────────────

const editIconCSS = `
  @keyframes profileRock {
    0%, 100% { transform: scale(1) rotate(0deg); }
    25%       { transform: scale(1.07) rotate(-6deg); }
    75%       { transform: scale(1.07) rotate(6deg); }
  }
  .edit-profile-icon:hover {
    animation: profileRock 0.5s ease-in-out infinite;
  }
`

// ── Location helpers ──────────────────────────────────────────────────────────

function buildFlatMap(nodes, map = {}) {
  for (const n of nodes) {
    map[n.id] = n
    if (n.children?.length) buildFlatMap(n.children, map)
  }
  return map
}

function getProvinces(countryNode) {
  if (!countryNode?.children?.length) return []
  if (countryNode.children[0]?.type === 'region') {
    return countryNode.children.flatMap(r => r.children || [])
  }
  return countryNode.children
}

// ── Icons ────────────────────────────────────────────────────────────────────

function IconUser() {
  return (
    <svg className="w-12 h-12 opacity-40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
      <circle cx="12" cy="8" r="4" />
      <path strokeLinecap="round" d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  )
}

function IconArrow() {
  return (
    <svg className="w-3.5 h-3.5 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" />
    </svg>
  )
}

function IconPencil() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l-4 1 1-4L17.5 4.5a2 2 0 012.828 2.828L9 13z" />
    </svg>
  )
}

// ── Sidebar tab item ─────────────────────────────────────────────────────────

function SideTab({ label, active, onClick, decorative }) {
  return (
    <button
      onClick={onClick}
      disabled={decorative}
      className={`w-full flex items-center justify-between px-5 py-3 text-sm font-sans transition-all duration-150
        ${active
          ? 'bg-cominca-forest/20 text-white font-medium'
          : decorative
            ? 'text-white/30 cursor-default'
            : 'text-white/60 hover:bg-white/5 hover:text-white/90'
        }`}
    >
      <span>{label}</span>
      {!decorative && <IconArrow />}
    </button>
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

// ── Section divider ───────────────────────────────────────────────────────────

function SectionLabel({ children }) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <span className="label-elegant text-cominca-sand/70">{children}</span>
      <div className="flex-1 h-px bg-cominca-border" />
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

const TABS = ['Personal details', 'Notifications', 'Saved Cards']

const DISABLED_FIELD = 'input-elegant disabled:bg-cominca-light disabled:text-cominca-sand disabled:cursor-not-allowed'
const DISABLED_SELECT = 'input-elegant cursor-pointer disabled:bg-cominca-light disabled:text-cominca-sand disabled:cursor-not-allowed'

export default function UserProfile({ user, onClose }) {
  const [activeTab, setActiveTab] = useState('Personal details')

  // Pre-fill from auth token as fallback for sessions without API client data.
  // Handles both new logins (firstName/lastName explicit) and old tokens (parse from name).
  const [form, setForm] = useState(() => {
    const firstName = user?.firstName || user?.name?.split(' ')[0] || ''
    const lastName  = user?.lastName  || user?.name?.split(' ').slice(1).join(' ') || ''
    return { firstName, lastName, phone: '', birthdate: '', locationId: '', documentType: 'Cedula', documentNumber: '' }
  })

  // Location cascade selectors (derived from stored locationId on load)
  const [locationTree, setLocationTree]       = useState([])
  const [selectedCountryId, setSelectedCountryId]   = useState('')
  const [selectedProvinceId, setSelectedProvinceId] = useState('')

  const [editing, setEditing]     = useState(false)
  const [loading, setLoading]     = useState(false)
  const [fetching, setFetching]   = useState(false)
  const [locLoading, setLocLoading] = useState(false)
  const [toast, setToast]         = useState(null)

  // Load location tree once
  useEffect(() => {
    setLocLoading(true)
    getLocations()
      .then(raw => {
        const tree = Array.isArray(raw?.data) ? raw.data : (Array.isArray(raw) ? raw : [])
        setLocationTree(tree)
      })
      .catch(() => {})
      .finally(() => setLocLoading(false))
  }, [])

  // Load client profile — merges API data over the auth-token defaults already in form
  useEffect(() => {
    if (!user?.id) return
    setFetching(true)
    getClientById(user.id)
      .then(data => {
        if (data) {
          const d = data.data ?? data
          console.log('[Profile] getClientById response:', d)
          setForm(prev => ({
            firstName:      d.firstName      || d.first_name     || prev.firstName,
            lastName:       d.lastName       || d.last_name      || prev.lastName,
            phone:          d.phone          || '',
            birthdate:      (d.birthDate || d.birthdate) ? (d.birthDate || d.birthdate).split('T')[0] : '',
            locationId:     d.locationId     || d.location_id    || '',
            documentType:   d.documentType   || d.document_type  || 'Cedula',
            documentNumber: d.documentNumber || d.document_number || '',
          }))
        }
      })
      .catch(err => console.error('[Profile] getClientById error:', err))
      .finally(() => setFetching(false))
  }, [user?.id])

  // Pre-populate cascade selects from stored locationId
  useEffect(() => {
    if (!form.locationId || !locationTree.length) return
    const flat = buildFlatMap(locationTree)
    const city = flat[form.locationId]
    if (!city) return
    const province = flat[city.parentId]
    if (!province) return
    const maybeRegion = flat[province.parentId]
    const country = maybeRegion?.type === 'region' ? flat[maybeRegion.parentId] : maybeRegion
    if (country) setSelectedCountryId(country.id)
    setSelectedProvinceId(province.id)
  }, [form.locationId, locationTree])

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const fieldDisabled = !editing

  // Location cascade derived values
  const selectedCountry  = locationTree.find(n => n.id === selectedCountryId)
  const provinces        = selectedCountry ? getProvinces(selectedCountry) : []
  const selectedProvince = provinces.find(n => n.id === selectedProvinceId)
  const cities           = selectedProvince?.children || []
  const locationLocked   = !editing

  function handleCountryChange(e) {
    setSelectedCountryId(e.target.value)
    setSelectedProvinceId('')
    setForm(f => ({ ...f, locationId: '' }))
  }

  function handleProvinceChange(e) {
    setSelectedProvinceId(e.target.value)
    setForm(f => ({ ...f, locationId: '' }))
  }

  function handleDocumentNumberChange(e) {
    const raw = e.target.value
    const val = form.documentType === 'Cedula'
      ? raw.replace(/\D/g, '').slice(0, 10)
      : raw.slice(0, 20)
    setForm(f => ({ ...f, documentNumber: val }))
  }

  async function handleSave(e) {
    e.preventDefault()
    if (form.documentType === 'Cedula' && form.documentNumber && form.documentNumber.length !== 10) {
      setToast({ message: 'La cédula debe tener exactamente 10 dígitos', type: 'error' })
      return
    }
    setLoading(true)
    try {
      // Route id and body id must match (backend validates they're equal)
      await updateClient(user.id, { id: user.id, ...form })
      setEditing(false)
      setToast({ message: 'Perfil actualizado correctamente', type: 'success' })
    } catch (err) {
      setToast({ message: err.message || 'Error al guardar', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[90] bg-cominca-cream flex animate-fadeIn">
      <style>{editIconCSS}</style>

      {/* ── Left sidebar ───────────────────────────────────────────────── */}
      <aside className="w-64 bg-cominca-charcoal flex flex-col shrink-0">

        <div className="flex flex-col items-center pt-12 pb-8 px-6 border-b border-white/10">
          <div className="w-20 h-20 rounded-full border border-white/20 bg-white/5 flex items-center justify-center mb-4">
            <IconUser />
          </div>
          <p className="font-serif text-white text-xl font-light text-center leading-tight">
            {form.firstName ? `${form.firstName} ${form.lastName}` : (user?.email || 'Mi cuenta')}
          </p>
          <p className="text-xs font-sans text-white/40 mt-1 truncate max-w-full px-2">
            {user?.email}
          </p>
        </div>

        <nav className="flex-1 pt-4">
          {TABS.map(tab => (
            <SideTab
              key={tab}
              label={tab}
              active={activeTab === tab}
              onClick={() => setActiveTab(tab)}
              decorative={tab !== 'Personal details'}
            />
          ))}
        </nav>

        <div className="p-5 border-t border-white/10">
          <button
            onClick={onClose}
            className="w-full text-sm font-sans text-white/40 hover:text-white/70 transition-colors text-left"
          >
            ← Volver al inicio
          </button>
        </div>
      </aside>

      {/* ── Main content ───────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto px-12 py-12">
        <div className="max-w-xl">

          {/* Page header */}
          <div className="mb-8">
            {editing && (
              <div className="flex items-center gap-4 mb-6 px-5 py-4 border border-cominca-border bg-white">
                <img
                  src={iconoCambioPerfil}
                  alt=""
                  className="edit-profile-icon w-14 h-14 object-contain shrink-0 cursor-default"
                />
                <div>
                  <p className="font-sans text-sm font-medium text-cominca-charcoal">Modo edición activo</p>
                  <p className="text-xs font-sans text-cominca-sand mt-0.5">
                    Todos los campos están disponibles para modificar.
                  </p>
                </div>
              </div>
            )}
            <p className="label-elegant mb-1">Mi cuenta</p>
            <h1 className="font-serif text-3xl font-light text-cominca-charcoal">{activeTab}</h1>
          </div>

          {/* ── Personal details ─────────────────────────────────── */}
          {activeTab === 'Personal details' && (
            fetching ? (
              <div className="space-y-4">
                {[1,2,3,4,5,6,7].map(i => (
                  <div key={i} className="h-8 bg-cominca-border/50 animate-pulse rounded" />
                ))}
              </div>
            ) : (
              <form onSubmit={handleSave} className="space-y-6">

                {/* ── Datos de cuenta ── */}
                <SectionLabel>Datos de cuenta</SectionLabel>

                <Field label="Correo electrónico">
                  <input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className={DISABLED_FIELD}
                  />
                </Field>

                <div className="grid grid-cols-2 gap-6">
                  <Field label="Nombre">
                    <input
                      type="text"
                      value={form.firstName}
                      onChange={set('firstName')}
                      disabled={fieldDisabled}
                      placeholder="María"
                      className={DISABLED_FIELD}
                    />
                  </Field>
                  <Field label="Apellido">
                    <input
                      type="text"
                      value={form.lastName}
                      onChange={set('lastName')}
                      disabled={fieldDisabled}
                      placeholder="García"
                      className={DISABLED_FIELD}
                    />
                  </Field>
                </div>

                <Field label="Teléfono">
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={set('phone')}
                    disabled={fieldDisabled}
                    placeholder="+593 99 999 9999"
                    className={DISABLED_FIELD}
                  />
                </Field>

                <Field label="Fecha de nacimiento">
                  <input
                    type="date"
                    value={form.birthdate}
                    onChange={set('birthdate')}
                    disabled={fieldDisabled}
                    className={DISABLED_FIELD}
                  />
                </Field>

                {/* ── Documento de identidad ── */}
                <SectionLabel>Documento de identidad</SectionLabel>

                <div className="grid grid-cols-2 gap-6">
                  <Field label="Tipo de documento">
                    <select
                      value={form.documentType}
                      onChange={set('documentType')}
                      disabled={fieldDisabled}
                      className={DISABLED_SELECT}
                    >
                      <option value="Cedula">Cédula</option>
                      <option value="Pasaporte">Pasaporte</option>
                    </select>
                  </Field>

                  <Field label={form.documentType === 'Cedula' ? 'Número de cédula' : 'Número de pasaporte'}>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={form.documentNumber}
                      onChange={handleDocumentNumberChange}
                      disabled={fieldDisabled}
                      placeholder={form.documentType === 'Cedula' ? '0000000000' : ''}
                      className={DISABLED_FIELD}
                    />
                    {!fieldDisabled && form.documentType === 'Cedula' && (
                      <p className={`text-xs mt-1 ${form.documentNumber.length === 10 ? 'text-cominca-forest' : 'text-cominca-sand'}`}>
                        {form.documentNumber.length}/10 dígitos
                      </p>
                    )}
                  </Field>
                </div>

                {/* ── Ubicación ── */}
                <SectionLabel>Ubicación</SectionLabel>

                {locLoading ? (
                  <div className="h-8 bg-cominca-border/50 animate-pulse rounded" />
                ) : (
                  <div className="space-y-5">

                    <Field label="País">
                      <select
                        value={selectedCountryId}
                        onChange={handleCountryChange}
                        disabled={locationLocked}
                        className={DISABLED_SELECT}
                      >
                        <option value="">— Selecciona un país —</option>
                        {locationTree.filter(n => n.name).map(n => (
                          <option key={n.id} value={n.id}>{n.name}</option>
                        ))}
                      </select>
                    </Field>

                    <Field label="Provincia">
                      <select
                        value={selectedProvinceId}
                        onChange={handleProvinceChange}
                        disabled={locationLocked || !selectedCountryId}
                        className={DISABLED_SELECT}
                      >
                        <option value="">— Selecciona una provincia —</option>
                        {provinces.filter(n => n.name).map(n => (
                          <option key={n.id} value={n.id}>{n.name}</option>
                        ))}
                      </select>
                    </Field>

                    <Field label="Ciudad">
                      <select
                        value={form.locationId}
                        onChange={e => setForm(f => ({ ...f, locationId: e.target.value }))}
                        disabled={locationLocked || !selectedProvinceId}
                        className={DISABLED_SELECT}
                      >
                        <option value="">— Selecciona una ciudad —</option>
                        {cities.filter(n => n.name).map(n => (
                          <option key={n.id} value={n.id}>{n.name}</option>
                        ))}
                      </select>
                    </Field>

                  </div>
                )}

                {/* ── Action buttons ── */}
                <div className="pt-4 flex items-center gap-3 flex-wrap">
                  <button type="submit" disabled={loading} className="btn-primary">
                    {loading ? 'Guardando…' : 'Guardar cambios'}
                  </button>

                  {!editing ? (
                    <button
                      type="button"
                      onClick={() => setEditing(true)}
                      className="btn-ghost flex items-center gap-1.5 text-xs px-4 py-2"
                    >
                      <IconPencil />
                      Editar datos personales
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setEditing(false)}
                      className="btn-ghost text-xs px-4 py-2"
                    >
                      Cancelar edición
                    </button>
                  )}
                </div>

              </form>
            )
          )}

          {activeTab !== 'Personal details' && (
            <div className="flex items-center justify-center py-24 text-cominca-sand">
              <p className="font-serif text-2xl font-light italic">Próximamente</p>
            </div>
          )}
        </div>
      </main>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  )
}
