import { useState } from 'react'

/**
 * InputField with animated focus border glow and label transition.
 */
const InputField = ({
  label,
  id,
  type = 'text',
  placeholder,
  value,
  onChange,
  rightIcon,
  autoComplete,
  animDelay = '0ms',
}) => {
  const [focused, setFocused] = useState(false)

  return (
    <div
      className="flex flex-col gap-1.5 animate-fade-in-up"
      style={{ animationDelay: animDelay, animationFillMode: 'both' }}
    >
      <label
        htmlFor={id}
        className={`text-[11px] font-bold uppercase tracking-[0.12em] transition-colors duration-200 ${
          focused ? 'text-[#C63755]' : 'text-[#999]'
        }`}
      >
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          required
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="input-primary pr-10"
          style={{ paddingRight: rightIcon ? '2.75rem' : '1rem' }}
        />
        {rightIcon && (
          <span className="absolute inset-y-0 right-3.5 flex items-center text-[#c0c0c0] hover:text-[#888] transition-colors cursor-pointer">
            {rightIcon}
          </span>
        )}
        {/* Animated bottom accent line */}
        <div
          className="absolute bottom-0 left-0 h-[2px] bg-[#C63755] rounded-b-xl transition-all duration-300 ease-out"
          style={{ width: focused ? '100%' : '0%' }}
        />
      </div>
    </div>
  )
}

export default InputField
