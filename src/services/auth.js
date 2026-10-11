const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
const AUTH_BASE = `${API_BASE_URL}/api/v1/user`

async function authRequest(endpoint, credentials) {
  let response
  try {
    response = await fetch(`${AUTH_BASE}/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    })
  } catch {
    throw new Error('Could not reach the server. Check that the API gateway is running.')
  }

  const parsedPayload = await response.json().catch(() => ({}))
  const payload = parsedPayload && typeof parsedPayload === 'object' ? parsedPayload : {}
  if (!response.ok || payload.success === false) {
    const apiError = payload.error
    const detail = apiError?.explanation ?? apiError?.message ?? payload.message
    const message = Array.isArray(detail)
      ? detail.filter(Boolean).join(' ')
      : typeof detail === 'string' ? detail : ''
    const fallback = response.status === 429
      ? 'Too many attempts. Please wait a moment and try again.'
      : response.status >= 500
        ? 'The server could not complete your request. Please try again shortly.'
        : 'Something went wrong. Please check your details and try again.'
    throw new Error(message || fallback)
  }

  if (!payload || !Object.prototype.hasOwnProperty.call(payload, 'data')) {
    throw new Error('The server returned an unexpected response. Please try again.')
  }
  return payload.data
}

export const signIn = (credentials) => authRequest('signin', credentials)
export const signUp = (credentials) => authRequest('signup', credentials)

export async function getCurrentUser(token) {
  let response
  try {
    response = await fetch(`${API_BASE_URL}/api/v1/user/me`, {
      headers: { 'x-access-token': token },
    })
  } catch {
    throw new Error('Could not reach the server. Check that the API gateway is running.')
  }

  const payload = await response.json().catch(() => ({}))
  if (!response.ok || payload.success === false || !payload.data) {
    const error = new Error(payload.error?.message || payload.message || 'Could not verify your account role.')
    error.status = response.status
    error.retryAfter = response.headers.get('Retry-After')
    throw error
  }
  return payload.data
}
