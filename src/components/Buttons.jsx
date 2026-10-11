const PrimaryButton = ({ children, type = 'button', onClick, disabled, className = '' }) => (
  <button
    type={type}
    onClick={onClick}
    disabled={disabled}
    className={`btn-primary w-full rounded-xl bg-[#C63755] px-6 py-4 text-[13px] font-semibold uppercase tracking-wider text-white shadow-lg shadow-[#C63755]/25 transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#a82e47] hover:shadow-xl hover:shadow-[#C63755]/35 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100 ${className}`}
  >
    {children}
  </button>
)

export default PrimaryButton
