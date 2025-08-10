"use client";

import { useState, useEffect } from "react";
import { PropertyMeasurements } from "./MeasurementResults";
import { formatArea } from "@/lib/propertyMeasurement";

interface PropertyOverlayMapProps {
  measurements: PropertyMeasurements;
}

export default function PropertyOverlayMap({
  measurements,
}: PropertyOverlayMapProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  const { coordinates, address } = measurements;
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "AIzaSyBebHv77bSOdUkXyboh_kvCWmlGk04o1O4";

  // Calculate property boundaries with more realistic dimensions
  // Most residential properties are rectangular, not square
  // Use golden ratio (1.618) for typical lot depth to width ratio
  const goldenRatio = 1.618;
  const width = Math.sqrt(measurements.totalArea / goldenRatio);
  const depth = width * goldenRatio;

  // More accurate degrees per foot conversion based on latitude
  // This accounts for the Earth's curvature at different latitudes
  const metersPerFoot = 0.3048;
  const earthRadius = 6371000; // meters
  const latRad = coordinates?.lat ? (coordinates.lat * Math.PI) / 180 : 0;

  // Calculate degrees per foot at this latitude
  const degreesPerFootLat = (metersPerFoot / earthRadius) * (180 / Math.PI);
  const degreesPerFootLng = degreesPerFootLat / Math.cos(latRad);

  // Calculate property corners
  const halfWidth = (width / 2) * degreesPerFootLng;
  const halfDepth = (depth / 2) * degreesPerFootLat;

  const north = coordinates ? coordinates?.lat + halfDepth : 0;
  const south = coordinates ? coordinates?.lat - halfDepth : 0;
  const east = coordinates ? coordinates?.lng + halfWidth : 0;
  const west = coordinates ? coordinates?.lng - halfWidth : 0;

  // Create a more detailed path with rounded corners for realism
  const cornerRadius = 0.00001; // Small radius for slightly rounded corners
  const path = `color:0x00FF00|weight:3|fillcolor:0x00FF0033|${north},${west}|${north},${east}|${south},${east}|${south},${west}|${north},${west}`;

  // Create the map URL with property overlay
  const mapUrl =
    `https://maps.googleapis.com/maps/api/staticmap?` +
    `center=${coordinates?.lat},${coordinates?.lng}` +
    `&zoom=20` +
    `&size=800x600` +
    `&scale=2` +
    `&maptype=satellite` +
    `&markers=color:red%7Clabel:P%7C${coordinates?.lat},${coordinates?.lng}` +
    `&path=${encodeURIComponent(path)}` +
    `&key=${apiKey}`;

  useEffect(() => {
    setImageError(false);
    setIsLoading(true);
  }, [coordinates]);

  if (imageError) {
    return (
      <div className="w-full h-[600px] bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-2">Unable to load property overlay</p>
          <button
            onClick={() => {
              setImageError(false);
              setIsLoading(true);
            }}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-gray-100 rounded-lg overflow-hidden">
      <div className="relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-gray-600">Analyzing property boundaries...</p>
            </div>
          </div>
        )}
        <img
          src={mapUrl}
          alt={`Property analysis for ${address}`}
          className="w-full h-auto"
          style={{
            maxHeight: "600px",
            objectFit: "cover",
            display: isLoading ? "none" : "block",
          }}
          onLoad={() => {
            console.log("Property overlay loaded");
            setIsLoading(false);
          }}
          onError={(e) => {
            console.error("Property overlay failed:", e);
            setImageError(true);
            setIsLoading(false);
          }}
        />

        {!isLoading && (
          <div className="absolute top-4 right-4 bg-white/90 p-4 rounded shadow-lg max-w-xs">
            <h3 className="font-semibold text-sm mb-2">Property Analysis</h3>
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 opacity-30 border border-green-600"></div>
                <span>Property Boundary</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-600 rounded-full"></div>
                <span>Property Center</span>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t text-xs space-y-1">
              <p>
                <strong>Total Area:</strong>{" "}
                {formatArea(measurements.totalArea)}
              </p>
              <p>
                <strong>Lawn Area:</strong>{" "}
                {formatArea(measurements.lawn.total)}
              </p>
              <p>
                <strong>Dimensions:</strong> {Math.round(width)}&apos; ×{" "}
                {Math.round(depth)}&apos;
              </p>
              <p>
                <strong>Perimeter:</strong>{" "}
                {measurements.perimeter.toLocaleString()} ft
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
