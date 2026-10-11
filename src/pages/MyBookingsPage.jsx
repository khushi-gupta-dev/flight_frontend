import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, CalendarDays, Clock3, Plane, RotateCcw, Users, XCircle } from 'lucide-react'
import './MyBookingsPage.css'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')

async function readResponse(response) {
  const payload = await response.json().catch(() => ({}))
  if (!response.ok || payload.success === false) {
    const error = new Error(payload.error?.message || payload.message || 'The booking service could not complete this request.')
    error.status = response.status
    throw error
  }
  return payload.data
}

function formatDate(value, withTime = false) {
  if (!value || !Number.isFinite(Date.parse(value))) return 'Schedule unavailable'
  return new Intl.DateTimeFormat(undefined, withTime
    ? { dateStyle: 'medium', timeStyle: 'short' }
    : { dateStyle: 'medium' }).format(new Date(value))
}

function MyBookingsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [bookings, setBookings] = useState([])
  const [detail, setDetail] = useState(null)
  const [flight, setFlight] = useState(null)
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState('')
  const token = sessionStorage.getItem('authToken') || localStorage.getItem('authToken') || ''

  const request = useCallback(async (path, options = {}) => readResponse(await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: { 'x-access-token': token, ...(options.headers || {}) },
  })), [token])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      if (!token) {
        navigate('/login', { replace: true, state: { from: id ? `/my-bookings/${id}` : '/my-bookings' } })
        return
      }
      if (id) {
        const booking = await request(`/bookingService/api/v1/bookings/${id}`)
        setDetail(booking)
        setFlight(booking.flight || null)
      } else {
        const rows = await request('/bookingService/api/v1/bookings')
        const list = Array.isArray(rows) ? rows : []
        setBookings(list)
      }
    } catch (requestError) {
      if ([400, 401, 403].includes(requestError.status)) {
        sessionStorage.removeItem('authToken')
        localStorage.removeItem('authToken')
        navigate('/login', { replace: true, state: { from: id ? `/my-bookings/${id}` : '/my-bookings' } })
        return
      }
      setError(requestError.message || 'Could not load your bookings.')
    } finally {
      setLoading(false)
    }
  }, [id, navigate, request, token])

  useEffect(() => { load() }, [load])

  const cancel = async () => {
    if (!detail || !window.confirm('Request cancellation for this booking?')) return
    setWorking(true)
    setError('')
    try {
      const updated = await request(`/bookingService/api/v1/bookings/${id}/cancel`, { method: 'POST' })
      setDetail(updated)
    } catch (requestError) {
      setError(requestError.message || 'Could not cancel this booking.')
    } finally {
      setWorking(false)
    }
  }

  const isUpcoming = (booking) => Number.isFinite(Date.parse(booking.flight?.departureTime)) && Date.parse(booking.flight.departureTime) > Date.now()
  const groups = [
    { title: 'Upcoming trips', entries: bookings.filter((booking) => booking.status !== 'cancelled' && isUpcoming(booking)) },
    { title: 'Past trips', entries: bookings.filter((booking) => booking.status !== 'cancelled' && Number.isFinite(Date.parse(booking.flight?.departureTime)) && !isUpcoming(booking)) },
    { title: 'Cancelled bookings', entries: bookings.filter((booking) => booking.status === 'cancelled') },
    { title: 'Schedule unavailable', entries: bookings.filter((booking) => booking.status !== 'cancelled' && !Number.isFinite(Date.parse(booking.flight?.departureTime))) },
  ]
  const routeFor = (flightData) => `${flightData?.departureAirport?.code || flightData?.departureAirportId || '—'} → ${flightData?.arrivalAirport?.code || flightData?.arrivalAirportId || '—'}`
  const canCancel = detail && detail.status !== 'cancelled' && flight && Number.isFinite(Date.parse(flight.departureTime)) && Date.parse(flight.departureTime) > Date.now()

  return <main className="my-bookings-page">
    <header className="my-bookings-header"><Link className="my-bookings-brand" to="/"><span><Plane size={17} /></span>Sky<span>Link</span></Link><Link to="/" className="my-bookings-home">Back to home <ArrowRight size={15} /></Link></header>
    <section className="my-bookings-content">
      <Link to={id ? '/my-bookings' : '/'} className="my-bookings-back"><ArrowLeft size={15} /> {id ? 'All bookings' : 'Home'}</Link>
      <p className="my-bookings-kicker">YOUR JOURNEY, ALL IN ONE PLACE</p>
      <div className="my-bookings-title-row"><div><h1>{id ? 'Booking details' : 'My bookings'}</h1><p>{id ? 'Review your itinerary, passengers, and booking status.' : 'Keep track of upcoming plans and past journeys.'}</p></div>{!id && <button type="button" className="my-bookings-refresh" onClick={load} disabled={loading}><RotateCcw size={15} /> Refresh</button>}</div>

      {error && <p className="my-bookings-error" role="alert">{error}</p>}
      {loading ? <div className="my-bookings-empty">Loading your bookings…</div> : id && detail ? <>
        <div className="my-booking-detail-grid">
          <article className="my-booking-card my-booking-itinerary">
            <div className="my-booking-card-head"><span className="my-booking-plane"><Plane size={19} /></span><div><strong>{flight?.flightNumber || `Booking #${detail.id}`}</strong><small>Booking reference #{detail.id}</small></div><span className={`my-booking-status status-${detail.status}`}>{detail.status}</span></div>
            <div className="my-booking-route"><div><small>FROM</small><strong>{flight?.departureAirport?.code || flight?.departureAirportId || '—'}</strong><span>{flight?.departureAirport?.City?.name || 'Departure'}</span></div><span className="my-booking-route-line"><i /></span><div><small>TO</small><strong>{flight?.arrivalAirport?.code || flight?.arrivalAirportId || '—'}</strong><span>{flight?.arrivalAirport?.City?.name || 'Arrival'}</span></div></div>
            <div className="my-booking-meta"><span><CalendarDays size={16} /> Departure <strong>{formatDate(flight?.departureTime, true)}</strong></span><span><Clock3 size={16} /> Arrival <strong>{formatDate(flight?.arrivalTime, true)}</strong></span><span><Users size={16} /> Travellers <strong>{detail.noOfSeats}</strong></span></div>
          </article>
          <aside className="my-booking-card my-booking-total"><p className="my-bookings-kicker">BOOKING SUMMARY</p><div><span>Status</span><strong className={`my-booking-status status-${detail.status}`}>{detail.status}</strong></div><div><span>Travellers</span><strong>{detail.noOfSeats}</strong></div><div className="my-booking-total-amount"><span>Total</span><strong>₹{Number(detail.totalCost).toLocaleString('en-IN')}</strong></div>{canCancel && <button type="button" className="my-booking-cancel" onClick={cancel} disabled={working}>{working ? 'Cancelling…' : <><XCircle size={15} /> Request cancellation</>}</button>}</aside>
        </div>
        <section className="my-booking-card my-booking-passengers"><p className="my-bookings-kicker">TRAVELLER INFORMATION</p><h2>Passengers</h2>{(detail.passengerDetails || []).map((passenger, index) => <article key={`${index}-${passenger.email}`}><span>{index + 1}</span><div><strong>{passenger.fullName}</strong><small>{passenger.email} · {passenger.phone}</small></div></article>)}{!detail.passengerDetails?.length && <p>Passenger details are not available for this booking.</p>}</section>
      </> : !id && bookings.length === 0 ? <div className="my-bookings-empty"><span><Plane size={22} /></span><h2>No bookings yet</h2><p>Your confirmed trips will appear here after you book a flight.</p><Link to="/#flight-search" className="my-booking-primary">Find a flight <ArrowRight size={15} /></Link></div> : !id && groups.map((group) => <section className="my-booking-group" key={group.title}><div className="my-booking-group-head"><h2>{group.title}</h2><span>{group.entries.length}</span></div>{group.entries.length ? <div className="my-booking-list">{group.entries.map((booking) => <article className="my-booking-card my-booking-list-item" key={booking.id}><span className="my-booking-plane"><Plane size={18} /></span><div className="my-booking-list-main"><div><strong>{routeFor(booking.flight)}</strong><span className={`my-booking-status status-${booking.status}`}>{booking.status}</span></div><small>{booking.flight?.flightNumber || `Booking #${booking.id}`} · {formatDate(booking.flight?.departureTime, true)}</small></div><div className="my-booking-list-price"><strong>₹{Number(booking.totalCost).toLocaleString('en-IN')}</strong><small>{booking.noOfSeats} {booking.noOfSeats === 1 ? 'traveller' : 'travellers'}</small></div><Link to={`/my-bookings/${booking.id}`} aria-label={`View booking ${booking.id}`}><ArrowRight size={17} /></Link></article>)}</div> : <p className="my-booking-group-empty">No {group.title.toLowerCase()} to show.</p>}</section>)}
    </section>
  </main>
}

export default MyBookingsPage
