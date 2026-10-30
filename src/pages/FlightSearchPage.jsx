import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, CalendarDays, Check, Clock3, MapPin, Plane, Search, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { getCurrentUser } from '../services/auth'
import './FlightSearchPage.css'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
const today = new Date().toISOString().slice(0, 10)

function apiMessage(payload, fallback) {
  const detail = payload?.error?.explanation || payload?.error?.message || payload?.message
  return Array.isArray(detail) ? detail.join(' ') : detail || fallback
}

function airportLabel(airport, cities) {
  const city = cities.find((item) => String(item.id) === String(airport.cityId))
  return city?.name ? city.name.charAt(0).toUpperCase() + city.name.slice(1) : airport.address || airport.code
}

function formatTime(value) {
  if (!value) return '—'
  return new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(new Date(value))
}

function formatDate(value) {
  if (!value) return 'Date unavailable'
  return new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(value))
}

function formatDuration(departure, arrival) {
  const minutes = Math.max(0, Math.round((Date.parse(arrival) - Date.parse(departure)) / 60000))
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`
}

export default function FlightSearchPage() {
  const [origin, setOrigin] = useState('')
  const [destination, setDestination] = useState('')
  const [date, setDate] = useState('')
  const [travellers, setTravellers] = useState('1')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [sort, setSort] = useState('departureTime_ASC')
  const [airports, setAirports] = useState([])
  const [cities, setCities] = useState([])
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const [searched, setSearched] = useState(false)
  const [error, setError] = useState('')
  const [flights, setFlights] = useState([])
  const [isCustomer, setIsCustomer] = useState(false)

  useEffect(() => {
    let active = true
    const token = sessionStorage.getItem('authToken') || localStorage.getItem('authToken')
    if (token) {
      getCurrentUser(token)
        .then((user) => active && setIsCustomer(user.roles?.includes('customer') && !user.roles.includes('admin')))
        .catch(() => active && setIsCustomer(false))
    }

    const loadList = async (path) => {
      const response = await fetch(`${API_BASE_URL}/flightsService/api/v1/${path}`)
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || payload.success === false) throw new Error(apiMessage(payload, `Could not load ${path}.`))
      return Array.isArray(payload.data) ? payload.data : []
    }

    Promise.all([loadList('airports'), loadList('cities')])
      .then(([airportList, cityList]) => {
        if (!active) return
        setAirports(airportList)
        setCities(cityList)
      })
      .catch((requestError) => active && setError(requestError.message || 'Airport list is unavailable.'))
      .finally(() => active && setLoading(false))

    return () => { active = false }
  }, [])

  const selectedOrigin = airports.find((airport) => airport.code.toUpperCase() === origin)
  const selectedDestination = airports.find((airport) => airport.code.toUpperCase() === destination)

  const searchFlights = async (event) => {
    event.preventDefault()
    const originCode = origin.trim().toUpperCase()
    const destinationCode = destination.trim().toUpperCase()
    setSearched(true)
    setError('')
    setFlights([])

    if (!airports.some((airport) => airport.code.toUpperCase() === originCode) || !airports.some((airport) => airport.code.toUpperCase() === destinationCode)) {
      setError('Choose both airports from the suggestions so we can search the correct route.')
      return
    }
    if (originCode === destinationCode) {
      setError('Departure and arrival airports must be different.')
      return
    }
    if (minPrice && maxPrice && Number(minPrice) > Number(maxPrice)) {
      setError('Minimum price cannot be greater than maximum price.')
      return
    }

    const query = new URLSearchParams({ trips: `${originCode}-${destinationCode}`, travellers, sort })
    if (date) query.set('tripDate', date)
    if (minPrice && maxPrice) query.set('price', `${minPrice}-${maxPrice}`)
    else if (minPrice) query.set('price', minPrice)
    else if (maxPrice) query.set('price', `0-${maxPrice}`)

    setSearching(true)
    try {
      const response = await fetch(`${API_BASE_URL}/flightsService/api/v1/flights?${query}`)
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || payload.success === false) throw new Error(apiMessage(payload, 'Could not load flights.'))
      const upcoming = (Array.isArray(payload.data) ? payload.data : []).filter((flight) => Date.parse(flight.departureTime) > Date.now())
      setFlights(upcoming)
    } catch (requestError) {
      setError(requestError.message || 'Could not reach the flight service. Check that the API Gateway is running.')
    } finally {
      setSearching(false)
    }
  }

  const swapLocations = () => {
    setOrigin(destination)
    setDestination(origin)
  }

  const resultSummary = useMemo(() => {
    if (!searched || searching) return ''
    return `${flights.length} ${flights.length === 1 ? 'flight' : 'flights'} found`
  }, [flights.length, searched, searching])

  return (
    <main className="flight-search-page">
      <header className="flight-search-header">
        <Link to="/" className="flight-search-brand" aria-label="SkyLink home">
          <span className="flight-search-brand-icon"><Plane size={18} /></span>
          <span>Sky<span>Link</span></span>
        </Link>
        <nav aria-label="Flight search navigation">
          <Link className="active" to="/flight-search">Search flights</Link>
          {isCustomer && <Link to="/assistant">AI assistant</Link>}
          <Link to="/">Home</Link>
        </nav>
      </header>

      <section className="flight-search-content">
        <div className="flight-search-intro">
          <div>
            <p className="flight-search-kicker"><span /> PLAN YOUR JOURNEY</p>
            <h1>Find your next <em>adventure.</em></h1>
            <p className="flight-search-lede">Compare available flights, choose what works for you, and continue securely to booking.</p>
          </div>
          <Link to="/" className="flight-search-back"><ArrowLeft size={15} /> Back home</Link>
        </div>

        <form className="flight-search-form" onSubmit={searchFlights}>
          <div className="flight-search-route">
            <AirportPicker label="From" value={origin} airports={airports} cities={cities} loading={loading} onChange={setOrigin} />
            <button type="button" className="flight-search-swap" onClick={swapLocations} aria-label="Swap departure and arrival"><ArrowRight size={17} /></button>
            <AirportPicker label="To" value={destination} airports={airports} cities={cities} loading={loading} onChange={setDestination} />
          </div>
          <div className="flight-search-fields">
            <label className="flight-search-field"><span><CalendarDays size={15} /> Departure</span><input type="date" min={today} value={date} onChange={(event) => setDate(event.target.value)} /><small>{date ? formatDate(date) : 'Select a date'}</small></label>
            <label className="flight-search-field"><span><Users size={15} /> Travellers</span><select value={travellers} onChange={(event) => setTravellers(event.target.value)}>{[1, 2, 3, 4, 5, 6].map((number) => <option key={number} value={number}>{number} {number === 1 ? 'traveller' : 'travellers'}</option>)}</select><small>Adults and children</small></label>
            <button className="flight-search-submit" type="submit" disabled={searching || loading}><Search size={17} />{searching ? 'Searching…' : 'Search flights'}</button>
          </div>
          <div className="flight-search-options">
            <label><span>Minimum price</span><input type="number" min="0" value={minPrice} onChange={(event) => setMinPrice(event.target.value)} placeholder="₹ No minimum" /></label>
            <label><span>Maximum price</span><input type="number" min="0" value={maxPrice} onChange={(event) => setMaxPrice(event.target.value)} placeholder="₹ No maximum" /></label>
            <label><span>Sort by</span><select value={sort} onChange={(event) => setSort(event.target.value)}><option value="departureTime_ASC">Departure: earliest</option><option value="price_ASC,departureTime_ASC">Price: low to high</option><option value="price_DESC,departureTime_ASC">Price: high to low</option></select></label>
          </div>
        </form>

        <section className="flight-search-results" aria-live="polite">
          {searched && <div className="flight-results-heading"><div><p className="flight-search-kicker"><span /> AVAILABLE FLIGHTS</p><h2>{resultSummary || 'Search results'}</h2></div>{selectedOrigin && selectedDestination && <p>{airportLabel(selectedOrigin, cities)} <strong>{selectedOrigin.code}</strong> <ArrowRight size={14} /> {airportLabel(selectedDestination, cities)} <strong>{selectedDestination.code}</strong></p>}</div>}
          {error && <div className="flight-search-message is-error"><strong>We couldn’t complete that search.</strong><span>{error}</span></div>}
          {searched && !error && !searching && flights.length === 0 && <div className="flight-search-message"><span className="flight-empty-icon"><Plane size={20} /></span><strong>No upcoming flights found</strong><span>Try another route or date. Only flights that can still be booked are shown.</span></div>}
          {searching && <div className="flight-search-message"><span className="flight-search-loader" /><strong>Searching available flights…</strong></div>}
          {flights.map((flight) => <FlightResult key={flight.id} flight={flight} date={date} travellers={travellers} />)}
        </section>
      </section>
    </main>
  )
}

function FlightResult({ flight, date, travellers }) {
  return (
    <article className="flight-result-card">
      <div className="flight-result-airline"><span className="flight-result-icon"><Plane size={17} /></span><div><strong>{flight.flightNumber}</strong><small>{flight.airplaneDetail?.modelNumber || 'SkyLink flight'}</small></div></div>
      <div className="flight-result-point"><small>DEPARTS</small><strong>{formatTime(flight.departureTime)}</strong><span>{flight.departureAirport?.code || flight.departureAirportId}</span><em>{formatDate(flight.departureTime)}</em></div>
      <div className="flight-result-duration"><span /><small><Clock3 size={13} /> {formatDuration(flight.departureTime, flight.arrivalTime)}</small><span /></div>
      <div className="flight-result-point"><small>ARRIVES</small><strong>{formatTime(flight.arrivalTime)}</strong><span>{flight.arrivalAirport?.code || flight.arrivalAirportId}</span><em>{formatDate(flight.arrivalTime)}</em></div>
      <div className="flight-result-price"><small>{Number(flight.totalSeats) > 0 ? `${flight.totalSeats} seats left` : 'Sold out'}</small><strong>₹{Number(flight.price || 0).toLocaleString('en-IN')}</strong><Link to={`/booking/${flight.id}?date=${date}&travellers=${travellers}`} state={{ bookingIntent: { flightId: flight.id, flight, date, travellers } }}>Continue <ArrowRight size={14} /></Link></div>
    </article>
  )
}

function AirportPicker({ label, value, airports, cities, loading, onChange }) {
  const [open, setOpen] = useState(false)
  const matches = airports.filter((airport) => `${airportLabel(airport, cities)} ${airport.name} ${airport.code}`.toLowerCase().includes(value.toLowerCase()))
  const selected = airports.find((airport) => airport.code.toUpperCase() === value)
  return (
    <div className={`airport-picker ${open ? 'is-open' : ''}`}>
      <label><span><MapPin size={15} /> {label}</span></label>
      <input aria-label={`${label} airport`} value={selected ? `${airportLabel(selected, cities)} · ${selected.code}` : value} onFocus={() => setOpen(true)} onChange={(event) => { onChange(event.target.value.toUpperCase()); setOpen(true) }} placeholder="Search city or airport" />
      {selected && <Check className="airport-picker-check" size={16} />}
      {open && <div className="airport-picker-options">{loading ? <p>Loading airports…</p> : matches.length ? matches.map((airport) => <button type="button" key={airport.id} onMouseDown={(event) => event.preventDefault()} onClick={() => { onChange(airport.code.toUpperCase()); setOpen(false) }}><strong>{airportLabel(airport, cities)} <b>{airport.code}</b></strong><span>{airport.name}</span></button>) : <p>No matching airports</p>}</div>}
    </div>
  )
}
