import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import AuthLayout from '../components/AuthLayout'
import InputField from '../components/InputField'
import PrimaryButton from '../components/Buttons'
import { getCurrentUser, signIn } from '../services/auth'

const LoginPage = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [keepSignedIn, setKeepSignedIn] = useState(false)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const [notice, setNotice] = useState(location.state?.notice || '')

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setNotice('')
    setIsSubmitting(true)
    try {
      const token = await signIn({ email: email.trim(), password })
      if (typeof token !== 'string' || !token) {
        throw new Error('Sign in succeeded, but the server did not return an access token.')
      }
      const profile = await getCurrentUser(token)
      sessionStorage.removeItem('authToken')
      localStorage.removeItem('authToken')
      const storage = keepSignedIn ? localStorage : sessionStorage
      storage.setItem('authToken', token)
      const bookingIntent = location.state?.bookingIntent
      const bookingPath = bookingIntent?.flightId
        ? `/booking/${bookingIntent.flightId}?${new URLSearchParams({ date: bookingIntent.date || '', travellers: String(bookingIntent.travellers || 1) })}`
        : null
      const returnPath = typeof location.state?.from === 'string' && location.state.from.startsWith('/') ? location.state.from : null
      navigate(profile.roles?.includes('admin') ? '/admin' : bookingPath || returnPath || '/', {
        replace: true,
        state: bookingPath ? { bookingIntent } : undefined,
      })
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthLayout>
      <div className="mb-6 animate-fade-in-up delay-100">
        <h1>Welcome back</h1>
        <p>Sign in to continue your journey</p>
      </div>

      {notice && <p className="auth-success-message" role="status">{notice}</p>}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <InputField
          id="email" label="Email Address" type="email"
          placeholder="hello@example.com" value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email" animDelay="100ms"
        />

        <div className="animate-fade-in-up" style={{ animationDelay: '170ms', animationFillMode: 'both' }}>
          <div className="mb-1.5 flex items-center justify-between">
            <label htmlFor="password" className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#999]">Password</label>
          </div>
          <div className="relative">
            <input
              id="password" type={showPassword ? 'text' : 'password'}
              placeholder="Enter your password" value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password" maxLength={100} required
              className="input-primary pr-10"
            />
            <button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-3.5 flex items-center text-[#c0c0c0] hover:text-[#888]">
              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        <label className="group flex cursor-pointer items-center gap-2.5">
          <input type="checkbox" checked={keepSignedIn} onChange={(event) => setKeepSignedIn(event.target.checked)} className="h-[18px] w-[18px] accent-[#C63755]" />
          <span className="text-[12px] text-[#888]">Keep me signed in</span>
        </label>

        {error && <p className="auth-error-message" role="alert">{error}</p>}

        <PrimaryButton type="submit" disabled={isSubmitting}>{isSubmitting ? 'Signing in...' : 'Login'}</PrimaryButton>
      </form>

      <p className="mt-5 text-center text-[12px] text-[#858691]">
        Don&apos;t have an account?{' '}
        <Link to="/signup" state={{ ...(location.state?.bookingIntent ? { bookingIntent: location.state.bookingIntent } : {}), ...(location.state?.from ? { from: location.state.from } : {}) }} className="font-bold text-[#C63755] hover:underline underline-offset-2">Create an account</Link>
      </p>
    </AuthLayout>
  )
}

export default LoginPage
