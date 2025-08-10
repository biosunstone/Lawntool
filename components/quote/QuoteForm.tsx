/**
 * Quote Form Component with Address Autocomplete and Map Integration
 * Captures user info and property boundaries
 */

"use client";

import { useState, useEffect, useRef } from "react";
import { useLoadScript, Autocomplete } from "@react-google-maps/api";
import EnterprisePropertyMap from "@/components/maps/EnterprisePropertyMap";
import {
  PropertyBoundaryService,
  LatLng,
  MeasurementData,
} from "@/lib/maps/propertyBoundaryService";
import { ProfessionalMapGenerator } from "@/lib/maps/professionalMapGenerator";
import {
  MapPin,
  User,
  Mail,
  Phone,
  Home,
  CheckCircle,
  AlertCircle,
  Loader2,
  Send,
  Save,
  Calculator,
} from "lucide-react";
import toast from "react-hot-toast";

const libraries: any = ["places", "geometry", "drawing"];

interface QuoteFormData {
  name: string;
  email: string;
  phone: string;
  address: string;
  coordinates: LatLng | null;
  polygon: LatLng[];
  measurements: MeasurementData | null;
  notes?: string;
}

interface QuoteFormProps {
  businessId?: string;
  onSubmit?: (data: QuoteFormData) => void;
  showMap?: boolean;
  autoSave?: boolean;
}

export default function QuoteForm({
  businessId,
  onSubmit,
  showMap = true,
  autoSave = true,
}: QuoteFormProps) {
  const [formData, setFormData] = useState<QuoteFormData>({
    name: "",
    email: "",
    phone: "",
    address: "",
    coordinates: null,
    polygon: [],
    measurements: null,
    notes: "",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [addressSelected, setAddressSelected] = useState(false);
  const [formStartTime, setFormStartTime] = useState<Date | null>(null);
  const [abandonmentDetected, setAbandonmentDetected] = useState(false);
  const [lastActivityTime, setLastActivityTime] = useState<Date>(new Date());
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const abandonmentTimerRef = useRef<NodeJS.Timeout | null>(null);

  const { isLoaded } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
    libraries,
  });

  // Track form interaction
  useEffect(() => {
    if (
      !formStartTime &&
      (formData.name || formData.email || formData.phone || formData.address)
    ) {
      setFormStartTime(new Date());
    }
    // Update last activity time on any form change
    setLastActivityTime(new Date());
    // Clear any existing abandonment timer when user is active
    clearAbandonmentTimer();
  }, [formData, formStartTime]);

  // Abandonment detection - Fixed to prevent auto-triggering
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (formStartTime && formData.address && !abandonmentDetected) {
        // Only save form data to localStorage for recovery
        // Do NOT send emails on beforeunload as it's unreliable
        localStorage.setItem(
          "quote_form_draft",
          JSON.stringify({
            ...formData,
            timestamp: new Date().toISOString(),
            status: "draft",
          }),
        );
      }
    };

    const handleVisibilityChange = () => {
      if (
        document.hidden &&
        formStartTime &&
        formData.address &&
        formData.email &&
        !abandonmentDetected
      ) {
        // Only start timer if we have email to send to and not already detected
        startAbandonmentTimer();
      } else {
        clearAbandonmentTimer();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearAbandonmentTimer();
    };
  }, [formStartTime, abandonmentDetected]); // Keep minimal dependencies to prevent issues

  // Auto-save draft
  useEffect(() => {
    if (autoSave && formData.address) {
      const saveTimer = setTimeout(() => {
        saveDraft();
      }, 2000);

      return () => clearTimeout(saveTimer);
    }
  }, [formData, autoSave]);

  // Load draft on mount
  useEffect(() => {
    const draft = localStorage.getItem("quote_form_draft");
    if (draft) {
      try {
        const parsedDraft = JSON.parse(draft);
        if (parsedDraft.timestamp) {
          const draftAge =
            Date.now() - new Date(parsedDraft.timestamp).getTime();
          if (draftAge < 24 * 60 * 60 * 1000) {
            // Less than 24 hours old
            setFormData(parsedDraft);
            toast.success("We restored your previous quote request");
          }
        }
      } catch (error) {
        console.error("Error loading draft:", error);
      }
    }
  }, []);

  // Start abandonment timer
  const startAbandonmentTimer = () => {
    clearAbandonmentTimer();
    abandonmentTimerRef.current = setTimeout(
      () => {
        if (
          !abandonmentDetected &&
          formData.address &&
          formData.email &&
          formData.polygon.length > 0
        ) {
          setAbandonmentDetected(true);
          // Only track once and require email
          trackFormAbandonment();
        }
      },
      15 * 60 * 1000,
    ); // 15 minutes instead of 5
  };

  // Clear abandonment timer
  const clearAbandonmentTimer = () => {
    if (abandonmentTimerRef.current) {
      clearTimeout(abandonmentTimerRef.current);
      abandonmentTimerRef.current = null;
    }
  };

  // Save draft
  const saveDraft = async () => {
    if (!formData.address) return;

    try {
      await fetch("/api/quotes/save-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          businessId,
          timestamp: new Date().toISOString(),
          status: "draft",
        }),
      });
    } catch (error) {
      console.error("Error saving draft:", error);
    }
  };

  // Track form abandonment
  const trackFormAbandonment = async () => {
    // Prevent multiple calls and check if already detected
    if (!formData.email || !formData.address || abandonmentDetected) {
      console.log("Skipping abandonment tracking:", {
        hasEmail: !!formData.email,
        hasAddress: !!formData.address,
        alreadyDetected: abandonmentDetected,
      });
      return;
    }

    // Mark as detected immediately to prevent duplicates
    setAbandonmentDetected(true);
    console.log("Tracking form abandonment for:", formData.email);

    try {
      // Generate and save professional static map URL for abandonment email
      const mapUrl =
        formData.coordinates && formData.polygon.length > 0
          ? await ProfessionalMapGenerator.generateEmailMap(
              formData.coordinates,
              formData.polygon,
              formData.measurements || {},
              formData.address,
              "outdoor",
            )
          : null;

      await fetch("/api/quotes/track-abandonment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          businessId,
          mapUrl,
          timestamp: new Date().toISOString(),
          formDuration: formStartTime
            ? Date.now() - formStartTime.getTime()
            : 0,
          status: "abandoned",
        }),
      });
    } catch (error) {
      console.error("Error tracking abandonment:", error);
    }
  };

  // Handle place selection
  const handlePlaceSelect = () => {
    if (!autocompleteRef.current) return;

    const place = autocompleteRef.current.getPlace();

    if (!place.geometry || !place.geometry.location) {
      toast.error("Please select a valid address");
      return;
    }

    const coordinates: LatLng = {
      lat: place.geometry.location.lat(),
      lng: place.geometry.location.lng(),
    };

    setFormData((prev) => ({
      ...prev,
      address: place.formatted_address || "",
      coordinates,
    }));

    setAddressSelected(true);

    // Generate default boundary
    const defaultPolygon =
      PropertyBoundaryService.generateDefaultBoundary(coordinates);
    handleBoundaryChange({
      lot: {
        area: PropertyBoundaryService.calculateArea(defaultPolygon),
        polygon: defaultPolygon,
      },
    });
  };

  // Handle boundary change from map
  const handleBoundaryChange = (measurements: MeasurementData) => {
    setFormData((prev) => ({
      ...prev,
      measurements,
      polygon: measurements.lot?.polygon || [],
    }));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent double submission
    if (isLoading) return;

    if (!formData.email || !formData.address) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!formData.coordinates || formData.polygon.length === 0) {
      toast.error("Please select your property boundaries on the map");
      return;
    }

    setIsLoading(true);
    clearAbandonmentTimer();
    setAbandonmentDetected(true); // Prevent abandonment tracking after submission

    try {
      // Generate and save professional static map URL for email use
      const mapUrl = await ProfessionalMapGenerator.generateEmailMap(
        formData.coordinates,
        formData.polygon,
        formData.measurements || {},
        formData.address,
        "outdoor", // Default to outdoor service type
      );

      // Submit quote request
      const response = await fetch("/api/quotes/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          businessId,
          mapUrl,
          timestamp: new Date().toISOString(),
          formDuration: formStartTime
            ? Date.now() - formStartTime.getTime()
            : 0,
          status: "completed",
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Quote request submitted successfully!");

        // Clear draft
        localStorage.removeItem("quote_form_draft");

        // Call parent callback
        if (onSubmit) {
          onSubmit(formData);
        }

        // Reset form
        setFormData({
          name: "",
          email: "",
          phone: "",
          address: "",
          coordinates: null,
          polygon: [],
          measurements: null,
          notes: "",
        });
        setAddressSelected(false);
        setFormStartTime(null);
      } else {
        throw new Error(data.error || "Failed to submit quote");
      }
    } catch (error) {
      console.error("Error submitting quote:", error);
      toast.error("Failed to submit quote request");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-green-600" />
        <span className="ml-2">Loading...</span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Personal Information */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <User className="w-5 h-5 text-green-600" />
          Personal Information
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => {
                setFormData({ ...formData, name: e.target.value });
                setLastActivityTime(new Date());
                clearAbandonmentTimer();
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address *
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => {
                setFormData({ ...formData, email: e.target.value });
                setLastActivityTime(new Date());
                clearAbandonmentTimer();
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number *
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => {
                setFormData({ ...formData, phone: e.target.value });
                setLastActivityTime(new Date());
                clearAbandonmentTimer();
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              required
            />
          </div>
        </div>
      </div>

      {/* Property Address */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Home className="w-5 h-5 text-green-600" />
          Property Address
        </h3>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Enter your property address *
          </label>
          <Autocomplete
            onLoad={(autocomplete) => {
              autocompleteRef.current = autocomplete;
            }}
            onPlaceChanged={handlePlaceSelect}
            options={{
              types: ["address"],
              componentRestrictions: { country: "us" },
            }}
          >
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={formData.address}
                onChange={(e) => {
                  setFormData({ ...formData, address: e.target.value });
                  setLastActivityTime(new Date());
                  clearAbandonmentTimer();
                }}
                placeholder="Start typing your address..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              />
            </div>
          </Autocomplete>
        </div>

        {addressSelected && formData.coordinates && (
          <div className="mt-2 flex items-center gap-2 text-sm text-green-600">
            <CheckCircle className="w-4 h-4" />
            Address verified and located on map
          </div>
        )}
      </div>

      {/* Property Map */}
      {showMap && addressSelected && formData.coordinates && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-green-600" />
            Adjust Your Property Boundaries
          </h3>

          <div className="mb-3 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              Click "Edit" to adjust the green boundary lines around your
              property. You can also mark your house and driveway for more
              accurate measurements.
            </p>
          </div>

          <EnterprisePropertyMap
            address={formData.address}
            center={formData.coordinates}
            onBoundaryChange={handleBoundaryChange}
            onPolygonChange={(polygon) => setFormData({ ...formData, polygon })}
            onImageGenerated={(imageUrl) => {
              console.log("Map image generated:", imageUrl);
              // Save image URL for email use
              setFormData((prev) => ({ ...prev, mapImageUrl: imageUrl }));
            }}
            height="700px"
            showMeasurements={true}
            editMode={true}
            serviceType="outdoor"
          />

          {formData.measurements && (
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
              {formData.measurements.lot && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-500">Total Lot</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {PropertyBoundaryService.formatArea(
                      formData.measurements.lot.area,
                    )}
                  </div>
                </div>
              )}
              {formData.measurements.lawn && (
                <div className="bg-green-50 rounded-lg p-3">
                  <div className="text-xs text-gray-500">Lawn Area</div>
                  <div className="text-lg font-semibold text-green-700">
                    {PropertyBoundaryService.formatArea(
                      formData.measurements.lawn.area,
                    )}
                  </div>
                </div>
              )}
              {formData.measurements.house && (
                <div className="bg-amber-50 rounded-lg p-3">
                  <div className="text-xs text-gray-500">House</div>
                  <div className="text-lg font-semibold text-amber-700">
                    {PropertyBoundaryService.formatArea(
                      formData.measurements.house.area,
                    )}
                  </div>
                </div>
              )}
              {formData.measurements.driveway && (
                <div className="bg-gray-100 rounded-lg p-3">
                  <div className="text-xs text-gray-500">Driveway</div>
                  <div className="text-lg font-semibold text-gray-700">
                    {PropertyBoundaryService.formatArea(
                      formData.measurements.driveway.area,
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Additional Notes */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Additional Information (Optional)
        </h3>

        <textarea
          value={formData.notes}
          onChange={(e) => {
            setFormData({ ...formData, notes: e.target.value });
            setLastActivityTime(new Date());
            clearAbandonmentTimer();
          }}
          rows={4}
          placeholder="Any special requests or additional information..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
        />
      </div>

      {/* Submit Button */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={saveDraft}
          className="px-6 py-2 text-gray-600 hover:text-gray-800 flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          Save Draft
        </button>

        <button
          type="submit"
          disabled={isLoading || !addressSelected}
          className="px-8 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Send className="w-5 h-5" />
              Get Free Quote
            </>
          )}
        </button>
      </div>

      {/* Trust Badges */}
      <div className="text-center text-sm text-gray-500">
        <p>
          ✓ No credit card required ✓ Free instant quote ✓ Professional service
        </p>
      </div>
    </form>
  );
}
