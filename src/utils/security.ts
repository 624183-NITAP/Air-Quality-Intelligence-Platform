import type { FamilyProfile } from '../types';

/**
 * Sanitizes user input string by stripping potential HTML tags, JavaScript URI schemes,
 * controlling maximum length, and normalizing whitespace.
 */
export function sanitizeUserInput(input: string, maxLength = 1000): string {
  if (!input || typeof input !== 'string') return '';

  // 1. Strip HTML tags and control characters
  let sanitized = input
    .replace(/<[^>]*>?/gm, '') // Remove HTML tags
    .replace(/javascript:/gi, '') // Remove javascript pseudo-protocol
    .replace(/data:\s*text\/html/gi, '') // Remove data URI injections
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F]/g, ''); // Remove control chars

  // 2. Collapse excess whitespace
  sanitized = sanitized.replace(/\s+/g, ' ').trim();

  // 3. Enforce maximum character boundary to prevent prompt bloat / resource exhaustion
  if (sanitized.length > maxLength) {
    sanitized = sanitized.slice(0, maxLength).trim();
  }

  return sanitized;
}

/**
 * Anonymizes family profile before transmitting context to external GenAI endpoints.
 * - Strips personal names, surnames, and private freeform notes.
 * - Replaces exact numerical ages with coarse physiological age bands (Infant, Child, Adolescent, Adult, Senior).
 * - Minimizes medical information to basic aerosol vulnerability categories (respiratory, cardiac, prenatal).
 */
export function anonymizeFamilyProfile(profile: FamilyProfile): {
  householdSummary: string;
  roomVolumeM3: number;
  draftCategory: string;
  cookingFuel: string;
  commuteMode: string;
  airPurifierCADR: number;
} {
  const roomVol = profile.housing.roomVolumeM3 || 
    (profile.housing.roomLengthM && profile.housing.roomWidthM && profile.housing.roomHeightM 
      ? profile.housing.roomLengthM * profile.housing.roomWidthM * profile.housing.roomHeightM 
      : 85);

  const anonymizedMembers = profile.members.map((m, idx) => {
    const ageBand = m.age < 2 ? 'infant (0-2y)' 
      : m.age < 13 ? 'child (3-12y)' 
      : m.age < 20 ? 'adolescent (13-19y)' 
      : m.age >= 60 ? 'senior (60+y)' 
      : 'adult (20-59y)';

    const condition = m.type === 'asthma_copd' ? 'respiratory sensitivity (asthma/COPD)'
      : m.type === 'cardiac' ? 'cardiovascular sensitivity'
      : m.type === 'pregnant' ? 'pregnant'
      : 'standard baseline';

    return `Person #${idx + 1}: ${ageBand}, condition: ${condition}`;
  }).join('; ');

  return {
    householdSummary: anonymizedMembers,
    roomVolumeM3: roomVol,
    draftCategory: profile.housing.windowDraftiness,
    cookingFuel: profile.housing.cookingFuel,
    commuteMode: profile.commute.primaryMode,
    airPurifierCADR: profile.airPurifierCADR || 300,
  };
}

/**
 * Anonymizes geographic coordinates before sending to AI providers.
 * Truncates latitude and longitude to 1 decimal place (~11 km regional box),
 * stripping precise residential micro-locations while preserving regional air basin context.
 */
export function anonymizeLocationForAI(location: { city: string; country: string; latitude: number; longitude: number }): {
  city: string;
  country: string;
  approxLatitude: number;
  approxLongitude: number;
} {
  return {
    city: sanitizeUserInput(location.city, 50),
    country: sanitizeUserInput(location.country, 50),
    approxLatitude: +location.latitude.toFixed(1),
    approxLongitude: +location.longitude.toFixed(1),
  };
}

/**
 * Enforces location privacy for community crowdsourced reports.
 * Strips exact residential door/flat numbers, street numbers, and private plot designations,
 * preserving only public sector, colony, or landmark level identifiers.
 */
export function sanitizeLocationForPrivacy(rawLocation: string): string {
  if (!rawLocation) return 'Local Sector';

  let cleaned = rawLocation
    .replace(/(?:flat|apt|apartment|house|door|plot|villa|room|no\.?|#)\s*\d+[a-z]?[,\s-]*/gi, '')
    .replace(/\b\d+\/[a-z0-9-]+\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  // If aggressive stripping leaves it empty, provide a safe fallback
  if (!cleaned || cleaned.length < 3) {
    cleaned = 'Residential Colony Perimeter';
  }

  return sanitizeUserInput(cleaned, 120);
}

/**
 * Scrubs potential secrets (API keys, internal network endpoints, credentials) from error messages
 * before displaying them in UI states.
 */
export function scrubErrorDetails(error: unknown): string {
  if (!error) return 'An unexpected error occurred. Please try again.';

  let msg = '';
  if (error instanceof Error) {
    msg = error.message;
  } else if (typeof error === 'string') {
    msg = error;
  } else {
    msg = String(error);
  }

  // Scrub any Google API key pattern (AIzaSy...)
  msg = msg.replace(/AIzaSy[A-Za-z0-9_-]{33}/g, '[REDACTED_API_KEY]');

  // Scrub raw URLs that might contain query params
  msg = msg.replace(/https?:\/\/[^\s]+/g, '[REDACTED_URL]');

  return msg.trim() || 'Communication with service failed safely.';
}

/**
 * Resolves optional developer-session Gemini API key.
 * In production architectures, credentials are held strictly server-side (GEMINI_API_KEY).
 * Validates key format before returning.
 */
export function resolveGeminiApiKey(userKey?: string): string {
  if (userKey && typeof userKey === 'string' && userKey.trim().length > 10) {
    return userKey.trim();
  }
  return '';
}
