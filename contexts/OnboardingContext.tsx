import React, { createContext, useContext, useState, useCallback } from 'react';

export interface OnboardingData {
  // User profile
  name: string;
  goal: string;
  problem: string;
  country: string;

  // Rider context
  ridingStyle: string;
  ridingFrequency: string;
  annualMileage: number;
  climate: string;
  storageType: string;
  experienceLevel: string;
  maintenanceComfort: string;

  // Bike details
  make: string;
  model: string;
  year: number;
  mileage: number; // always stored in km
  units: 'km' | 'miles';

  // Service history
  hasServiceHistory: 'yes' | 'no' | 'new';
  lastServiceDate?: string;
  lastServiceMileage?: number;

  // Photo
  photoStorageId?: string;
  photoUrl?: string;

  // Computed
  healthScore?: number;
  healthBreakdown?: {
    maintenanceTracking: number;
    serviceAwareness: number;
    breakdownRisk: 'low' | 'medium' | 'high';
  };
  aiImageUrl?: string;
  bikeId?: string;
}

const DEFAULT_DATA: OnboardingData = {
  name: '',
  goal: '',
  problem: '',
  country: '',
  ridingStyle: '',
  ridingFrequency: '',
  annualMileage: 5000,
  climate: '',
  storageType: '',
  experienceLevel: '',
  maintenanceComfort: '',
  make: '',
  model: '',
  year: 2024,
  mileage: 0,
  units: 'km',
  hasServiceHistory: 'no',
};

interface OnboardingContextType {
  data: OnboardingData;
  setField: <K extends keyof OnboardingData>(key: K, value: OnboardingData[K]) => void;
  setFields: (fields: Partial<OnboardingData>) => void;
}

const OnboardingContext = createContext<OnboardingContextType | null>(null);

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<OnboardingData>(DEFAULT_DATA);

  const setField = useCallback(<K extends keyof OnboardingData>(key: K, value: OnboardingData[K]) => {
    setData((prev) => ({ ...prev, [key]: value }));
  }, []);

  const setFields = useCallback((fields: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...fields }));
  }, []);

  return (
    <OnboardingContext.Provider value={{ data, setField, setFields }}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error('useOnboarding must be used within OnboardingProvider');
  return ctx;
}
