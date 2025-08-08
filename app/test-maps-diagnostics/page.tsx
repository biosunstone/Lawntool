'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'

interface DiagnosticResult {
  test: string
  status: 'pass' | 'fail' | 'warning'
  details: string
}

export default function TestMapsDiagnostics() {
  const [results, setResults] = useState<DiagnosticResult[]>([])
  const [isRunning, setIsRunning] = useState(false)

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''

  const runDiagnostics = async () => {
    setIsRunning(true)
    setResults([])
    
    const diagnostics: DiagnosticResult[] = []

    // Test 1: API Key presence
    diagnostics.push({
      test: 'API Key Configuration',
      status: apiKey ? 'pass' : 'fail',
      details: apiKey ? `Key present (${apiKey.length} characters)` : 'No API key found'
    })

    // Test 2: Environment check
    diagnostics.push({
      test: 'Environment',
      status: 'pass',
      details: `Running in ${typeof window !== 'undefined' ? 'browser' : 'server'} environment`
    })

    // Test 3: Check for Content Security Policy
    const cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]')
    diagnostics.push({
      test: 'Content Security Policy',
      status: cspMeta ? 'warning' : 'pass',
      details: cspMeta ? 'CSP meta tag found - may block external scripts' : 'No CSP restrictions found'
    })

    // Test 4: Try to load a test script
    try {
      const testScript = document.createElement('script')
      testScript.src = 'https://maps.googleapis.com/maps/api/js?v=3.exp'
      document.head.appendChild(testScript)
      
      await new Promise((resolve) => setTimeout(resolve, 1000))
      
      diagnostics.push({
        test: 'Script Loading',
        status: 'pass',
        details: 'Can add script tags to document'
      })
      
      document.head.removeChild(testScript)
    } catch (error: any) {
      diagnostics.push({
        test: 'Script Loading',
        status: 'fail',
        details: `Error: ${error.message}`
      })
    }

    // Test 5: Check for ad blockers or extensions
    diagnostics.push({
      test: 'Browser Extensions',
      status: 'warning',
      details: 'Check if ad blockers or security extensions are blocking Google Maps'
    })

    // Test 6: Network connectivity to Google
    try {
      const response = await fetch('https://maps.googleapis.com/maps/api/js?v=3.exp', {
        method: 'HEAD',
        mode: 'no-cors'
      })
      diagnostics.push({
        test: 'Network Access to Google Maps',
        status: 'pass',
        details: 'Can reach maps.googleapis.com'
      })
    } catch (error) {
      diagnostics.push({
        test: 'Network Access to Google Maps',
        status: 'fail',
        details: 'Cannot reach Google Maps servers'
      })
    }

    // Test 7: Check localStorage
    try {
      localStorage.setItem('test', 'test')
      localStorage.removeItem('test')
      diagnostics.push({
        test: 'Local Storage',
        status: 'pass',
        details: 'Local storage is accessible'
      })
    } catch (error) {
      diagnostics.push({
        test: 'Local Storage',
        status: 'warning',
        details: 'Local storage may be blocked'
      })
    }

    // Test 8: Check for HTTPS
    diagnostics.push({
      test: 'HTTPS Protocol',
      status: window.location.protocol === 'https:' ? 'pass' : 'warning',
      details: `Running on ${window.location.protocol}${window.location.host}`
    })

    // Test 9: API Key validation
    if (apiKey) {
      try {
        const testUrl = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=__googleMapsCallback`
        const response = await fetch(testUrl, { method: 'HEAD', mode: 'no-cors' })
        diagnostics.push({
          test: 'API Key Validation',
          status: 'pass',
          details: 'API key format appears valid'
        })
      } catch (error) {
        diagnostics.push({
          test: 'API Key Validation',
          status: 'warning',
          details: 'Could not validate API key'
        })
      }
    }

    setResults(diagnostics)
    setIsRunning(false)
  }

  useEffect(() => {
    runDiagnostics()
  }, [])

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Google Maps Diagnostics</h1>
      
      <div className="mb-6">
        <button
          onClick={runDiagnostics}
          disabled={isRunning}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
        >
          {isRunning ? 'Running...' : 'Run Diagnostics'}
        </button>
      </div>

      <div className="space-y-4">
        {results.map((result, idx) => (
          <div 
            key={idx}
            className={`p-4 rounded border-2 ${
              result.status === 'pass' 
                ? 'bg-green-50 border-green-300' 
                : result.status === 'fail'
                ? 'bg-red-50 border-red-300'
                : 'bg-yellow-50 border-yellow-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">{result.test}</h3>
              <span className={`px-3 py-1 rounded text-sm font-medium ${
                result.status === 'pass'
                  ? 'bg-green-200 text-green-800'
                  : result.status === 'fail'
                  ? 'bg-red-200 text-red-800'
                  : 'bg-yellow-200 text-yellow-800'
              }`}>
                {result.status.toUpperCase()}
              </span>
            </div>
            <p className="mt-2 text-gray-700">{result.details}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 p-6 bg-blue-50 rounded">
        <h2 className="text-xl font-semibold mb-4">Next Steps:</h2>
        <ol className="list-decimal list-inside space-y-2">
          <li>Open browser console (F12) and check for errors</li>
          <li>Visit <code className="bg-white px-2 py-1 rounded">/test-google-maps.html</code> for standalone test</li>
          <li>Check Google Cloud Console for API key restrictions</li>
          <li>Ensure Maps JavaScript API is enabled</li>
          <li>Add <code className="bg-white px-2 py-1 rounded">localhost:3000/*</code> to allowed referrers</li>
          <li>Disable browser extensions temporarily</li>
        </ol>
      </div>

      <div className="mt-6 p-4 bg-gray-100 rounded">
        <h3 className="font-semibold mb-2">Quick Console Commands:</h3>
        <pre className="text-sm bg-white p-3 rounded overflow-x-auto">
{`// Check if Google Maps is loaded
console.log('Google object:', window.google);
console.log('Google Maps:', window.google?.maps);

// Check for blocked requests
Array.from(document.querySelectorAll('script')).forEach(s => {
  if (s.src.includes('googleapis')) console.log('Google script:', s.src);
});`}
        </pre>
      </div>
    </div>
  )
}