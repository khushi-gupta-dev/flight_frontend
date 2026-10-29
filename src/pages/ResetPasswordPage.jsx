import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, ArrowLeft } from 'lucide-react'
import AuthLayout from '../components/AuthLayout'
import PrimaryButton from '../components/Buttons'

/* ── Reusable password input ── */
const PwdInput = ({ id, label, value, onChange, show, onToggle, autoComplete, animDelay }) => (
  <div
    className="animate-fade-in-up"
    style={{ animationDelay: animDelay, animationFillMode: 'both' }}
  >
    <label
      htmlFor={id}
      className="block text-[11px] font-bold uppercase tracking-[0.12em] text-[#999] mb-1.5"
    >
      {label}
    </label>
    <div className="relative">
      <input
        id={id}
        type={show ? 'text' : 'password'}
        placeholder="••••••••••••"
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        className="input-primary pr-10"
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute inset-y-0 right-3.5 flex items-center text-[#c0c0c0] hover:text-[#888] transition-colors"
      >
        {show ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
    </div>
  </div>
)

/* ── Strength bar ── */
const getStrength = (p) => {
  if (!p) return 0
  let s = 0
  if (p.length >= 8) s++
  if (/[A-Z]/.test(p)) s++
  if (/[0-9]/.test(p)) s++
  if (/[^A-Za-z0-9]/.test(p)) s++
  return s
}
const STRENGTH_META = [
  null,
  { label: 'Weak',   color: '#e74c3c' },
  { label: 'Fair',   color: '#e67e22' },
  { label: 'Good',   color: '#f1c40f' },
  { label: 'Strong', color: '#2ecc71' },
]

const ResetPasswordPage = () => {
  const [newPwd,     setNewPwd]     = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [showNew,    setShowNew]    = useState(false)
  const [showConf,   setShowConf]   = useState(false)
  const [error,      setError]      = useState('')
  const [success,    setSuccess]    = useState(false)
  const navigate = useNavigate()

  const strength = getStrength(newPwd)
  const meta     = STRENGTH_META[strength]
  const matched  = confirmPwd.length > 0 && newPwd === confirmPwd

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')
    if (newPwd.length < 8)        { setError('Password must be at least 8 characters.'); return }
    if (newPwd !== confirmPwd)    { setError('Passwords do not match.'); return }
    setSuccess(true)
    setTimeout(() => navigate('/login'), 2200)
  }

  return (
    <AuthLayout>
      {/* Back */}
      <Link
        to="/otp-verification"
        className="inline-flex items-center gap-1.5 text-[11px] text-[#bbb] hover:text-[#C63755] mb-6 transition-all duration-200 group animate-fade-in delay-75"
      >
        <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" />
        Back
      </Link>

      {/* Heading */}
      <div className="mb-6 animate-fade-in-up delay-100">
        <h1 className="text-[24px] font-extrabold text-[#454756] leading-tight mb-1 tracking-tight">
          Reset Password 🔑
        </h1>
        <p className="text-[12px] text-[#bbb]">Choose a strong new password for your account</p>
      </div>

      {success ? (
        /* ── Success state ── */
        <div className="rounded-2xl bg-gradient-to-br from-[#C63755]/8 to-[#C63755]/3 border border-[#C63755]/15 px-5 py-6 animate-bounce-in">
          <div className="flex items-center gap-3 mb-3">
            <div className="relative w-11 h-11 shrink-0">
              <div className="absolute inset-0 rounded-full bg-[#C63755]/20 animate-pulse-ring" />
              <div className="w-11 h-11 rounded-full bg-[#C63755] flex items-center justify-center relative z-10 shadow-lg shadow-[#C63755]/30">
                <svg width="16" height="13" viewBox="0 0 16 13" fill="none">
                  <path d="M1.5 6.5L5.5 10.5L14.5 1.5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
            <div>
              <p className="text-[14px] font-bold text-[#454756]">Password Updated!</p>
              <p className="text-[11px] text-[#bbb] mt-0.5">Redirecting you to login…</p>
            </div>
          </div>
          {/* Progress strip */}
          <div className="h-1 bg-[#f0f0f0] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#C63755] rounded-full"
              style={{ animation: 'shimmer 2.2s linear forwards', width: '100%',
                backgroundImage: 'linear-gradient(90deg, #C63755 0%, #e87a94 50%, #C63755 100%)',
                backgroundSize: '200% 100%',
              }}
            />
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* New password */}
          <div>
            <PwdInput
              id="new-password" label="New Password"
              value={newPwd} onChange={e => setNewPwd(e.target.value)}
              show={showNew} onToggle={() => setShowNew(!showNew)}
              autoComplete="new-password" animDelay="180ms"
            />
            {/* Strength meter */}
            {newPwd.length > 0 && (
              <div className="mt-2 animate-fade-in">
                <div className="flex gap-1 mb-1">
                  {[1,2,3,4].map(i => (
                    <div
                      key={i}
                      className="h-[3px] flex-1 rounded-full transition-all duration-350"
                      style={{
                        backgroundColor: i <= strength ? meta?.color : '#f0f0f0',
                        transitionDelay: `${(i-1)*60}ms`,
                      }}
                    />
                  ))}
                </div>
                <p className="text-[11px] font-semibold transition-colors duration-200"
                  style={{ color: meta?.color }}>
                  {meta?.label}
                </p>
              </div>
            )}
          </div>

          {/* Confirm password */}
          <div>
            <PwdInput
              id="confirm-password" label="Confirm Password"
              value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)}
              show={showConf} onToggle={() => setShowConf(!showConf)}
              autoComplete="new-password" animDelay="260ms"
            />
            {/* Match indicator */}
            {confirmPwd.length > 0 && (
              <p
                className={`text-[11px] font-semibold mt-1.5 transition-all duration-200 animate-fade-in ${
                  matched ? 'text-[#2ecc71]' : 'text-[#C63755]'
                }`}
              >
                {matched ? '✓ Passwords match' : '✗ Passwords do not match'}
              </p>
            )}
          </div>

          {/* Error */}
          {error && (
            <p className="text-[11px] text-[#C63755] font-semibold animate-fade-in -mt-1">
              {error}
            </p>
          )}

          <div className="animate-fade-in-up" style={{animationDelay:'330ms',animationFillMode:'both'}}>
            <PrimaryButton type="submit">Reset Password</PrimaryButton>
          </div>
        </form>
      )}

      <p className="text-center text-[12px] text-[#ccc] mt-6 animate-fade-in delay-400">
        <Link to="/signup" className="text-[#C63755] font-bold hover:underline underline-offset-2">
          Create an account
        </Link>
      </p>
    </AuthLayout>
  )
}

export default ResetPasswordPage
