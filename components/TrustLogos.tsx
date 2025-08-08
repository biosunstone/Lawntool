export default function TrustLogos() {
  const logos = [
    { name: 'Company 1', placeholder: 'LOGO' },
    { name: 'Company 2', placeholder: 'LOGO' },
    { name: 'Company 3', placeholder: 'LOGO' },
    { name: 'Company 4', placeholder: 'LOGO' },
    { name: 'Company 5', placeholder: 'LOGO' },
    { name: 'Company 6', placeholder: 'LOGO' },
  ]

  return (
    <section className="py-12 bg-gray-50">
      <div className="container">
        <div className="text-center">
          <p className="text-base font-semibold text-gray-600">
            Trusted by leading property management professionals
          </p>
          <div className="mt-8 grid grid-cols-2 gap-8 md:grid-cols-3 lg:grid-cols-6">
            {logos.map((logo) => (
              <div
                key={logo.name}
                className="col-span-1 flex justify-center items-center"
              >
                <div className="h-12 w-24 bg-gray-300 rounded flex items-center justify-center text-gray-600 font-semibold">
                  {logo.placeholder}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}