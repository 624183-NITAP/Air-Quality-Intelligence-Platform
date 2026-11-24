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
 * Strips personal names, specific addresses, and private notes.
 * Extracts only epidemiological and physiological categories needed for aerosol calculations.
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
    const ageGroup = m.age < 2 ? 'infant' : m.age < 13 ? 'child' : m.age >= 60 ? 'senior' : 'adult';
    const condition = m.type === 'asthma_copd' ? 'respiratory sensitivity (asthma/COPD)'
      : m.type === 'cardiac' ? 'cardiovascular sensitivity'
      : m.type === 'pregnant' ? 'pregnant'
      : 'standard baseline';
    return `Person #${idx + 1}: ${ageGroup} (age ${m.age}), condition: ${condition}`;
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
 * Resolves the Gemini API Key securely.
 * Checks for user-provided key, then falls back to VITE_GEMINI_API_KEY from environment.
 * Validates key format before returning.
 */
export function resolveGeminiApiKey(userKey?: string): string {
  if (userKey && userKey.trim().length > 10) {
    return userKey.trim();
  }

  const envKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (typeof envKey === 'string' && envKey.trim().length > 10) {
    return envKey.trim();
  }

  return '';
}
