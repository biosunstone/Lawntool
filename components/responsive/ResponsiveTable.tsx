/**
 * Responsive Table Component
 * Transforms from table to card layout on mobile devices
 */

'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, MoreVertical, Filter, Download } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface Column {
  key: string
  label: string
  sortable?: boolean
  className?: string
  render?: (value: any, row: any) => React.ReactNode
  mobileHidden?: boolean // Hide this column in mobile card view
  mobilePrimary?: boolean // Make this the primary field in mobile view
}

interface ResponsiveTableProps {
  columns: Column[]
  data: any[]
  className?: string
  onRowClick?: (row: any) => void
  loading?: boolean
  emptyMessage?: string
  mobileBreakpoint?: 'sm' | 'md' | 'lg'
  actions?: (row: any) => React.ReactNode
}

export default function ResponsiveTable({
  columns,
  data,
  className = '',
  onRowClick,
  loading = false,
  emptyMessage = 'No data available',
  mobileBreakpoint = 'md',
  actions
}: ResponsiveTableProps) {
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null)
  const [expandedCard, setExpandedCard] = useState<string | null>(null)
  const [filterOpen, setFilterOpen] = useState(false)

  // Handle sorting
  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc'
    if (sortConfig?.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    setSortConfig({ key, direction })
  }

  // Sort data
  const sortedData = [...data].sort((a, b) => {
    if (!sortConfig) return 0
    
    const aValue = a[sortConfig.key]
    const bValue = b[sortConfig.key]
    
    if (aValue === bValue) return 0
    
    const comparison = aValue > bValue ? 1 : -1
    return sortConfig.direction === 'asc' ? comparison : -comparison
  })

  // Get primary column for mobile view
  const primaryColumn = columns.find(col => col.mobilePrimary) || columns[0]
  const visibleMobileColumns = columns.filter(col => !col.mobileHidden)

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className={`${className}`}>
      {/* Mobile Filter/Action Bar */}
      <div className={`${mobileBreakpoint}:hidden flex items-center justify-between mb-4 px-4`}>
        <button
          onClick={() => setFilterOpen(!filterOpen)}
          className="flex items-center space-x-2 px-3 py-2 bg-white rounded-lg shadow-sm border border-gray-200 touch-manipulation"
        >
          <Filter className="w-4 h-4" />
          <span className="text-sm font-medium">Filter</span>
        </button>
        
        <button className="p-2 bg-white rounded-lg shadow-sm border border-gray-200 touch-manipulation">
          <Download className="w-4 h-4" />
        </button>
      </div>

      {/* Desktop Table View */}
      <div className={`hidden ${mobileBreakpoint}:block overflow-x-auto`}>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`
                    px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider
                    ${column.sortable ? 'cursor-pointer hover:bg-gray-100' : ''}
                    ${column.className || ''}
                  `}
                  onClick={column.sortable ? () => handleSort(column.key) : undefined}
                >
                  <div className="flex items-center space-x-1">
                    <span>{column.label}</span>
                    {column.sortable && (
                      <div className="flex flex-col">
                        <ChevronUp 
                          className={`w-3 h-3 ${
                            sortConfig?.key === column.key && sortConfig.direction === 'asc'
                              ? 'text-primary-600'
                              : 'text-gray-400'
                          }`}
                        />
                        <ChevronDown 
                          className={`w-3 h-3 -mt-1 ${
                            sortConfig?.key === column.key && sortConfig.direction === 'desc'
                              ? 'text-primary-600'
                              : 'text-gray-400'
                          }`}
                        />
                      </div>
                    )}
                  </div>
                </th>
              ))}
              {actions && (
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (actions ? 1 : 0)} className="px-6 py-12 text-center text-gray-500">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              sortedData.map((row, index) => (
                <tr
                  key={index}
                  onClick={() => onRowClick?.(row)}
                  className={`${onRowClick ? 'cursor-pointer hover:bg-gray-50' : ''} transition-colors`}
                >
                  {columns.map((column) => (
                    <td key={column.key} className={`px-6 py-4 whitespace-nowrap text-sm ${column.className || ''}`}>
                      {column.render ? column.render(row[column.key], row) : row[column.key]}
                    </td>
                  ))}
                  {actions && (
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {actions(row)}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className={`${mobileBreakpoint}:hidden`}>
        {sortedData.length === 0 ? (
          <div className="px-4 py-12 text-center text-gray-500">
            {emptyMessage}
          </div>
        ) : (
          <div className="space-y-3 px-4">
            {sortedData.map((row, index) => {
              const isExpanded = expandedCard === `card-${index}`
              const primaryValue = primaryColumn.render 
                ? primaryColumn.render(row[primaryColumn.key], row)
                : row[primaryColumn.key]
              
              return (
                <motion.div
                  key={index}
                  layout
                  className="bg-white rounded-lg shadow-mobile-card border border-gray-200 overflow-hidden"
                >
                  {/* Card Header */}
                  <div
                    onClick={() => {
                      setExpandedCard(isExpanded ? null : `card-${index}`)
                      onRowClick?.(row)
                    }}
                    className="p-4 touch-manipulation tap-highlight-transparent"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        {/* Primary Field */}
                        <div className="font-medium text-gray-900 mb-1">
                          {primaryValue}
                        </div>
                        
                        {/* Secondary Fields */}
                        <div className="space-y-1">
                          {visibleMobileColumns
                            .filter(col => col.key !== primaryColumn.key)
                            .slice(0, isExpanded ? undefined : 2)
                            .map((column) => {
                              const value = column.render 
                                ? column.render(row[column.key], row)
                                : row[column.key]
                              
                              return (
                                <div key={column.key} className="text-sm text-gray-500">
                                  <span className="font-medium">{column.label}:</span> {value}
                                </div>
                              )
                            })}
                        </div>
                      </div>
                      
                      {/* Actions */}
                      <div className="flex items-center space-x-2 ml-4">
                        {actions && (
                          <div onClick={(e) => e.stopPropagation()}>
                            {actions(row)}
                          </div>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setExpandedCard(isExpanded ? null : `card-${index}`)
                          }}
                          className="p-1 rounded touch-manipulation"
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5 text-gray-400" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-gray-400" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Expanded Content */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="border-t border-gray-200"
                      >
                        <div className="p-4 bg-gray-50">
                          <div className="space-y-2">
                            {visibleMobileColumns
                              .filter(col => col.key !== primaryColumn.key)
                              .slice(2)
                              .map((column) => {
                                const value = column.render 
                                  ? column.render(row[column.key], row)
                                  : row[column.key]
                                
                                return (
                                  <div key={column.key} className="flex justify-between text-sm">
                                    <span className="font-medium text-gray-600">{column.label}:</span>
                                    <span className="text-gray-900">{value}</span>
                                  </div>
                                )
                              })}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}