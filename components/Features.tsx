import { Zap, Image, Layers, BarChart3, Clock, Shield } from 'lucide-react'

const features = [
  {
    name: 'AI-Powered Analysis',
    description: 'Advanced machine learning algorithms analyze satellite imagery to provide accurate measurements instantly.',
    icon: Zap,
  },
  {
    name: 'Multiple Image Sources',
    description: 'Works with Google, Mapbox, Nearmap, and other leading satellite and aerial imagery providers.',
    icon: Image,
  },
  {
    name: 'Comprehensive Measurements',
    description: 'Measure lawns, driveways, sidewalks, buildings, and more with precision down to square feet.',
    icon: Layers,
  },
  {
    name: 'Detailed Reports',
    description: 'Generate professional reports with measurements, visualizations, and property insights.',
    icon: BarChart3,
  },
  {
    name: '30-60 Second Results',
    description: 'Get accurate property measurements in under a minute, saving hours of manual work.',
    icon: Clock,
  },
  {
    name: 'Enterprise Security',
    description: 'Bank-level encryption and security measures to protect your data and client information.',
    icon: Shield,
  },
]

export default function Features() {
  return (
    <section id="features" className="py-24 bg-white">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Everything you need to measure properties remotely
          </h2>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            Deep Lawn combines cutting-edge AI technology with high-resolution imagery to deliver 
            the most accurate property measurements in the industry.
          </p>
        </div>
        
        <div className="mx-auto mt-16 max-w-7xl">
          <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 lg:max-w-none lg:grid-cols-3 lg:gap-y-16">
            {features.map((feature) => (
              <div key={feature.name} className="relative pl-16">
                <dt className="text-base font-semibold leading-7 text-gray-900">
                  <div className="absolute left-0 top-0 flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
                    <feature.icon className="h-6 w-6 text-white" aria-hidden="true" />
                  </div>
                  {feature.name}
                </dt>
                <dd className="mt-2 text-base leading-7 text-gray-600">{feature.description}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  )
}