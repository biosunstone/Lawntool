/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['sunstonedigitaltech.com'],
  },
  experimental: {
    instrumentationHook: true,
  },
}

export default nextConfig