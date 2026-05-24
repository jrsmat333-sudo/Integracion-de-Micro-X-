const GATEWAY = 'https://gateway-service.ashysea-53177507.centralus.azurecontainerapps.io'

// ── Token helpers ────────────────────────────────────────────────────────────

export function getToken() {
  return localStorage.getItem('keo_token')
}

export function setToken(token) {
  localStorage.setItem('keo_token', token)
}

export function removeToken() {
  localStorage.removeItem('keo_token')
  localStorage.removeItem('keo_user')
}

// Restaura la sesión desde localStorage al recargar la página.
// El usuario se guardó serializado en 'keo_user' al hacer login.
export function getCurrentUser() {
  try {
    const raw = localStorage.getItem('keo_user')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

// Extrae el token y los datos del usuario desde la respuesta del backend.
// El ApiResponseWrapperFilter envuelve TODA respuesta en { success, data: <payload> },
// por lo que el LoginResponse real está en data.data.
// LoginResponse: { accessToken, tokenType, expiresInSeconds, user: { userId, email, firstName, lastName, roles[] } }
function extractAndStoreAuth(raw) {
  const payload = raw?.data ?? raw           // unwrap ApiResponse wrapper
  const token   = payload?.accessToken || payload?.token
  if (!token) throw new Error('Token no recibido. Verifica tus credenciales.')

  setToken(token)

  const u = payload?.user ?? {}
  const roles = Array.isArray(u.roles) ? u.roles : (u.role ? [u.role] : [])
  const user = {
    id:        u.userId?.toString() || '',
    email:     u.email     || '',
    firstName: u.firstName || '',
    lastName:  u.lastName  || '',
    name:      [u.firstName, u.lastName].filter(Boolean).join(' '),
    role:      roles[0] || '',
    roles,
  }

  localStorage.setItem('keo_user', JSON.stringify(user))
  return user
}

// ── Core fetch wrapper ───────────────────────────────────────────────────────

async function request(method, path, body) {
  const headers = { 'Content-Type': 'application/json' }
  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${GATEWAY}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (res.status === 204) return null

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    const message =
      data?.message ||
      data?.title ||
      (Array.isArray(data?.errors) ? data.errors.join(', ') : null) ||
      `Error ${res.status}`
    throw new Error(message)
  }

  return data
}

// ── Auth  →  /api/v1/auth ────────────────────────────────────────────────────

export const loginCliente = async (email, password) =>
  extractAndStoreAuth(await request('POST', '/api/v1/auth/login', { email, password }))

export const loginAdmin = async (email, password) =>
  extractAndStoreAuth(await request('POST', '/api/v1/auth/login-admin', { email, password }))

export async function smartLogin(email, password) {
  try {
    return await loginAdmin(email, password)
  } catch {
    return await loginCliente(email, password)
  }
}

export const registerCliente = async (data) =>
  extractAndStoreAuth(await request('POST', '/api/v1/auth/register', data))

export const updateProfile = (data) =>
  request('PUT', '/api/v1/auth/profile', data)

export const changePassword = (data) =>
  request('PUT', '/api/v1/auth/change-password', data)

// ── Users (Admin)  →  /api/v1/user ──────────────────────────────────────────

export const getUsers = () =>
  request('GET', '/api/v1/user')

export const createUser = (data) =>
  request('POST', '/api/v1/user', data)

export const updateUserStatus = (id, isActive) =>
  request('PATCH', `/api/v1/user/${id}/status`, isActive)

export const deleteUser = (id) =>
  request('DELETE', `/api/v1/user/${id}`)

// ── Clients (Admin/Client)  →  /api/v1/client ───────────────────────────────

export const getClients = () =>
  request('GET', '/api/v1/client')

export const getClientById = (id) =>
  request('GET', `/api/v1/client/${id}`)

export const updateClient = (id, data) =>
  request('PUT', `/api/v1/client/${id}`, data)

export const deleteClient = (id) =>
  request('DELETE', `/api/v1/client/${id}`)

export const validateClient = (docNumber) =>
  request('GET', `/api/v1/client/validate/${docNumber}`)

// ── Locations (Catalog)  →  /api/v1/location ────────────────────────────────

export const getLocations = () =>
  request('GET', '/api/v1/location')

export const createLocation = (data) =>
  request('POST', '/api/v1/location', data)

export const updateLocation = (id, data) =>
  request('PUT', `/api/v1/location/${id}`, data)

export const deleteLocation = (id) =>
  request('DELETE', `/api/v1/location/${id}`)

// ── Attractions  →  /api/v1/attraction ──────────────────────────────────────

export const getTopAttractions = (count = 5) =>
  request('GET', `/api/v1/attraction/top?count=${count}`)

export const getAttractions = (params = {}) => {
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== '')
  ).toString()
  return request('GET', `/api/v1/attraction${qs ? `?${qs}` : ''}`)
}

export const getAttractionManagement = (params = {}) => {
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== '')
  ).toString()
  return request('GET', `/api/v1/attraction/management${qs ? `?${qs}` : ''}`)
}

export const getAttractionBySlug = (slug) =>
  request('GET', `/api/v1/attraction/${slug}`)

export const getAttractionComplete = (id) =>
  request('GET', `/api/v1/attraction/${id}/complete`)

export const createAttraction = (data) =>
  request('POST', '/api/v1/attraction', data)

export const createCompleteAttraction = (data) =>
  request('POST', '/api/v1/attraction/complete', data)

export const updateAttraction = (id, data) =>
  request('PUT', `/api/v1/attraction/${id}`, data)

export const deleteAttraction = (id) =>
  request('DELETE', `/api/v1/attraction/${id}`)

export const toggleAttractionStatus = (id, isPublished) =>
  request('PATCH', `/api/v1/attraction/${id}/status`, { isPublished })

export const toggleAttractionActive = (id, isActive) =>
  request('PATCH', `/api/v1/attraction/${id}/active`, { isActive })

// ── Product Options  →  /api/v1/productoption ───────────────────────────────

export const getProductOptionsByAttraction = (attractionId) =>
  request('GET', `/api/v1/productoption/by-attraction/${attractionId}`)

export const getProductOptionById = (id) =>
  request('GET', `/api/v1/productoption/${id}`)

export const createProductOption = (data) =>
  request('POST', '/api/v1/productoption', data)

export const updateProductOption = (id, data) =>
  request('PUT', `/api/v1/productoption/${id}`, data)

export const toggleProductOption = (id, isActive) =>
  request('PATCH', `/api/v1/productoption/${id}/toggle`, isActive)

export const deleteProductOption = (id) =>
  request('DELETE', `/api/v1/productoption/${id}`)

// ── Ticket Categories  →  /api/v1/ticketcategory ────────────────────────────

export const getTicketCategories = () =>
  request('GET', '/api/v1/ticketcategory')

export const createTicketCategory = (data) =>
  request('POST', '/api/v1/ticketcategory', data)

export const updateTicketCategory = (id, data) =>
  request('PUT', `/api/v1/ticketcategory/${id}`, data)

export const deleteTicketCategory = (id) =>
  request('DELETE', `/api/v1/ticketcategory/${id}`)

// ── Booking (público)  →  /api/v1/booking ───────────────────────────────────

export const getDisponibilidad = (attractionId, productOptionId = null, fecha = null) => {
  const params = { attractionId }
  if (productOptionId) params.productOptionId = productOptionId
  if (fecha) params.fecha = fecha
  const qs = new URLSearchParams(params).toString()
  return request('GET', `/api/v1/booking/disponibilidad?${qs}`)
}

export const createBooking = (data) =>
  request('POST', '/api/v1/booking', data)

export const cancelBooking = (id) =>
  request('POST', `/api/v1/booking/${id}/cancel`)

export const getMisReservas = () =>
  request('GET', '/api/v1/booking/mis-reservas')

// ── Booking (Admin)  →  /api/v1/admin-booking ───────────────────────────────

export const getAdminBookings = (params = {}) => {
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== '')
  ).toString()
  return request('GET', `/api/v1/admin-booking/management${qs ? `?${qs}` : ''}`)
}

export const getBookingByPnr = (pnr) =>
  request('GET', `/api/v1/admin-booking/${pnr}`)

export const getBookingDetail = (id) =>
  request('GET', `/api/v1/admin-booking/detail/${id}`)

export const cancelAdminBooking = (data) =>
  request('POST', '/api/v1/admin-booking/cancel', data)

// ── Payment  →  /api/v1/payment ─────────────────────────────────────────────

export const createPayment = (data) =>
  request('POST', '/api/v1/payment', data)

export const updatePaymentStatus = (id, data) =>
  request('PUT', `/api/v1/payment/${id}/status`, data)

// ── Billing  →  /api/v1/billing ─────────────────────────────────────────────

export const getMyInvoices = () =>
  request('GET', '/api/v1/billing/my-invoices')

export const getAdminInvoices = (params = {}) => {
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== '')
  ).toString()
  return request('GET', `/api/v1/billing/management${qs ? `?${qs}` : ''}`)
}

export const getInvoiceDetail = (id) =>
  request('GET', `/api/v1/billing/management/${id}`)

export const voidInvoice = (id) =>
  request('POST', `/api/v1/billing/management/${id}/void`)

// ── Inventory (Admin)  →  /api/v1/inventory ─────────────────────────────────

export const createInventorySlot = (data) =>
  request('POST', '/api/v1/inventory/slot', data)
