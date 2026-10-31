import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowDown, ArrowRight, ArrowUpRight, Compass, Globe2, LogOut, Menu, Plane, ShieldCheck, Sparkles, X } from 'lucide-react'
import './HomePage.css'
import { getCurrentUser } from '../services/auth'

function HomePage() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [isSignedIn, setIsSignedIn] = useState(() => Boolean(sessionStorage.getItem('authToken') || localStorage.getItem('authToken')))
  const [isAdmin, setIsAdmin] = useState(false)
  const [isCustomer, setIsCustomer] = useState(false)

  useEffect(() => {
    const token = sessionStorage.getItem('authToken') || localStorage.getItem('authToken')
    if (!token) return
    let active = true
    getCurrentUser(token)
      .then((user) => { if (active) { setIsAdmin(user.roles?.includes('admin') || false); setIsCustomer(user.roles?.includes('customer') || false) } })
      .catch((error) => {
        if (!active) return
        setIsAdmin(false)
        setIsCustomer(false)
        if ([400, 401, 403].includes(error.status)) {
          sessionStorage.removeItem('authToken')
          localStorage.removeItem('authToken')
          setIsSignedIn(false)
        }
      })
    return () => { active = false }
  }, [])

  const handleLogout = () => {
    sessionStorage.removeItem('authToken')
    localStorage.removeItem('authToken')
    setIsSignedIn(false)
    setIsAdmin(false)
    setIsCustomer(false)
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
            <Link to="/flight-search" onClick={() => setMenuOpen(false)}>Search flights</Link>
            {isCustomer && !isAdmin && <Link to="/assistant" onClick={() => setMenuOpen(false)}>AI assistant</Link>}
            <a href="#explore" onClick={() => setMenuOpen(false)}>Explore</a>
            {isSignedIn && <Link to="/my-bookings" onClick={() => setMenuOpen(false)}>My bookings</Link>}
            {isSignedIn && <Link to="/profile" onClick={() => setMenuOpen(false)}>Profile</Link>}
            {isAdmin && <Link to="/admin" onClick={() => setMenuOpen(false)}>Admin dashboard</Link>}
          </nav>
          <div className="home-header-actions">{isSignedIn ? <button type="button" className="home-logout" onClick={handleLogout}><LogOut size={15} /> Log out</button> : <><Link to="/login" className="home-login">Log in</Link><Link to="/signup" className="home-signup">Get started <ArrowUpRight size={15} /></Link></>}</div>
        </header>

        <div className="home-hero-copy">
        <p className="home-kicker home-reveal home-delay-1"><span /> YOUR NEXT CHAPTER STARTS HERE</p>
        <h1 className="home-reveal home-delay-2">The world is<br />closer than <em>ever.</em></h1>
        <p className="home-lede home-reveal home-delay-3">Find a flight that takes you somewhere wonderful.<br className="desktop-break" /> Compare routes, plan with confidence, and keep every part of your journey in one place.</p>
        <Link className="home-explore-link home-reveal home-delay-4" to="/flight-search">Find your flight <span><ArrowDown size={16} /></span></Link>
        </div>
        <div className="home-hero-orbit home-float" aria-hidden="true"><span className="home-orbit-ring home-orbit-ring-one" /><span className="home-orbit-ring home-orbit-ring-two" /><span className="home-orbit-dot home-orbit-dot-one" /><span className="home-orbit-dot home-orbit-dot-two" /><div className="home-route-card"><div><span className="home-route-icon"><Globe2 size={17} /></span><span><small>YOUR NEXT ROUTE</small><strong>Somewhere new</strong></span></div><span className="home-route-arrow"><ArrowUpRight size={16} /></span><p><span>SKYLINK</span><span>READY WHEN YOU ARE</span></p></div></div>

      </section>

      <section className="home-search-cta home-section-reveal" id="flight-search">
        <div className="home-search-cta-copy">
          <p className="section-kicker">THE JOURNEY BEGINS</p>
          <h2>Make your next trip<br /><em>easy to plan.</em></h2>
          <p>Use our dedicated flight search to explore available routes, check schedules and prices, then continue securely when you find the right option.</p>
        </div>
        <Link className="home-search-cta-button" to="/flight-search">Open flight search <ArrowUpRight size={18} /></Link>
      </section>

      <section className="why-section home-section-reveal" id="why-skylink">
        <div className="why-copy"><p className="section-kicker">A BETTER WAY TO FLY</p><h2>More journey.<br /><em>Less hassle.</em></h2><p>SkyLink brings flight discovery and booking into one clear experience. Search by route and date, review the details that matter, and move from planning to confirmation without unnecessary steps.</p><Link to="/signup" className="text-link">Start exploring <ArrowRight size={16} /></Link></div>
        <div className="benefit-grid">
          <article className="benefit-card benefit-card-tint home-card-reveal home-delay-1"><span className="benefit-icon"><Compass size={20} /></span><span className="benefit-number">01</span><h3>Find your way</h3><p>Search routes by airport, date and traveller count so you can focus on the journey ahead.</p></article>
          <article className="benefit-card home-card-reveal home-delay-2"><span className="benefit-icon"><ShieldCheck size={20} /></span><span className="benefit-number">02</span><h3>Book with clarity</h3><p>See flight times, availability and prices together before you continue to secure booking.</p></article>
          <article className="benefit-card home-card-reveal home-delay-3"><span className="benefit-icon"><Sparkles size={20} /></span><span className="benefit-number">03</span><h3>Travel with confidence</h3><p>Keep your bookings organised and get helpful assistance whenever you need it.</p></article>
        </div>
      </section>

      <section className="explore-banner home-section-reveal" id="explore"><div className="explore-copy"><p className="section-kicker">YOUR NEXT DESTINATION</p><h2>Make room for<br /><em>somewhere new.</em></h2><p>Take the first step toward your next great trip. Your journey starts with a flight search.</p></div><Link to="/flight-search" className="explore-cta">Explore flights <ArrowUpRight size={17} /></Link><span className="explore-sun" /><span className="banner-orbit orbit-one" /><span className="banner-orbit orbit-two" /></section>
        <footer className="home-footer">
          <div className="footer-main">
            <div className="footer-identity">
              <Link className="home-brand footer-brand" to="/"><span className="home-brand-icon"><Plane size={17} /></span><span>Sky<span>Link</span></span></Link>
              <p>Simple planning for journeys worth taking.</p>
              <span className="footer-tagline"><Sparkles size={13} /> Search. Choose. Go.</span>
            </div>
            <div className="footer-links">
              <div><strong>Explore</strong><Link to="/flight-search">Search flights</Link><a href="#why-skylink">Why SkyLink</a><a href="#explore">Destinations</a></div>
              <div><strong>For customers</strong>{isSignedIn ? <Link to="/my-bookings">My bookings</Link> : <Link to="/login">Sign in</Link>}{isCustomer && !isAdmin && <Link to="/assistant">AI assistant</Link>}<Link to="/profile">Your profile</Link></div>
              <div><strong>Need help?</strong><a href="mailto:support@skylink.example">Contact support</a><a href="#home">Back to top <ArrowUpRight size={13} /></a></div>
            </div>
            <div className="footer-credit"><span>Designed &amp; developed by</span><strong>Khushi Gupta</strong><span>Department of Computer Science and Engineering · 3rd Year</span></div>
          </div>
          <div className="footer-bottom"><span>© 2026 SkyLink</span><span>Secure booking. Clear journeys.</span></div>
        </footer>
    </main>
  )
}

export default HomePage
