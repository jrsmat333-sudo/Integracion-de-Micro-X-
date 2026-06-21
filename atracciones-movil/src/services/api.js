import * as SecureStore from 'expo-secure-store';

const GATEWAY = 'https://gateway-service.ashysea-53177507.centralus.azurecontainerapps.io';

// ── Token helpers ────────────────────────────────────────────────────────────

export async function getToken() {
  return await SecureStore.getItemAsync('keo_token');
}

export async function setToken(token) {
  await SecureStore.setItemAsync('keo_token', token);
}

export async function removeToken() {
  await SecureStore.deleteItemAsync('keo_token');
  await SecureStore.deleteItemAsync('keo_user');
}

export async function getCurrentUser() {
  try {
    const raw = await SecureStore.getItemAsync('keo_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function extractAndStoreAuth(raw) {
  const payload = raw?.data ?? raw;
  const token = payload?.accessToken || payload?.token;
  if (!token) throw new Error('Token no recibido. Verifica tus credenciales.');

  await setToken(token);

  const u = payload?.user ?? {};
  const roles = Array.isArray(u.roles) ? u.roles : (u.role ? [u.role] : []);
  const user = {
    id: u.userId?.toString() || '',
    email: u.email || '',
    firstName: u.firstName || '',
    lastName: u.lastName || '',
    name: [u.firstName, u.lastName].filter(Boolean).join(' '),
    role: roles[0] || '',
    roles,
  };

  await SecureStore.setItemAsync('keo_user', JSON.stringify(user));
  return user;
}

// ── Core fetch wrapper ───────────────────────────────────────────────────────

async function request(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  const token = await getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${GATEWAY}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return null;

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const message =
      data?.message ||
      data?.title ||
      (Array.isArray(data?.errors) ? data.errors.join(', ') : null) ||
      `Error ${res.status}`;
    throw new Error(message);
  }

  return data;
}

// ── Auth  →  /api/v1/auth ────────────────────────────────────────────────────

export const loginCliente = async (email, password) =>
  extractAndStoreAuth(await request('POST', '/api/v1/auth/login', { email, password }));

export const loginAdmin = async (email, password) =>
  extractAndStoreAuth(await request('POST', '/api/v1/auth/login-admin', { email, password }));

export async function smartLogin(email, password) {
  try {
    return await loginAdmin(email, password);
  } catch {
    return await loginCliente(email, password);
  }
}

export const registerCliente = async (data) =>
  extractAndStoreAuth(await request('POST', '/api/v1/auth/register', data));

// ── Clients ───────────────────────────────

export const getClientById = (id) =>
  request('GET', `/api/v1/client/${id}`);

export const updateClient = (id, data) =>
  request('PUT', `/api/v1/client/${id}`, data);

// ── Locations ────────────────────────────────

export const getLocations = () =>
  request('GET', '/api/v1/location');

// ── Attractions ──────────────────────────────────────

export const getTopAttractions = (count = 5) =>
  request('GET', `/api/v1/attraction/top?count=${count}`);

export const getAttractions = (params = {}) => {
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== '')
  ).toString();
  return request('GET', `/api/v1/attraction${qs ? `?${qs}` : ''}`);
};

export const getAttractionBySlug = (slug) =>
  request('GET', `/api/v1/attraction/${slug}`);

// ── Product Options ───────────────────────────────

export const getProductOptionsByAttraction = (attractionId) =>
  request('GET', `/api/v1/productoption/by-attraction/${attractionId}`);

// ── Booking (público) ───────────────────────────────────

export const getDisponibilidad = (attractionId, productOptionId = null, fecha = null) => {
  const params = { attractionId };
  if (productOptionId) params.productOptionId = productOptionId;
  if (fecha) params.fecha = fecha;
  const qs = new URLSearchParams(params).toString();
  return request('GET', `/api/v1/booking/disponibilidad?${qs}`);
};

export const createBooking = (data) =>
  request('POST', '/api/v1/booking', data);

export const createBookingV2 = async (data, idempotencyKey) => {
  const headers = { 'Content-Type': 'application/json' };
  const token = await getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  headers['X-Idempotency-Key'] = idempotencyKey;

  const res = await fetch(`${GATEWAY}/api/v2/booking`, { 
    method: 'POST', 
    headers, 
    body: JSON.stringify(data) 
  });
  
  const result = await res.json().catch(() => null);
  if (!res.ok) throw new Error(result?.message || `Error ${res.status}`);
  return result;
};

export const cancelBooking = (id) =>
  request('POST', `/api/v1/booking/${id}/cancel`);

export const getMisReservas = () =>
  request('GET', '/api/v1/booking/mis-reservas');

// ── Payment ─────────────────────────────────────────────

export const createPayment = (data) =>
  request('POST', '/api/v1/payment', data);

export const updatePaymentStatus = (id, data) =>
  request('PUT', `/api/v1/payment/${id}/status`, data);

// ── Billing ─────────────────────────────────────────────

export const getMyInvoices = () =>
  request('GET', '/api/v1/billing/my-invoices');
