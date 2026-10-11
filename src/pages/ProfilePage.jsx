import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, CalendarDays, Mail, Plane, ShieldCheck, UserRound } from 'lucide-react'
import { getCurrentUser } from '../services/auth'
import './ProfilePage.css'

function ProfilePage() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const token = sessionStorage.getItem('authToken') || localStorage.getItem('authToken') || ''

  useEffect(() => {
    let active = true
    if (!token) {
      navigate('/login', { replace: true, state: { from: '/profile' } })
      return () => { active = false }
    }
    getCurrentUser(token)
      .then((user) => { if (active) setProfile(user) })
      .catch((requestError) => { if (active) setError(requestError.message || 'Could not load your profile.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [navigate, token])

  const isAdmin = profile?.roles?.includes('admin')

  return <main className="profile-page">
    <header className="profile-header"><Link className="profile-brand" to="/"><span><Plane size={17} /></span>Sky<span>Link</span></Link><Link to={isAdmin ? '/admin' : '/'} className="profile-return"><ArrowLeft size={15} /> {isAdmin ? 'Admin dashboard' : 'Back to home'}</Link></header>
    <section className="profile-content">
      <p className="profile-kicker">YOUR SKYLINK ACCOUNT</p>
      <h1>Your profile</h1>
      <p className="profile-intro">Your account details and access level.</p>
      {loading ? <div className="profile-card profile-state">Loading your profile…</div> : error ? <div className="profile-card profile-state"><p className="profile-error" role="alert">{error}</p><Link className="profile-primary-link" to="/login" state={{ from: '/profile' }}>Sign in again</Link></div> : profile && <>
        <article className="profile-card profile-identity"><div className="profile-avatar"><UserRound size={25} /></div><div><h2>{profile.email}</h2><p>SkyLink account · ID {profile.id}</p></div><span className="profile-verified"><ShieldCheck size={14} /> Verified</span></article>
        <section className="profile-card profile-details"><p className="profile-section-label">ACCOUNT INFORMATION</p><div className="profile-detail-row"><span className="profile-detail-icon"><Mail size={17} /></span><div><small>Email address</small><strong>{profile.email}</strong></div></div><div className="profile-detail-row"><span className="profile-detail-icon"><ShieldCheck size={17} /></span><div><small>Account role</small><strong>{profile.roles?.length ? profile.roles.map((role) => role.replaceAll('_', ' ')).join(', ') : 'Customer'}</strong></div></div></section>
        <section className="profile-card profile-shortcuts"><p className="profile-section-label">YOUR SKYLINK</p><Link to="/my-bookings"><span className="profile-detail-icon"><CalendarDays size={17} /></span><span><strong>My bookings</strong><small>View upcoming and past trips</small></span><ArrowRight size={15} /></Link>{isAdmin && <Link to="/admin"><span className="profile-detail-icon"><ShieldCheck size={17} /></span><span><strong>Admin workspace</strong><small>Manage flight operations</small></span><ArrowRight size={15} /></Link>}</section>
        <p className="profile-readonly-note">Profile details are read-only because the current account API does not provide profile editing.</p>
      </>}
    </section>
  </main>
}

export default ProfilePage
