import './Button.css'

const VARIANTS = {
  primary: 'border border-transparent bg-indigo-600 text-white hover:bg-indigo-700',
  secondary:
    'border border-gray-300 bg-transparent text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800',
  danger: 'border border-transparent bg-red-600 text-white hover:bg-red-700',
  ghost:
    'border border-transparent bg-transparent text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800',
}

const SIZES = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
}

// variant: 'primary' | 'secondary' | 'danger' | 'ghost'
const Button = ({ variant = 'primary', size = 'md', className = '', type = 'button', children, ...props }) => (
  <button
    type={type}
    className={`btn inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${SIZES[size] || SIZES.md} ${VARIANTS[variant] || VARIANTS.primary} ${className}`}
    {...props}
  >
    {children}
  </button>
)

export default Button
