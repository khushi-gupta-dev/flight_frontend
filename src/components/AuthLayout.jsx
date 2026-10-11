import { Plane } from 'lucide-react'

const Brand = ({ compact = false }) => (
  <div className={`flex items-center gap-3 ${compact ? '' : 'auth-brand'}`}>
    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#C63755] text-white shadow-lg shadow-[#C63755]/25">
      <Plane size={21} strokeWidth={2.2} />
    </span>
    <span className="text-[22px] font-bold tracking-tight text-white">
      Sky<span className="text-[#C63755]">Link</span>
    </span>
  </div>
)

const AuthLayout = ({ children }) => (
  <main className="auth-shell">
    <section className="auth-visual" aria-label="SkyLink travel">
      <div className="auth-visual-overlay" />
      <div className="auth-visual-content">
        <Brand />
        <div className="auth-intro">
          <p className="auth-eyebrow"><span /> Airline booking platform</p>
          <h2>Your journey<br /><span>starts here.</span></h2>
          <p className="auth-description">
            Find your next destination with a smoother way to plan and book your trip.
          </p>
        </div>
        <p className="auth-footnote">Travel made simple with SkyLink</p>
      </div>
    </section>

    <section className="auth-panel">
      <div className="auth-mobile-brand"><Brand compact /></div>
      <div className="auth-form-scroll">
        <div className="auth-form-content">{children}</div>
      </div>
      <div className="auth-accent" />
    </section>
  </main>
)

export default AuthLayout
