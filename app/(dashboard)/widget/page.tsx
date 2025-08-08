'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { 
  Code, 
  Settings, 
  Copy, 
  Check,
  ExternalLink,
  Palette,
  Type,
  Layout,
  Eye,
  EyeOff
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function WidgetPage() {
  const { data: session }:any = useSession()
  const [activeTab, setActiveTab] = useState<'embed' | 'settings' | 'preview'>('embed')
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [widgetSettings, setWidgetSettings] = useState({
    primaryColor: '#00A651',
    secondaryColor: '#ffffff',
    fontFamily: 'Inter, sans-serif',
    borderRadius: '8px',
    showCompanyName: true,
    showDescription: true,
    description: 'Get an instant quote for your property services',
    buttonText: 'Get Instant Quote',
    position: 'bottom-right' as 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left',
    allowedServices: ['lawn', 'driveway', 'sidewalk'],
    collectPhone: false,
    collectAddress: true,
    requiredFields: ['name', 'email'] as Array<'name' | 'email' | 'phone' | 'address'>,
    autoGenerateQuote: true,
    sendQuoteEmail: true,
    autoOpen: false,
    delay: 0,
    enableManualSelection: true,
    enableAIDetection: true,
    showPriceBreakdown: false,
    allowServiceCustomization: true,
    triggerOn: 'click' as const,
    scrollPercentage: 50,
    exitIntentSensitivity: 20,
    enableAnalytics: true,
    isActive: true,
    domains: [] as string[]
  })

  const businessId = session?.user?.businessId || 'YOUR_BUSINESS_ID'
  const widgetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/widget/${businessId}`
  
  const embedCode = `<!-- Sunstone Property Measurement Widget -->
<script src="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/widget/embed.js"></script>
<script>
  ssWidget('init', {
    businessId: '${businessId}',
    position: '${widgetSettings.position}',
    autoOpen: ${widgetSettings.autoOpen},
    delay: ${widgetSettings.delay}
  });
</script>
<!-- End Sunstone Widget -->`

  const iframeCode = `<iframe 
  src="${widgetUrl}"
  width="100%" 
  height="800" 
  frameborder="0"
  style="border: none; max-width: 100%;">
</iframe>`

  const directLink = widgetUrl

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    toast.success('Copied to clipboard!')
    setTimeout(() => setCopied(false), 2000)
  }

  // Load widget settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch('/api/widget/settings')
        if (response.ok) {
          const data = await response.json()
          if (data.settings) {
            setWidgetSettings(data.settings)
          }
        }
      } catch (error) {
        console.error('Error loading widget settings:', error)
      } finally {
        setLoading(false)
      }
    }
    
    if (session?.user?.businessId) {
      loadSettings()
    } else {
      setLoading(false)
    }
  }, [session])

  const handleSaveSettings = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/widget/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: widgetSettings })
      })
      
      if (!response.ok) {
        throw new Error('Failed to save settings')
      }
      
      toast.success('Widget settings saved successfully!')
    } catch (error) {
      console.error('Error saving widget settings:', error)
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const handleResetSettings = async () => {
    if (!confirm('Are you sure you want to reset widget settings to defaults?')) {
      return
    }
    
    setSaving(true)
    try {
      const response = await fetch('/api/widget/settings', {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        throw new Error('Failed to reset settings')
      }
      
      const data = await response.json()
      if (data.settings) {
        setWidgetSettings(data.settings)
      }
      
      toast.success('Widget settings reset to defaults!')
    } catch (error) {
      console.error('Error resetting widget settings:', error)
      toast.error('Failed to reset settings')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900">Embeddable Widget</h1>
        <p className="mt-1 text-sm text-gray-600">
          Let customers get instant quotes directly from your website
        </p>
      </div>

      {/* Tabs */}
      <div className="bg-white shadow rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('embed')}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${
                activeTab === 'embed'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Code className="inline h-4 w-4 mr-2" />
              Embed Code
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${
                activeTab === 'settings'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Settings className="inline h-4 w-4 mr-2" />
              Settings
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${
                activeTab === 'preview'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Eye className="inline h-4 w-4 mr-2" />
              Preview
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'embed' && (
            <div className="space-y-6">
              {/* JavaScript Embed */}
              <div>
                <h3 className="text-lg font-semibold mb-2">JavaScript Widget (Recommended)</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Add this code to your website's HTML, preferably before the closing &lt;/body&gt; tag.
                  The widget will appear as a floating button on your site.
                </p>
                <div className="relative">
                  <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                    {embedCode}
                  </pre>
                  <button
                    onClick={() => handleCopy(embedCode)}
                    className="absolute top-2 right-2 p-2 bg-gray-800 hover:bg-gray-700 rounded transition-colors"
                  >
                    {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4 text-gray-300" />}
                  </button>
                </div>
              </div>

              {/* Iframe Embed */}
              <div>
                <h3 className="text-lg font-semibold mb-2">Iframe Embed</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Embed the widget directly into a page. Best for dedicated quote pages.
                </p>
                <div className="relative">
                  <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                    {iframeCode}
                  </pre>
                  <button
                    onClick={() => handleCopy(iframeCode)}
                    className="absolute top-2 right-2 p-2 bg-gray-800 hover:bg-gray-700 rounded transition-colors"
                  >
                    {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4 text-gray-300" />}
                  </button>
                </div>
              </div>

              {/* Direct Link */}
              <div>
                <h3 className="text-lg font-semibold mb-2">Direct Link</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Share this link directly with customers or use it in email campaigns.
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={directLink}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                  />
                  <button
                    onClick={() => handleCopy(directLink)}
                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                  <a
                    href={directLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              </div>

              {/* Integration Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">Integration Instructions</h4>
                <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
                  <li>Choose your preferred embed method above</li>
                  <li>Copy the code using the copy button</li>
                  <li>Paste it into your website's HTML</li>
                  <li>The widget will automatically load and be ready for customers</li>
                  <li>Customize appearance and behavior in the Settings tab</li>
                </ol>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-6">
              {/* Appearance Settings */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Appearance</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <Palette className="inline h-4 w-4 mr-1" />
                      Primary Color
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        className="h-10 w-20"
                        value={widgetSettings.primaryColor}
                        onChange={(e) => setWidgetSettings({...widgetSettings, primaryColor: e.target.value})}
                      />
                      <input
                        type="text"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                        value={widgetSettings.primaryColor}
                        onChange={(e) => setWidgetSettings({...widgetSettings, primaryColor: e.target.value})}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <Type className="inline h-4 w-4 mr-1" />
                      Font Family
                    </label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      value={widgetSettings.fontFamily}
                      onChange={(e) => setWidgetSettings({...widgetSettings, fontFamily: e.target.value})}
                    >
                      <option value="Inter, sans-serif">Inter</option>
                      <option value="Roboto, sans-serif">Roboto</option>
                      <option value="Open Sans, sans-serif">Open Sans</option>
                      <option value="Lato, sans-serif">Lato</option>
                      <option value="inherit">Inherit from website</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <Layout className="inline h-4 w-4 mr-1" />
                      Border Radius
                    </label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      value={widgetSettings.borderRadius}
                      onChange={(e) => setWidgetSettings({...widgetSettings, borderRadius: e.target.value})}
                    >
                      <option value="0px">Square</option>
                      <option value="4px">Slightly Rounded</option>
                      <option value="8px">Rounded</option>
                      <option value="16px">Very Rounded</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Widget Position
                    </label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      value={widgetSettings.position}
                      onChange={(e) => setWidgetSettings({...widgetSettings, position: e.target.value as 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'})}
                    >
                      <option value="bottom-right">Bottom Right</option>
                      <option value="bottom-left">Bottom Left</option>
                      <option value="top-right">Top Right</option>
                      <option value="top-left">Top Left</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Display Settings */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Display Options</h3>
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      className="mr-3"
                      checked={widgetSettings.showCompanyName}
                      onChange={(e) => setWidgetSettings({...widgetSettings, showCompanyName: e.target.checked})}
                    />
                    <span>Show company name</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      className="mr-3"
                      checked={widgetSettings.showDescription}
                      onChange={(e) => setWidgetSettings({...widgetSettings, showDescription: e.target.checked})}
                    />
                    <span>Show description text</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      className="mr-3"
                      checked={widgetSettings.collectPhone}
                      onChange={(e) => setWidgetSettings({...widgetSettings, collectPhone: e.target.checked})}
                    />
                    <span>Collect phone number</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      className="mr-3"
                      checked={widgetSettings.collectAddress}
                      onChange={(e) => setWidgetSettings({...widgetSettings, collectAddress: e.target.checked})}
                    />
                    <span>Collect service address</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      className="mr-3"
                      checked={widgetSettings.autoGenerateQuote}
                      onChange={(e) => setWidgetSettings({...widgetSettings, autoGenerateQuote: e.target.checked})}
                    />
                    <span>Automatically generate quote after measurement</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      className="mr-3"
                      checked={widgetSettings.sendQuoteEmail}
                      onChange={(e) => setWidgetSettings({...widgetSettings, sendQuoteEmail: e.target.checked})}
                    />
                    <span>Send quote via email automatically</span>
                  </label>
                </div>
              </div>

              {/* Text Customization */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Text Customization</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description Text
                    </label>
                    <textarea
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      value={widgetSettings.description}
                      onChange={(e) => setWidgetSettings({...widgetSettings, description: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Button Text
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      value={widgetSettings.buttonText}
                      onChange={(e) => setWidgetSettings({...widgetSettings, buttonText: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              {/* Behavior Settings */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Behavior</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      className="mr-3"
                      checked={widgetSettings.autoOpen}
                      onChange={(e) => setWidgetSettings({...widgetSettings, autoOpen: e.target.checked})}
                    />
                    <span>Auto-open widget on page load</span>
                  </label>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Delay before auto-open (seconds)
                    </label>
                    <input
                      type="number"
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      value={widgetSettings.delay}
                      onChange={(e) => setWidgetSettings({...widgetSettings, delay: parseInt(e.target.value) || 0})}
                      disabled={!widgetSettings.autoOpen}
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={handleSaveSettings}
                className="btn-primary"
              >
                Save Settings
              </button>
            </div>
          )}

          {activeTab === 'preview' && (
            <div>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold">Widget Preview</h3>
                <a
                  href={directLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary flex items-center"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open in New Tab
                </a>
              </div>
              <div className="border-2 border-gray-200 rounded-lg overflow-hidden">
                <iframe
                  src={directLink}
                  className="w-full h-[700px]"
                  style={{ border: 'none' }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}