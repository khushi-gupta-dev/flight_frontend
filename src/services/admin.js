const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
const FLIGHT_API = `${API_BASE_URL}/flightsService/api/v1`
const BOOKING_API = `${API_BASE_URL}/bookingService/api/v1/bookings`
const RECOVERY_OPERATIONS_API = `${API_BASE_URL}/bookingService/api/v1/recovery-operations`

async function adminRequest(path, token, options = {}, baseUrl = FLIGHT_API) {
  let response
  try {
    response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        'x-access-token': token,
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
    })
  } catch {
    throw new Error('Could not reach the API gateway. Check that the backend services are running.')
  }

  const payload = await response.json().catch(() => null)
  if (!response.ok || payload?.success === false) {
    const detail = payload?.error?.explanation || payload?.error?.message || payload?.message
    const message = Array.isArray(detail) ? detail.filter(Boolean).join(' ') : typeof detail === 'string' ? detail : ''
    const fallback = response.status === 401 || response.status === 403
      ? 'Administrator authorization failed. Sign in again with an admin account.'
      : response.status === 429
        ? 'The API gateway rate limit is temporarily exhausted. Wait a moment, then retry.'
      : response.status >= 500
        ? 'The service could not complete this request. Check that the service is running and try again.'
        : `Request failed (${response.status}). Check the submitted details and try again.`
    throw new Error(message || fallback)
  }
  if (!payload || typeof payload !== 'object' || !Object.prototype.hasOwnProperty.call(payload, 'data')) {
    throw new Error('The service returned an unexpected response. Please try again.')
  }
  return payload.data
}

export const getAdminBookings = (token) => adminRequest('/admin', token, {}, BOOKING_API)

export async function getAdminResources(token) {
  const resources = [
    ['flights', '/flights'],
    ['airports', '/airports'],
    ['airplanes', '/airplanes'],
    ['cities', '/cities'],
  ]
  const results = await Promise.allSettled(resources.map(([, path]) => adminRequest(path, token)))
  const data = { flights: [], airports: [], airplanes: [], cities: [] }
  const errors = []
  results.forEach((result, index) => {
    const [name] = resources[index]
    if (result.status === 'fulfilled') data[name] = Array.isArray(result.value) ? result.value : []
    else errors.push(`${name}: ${result.reason.message}`)
  })
  return { ...data, errors }
}

export const createFlight = (token, flight) => adminRequest('/flights', token, {
  method: 'POST',
  body: JSON.stringify(flight),
})

export const createAirport = (token, airport) => adminRequest('/airports', token, {
  method: 'POST',
  body: JSON.stringify(airport),
})

export const createCity = (token, city) => adminRequest('/cities', token, {
  method: 'POST',
  body: JSON.stringify(city),
})

export const createAirplane = (token, airplane) => adminRequest('/airplanes', token, {
  method: 'POST',
  body: JSON.stringify(airplane),
})

export const getDisruptions = (token) => adminRequest('/disruptions', token)

export const createDisruption = (token, disruption) => adminRequest('/disruptions', token, {
  method: 'POST',
  body: JSON.stringify(disruption),
})

export const retryDisruption = (token, id) => adminRequest(`/disruptions/${id}/retry`, token, {
  method: 'POST',
})

export const cancelDisruption = (token, id) => adminRequest(`/disruptions/${id}/cancel`, token, {
  method: 'POST',
})

export const getRecoveryOperations = (token, query = '') => adminRequest(query ? `?${query}` : '', token, {}, RECOVERY_OPERATIONS_API)
export const getRecoverySummary = (token, query = '') => adminRequest(`/summary${query ? `?${query}` : ''}`, token, {}, RECOVERY_OPERATIONS_API)
export const retryRecoveryOperation = (token, id) => adminRequest(`/${id}/retry`, token, { method: 'POST' }, RECOVERY_OPERATIONS_API)
export const assignRecoveryAlternative = (token, id, data) => adminRequest(`/${id}/assign-alternative`, token, { method: 'POST', body: JSON.stringify(data) }, RECOVERY_OPERATIONS_API)
export const overrideRecoveryOperation = (token, id, data) => adminRequest(`/${id}/override`, token, { method: 'POST', body: JSON.stringify(data) }, RECOVERY_OPERATIONS_API)
