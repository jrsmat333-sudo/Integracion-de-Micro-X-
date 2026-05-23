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
