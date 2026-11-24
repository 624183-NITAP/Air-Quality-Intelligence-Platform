import { describe, it, expect } from 'vitest';
import {
  sanitizeUserInput,
  anonymizeFamilyProfile,
  anonymizeLocationForAI,
  sanitizeLocationForPrivacy,
  scrubErrorDetails,
  resolveGeminiApiKey
} from '../src/utils/security';
import type { FamilyProfile } from '../src/types';

describe('Security and Privacy Hardening (security.ts)', () => {
  // ==========================================================================
  // 1. INPUT SANITIZATION
  // ==========================================================================
  describe('sanitizeUserInput', () => {
    it('strips dangerous HTML and script tags', () => {
      const malicious = '<script>alert("xss")</script>Hello <b>World</b><img src=x onerror=alert(1)>';
      const clean = sanitizeUserInput(malicious);
      expect(clean).toBe('alert("xss")Hello World');
      expect(clean).not.toContain('<script>');
      expect(clean).not.toContain('<b>');
      expect(clean).not.toContain('<img');
    });

    it('removes javascript: and data: pseudo-protocols', () => {
      const input = 'Click here: javascript:stealToken() or data:text/html,<script>evil</script>';
      const clean = sanitizeUserInput(input);
      expect(clean).not.toContain('javascript:');
      expect(clean).not.toContain('data:text/html');
    });

    it('removes ASCII control characters', () => {
      const input = 'Normal\u0000Text\u0008With\u001FControls';
      const clean = sanitizeUserInput(input);
      expect(clean).toBe('NormalTextWithControls');
    });

    it('collapses multiple whitespace characters and trims boundaries', () => {
      const input = '   Multiple    spaces   and \n\n newlines   ';
      const clean = sanitizeUserInput(input);
      expect(clean).toBe('Multiple spaces and newlines');
    });

    it('enforces maximum character cutoff boundary', () => {
      const longInput = 'A'.repeat(500);
      const clean = sanitizeUserInput(longInput, 100);
      expect(clean.length).toBe(100);
    });

    it('gracefully handles empty string and non-string inputs', () => {
      expect(sanitizeUserInput('')).toBe('');
      // @ts-expect-error Testing non-string input resilience
      expect(sanitizeUserInput(null)).toBe('');
      // @ts-expect-error Testing non-string input resilience
      expect(sanitizeUserInput(undefined)).toBe('');
    });
  });

  // ==========================================================================
  // 2. PII MASKING & PROFILE ANONYMIZATION
  // ==========================================================================
  describe('anonymizeFamilyProfile', () => {
    const testProfile: FamilyProfile = {
      name: 'The Verma Family',
      locationId: 'delhi-ncr',
      preferredAQIScale: 'IN_NAQI',
      preferredLanguage: 'en',
      budgetTier: 'moderate',
      members: [
        { id: 'm1', label: 'Little Rohan Verma', type: 'infant', age: 1, specialNotes: 'Suffers severe nocturnal wheezing, allergic to dust mites.' },
        { id: 'm2', label: 'Grandpa Ramesh Verma', type: 'cardiac', age: 72, specialNotes: 'Coronary artery disease, stent implanted in 2021.' },
        { id: 'm3', label: 'Aarti Verma', type: 'asthma_copd', age: 34, specialNotes: 'Daily inhaler user, acute bronchitis history.' },
        { id: 'm4', label: 'Pooja Verma', type: 'pregnant', age: 29, specialNotes: 'Second trimester, high BP.' },
        { id: 'm5', label: 'Sunil Verma', type: 'healthy_adult', age: 36, specialNotes: 'Marathon runner.' },
      ],
      housing: {
        type: 'mid_rise_apt',
        floorLevel: 4,
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
        primaryMode: 'metro_subway',
        commuteDistanceKm: 12,
        morningDepartureTime: '08:30',
        eveningReturnTime: '17:30',
        flexibleWorkHours: true,
      },
      airPurifierCADR: 420,
    };

    it('strips family surname, member names, and private medical notes', () => {
      const anonymized = anonymizeFamilyProfile(testProfile);

      expect(anonymized.householdSummary).not.toContain('Verma');
      expect(anonymized.householdSummary).not.toContain('Rohan');
      expect(anonymized.householdSummary).not.toContain('Ramesh');
      expect(anonymized.householdSummary).not.toContain('stent');
      expect(anonymized.householdSummary).not.toContain('nocturnal wheezing');
    });

    it('preserves physiological classifications and coarse age bands for aerosol simulation', () => {
      const anonymized = anonymizeFamilyProfile(testProfile);

      expect(anonymized.householdSummary).toContain('infant (0-2y)');
      expect(anonymized.householdSummary).toContain('senior (60+y)');
      expect(anonymized.householdSummary).toContain('cardiovascular sensitivity');
      expect(anonymized.householdSummary).toContain('respiratory sensitivity (asthma/COPD)');
      expect(anonymized.householdSummary).toContain('pregnant');
      expect(anonymized.householdSummary).toContain('standard baseline');

      expect(anonymized.roomVolumeM3).toBe(60);
      expect(anonymized.draftCategory).toBe('moderate_drafts');
      expect(anonymized.cookingFuel).toBe('piped_natural_gas');
      expect(anonymized.commuteMode).toBe('metro_subway');
      expect(anonymized.airPurifierCADR).toBe(420);
    });

    it('calculates room volume when volumeM3 is 0 but dimensions are provided', () => {
      const profileZeroVol = {
        ...testProfile,
        housing: {
          ...testProfile.housing,
          roomVolumeM3: 0,
          roomLengthM: 6,
          roomWidthM: 5,
          roomHeightM: 3,
        }
      };
      const res = anonymizeFamilyProfile(profileZeroVol);
      expect(res.roomVolumeM3).toBe(90); // 6 * 5 * 3
    });

    it('provides safe fallback volume when dimensions are missing', () => {
      const profileNoDim = {
        ...testProfile,
        housing: {
          ...testProfile.housing,
          roomVolumeM3: 0,
          roomLengthM: 0,
          roomWidthM: 0,
          roomHeightM: 0,
        }
      };
      const res = anonymizeFamilyProfile(profileNoDim);
      expect(res.roomVolumeM3).toBe(85); // Default fallback
    });
  });

  // ==========================================================================
  // 3. LOCATION PRIVACY IN AI AND CROWDSOURCING
  // ==========================================================================
  describe('Location Privacy (anonymizeLocationForAI & sanitizeLocationForPrivacy)', () => {
    it('truncates latitude and longitude to 1 decimal place (~11 km regional box) for AI queries', () => {
      const exactLoc = {
        city: 'South Extension Part 2, New Delhi',
        country: 'India',
        latitude: 28.5678912,
        longitude: 77.2189423,
      };
      const anon = anonymizeLocationForAI(exactLoc);
      expect(anon.approxLatitude).toBe(28.6);
      expect(anon.approxLongitude).toBe(77.2);
      expect(anon.city).toBe('South Extension Part 2, New Delhi');
      expect(anon.country).toBe('India');
    });

    it('strips apartment, flat, door, plot, and house numbers', () => {
      const raw1 = 'Flat 402, Tower B, Godrej Woods, Sector 43';
      expect(sanitizeLocationForPrivacy(raw1)).not.toContain('402');
      expect(sanitizeLocationForPrivacy(raw1)).toContain('Tower B');
      expect(sanitizeLocationForPrivacy(raw1)).toContain('Sector 43');

      const raw2 = 'House # 128/A, Pocket 4, Mayur Vihar Phase 1';
      expect(sanitizeLocationForPrivacy(raw2)).not.toContain('128');
      expect(sanitizeLocationForPrivacy(raw2)).toContain('Mayur Vihar');

      const raw3 = 'Plot 55-B, Okhla Industrial Area Phase 2';
      expect(sanitizeLocationForPrivacy(raw3)).not.toContain('55');
      expect(sanitizeLocationForPrivacy(raw3)).toContain('Okhla Industrial Area');
    });

    it('provides a safe default when location is empty or stripped clean', () => {
      expect(sanitizeLocationForPrivacy('')).toBe('Local Sector');
      expect(sanitizeLocationForPrivacy('   ')).toBe('Residential Colony Perimeter');
      expect(sanitizeLocationForPrivacy('#12')).toBe('Residential Colony Perimeter');
    });
  });

  // ==========================================================================
  // 4. SECRET SCRUBBING IN ERRORS
  // ==========================================================================
  describe('scrubErrorDetails', () => {
    it('redacts Google Gemini API keys (AIzaSy...) from error strings', () => {
      const errorWithKey = new Error('HTTP 403 Forbidden: Key AIzaSyD9xK8lMnOpQrStUvWxYz1234567890abc is quota restricted');
      const scrubbed = scrubErrorDetails(errorWithKey);
      expect(scrubbed).not.toContain('AIzaSyD9xK8lMnOpQrStUvWxYz1234567890abc');
      expect(scrubbed).toContain('[REDACTED_API_KEY]');
    });

    it('redacts full URLs that could contain query parameters', () => {
      const errorWithUrl = new Error('Failed to fetch https://generativelanguage.googleapis.com/v1beta/models?key=secret-token-1234');
      const scrubbed = scrubErrorDetails(errorWithUrl);
      expect(scrubbed).not.toContain('https://');
      expect(scrubbed).not.toContain('secret-token-1234');
      expect(scrubbed).toContain('[REDACTED_URL]');
    });

    it('handles non-Error objects and empty inputs gracefully', () => {
      expect(scrubErrorDetails(null)).toBe('An unexpected error occurred. Please try again.');
      expect(scrubErrorDetails(undefined)).toBe('An unexpected error occurred. Please try again.');
      expect(scrubErrorDetails('Simple text error')).toBe('Simple text error');
    });
  });

  // ==========================================================================
  // 5. SECURE API KEY RESOLUTION
  // ==========================================================================
  describe('resolveGeminiApiKey', () => {
    it('accepts valid session developer key with format check', () => {
      const userKey = 'AIzaSyA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q';
      expect(resolveGeminiApiKey(userKey)).toBe(userKey);
    });

    it('rejects short or empty keys', () => {
      expect(resolveGeminiApiKey('')).toBe('');
      expect(resolveGeminiApiKey('short')).toBe('');
      expect(resolveGeminiApiKey(undefined)).toBe('');
    });
  });
});
