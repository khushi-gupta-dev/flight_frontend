import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, ArrowLeft, ArrowRight, Check, Clock3, Plane, RefreshCw, ShieldCheck, X } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { approveRecovery, declineRecovery, getRecoveryCases, retryRecovery } from '../services/recovery'
import './RecoveryPage.css'

function formatDate(value) {
  if (!value || !Number.isFinite(Date.parse(value))) return 'Schedule unavailable'
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function formatMoney(value) {
  if (!Number.isFinite(Number(value))) return 'Not available'
  return `₹${Number(value).toLocaleString()}`
}

function formatDifference(original, replacement) {
  const difference = Number(replacement) - Number(original)
  if (!Number.isFinite(difference)) return 'Price difference unavailable'
  if (difference === 0) return 'No price difference'
  return `${difference > 0 ? '+' : '-'}${formatMoney(Math.abs(difference))}`
}

function formatRoute(flight) {
  if (!flight) return 'Route unavailable'
  return `${flight.departureAirportId} → ${flight.arrivalAirportId}`
}

function formatDelay(original, replacement) {
  if (!original || !replacement) return 'Timing difference unavailable'
  const minutes = Math.round((new Date(replacement.arrivalTime) - new Date(original.arrivalTime)) / 60000)
  if (!Number.isFinite(minutes)) return 'Timing difference unavailable'
  if (minutes === 0) return 'Same arrival time'
  return `${minutes > 0 ? '+' : ''}${minutes} min arrival difference`
}

export default function RecoveryPage() {
  const navigate = useNavigate()
  const token = sessionStorage.getItem('authToken') || localStorage.getItem('authToken') || ''
  const [cases, setCases] = useState([])
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(null)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!token) {
      navigate('/login', { replace: true, state: { from: '/recovery' } })
      return
    }
    setLoading(true)
    setError('')
    try { setCases(await getRecoveryCases(token)) } catch (requestError) {
      if ([401, 403].includes(requestError.status)) {
        navigate('/login', { replace: true, state: { from: '/recovery' } })
        return
      }
      setError(requestError.message)
    } finally { setLoading(false) }
  }, [navigate, token])

  useEffect(() => { load() }, [load])

  const act = async (recoveryCase, operation, alternativeId) => {
    setWorking(recoveryCase.id)
    setError('')
    try {
      const updated = await operation(token, recoveryCase.id, alternativeId)
      setCases((current) => current.map((entry) => entry.id === updated.id ? updated : entry))
    } catch (requestError) {
      setError(requestError.message)
      await load()
    } finally { setWorking(null) }
  }

  return <main className="recovery-page">
    <header className="recovery-header"><Link to="/" className="recovery-brand"><span><Plane size={17} /></span>Sky<span>Link</span></Link><Link to="/my-bookings" className="recovery-back">My bookings <ArrowRight size={15} /></Link></header>
    <section className="recovery-content">
      <Link to="/" className="recovery-home-link"><ArrowLeft size={15} /> Home</Link>
      <div className="recovery-heading"><div><p className="recovery-kicker">FLIGHT CARE CENTER</p><h1>Your recovery options</h1><p>When plans change, SkyLink finds a safer route forward.</p></div><button className="recovery-refresh" onClick={load} disabled={loading}><RefreshCw size={15} className={loading ? 'is-spinning' : ''} /> Refresh</button></div>
      <div className="recovery-trust"><ShieldCheck size={17} /><span><strong>Passenger-first recovery</strong> Your original booking stays protected until you approve an option.</span></div>
      {error && <p className="recovery-error" role="alert">{error}</p>}
      {loading ? <div className="recovery-empty"><span className="recovery-loader" /><p>Checking your active journeys…</p></div> : !cases.length ? <div className="recovery-empty"><span><Plane size={22} /></span><h2>All clear for now</h2><p>No disrupted journeys need your attention.</p><Link to="/my-bookings" className="recovery-primary">View my bookings <ArrowRight size={15} /></Link></div> : <div className="recovery-list">{cases.map((recoveryCase) => <RecoveryCard key={recoveryCase.id} recoveryCase={recoveryCase} working={working === recoveryCase.id} onApprove={(alternativeId) => act(recoveryCase, approveRecovery, alternativeId)} onDecline={() => act(recoveryCase, declineRecovery)} onRetry={() => act(recoveryCase, retryRecovery)} />)}</div>}
    </section>
  </main>
}

function RecoveryCard({ recoveryCase, working, onApprove, onDecline, onRetry }) {
  const details = recoveryCase.recoveryDetails || {}
  const alternatives = details.alternatives || recoveryCase.alternatives || []
  const audit = recoveryCase.audit || []
  const originalFlight = details.originalFlight
  const currentFlight = details.currentFlight
  const disruption = details.disruption
  const reference = details.currentBookingReference || details.previousBookingReference || `BOOK-${recoveryCase.bookingId}`
  return <article className="recovery-case">
    <div className="recovery-case-head"><div className="recovery-case-icon"><AlertTriangle size={18} /></div><div><p className="recovery-kicker">RECOVERY CASE #{recoveryCase.id}</p><h2>Choose your next flight</h2></div><span className={`recovery-status recovery-${recoveryCase.status}`}>{recoveryCase.status.replaceAll('_', ' ')}</span></div>
    <div className="recovery-case-note"><Clock3 size={15} /><span>Your original booking remains unchanged while you decide.</span><strong>{reference}</strong></div>
    <div className="recovery-details-grid"><div><small>Original flight</small><strong>{originalFlight?.flightNumber || `Flight #${recoveryCase.booking?.flightId || '—'}`}</strong><span>{formatRoute(originalFlight)}</span></div><div><small>Current booking</small><strong>{currentFlight?.flightNumber || 'Not rebooked'}</strong><span>{currentFlight ? formatRoute(currentFlight) : 'Awaiting your decision'}</span></div><div><small>Passengers</small><strong>{details.passengerCount || recoveryCase.booking?.noOfSeats || 0}</strong><span>{details.passengerCount === 1 ? 'traveller' : 'travellers'}</span></div><div><small>Approval deadline</small><strong>{details.approvalDeadline ? formatDate(details.approvalDeadline) : 'No deadline set'}</strong><span>{details.approvalDeadline ? 'Please decide before this time' : 'Contact support if urgent'}</span></div></div>
    <div className="recovery-impact-grid"><div><small>Disruption reason</small><strong>{disruption?.reason || 'Operational disruption'}</strong><span>{disruption?.type ? `${disruption.type.replaceAll('_', ' ')} · ${disruption.severity || 'standard'} severity` : 'Details unavailable'}</span></div><div><small>Booking references</small><strong>Previous: {details.previousBookingReference || reference}</strong><span>Current: {details.currentBookingReference || reference} · same booking record</span></div><div><small>Compensation</small><strong>{details.compensation?.amount ? formatMoney(details.compensation.amount) : 'Not configured'}</strong><span>{details.compensation?.description || 'No compensation has been assigned to this recovery case.'}</span></div></div>
    {alternatives.length ? <div className="recovery-options">{alternatives.map((alternative) => <div className={`recovery-option ${recoveryCase.selectedAlternativeId === alternative.id ? 'selected' : ''}`} key={alternative.id}><div className="recovery-option-top"><span className="recovery-flight-icon"><Plane size={15} /></span><div><strong>{alternative.flightNumber || `Flight #${alternative.replacementFlightId}`}</strong><small>{alternative.route || 'Route unavailable'} · score {Number(alternative.score).toFixed(1)}</small></div>{alternative.status === 'selected' && <Check className="recovery-selected-icon" size={17} />}</div><div className="recovery-option-meta"><span><small>Departure</small><strong>{formatDate(alternative.departureTime)}</strong></span><span><small>Arrival</small><strong>{formatDate(alternative.arrivalTime)}</strong></span><span><small>Fare</small><strong>{formatMoney(alternative.price)}</strong></span></div><p className="recovery-option-difference">{formatDelay(originalFlight, alternative)} · {formatDifference(originalFlight?.price, alternative.price)}</p><p className="recovery-explanation">{alternative.explanation}</p>{recoveryCase.status === 'awaiting_approval' && <button className="recovery-approve" disabled={working} onClick={() => onApprove(alternative.id)}>{working ? 'Saving choice…' : 'Choose this flight'} <ArrowRight size={14} /></button>}</div>)}</div> : <div className="recovery-no-options"><strong>We are still looking for a suitable alternative.</strong><span>Try refreshing shortly.</span></div>}
    {recoveryCase.status === 'awaiting_approval' && <button className="recovery-decline" disabled={working} onClick={onDecline}><X size={14} /> Decline all options</button>}
    {recoveryCase.status === 'rebooking' && <p className="recovery-progress"><span className="recovery-loader small" /> Your choice is being secured.</p>}
    {recoveryCase.status === 'failed' && <div className="recovery-failure"><strong>Recovery paused safely.</strong><span>{recoveryCase.rebookingAttempt?.errorMessage || 'The last step needs another attempt.'}</span><button className="recovery-retry" disabled={working} onClick={onRetry}><RefreshCw size={13} /> Retry rebooking</button></div>}
    {recoveryCase.status === 'completed' && <p className="recovery-progress recovery-complete"><Check size={15} /> Rebooking completed. Your booking is updated.</p>}
    {audit.length > 0 && <div className="recovery-timeline"><p className="recovery-timeline-title">Recovery timeline</p>{audit.map((event) => <div className="recovery-timeline-item" key={event.id}><span className="recovery-timeline-dot" /><div><strong>{event.eventType.replaceAll('_', ' ')}</strong><small>{formatDate(event.createdAt)}</small></div></div>)}</div>}
  </article>
}
