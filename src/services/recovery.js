const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
const RECOVERY_API = `${API_BASE_URL}/bookingService/api/v1/recovery-cases`

async function request(path, token, options = {}) {
  const response = await fetch(`${RECOVERY_API}${path}`, {
    ...options,
    headers: {
      'x-access-token': token,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
    },
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok || payload.success === false) {
    const error = new Error(payload.error?.message || payload.message || 'Could not load recovery details.')
    error.status = response.status
    throw error
  }
  return payload.data
}

export const getRecoveryCases = (token) => request('', token)
export const approveRecovery = (token, id, alternativeId) => request(`/${id}/approve`, token, {
  method: 'POST',
  headers: { 'x-idempotency-key': `recovery-approve-${id}-${crypto.randomUUID()}` },
  body: JSON.stringify({ alternativeId }),
})
export const declineRecovery = (token, id) => request(`/${id}/decline`, token, {
  method: 'POST',
  headers: { 'x-idempotency-key': `recovery-decline-${id}-${crypto.randomUUID()}` },
})
