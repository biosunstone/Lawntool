/**
 * Property Map Email Template
 * Sends property measurements with static map image
 */

import { MeasurementData, PropertyBoundaryService } from '@/lib/maps/propertyBoundaryService'

interface MapEmailData {
  customerName: string
  email: string
  phone: string
  address: string
  mapUrl: string
  measurements: MeasurementData
  quoteNumber?: string
  businessName: string
  businessEmail: string
  businessPhone: string
  notes?: string
  status: 'completed' | 'abandoned'
}

export function generatePropertyMapEmailHTML(data: MapEmailData): string {
  const isAbandoned = data.status === 'abandoned'
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Your Property Measurement Report</title>
      <style>
        body {
          margin: 0;
          padding: 0;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          background-color: #f9fafb;
          color: #111827;
        }
        .container {
          max-width: 800px;
          margin: 0 auto;
          background-color: white;
        }
        .header {
          background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
          padding: 40px 30px;
          text-align: center;
        }
        .header h1 {
          color: white;
          margin: 0;
          font-size: 28px;
        }
        .header p {
          color: rgba(255, 255, 255, 0.9);
          margin: 10px 0 0;
          font-size: 16px;
        }
        .content {
          padding: 40px 30px;
        }
        .greeting {
          font-size: 18px;
          color: #111827;
          margin-bottom: 20px;
        }
        .property-info {
          background-color: #f3f4f6;
          border-radius: 12px;
          padding: 20px;
          margin: 25px 0;
        }
        .property-address {
          font-size: 16px;
          color: #374151;
          margin: 0 0 5px;
        }
        .property-id {
          font-size: 14px;
          color: #6b7280;
        }
        .map-container {
          margin: 30px 0;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .map-container img {
          width: 100%;
          height: auto;
          display: block;
        }
        .measurements-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 15px;
          margin: 30px 0;
        }
        .measurement-card {
          background: white;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          padding: 15px;
          text-align: center;
        }
        .measurement-card.primary {
          background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
          border-color: #22c55e;
        }
        .measurement-icon {
          font-size: 24px;
          margin-bottom: 8px;
        }
        .measurement-label {
          font-size: 12px;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 5px;
        }
        .measurement-value {
          font-size: 20px;
          font-weight: bold;
          color: #111827;
        }
        .measurement-unit {
          font-size: 14px;
          color: #6b7280;
        }
        .services-section {
          margin: 40px 0;
        }
        .services-title {
          font-size: 20px;
          font-weight: bold;
          color: #111827;
          margin-bottom: 20px;
        }
        .service-item {
          display: flex;
          align-items: center;
          padding: 15px;
          background: #f9fafb;
          border-radius: 8px;
          margin-bottom: 10px;
        }
        .service-icon {
          width: 40px;
          height: 40px;
          background: #22c55e;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 20px;
          margin-right: 15px;
        }
        .service-details {
          flex: 1;
        }
        .service-name {
          font-weight: 600;
          color: #111827;
          margin-bottom: 3px;
        }
        .service-area {
          font-size: 14px;
          color: #6b7280;
        }
        .cta-section {
          background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
          border-radius: 12px;
          padding: 30px;
          text-align: center;
          margin: 40px 0;
        }
        .cta-title {
          font-size: 24px;
          font-weight: bold;
          color: #78350f;
          margin-bottom: 10px;
        }
        .cta-subtitle {
          font-size: 16px;
          color: #92400e;
          margin-bottom: 20px;
        }
        .cta-button {
          display: inline-block;
          background: #16a34a;
          color: white;
          padding: 14px 32px;
          border-radius: 8px;
          text-decoration: none;
          font-weight: 600;
          font-size: 16px;
        }
        .info-box {
          background: #eff6ff;
          border-left: 4px solid #3b82f6;
          padding: 15px;
          margin: 20px 0;
        }
        .info-box-title {
          font-weight: 600;
          color: #1e40af;
          margin-bottom: 5px;
        }
        .info-box-text {
          color: #3730a3;
          font-size: 14px;
        }
        .footer {
          background: #f9fafb;
          padding: 30px;
          text-align: center;
          border-top: 1px solid #e5e7eb;
        }
        .footer-contact {
          margin-bottom: 20px;
        }
        .footer-contact a {
          color: #16a34a;
          text-decoration: none;
          margin: 0 10px;
        }
        .footer-text {
          font-size: 12px;
          color: #6b7280;
        }
        .legend {
          display: flex;
          justify-content: center;
          gap: 20px;
          margin: 15px 0;
          flex-wrap: wrap;
        }
        .legend-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          color: #4b5563;
        }
        .legend-color {
          width: 20px;
          height: 20px;
          border-radius: 4px;
          border: 2px solid white;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
        }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- Header -->
        <div class="header">
          <h1>${data.businessName}</h1>
          <p>${isAbandoned ? 'Complete Your Property Quote' : 'Your Property Measurement Report'}</p>
        </div>
        
        <!-- Content -->
        <div class="content">
          <!-- Greeting -->
          <div class="greeting">
            Hi ${data.customerName},
          </div>
          
          ${isAbandoned ? `
            <p style="font-size: 16px; color: #374151; line-height: 1.6;">
              We noticed you started getting a quote for your property but didn't complete the process. 
              We've saved your property measurements and prepared your personalized quote!
            </p>
          ` : `
            <p style="font-size: 16px; color: #374151; line-height: 1.6;">
              Thank you for requesting a quote! We've analyzed your property and prepared detailed measurements 
              for accurate service pricing.
            </p>
          `}
          
          <!-- Property Info -->
          <div class="property-info">
            <div class="property-address">
              📍 <strong>Property Address:</strong> ${data.address}
            </div>
            ${data.quoteNumber ? `
              <div class="property-id">
                Quote #: ${data.quoteNumber}
              </div>
            ` : ''}
          </div>
          
          <!-- Map Image -->
          <div class="map-container">
            <img src="${data.mapUrl}" alt="Property Boundary Map" />
          </div>
          
          <!-- Map Legend -->
          <div class="legend">
            <div class="legend-item">
              <div class="legend-color" style="background-color: #22c55e;"></div>
              <span>Property Boundary</span>
            </div>
            ${data.measurements.house ? `
              <div class="legend-item">
                <div class="legend-color" style="background-color: #8b4513;"></div>
                <span>House</span>
              </div>
            ` : ''}
            ${data.measurements.driveway ? `
              <div class="legend-item">
                <div class="legend-color" style="background-color: #6b7280;"></div>
                <span>Driveway</span>
              </div>
            ` : ''}
          </div>
          
          <!-- Measurements Grid -->
          <div class="measurements-grid">
            ${data.measurements.lot ? `
              <div class="measurement-card">
                <div class="measurement-icon">📐</div>
                <div class="measurement-label">Total Lot Size</div>
                <div class="measurement-value">
                  ${PropertyBoundaryService.formatArea(data.measurements.lot.area)}
                </div>
              </div>
            ` : ''}
            
            ${data.measurements.lawn ? `
              <div class="measurement-card primary">
                <div class="measurement-icon">🌱</div>
                <div class="measurement-label">Lawn Area</div>
                <div class="measurement-value">
                  ${PropertyBoundaryService.formatArea(data.measurements.lawn.area)}
                </div>
              </div>
            ` : ''}
            
            ${data.measurements.house ? `
              <div class="measurement-card">
                <div class="measurement-icon">🏠</div>
                <div class="measurement-label">House Area</div>
                <div class="measurement-value">
                  ${PropertyBoundaryService.formatArea(data.measurements.house.area)}
                </div>
                <div class="measurement-unit">
                  Perimeter: ${PropertyBoundaryService.formatPerimeter(data.measurements.house.perimeter)}
                </div>
              </div>
            ` : ''}
            
            ${data.measurements.driveway ? `
              <div class="measurement-card">
                <div class="measurement-icon">🚗</div>
                <div class="measurement-label">Driveway</div>
                <div class="measurement-value">
                  ${PropertyBoundaryService.formatArea(data.measurements.driveway.area)}
                </div>
              </div>
            ` : ''}
          </div>
          
          <!-- Recommended Services -->
          <div class="services-section">
            <div class="services-title">Recommended Services for Your Property</div>
            
            ${data.measurements.lawn && data.measurements.lawn.area > 0 ? `
              <div class="service-item">
                <div class="service-icon">✂️</div>
                <div class="service-details">
                  <div class="service-name">Lawn Mowing & Maintenance</div>
                  <div class="service-area">Service area: ${PropertyBoundaryService.formatArea(data.measurements.lawn.area)}</div>
                </div>
              </div>
              
              <div class="service-item">
                <div class="service-icon">💧</div>
                <div class="service-details">
                  <div class="service-name">Fertilization & Weed Control</div>
                  <div class="service-area">Treatment area: ${PropertyBoundaryService.formatArea(data.measurements.lawn.area)}</div>
                </div>
              </div>
            ` : ''}
            
            ${data.measurements.driveway && data.measurements.driveway.area > 0 ? `
              <div class="service-item">
                <div class="service-icon">🧹</div>
                <div class="service-details">
                  <div class="service-name">Driveway Cleaning & Sealing</div>
                  <div class="service-area">Surface area: ${PropertyBoundaryService.formatArea(data.measurements.driveway.area)}</div>
                </div>
              </div>
            ` : ''}
            
            ${data.measurements.house && data.measurements.house.perimeter > 0 ? `
              <div class="service-item">
                <div class="service-icon">🐛</div>
                <div class="service-details">
                  <div class="service-name">Perimeter Pest Control</div>
                  <div class="service-area">Treatment perimeter: ${PropertyBoundaryService.formatPerimeter(data.measurements.house.perimeter)}</div>
                </div>
              </div>
            ` : ''}
          </div>
          
          <!-- CTA Section -->
          <div class="cta-section">
            <div class="cta-title">
              ${isAbandoned ? 'Complete Your Quote Request' : 'Get Your Personalized Quote'}
            </div>
            <div class="cta-subtitle">
              ${isAbandoned ? 'Your measurements are saved - finish in just 30 seconds!' : 'See exact pricing based on your property measurements'}
            </div>
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/quote/complete?id=${data.quoteNumber || 'draft'}&email=${encodeURIComponent(data.email)}" class="cta-button">
              ${isAbandoned ? 'Complete Quote →' : 'View Full Quote →'}
            </a>
          </div>
          
          <!-- Info Box -->
          <div class="info-box">
            <div class="info-box-title">How We Calculate Your Quote</div>
            <div class="info-box-text">
              Our advanced mapping technology precisely measures your property boundaries to provide accurate, 
              fair pricing for all services. No hidden fees, no surprises - just transparent pricing based on 
              actual service areas.
            </div>
          </div>
          
          ${data.notes ? `
            <div style="margin-top: 30px; padding: 15px; background: #f9fafb; border-radius: 8px;">
              <strong style="color: #374151;">Your Notes:</strong>
              <p style="margin: 10px 0 0; color: #4b5563;">${data.notes}</p>
            </div>
          ` : ''}
        </div>
        
        <!-- Footer -->
        <div class="footer">
          <div class="footer-contact">
            <a href="mailto:${data.businessEmail}">📧 ${data.businessEmail}</a>
            <a href="tel:${data.businessPhone}">📞 ${data.businessPhone}</a>
          </div>
          <div class="footer-text">
            © ${new Date().getFullYear()} ${data.businessName}. All rights reserved.<br>
            ${isAbandoned ? 'You received this email because you started a quote request on our website.' : 'You received this email because you requested a quote on our website.'}
          </div>
        </div>
      </div>
    </body>
    </html>
  `
}

export function generatePropertyMapEmailText(data: MapEmailData): string {
  const isAbandoned = data.status === 'abandoned'
  
  return `
Hi ${data.customerName},

${isAbandoned 
  ? "We noticed you started getting a quote for your property but didn't complete the process. We've saved your property measurements and prepared your personalized quote!"
  : "Thank you for requesting a quote! We've analyzed your property and prepared detailed measurements for accurate service pricing."
}

PROPERTY DETAILS
================
Address: ${data.address}
${data.quoteNumber ? `Quote #: ${data.quoteNumber}` : ''}

PROPERTY MEASUREMENTS
====================
${data.measurements.lot ? `Total Lot Size: ${PropertyBoundaryService.formatArea(data.measurements.lot.area)}` : ''}
${data.measurements.lawn ? `Lawn Area: ${PropertyBoundaryService.formatArea(data.measurements.lawn.area)}` : ''}
${data.measurements.house ? `House Area: ${PropertyBoundaryService.formatArea(data.measurements.house.area)}
House Perimeter: ${PropertyBoundaryService.formatPerimeter(data.measurements.house.perimeter)}` : ''}
${data.measurements.driveway ? `Driveway: ${PropertyBoundaryService.formatArea(data.measurements.driveway.area)}` : ''}

RECOMMENDED SERVICES
===================
${data.measurements.lawn && data.measurements.lawn.area > 0 ? `✓ Lawn Mowing & Maintenance
✓ Fertilization & Weed Control` : ''}
${data.measurements.driveway && data.measurements.driveway.area > 0 ? `✓ Driveway Cleaning & Sealing` : ''}
${data.measurements.house && data.measurements.house.perimeter > 0 ? `✓ Perimeter Pest Control` : ''}

${isAbandoned ? 'COMPLETE YOUR QUOTE' : 'VIEW YOUR FULL QUOTE'}
================================
${isAbandoned ? 'Your measurements are saved - finish in just 30 seconds!' : 'See exact pricing based on your property measurements'}

Click here to ${isAbandoned ? 'complete' : 'view'} your quote:
${process.env.NEXT_PUBLIC_APP_URL}/quote/complete?id=${data.quoteNumber || 'draft'}&email=${encodeURIComponent(data.email)}

${data.notes ? `
Your Notes:
${data.notes}
` : ''}

Need help? Contact us:
Email: ${data.businessEmail}
Phone: ${data.businessPhone}

---
© ${new Date().getFullYear()} ${data.businessName}. All rights reserved.
${isAbandoned ? 'You received this email because you started a quote request on our website.' : 'You received this email because you requested a quote on our website.'}
  `.trim()
}

export function getPropertyMapEmailSubject(data: MapEmailData): string {
  if (data.status === 'abandoned') {
    return `${data.customerName}, your property measurements are ready (${PropertyBoundaryService.formatArea(data.measurements.lawn?.area || 0)} lawn)`
  }
  return `Your Property Measurement Report - ${data.address}`
}