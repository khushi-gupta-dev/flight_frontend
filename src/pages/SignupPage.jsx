import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import AuthLayout from '../components/AuthLayout'
import InputField from '../components/InputField'
import PrimaryButton from '../components/Buttons'
import { signUp } from '../services/auth'

const SignupPage = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)
    try {
      await signUp({ email: email.trim(), password })
      navigate('/login', {
        replace: true,
        state: {
          notice: 'Your account is ready. Sign in to continue.',
          ...(location.state?.bookingIntent ? { bookingIntent: location.state.bookingIntent } : {}),
          ...(location.state?.from ? { from: location.state.from } : {}),
        },
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
        <h1>Create your account</h1>
        <p>Join SkyLink and explore the skies</p>
      </div>

      <p className="auth-info-message">New accounts start with customer access. An administrator can assign additional roles when needed.</p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <InputField
          id="email" label="Email Address" type="email"
          placeholder="hello@example.com" value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email" animDelay="100ms"
        />

        <div className="animate-fade-in-up" style={{ animationDelay: '170ms', animationFillMode: 'both' }}>
          <label htmlFor="password" className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.12em] text-[#999]">Password</label>
          <div className="relative">
            <input
              id="password" type={showPassword ? 'text' : 'password'}
              placeholder="At least 5 characters" value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password" minLength={5} maxLength={100} required
              className="input-primary pr-10"
            />
            <button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-3.5 flex items-center text-[#c0c0c0] hover:text-[#888]">
              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        <p className="text-[11px] leading-relaxed text-[#858691]">
          By continuing, you agree to our <span className="font-semibold text-[#C63755]">Terms of Service</span> and <span className="font-semibold text-[#C63755]">Privacy Policy</span>.
        </p>

        {error && <p className="auth-error-message" role="alert">{error}</p>}

        <PrimaryButton type="submit" disabled={isSubmitting}>{isSubmitting ? 'Creating account...' : 'Create Account'}</PrimaryButton>
      </form>

      <p className="mt-5 text-center text-[12px] text-[#858691]">
        Already have an account?{' '}
        <Link to="/login" state={{ ...(location.state?.bookingIntent ? { bookingIntent: location.state.bookingIntent } : {}), ...(location.state?.from ? { from: location.state.from } : {}) }} className="font-bold text-[#C63755] hover:underline underline-offset-2">Sign in here</Link>
      </p>
    </AuthLayout>
  )
}

export default SignupPage
