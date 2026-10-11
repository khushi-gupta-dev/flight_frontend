import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import AuthLayout from './AuthLayout'

const RecoveryUnavailablePage = ({ title, description }) => (
  <AuthLayout>
    <Link to="/login" className="mb-6 inline-flex items-center gap-2 text-[13px] text-[#858691] transition-colors hover:text-[#C63755]">
      <ArrowLeft size={15} /> Back to sign in
    </Link>
    <div className="mb-6">
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
    <div className="auth-info-message" role="status">
      Password recovery is not available yet. The backend currently supports account creation and sign in only.
    </div>
    <Link to="/login" className="auth-action-link">Return to sign in</Link>
  </AuthLayout>
)

export default RecoveryUnavailablePage
