"use client";

import { useState, useEffect } from 'react';

interface Location {
  latitude: number;
  longitude: number;
  city: string;
  province: string;
  accuracy: number;
}

interface AssignedArea {
  id: string;
  name: string;
  province: string;
  city: string;
  coordinates: {
    center: { lat: number; lng: number };
    bounds: {
      north: number;
      south: number;
      east: number;
      west: number;
    };
  };
}

const PROVINCE_AREAS: Record<string, AssignedArea[]> = {
  "Gauteng": [
    {
      id: "johannesburg",
      name: "Johannesburg",
      province: "Gauteng",
      city: "Johannesburg",
      coordinates: {
        center: { lat: -26.2041, lng: 28.0473 },
        bounds: { north: -26.0, south: -26.3, east: 28.2, west: 27.8 }
      }
    },
    {
      id: "pretoria",
      name: "Pretoria", 
      province: "Gauteng",
      city: "Pretoria",
      coordinates: {
        center: { lat: -25.7479, lng: 28.2293 },
        bounds: { north: -25.6, south: -25.9, east: 28.4, west: 28.0 }
      }
    }
  ],
  "KwaZulu-Natal": [
    {
      id: "durban",
      name: "Durban",
      province: "KwaZulu-Natal", 
      city: "Durban",
      coordinates: {
        center: { lat: -29.8587, lng: 31.0218 },
        bounds: { north: -29.7, south: -30.0, east: 31.2, west: 30.8 }
      }
    },
    {
      id: "pietermaritzburg",
      name: "Pietermaritzburg",
      province: "KwaZulu-Natal",
      city: "Pietermaritzburg", 
      coordinates: {
        center: { lat: -29.6099, lng: 30.3783 },
        bounds: { north: -29.5, south: -29.8, east: 30.5, west: 30.2 }
      }
    }
  ],
  "Western Cape": [
    {
      id: "capetown",
      name: "Cape Town",
      province: "Western Cape",
      city: "Cape Town",
      coordinates: {
        center: { lat: -33.9249, lng: 18.4241 },
        bounds: { north: -33.8, south: -34.1, east: 18.6, west: 18.2 }
      }
    }
  ]
};

export function useGeolocation() {
  const [location, setLocation] = useState<Location | null>(null);
  const [assignedArea, setAssignedArea] = useState<AssignedArea | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getCurrentLocation();
  }, []);

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        
        // Determine city and province from coordinates (simplified reverse geocoding)
        const detectedLocation = detectLocationFromCoords(latitude, longitude);
        
        setLocation({
          latitude,
          longitude,
          accuracy,
          ...detectedLocation
        });

        // Find assigned area based on detected location
        const area = findAssignedArea(latitude, longitude);
        setAssignedArea(area);
        
        setLoading(false);
      },
      (error) => {
        setError(`Geolocation error: ${error.message}`);
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      }
    );
  };

  const detectLocationFromCoords = (lat: number, lng: number) => {
    // Simplified location detection based on coordinate ranges
    // In production, you'd use a proper reverse geocoding service
    
    if (lat > -28 && lat < -25 && lng > 27 && lng < 29) {
      return { city: "Johannesburg", province: "Gauteng" };
    } else if (lat > -26 && lat < -25 && lng > 28 && lng < 29) {
      return { city: "Pretoria", province: "Gauteng" };
    } else if (lat > -30 && lat < -29 && lng > 30.5 && lng < 31.5) {
      return { city: "Durban", province: "KwaZulu-Natal" };
    } else if (lat > -34 && lat < -33 && lng > 18 && lng < 19) {
      return { city: "Cape Town", province: "Western Cape" };
    }
    
    // Default fallback
    return { city: "Unknown", province: "Unknown" };
  };

  const findAssignedArea = (lat: number, lng: number): AssignedArea | null => {
    for (const [province, areas] of Object.entries(PROVINCE_AREAS)) {
      for (const area of areas) {
        const { bounds } = area.coordinates;
        if (
          lat <= bounds.north &&
          lat >= bounds.south &&
          lng <= bounds.east &&
          lng >= bounds.west
        ) {
          return area;
        }
      }
    }
    return null;
  };

  const isWithinAssignedArea = (lat: number, lng: number): boolean => {
    if (!assignedArea) return false;
    
    const { bounds } = assignedArea.coordinates;
    return (
      lat <= bounds.north &&
      lat >= bounds.south &&
      lng <= bounds.east &&
      lng >= bounds.west
    );
  };

  const getAllAreasInProvince = (province: string): AssignedArea[] => {
    return PROVINCE_AREAS[province] || [];
  };

  return {
    location,
    assignedArea,
    loading,
    error,
    getCurrentLocation,
    isWithinAssignedArea,
    getAllAreasInProvince,
    PROVINCE_AREAS
  };
}
