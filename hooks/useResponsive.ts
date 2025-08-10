/**
 * Responsive Hooks
 * Custom hooks for responsive design utilities
 */

import { useState, useEffect, useCallback, useRef } from 'react'

// Breakpoint definitions (matching Tailwind config)
export const BREAKPOINTS = {
  xs: 320,
  sm: 480,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
  '3xl': 1920
} as const

export type Breakpoint = keyof typeof BREAKPOINTS

// Hook to get current breakpoint
export function useBreakpoint() {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>('xs')

  useEffect(() => {
    const getBreakpoint = (): Breakpoint => {
      const width = window.innerWidth
      
      if (width >= BREAKPOINTS['3xl']) return '3xl'
      if (width >= BREAKPOINTS['2xl']) return '2xl'
      if (width >= BREAKPOINTS.xl) return 'xl'
      if (width >= BREAKPOINTS.lg) return 'lg'
      if (width >= BREAKPOINTS.md) return 'md'
      if (width >= BREAKPOINTS.sm) return 'sm'
      return 'xs'
    }

    const handleResize = () => {
      setBreakpoint(getBreakpoint())
    }

    // Set initial breakpoint
    handleResize()

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return breakpoint
}

// Hook to check if screen is smaller than a breakpoint
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const media = window.matchMedia(query)
    
    const updateMatch = () => setMatches(media.matches)
    updateMatch()

    // Modern browsers
    if (media.addEventListener) {
      media.addEventListener('change', updateMatch)
      return () => media.removeEventListener('change', updateMatch)
    }
    // Fallback for older browsers
    else {
      media.addListener(updateMatch)
      return () => media.removeListener(updateMatch)
    }
  }, [query])

  return matches
}

// Convenient media query hooks
export function useIsMobile() {
  return useMediaQuery(`(max-width: ${BREAKPOINTS.md - 1}px)`)
}

export function useIsTablet() {
  return useMediaQuery(`(min-width: ${BREAKPOINTS.md}px) and (max-width: ${BREAKPOINTS.lg - 1}px)`)
}

export function useIsDesktop() {
  return useMediaQuery(`(min-width: ${BREAKPOINTS.lg}px)`)
}

export function useIsTouch() {
  return useMediaQuery('(hover: none) and (pointer: coarse)')
}

// Hook for responsive value based on breakpoint
export function useResponsiveValue<T>(values: Partial<Record<Breakpoint, T>> & { default: T }): T {
  const breakpoint = useBreakpoint()
  
  // Find the value for current breakpoint or fall back to smaller ones
  const breakpointOrder: Breakpoint[] = ['3xl', '2xl', 'xl', 'lg', 'md', 'sm', 'xs']
  const currentIndex = breakpointOrder.indexOf(breakpoint)
  
  for (let i = currentIndex; i < breakpointOrder.length; i++) {
    const bp = breakpointOrder[i]
    if (bp in values) {
      return values[bp as Breakpoint]!
    }
  }
  
  return values.default
}

// Hook for device orientation
export function useOrientation() {
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait')

  useEffect(() => {
    const updateOrientation = () => {
      setOrientation(window.innerHeight > window.innerWidth ? 'portrait' : 'landscape')
    }

    updateOrientation()
    window.addEventListener('resize', updateOrientation)
    window.addEventListener('orientationchange', updateOrientation)

    return () => {
      window.removeEventListener('resize', updateOrientation)
      window.removeEventListener('orientationchange', updateOrientation)
    }
  }, [])

  return orientation
}

// Hook for viewport dimensions
export function useViewport() {
  const [viewport, setViewport] = useState({
    width: 0,
    height: 0,
    vw: 0,
    vh: 0
  })

  useEffect(() => {
    const updateViewport = () => {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight,
        vw: window.innerWidth / 100,
        vh: window.innerHeight / 100
      })
    }

    updateViewport()
    window.addEventListener('resize', updateViewport)

    return () => window.removeEventListener('resize', updateViewport)
  }, [])

  return viewport
}

// Hook for detecting scroll position
export function useScrollPosition() {
  const [scrollPosition, setScrollPosition] = useState({
    x: 0,
    y: 0,
    direction: 'none' as 'up' | 'down' | 'none'
  })
  const previousScrollY = useRef(0)

  useEffect(() => {
    const updateScrollPosition = () => {
      const currentScrollY = window.scrollY
      const direction = currentScrollY > previousScrollY.current ? 'down' : 
                       currentScrollY < previousScrollY.current ? 'up' : 'none'
      
      setScrollPosition({
        x: window.scrollX,
        y: currentScrollY,
        direction
      })
      
      previousScrollY.current = currentScrollY
    }

    updateScrollPosition()
    window.addEventListener('scroll', updateScrollPosition, { passive: true })

    return () => window.removeEventListener('scroll', updateScrollPosition)
  }, [])

  return scrollPosition
}

// Hook for sticky header behavior
export function useStickyHeader(threshold = 100) {
  const [isSticky, setIsSticky] = useState(false)
  const [isVisible, setIsVisible] = useState(true)
  const scrollPosition = useScrollPosition()

  useEffect(() => {
    setIsSticky(scrollPosition.y > threshold)
    setIsVisible(scrollPosition.direction !== 'down' || scrollPosition.y < threshold)
  }, [scrollPosition, threshold])

  return { isSticky, isVisible }
}

// Hook for intersection observer (useful for animations/lazy loading)
export function useIntersectionObserver(
  ref: React.RefObject<Element>,
  options?: IntersectionObserverInit
) {
  const [isIntersecting, setIsIntersecting] = useState(false)
  const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null)

  useEffect(() => {
    if (!ref.current) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting)
        setEntry(entry)
      },
      options
    )

    observer.observe(ref.current)

    return () => observer.disconnect()
  }, [ref, options])

  return { isIntersecting, entry }
}

// Hook for debounced window resize
export function useWindowSize(delay = 200) {
  const [windowSize, setWindowSize] = useState({
    width: 0,
    height: 0
  })

  useEffect(() => {
    let timeoutId: NodeJS.Timeout

    const handleResize = () => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        setWindowSize({
          width: window.innerWidth,
          height: window.innerHeight
        })
      }, delay)
    }

    // Set initial size
    setWindowSize({
      width: window.innerWidth,
      height: window.innerHeight
    })

    window.addEventListener('resize', handleResize)
    return () => {
      clearTimeout(timeoutId)
      window.removeEventListener('resize', handleResize)
    }
  }, [delay])

  return windowSize
}

// Hook for container queries (element-based responsive design)
export function useContainerQuery<T extends HTMLElement>(
  ref: React.RefObject<T>,
  breakpoints: Record<string, number>
) {
  const [activeBreakpoint, setActiveBreakpoint] = useState<string | null>(null)

  useEffect(() => {
    if (!ref.current) return

    const element = ref.current
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width
        
        // Find the largest breakpoint that fits
        let active: string | null = null
        let maxWidth = 0
        
        for (const [name, minWidth] of Object.entries(breakpoints)) {
          if (width >= minWidth && minWidth > maxWidth) {
            active = name
            maxWidth = minWidth
          }
        }
        
        setActiveBreakpoint(active)
      }
    })

    resizeObserver.observe(element)
    return () => resizeObserver.disconnect()
  }, [ref, breakpoints])

  return activeBreakpoint
}