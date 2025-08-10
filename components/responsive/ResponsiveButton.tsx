/**
 * Responsive Button Components
 * Touch-friendly buttons with proper sizing and feedback
 */

'use client'

import { ButtonHTMLAttributes, forwardRef } from 'react'
import { motion, MotionProps } from 'framer-motion'
import { Loader2 } from 'lucide-react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success'
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  fullWidth?: boolean
  loading?: boolean
  icon?: React.ReactNode
  iconPosition?: 'left' | 'right'
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full'
  touchFeedback?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  icon,
  iconPosition = 'left',
  rounded = 'lg',
  touchFeedback = true,
  className = '',
  children,
  disabled,
  onClick,
  type,
  ...props
}, ref) => {
  // Size classes for touch-friendly targets
  const sizeClasses = {
    xs: 'h-8 px-3 text-xs min-w-[64px]',
    sm: 'h-touch-sm px-4 text-sm min-w-[80px]',
    md: 'h-touch px-5 text-base min-w-[96px]',
    lg: 'h-touch-lg px-6 text-lg min-w-[112px]',
    xl: 'h-14 px-8 text-xl min-w-[128px]'
  }

  // Variant classes
  const variantClasses = {
    primary: `
      bg-primary-600 text-white 
      hover:bg-primary-700 
      active:bg-primary-800
      disabled:bg-gray-300
    `,
    secondary: `
      bg-gray-100 text-gray-900 
      hover:bg-gray-200 
      active:bg-gray-300
      disabled:bg-gray-50 disabled:text-gray-400
    `,
    outline: `
      bg-transparent text-gray-700 border-2 border-gray-300
      hover:bg-gray-50 hover:border-gray-400
      active:bg-gray-100
      disabled:border-gray-200 disabled:text-gray-400
    `,
    ghost: `
      bg-transparent text-gray-700
      hover:bg-gray-100
      active:bg-gray-200
      disabled:text-gray-400
    `,
    danger: `
      bg-red-600 text-white
      hover:bg-red-700
      active:bg-red-800
      disabled:bg-gray-300
    `,
    success: `
      bg-green-600 text-white
      hover:bg-green-700
      active:bg-green-800
      disabled:bg-gray-300
    `
  }

  // Rounded classes
  const roundedClasses = {
    none: 'rounded-none',
    sm: 'rounded',
    md: 'rounded-md',
    lg: 'rounded-lg',
    full: 'rounded-full'
  }

  const isDisabled = disabled || loading

  return (
    <button
      ref={ref}
      disabled={isDisabled}
      onClick={onClick}
      type={type}
      className={`
        ${sizeClasses[size]}
        ${variantClasses[variant]}
        ${roundedClasses[rounded]}
        ${fullWidth ? 'w-full' : ''}
        inline-flex items-center justify-center
        font-medium
        transition-all duration-200
        touch-manipulation tap-highlight-transparent
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500
        disabled:cursor-not-allowed disabled:opacity-50
        ${className}
      `}
    >
      {loading && (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      )}
      {!loading && icon && iconPosition === 'left' && (
        <span className="mr-2">{icon}</span>
      )}
      {children}
      {!loading && icon && iconPosition === 'right' && (
        <span className="ml-2">{icon}</span>
      )}
    </button>
  )
})

Button.displayName = 'Button'

// Floating Action Button (FAB)
interface FABProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode
  position?: 'bottom-right' | 'bottom-left' | 'bottom-center'
  size?: 'sm' | 'md' | 'lg'
  extended?: boolean
  label?: string
}

export function FAB({
  icon,
  position = 'bottom-right',
  size = 'md',
  extended = false,
  label,
  className = '',
  ...props
}: FABProps) {
  const positionClasses = {
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2'
  }

  const sizeClasses = {
    sm: extended ? 'h-10 px-4' : 'w-10 h-10',
    md: extended ? 'h-14 px-6' : 'w-14 h-14',
    lg: extended ? 'h-16 px-8' : 'w-16 h-16'
  }

  const iconSizeClasses = {
    sm: 'w-5 h-5',
    md: 'w-6 h-6',
    lg: 'w-7 h-7'
  }

  return (
    <button
      className={`
        fixed ${positionClasses[position]} z-20
        ${sizeClasses[size]}
        bg-primary-600 text-white shadow-lg
        rounded-full
        flex items-center justify-center
        hover:bg-primary-700 active:bg-primary-800
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500
        touch-manipulation tap-highlight-transparent
        transition-all duration-200
        ${className}
      `}
      {...props}
    >
      <span className={iconSizeClasses[size]}>{icon}</span>
      {extended && label && (
        <span className="ml-2 font-medium">{label}</span>
      )}
    </button>
  )
}

// Button Group
interface ButtonGroupProps {
  children: React.ReactNode
  orientation?: 'horizontal' | 'vertical'
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
  className?: string
}

export function ButtonGroup({
  children,
  orientation = 'horizontal',
  size = 'md',
  fullWidth = false,
  className = ''
}: ButtonGroupProps) {
  return (
    <div
      className={`
        inline-flex ${orientation === 'vertical' ? 'flex-col' : 'flex-row'}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      role="group"
    >
      {children}
    </div>
  )
}

// Icon Button
interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success'
  rounded?: boolean
  label?: string // For accessibility
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(({
  icon,
  size = 'md',
  variant = 'ghost',
  rounded = true,
  label,
  className = '',
  ...props
}, ref) => {
  const sizeClasses = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-touch h-touch',
    lg: 'w-touch-lg h-touch-lg',
    xl: 'w-14 h-14'
  }

  const iconSizeClasses = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
    xl: 'w-7 h-7'
  }

  const variantClasses = {
    primary: 'bg-primary-600 text-white hover:bg-primary-700',
    secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
    outline: 'border-2 border-gray-300 text-gray-700 hover:bg-gray-50',
    ghost: 'text-gray-700 hover:bg-gray-100',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    success: 'bg-green-600 text-white hover:bg-green-700'
  }

  return (
    <button
      ref={ref}
      className={`
        ${sizeClasses[size]}
        ${variantClasses[variant]}
        ${rounded ? 'rounded-full' : 'rounded-lg'}
        inline-flex items-center justify-center
        transition-all duration-200
        touch-manipulation tap-highlight-transparent
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
      aria-label={label}
      {...props}
    >
      <span className={iconSizeClasses[size]}>{icon}</span>
    </button>
  )
})

IconButton.displayName = 'IconButton'

// Segmented Control (iOS-style toggle)
interface SegmentedControlProps {
  options: { value: string; label: string; icon?: React.ReactNode }[]
  value: string
  onChange: (value: string) => void
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
  className?: string
}

export function SegmentedControl({
  options,
  value,
  onChange,
  size = 'md',
  fullWidth = false,
  className = ''
}: SegmentedControlProps) {
  const sizeClasses = {
    sm: 'h-8 text-sm',
    md: 'h-10 text-base',
    lg: 'h-12 text-lg'
  }

  return (
    <div
      className={`
        inline-flex p-1 bg-gray-100 rounded-lg
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
    >
      {options.map((option, index) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={`
            ${sizeClasses[size]}
            ${fullWidth ? 'flex-1' : 'px-4'}
            ${value === option.value
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
            }
            ${index === 0 ? 'rounded-l-md' : ''}
            ${index === options.length - 1 ? 'rounded-r-md' : ''}
            inline-flex items-center justify-center
            font-medium
            transition-all duration-200
            touch-manipulation tap-highlight-transparent
            focus:outline-none
          `}
        >
          {option.icon && (
            <span className="mr-2">{option.icon}</span>
          )}
          {option.label}
        </button>
      ))}
    </div>
  )
}