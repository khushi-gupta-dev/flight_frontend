import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertTriangle, ArrowUpRight, Building2, Check, ChevronRight, Clock3, ClipboardList, LayoutDashboard, LogOut, MapPin, Menu, Plane, Plus, Search, ShieldCheck, Users, UserRound, X } from 'lucide-react'
import { getCurrentUser } from '../services/auth'
import { assignRecoveryAlternative, cancelDisruption, createAirplane, createAirport, createCity, createDisruption, createFlight, getAdminBookings, getAdminResources, getDisruptions, getRecoveryOperations, getRecoverySummary, overrideRecoveryOperation, retryDisruption, retryRecoveryOperation } from '../services/admin'
import './AdminDashboard.css'
import './AdminBookings.css'
import './AdminProfileLink.css'
import './Disruptions.css'

const readToken = () => sessionStorage.getItem('authToken') || localStorage.getItem('authToken')

function AdminDashboard() {
  const navigate = useNavigate()
  const [token] = useState(readToken)
  const [profile, setProfile] = useState(null)
  const [authError, setAuthError] = useState('')
  const [authFailure, setAuthFailure] = useState(false)
  const [authRetry, setAuthRetry] = useState(0)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    if (!token) {
      navigate('/login', { replace: true, state: { notice: 'Sign in with an administrator account to continue.' } })
      return
    }
    setChecking(true)
    getCurrentUser(token)
      .then((user) => {
        setAuthFailure(false)
        if (!user.roles?.includes('admin')) {
          setAuthError('This page is for administrator accounts. Your account does not have the admin role.')
          return
        }
        setProfile(user)
      })
      .catch((error) => {
        if ([400, 401].includes(error.status)) {
          sessionStorage.removeItem('authToken')
          localStorage.removeItem('authToken')
          navigate('/login', { replace: true, state: { notice: 'Your session expired. Sign in again to continue.' } })
          return
        }
        setAuthFailure(true)
        setAuthError(error.message || 'We could not verify your administrator access.')
      })
      .finally(() => setChecking(false))
  }, [navigate, token, authRetry])

  const logout = () => {
    sessionStorage.removeItem('authToken')
    localStorage.removeItem('authToken')
    navigate('/login', { replace: true })
  }

  if (checking || !token) return <main className="admin-gate"><span className="admin-loader" /><p>Checking administrator access…</p></main>
  if (!profile) return <main className="admin-gate"><div className="admin-denied"><span className="admin-denied-icon"><ShieldCheck size={24} /></span><p className="admin-eyebrow">SKYLINK ADMIN</p><h1>{authFailure ? 'Could not verify access' : 'Administrator access required'}</h1><p>{authError}</p><div><Link to="/" className="admin-secondary-link">Back to home</Link>{authFailure ? <button onClick={() => setAuthRetry((attempt) => attempt + 1)} className="admin-primary-link">Retry verification</button> : <button onClick={logout} className="admin-primary-link">Sign in as admin</button>}</div></div></main>
  return <AdminWorkspace profile={profile} token={token} onLogout={logout} />
}

function AdminWorkspace({ profile, token, onLogout }) {
  const [activeTab, setActiveTab] = useState('overview')
  const [resources, setResources] = useState({ flights: [], airports: [], airplanes: [], cities: [] })
  const [bookings, setBookings] = useState([])
  const [bookingsLoading, setBookingsLoading] = useState(false)
  const [bookingsError, setBookingsError] = useState('')
  const [disruptions, setDisruptions] = useState([])
  const [disruptionsLoading, setDisruptionsLoading] = useState(false)
  const [disruptionsError, setDisruptionsError] = useState('')
  const [recoveryOperations, setRecoveryOperations] = useState([])
  const [recoverySummary, setRecoverySummary] = useState(null)
  const [recoveryOperationsLoading, setRecoveryOperationsLoading] = useState(false)
  const [recoveryOperationsError, setRecoveryOperationsError] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [dialog, setDialog] = useState('')
  const [notice, setNotice] = useState('')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  const refreshResources = async () => {
    setLoadError('')
    try {
      const data = await getAdminResources(token)
      setResources({ flights: data.flights, airports: data.airports, airplanes: data.airplanes, cities: data.cities })
      setLoadError(data.errors.length ? data.errors.join(' · ') : '')
    } catch (error) {
      setLoadError(error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { refreshResources() }, [token]) // eslint-disable-line react-hooks/exhaustive-deps

  const refreshBookings = async () => {
    setBookingsError('')
    setBookingsLoading(true)
    try {
      const data = await getAdminBookings(token)
      const flightById = new Map(resources.flights.map((flight) => [Number(flight.id), flight]))
      setBookings(Array.isArray(data) ? data.map((booking) => ({ ...booking, flight: flightById.get(Number(booking.flightId)) || null })) : [])
    } catch (error) {
      setBookingsError(error.message || 'Could not load booking activity.')
    } finally {
      setBookingsLoading(false)
    }
  }

  useEffect(() => { if (activeTab === 'bookings' && !loading) refreshBookings() }, [activeTab, token, resources.flights, loading]) // eslint-disable-line react-hooks/exhaustive-deps

  const refreshDisruptions = async () => {
    setDisruptionsError('')
    setDisruptionsLoading(true)
    try {
      const data = await getDisruptions(token)
      setDisruptions(Array.isArray(data) ? data : [])
    } catch (error) {
      setDisruptionsError(error.message || 'Could not load disruptions.')
    } finally {
      setDisruptionsLoading(false)
    }
  }

  useEffect(() => { if (activeTab === 'disruptions') refreshDisruptions() }, [activeTab, token]) // eslint-disable-line react-hooks/exhaustive-deps

  const refreshRecoveryOperations = async (query = '') => {
    setRecoveryOperationsError('')
    setRecoveryOperationsLoading(true)
    try {
      const [rows, summary] = await Promise.all([getRecoveryOperations(token, query), getRecoverySummary(token, query)])
      setRecoveryOperations(Array.isArray(rows) ? rows : [])
      setRecoverySummary(summary)
    } catch (error) {
      setRecoveryOperationsError(error.message || 'Could not load recovery operations.')
    } finally {
      setRecoveryOperationsLoading(false)
    }
  }

  useEffect(() => { if (activeTab === 'recovery') refreshRecoveryOperations() }, [activeTab, token]) // eslint-disable-line react-hooks/exhaustive-deps

  const availableSeats = useMemo(() => resources.flights.reduce((sum, flight) => sum + Number(flight.totalSeats || 0), 0), [resources.flights])
  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'bookings', label: 'Bookings', icon: ClipboardList },
    { id: 'disruptions', label: 'Disruptions', icon: AlertTriangle },
    { id: 'recovery', label: 'Recovery ops', icon: ShieldCheck },
    { id: 'flights', label: 'Flights', icon: Plane },
    { id: 'airports', label: 'Airports', icon: MapPin },
    { id: 'fleet', label: 'Fleet', icon: Building2 },
  ]
  const tabTitle = navItems.find((item) => item.id === activeTab)?.label || 'Overview'
  const openCreate = () => setDialog(activeTab === 'airports' ? 'airport' : activeTab === 'fleet' ? 'airplane' : 'flight')
  const canCreate = ['flights', 'airports', 'fleet'].includes(activeTab)

  const handleCreated = async (label) => {
    setDialog('')
    setNotice(`${label} added successfully.`)
    await refreshResources()
    window.setTimeout(() => setNotice(''), 3500)
  }

  return (
    <main className="admin-app">
      <aside className={`admin-sidebar ${mobileNavOpen ? 'is-open' : ''}`}>
        <Link to="/admin" className="admin-brand" onClick={() => { setActiveTab('overview'); setMobileNavOpen(false) }}><span className="admin-brand-mark"><Plane size={18} /></span><span>Sky<span>Link</span></span></Link>
        <div className="admin-side-label">WORKSPACE</div>
        <nav className="admin-side-nav" aria-label="Administrator navigation">
          {navItems.map(({ id, label, icon: Icon }) => <button key={id} className={activeTab === id ? 'active' : ''} onClick={() => { setActiveTab(id); setMobileNavOpen(false) }}><Icon size={17} /><span>{label}</span>{activeTab === id && <ChevronRight size={15} />}</button>)}
        </nav>
        <div className="admin-sidebar-bottom"><div className="admin-secure-note"><ShieldCheck size={16} /><span>Administrator<br />workspace</span></div><Link to="/" className="admin-customer-link"><ArrowUpRight size={15} /> Open customer site</Link><button className="admin-sidebar-logout" onClick={onLogout}><LogOut size={16} />Sign out</button></div>
      </aside>

      <section className="admin-main">
        <header className="admin-topbar">
          <button className="admin-mobile-menu" onClick={() => setMobileNavOpen((open) => !open)} aria-label="Toggle navigation">{mobileNavOpen ? <X size={19} /> : <Menu size={19} />}</button>
          <div className="admin-breadcrumb"><span>Workspace</span><ChevronRight size={14} /><strong>{tabTitle}</strong></div>
          <div className="admin-top-actions"><span className="admin-live"><i /> Admin verified</span><span className="admin-avatar">{profile.email?.slice(0, 1).toUpperCase() || 'A'}</span><div className="admin-account"><strong>Administrator</strong><small>{profile.email}</small></div><Link to="/profile" className="admin-profile-link" aria-label="Open profile" title="Profile"><UserRound size={16} /><span>Profile</span></Link><button className="admin-top-logout" onClick={onLogout} title="Sign out" aria-label="Sign out"><LogOut size={17} /></button></div>
        </header>

        <div className="admin-content">
          <div className="admin-page-heading"><div><p className="admin-eyebrow">SKYLINK CONTROL CENTER</p><h1>{activeTab === 'overview' ? 'Good to see you' : `Manage ${tabTitle.toLowerCase()}`}<span>{activeTab === 'overview' ? ', admin.' : ''}</span></h1><p>{activeTab === 'overview' ? 'Here’s what’s happening across your flight network.' : `Review and manage your ${tabTitle.toLowerCase()} in one place.`}</p></div>{canCreate && <button className="admin-create-button" onClick={openCreate}><Plus size={17} /> Add {activeTab === 'fleet' ? 'aircraft' : activeTab === 'airports' ? 'airport' : 'flight'}</button>}</div>

          {notice && <div className="admin-notice" role="status"><Check size={16} />{notice}</div>}
          {loadError && <div className="admin-error" role="alert"><span>{loadError}</span><button onClick={refreshResources}>Retry</button></div>}
          {loading ? <div className="admin-loading"><span className="admin-loader" />Loading flight operations…</div> : <>
            {activeTab === 'overview' && <Overview resources={resources} availableSeats={availableSeats} onSelect={setActiveTab} />}
            {activeTab === 'flights' && <FlightsPanel flights={resources.flights} onCreate={openCreate} />}
            {activeTab === 'airports' && <AirportsPanel airports={resources.airports} onCreate={openCreate} />}
            {activeTab === 'fleet' && <FleetPanel airplanes={resources.airplanes} onCreate={openCreate} />}
            {activeTab === 'bookings' && <BookingsPanel bookings={bookings} loading={bookingsLoading} error={bookingsError} onRefresh={refreshBookings} />}
            {activeTab === 'disruptions' && <DisruptionsPanel flights={resources.flights} disruptions={disruptions} loading={disruptionsLoading} error={disruptionsError} token={token} onRefresh={refreshDisruptions} onCreated={handleCreated} />}
            {activeTab === 'recovery' && <RecoveryOperationsPanel flights={resources.flights} cases={recoveryOperations} summary={recoverySummary} loading={recoveryOperationsLoading} error={recoveryOperationsError} token={token} onRefresh={refreshRecoveryOperations} />}
          </>}
        </div>
      </section>

      {dialog && <CreateDialog type={dialog} token={token} airports={resources.airports} airplanes={resources.airplanes} cities={resources.cities} onClose={() => setDialog('')} onCreated={handleCreated} />}
    </main>
  )
}

function Overview({ resources, availableSeats, onSelect }) {
  const stats = [
    { title: 'Scheduled flights', value: resources.flights.length.toLocaleString(), detail: 'Across all routes', icon: Plane, tone: 'rose', action: 'flights' },
    { title: 'Airport network', value: resources.airports.length.toLocaleString(), detail: 'Active airports', icon: MapPin, tone: 'gold', action: 'airports' },
    { title: 'Aircraft in fleet', value: resources.airplanes.length.toLocaleString(), detail: 'Registered aircraft', icon: Building2, tone: 'green', action: 'fleet' },
    { title: 'Seats available', value: availableSeats.toLocaleString(), detail: 'Current flight inventory', icon: Users, tone: 'slate', action: 'flights' },
  ]
  const recentFlights = resources.flights
    .filter((flight) => Number.isFinite(Date.parse(flight.departureTime)) && Date.parse(flight.departureTime) > Date.now())
    .sort((a, b) => Date.parse(a.departureTime) - Date.parse(b.departureTime))
    .slice(0, 5)
  return <>
    <div className="admin-stat-grid">{stats.map(({ title, value, detail, icon: Icon, tone, action }) => <button className="admin-stat-card" key={title} onClick={() => onSelect(action)}><span className={`admin-stat-icon ${tone}`}><Icon size={18} /></span><span className="admin-stat-arrow"><ArrowUpRight size={15} /></span><span className="admin-stat-title">{title}</span><strong>{value}</strong><small>{detail}</small></button>)}</div>
    <div className="admin-overview-grid">
      <section className="admin-panel admin-recent-panel"><div className="admin-panel-head"><div><h2>Upcoming flights</h2><p>Scheduled service in your network</p></div><button onClick={() => onSelect('flights')}>View all <ArrowUpRight size={14} /></button></div><FlightTable flights={recentFlights} compact /></section>
      <section className="admin-panel admin-quick-panel"><div className="admin-panel-head"><div><h2>Quick actions</h2><p>Keep your network up to date</p></div></div><button onClick={() => onSelect('flights')}><span className="quick-action-icon rose"><Plane size={17} /></span><span><strong>Manage flights</strong><small>Review routes and schedules</small></span><ChevronRight size={16} /></button><button onClick={() => onSelect('bookings')}><span className="quick-action-icon slate"><ClipboardList size={17} /></span><span><strong>Review bookings</strong><small>Check customer reservations and status</small></span><ChevronRight size={16} /></button><button onClick={() => onSelect('airports')}><span className="quick-action-icon gold"><MapPin size={17} /></span><span><strong>Airport network</strong><small>View connected airports</small></span><ChevronRight size={16} /></button><button onClick={() => onSelect('fleet')}><span className="quick-action-icon green"><Building2 size={17} /></span><span><strong>Manage fleet</strong><small>Review aircraft capacity</small></span><ChevronRight size={16} /></button></section>
    </div>
    <div className="admin-info-strip"><ShieldCheck size={17} /><p><strong>Protected administrator workspace</strong><span>All flight, airport, and fleet changes are verified by the API Gateway.</span></p><span className="admin-info-badge">ADMIN ACCESS</span></div>
  </>
}

function FlightsPanel({ flights, onCreate }) {
  return <section className="admin-panel admin-list-panel"><div className="admin-panel-head"><div><h2>All flights <span className="admin-count">{flights.length}</span></h2><p>Flight schedules and remaining seat inventory</p></div><button className="admin-create-button small" onClick={onCreate}><Plus size={16} /> Add flight</button></div><FlightTable flights={flights} /></section>
}

function FlightTable({ flights, compact = false }) {
  if (!flights.length) return <div className="admin-empty"><span><Plane size={21} /></span><strong>No flights yet</strong><p>Create a flight to see schedules and inventory here.</p></div>
  return <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Flight</th><th>Route</th><th>Departure</th><th>Available seats</th><th>Status</th></tr></thead><tbody>{flights.map((flight) => <tr key={flight.id}><td><span className="table-flight-icon"><Plane size={14} /></span><strong>{flight.flightNumber}</strong></td><td>{flight.departureAirport?.code || flight.departureAirportId}<span className="route-dash">→</span>{flight.arrivalAirport?.code || flight.arrivalAirportId}</td><td>{formatDate(flight.departureTime)}</td><td>{flight.totalSeats ?? '—'}</td><td><span className={`admin-status ${Number(flight.totalSeats) > 0 ? 'available' : 'full'}`}><i />{Number(flight.totalSeats) > 0 ? 'Available' : 'Full'}</span></td></tr>)}</tbody></table>{compact && flights.length < 5 && <p className="admin-table-foot"><Clock3 size={13} /> Showing the next {flights.length} scheduled flight{flights.length === 1 ? '' : 's'}</p>}</div>
}

function DisruptionsPanel({ flights, disruptions, loading, error, token, onRefresh, onCreated }) {
  const [form, setForm] = useState({ flightId: '', type: 'cancellation', severity: 'high', reason: '', effectiveAt: '', delayMinutes: '' })
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  const submit = async (event) => {
    event.preventDefault()
    setFormError('')
    setSubmitting(true)
    try {
      await createDisruption(token, { ...form, flightId: Number(form.flightId), idempotencyKey: `admin-disruption-${crypto.randomUUID()}` })
      setForm({ flightId: '', type: 'cancellation', severity: 'high', reason: '', effectiveAt: '', delayMinutes: '' })
      onCreated('Disruption')
      await onRefresh()
    } catch (submitError) {
      setFormError(submitError.message)
    } finally {
      setSubmitting(false)
    }
  }

  const action = async (operation, id) => {
    try {
      await operation(token, id)
      await onRefresh()
    } catch (actionError) {
      setFormError(actionError.message)
    }
  }

  return <div className="disruption-workspace">
    <section className="admin-panel disruption-hero">
      <div><span className="disruption-icon"><AlertTriangle size={20} /></span><div><p className="admin-eyebrow">PHASE 1 · EVENT SIMULATOR</p><h2>Test disruption recovery safely</h2><p>Create a realistic operational event. The system persists it and publishes a durable event for the recovery workflow.</p></div></div>
      <span className="disruption-pill"><i /> RabbitMQ event ready</span>
    </section>
    <div className="disruption-grid">
      <section className="admin-panel disruption-form-panel"><div className="admin-panel-head"><div><h2>Simulate disruption</h2><p>Only future flights should be selected.</p></div></div>
        <form className="admin-form disruption-form" onSubmit={submit}>
          <label>Flight<select value={form.flightId} onChange={(event) => setForm({ ...form, flightId: event.target.value })} required><option value="" disabled>Select a scheduled flight</option>{flights.filter((flight) => new Date(flight.departureTime) > new Date()).map((flight) => <option key={flight.id} value={flight.id}>{flight.flightNumber} · {flight.departureAirportId} → {flight.arrivalAirportId}</option>)}</select></label>
          <div className="admin-form-row"><label>Event type<select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}><option value="cancellation">Cancellation</option><option value="delay">Delay</option><option value="overbooking">Overbooking</option><option value="airport_closure">Airport closure</option></select></label><label>Severity<select value={form.severity} onChange={(event) => setForm({ ...form, severity: event.target.value })}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select></label></div>
          {form.type === 'delay' && <label>Delay duration (minutes)<input type="number" min="1" value={form.delayMinutes} onChange={(event) => setForm({ ...form, delayMinutes: event.target.value })} required /></label>}
          <label>Effective time<input type="datetime-local" value={form.effectiveAt} onChange={(event) => setForm({ ...form, effectiveAt: event.target.value })} required /></label>
          <label>Reason<textarea rows="3" maxLength="500" value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} placeholder="Aircraft unavailable, severe weather..." required /></label>
          {formError && <p className="admin-form-error" role="alert">{formError}</p>}
          <button className="admin-create-button" disabled={submitting || !flights.length}>{submitting ? 'Publishing event…' : <><AlertTriangle size={16} /> Publish disruption</>}</button>
        </form>
      </section>
      <section className="admin-panel disruption-list-panel"><div className="admin-panel-head"><div><h2>Event activity <span className="admin-count">{disruptions.length}</span></h2><p>Published and retryable operational events</p></div><button onClick={onRefresh}>Refresh</button></div>
        {loading ? <div className="admin-loading"><span className="admin-loader" />Loading events…</div> : error ? <div className="admin-error"><span>{error}</span><button onClick={onRefresh}>Retry</button></div> : !disruptions.length ? <div className="admin-empty disruption-empty"><span><AlertTriangle size={21} /></span><strong>No disruptions simulated</strong><p>Publish an event to start the recovery workflow.</p></div> : <div className="disruption-events">{disruptions.map((disruption) => <article className="disruption-event" key={disruption.id}><div className={`disruption-status ${disruption.status}`}><i />{disruption.status}</div><strong>{disruption.flight?.flightNumber || `Flight ${disruption.flightId}`}</strong><p>{disruption.type.replaceAll('_', ' ')} · {disruption.reason}</p><small>{formatDate(disruption.createdAt)} · {disruption.severity}</small>{disruption.status === 'failed' && <button className="disruption-action" onClick={() => action(retryDisruption, disruption.id)}>Retry publication</button>}{disruption.status === 'created' && <button className="disruption-action" onClick={() => action(cancelDisruption, disruption.id)}>Cancel event</button>}</article>)}</div>}
      </section>
    </div>
  </div>
}

function RecoveryOperationsPanel({ flights, cases, summary, loading, error, token, onRefresh }) {
  const [filters, setFilters] = useState({ status: '', disruptionId: '', from: '', to: '' })
  const [working, setWorking] = useState('')
  const [action, setAction] = useState(null)
  const [actionError, setActionError] = useState('')

  const applyFilters = (event) => {
    event.preventDefault()
    const query = new URLSearchParams(Object.entries(filters).filter(([, value]) => value)).toString()
    onRefresh(query)
  }
  const run = async (operation, id, data = {}) => {
    setWorking(`${operation.name}-${id}`)
    setActionError('')
    try {
      await operation(token, id, data)
      setAction(null)
      const query = new URLSearchParams(Object.entries(filters).filter(([, value]) => value)).toString()
      await onRefresh(query)
    } catch (actionRequestError) {
      setActionError(actionRequestError.message)
    } finally {
      setWorking('')
    }
  }
  const statCards = [
    ['Affected passengers', summary?.affectedPassengers || 0, 'rose'],
    ['Recovery cases', summary?.recoveryCases || 0, 'slate'],
    ['Awaiting approval', summary?.awaitingApproval || 0, 'gold'],
    ['Successful rebookings', summary?.successfulRebookings || 0, 'green'],
    ['Failed rebookings', summary?.failedRebookings || 0, 'rose'],
  ]
  return <div className="recovery-ops-workspace">
    <div className="recovery-ops-stats">{statCards.map(([label, value, tone]) => <article className={`recovery-ops-stat ${tone}`} key={label}><small>{label}</small><strong>{Number(value).toLocaleString()}</strong></article>)}</div>
    <section className="admin-panel recovery-ops-filter"><form onSubmit={applyFilters}><label>Status<select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}><option value="">All statuses</option><option value="awaiting_approval">Awaiting approval</option><option value="rebooking">Rebooking</option><option value="completed">Completed</option><option value="failed">Failed</option><option value="declined">Declined</option></select></label><label>Disruption ID<input type="number" min="1" value={filters.disruptionId} onChange={(event) => setFilters({ ...filters, disruptionId: event.target.value })} placeholder="All" /></label><label>From<input type="date" value={filters.from} onChange={(event) => setFilters({ ...filters, from: event.target.value })} /></label><label>To<input type="date" value={filters.to} onChange={(event) => setFilters({ ...filters, to: event.target.value })} /></label><button className="admin-create-button small" type="submit"><Search size={14} /> Filter</button><button className="recovery-ops-clear" type="button" onClick={() => { setFilters({ status: '', disruptionId: '', from: '', to: '' }); onRefresh() }}>Clear</button></form></section>
    {error && <div className="admin-error"><span>{error}</span><button onClick={() => onRefresh()}>Retry</button></div>}
    {actionError && <div className="admin-error"><span>{actionError}</span><button onClick={() => setActionError('')}>Dismiss</button></div>}
    <section className="admin-panel recovery-ops-table"><div className="admin-panel-head"><div><h2>Recovery operations <span className="admin-count">{cases.length}</span></h2><p>Monitor passenger impact and intervene without bypassing the rebooking saga.</p></div><button onClick={() => onRefresh()}>Refresh</button></div>{loading ? <div className="admin-loading"><span className="admin-loader" />Loading recovery operations…</div> : !cases.length ? <div className="admin-empty"><span><ShieldCheck size={21} /></span><strong>No recovery cases match these filters</strong><p>Cases will appear after a disruption reaches a paid booking.</p></div> : <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Case</th><th>Booking</th><th>Passenger</th><th>Status</th><th>Alternatives</th><th>Created</th><th>Actions</th></tr></thead><tbody>{    cases.map((recoveryCase) => <RecoveryOperationRow key={recoveryCase.id} recoveryCase={recoveryCase} working={working} onAction={setAction} />)}</tbody></table></div>}</section>
    {action && <RecoveryOperationDialog action={action} flights={flights} working={working} error={actionError} onClose={() => { setAction(null); setActionError('') }} onSubmit={(operation, data) => run(operation, action.id, data)} />}
  </div>
}

function RecoveryOperationRow({ recoveryCase, working, onAction }) {
  const passenger = recoveryCase.booking?.passengerDetails?.[0] || {}
  const selected = recoveryCase.alternatives?.find((alternative) => alternative.id === recoveryCase.selectedAlternativeId)
  const details = { id: recoveryCase.id, alternatives: recoveryCase.alternatives || [], audit: recoveryCase.audit || [] }
  return <tr className="recovery-ops-row"><td><strong>#{recoveryCase.id}</strong><small>Disruption #{recoveryCase.disruptionId}</small></td><td>#{recoveryCase.bookingId}<small>{recoveryCase.booking?.noOfSeats || 0} passenger(s)</small></td><td>{passenger.fullName || `User ${recoveryCase.userId}`}<small>{passenger.email || 'Email unavailable'}</small></td><td><span className={`recovery-ops-status ${recoveryCase.status}`}>{recoveryCase.status.replaceAll('_', ' ')}</span></td><td>{recoveryCase.alternatives?.length || 0}{selected && <small>Selected #{selected.replacementFlightId}</small>}</td><td>{formatDate(recoveryCase.createdAt)}</td><td><div className="recovery-ops-actions">{recoveryCase.status === 'failed' && <button disabled={working === `retryRecoveryOperation-${recoveryCase.id}`} onClick={() => onAction({ ...details, type: 'retry' })}>Retry</button>}{['awaiting_alternatives', 'failed', 'awaiting_approval'].includes(recoveryCase.status) && <button onClick={() => onAction({ ...details, type: 'assign' })}>Assign</button>}<button onClick={() => onAction({ ...details, type: 'timeline' })}>Audit</button>{['awaiting_approval', 'failed', 'rebooking'].includes(recoveryCase.status) && <button onClick={() => onAction({ ...details, type: 'override' })}>Override</button>}</div></td></tr>
}

function RecoveryOperationDialog({ action, flights, working, error, onClose, onSubmit }) {
  const [flightId, setFlightId] = useState('')
  const [alternativeId, setAlternativeId] = useState('')
  const [reason, setReason] = useState('')
  const submit = (event) => {
    event.preventDefault()
    if (action.type === 'retry') return onSubmit(retryRecoveryOperation)
    if (action.type === 'assign') return onSubmit(assignRecoveryAlternative, { flightId: Number(flightId), reason })
    if (action.type === 'override') return onSubmit(overrideRecoveryOperation, { action: alternativeId ? 'approve_rebooking' : 'close', alternativeId: Number(alternativeId), reason })
  }
  if (action.type === 'timeline') return <div className="admin-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><section className="admin-modal recovery-audit-dialog"><div className="admin-modal-head"><div><p className="admin-eyebrow">CASE #{action.id}</p><h2>Audit timeline</h2></div><button onClick={onClose}><X size={19} /></button></div><div className="recovery-admin-timeline">{(action.audit || []).map((event) => <div key={event.id}><i /><span><strong>{event.eventType.replaceAll('_', ' ')}</strong><small>{formatDate(event.createdAt)} · {event.actorType}</small></span></div>)}</div></section></div>
  return <div className="admin-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><section className="admin-modal"><div className="admin-modal-head"><div><p className="admin-eyebrow">RECOVERY OPERATIONS</p><h2>{action.type === 'retry' ? 'Retry rebooking' : action.type === 'assign' ? 'Assign alternative' : 'Operational override'}</h2></div><button onClick={onClose}><X size={19} /></button></div><form className="admin-form" onSubmit={submit}>{action.type === 'assign' && <label>Replacement flight<select value={flightId} onChange={(event) => setFlightId(event.target.value)} required><option value="" disabled>Select a future flight</option>{flights.filter((flight) => Number(flight.totalSeats) > 0).map((flight) => <option key={flight.id} value={flight.id}>{flight.flightNumber} · {flight.departureAirportId} → {flight.arrivalAirportId} · {flight.totalSeats} seats</option>)}</select></label>}{action.type === 'override' && <label>Override action<select value={alternativeId ? 'approve' : 'close'} onChange={(event) => setAlternativeId(event.target.value === 'approve' ? String(action.alternatives?.[0]?.id || '') : '')}><option value="close">Close case</option><option value="approve" disabled={!action.alternatives?.length}>Approve first available alternative</option></select></label>}{action.type === 'override' && alternativeId && <label>Alternative ID<input type="number" min="1" value={alternativeId} onChange={(event) => setAlternativeId(event.target.value)} required /></label>}{action.type !== 'retry' && <label>Reason<textarea rows="3" value={reason} onChange={(event) => setReason(event.target.value)} minLength="5" placeholder="Document the operational decision..." required /></label>}{error && <p className="admin-form-error">{error}</p>}<div className="admin-form-actions"><button type="button" className="admin-cancel" onClick={onClose}>Cancel</button><button className="admin-create-button" disabled={Boolean(working)}>{working ? 'Working…' : 'Confirm action'}</button></div></form></section></div>
}

function BookingsPanel({ bookings, loading, error, onRefresh }) {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [selected, setSelected] = useState(null)
  const counts = ['booked', 'cancellation_requested', 'initiated', 'pending', 'cancelled'].map((value) => ({
    value,
    count: bookings.filter((booking) => booking.status === value).length,
  }))
  const filteredBookings = bookings.filter((booking) => {
    const passenger = booking.passengerDetails?.[0] || {}
    const searchable = [booking.id, booking.userId, booking.flight?.flightNumber, booking.flight?.departureAirportId, booking.flight?.arrivalAirportId, passenger.fullName, passenger.email]
      .filter(Boolean).join(' ').toLowerCase()
    return (status === 'all' || booking.status === status) && searchable.includes(query.trim().toLowerCase())
  })
  const flightRoute = (flight) => `${flight?.departureAirport?.code || flight?.departureAirportId || '—'} → ${flight?.arrivalAirport?.code || flight?.arrivalAirportId || '—'}`

  return <>
    <div className="admin-booking-stats">{counts.map(({ value, count }) => <article className={`admin-booking-stat booking-${value}`} key={value}><span>{value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())}</span><strong>{count.toLocaleString()}</strong></article>)}</div>
    <section className="admin-panel admin-list-panel admin-bookings-panel">
      <div className="admin-panel-head"><div><h2>All bookings <span className="admin-count">{bookings.length}</span></h2><p>Customer reservations across the flight network</p></div><button className="admin-booking-refresh" type="button" onClick={onRefresh} disabled={loading}><Clock3 size={14} /> Refresh</button></div>
      <div className="admin-booking-tools"><label className="admin-booking-search"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search booking, flight, passenger…" aria-label="Search bookings" /></label><label className="admin-booking-status-filter"><span>Status</span><select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter bookings by status"><option value="all">All statuses</option>{counts.map(({ value }) => <option value={value} key={value}>{value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())}</option>)}</select></label></div>
      {error && <div className="admin-error admin-bookings-error" role="alert"><span>{error}</span><button onClick={onRefresh}>Retry</button></div>}
      {loading ? <div className="admin-loading"><span className="admin-loader" />Loading bookings…</div> : filteredBookings.length ? <div className="admin-table-wrap"><table className="admin-table admin-bookings-table"><thead><tr><th>Booking</th><th>Customer</th><th>Flight / route</th><th>Departure</th><th>Travellers</th><th>Total</th><th>Created</th><th>Status</th><th /></tr></thead><tbody>{filteredBookings.map((booking) => {
        const primaryPassenger = booking.passengerDetails?.[0]
        return <tr key={booking.id}><td><strong>#{booking.id}</strong></td><td><strong>{primaryPassenger?.fullName || `Customer #${booking.userId}`}</strong><small className="admin-booking-subline">{primaryPassenger?.email || `User ID ${booking.userId}`}</small></td><td><strong>{booking.flight?.flightNumber || `Flight #${booking.flightId}`}</strong><small className="admin-booking-subline">{flightRoute(booking.flight)}</small></td><td>{formatDate(booking.flight?.departureTime)}</td><td>{booking.noOfSeats}</td><td>₹{Number(booking.totalCost).toLocaleString('en-IN')}</td><td>{formatDate(booking.createdAt)}</td><td><span className={`admin-status booking-status-${booking.status}`}><i />{booking.status.replaceAll('_', ' ')}</span></td><td><button className="admin-booking-details-button" onClick={() => setSelected(booking)}>Details</button></td></tr>
      })}</tbody></table></div> : <div className="admin-empty"><span><ClipboardList size={21} /></span><strong>{bookings.length ? 'No matching bookings' : 'No bookings yet'}</strong><p>{bookings.length ? 'Try another search or booking status.' : 'Customer bookings will appear here when reservations are made.'}</p></div>}
      {!loading && <div className="admin-table-foot">Showing {filteredBookings.length} of {bookings.length} bookings</div>}
    </section>
    {selected && <div className="admin-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null) }}><section className="admin-modal admin-booking-detail-modal" role="dialog" aria-modal="true" aria-labelledby="admin-booking-detail-title"><div className="admin-modal-head"><div><p className="admin-eyebrow">BOOKING REVIEW</p><h2 id="admin-booking-detail-title">Booking #{selected.id}</h2></div><button type="button" onClick={() => setSelected(null)} aria-label="Close booking details"><X size={19} /></button></div><div className="admin-booking-detail-content"><div className="admin-booking-detail-overview"><span>STATUS</span><strong className={`admin-status booking-status-${selected.status}`}><i />{selected.status.replaceAll('_', ' ')}</strong></div><div className="admin-booking-detail-grid"><div><span>Customer</span><strong>{selected.passengerDetails?.[0]?.fullName || `User #${selected.userId}`}</strong><small>{selected.passengerDetails?.[0]?.email || 'Customer email unavailable'}</small><small>{selected.passengerDetails?.[0]?.phone || 'Phone unavailable'}</small></div><div><span>Flight</span><strong>{selected.flight?.flightNumber || `Flight #${selected.flightId}`}</strong><small>{flightRoute(selected.flight)}</small><small>Departs {formatDate(selected.flight?.departureTime)}</small></div><div><span>Travellers</span><strong>{selected.noOfSeats}</strong><small>Total fare · ₹{Number(selected.totalCost).toLocaleString('en-IN')}</small></div><div><span>Booking created</span><strong>{formatDate(selected.createdAt)}</strong><small>Reference #{selected.id}</small></div></div><div className="admin-booking-passenger-details"><h3>Passenger details</h3>{selected.passengerDetails?.length ? selected.passengerDetails.map((passenger, index) => <article key={`${selected.id}-${index}`}><span>{index + 1}</span><div><strong>{passenger.fullName}</strong><small>{passenger.email} · {passenger.phone}</small></div></article>) : <p>No passenger details were recorded.</p>}</div></div></section></div>}
  </>
}

function AirportsPanel({ airports, onCreate }) {
  return <section className="admin-panel admin-list-panel"><div className="admin-panel-head"><div><h2>Airport network <span className="admin-count">{airports.length}</span></h2><p>Airports registered with the flight service</p></div><button className="admin-create-button small" onClick={onCreate}><Plus size={16} /> Add airport</button></div>{airports.length ? <div className="admin-card-grid">{airports.map((airport) => <article className="admin-resource-card" key={airport.id}><span className="quick-action-icon rose"><MapPin size={18} /></span><span className="admin-resource-code">{airport.code}</span><h3>{airport.name}</h3><p>{airport.address || 'Address not provided'}</p><small>Airport ID · {airport.id}</small></article>)}</div> : <EmptyResource icon={MapPin} label="airports" />}</section>
}

function FleetPanel({ airplanes, onCreate }) {
  return <section className="admin-panel admin-list-panel"><div className="admin-panel-head"><div><h2>Aircraft fleet <span className="admin-count">{airplanes.length}</span></h2><p>Aircraft and configured passenger capacity</p></div><button className="admin-create-button small" onClick={onCreate}><Plus size={16} /> Add aircraft</button></div>{airplanes.length ? <div className="admin-card-grid">{airplanes.map((airplane) => <article className="admin-resource-card" key={airplane.id}><span className="quick-action-icon green"><Plane size={18} /></span><span className="admin-resource-code">ID · {airplane.id}</span><h3>{airplane.modelNumber}</h3><p>{Number(airplane.capacity).toLocaleString()} seats configured</p><small>Registered aircraft</small></article>)}</div> : <EmptyResource icon={Building2} label="aircraft" />}</section>
}

function EmptyResource({ icon: Icon, label }) {
  return <div className="admin-empty"><span><Icon size={21} /></span><strong>No {label} found</strong><p>Register {label === 'aircraft' ? 'an aircraft' : 'an airport'} to populate this section.</p></div>
}

function CreateDialog({ type, token, airports, airplanes, cities, onClose, onCreated }) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [selectedAircraftCapacity, setSelectedAircraftCapacity] = useState('')
  const [newCityName, setNewCityName] = useState('')
  const [creatingCity, setCreatingCity] = useState(false)
  const [createdCities, setCreatedCities] = useState([])
  const [selectedCityId, setSelectedCityId] = useState('')
  const title = type === 'flight' ? 'Schedule a flight' : type === 'airport' ? 'Register an airport' : 'Add aircraft to fleet'

  const handleCreateCity = async () => {
    const name = newCityName.trim()
    if (!name) {
      setError('Enter a city name first.')
      return
    }
    setCreatingCity(true)
    setError('')
    try {
      const city = await createCity(token, { name })
      setCreatedCities((current) => [...current, city])
      setSelectedCityId(String(city.id))
      setNewCityName('')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setCreatingCity(false)
    }
  }

  const submit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    const form = new FormData(event.currentTarget)
    const value = (name) => String(form.get(name) || '').trim()
    try {
      if (type === 'flight') {
        if (value('departureAirportId') === value('arrivalAirportId')) {
          throw new Error('Departure and arrival airports must be different.')
        }
        const departureTime = new Date(value('departureTime'))
        const arrivalTime = new Date(value('arrivalTime'))
        if (Number.isNaN(departureTime.getTime()) || Number.isNaN(arrivalTime.getTime()) || departureTime >= arrivalTime) {
          throw new Error('Arrival time must be later than departure time.')
        }
        const selectedAirplane = airplanes.find((airplane) => Number(airplane.id) === Number(value('airplaneId')))
        const seats = Number(value('totalSeats'))
        if (selectedAirplane && seats > Number(selectedAirplane.capacity)) {
          throw new Error(`Available seats cannot exceed this aircraft’s capacity of ${selectedAirplane.capacity}.`)
        }
        await createFlight(token, {
          flightNumber: value('flightNumber'), airplaneId: Number(value('airplaneId')),
          departureAirportId: value('departureAirportId'), arrivalAirportId: value('arrivalAirportId'),
          departureTime: departureTime.toISOString(), arrivalTime: arrivalTime.toISOString(),
          price: Number(value('price')), boardingGate: value('boardingGate'), totalSeats: Number(value('totalSeats')),
        })
      } else if (type === 'airport') {
        await createAirport(token, { name: value('name'), code: value('code').toUpperCase(), address: value('address'), cityId: Number(selectedCityId || value('cityId')) })
      } else {
        await createAirplane(token, { modelNumber: value('modelNumber'), capacity: Number(value('capacity')) })
      }
      await onCreated(type === 'airplane' ? 'Aircraft' : type[0].toUpperCase() + type.slice(1))
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSubmitting(false)
    }
  }

  return <div className="admin-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><section className="admin-modal" role="dialog" aria-modal="true" aria-labelledby="create-title"><div className="admin-modal-head"><div><p className="admin-eyebrow">FLIGHT OPERATIONS</p><h2 id="create-title">{title}</h2></div><button onClick={onClose} aria-label="Close dialog"><X size={19} /></button></div><form onSubmit={submit} className="admin-form">
    {type === 'flight' && <>
      <label>Flight number<input name="flightNumber" placeholder="e.g. SL-204" required /></label>
      <label>Aircraft<select name="airplaneId" required defaultValue="" onChange={(event) => setSelectedAircraftCapacity(airplanes.find((airplane) => String(airplane.id) === event.target.value)?.capacity || '')}><option value="" disabled>Select aircraft</option>{airplanes.map((airplane) => <option key={airplane.id} value={airplane.id}>{airplane.modelNumber} · {airplane.capacity} seats</option>)}</select></label>
      <div className="admin-form-row"><label>Departure airport<select name="departureAirportId" required defaultValue=""><option value="" disabled>Select airport</option>{airports.map((airport) => <option key={airport.id} value={airport.code}>{airport.code} · {airport.name}</option>)}</select></label><label>Arrival airport<select name="arrivalAirportId" required defaultValue=""><option value="" disabled>Select airport</option>{airports.map((airport) => <option key={airport.id} value={airport.code}>{airport.code} · {airport.name}</option>)}</select></label></div>
      <div className="admin-form-row"><label>Departure time<input type="datetime-local" name="departureTime" required /></label><label>Arrival time<input type="datetime-local" name="arrivalTime" required /></label></div>
      <div className="admin-form-row"><label>Ticket price<input type="number" name="price" min="1" placeholder="₹ 5,400" required /></label><label>Available seats<input type="number" name="totalSeats" min="1" max={selectedAircraftCapacity || undefined} placeholder="180" required /><small>{selectedAircraftCapacity ? `Maximum for this aircraft: ${selectedAircraftCapacity} seats.` : 'Select an aircraft to see its seat limit.'}</small></label></div>
      <label>Boarding gate <span className="admin-optional">Optional</span><input name="boardingGate" placeholder="e.g. A12" /></label>
      {!airports.length && <p className="admin-form-hint">Add airports before scheduling a flight.</p>}{!airplanes.length && <p className="admin-form-hint">Register an aircraft before scheduling a flight.</p>}
    </>}
    {type === 'airport' && <><label>Airport name<input name="name" placeholder="Indira Gandhi International Airport" required /></label><div className="admin-form-row"><label>Airport code<input name="code" maxLength="3" minLength="3" pattern="[A-Za-z]{3}" placeholder="DEL" required /><small>Enter a 3-letter airport code.</small></label><label>City<select name="cityId" required value={selectedCityId} onChange={(event) => setSelectedCityId(event.target.value)}><option value="" disabled>Select a city</option>{[...cities, ...createdCities].map((city) => <option key={city.id} value={city.id}>{city.name} · ID {city.id}</option>)}</select>{!cities.length && !createdCities.length && <small>No cities are available. Add a city below.</small>}</label></div><div className="admin-city-create"><input aria-label="New city name" value={newCityName} onChange={(event) => setNewCityName(event.target.value)} placeholder="New city name" /><button type="button" className="admin-cancel" onClick={handleCreateCity} disabled={creatingCity}>{creatingCity ? 'Adding city…' : 'Add city'}</button></div><label>Address<input name="address" placeholder="City or terminal address" required /></label></>}
    {type === 'airplane' && <><label>Aircraft model<input name="modelNumber" placeholder="Airbus 320" pattern="[A-Za-z0-9]+( [A-Za-z0-9]+)*" title="Use letters and numbers, with single spaces between words." required /><small>Use letters and numbers; spaces between words are allowed.</small></label><label>Passenger capacity<input type="number" name="capacity" min="1" max="1000" placeholder="180" required /></label></>}
    {error && <p className="admin-form-error" role="alert">{error}</p>}
    <div className="admin-form-actions"><button type="button" className="admin-cancel" onClick={onClose}>Cancel</button><button type="submit" className="admin-create-button" disabled={submitting}>{submitting ? 'Saving…' : <><Check size={16} /> Save {type === 'airplane' ? 'aircraft' : type}</>}</button></div>
  </form></section></div>
}

function formatDate(value) {
  if (!value || Number.isNaN(new Date(value).getTime())) return '—'
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
}

export default AdminDashboard
