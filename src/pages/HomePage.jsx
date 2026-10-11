import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowDown, ArrowRight, ArrowUpRight, CalendarDays, Clock3, Compass, LogOut, MapPin, Menu, Plane, Search, ShieldCheck, Sparkles, Users, X } from 'lucide-react'
import './HomePage.css'
import { getCurrentUser } from '../services/auth'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')

function formatTime(value) {
  if (!value) return '—'
  return new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(new Date(value))
}

function formatFlightDate(value) {
  if (!value) return 'Date unavailable'
  return new Intl.DateTimeFormat(undefined, { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value))
}

function HomePage() {
  const [origin, setOrigin] = useState('')
  const [destination, setDestination] = useState('')
  const [date, setDate] = useState('')
  const [travellers, setTravellers] = useState('1')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [sort, setSort] = useState('departureTime_ASC')
  const [airports, setAirports] = useState([])
  const [cities, setCities] = useState([])
  const [airportLoading, setAirportLoading] = useState(true)
  const [airportError, setAirportError] = useState('')
  const [flights, setFlights] = useState([])
  const [error, setError] = useState('')
  const [searched, setSearched] = useState(false)
  const [loading, setLoading] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [isSignedIn, setIsSignedIn] = useState(() => Boolean(sessionStorage.getItem('authToken') || localStorage.getItem('authToken')))
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const token = sessionStorage.getItem('authToken') || localStorage.getItem('authToken')
    if (!token) return
    let active = true
    getCurrentUser(token)
      .then((user) => { if (active) setIsAdmin(user.roles?.includes('admin') || false) })
      .catch((error) => {
        if (!active) return
        setIsAdmin(false)
        if ([400, 401, 403].includes(error.status)) {
          sessionStorage.removeItem('authToken')
          localStorage.removeItem('authToken')
          setIsSignedIn(false)
        }
      })
    return () => { active = false }
  }, [])

  useEffect(() => {
    let active = true
    const loadList = async (path) => {
      const response = await fetch(`${API_BASE_URL}/flightsService/api/v1/${path}`)
      const payload = await response.json()
      if (!response.ok || payload.success === false) throw new Error(payload.message || `Could not load ${path}.`)
      return Array.isArray(payload.data) ? payload.data : []
    }
    Promise.allSettled([loadList('airports'), loadList('cities')]).then(([airportResult, cityResult]) => {
      if (!active) return
      if (airportResult.status === 'fulfilled') setAirports(airportResult.value)
      else setAirportError('Airport list is unavailable. Please try again later.')
      if (cityResult.status === 'fulfilled') setCities(cityResult.value)
      setAirportLoading(false)
    })
    return () => { active = false }
  }, [])

  const handleLogout = () => {
    sessionStorage.removeItem('authToken')
    localStorage.removeItem('authToken')
    setIsSignedIn(false)
    setIsAdmin(false)
  }

  const searchFlights = async (event) => {
    event.preventDefault()
    setError('')
    const originCode = origin.trim().toUpperCase()
    const destinationCode = destination.trim().toUpperCase()
    if (!originCode || !destinationCode) {
      setSearched(true)
      setFlights([])
      setError('Choose a departure and arrival airport from the suggestions.')
      return
    }
    if (!/^[A-Z]{3}$/.test(originCode) || !/^[A-Z]{3}$/.test(destinationCode)) {
      setSearched(true)
      setFlights([])
      setError('Enter a valid 3-letter airport code for both locations.')
      return
    }
    if (!airports.some((airport) => String(airport.code).toUpperCase() === originCode) || !airports.some((airport) => String(airport.code).toUpperCase() === destinationCode)) {
      setSearched(true)
      setFlights([])
      setError(airportError || 'Choose both locations from the airport suggestions.')
      return
    }
    if (originCode === destinationCode) {
      setSearched(true)
      setFlights([])
      setError('Departure and arrival airports must be different.')
      return
    }
    const effectiveMinPrice = minPrice ? Number(minPrice) : 0
    const effectiveMaxPrice = maxPrice ? Number(maxPrice) : (minPrice ? 200000 : Number.POSITIVE_INFINITY)
    if ((minPrice || maxPrice) && effectiveMinPrice > effectiveMaxPrice) {
      setSearched(true)
      setFlights([])
      setError('Minimum price cannot be greater than maximum price.')
      return
    }
    if (minPrice && !maxPrice && Number(minPrice) > 200000) {
      setSearched(true)
      setFlights([])
      setError('The backend uses ₹200,000 as the maximum when only a minimum price is supplied. Enter a maximum price to search above that amount.')
      return
    }
    setLoading(true)
    setSearched(true)
    const query = new URLSearchParams({ trips: `${originCode}-${destinationCode}`, travellers, sort })
    if (date) query.set('tripDate', date)
    if (minPrice && maxPrice) query.set('price', `${minPrice}-${maxPrice}`)
    else if (minPrice) query.set('price', minPrice)
    else if (maxPrice) query.set('price', `0-${maxPrice}`)
    try {
      const response = await fetch(`${API_BASE_URL}/flightsService/api/v1/flights?${query}`)
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || payload.success === false) throw new Error(payload.error?.explanation || payload.error?.message || payload.message || 'We couldn’t load flights. Please try again.')
      const now = Date.now()
      const upcomingFlights = Array.isArray(payload.data)
        ? payload.data.filter((flight) => {
            const departureTime = Date.parse(flight.departureTime)
            return Number.isFinite(departureTime) && departureTime > now
          })
        : []
      setFlights(upcomingFlights)
    } catch (requestError) {
      setFlights([])
      setError(requestError.message || 'Could not reach the flight service. Check that the API gateway is running.')
    } finally {
      setLoading(false)
    }
  }

  const swapLocations = () => {
    setOrigin(destination)
    setDestination(origin)
  }

  return (
    <main className="home-page">
      <section className="home-hero" id="home">
        <div className="home-hero-shade" />
        <header className="home-header">
          <Link className="home-brand" to="/" aria-label="SkyLink home"><span className="home-brand-icon"><Plane size={19} /></span><span>Sky<span>Link</span></span></Link>
          <button className="home-menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? 'Close menu' : 'Open menu'}>{menuOpen ? <X /> : <Menu />}</button>
          <nav className={menuOpen ? 'home-nav is-open' : 'home-nav'} aria-label="Main navigation">
            <a className="active" href="#home" onClick={() => setMenuOpen(false)}>Home</a>
            <a href="#why-skylink" onClick={() => setMenuOpen(false)}>Why SkyLink</a>
            <a href="#explore" onClick={() => setMenuOpen(false)}>Explore</a>
            {isSignedIn && <Link to="/my-bookings" onClick={() => setMenuOpen(false)}>My bookings</Link>}
            {isSignedIn && <Link to="/profile" onClick={() => setMenuOpen(false)}>Profile</Link>}
            {isAdmin && <Link to="/admin" onClick={() => setMenuOpen(false)}>Admin dashboard</Link>}
          </nav>
          <div className="home-header-actions">{isSignedIn ? <button type="button" className="home-logout" onClick={handleLogout}><LogOut size={15} /> Log out</button> : <><Link to="/login" className="home-login">Log in</Link><Link to="/signup" className="home-signup">Get started <ArrowUpRight size={15} /></Link></>}</div>
        </header>

        <div className="home-hero-copy">
          <p className="home-kicker"><span /> YOUR NEXT CHAPTER STARTS HERE</p>
          <h1>The world is<br />closer than <em>ever.</em></h1>
          <p className="home-lede">Find a flight that takes you somewhere wonderful.<br className="desktop-break" /> Simple search, thoughtful journeys, all in one place.</p>
          <a className="home-explore-link" href="#flight-search">Find your flight <span><ArrowDown size={16} /></span></a>
        </div>

      </section>

      <section className="search-section" id="flight-search">
        <div className="search-heading"><div><p className="section-kicker">THE JOURNEY BEGINS</p><h2>Where to next?</h2></div><p>Good trips start with a simple search.</p></div>
        <form className="flight-search" onSubmit={searchFlights}>
          <AirportPicker label="DEPARTURE CITY" value={origin} airports={airports} cities={cities} loading={airportLoading} error={airportError} onChange={setOrigin} />
          <button type="button" className="swap-locations" onClick={swapLocations} aria-label="Swap departure and arrival"><ArrowRight size={17} /></button>
          <AirportPicker label="ARRIVAL CITY" value={destination} airports={airports} cities={cities} loading={airportLoading} error={airportError} onChange={setDestination} />
          <label className="search-field search-date"><span><CalendarDays size={16} /> DEPARTURE</span><input aria-label="Departure date" type="date" value={date} min={new Date().toISOString().slice(0, 10)} onChange={(event) => setDate(event.target.value)} /><small>Choose a date</small></label>
          <label className="search-field search-travellers"><span><Users size={16} /> TRAVELLERS</span><select aria-label="Number of travellers" value={travellers} onChange={(event) => setTravellers(event.target.value)}>{[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n} {n === 1 ? 'traveller' : 'travellers'}</option>)}</select><small>Flying together</small></label>
          <button className="search-submit" type="submit" disabled={loading}>{loading ? <span className="search-spinner" /> : <Search size={18} />}<span>{loading ? 'Searching' : 'Search flights'}</span></button>
          <div className="search-filters" aria-label="Additional flight filters">
            <label className="search-filter"><span>MINIMUM PRICE</span><input aria-label="Minimum ticket price" type="number" min="0" step="1" value={minPrice} onChange={(event) => setMinPrice(event.target.value)} placeholder="No minimum" /><small>Minimum only searches up to ₹200,000.</small></label>
            <label className="search-filter"><span>MAXIMUM PRICE</span><input aria-label="Maximum ticket price" type="number" min="0" step="1" value={maxPrice} onChange={(event) => setMaxPrice(event.target.value)} placeholder="No maximum" /><small>Maximum only searches from ₹0.</small></label>
            <label className="search-filter search-filter-sort"><span>SORT RESULTS</span><select aria-label="Sort search results" value={sort} onChange={(event) => setSort(event.target.value)}><option value="departureTime_ASC">Departure: earliest</option><option value="departureTime_DESC">Departure: latest</option><option value="price_ASC,departureTime_ASC">Price: low to high</option><option value="price_DESC,departureTime_ASC">Price: high to low</option></select></label>
          </div>
        </form>
        {searched && <div className="flight-results" aria-live="polite">
          {!error && !loading && <div className="search-results-head"><strong>{flights.length} {flights.length === 1 ? 'flight' : 'flights'} found</strong><span>{date ? `Departing ${date}` : 'Matching your search'}</span></div>}
          {error && <p className="flight-error" role="alert">{error}</p>}
          {!error && !loading && flights.length === 0 && <p className="flight-empty">No flights found for this route. Try another date or destination.</p>}
          {flights.map((flight) => {
            const dateQuery = new URLSearchParams({ date, travellers }).toString()
            const bookingIntent = { flightId: flight.id, flight, date, travellers }
            return <article className="flight-result" key={flight.id}><div className="result-airline"><span className="result-plane"><Plane size={17} /></span><div><strong>{flight.flightNumber}</strong><small>{flight.airplaneDetail?.modelNumber || 'SkyLink flight'}</small></div></div><div className="result-route"><strong>{formatTime(flight.departureTime)}</strong><small className="result-date">{formatFlightDate(flight.departureTime)}</small><span>{flight.departureAirport?.code || flight.departureAirportId}<i /></span><small>{flight.departureAirport?.City?.name || 'Departure'}</small></div><div className="result-duration"><span /><small><Clock3 size={12} /> Direct</small></div><div className="result-route"><strong>{formatTime(flight.arrivalTime)}</strong><small className="result-date">{formatFlightDate(flight.arrivalTime)}</small><span>{flight.arrivalAirport?.code || flight.arrivalAirportId}<i /></span><small>{flight.arrivalAirport?.City?.name || 'Arrival'}</small></div><div className="result-price"><small>{Number(flight.totalSeats) > 0 ? `${flight.totalSeats} seats left` : 'Sold out'}</small><strong>₹{Number(flight.price).toLocaleString('en-IN')}</strong><Link to={isSignedIn ? `/booking/${flight.id}?${dateQuery}` : '/login'} state={{ bookingIntent }} aria-label={isSignedIn ? 'Continue to booking' : 'Sign in to continue'}>Continue <ArrowRight size={14} /></Link></div></article>
          })}
        </div>}
      </section>

      <section className="why-section" id="why-skylink">
        <div className="why-copy"><p className="section-kicker">A BETTER WAY TO FLY</p><h2>More journey.<br /><em>Less hassle.</em></h2><p>Thoughtful tools for the moments before takeoff. Find the right flight, see your options clearly, and get on your way.</p><Link to="/signup" className="text-link">Start exploring <ArrowRight size={16} /></Link></div>
        <div className="benefit-grid">
          <article className="benefit-card benefit-card-tint"><span className="benefit-icon"><Compass size={20} /></span><span className="benefit-number">01</span><h3>Find your way</h3><p>Search routes and discover flights that fit your plans.</p></article>
          <article className="benefit-card"><span className="benefit-icon"><ShieldCheck size={20} /></span><span className="benefit-number">02</span><h3>Book with clarity</h3><p>See flight times, availability, and prices at a glance.</p></article>
          <article className="benefit-card"><span className="benefit-icon"><Sparkles size={20} /></span><span className="benefit-number">03</span><h3>Go somewhere new</h3><p>Your next favorite place is only a few clicks away.</p></article>
        </div>
      </section>

      <section className="explore-banner" id="explore"><div className="explore-copy"><p className="section-kicker">YOUR NEXT DESTINATION</p><h2>Make room for<br /><em>somewhere new.</em></h2><p>Take the first step toward your next great trip. Your journey starts with a flight search.</p></div><a href="#flight-search" className="explore-cta">Explore flights <ArrowUpRight size={17} /></a><span className="explore-sun" /><span className="banner-orbit orbit-one" /><span className="banner-orbit orbit-two" /></section>
        <footer className="home-footer">
          <div className="footer-main">
            <div className="footer-identity">
              <Link className="home-brand footer-brand" to="/"><span className="home-brand-icon"><Plane size={17} /></span><span>Sky<span>Link</span></span></Link>
              <p>Go farther, with SkyLink.</p>
            </div>
            <div className="footer-credit"><span>Designed &amp; developed by</span><strong>Khushi Gupta</strong><span>Department of Computer Science and Engineering</span><span>3rd Year</span></div>
          </div>
          <div className="footer-bottom"><span>© 2026 SkyLink</span><span>Thoughtfully made for journeys worth taking.</span><a href="#home">Back to top <ArrowUpRight size={13} /></a></div>
        </footer>
    </main>
  )
}

function AirportPicker({ label, value, airports, cities, loading, error, onChange }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const inputId = `airport-picker-${label.toLowerCase().replaceAll(' ', '-')}`
  const cityFor = (airport) => cities.find((city) => String(city.id) === String(airport.cityId))?.name || 'City not listed'
  const selectedAirport = airports.find((airport) => String(airport.code).toUpperCase() === String(value).toUpperCase())
  const displayValue = selectedAirport ? `${cityFor(selectedAirport)} · ${selectedAirport.code}` : value
  const matches = airports.filter((airport) => {
    const terms = `${cityFor(airport)} ${airport.name} ${airport.code}`.toLowerCase()
    return terms.includes(search.trim().toLowerCase())
  })

  return (
    <div className={`search-field airport-picker ${open ? 'is-open' : ''}`}>
      <label htmlFor={inputId}><span><MapPin size={16} /> {label}</span></label>
      <input
        id={inputId}
        aria-label={`Search ${label.toLowerCase()}`}
        aria-expanded={open}
        aria-controls={`${inputId}-options`}
        aria-autocomplete="list"
        role="combobox"
        value={open ? search : displayValue}
        onFocus={() => { setSearch(''); setOpen(true) }}
        onChange={(event) => { setSearch(event.target.value); onChange(''); setOpen(true) }}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        placeholder={`Search ${label.toLowerCase()}`}
        autoComplete="off"
      />
      <small>{selectedAirport ? selectedAirport.name : 'Choose a city and airport'}</small>
      {open && <div className="airport-picker-options" id={`${inputId}-options`} role="listbox">
        {loading ? <p>Loading cities and airports…</p> : error ? <p>{error}</p> : matches.length ? matches.map((airport) => <button
          key={airport.id}
          type="button"
          role="option"
          aria-selected={String(airport.code).toUpperCase() === String(value).toUpperCase()}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            onChange(String(airport.code).toUpperCase())
            setSearch('')
            setOpen(false)
          }}
        ><strong>{cityFor(airport)}</strong><span>{airport.name}</span><small>{airport.code}</small></button>) : <p>{airports.length ? 'No matching city or airport.' : 'No airports are available yet.'}</p>}
      </div>}
    </div>
  )
}

export default HomePage
