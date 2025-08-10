/**
 * Responsive Form Components
 * Touch-friendly form inputs with proper sizing and spacing
 */

'use client'

import { forwardRef, InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes } from 'react'
import { motion } from 'framer-motion'
import { Check, X, AlertCircle, Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'

// Base Input Component
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  success?: boolean
  icon?: React.ReactNode
  helper?: string
  touchSize?: 'sm' | 'md' | 'lg'
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  success,
  icon,
  helper,
  touchSize = 'md',
  className = '',
  type = 'text',
  ...props
}, ref) => {
  const [showPassword, setShowPassword] = useState(false)
  const isPassword = type === 'password'
  
  const sizeClasses = {
    sm: 'h-touch-sm text-sm',
    md: 'h-touch text-base',
    lg: 'h-touch-lg text-lg'
  }

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          {label}
          {props.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            {icon}
          </div>
        )}
        
        <input
          ref={ref}
          type={isPassword && showPassword ? 'text' : type}
          className={`
            w-full ${sizeClasses[touchSize]} 
            ${icon ? 'pl-10' : 'pl-4'} 
            ${isPassword ? 'pr-12' : 'pr-4'}
            border rounded-lg
            touch-manipulation tap-highlight-transparent
            transition-all duration-200
            focus:outline-none focus:ring-2
            ${error 
              ? 'border-red-300 focus:border-red-500 focus:ring-red-200' 
              : success
              ? 'border-green-300 focus:border-green-500 focus:ring-green-200'
              : 'border-gray-300 focus:border-primary-500 focus:ring-primary-200'
            }
            ${props.disabled ? 'bg-gray-50 text-gray-500' : 'bg-white'}
            ${className}
          `}
          {...props}
        />
        
        {/* Password Toggle */}
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 touch-manipulation"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        )}
        
        {/* Status Icons */}
        {success && !isPassword && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500">
            <Check className="w-5 h-5" />
          </div>
        )}
        {error && !isPassword && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500">
            <AlertCircle className="w-5 h-5" />
          </div>
        )}
      </div>
      
      {/* Helper/Error Text */}
      {(helper || error) && (
        <motion.p
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mt-1.5 text-sm ${error ? 'text-red-600' : 'text-gray-500'}`}
        >
          {error || helper}
        </motion.p>
      )}
    </div>
  )
})

Input.displayName = 'Input'

// Textarea Component
interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  helper?: string
  touchSize?: 'sm' | 'md' | 'lg'
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({
  label,
  error,
  helper,
  touchSize = 'md',
  className = '',
  ...props
}, ref) => {
  const sizeClasses = {
    sm: 'text-sm py-2',
    md: 'text-base py-3',
    lg: 'text-lg py-4'
  }

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          {label}
          {props.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <textarea
        ref={ref}
        className={`
          w-full ${sizeClasses[touchSize]} px-4
          border rounded-lg resize-none
          touch-manipulation tap-highlight-transparent
          transition-all duration-200
          focus:outline-none focus:ring-2
          ${error 
            ? 'border-red-300 focus:border-red-500 focus:ring-red-200' 
            : 'border-gray-300 focus:border-primary-500 focus:ring-primary-200'
          }
          ${props.disabled ? 'bg-gray-50 text-gray-500' : 'bg-white'}
          ${className}
        `}
        {...props}
      />
      
      {(helper || error) && (
        <motion.p
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mt-1.5 text-sm ${error ? 'text-red-600' : 'text-gray-500'}`}
        >
          {error || helper}
        </motion.p>
      )}
    </div>
  )
})

Textarea.displayName = 'Textarea'

// Select Component
interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  helper?: string
  options: { value: string; label: string }[]
  placeholder?: string
  touchSize?: 'sm' | 'md' | 'lg'
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(({
  label,
  error,
  helper,
  options,
  placeholder = 'Select an option',
  touchSize = 'md',
  className = '',
  ...props
}, ref) => {
  const sizeClasses = {
    sm: 'h-touch-sm text-sm',
    md: 'h-touch text-base',
    lg: 'h-touch-lg text-lg'
  }

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          {label}
          {props.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        <select
          ref={ref}
          className={`
            w-full ${sizeClasses[touchSize]} px-4 pr-10
            border rounded-lg appearance-none
            touch-manipulation tap-highlight-transparent
            transition-all duration-200
            focus:outline-none focus:ring-2
            ${error 
              ? 'border-red-300 focus:border-red-500 focus:ring-red-200' 
              : 'border-gray-300 focus:border-primary-500 focus:ring-primary-200'
            }
            ${props.disabled ? 'bg-gray-50 text-gray-500' : 'bg-white'}
            ${className}
          `}
          {...props}
        >
          <option value="" disabled>{placeholder}</option>
          {options.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        
        {/* Custom Arrow */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
      
      {(helper || error) && (
        <motion.p
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mt-1.5 text-sm ${error ? 'text-red-600' : 'text-gray-500'}`}
        >
          {error || helper}
        </motion.p>
      )}
    </div>
  )
})

Select.displayName = 'Select'

// Checkbox Component
interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string
  error?: string
  touchSize?: 'sm' | 'md' | 'lg'
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(({
  label,
  error,
  touchSize = 'md',
  className = '',
  ...props
}, ref) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  }

  return (
    <div className="w-full">
      <label className="flex items-start space-x-3 cursor-pointer touch-manipulation tap-highlight-transparent">
        <input
          ref={ref}
          type="checkbox"
          className={`
            ${sizeClasses[touchSize]} mt-0.5
            text-primary-600 border-gray-300 rounded
            focus:ring-2 focus:ring-primary-200
            transition-all duration-200
            ${props.disabled ? 'opacity-50' : ''}
            ${className}
          `}
          {...props}
        />
        <span className={`text-gray-700 ${props.disabled ? 'opacity-50' : ''}`}>
          {label}
        </span>
      </label>
      
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-1.5 text-sm text-red-600 ml-8"
        >
          {error}
        </motion.p>
      )}
    </div>
  )
})

Checkbox.displayName = 'Checkbox'

// Radio Group Component
interface RadioOption {
  value: string
  label: string
  description?: string
}

interface RadioGroupProps {
  label?: string
  options: RadioOption[]
  value: string
  onChange: (value: string) => void
  error?: string
  name: string
  touchSize?: 'sm' | 'md' | 'lg'
  layout?: 'vertical' | 'horizontal'
}

export function RadioGroup({
  label,
  options,
  value,
  onChange,
  error,
  name,
  touchSize = 'md',
  layout = 'vertical'
}: RadioGroupProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  }

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-3">
          {label}
        </label>
      )}
      
      <div className={`${layout === 'horizontal' ? 'flex flex-wrap gap-4' : 'space-y-3'}`}>
        {options.map(option => (
          <label
            key={option.value}
            className="flex items-start space-x-3 cursor-pointer touch-manipulation tap-highlight-transparent"
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={(e) => onChange(e.target.value)}
              className={`
                ${sizeClasses[touchSize]} mt-0.5
                text-primary-600 border-gray-300
                focus:ring-2 focus:ring-primary-200
                transition-all duration-200
              `}
            />
            <div className="flex-1">
              <span className="text-gray-700 font-medium">{option.label}</span>
              {option.description && (
                <p className="text-sm text-gray-500 mt-0.5">{option.description}</p>
              )}
            </div>
          </label>
        ))}
      </div>
      
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-2 text-sm text-red-600"
        >
          {error}
        </motion.p>
      )}
    </div>
  )
}

// Form Layout Component
interface FormLayoutProps {
  children: React.ReactNode
  columns?: 1 | 2 | 3 | 4
  className?: string
}

export function FormLayout({ children, columns = 1, className = '' }: FormLayoutProps) {
  const columnClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
  }

  return (
    <div className={`grid ${columnClasses[columns]} gap-4 md:gap-6 ${className}`}>
      {children}
    </div>
  )
}