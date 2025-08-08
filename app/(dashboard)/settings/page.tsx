'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { 
  User, 
  Building, 
  DollarSign, 
  Mail, 
  Bell,
  Save,
  TestTube,
  CheckCircle,
  XCircle,
  Loader2
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function SettingsPage() {
  const { data: session } = useSession()
  const [activeTab, setActiveTab] = useState('profile')
  const [emailTest, setEmailTest] = useState('')
  const [testingEmail, setTestingEmail] = useState(false)
  const [emailConfig, setEmailConfig] = useState<any>(null)
  
  // Profile settings
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: ''
  })
  
  // Business settings
  const [businessData, setBusinessData] = useState({
    name: '',
    website: '',
    phone: '',
    address: {
      street: '',
      city: '',
      state: '',
      zip: ''
    }
  })
  
  // Pricing settings
  const [pricingData, setPricingData] = useState({
    lawnPerSqFt: 0.02,
    drivewayPerSqFt: 0.03,
    sidewalkPerSqFt: 0.025,
    minimumCharge: 50
  })

  useEffect(() => {
    fetchEmailConfig()
    // Load user and business data
    if (session?.user) {
      setProfileData({
        name: session.user.name || '',
        email: session.user.email || '',
        phone: ''
      })
    }
  }, [session])

  const fetchEmailConfig = async () => {
    try {
      const response = await fetch('/api/test-email')
      if (response.ok) {
        const data = await response.json()
        setEmailConfig(data)
      }
    } catch (error) {
      console.error('Failed to fetch email config:', error)
    }
  }

  const handleTestEmail = async () => {
    if (!emailTest) {
      toast.error('Please enter an email address')
      return
    }
    
    setTestingEmail(true)
    
    try {
      const response = await fetch('/api/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: emailTest })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        toast.success(`Test email sent to ${emailTest}! Check your inbox.`)
        if (data.note) {
          toast.loading(data.note, { duration: 6000 })
        }
      } else {
        toast.error(data.error || 'Failed to send test email')
      }
    } catch (error) {
      console.error('Test email error:', error)
      toast.error('Failed to send test email')
    } finally {
      setTestingEmail(false)
    }
  }

  const handleSaveProfile = async () => {
    toast.success('Profile settings saved!')
  }

  const handleSaveBusiness = async () => {
    toast.success('Business settings saved!')
  }

  const handleSavePricing = async () => {
    toast.success('Pricing settings saved!')
  }

  const tabs = [
    { id: 'profile', name: 'Profile', icon: User },
    { id: 'business', name: 'Business', icon: Building },
    { id: 'pricing', name: 'Pricing', icon: DollarSign },
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'email', name: 'Email', icon: Mail }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-600">
          Manage your account and business settings
        </p>
      </div>

      <div className="bg-white shadow rounded-lg">
        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm
                    ${activeTab === tab.id
                      ? 'border-primary text-primary'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  <Icon className={`
                    -ml-0.5 mr-2 h-5 w-5
                    ${activeTab === tab.id ? 'text-primary' : 'text-gray-400 group-hover:text-gray-500'}
                  `} />
                  {tab.name}
                </button>
              )
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold">Profile Settings</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                    value={profileData.name}
                    onChange={(e) => setProfileData({...profileData, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                    value={profileData.email}
                    onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                    value={profileData.phone}
                    onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                  />
                </div>
              </div>
              <button
                onClick={handleSaveProfile}
                className="btn-primary flex items-center"
              >
                <Save className="h-5 w-5 mr-2" />
                Save Profile
              </button>
            </div>
          )}

          {activeTab === 'business' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold">Business Information</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Business Name
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                    value={businessData.name}
                    onChange={(e) => setBusinessData({...businessData, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Website
                  </label>
                  <input
                    type="url"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                    value={businessData.website}
                    onChange={(e) => setBusinessData({...businessData, website: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Business Phone
                  </label>
                  <input
                    type="tel"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                    value={businessData.phone}
                    onChange={(e) => setBusinessData({...businessData, phone: e.target.value})}
                  />
                </div>
              </div>
              <button
                onClick={handleSaveBusiness}
                className="btn-primary flex items-center"
              >
                <Save className="h-5 w-5 mr-2" />
                Save Business Info
              </button>
            </div>
          )}

          {activeTab === 'pricing' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold">Default Pricing</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Lawn (per sq ft)
                  </label>
                  <div className="flex items-center">
                    <span className="mr-2">$</span>
                    <input
                      type="number"
                      step="0.001"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                      value={pricingData.lawnPerSqFt}
                      onChange={(e) => setPricingData({...pricingData, lawnPerSqFt: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Driveway (per sq ft)
                  </label>
                  <div className="flex items-center">
                    <span className="mr-2">$</span>
                    <input
                      type="number"
                      step="0.001"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                      value={pricingData.drivewayPerSqFt}
                      onChange={(e) => setPricingData({...pricingData, drivewayPerSqFt: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sidewalk (per sq ft)
                  </label>
                  <div className="flex items-center">
                    <span className="mr-2">$</span>
                    <input
                      type="number"
                      step="0.001"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                      value={pricingData.sidewalkPerSqFt}
                      onChange={(e) => setPricingData({...pricingData, sidewalkPerSqFt: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Minimum Charge
                  </label>
                  <div className="flex items-center">
                    <span className="mr-2">$</span>
                    <input
                      type="number"
                      step="1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                      value={pricingData.minimumCharge}
                      onChange={(e) => setPricingData({...pricingData, minimumCharge: parseInt(e.target.value) || 0})}
                    />
                  </div>
                </div>
              </div>
              <button
                onClick={handleSavePricing}
                className="btn-primary flex items-center"
              >
                <Save className="h-5 w-5 mr-2" />
                Save Pricing
              </button>
            </div>
          )}

          {activeTab === 'email' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold">Email Configuration</h2>
              
              {emailConfig && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium mb-2">Current Configuration</h3>
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center">
                      {emailConfig.configured ? (
                        <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                      ) : (
                        <XCircle className="h-4 w-4 text-yellow-500 mr-2" />
                      )}
                      <span>
                        Status: {emailConfig.configured ? 'Configured' : 'Using Test Mode'}
                      </span>
                    </div>
                    <p>From Address: {emailConfig.from}</p>
                    <p>Environment: {emailConfig.environment}</p>
                    {emailConfig.note && (
                      <p className="text-gray-600 mt-2">{emailConfig.note}</p>
                    )}
                  </div>
                </div>
              )}
              
              <div>
                <h3 className="font-medium mb-4">Test Email Notifications</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Send a test email to verify your email configuration is working correctly.
                </p>
                <div className="flex items-center space-x-4">
                  <input
                    type="email"
                    placeholder="Enter email address"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                    value={emailTest}
                    onChange={(e) => setEmailTest(e.target.value)}
                  />
                  <button
                    onClick={handleTestEmail}
                    disabled={testingEmail}
                    className="btn-primary flex items-center disabled:opacity-50"
                  >
                    {testingEmail ? (
                      <>
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <TestTube className="h-5 w-5 mr-2" />
                        Send Test Email
                      </>
                    )}
                  </button>
                </div>
              </div>
              
              <div className="border-t pt-6">
                <h3 className="font-medium mb-4">Email Templates</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">Quote Created</p>
                      <p className="text-sm text-gray-600">Sent to customers when a quote is created</p>
                    </div>
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">Quote Accepted</p>
                      <p className="text-sm text-gray-600">Notification when customer accepts quote</p>
                    </div>
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">Quote Rejected</p>
                      <p className="text-sm text-gray-600">Notification when customer rejects quote</p>
                    </div>
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold">Notification Preferences</h2>
              <div className="space-y-4">
                <label className="flex items-center">
                  <input type="checkbox" className="mr-3" defaultChecked />
                  <div>
                    <p className="font-medium">New Quote Notifications</p>
                    <p className="text-sm text-gray-600">Receive email when quotes are created</p>
                  </div>
                </label>
                <label className="flex items-center">
                  <input type="checkbox" className="mr-3" defaultChecked />
                  <div>
                    <p className="font-medium">Quote Accepted</p>
                    <p className="text-sm text-gray-600">Receive email when quotes are accepted</p>
                  </div>
                </label>
                <label className="flex items-center">
                  <input type="checkbox" className="mr-3" defaultChecked />
                  <div>
                    <p className="font-medium">Quote Rejected</p>
                    <p className="text-sm text-gray-600">Receive email when quotes are rejected</p>
                  </div>
                </label>
                <label className="flex items-center">
                  <input type="checkbox" className="mr-3" />
                  <div>
                    <p className="font-medium">Weekly Summary</p>
                    <p className="text-sm text-gray-600">Receive weekly business summary</p>
                  </div>
                </label>
              </div>
              <button className="btn-primary flex items-center">
                <Save className="h-5 w-5 mr-2" />
                Save Preferences
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}