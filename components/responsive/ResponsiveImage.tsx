/**
 * Responsive Image Components
 * Optimized image loading with lazy loading and responsive sizing
 */

'use client'

import { useState, useEffect, useRef, ImgHTMLAttributes } from 'react'
import { motion } from 'framer-motion'
import { Image as ImageIcon, X } from 'lucide-react'
import Image from 'next/image'

interface ResponsiveImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'srcSet'> {
  src: string
  alt: string
  responsiveSrcSet?: {
    mobile?: string
    tablet?: string
    desktop?: string
  }
  aspectRatio?: '1:1' | '4:3' | '16:9' | '21:9' | 'auto'
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down'
  lazy?: boolean
  placeholder?: 'blur' | 'skeleton' | 'none'
  blurDataURL?: string
  priority?: boolean
  sizes?: string
  onLoad?: () => void
  onError?: () => void
}

export function ResponsiveImage({
  src,
  alt,
  responsiveSrcSet,
  aspectRatio = 'auto',
  objectFit = 'cover',
  lazy = true,
  placeholder = 'skeleton',
  blurDataURL,
  priority = false,
  sizes = '100vw',
  onLoad,
  onError,
  className = '',
  ...props
}: ResponsiveImageProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [isInView, setIsInView] = useState(!lazy)
  const imgRef = useRef<HTMLDivElement>(null)

  // Aspect ratio classes
  const aspectRatioClasses = {
    '1:1': 'aspect-square',
    '4:3': 'aspect-4/3',
    '16:9': 'aspect-video',
    '21:9': 'aspect-[21/9]',
    'auto': ''
  }

  // Setup Intersection Observer for lazy loading
  useEffect(() => {
    if (!lazy || !imgRef.current) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true)
            observer.disconnect()
          }
        })
      },
      { rootMargin: '50px' }
    )

    observer.observe(imgRef.current)

    return () => observer.disconnect()
  }, [lazy])

  const handleLoad = () => {
    setIsLoaded(true)
    onLoad?.()
  }

  const handleError = () => {
    setHasError(true)
    onError?.()
  }

  // Generate responsive sources
  const generateSources = () => {
    if (!responsiveSrcSet) return null

    return (
      <picture>
        {responsiveSrcSet.mobile && (
          <source media="(max-width: 640px)" srcSet={responsiveSrcSet.mobile} />
        )}
        {responsiveSrcSet.tablet && (
          <source media="(max-width: 1024px)" srcSet={responsiveSrcSet.tablet} />
        )}
        {responsiveSrcSet.desktop && (
          <source media="(min-width: 1025px)" srcSet={responsiveSrcSet.desktop} />
        )}
      </picture>
    )
  }

  return (
    <div
      ref={imgRef}
      className={`relative overflow-hidden ${aspectRatioClasses[aspectRatio]} ${className}`}
    >
      {/* Placeholder */}
      {placeholder === 'skeleton' && !isLoaded && !hasError && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse" />
      )}

      {/* Error State */}
      {hasError && (
        <div className="absolute inset-0 bg-gray-100 flex flex-col items-center justify-center text-gray-400">
          <ImageIcon className="w-12 h-12 mb-2" />
          <span className="text-sm">Failed to load image</span>
        </div>
      )}

      {/* Image */}
      {isInView && !hasError && (
        <>
          {generateSources()}
          <img
            src={src}
            alt={alt}
            onLoad={handleLoad}
            onError={handleError}
            loading={lazy ? 'lazy' : 'eager'}
            className={`
              w-full h-full
              ${objectFit === 'contain' ? 'object-contain' : ''}
              ${objectFit === 'cover' ? 'object-cover' : ''}
              ${objectFit === 'fill' ? 'object-fill' : ''}
              ${objectFit === 'none' ? 'object-none' : ''}
              ${objectFit === 'scale-down' ? 'object-scale-down' : ''}
              ${isLoaded ? 'opacity-100' : 'opacity-0'}
              transition-opacity duration-300
            `}
            {...props}
          />
        </>
      )}
    </div>
  )
}

// Next.js Image Wrapper with Responsive Optimization
interface NextImageProps {
  src: string
  alt: string
  width?: number
  height?: number
  aspectRatio?: '1:1' | '4:3' | '16:9' | '21:9'
  priority?: boolean
  quality?: number
  placeholder?: 'blur' | 'empty'
  blurDataURL?: string
  className?: string
  containerClassName?: string
  sizes?: string
}

export function NextResponsiveImage({
  src,
  alt,
  width,
  height,
  aspectRatio,
  priority = false,
  quality = 75,
  placeholder = 'empty',
  blurDataURL,
  className = '',
  containerClassName = '',
  sizes = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw'
}: NextImageProps) {
  const aspectRatioClasses = {
    '1:1': 'aspect-square',
    '4:3': 'aspect-4/3',
    '16:9': 'aspect-video',
    '21:9': 'aspect-[21/9]'
  }

  if (aspectRatio && !width && !height) {
    return (
      <div className={`relative ${aspectRatioClasses[aspectRatio]} ${containerClassName}`}>
        <Image
          src={src}
          alt={alt}
          fill
          priority={priority}
          quality={quality}
          placeholder={placeholder}
          blurDataURL={blurDataURL}
          sizes={sizes}
          className={`object-cover ${className}`}
        />
      </div>
    )
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      priority={priority}
      quality={quality}
      placeholder={placeholder}
      blurDataURL={blurDataURL}
      sizes={sizes}
      className={className}
    />
  )
}

// Image Gallery with Lightbox
interface GalleryImage {
  src: string
  alt: string
  thumbnail?: string
  caption?: string
}

interface ImageGalleryProps {
  images: GalleryImage[]
  columns?: 2 | 3 | 4
  gap?: 'sm' | 'md' | 'lg'
  showCaptions?: boolean
}

export function ImageGallery({
  images,
  columns = 3,
  gap = 'md',
  showCaptions = false
}: ImageGalleryProps) {
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null)

  const columnClasses = {
    2: 'grid-cols-2',
    3: 'grid-cols-2 sm:grid-cols-3',
    4: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'
  }

  const gapClasses = {
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6'
  }

  return (
    <>
      {/* Gallery Grid */}
      <div className={`grid ${columnClasses[columns]} ${gapClasses[gap]}`}>
        {images.map((image, index) => (
          <motion.div
            key={index}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="cursor-pointer"
            onClick={() => setSelectedImage(image)}
          >
            <div className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
              <ResponsiveImage
                src={image.thumbnail || image.src}
                alt={image.alt}
                aspectRatio="1:1"
                className="w-full h-full"
              />
              {showCaptions && image.caption && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                  <p className="text-white text-sm truncate">{image.caption}</p>
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Lightbox */}
      {selectedImage && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <button
            onClick={() => setSelectedImage(null)}
            className="absolute top-4 right-4 p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.9 }}
            className="max-w-4xl max-h-[90vh] relative"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={selectedImage.src}
              alt={selectedImage.alt}
              className="w-full h-full object-contain"
            />
            {selectedImage.caption && (
              <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-4">
                <p className="text-white text-center">{selectedImage.caption}</p>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </>
  )
}

// Avatar Component
interface AvatarProps {
  src?: string
  alt?: string
  name?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  shape?: 'circle' | 'square'
  status?: 'online' | 'offline' | 'away' | 'busy'
  className?: string
}

export function Avatar({
  src,
  alt = '',
  name,
  size = 'md',
  shape = 'circle',
  status,
  className = ''
}: AvatarProps) {
  const sizeClasses = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg',
    xl: 'w-16 h-16 text-xl'
  }

  const statusColors = {
    online: 'bg-green-500',
    offline: 'bg-gray-400',
    away: 'bg-amber-500',
    busy: 'bg-red-500'
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className={`relative inline-block ${className}`}>
      <div
        className={`
          ${sizeClasses[size]}
          ${shape === 'circle' ? 'rounded-full' : 'rounded-lg'}
          overflow-hidden bg-gray-200 flex items-center justify-center
        `}
      >
        {src ? (
          <img src={src} alt={alt || name} className="w-full h-full object-cover" />
        ) : name ? (
          <span className="font-medium text-gray-600">{getInitials(name)}</span>
        ) : (
          <svg className="w-2/3 h-2/3 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
          </svg>
        )}
      </div>
      
      {status && (
        <span
          className={`
            absolute bottom-0 right-0
            ${size === 'xs' ? 'w-2 h-2' : ''}
            ${size === 'sm' ? 'w-2.5 h-2.5' : ''}
            ${size === 'md' ? 'w-3 h-3' : ''}
            ${size === 'lg' ? 'w-3.5 h-3.5' : ''}
            ${size === 'xl' ? 'w-4 h-4' : ''}
            ${statusColors[status]}
            rounded-full border-2 border-white
          `}
        />
      )}
    </div>
  )
}