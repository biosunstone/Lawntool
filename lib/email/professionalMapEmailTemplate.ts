/**
 * Professional Property Map Email Template
 * High-quality email with map visualizations and service breakdowns
 */

import { MeasurementData, PropertyBoundaryService } from '@/lib/maps/propertyBoundaryService'
import { ServiceAnnotation } from '@/lib/maps/professionalMapGenerator'

interface ProfessionalEmailData {
  customerName: string
  email: string
  phone: string
  address: string
  mapUrl: string
  measurements: MeasurementData
  annotations?: ServiceAnnotation[]
  quoteNumber?: string
  businessName: string
  businessEmail: string
  businessPhone: string
  businessLogo?: string
  notes?: string
  status: 'completed' | 'abandoned'
  serviceType?: 'outdoor' | 'perimeter' | 'mosquito' | 'all'
  pricing?: {
    outdoor?: number
    perimeter?: number
    mosquito?: number
    total?: number
  }
}

export function generateProfessionalEmailHTML(data: ProfessionalEmailData): string {
  const isAbandoned = data.status === 'abandoned'
  const serviceColors = {
    outdoor: '#00A651',
    perimeter: '#0066CC',
    mosquito: '#CC0000'
  }
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Your Professional Property Measurement Report</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
          color: #2d3748;
          line-height: 1.6;
        }
        .container {
          max-width: 900px;
          margin: 0 auto;
          background: white;
          box-shadow: 0 20px 60px rgba(0,0,0,0.1);
        }
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 60px 40px;
          text-align: center;
          position: relative;
          overflow: hidden;
        }
        .header::before {
          content: '';
          position: absolute;
          top: -50%;
          right: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
          animation: pulse 3s ease-in-out infinite;
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.1); opacity: 0.3; }
        }
        .header h1 {
          color: white;
          font-size: 36px;
          font-weight: 700;
          margin-bottom: 10px;
          position: relative;
          z-index: 1;
        }
        .header p {
          color: rgba(255,255,255,0.95);
          font-size: 18px;
          position: relative;
          z-index: 1;
        }
        .logo {
          width: 120px;
          height: auto;
          margin-bottom: 20px;
        }
        .content {
          padding: 50px 40px;
        }
        .greeting {
          font-size: 20px;
          color: #2d3748;
          margin-bottom: 30px;
          font-weight: 500;
        }
        .property-card {
          background: linear-gradient(135deg, #f6f8fb 0%, #ffffff 100%);
          border: 2px solid #e2e8f0;
          border-radius: 16px;
          padding: 25px;
          margin: 30px 0;
          position: relative;
        }
        .property-card::before {
          content: '📍';
          position: absolute;
          top: -15px;
          left: 25px;
          background: white;
          padding: 0 10px;
          font-size: 24px;
        }
        .property-address {
          font-size: 18px;
          font-weight: 600;
          color: #2d3748;
          margin-bottom: 8px;
        }
        .property-id {
          font-size: 14px;
          color: #718096;
        }
        .map-container {
          margin: 40px 0;
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 10px 40px rgba(0,0,0,0.15);
          position: relative;
        }
        .map-container img {
          width: 100%;
          height: auto;
          display: block;
        }
        .map-overlay {
          position: absolute;
          top: 20px;
          left: 20px;
          right: 20px;
          display: flex;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 15px;
          pointer-events: none;
        }
        .service-badge {
          background: white;
          border-radius: 12px;
          padding: 12px 20px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.15);
          border: 2px solid;
          max-width: 280px;
        }
        .service-badge.outdoor {
          border-color: #00A651;
        }
        .service-badge.perimeter {
          border-color: #0066CC;
        }
        .service-badge.mosquito {
          border-color: #CC0000;
        }
        .service-badge-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 8px;
        }
        .service-icon {
          width: 28px;
          height: 28px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          font-weight: bold;
          color: white;
        }
        .service-badge.outdoor .service-icon { background: #00A651; }
        .service-badge.perimeter .service-icon { background: #0066CC; }
        .service-badge.mosquito .service-icon { background: #CC0000; }
        .service-label {
          font-weight: 700;
          font-size: 14px;
          color: #2d3748;
        }
        .service-measurement {
          font-size: 13px;
          color: #4a5568;
          line-height: 1.4;
        }
        .service-measurement strong {
          color: #2d3748;
          font-weight: 600;
        }
        .measurements-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin: 40px 0;
        }
        .measurement-card {
          background: white;
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          padding: 20px;
          text-align: center;
          transition: all 0.3s ease;
        }
        .measurement-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0,0,0,0.1);
        }
        .measurement-card.primary {
          background: linear-gradient(135deg, #00A651 0%, #00C851 100%);
          border: none;
          color: white;
        }
        .measurement-icon {
          font-size: 32px;
          margin-bottom: 10px;
        }
        .measurement-label {
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 8px;
          opacity: 0.8;
        }
        .measurement-value {
          font-size: 24px;
          font-weight: 700;
        }
        .services-section {
          margin: 50px 0;
          padding: 40px;
          background: linear-gradient(135deg, #fafbfc 0%, #ffffff 100%);
          border-radius: 20px;
        }
        .services-title {
          font-size: 24px;
          font-weight: 700;
          color: #2d3748;
          margin-bottom: 30px;
          text-align: center;
        }
        .service-item {
          display: flex;
          align-items: center;
          padding: 20px;
          background: white;
          border-radius: 12px;
          margin-bottom: 15px;
          border: 2px solid transparent;
          transition: all 0.3s ease;
        }
        .service-item:hover {
          border-color: #667eea;
          transform: translateX(5px);
        }
        .service-item-icon {
          width: 50px;
          height: 50px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          margin-right: 20px;
          flex-shrink: 0;
        }
        .service-item.outdoor .service-item-icon { background: rgba(0,166,81,0.1); }
        .service-item.perimeter .service-item-icon { background: rgba(0,102,204,0.1); }
        .service-item.mosquito .service-item-icon { background: rgba(204,0,0,0.1); }
        .service-details { flex: 1; }
        .service-name {
          font-weight: 600;
          font-size: 16px;
          color: #2d3748;
          margin-bottom: 5px;
        }
        .service-area {
          font-size: 14px;
          color: #718096;
        }
        .service-price {
          font-size: 20px;
          font-weight: 700;
          color: #667eea;
        }
        .cta-section {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 20px;
          padding: 50px 40px;
          text-align: center;
          margin: 50px 0;
          position: relative;
          overflow: hidden;
        }
        .cta-section::before {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
        }
        .cta-title {
          font-size: 28px;
          font-weight: 700;
          color: white;
          margin-bottom: 15px;
          position: relative;
          z-index: 1;
        }
        .cta-subtitle {
          font-size: 16px;
          color: rgba(255,255,255,0.95);
          margin-bottom: 30px;
          position: relative;
          z-index: 1;
        }
        .cta-button {
          display: inline-block;
          background: white;
          color: #667eea;
          padding: 16px 40px;
          border-radius: 50px;
          text-decoration: none;
          font-weight: 700;
          font-size: 16px;
          transition: all 0.3s ease;
          position: relative;
          z-index: 1;
        }
        .cta-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        }
        .pricing-table {
          background: white;
          border-radius: 16px;
          padding: 30px;
          margin: 40px 0;
          box-shadow: 0 5px 20px rgba(0,0,0,0.08);
        }
        .pricing-row {
          display: flex;
          justify-content: space-between;
          padding: 15px 0;
          border-bottom: 1px solid #e2e8f0;
        }
        .pricing-row:last-child {
          border-bottom: none;
          padding-top: 20px;
          margin-top: 10px;
          border-top: 2px solid #667eea;
        }
        .pricing-service {
          font-weight: 500;
          color: #4a5568;
        }
        .pricing-amount {
          font-weight: 700;
          color: #2d3748;
        }
        .pricing-total {
          font-size: 20px;
          color: #667eea;
        }
        .footer {
          background: #2d3748;
          padding: 40px;
          text-align: center;
          color: white;
        }
        .footer-contact {
          margin-bottom: 20px;
        }
        .footer-contact a {
          color: #667eea;
          text-decoration: none;
          margin: 0 15px;
          font-weight: 500;
        }
        .footer-text {
          font-size: 12px;
          color: #a0aec0;
          margin-top: 20px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- Professional Header -->
        <div class="header">
          ${data.businessLogo ? `<img src="${data.businessLogo}" alt="${data.businessName}" class="logo">` : ''}
          <h1>${data.businessName}</h1>
          <p>${isAbandoned ? 'Complete Your Professional Property Assessment' : 'Your Professional Property Measurement Report'}</p>
        </div>
        
        <!-- Content -->
        <div class="content">
          <!-- Greeting -->
          <div class="greeting">
            Hello ${data.customerName},
          </div>
          
          ${isAbandoned ? `
            <p style="font-size: 16px; color: #4a5568; line-height: 1.8; margin-bottom: 30px;">
              We noticed you started getting a professional property assessment but didn't complete the process. 
              We've saved your property measurements and prepared detailed service recommendations tailored to your property.
            </p>
          ` : `
            <p style="font-size: 16px; color: #4a5568; line-height: 1.8; margin-bottom: 30px;">
              Thank you for requesting a professional property assessment! Our advanced measurement technology has analyzed 
              your property to provide accurate service recommendations and transparent pricing.
            </p>
          `}
          
          <!-- Property Information Card -->
          <div class="property-card">
            <div class="property-address">${data.address}</div>
            ${data.quoteNumber ? `
              <div class="property-id">Quote Reference: ${data.quoteNumber}</div>
            ` : ''}
          </div>
          
          <!-- Professional Map with Service Overlays -->
          <div class="map-container">
            <img src="${data.mapUrl}" alt="Professional Property Analysis" />
            ${data.annotations && data.annotations.length > 0 ? `
              <div class="map-overlay">
                ${data.annotations.map(annotation => `
                  <div class="service-badge ${annotation.type}">
                    <div class="service-badge-header">
                      <div class="service-icon">
                        ${annotation.type === 'outdoor' ? '🌿' : 
                          annotation.type === 'perimeter' ? '🛡️' : '🦟'}
                      </div>
                      <div class="service-label">${annotation.label}</div>
                    </div>
                    <div class="service-measurement">${annotation.measurement}</div>
                  </div>
                `).join('')}
              </div>
            ` : ''}
          </div>
          
          <!-- Professional Measurements Grid -->
          <div class="measurements-grid">
            ${data.measurements.lot ? `
              <div class="measurement-card">
                <div class="measurement-icon">📐</div>
                <div class="measurement-label">Total Property</div>
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
                <div class="measurement-label">House Footprint</div>
                <div class="measurement-value">
                  ${PropertyBoundaryService.formatArea(data.measurements.house.area)}
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
          
          <!-- Professional Service Recommendations -->
          <div class="services-section">
            <div class="services-title">Recommended Professional Services</div>
            
            ${data.measurements.lawn && data.measurements.lawn.area > 0 ? `
              <div class="service-item outdoor">
                <div class="service-item-icon">🌿</div>
                <div class="service-details">
                  <div class="service-name">Outdoor Pest Control</div>
                  <div class="service-area">
                    Coverage Area: ${PropertyBoundaryService.formatArea(data.measurements.lawn.area)} | 
                    Protects your lawn from pests and diseases
                  </div>
                </div>
                ${data.pricing?.outdoor ? `
                  <div class="service-price">$${data.pricing.outdoor}/treatment</div>
                ` : ''}
              </div>
            ` : ''}
            
            ${data.measurements.house && data.measurements.house.perimeter > 0 ? `
              <div class="service-item perimeter">
                <div class="service-item-icon">🛡️</div>
                <div class="service-details">
                  <div class="service-name">Perimeter Pest Control</div>
                  <div class="service-area">
                    Coverage: ${PropertyBoundaryService.formatPerimeter(data.measurements.house.perimeter)} perimeter | 
                    Creates a protective barrier around your home
                  </div>
                </div>
                ${data.pricing?.perimeter ? `
                  <div class="service-price">$${data.pricing.perimeter}/treatment</div>
                ` : ''}
              </div>
            ` : ''}
            
            ${data.measurements.lot ? `
              <div class="service-item mosquito">
                <div class="service-item-icon">🦟</div>
                <div class="service-details">
                  <div class="service-name">Mosquito Control</div>
                  <div class="service-area">
                    Full Property: ${PropertyBoundaryService.formatArea(data.measurements.lot.area)} | 
                    Complete mosquito elimination and prevention
                  </div>
                </div>
                ${data.pricing?.mosquito ? `
                  <div class="service-price">$${data.pricing.mosquito}/treatment</div>
                ` : ''}
              </div>
            ` : ''}
          </div>
          
          ${data.pricing?.total ? `
            <!-- Pricing Summary -->
            <div class="pricing-table">
              <h3 style="font-size: 20px; font-weight: 700; margin-bottom: 20px; color: #2d3748;">
                Service Package Summary
              </h3>
              ${data.pricing.outdoor ? `
                <div class="pricing-row">
                  <span class="pricing-service">Outdoor Pest Control</span>
                  <span class="pricing-amount">$${data.pricing.outdoor}</span>
                </div>
              ` : ''}
              ${data.pricing.perimeter ? `
                <div class="pricing-row">
                  <span class="pricing-service">Perimeter Pest Control</span>
                  <span class="pricing-amount">$${data.pricing.perimeter}</span>
                </div>
              ` : ''}
              ${data.pricing.mosquito ? `
                <div class="pricing-row">
                  <span class="pricing-service">Mosquito Control</span>
                  <span class="pricing-amount">$${data.pricing.mosquito}</span>
                </div>
              ` : ''}
              <div class="pricing-row">
                <span class="pricing-service" style="font-size: 18px;">Total Package</span>
                <span class="pricing-amount pricing-total">$${data.pricing.total}/treatment</span>
              </div>
            </div>
          ` : ''}
          
          <!-- Professional CTA Section -->
          <div class="cta-section">
            <div class="cta-title">
              ${isAbandoned ? 'Complete Your Service Request' : 'Schedule Your Professional Service'}
            </div>
            <div class="cta-subtitle">
              ${isAbandoned 
                ? 'Your property analysis is ready - finish in just 30 seconds!' 
                : 'Get started with our professional pest control services today'}
            </div>
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/quote/complete?id=${data.quoteNumber || 'draft'}&email=${encodeURIComponent(data.email)}" 
               class="cta-button">
              ${isAbandoned ? 'Complete My Quote →' : 'Schedule Service →'}
            </a>
          </div>
          
          ${data.notes ? `
            <div style="margin-top: 40px; padding: 20px; background: #f7fafc; border-radius: 12px; border-left: 4px solid #667eea;">
              <strong style="color: #2d3748;">Special Instructions:</strong>
              <p style="margin: 10px 0 0; color: #4a5568;">${data.notes}</p>
            </div>
          ` : ''}
        </div>
        
        <!-- Professional Footer -->
        <div class="footer">
          <div class="footer-contact">
            <a href="mailto:${data.businessEmail}">📧 ${data.businessEmail}</a>
            <a href="tel:${data.businessPhone}">📞 ${data.businessPhone}</a>
          </div>
          <div class="footer-text">
            © ${new Date().getFullYear()} ${data.businessName}. All rights reserved.<br>
            Professional Pest Control Services | Licensed & Insured<br>
            ${isAbandoned 
              ? 'You received this email because you started a service request on our website.' 
              : 'You received this email because you requested a professional property assessment.'}
          </div>
        </div>
      </div>
    </body>
    </html>
  `
}

export function generateProfessionalEmailText(data: ProfessionalEmailData): string {
  const isAbandoned = data.status === 'abandoned'
  
  return `
${data.businessName}
PROFESSIONAL PROPERTY MEASUREMENT REPORT

Hello ${data.customerName},

${isAbandoned 
  ? "We noticed you started getting a professional property assessment but didn't complete the process. We've saved your property measurements and prepared detailed service recommendations."
  : "Thank you for requesting a professional property assessment! Our advanced measurement technology has analyzed your property to provide accurate service recommendations."}

PROPERTY DETAILS
================
Address: ${data.address}
${data.quoteNumber ? `Quote Reference: ${data.quoteNumber}` : ''}

PROFESSIONAL MEASUREMENTS
========================
${data.measurements.lot ? `Total Property: ${PropertyBoundaryService.formatArea(data.measurements.lot.area)}` : ''}
${data.measurements.lawn ? `Lawn Area: ${PropertyBoundaryService.formatArea(data.measurements.lawn.area)}` : ''}
${data.measurements.house ? `House Footprint: ${PropertyBoundaryService.formatArea(data.measurements.house.area)}
House Perimeter: ${PropertyBoundaryService.formatPerimeter(data.measurements.house.perimeter)}` : ''}
${data.measurements.driveway ? `Driveway: ${PropertyBoundaryService.formatArea(data.measurements.driveway.area)}` : ''}

RECOMMENDED PROFESSIONAL SERVICES
=================================
${data.measurements.lawn && data.measurements.lawn.area > 0 ? `✓ Outdoor Pest Control
  Coverage: ${PropertyBoundaryService.formatArea(data.measurements.lawn.area)}
  ${data.pricing?.outdoor ? `Price: $${data.pricing.outdoor}/treatment` : ''}` : ''}

${data.measurements.house && data.measurements.house.perimeter > 0 ? `✓ Perimeter Pest Control
  Coverage: ${PropertyBoundaryService.formatPerimeter(data.measurements.house.perimeter)} perimeter
  ${data.pricing?.perimeter ? `Price: $${data.pricing.perimeter}/treatment` : ''}` : ''}

${data.measurements.lot ? `✓ Mosquito Control
  Coverage: ${PropertyBoundaryService.formatArea(data.measurements.lot.area)} (full property)
  ${data.pricing?.mosquito ? `Price: $${data.pricing.mosquito}/treatment` : ''}` : ''}

${data.pricing?.total ? `
TOTAL PACKAGE: $${data.pricing.total}/treatment
` : ''}

${isAbandoned ? 'COMPLETE YOUR SERVICE REQUEST' : 'SCHEDULE YOUR SERVICE'}
====================================
${isAbandoned 
  ? 'Your property analysis is ready - finish in just 30 seconds!' 
  : 'Get started with our professional pest control services today'}

Click here to ${isAbandoned ? 'complete' : 'schedule'}:
${process.env.NEXT_PUBLIC_APP_URL}/quote/complete?id=${data.quoteNumber || 'draft'}&email=${encodeURIComponent(data.email)}

${data.notes ? `
Special Instructions:
${data.notes}
` : ''}

Need assistance? Contact us:
Email: ${data.businessEmail}
Phone: ${data.businessPhone}

---
© ${new Date().getFullYear()} ${data.businessName}. Professional Pest Control Services.
${isAbandoned 
  ? 'You received this email because you started a service request on our website.' 
  : 'You received this email because you requested a professional property assessment.'}
  `.trim()
}

export function getProfessionalEmailSubject(data: ProfessionalEmailData): string {
  if (data.status === 'abandoned') {
    return `${data.customerName}, your professional property analysis is ready (${PropertyBoundaryService.formatArea(data.measurements.lawn?.area || 0)} lawn)`
  }
  return `Professional Property Measurement Report - ${data.address}`
}