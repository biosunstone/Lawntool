/**
 * Responsive Card Components
 * Mobile-optimized card layouts with touch interactions
 */

'use client'

import { HTMLAttributes, forwardRef } from 'react'
import { motion, MotionProps } from 'framer-motion'
import { ChevronRight, MoreVertical } from 'lucide-react'
import Link from 'next/link'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'flat' | 'elevated' | 'outlined'
  padding?: 'none' | 'sm' | 'md' | 'lg'
  interactive?: boolean
  href?: string
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'xl'
}

export const Card = forwardRef<HTMLDivElement, CardProps>(({
  variant = 'elevated',
  padding = 'md',
  interactive = false,
  href,
  rounded = 'lg',
  className = '',
  children,
  onClick,
  ...props
}, ref) => {
  const variantClasses = {
    flat: 'bg-white',
    elevated: 'bg-white shadow-mobile-card',
    outlined: 'bg-white border border-gray-200'
  }

  const paddingClasses = {
    none: '',
    sm: 'p-3',
    md: 'p-4 sm:p-6',
    lg: 'p-6 sm:p-8'
  }

  const roundedClasses = {
    none: '',
    sm: 'rounded',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl'
  }

  const cardClassName = `
    ${variantClasses[variant]}
    ${paddingClasses[padding]}
    ${roundedClasses[rounded]}
    ${interactive || href || onClick ? 'cursor-pointer touch-manipulation tap-highlight-transparent' : ''}
    ${interactive || href || onClick ? 'hover:shadow-lg transition-shadow duration-200' : ''}
    ${className}
  `

  if (href) {
    return (
      <Link
        ref={ref as any}
        href={href}
        className={cardClassName}
        onClick={onClick as any}
      >
        {children}
      </Link>
    )
  }

  return (
    <div
      ref={ref}
      onClick={onClick}
      className={cardClassName}
      {...props}
    >
      {children}
    </div>
  )
})

Card.displayName = 'Card'

// Card Header
interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  title: string
  subtitle?: string
  action?: React.ReactNode
  avatar?: React.ReactNode
}

export function CardHeader({
  title,
  subtitle,
  action,
  avatar,
  className = '',
  ...props
}: CardHeaderProps) {
  return (
    <div className={`flex items-start justify-between ${className}`} {...props}>
      <div className="flex items-start space-x-3">
        {avatar && (
          <div className="flex-shrink-0">{avatar}</div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate">
            {title}
          </h3>
          {subtitle && (
            <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
      {action && (
        <div className="flex-shrink-0 ml-4">{action}</div>
      )}
    </div>
  )
}

// Card Body
interface CardBodyProps extends HTMLAttributes<HTMLDivElement> {
  noPadding?: boolean
}

export function CardBody({
  noPadding = false,
  className = '',
  children,
  ...props
}: CardBodyProps) {
  return (
    <div
      className={`
        ${noPadding ? '' : 'py-3'}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  )
}

// Card Footer
interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {
  divider?: boolean
  actions?: React.ReactNode
}

export function CardFooter({
  divider = false,
  actions,
  className = '',
  children,
  ...props
}: CardFooterProps) {
  return (
    <div
      className={`
        ${divider ? 'border-t border-gray-200 pt-3 mt-3' : ''}
        ${actions ? 'flex items-center justify-between' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
      {actions && (
        <div className="flex items-center space-x-2">
          {actions}
        </div>
      )}
    </div>
  )
}

// List Card Item
interface ListCardItemProps {
  title: string
  subtitle?: string
  description?: string
  icon?: React.ReactNode
  image?: string
  badge?: string | number
  onClick?: () => void
  href?: string
  action?: React.ReactNode
  showArrow?: boolean
}

export function ListCardItem({
  title,
  subtitle,
  description,
  icon,
  image,
  badge,
  onClick,
  href,
  action,
  showArrow = true
}: ListCardItemProps) {
  const Component = href ? Link : 'div'

  return (
    <Component
      href={href || ''}
      onClick={onClick}
      className={`
        flex items-center p-4
        ${href || onClick ? 'cursor-pointer hover:bg-gray-50 active:bg-gray-100' : ''}
        touch-manipulation tap-highlight-transparent
        transition-colors duration-200
      `}
    >
      {/* Leading Element */}
      {(icon || image) && (
        <div className="flex-shrink-0 mr-4">
          {icon && (
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
              {icon}
            </div>
          )}
          {image && !icon && (
            <img
              src={image}
              alt=""
              className="w-10 h-10 rounded-full object-cover"
            />
          )}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center">
          <h4 className="text-sm sm:text-base font-medium text-gray-900 truncate">
            {title}
          </h4>
          {badge && (
            <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-primary-100 text-primary-700 rounded-full">
              {badge}
            </span>
          )}
        </div>
        {subtitle && (
          <p className="text-sm text-gray-500 mt-0.5 truncate">{subtitle}</p>
        )}
        {description && (
          <p className="text-sm text-gray-600 mt-1 line-clamp-2">{description}</p>
        )}
      </div>

      {/* Trailing Element */}
      <div className="flex-shrink-0 ml-4 flex items-center">
        {action}
        {showArrow && (href || onClick) && (
          <ChevronRight className="w-5 h-5 text-gray-400" />
        )}
      </div>
    </Component>
  )
}

// Stat Card
interface StatCardProps {
  title: string
  value: string | number
  change?: {
    value: string | number
    trend: 'up' | 'down' | 'neutral'
  }
  icon?: React.ReactNode
  color?: 'primary' | 'success' | 'warning' | 'danger' | 'info'
  onClick?: () => void
}

export function StatCard({
  title,
  value,
  change,
  icon,
  color = 'primary',
  onClick
}: StatCardProps) {
  const colorClasses = {
    primary: 'bg-primary-50 text-primary-600',
    success: 'bg-green-50 text-green-600',
    warning: 'bg-amber-50 text-amber-600',
    danger: 'bg-red-50 text-red-600',
    info: 'bg-blue-50 text-blue-600'
  }

  const trendColors = {
    up: 'text-green-600',
    down: 'text-red-600',
    neutral: 'text-gray-600'
  }

  return (
    <Card
      interactive={!!onClick}
      onClick={onClick}
      className="relative overflow-hidden"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-500 font-medium">{title}</p>
          <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-2">
            {value}
          </p>
          {change && (
            <div className={`flex items-center mt-2 ${trendColors[change.trend]}`}>
              {change.trend === 'up' && (
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              )}
              {change.trend === 'down' && (
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
              <span className="text-sm font-medium">{change.value}</span>
            </div>
          )}
        </div>
        {icon && (
          <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
            {icon}
          </div>
        )}
      </div>
    </Card>
  )
}

// Feature Card
interface FeatureCardProps {
  title: string
  description: string
  icon: React.ReactNode
  href?: string
  onClick?: () => void
  color?: 'primary' | 'success' | 'warning' | 'danger' | 'info'
}

export function FeatureCard({
  title,
  description,
  icon,
  href,
  onClick,
  color = 'primary'
}: FeatureCardProps) {
  const colorClasses = {
    primary: 'bg-primary-50 text-primary-600',
    success: 'bg-green-50 text-green-600',
    warning: 'bg-amber-50 text-amber-600',
    danger: 'bg-red-50 text-red-600',
    info: 'bg-blue-50 text-blue-600'
  }

  return (
    <Card
      href={href}
      onClick={onClick}
      interactive={!!(href || onClick)}
      className="text-center"
    >
      <div className={`inline-flex p-4 rounded-full ${colorClasses[color]} mb-4`}>
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-600">{description}</p>
    </Card>
  )
}