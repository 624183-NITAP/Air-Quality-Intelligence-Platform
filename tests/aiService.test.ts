import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { askAeroAI } from '../src/services/aiService';
import type { FamilyProfile, LocationData } from '../src/types';

describe('AeroPulse GenAI Service (aiService.ts)', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  const mockProfile: FamilyProfile = {
    name: 'The Verma Family',
    locationId: 'delhi-ncr',
    preferredAQIScale: 'IN_NAQI',
    preferredLanguage: 'en',
    budgetTier: 'moderate',
    members: [
      { id: 'm1', label: 'Rohan (Child)', type: 'asthma_copd', age: 8, specialNotes: 'Severe nocturnal asthma wheezing.' },
      { id: 'm2', label: 'Sunita (Grandmother)', type: 'cardiac', age: 70, specialNotes: 'Cardiovascular sensitivity.' },
      { id: 'm3', label: 'Amit & Neha', type: 'healthy_adult', age: 38, specialNotes: 'Office commuters.' }
    ],
    housing: {
      type: 'mid_rise_apt',
      floorLevel: 3,
      windowDraftiness: 'moderate_drafts',
      roomLengthM: 5,
      roomWidthM: 4,
      roomHeightM: 3,
      roomVolumeM3: 60,
      heatingSystem: 'electric_radiator',
      kitchenVentilation: 'ducted_range_hood',
      cookingFuel: 'piped_natural_gas',
    },
    commute: {
      primaryMode: 'private_car',
      commuteDistanceKm: 12,
      morningDepartureTime: '08:00',
      eveningReturnTime: '17:30',
      flexibleWorkHours: true,
    },
    airPurifierCADR: 350,
  };

  const mockLocation: LocationData = {
    id: 'delhi-ncr',
    city: 'Delhi NCR',
    region: 'NCR',
    country: 'India',
    latitude: 28.61,
    longitude: 77.23,
    sourceType: 'live_api',
    dataSourceName: 'Open-Meteo Atmospheric Feed',
    dataTimestamp: '2026-11-24T10:00:00Z',
    pollutants: {
      pm25: 195,
      pm10: 310,
      no2: 52,
      so2: 18,
      co: 2.1,
      ozone: 24,
    },
    weather: {
      temperatureC: 16.5,
      humidityPct: 82,
      windSpeedKmh: 4.8,
      windDirectionDeg: 310,
      windDirectionCompass: 'NW',
      surfacePressureHpa: 1018,
      boundaryLayerHeightMeters: 195,
      visibilityKm: 0.9,
      inversionCondition: 'Severe Boundary Layer Trap',
      dispersionFactor: 'Stagnant (Trapped Smog)',
      dataSource: 'Open-Meteo High-Resolution Forecast',
      isRealtime: true,
      observationTimeISO: '2026-11-24T10:00:00Z',
    },
    calculatedAQI: {
      indianNAQI: { value: 355, category: 'Severe', scale: 'IN_NAQI', dominantPollutant: 'PM2.5', colorClass: 'bg-rose-500' },
      usEPAAQI: { value: 245, category: 'Very Unhealthy', scale: 'US_EPA', dominantPollutant: 'PM2.5', colorClass: 'bg-purple-500' },
    },
    primarySources: ['Vehicular exhaust', 'Biomass burning'],
  };

  // ==========================================================================
  // 1. DETERMINISTIC LOCAL ENGINE (OFFLINE / NO KEY)
  // ==========================================================================
  describe('Deterministic Scientific Fallback Engine', () => {
    it('returns structured aerosol guidance when no API key is provided without making network calls', async () => {
      const fetchSpy = vi.fn();
      global.fetch = fetchSpy;

      const res = await askAeroAI({
        userPrompt: 'What CADR air purifier should I buy for my living room?',
        conversationHistory: [],
        profile: mockProfile,
        currentLocation: mockLocation,
        apiKey: '', // No key provided
      });

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(res.sender).toBe('assistant');
      expect(res.text).toContain('CADR');
      expect(res.text).toContain('60 m³'); // Matches room volume
      expect(res.structuredBreakdown).toBeDefined();
      expect(res.structuredBreakdown?.recommendedAction).toBeDefined();
      expect(res.structuredBreakdown?.assumptions).toBeDefined();
    });

    it('tailors advice for morning exercise and thermal inversion trapping', async () => {
      const res = await askAeroAI({
        userPrompt: 'Should I go for a morning run or walk tomorrow at 6:30 AM?',
        conversationHistory: [],
        profile: mockProfile,
        currentLocation: mockLocation,
        apiKey: '',
      });

      expect(res.text.toLowerCase()).toContain('inversion');
      expect(res.text.toLowerCase()).toContain('09:00 am');
      expect(res.structuredBreakdown?.assumptions).toContain('breathing rate');
    });

    it('provides clean heating and cooking combustion guidance', async () => {
      const res = await askAeroAI({
        userPrompt: 'Is it safe to use a gas heater or stove indoors during smog season?',
        conversationHistory: [],
        profile: mockProfile,
        currentLocation: mockLocation,
        apiKey: '',
      });

      expect(res.text).toContain('burners');
      expect(res.text).toContain('Kitchen');
    });

    it('provides respirator and mask fit-factor analysis', async () => {
      const res = await askAeroAI({
        userPrompt: 'Can I wear a cloth mask or surgical mask instead of an N95?',
        conversationHistory: [],
        profile: mockProfile,
        currentLocation: mockLocation,
        apiKey: '',
      });

      expect(res.text).toContain('N95');
      expect(res.structuredBreakdown?.recommendedAction).toContain('N95');
    });

    it('handles empty or whitespace prompts gracefully', async () => {
      const res = await askAeroAI({
        userPrompt: '   ',
        conversationHistory: [],
        profile: mockProfile,
        currentLocation: mockLocation,
      });

      expect(res.text.length).toBeGreaterThan(50);
      expect(res.structuredBreakdown).toBeDefined();
    });
  });

  // ==========================================================================
  // 2. REMOTE GEMINI API CALL WITH HEADER SECURITY
  // ==========================================================================
  describe('Remote Gemini API Integration', () => {
    it('transmits API key via x-goog-api-key header and NOT in URL query params', async () => {
      const mockGeminiResponseText = `
PART 1: CURRENT SITUATION
Outdoor PM2.5 is 195 µg/m³ with active thermal inversion trap.

PART 2: SCIENTIFIC EXPLANATION
Nocturnal surface cooling traps emissions below 195m boundary layer.

PART 3: RECOMMENDED ACTION
Run mechanical HEPA filtration continuously at 350 m³/h.

PART 4: WHY THE ACTION HELPS
A CADR of 350 m³/h in a 60 m³ room yields ~5.8 air changes per hour.

PART 5: EXPECTED IMPACT
Reduces indoor steady-state PM2.5 from 135 µg/m³ to below 18 µg/m³.

PART 6: ASSUMPTIONS
Assumes room volume 60 m³, natural air exchange rate λ = 0.5 ACH, particle penetration P = 0.7.

PART 7: CONFIDENCE LEVEL
High (Based on empirical mass-balance physics).

PART 8: IMPORTANT LIMITATIONS
Non-medical advice. Sensor inaccuracy ±15%.
`;

      let capturedUrl = '';
      let capturedHeaders: Record<string, string> = {};

      global.fetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
        capturedUrl = url;
        capturedHeaders = (init?.headers as Record<string, string>) || {};
        return Promise.resolve({
          ok: true,
          json: async () => ({
            candidates: [
              {
                content: {
                  parts: [{ text: mockGeminiResponseText }]
                }
              }
            ]
          })
        });
      });

      const validKey = 'AIzaSyA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q';
      const res = await askAeroAI({
        userPrompt: 'How can I optimize our indoor air quality today?',
        conversationHistory: [],
        profile: mockProfile,
        currentLocation: mockLocation,
        apiKey: validKey,
      });

      // Crucial Security Verification: Key must be in header, NOT in URL
      expect(capturedUrl).not.toContain('?key=');
      expect(capturedUrl).not.toContain(validKey);
      expect(capturedHeaders['x-goog-api-key']).toBe(validKey);

      // Verify response parsing
      expect(res.sender).toBe('assistant');
      expect(res.text).toContain('Outdoor PM2.5 is 195');
      expect(res.structuredBreakdown?.recommendedAction).toContain('mechanical HEPA filtration');
      expect(res.structuredBreakdown?.assumptions).toContain('Assumes room volume 60 m³');
    });

    it('retries with exponential backoff on HTTP 429 and falls back safely to deterministic engine', async () => {
      let callCount = 0;
      global.fetch = vi.fn().mockImplementation(() => {
        callCount++;
        return Promise.resolve({
          ok: false,
          status: 429,
          statusText: 'Too Many Requests',
        });
      });

      const res = await askAeroAI({
        userPrompt: 'What should we do during this severe smog?',
        conversationHistory: [],
        profile: mockProfile,
        currentLocation: mockLocation,
        apiKey: 'AIzaSyA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q',
      });

      // Verifies retries occurred (attempt 0, 1, 2 = 3 calls)
      expect(callCount).toBe(3);
      // Seamlessly falls back to deterministic engine without crashing
      expect(res.sender).toBe('assistant');
      expect(res.text.length).toBeGreaterThan(100);
    });

    it('does not retry 400 Bad Request or 401 Unauthorized errors and falls back immediately', async () => {
      let callCount = 0;
      global.fetch = vi.fn().mockImplementation(() => {
        callCount++;
        return Promise.resolve({
          ok: false,
          status: 401,
          statusText: 'Unauthorized',
        });
      });

      const res = await askAeroAI({
        userPrompt: 'Is indoor air safe right now?',
        conversationHistory: [],
        profile: mockProfile,
        currentLocation: mockLocation,
        apiKey: 'AIzaSyInvalidKeyProvidedByUser1234567890',
      });

      // No retries for 401 (only 1 attempt)
      expect(callCount).toBe(1);
      expect(res.sender).toBe('assistant');
    });
  });
});
