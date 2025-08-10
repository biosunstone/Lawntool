/**
 * Responsive Modal Components
 * Mobile-optimized modals with sheet behavior on small screens
 */

'use client'

import { Fragment, ReactNode } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface ResponsiveModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  description?: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  variant?: 'modal' | 'sheet' | 'auto' // auto = sheet on mobile, modal on desktop
  position?: 'center' | 'top' | 'bottom' // for sheet variant
  showCloseButton?: boolean
  closeOnOverlayClick?: boolean
  className?: string
}

export function ResponsiveModal({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'md',
  variant = 'auto',
  position = 'bottom',
  showCloseButton = true,
  closeOnOverlayClick = true,
  className = ''
}: ResponsiveModalProps) {
  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    full: 'max-w-full'
  }

  const isSheet = variant === 'sheet' || (variant === 'auto' && typeof window !== 'undefined' && window.innerWidth < 768)

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog
        as="div"
        className="relative z-50"
        onClose={closeOnOverlayClick ? onClose : () => {}}
      >
        {/* Backdrop */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className={`
            flex min-h-full
            ${!isSheet ? 'items-center justify-center p-4' : ''}
            ${isSheet && position === 'bottom' ? 'items-end' : ''}
            ${isSheet && position === 'top' ? 'items-start' : ''}
            ${isSheet && position === 'center' ? 'items-center' : ''}
          `}>
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom={
                isSheet && position === 'bottom' ? 'translate-y-full' :
                isSheet && position === 'top' ? '-translate-y-full' :
                'opacity-0 scale-95'
              }
              enterTo={isSheet ? 'translate-y-0' : 'opacity-100 scale-100'}
              leave="ease-in duration-200"
              leaveFrom={isSheet ? 'translate-y-0' : 'opacity-100 scale-100'}
              leaveTo={
                isSheet && position === 'bottom' ? 'translate-y-full' :
                isSheet && position === 'top' ? '-translate-y-full' :
                'opacity-0 scale-95'
              }
            >
              <Dialog.Panel className={`
                ${isSheet ? 'w-full' : `w-full ${sizeClasses[size]}`}
                ${isSheet && position === 'bottom' ? 'rounded-t-2xl' : ''}
                ${isSheet && position === 'top' ? 'rounded-b-2xl' : ''}
                ${!isSheet || position === 'center' ? 'rounded-2xl' : ''}
                bg-white shadow-xl transform transition-all
                ${className}
              `}>
                {/* Handle for bottom sheet */}
                {isSheet && position === 'bottom' && (
                  <div className="flex justify-center pt-3 pb-2">
                    <div className="w-12 h-1 bg-gray-300 rounded-full" />
                  </div>
                )}

                {/* Header */}
                {(title || showCloseButton) && (
                  <div className="flex items-start justify-between p-4 sm:p-6 border-b border-gray-200">
                    <div>
                      {title && (
                        <Dialog.Title className="text-lg sm:text-xl font-semibold text-gray-900">
                          {title}
                        </Dialog.Title>
                      )}
                      {description && (
                        <Dialog.Description className="mt-1 text-sm text-gray-500">
                          {description}
                        </Dialog.Description>
                      )}
                    </div>
                    {showCloseButton && (
                      <button
                        onClick={onClose}
                        className="ml-4 p-2 rounded-lg hover:bg-gray-100 touch-manipulation tap-highlight-transparent transition-colors"
                      >
                        <X className="w-5 h-5 text-gray-400" />
                      </button>
                    )}
                  </div>
                )}

                {/* Content */}
                <div className={`
                  ${!title && !showCloseButton ? 'pt-6' : ''}
                  p-4 sm:p-6
                  ${isSheet ? 'max-h-[80vh] overflow-y-auto' : ''}
                `}>
                  {children}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  )
}

// Alert Dialog
interface AlertDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description?: string
  confirmText?: string
  cancelText?: string
  variant?: 'info' | 'warning' | 'danger' | 'success'
  loading?: boolean
}

export function AlertDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'info',
  loading = false
}: AlertDialogProps) {
  const variantStyles = {
    info: {
      icon: '💡',
      buttonClass: 'bg-blue-600 hover:bg-blue-700 text-white'
    },
    warning: {
      icon: '⚠️',
      buttonClass: 'bg-amber-600 hover:bg-amber-700 text-white'
    },
    danger: {
      icon: '🚨',
      buttonClass: 'bg-red-600 hover:bg-red-700 text-white'
    },
    success: {
      icon: '✅',
      buttonClass: 'bg-green-600 hover:bg-green-700 text-white'
    }
  }

  const style = variantStyles[variant]

  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      showCloseButton={false}
    >
      <div className="text-center">
        <div className="text-4xl mb-4">{style.icon}</div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        {description && (
          <p className="text-sm text-gray-600 mb-6">{description}</p>
        )}
        
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg touch-manipulation tap-highlight-transparent transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm()
              if (!loading) onClose()
            }}
            disabled={loading}
            className={`
              flex-1 px-4 py-2.5 font-medium rounded-lg
              touch-manipulation tap-highlight-transparent transition-colors
              disabled:opacity-50 disabled:cursor-not-allowed
              ${style.buttonClass}
            `}
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Processing...
              </span>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </ResponsiveModal>
  )
}

// Drawer (Side Panel)
interface DrawerProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  side?: 'left' | 'right'
  size?: 'sm' | 'md' | 'lg' | 'full'
}

export function Drawer({
  isOpen,
  onClose,
  title,
  children,
  side = 'right',
  size = 'md'
}: DrawerProps) {
  const sizeClasses = {
    sm: 'max-w-xs',
    md: 'max-w-md',
    lg: 'max-w-lg',
    full: 'w-full'
  }

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-in-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in-out duration-300"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className={`
              pointer-events-none fixed inset-y-0 flex
              ${side === 'right' ? 'right-0 pr-0 sm:pr-10' : 'left-0 pl-0 sm:pl-10'}
              ${sizeClasses[size]}
            `}>
              <Transition.Child
                as={Fragment}
                enter="transform transition ease-in-out duration-300"
                enterFrom={side === 'right' ? 'translate-x-full' : '-translate-x-full'}
                enterTo="translate-x-0"
                leave="transform transition ease-in-out duration-300"
                leaveFrom="translate-x-0"
                leaveTo={side === 'right' ? 'translate-x-full' : '-translate-x-full'}
              >
                <Dialog.Panel className="pointer-events-auto w-screen max-w-full">
                  <div className="flex h-full flex-col bg-white shadow-xl">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-4 sm:px-6 border-b border-gray-200">
                      <Dialog.Title className="text-lg font-semibold text-gray-900">
                        {title}
                      </Dialog.Title>
                      <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-gray-100 touch-manipulation tap-highlight-transparent transition-colors"
                      >
                        <X className="w-5 h-5 text-gray-400" />
                      </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
                      {children}
                    </div>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  )
}