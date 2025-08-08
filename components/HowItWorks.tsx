import { MapPin, Cpu, FileText } from 'lucide-react'

const steps = [
  {
    id: '01',
    name: 'Enter Property Address',
    description: 'Simply type in the property address or drop a pin on the map to select the area you want to measure.',
    icon: MapPin,
  },
  {
    id: '02',
    name: 'AI Analyzes Imagery',
    description: 'Our AI technology instantly analyzes satellite and aerial imagery to identify and measure all property features.',
    icon: Cpu,
  },
  {
    id: '03',
    name: 'Get Instant Results',
    description: 'Receive accurate measurements for lawns, driveways, buildings, and more in a detailed report within seconds.',
    icon: FileText,
  },
]

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 bg-gray-50">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            How It Works
          </h2>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            Get accurate property measurements in three simple steps
          </p>
        </div>

        <div className="mx-auto mt-16 max-w-7xl">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {steps.map((step, index) => (
              <div key={step.name} className="relative">
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-16 left-1/2 w-full h-0.5 bg-gray-300" />
                )}
                <div className="relative flex flex-col items-center text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-white text-2xl font-bold">
                    {step.id}
                  </div>
                  <div className="mt-6">
                    <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
                      <step.icon className="h-10 w-10 text-primary" aria-hidden="true" />
                    </div>
                    <h3 className="mt-6 text-xl font-semibold text-gray-900">{step.name}</h3>
                    <p className="mt-2 text-base text-gray-600">{step.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}