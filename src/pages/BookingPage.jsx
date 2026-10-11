import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, BadgeCheck, CalendarDays, CheckCircle2, Clock3, CreditCard, Plane, Users } from 'lucide-react'
import { getCurrentUser } from '../services/auth'
import './BookingPage.css'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')

async function readResponse(response) {
  const payload = await response.json().catch(() => ({}))
  if (!response.ok || payload.success === false) {
    const detail = payload.error?.explanation || payload.error?.message || payload.message
    throw new Error(Array.isArray(detail) ? detail.join(' ') : detail || 'The booking service could not complete this request.')
  }
  return payload.data
}

function BookingPage() {
  const { flightId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const existingBookingId = searchParams.get('bookingId')
  const initialTravellerCount = Math.min(6, Math.max(1, Number(location.state?.bookingIntent?.travellers ?? searchParams.get('travellers') ?? 1) || 1))
  const [travellers, setTravellers] = useState(initialTravellerCount)
  const [flight, setFlight] = useState(location.state?.bookingIntent?.flight || null)
  const [user, setUser] = useState(null)
  const [booking, setBooking] = useState(null)
  const [passengerDetails, setPassengerDetails] = useState(() => Array.from({ length: travellers }, () => ({ fullName: '', email: '', phone: '' })))
  const [step, setStep] = useState('details')
  const [confirmed, setConfirmed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const authToken = () => sessionStorage.getItem('authToken') || localStorage.getItem('authToken') || ''
  const date = location.state?.bookingIntent?.date ?? searchParams.get('date') ?? ''
  const bookingIntent = { flightId: Number(flightId), flight, date, travellers }

  useEffect(() => {
    let active = true
    const token = sessionStorage.getItem('authToken') || localStorage.getItem('authToken')
    if (!token) {
      navigate('/login', { replace: true, state: { bookingIntent } })
      return () => { active = false }
    }

    let profileLoaded = false
    getCurrentUser(token).then((profile) => {
      profileLoaded = true
      if (active) setUser(profile)
      if (existingBookingId) {
        return fetch(`${API_BASE_URL}/bookingService/api/v1/bookings/${existingBookingId}`, {
          headers: { 'x-access-token': token },
        }).then(readResponse).then((existingBooking) => {
          if (!active) return null
          setBooking(existingBooking)
          const savedPassengers = Array.isArray(existingBooking.passengerDetails) ? existingBooking.passengerDetails : []
          const savedTravellerCount = Math.max(1, Number(existingBooking.noOfSeats) || savedPassengers.length || 1)
          setTravellers(savedTravellerCount)
          setPassengerDetails(savedPassengers.length ? savedPassengers : Array.from({ length: savedTravellerCount }, () => ({ fullName: '', email: '', phone: '' })))
          if (existingBooking.status === 'booked') {
            setConfirmed(true)
            setStep('confirmation')
          } else if (existingBooking.status === 'initiated' || existingBooking.status === 'pending') {
            setStep('payment')
          } else {
            setBooking(null)
            setError('This booking is no longer active. Review the flight and start a new booking.')
          }
          return existingBooking.flight || flight || fetch(`${API_BASE_URL}/flightsService/api/v1/flights/${flightId}`).then(readResponse)
        })
      }
      return flight || fetch(`${API_BASE_URL}/flightsService/api/v1/flights/${flightId}`).then(readResponse)
    }).then((selectedFlight) => {
      if (active) setFlight(selectedFlight)
    }).catch((requestError) => {
      if (!active) return
      if (!profileLoaded && [400, 401, 403].includes(requestError.status)) {
        sessionStorage.removeItem('authToken')
        localStorage.removeItem('authToken')
        navigate('/login', { replace: true, state: { bookingIntent } })
      } else {
        setError(requestError.message || 'Could not load your account or this flight. Please try again.')
      }
    }).finally(() => { if (active) setLoading(false) })

    return () => { active = false }
  }, [])

  const continueToPayment = async () => {
    if (booking) {
      setStep('payment')
      return
    }
    setError('')
    setSubmitting(true)
    try {
      const currentBooking = await readResponse(await fetch(`${API_BASE_URL}/bookingService/api/v1/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-access-token': authToken() },
        body: JSON.stringify({ flightId: Number(flightId), userId: user.id, noOfSeats: travellers, passengerDetails }),
      }))
      setBooking(currentBooking)
      setStep('payment')
      const nextParams = new URLSearchParams(location.search)
      nextParams.set('bookingId', String(currentBooking.id))
      navigate(`${location.pathname}?${nextParams.toString()}`, { replace: true, state: location.state })
    } catch (requestError) {
      setError(requestError.message || 'Could not reserve this flight. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const completeDemoPayment = async () => {
    setError('')
    setSubmitting(true)
    try {
      const idempotencyKey = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`
      await readResponse(await fetch(`${API_BASE_URL}/bookingService/api/v1/bookings/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-idempotency-key': idempotencyKey, 'x-access-token': authToken() },
        body: JSON.stringify({ bookingId: booking.id, userId: user.id, totalCost: booking.totalCost }),
      }))
      setConfirmed(true)
      setStep('confirmation')
    } catch (requestError) {
      setError(requestError.message || 'Could not complete the demo payment. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const changeTravellerCount = (event) => {
    const nextCount = Number(event.target.value)
    setTravellers(nextCount)
    setPassengerDetails((current) => Array.from({ length: nextCount }, (_, index) => current[index] || ({ fullName: '', email: '', phone: '' })))
  }

  const formatTime = (value) => value ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : 'Time unavailable'
  const route = `${flight?.departureAirport?.code || flight?.departureAirportId || '—'} → ${flight?.arrivalAirport?.code || flight?.arrivalAirportId || '—'}`

  return <main className="booking-page">
    <header className="booking-header"><Link to="/" className="booking-brand"><span className="booking-brand-icon"><Plane size={18} /></span>Sky<span>Link</span></Link><span>FLIGHT BOOKING</span></header>
    <section className="booking-content">
      <Link to="/#flight-search" className="booking-back"><ArrowLeft size={15} /> Back to search</Link>
      <p className="booking-kicker">YOUR JOURNEY, ONE STEP CLOSER</p>
      <h1>{confirmed ? 'Booking confirmed' : step === 'payment' ? 'Demo payment' : 'Review your flight'}</h1>
      <p className="booking-subtitle">{confirmed ? 'Your booking has been confirmed.' : step === 'payment' ? 'Review the server-calculated total and complete the demo payment.' : 'Check your trip and passenger details before continuing.'}</p>
      <ol className="booking-steps" aria-label="Booking progress">
        <li className={step === 'details' ? 'active' : 'complete'}><span>{step === 'details' ? '1' : <CheckCircle2 size={15} />}</span>Passenger details</li>
        <li className={step === 'payment' ? 'active' : step === 'confirmation' ? 'complete' : ''}><span>{step === 'confirmation' ? <CheckCircle2 size={15} /> : '2'}</span>Demo payment</li>
        <li className={step === 'confirmation' ? 'active' : ''}><span>3</span>Confirmation</li>
      </ol>

      {loading ? <div className="booking-panel booking-loading">Loading your flight details…</div> : error && !flight ? <div className="booking-panel"><p className="booking-error" role="alert">{error}</p><Link to="/#flight-search" className="booking-action secondary">Return to flight search</Link></div> : flight && <div className="booking-layout">
        <div className="booking-main-column">
        <article className="booking-panel booking-flight-card">
          <div className="booking-flight-head"><span className="booking-plane"><Plane size={19} /></span><div><strong>{flight.flightNumber || 'SkyLink flight'}</strong><small>{flight.airplaneDetail?.modelNumber || 'Flight details'}</small></div><span className="booking-route">{route}</span></div>
          <div className="booking-times"><div><small>DEPARTURE</small><strong>{formatTime(flight.departureTime)}</strong></div><span className="booking-flight-line"><i /></span><div><small>ARRIVAL</small><strong>{formatTime(flight.arrivalTime)}</strong></div></div>
          <div className="booking-meta"><span><CalendarDays size={16} /> Search date: <strong>{date || 'Any available date'}</strong></span><span><Users size={16} /> Travellers: <strong>{travellers}</strong></span></div>
        </article>
        {confirmed ? <section className="booking-panel booking-passengers booking-confirmation-passengers">
          <div className="booking-passengers-heading"><div><p className="booking-summary-label">TRAVELLER INFORMATION</p><h2>Passengers</h2></div><span>{travellers} {travellers === 1 ? 'passenger' : 'passengers'}</span></div>
          <div className="booking-passenger-list">{passengerDetails.map((passenger, index) => <article className="booking-passenger-confirmed" key={index}><span className="booking-passenger-number">{index + 1}</span><div><strong>{passenger.fullName}</strong><span>{passenger.email} · {passenger.phone}</span></div></article>)}</div>
        </section> : <form className="booking-panel booking-passengers" id="passenger-form" onSubmit={(event) => { event.preventDefault(); continueToPayment() }}>
          <div className="booking-passengers-heading"><div><p className="booking-summary-label">TRAVELLER INFORMATION</p><h2>Passenger details</h2></div><label className="booking-count-control" htmlFor="booking-traveller-count"><span>Travellers</span><select id="booking-traveller-count" value={travellers} onChange={changeTravellerCount} disabled={Boolean(booking) || submitting}>{[1, 2, 3, 4, 5, 6].map((count) => <option key={count} value={count}>{count}</option>)}</select></label></div>
          <div className="booking-passenger-list">
            {passengerDetails.map((passenger, index) => <fieldset className="booking-passenger" key={index} disabled={Boolean(booking) || submitting}>
              <legend>Passenger {index + 1}</legend>
              <label>Full name<input required maxLength={120} autoComplete={index === 0 ? 'name' : 'off'} value={passenger.fullName} onChange={(event) => setPassengerDetails((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, fullName: event.target.value } : item))} placeholder="As shown on travel ID" /></label>
              <label>Email address<input required type="email" maxLength={254} autoComplete={index === 0 ? 'email' : 'off'} value={passenger.email} onChange={(event) => setPassengerDetails((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, email: event.target.value } : item))} placeholder="name@example.com" /></label>
              <label>Phone number<input required type="tel" maxLength={20} pattern="[+0-9][0-9 ()-]{6,19}" autoComplete={index === 0 ? 'tel' : 'off'} value={passenger.phone} onChange={(event) => setPassengerDetails((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, phone: event.target.value } : item))} placeholder="+1 555 123 4567" /></label>
            </fieldset>)}
          </div>
        </form>}
        </div>

        <aside className="booking-panel booking-summary">
          {confirmed ? <div className="booking-confirmed"><CheckCircle2 size={38} /><h2>Booking confirmed</h2><p>Reference <strong>#{booking?.id}</strong></p><span className="booking-status"><BadgeCheck size={14} /> BOOKED</span><div className="booking-confirmed-total"><span>Paid (demo)</span><strong>₹{Number(booking?.totalCost).toLocaleString('en-IN')}</strong></div></div> : step === 'payment' ? <>
            <p className="booking-summary-label">DEMO PAYMENT</p>
            <div className="booking-demo-banner"><CreditCard size={18} /><div><strong>Demo checkout</strong><span>No real payment details or charge</span></div><span className="booking-demo-tag">DEMO</span></div>
            <div className="booking-total-row"><span>{travellers} {travellers === 1 ? 'traveller' : 'travellers'}</span><span>₹{Number(booking?.totalCost).toLocaleString('en-IN')}</span></div>
            <div className="booking-total-row booking-total"><strong>Total due</strong><strong>₹{Number(booking?.totalCost).toLocaleString('en-IN')}</strong></div>
            <p className="booking-payment-note"><Clock3 size={14} /> The booking service currently simulates a successful payment.</p>
            {error && <p className="booking-error" role="alert">{error}</p>}
            <button className="booking-action" type="button" onClick={completeDemoPayment} disabled={submitting}>{submitting ? 'Processing demo payment…' : 'Simulate successful payment'}</button>
            <button className="booking-back-step" type="button" onClick={() => { setError(''); setStep('details') }} disabled={submitting}>Back to passenger details</button>
          </> : <>
            <p className="booking-summary-label">FARE ESTIMATE</p>
            <div className="booking-total-row"><span>{travellers} {travellers === 1 ? 'traveller' : 'travellers'}</span><span>₹{(Number(flight.price) * travellers).toLocaleString('en-IN')}</span></div>
            <div className="booking-total-row booking-total"><strong>Estimated total</strong><strong>₹{(Number(flight.price) * travellers).toLocaleString('en-IN')}</strong></div>
            <p className="booking-payment-note"><Clock3 size={14} /> Final total is calculated by the booking service.</p>
            {error && <p className="booking-error" role="alert">{error}</p>}
            <button className="booking-action" type="submit" form="passenger-form" disabled={submitting || loading || !user}>{submitting ? 'Creating booking…' : 'Continue to demo payment'}</button>
          </>}
          {confirmed && <><Link to={`/my-bookings/${booking?.id}`} className="booking-action">View this booking</Link><Link to="/my-bookings" className="booking-back-step">My bookings</Link><Link to="/" className="booking-back-step">Return home</Link></>}
        </aside>
      </div>}
    </section>
  </main>
}

export default BookingPage
