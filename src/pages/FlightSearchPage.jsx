import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, CalendarDays, Clock3, MapPin, Plane, Search, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { getCurrentUser } from '../services/auth'
import './HomePage.css'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')

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
    const token = sessionStorage.getItem('authToken') || localStorage.getItem('authToken')
    if (token) getCurrentUser(token).then((user) => setIsCustomer(user.roles?.includes('customer') && !user.roles.includes('admin'))).catch(() => {})
    Promise.all(['airports', 'cities'].map((path) => fetch(`${API_BASE_URL}/flightsService/api/v1/${path}`).then((response) => response.json())))
      .then(([airportPayload, cityPayload]) => {
        setAirports(Array.isArray(airportPayload.data) ? airportPayload.data : [])
        setCities(Array.isArray(cityPayload.data) ? cityPayload.data : [])
      })
      .catch(() => setError('Airport list is unavailable. Please try again later.'))
      .finally(() => setLoading(false))
  }, [])

  const searchFlights = async (event) => {
    event.preventDefault()
    const originCode = origin.toUpperCase()
    const destinationCode = destination.toUpperCase()
    setSearched(true)
    setError('')
    if (!/^[A-Z]{3}$/.test(originCode) || !/^[A-Z]{3}$/.test(destinationCode) || originCode === destinationCode) {
      setFlights([])
      setError('Choose two different airports from the suggestions.')
      return
    }
    if (minPrice && maxPrice && Number(minPrice) > Number(maxPrice)) {
      setFlights([])
      setError('Minimum price cannot be greater than maximum price.')
      return
    }
    setSearching(true)
    const query = new URLSearchParams({ trips: `${originCode}-${destinationCode}`, travellers, sort })
    if (date) query.set('tripDate', date)
    if (minPrice && maxPrice) query.set('price', `${minPrice}-${maxPrice}`)
    else if (minPrice) query.set('price', minPrice)
    else if (maxPrice) query.set('price', `0-${maxPrice}`)
    try {
      const response = await fetch(`${API_BASE_URL}/flightsService/api/v1/flights?${query}`)
      const payload = await response.json()
      if (!response.ok || payload.success === false) throw new Error(payload.message || 'Could not load flights.')
      setFlights((payload.data || []).filter((flight) => Date.parse(flight.departureTime) > Date.now()))
    } catch (requestError) {
      setFlights([])
      setError(requestError.message)
    } finally {
      setSearching(false)
    }
  }

  const formatTime = (value) => new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(new Date(value))

  return <main className="search-page">
    <header className="search-page-header"><Link to="/" className="home-brand"><span className="home-brand-icon"><Plane size={19} /></span><span>Sky<span>Link</span></span></Link><nav><Link to="/flight-search">Search flights</Link>{isCustomer && <Link to="/assistant">AI assistant</Link>}<Link to="/">Home</Link></nav></header>
    <section className="search-section search-page-section">
      <div className="search-heading"><div><p className="section-kicker">PLAN YOUR JOURNEY</p><h1>Search flights</h1></div><Link to="/" className="text-link"><ArrowLeft size={15} /> Back home</Link></div>
      <form className="flight-search" onSubmit={searchFlights}>
        <AirportPicker label="DEPARTURE CITY" value={origin} airports={airports} cities={cities} loading={loading} onChange={setOrigin} />
        <button type="button" className="swap-locations" onClick={() => { setOrigin(destination); setDestination(origin) }} aria-label="Swap airports"><ArrowRight size={17} /></button>
        <AirportPicker label="ARRIVAL CITY" value={destination} airports={airports} cities={cities} loading={loading} onChange={setDestination} />
        <label className="search-field"><span><CalendarDays size={16} /> DEPARTURE</span><input type="date" min={new Date().toISOString().slice(0, 10)} value={date} onChange={(event) => setDate(event.target.value)} /><small>Choose a date</small></label>
        <label className="search-field"><span><Users size={16} /> TRAVELLERS</span><select value={travellers} onChange={(event) => setTravellers(event.target.value)}>{[1, 2, 3, 4, 5, 6].map((number) => <option key={number} value={number}>{number} {number === 1 ? 'traveller' : 'travellers'}</option>)}</select></label>
        <button className="search-submit" type="submit" disabled={searching}>{searching ? 'Searching' : <><Search size={17} /> Search</>}</button>
        <div className="search-filters"><label className="search-filter"><span>MINIMUM PRICE</span><input type="number" min="0" value={minPrice} onChange={(event) => setMinPrice(event.target.value)} placeholder="No minimum" /></label><label className="search-filter"><span>MAXIMUM PRICE</span><input type="number" min="0" value={maxPrice} onChange={(event) => setMaxPrice(event.target.value)} placeholder="No maximum" /></label><label className="search-filter search-filter-sort"><span>SORT RESULTS</span><select value={sort} onChange={(event) => setSort(event.target.value)}><option value="departureTime_ASC">Departure: earliest</option><option value="price_ASC,departureTime_ASC">Price: low to high</option><option value="price_DESC,departureTime_ASC">Price: high to low</option></select></label></div>
      </form>
      {searched && <div className="flight-results">{error && <p className="flight-error">{error}</p>}{!error && !searching && flights.length === 0 && <p className="flight-empty">No flights found for this route. Try another date or destination.</p>}{flights.map((flight) => <article className="flight-result" key={flight.id}><div className="result-airline"><span className="result-plane"><Plane size={17} /></span><div><strong>{flight.flightNumber}</strong><small>{flight.airplaneDetail?.modelNumber || 'SkyLink flight'}</small></div></div><div className="result-route"><strong>{formatTime(flight.departureTime)}</strong><span>{flight.departureAirport?.code || flight.departureAirportId}</span></div><div className="result-duration"><span /><small><Clock3 size={12} /> Direct</small></div><div className="result-route"><strong>{formatTime(flight.arrivalTime)}</strong><span>{flight.arrivalAirport?.code || flight.arrivalAirportId}</span></div><div className="result-price"><strong>₹{Number(flight.price || 0).toLocaleString('en-IN')}</strong><Link to={`/booking/${flight.id}?date=${date}&travellers=${travellers}`}>Select flight <ArrowRight size={13} /></Link></div></article>)}</div>}
    </section>
  </main>
}

function AirportPicker({ label, value, airports, cities, loading, onChange }) {
  const [open, setOpen] = useState(false)
  const cityFor = (airport) => cities.find((city) => String(city.id) === String(airport.cityId))?.name || ''
  const matches = airports.filter((airport) => `${cityFor(airport)} ${airport.name} ${airport.code}`.toLowerCase().includes(value.toLowerCase()))
  const selected = airports.find((airport) => String(airport.code).toUpperCase() === value)
  return <div className={`search-field airport-picker ${open ? 'is-open' : ''}`}><label><span><MapPin size={16} /> {label}</span></label><input value={selected ? `${cityFor(selected)} · ${selected.code}` : value} onFocus={() => setOpen(true)} onChange={(event) => { onChange(event.target.value); setOpen(true) }} placeholder="Search airport" />{open && <div className="airport-picker-options">{loading ? <p>Loading airports…</p> : matches.map((airport) => <button type="button" key={airport.id} onMouseDown={(event) => event.preventDefault()} onClick={() => { onChange(String(airport.code).toUpperCase()); setOpen(false) }}><strong>{cityFor(airport)}</strong><span>{airport.name}</span><small>{airport.code}</small></button>)}</div>}</div>
}
