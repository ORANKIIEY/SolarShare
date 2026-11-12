"use client";

import { useState, useEffect } from "react";
import { X, Cookie, Shield, BarChart, Megaphone } from "lucide-react";
import { apiGetCookieConsent, apiSetCookieConsent } from "@/lib/api";

interface ConsentStatus {
  hasConsent: boolean;
  essential: boolean;
  analytics: boolean;
  marketing: boolean;
  consentDate?: string;
}

export default function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [consent, setConsent] = useState<ConsentStatus>({
    hasConsent: false,
    essential: true,
    analytics: false,
    marketing: false,
  });

  useEffect(() => {
    // Check if user has already given consent
    checkConsent();
  }, []);

  const checkConsent = async () => {
    try {
      const status = await apiGetCookieConsent();
      if (!status.hasConsent) {
        setIsVisible(true);
      }
      setConsent(status);
    } catch {
      // If API fails, show the banner anyway
      setIsVisible(true);
    }
  };

  const handleAcceptAll = async () => {
    const newConsent = {
      essential: true,
      analytics: true,
      marketing: true,
    };
    
    try {
      await apiSetCookieConsent(newConsent);
      setConsent({ ...newConsent, hasConsent: true });
      setIsVisible(false);
    } catch (error) {
      console.error("Failed to save consent:", error);
    }
  };

  const handleAcceptEssential = async () => {
    const newConsent = {
      essential: true,
      analytics: false,
      marketing: false,
    };
    
    try {
      await apiSetCookieConsent(newConsent);
      setConsent({ ...newConsent, hasConsent: true });
      setIsVisible(false);
    } catch (error) {
      console.error("Failed to save consent:", error);
    }
  };

  const handleSavePreferences = async () => {
    try {
      await apiSetCookieConsent({
        essential: true, // Always required
        analytics: consent.analytics,
        marketing: consent.marketing,
      });
      setConsent({ ...consent, hasConsent: true });
      setIsVisible(false);
    } catch (error) {
      console.error("Failed to save consent:", error);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-[480px] z-50">
      <div className="bg-white border border-gray-200 rounded-xl shadow-2xl p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Cookie className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Cookie Preferences</h3>
              <p className="text-sm text-gray-500">We value your privacy</p>
            </div>
          </div>
          <button
            onClick={() => setIsVisible(false)}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Main Text */}
        <p className="text-sm text-gray-700 mb-4 leading-relaxed">
          We use cookies to enhance your experience, analyze site traffic, and personalize content. 
          Essential cookies are required for the site to function properly.
        </p>

        {/* Cookie Types */}
        {showDetails && (
          <div className="space-y-3 mb-4 border-t border-gray-100 pt-4">
            {/* Essential - Always enabled */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Shield className="w-4 h-4 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Essential</p>
                  <p className="text-xs text-gray-500">Required for the site to function</p>
                </div>
              </div>
              <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded">
                Required
              </span>
            </div>

            {/* Analytics */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <BarChart className="w-4 h-4 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Analytics</p>
                  <p className="text-xs text-gray-500">Help us improve our website</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={consent.analytics}
                  onChange={(e) => setConsent({ ...consent, analytics: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* Marketing */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Megaphone className="w-4 h-4 text-purple-600" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Marketing</p>
                  <p className="text-xs text-gray-500">Personalized advertisements</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={consent.marketing}
                  onChange={(e) => setConsent({ ...consent, marketing: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-2">
          {!showDetails ? (
            <>
              <div className="flex gap-2">
                <button
                  onClick={handleAcceptAll}
                  className="flex-1 bg-gray-900 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
                >
                  Accept All
                </button>
                <button
                  onClick={handleAcceptEssential}
                  className="flex-1 bg-white text-gray-900 border border-gray-200 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Essential Only
                </button>
              </div>
              <button
                onClick={() => setShowDetails(true)}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Manage Preferences →
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleSavePreferences}
                className="w-full bg-gray-900 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
              >
                Save Preferences
              </button>
              <button
                onClick={() => setShowDetails(false)}
                className="text-sm text-gray-500 hover:text-gray-700 font-medium"
              >
                ← Back
              </button>
            </>
          )}
        </div>

        {/* Footer Link */}
        <p className="text-xs text-gray-400 mt-4 text-center">
          Read our{" "}
          <a href="/privacy" className="underline hover:text-gray-600">
            Privacy Policy
          </a>{" "}
          and{" "}
          <a href="/cookies" className="underline hover:text-gray-600">
            Cookie Policy
          </a>
        </p>
      </div>
    </div>
  );
}
