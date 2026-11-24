import type { FamilyProfile, LocationData, GenAIMessage } from '../types';
import { 
  calculateCigaretteEquivalence, 
  runMassBalanceSimulation,
  calculateCorsiRosenthalEngineering,
  calculateIntegratedExposure,
  type DailyActivitySlot
} from '../utils/airCalculators';
import {
  sanitizeUserInput,
  anonymizeFamilyProfile,
  resolveGeminiApiKey,
  scrubErrorDetails
} from '../utils/security';

export type GeminiModelName = 'gemini-2.0-flash' | 'gemini-2.5-flash' | 'gemini-1.5-flash';

let activeAbortController: AbortController | null = null;

export interface AeroAIRequestParams {
  userPrompt: string;
  conversationHistory: GenAIMessage[];
  profile: FamilyProfile;
  currentLocation: LocationData;
  apiKey?: string;
  model?: GeminiModelName;
}

export interface ApiCallError extends Error {
  status?: number;
}

export async function askAeroAI(params: AeroAIRequestParams): Promise<GenAIMessage> {
  const { userPrompt, profile, currentLocation, apiKey, model = 'gemini-2.0-flash' } = params;

  // Sanitize user prompt to prevent prompt injection, script injection, and payload bloat
  const cleanPrompt = sanitizeUserInput(userPrompt, 1000);
  if (!cleanPrompt) {
    return generateDeterministicScientificResponse('overview', profile, currentLocation);
  }

  // Cancel any ongoing in-flight request to prevent race conditions
  if (activeAbortController) {
    activeAbortController.abort();
    activeAbortController = null;
  }

  const effectiveKey = resolveGeminiApiKey(apiKey);

  // If valid Gemini API Key is available, call Gemini API with exponential backoff retry
  if (effectiveKey && effectiveKey.length > 10) {
    try {
      activeAbortController = new AbortController();
      const response = await callGeminiAPIWithRetry({
        prompt: cleanPrompt,
        profile,
        location: currentLocation,
        apiKey: effectiveKey,
        model,
        signal: activeAbortController.signal,
      });
      activeAbortController = null;
      return response;
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw err;
      }
      const scrubbed = scrubErrorDetails(err);
      console.warn('Gemini API call failed after retries, falling back to deterministic local scientific engine:', scrubbed);
      // Fall through to deterministic neuro-heuristic engine
    } finally {
      activeAbortController = null;
    }
  }

  // Built-in intelligent scientific neuro-heuristic engine
  return generateDeterministicScientificResponse(cleanPrompt, profile, currentLocation);
}

/**
 * Calls Gemini API with exponential backoff retry for HTTP 429, 500, 502, 503, 504 and network errors.
 */
async function callGeminiAPIWithRetry(params: {
  prompt: string;
  profile: FamilyProfile;
  location: LocationData;
  apiKey: string;
  model: GeminiModelName;
  signal: AbortSignal;
}): Promise<GenAIMessage> {
  const { prompt, profile, location, apiKey, model, signal } = params;
  const maxRetries = 2;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await executeGeminiCall({ prompt, profile, location, apiKey, model, signal });
    } catch (error: unknown) {
      if (error instanceof Error) {
        lastError = error;
      } else {
        lastError = new Error(scrubErrorDetails(error));
      }

      if (signal.aborted) throw error;

      // Don't retry client-side 400 Bad Request or 401/403 (invalid key)
      const status = (error as ApiCallError)?.status;
      if (status === 400 || status === 401 || status === 403) {
        throw error;
      }

      if (attempt < maxRetries) {
        // Exponential backoff with jitter: 1s, 2s...
        const delayMs = Math.min(1000 * Math.pow(2, attempt) + Math.random() * 400, 5000);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastError || new Error('Gemini API communication failed after retries');
}

async function executeGeminiCall(params: {
  prompt: string;
  profile: FamilyProfile;
  location: LocationData;
  apiKey: string;
  model: GeminiModelName;
  signal: AbortSignal;
}): Promise<GenAIMessage> {
  const { prompt, profile, location, apiKey, model, signal } = params;

  // Anonymize family profile to strictly protect user privacy (no surnames or private notes transmitted)
  const anonymized = anonymizeFamilyProfile(profile);

  const indAqi = location.calculatedAQI?.indianNAQI?.value ?? 150;
  const usAqi = location.calculatedAQI?.usEPAAQI?.value ?? 150;
  const pblHeight = location.weather.boundaryLayerHeightMeters ?? 220;
  const cigData = calculateCigaretteEquivalence(location.pollutants.pm25);

  const systemInstruction = `
You are AeroPulse 2.0 AI: a premier environmental health scientist, atmospheric physicist, and household aerosol engineer.
You are counseling an urban household during winter smog and thermal inversions.

CURRENT LIVE SCIENTIFIC CONTEXT:
- Location: ${location.city}, ${location.country} (${location.latitude.toFixed(2)}°N, ${location.longitude.toFixed(2)}°E)
- Data Freshness: ${location.sourceType === 'live_api' ? 'Live Open-Meteo API Feed' : 'Seasonal Reference Baseline'} (Timestamp: ${location.dataTimestamp})
- Atmospheric Metrics:
  * PM2.5: ${location.pollutants.pm25} µg/m³ | PM10: ${location.pollutants.pm10} µg/m³
  * NO2: ${location.pollutants.no2} µg/m³ | SO2: ${location.pollutants.so2} µg/m³ | CO: ${location.pollutants.co} mg/m³ | O3: ${location.pollutants.ozone} µg/m³
  * Indian National AQI: ${indAqi} (${location.calculatedAQI?.indianNAQI?.category || 'Severe'})
  * US EPA AQI: ${usAqi} (${location.calculatedAQI?.usEPAAQI?.category || 'Very Unhealthy'})
  * Planetary Boundary Layer (PBL) Height: ${pblHeight} meters
  * Inversion Condition: ${location.weather.inversionCondition} (${location.weather.dispersionFactor})
  * Weather: ${location.weather.temperatureC}°C, ${location.weather.humidityPct}% RH, Wind: ${location.weather.windSpeedKmh} km/h ${location.weather.windDirectionCompass}
  * Cigarette-Equivalence Communication Aid: ~${cigData.cigarettesPerDay} cigs/day (Note: Inhaled particulate proxy, not clinical tobacco equivalence)

ANONYMIZED HOUSEHOLD SPECIFICATIONS:
- Members: ${anonymized.householdSummary}
- Housing: ${profile.housing.type}, Floor ${profile.housing.floorLevel}, Room Volume: ${anonymized.roomVolumeM3} m³
- Heating System: ${profile.housing.heatingSystem}
- Kitchen: Cooking fuel: ${anonymized.cookingFuel}, Exhaust: ${profile.housing.kitchenVentilation}
- Commute: ${anonymized.commuteMode}, ${profile.commute.commuteDistanceKm} km distance, departure: ${profile.commute.morningDepartureTime || '07:30'}, flexible: ${profile.commute.flexibleWorkHours}
- Air Purifier CADR: ${anonymized.airPurifierCADR} m³/h

SCIENTIFIC GUIDELINES:
1. Ground every recommendation in aerosol physics and atmospheric dynamics.
2. Distinguish ambient concentration, inhaled mass, and room steady-state concentrations.
3. NEVER state fixed generic percentages without physical assumptions.
4. Always provide the response in a structured 8-part format:
   PART 1: CURRENT SITUATION
   PART 2: SCIENTIFIC EXPLANATION
   PART 3: RECOMMENDED ACTION
   PART 4: WHY THE ACTION HELPS
   PART 5: EXPECTED IMPACT (Personal exposure cut & neighborhood emissions prevented)
   PART 6: ASSUMPTIONS
   PART 7: CONFIDENCE LEVEL (High, Moderate, or Low/Empirical)
   PART 8: IMPORTANT LIMITATIONS (e.g. Non-medical disclaimer, boundary layer height estimation note)
`;

  // Pass API key via x-goog-api-key header to prevent query parameter leakage in URL logs/proxies
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  const payload = {
    contents: [
      {
        role: 'user',
        parts: [
          { text: `${systemInstruction}\n\nUser Question: ${prompt}` }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.6,
      maxOutputTokens: 1200,
    }
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify(payload),
    signal,
  });

  if (!res.ok) {
    const err = new Error(`Gemini API Error: Status ${res.status}`) as ApiCallError;
    err.status = res.status;
    throw err;
  }

  const data = await res.json();
  const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated.';

  // Parse structured breakdown sections from the generated text
  const structuredBreakdown = parseStructuredResponse(textContent, location, profile);

  return {
    id: `msg-${Date.now()}`,
    sender: 'assistant',
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    text: textContent,
    structuredBreakdown,
    suggestedActions: extractSuggestedActions(prompt),
    impactBadge: {
      pm25Cut: structuredBreakdown?.expectedImpact ? structuredBreakdown.expectedImpact.slice(0, 45) : 'Personal Exposure Cut: Calculated',
      co2Saved: 'Zero-combustion lifestyle active',
      lungProtection: 'Shielded during inversion peak'
    }
  };
}

/**
 * Parses the 8-part response or falls back to robust defaults
 */
function parseStructuredResponse(
  text: string, 
  location: LocationData, 
  profile: FamilyProfile
): NonNullable<GenAIMessage['structuredBreakdown']> {
  const getSection = (name: string, nextNames: string[]): string => {
    const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(?:PART\\s*\\d*[:\\-\\s]*)?(?:\\*\\*)?${escapedName}(?:\\*\\*)?[:\\-\\s]*([\\s\\S]*?)(?=(?:PART\\s*\\d*[:\\-\\s]*)?(?:\\*\\*)?(?:${nextNames.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})|$)`, 'i');
    const match = text.match(regex);
    return match && match[1] ? match[1].trim() : '';
  };

  const sit = getSection('CURRENT SITUATION', ['SCIENTIFIC EXPLANATION', 'RECOMMENDED ACTION']);
  const exp = getSection('SCIENTIFIC EXPLANATION', ['RECOMMENDED ACTION', 'WHY THE ACTION HELPS']);
  const act = getSection('RECOMMENDED ACTION', ['WHY THE ACTION HELPS', 'EXPECTED IMPACT']);
  const why = getSection('WHY THE ACTION HELPS', ['EXPECTED IMPACT', 'ASSUMPTIONS']);
  const imp = getSection('EXPECTED IMPACT', ['ASSUMPTIONS', 'CONFIDENCE LEVEL']);
  const asm = getSection('ASSUMPTIONS', ['CONFIDENCE LEVEL', 'IMPORTANT LIMITATIONS']);
  const cnf = getSection('CONFIDENCE LEVEL', ['IMPORTANT LIMITATIONS', 'LIMITATIONS']);
  const lim = getSection('IMPORTANT LIMITATIONS', []);

  let confidence: 'High' | 'Moderate' | 'Low / Empirical' = 'High';
  if (cnf.toLowerCase().includes('moderate')) confidence = 'Moderate';
  if (cnf.toLowerCase().includes('low') || cnf.toLowerCase().includes('empirical')) confidence = 'Low / Empirical';

  return {
    currentSituation: sit || `Ambient PM2.5 in ${location.city} is ${location.pollutants.pm25} µg/m³ with a boundary layer compressed at ${location.weather.boundaryLayerHeightMeters ?? 220}m trapping vehicular and biomass emissions.`,
    scientificExplanation: exp || `Nocturnal radiational cooling of the ground produces a thermal inversion (dT/dz > 0), trapping combustion particulates below the boundary layer ceiling.`,
    recommendedAction: act || `Shift physical exertion and outdoor trips to midday when convective solar heating lifts the inversion lid. Run indoor air filtration with effective CADR matching room volume.`,
    whyItHelps: why || `Reduces inhaled alveolar PM2.5 deposition while maximizing clean air delivery rates (ACH) in occupied zones.`,
    expectedImpact: imp || `Reduces personal time-weighted particulate dose by ~65-80% inside living quarters. Eliminates ground-level vehicle idle soot.`,
    assumptions: asm || `Assumes room volume of ${profile.housing.roomVolumeM3 || 85} m³, standard penetration factor P=0.7, and continuous filtration operation.`,
    confidenceLevel: confidence,
    importantLimitations: lim || `Environmental intelligence only; does not substitute clinical medical advice or individual pulmonologist treatment.`
  };
}

/**
 * Deterministic local neuro-heuristic engine based on aerosol mass balance and atmospheric physics.
 */
function generateDeterministicScientificResponse(
  prompt: string,
  profile: FamilyProfile,
  location: LocationData
): GenAIMessage {
  const lower = prompt.toLowerCase();
  const cigData = calculateCigaretteEquivalence(location.pollutants.pm25);
  const indAqi = location.calculatedAQI?.indianNAQI?.value ?? 150;
  const pblHeight = location.weather.boundaryLayerHeightMeters ?? 220;
  const roomVol = profile.housing.roomVolumeM3 || (profile.housing.roomLengthM && profile.housing.roomWidthM && profile.housing.roomHeightM ? profile.housing.roomLengthM * profile.housing.roomWidthM * profile.housing.roomHeightM : 85);
  
  const hasAsthma = profile.members.some(m => m.type === 'asthma_copd');
  const hasInfant = profile.members.some(m => m.type === 'infant' || m.type === 'child');
  const hasSenior = profile.members.some(m => m.type === 'senior' || m.type === 'cardiac');

  // Calculate actual steady-state indoor PM2.5 with user's CADR
  const simResult = runMassBalanceSimulation({
    outdoorPM25: location.pollutants.pm25,
    initialIndoorPM25: location.pollutants.pm25 * 0.7,
    roomVolumeM3: roomVol,
    effectiveCADRM3h: profile.airPurifierCADR || 300,
    airExchangeRateACH: profile.housing.windowDraftiness === 'sealed' ? 0.35 : profile.housing.windowDraftiness === 'moderate_drafts' ? 0.8 : 1.5,
    penetrationFactor: 0.75,
    particleDepositionRate: 0.25,
    indoorGenerationRateUgH: 0,
    simulationDurationMinutes: 180,
  });

  // Calculate Corsi-Rosenthal Box estimate for comparison
  const crBox = calculateCorsiRosenthalEngineering({
    fanSizeInches: 20,
    fanCfm: 520,
    fanPowerWatts: 45,
    hasShroud: true,
    filterCount: 4,
    filterDimensionsInches: '20x20x2',
    filterMervRating: 'MERV 13',
    roomSquareMeters: Math.round(roomVol / 2.8),
    ceilingHeightMeters: 2.8,
    targetACH: 5,
  });

  let structured: NonNullable<GenAIMessage['structuredBreakdown']>;
  let text = '';
  let suggestedActions: GenAIMessage['suggestedActions'] = [];

  if (lower.includes('school') || lower.includes('commute') || lower.includes('morning') || lower.includes('travel') || lower.includes('bus') || lower.includes('car') || lower.includes('mask') || lower.includes('n95') || lower.includes('respirator')) {
    const baselineExp = location.pollutants.pm25 * 1.3; // roadside concentration spike
    const optExp = location.pollutants.pm25 * 0.15; // with recirculation + N95
    
    const baselineSlot: DailyActivitySlot = {
      label: 'Morning Commute Baseline',
      durationHours: 1,
      locationType: 'commute',
      ambientConcentrationUgM3: baselineExp,
      activityLevel: 'light_active',
    };

    const optSlot: DailyActivitySlot = {
      label: 'Morning Commute Optimized',
      durationHours: 1,
      locationType: 'commute',
      ambientConcentrationUgM3: optExp,
      activityLevel: 'light_active',
    };

    const avoidedMass = calculateIntegratedExposure([baselineSlot]).totalInhaledMassUg - calculateIntegratedExposure([optSlot]).totalInhaledMassUg;

    structured = {
      currentSituation: `Ambient PM2.5 in ${location.city} is ${location.pollutants.pm25} µg/m³ (Indian NAQI ${indAqi}). Roadside particulate concentration between 07:00 and 09:00 AM spikes by 25-40% due to cold engine starts and nocturnal thermal inversion cap at ~${pblHeight}m. ${hasAsthma ? 'Asthmatic airways face severe bronchospasm risk in morning cold draft.' : ''}`,
      scientificExplanation: `During morning hours, the planetary boundary layer is compressed below ${pblHeight}m. Heavy vehicle exhaust (diesel soot, unburned hydrocarbons) cannot disperse vertically. Breathing at ground level delivers peak submicron particulate directly to developing pediatric airways.`,
      recommendedAction: `1. Delay departure to 09:00 AM if flexible work/school hours allow.\n2. In transit, engage vehicle AC internal recirculation immediately.\n3. Fit snug, certified KF94/N95 masks with tight nose-bridge crimping for children and adults.\n4. Avoid open auto-rickshaws and two-wheelers during peak morning inversion.`,
      whyItHelps: `Vehicle cabin filtration with recirculation cuts particle ingress by 80-92%. Delaying departure by 45 minutes allows solar radiation to lift the boundary layer, diluting ambient roadside soot.`,
      expectedImpact: `Reduces one-hour commute inhaled particulate mass by ~${Math.round(avoidedMass)} µg per commuter. Carpooling with 4 families eliminates ~180g of direct tailpipe PM2.5 and 28 kg CO2 weekly.`,
      assumptions: `Assumes light adult breathing rate of 0.9 m³/h, vehicle cabin air filter intact, and 85% mask seal efficiency.`,
      confidenceLevel: 'High',
      importantLimitations: `Commute shifts depend on school/workplace schedule flexibility. Respirator effectiveness drops sharply if facial fit is loose.`
    };

    text = `### 🚨 Winter Inversion Commute & Travel Intelligence for ${location.city}

**1. Current Situation:** ${structured.currentSituation}

**2. Atmospheric Physics:** ${structured.scientificExplanation}

**3. Actionable Protocol:**
${structured.recommendedAction}

**4. Quantified Personal & Community Impact:**
- **Personal Shielding:** Avoids approximately **${Math.round(avoidedMass)} µg** of inhaled PM2.5 per commute hour.
- **Community Benefit:** Pooling transit with 4 neighboring families saves **~180g direct ground soot** and **28 kg CO2** weekly.

**5. Assumptions & Constraints:** ${structured.assumptions}`;

    suggestedActions = [
      { type: 'apply_routine', label: 'Adopt Commute Micro-Shift in Routine' },
      { type: 'community_alert', label: 'Join Neighborhood Carpool Pact' }
    ];

  } else if (lower.includes('diy') || lower.includes('corsi') || lower.includes('box') || lower.includes('cadr') || lower.includes('purifier') || lower.includes('filter')) {
    structured = {
      currentSituation: `Your current room volume is ${roomVol} m³. With your current purifier CADR of ${profile.airPurifierCADR} m³/h, the effective air change rate is ${(profile.airPurifierCADR / roomVol).toFixed(1)} ACH. A 4-filter Corsi-Rosenthal Box delivers ~${crBox.effectiveCADR_M3H} m³/h (~${crBox.effectiveCADR_CFM} CFM) at ${(crBox.effectiveCADR_M3H / roomVol).toFixed(1)} ACH.`,
      scientificExplanation: `Single-pass filtration effectiveness depends on filter surface area and face velocity. Commercial HEPA units push air through dense pleated media at high pressure drops, requiring noisy fans. A Corsi-Rosenthal Box expands filter media area by 400%, cutting static resistance in half and maximizing volumetric throughput.`,
      recommendedAction: `Construct a 4-sided cube using MERV 13 (or MERV 14) 20x20x2 inch pleated filters and a 20-inch box fan. Crucially, tape a 15-inch cardboard donut shroud over the fan face to eliminate blade-tip recirculation.`,
      whyItHelps: `The cardboard shroud prevents air backflow at blade tips, increasing effective clean air delivery rate by 18-22% while dropping acoustic noise.`,
      expectedImpact: `Yields ${crBox.effectiveCADR_M3H} m³/h CADR at an estimated cost of ₹${crBox.totalCostINR.toLocaleString()} ($${crBox.totalCostUSD}), achieving 90% room particulate clearance in ~${Math.round((2.3 / (crBox.effectiveCADR_M3H / roomVol + 0.8)) * 60)} minutes.`,
      assumptions: `Assumes 20-inch fan operating on medium speed, MERV 13 single-pass particle removal efficiency of 85% for PM2.5, and airtight duct tape perimeter seals.`,
      confidenceLevel: 'High',
      importantLimitations: `Filter life is approximately 5-6 months under heavy winter smog. Not designed for wet or humid outdoor environments.`
    };

    text = `### 🛠️ High-CADR Corsi-Rosenthal Box Engineering Analysis

**1. Engineering Overview:**
- Room Volume: **${roomVol} m³**
- Target Air Changes: **≥ 5 ACH** (Current: **${(profile.airPurifierCADR / roomVol).toFixed(1)} ACH**)
- DIY CR Box CADR: **${crBox.effectiveCADR_M3H} m³/h** (**${crBox.effectiveCADR_CFM} CFM**), providing **${(crBox.effectiveCADR_M3H / roomVol).toFixed(1)} ACH** in this room!

**2. Why the Shroud Matters:**
Without a shroud, box fan blade tips suffer massive vortex recirculation, where air loops backwards around the outer perimeter. Adding a circular cardboard shroud with a 15-inch opening boosts effective CADR by **18–22%**.

**3. Economic & Clean Air Comparison:**
- DIY Construction Cost: **₹${crBox.totalCostINR.toLocaleString()} ($${crBox.totalCostUSD})**
- Equivalent Commercial Purifier Cost: **₹${crBox.commercialHepaPriceINR.toLocaleString()} ($${crBox.commercialHepaPriceUSD})**
- Bill of Materials Savings: **₹${crBox.savingsINR.toLocaleString()} ($${crBox.savingsUSD})**`;

    suggestedActions = [
      { type: 'cadr_recalc', label: 'Open Interactive IAQ Studio' },
      { type: 'view_hack', label: 'View 7 IAQ Blueprints' }
    ];

  } else if (lower.includes('ventilat') || lower.includes('window') || lower.includes('fresh air') || lower.includes('flush') || lower.includes('co2') || lower.includes('open')) {
    structured = {
      currentSituation: `Outdoor PM2.5 in ${location.city} is currently ${location.pollutants.pm25} µg/m³. Boundary layer height is ${pblHeight}m with ${location.weather.inversionCondition}. Opening windows during morning or evening inversions rapidly pushes indoor PM2.5 past 180 µg/m³.`,
      scientificExplanation: `There is no universally safe ventilation window during winter smog. Diurnal solar heating breaks the surface inversion between 12:30 and 14:30, elevating the planetary boundary layer and dispersing ground emissions. However, if outdoor PM2.5 remains above 150 µg/m³, natural ventilation still introduces hazardous particulate.`,
      recommendedAction: `1. Monitor live ambient PM2.5 before opening windows.\n2. If indoor CO2 exceeds 1200 ppm and outdoor PM2.5 drops below 100 µg/m³ during midday (12:30-14:00), execute a rapid 12-minute cross-ventilation flush.\n3. Immediately close windows and run air purifiers on BOOST mode for 25 minutes.\n4. If outdoor air remains severe (>250 µg/m³), do not open windows; rely on mechanical filtration and indoor source reduction.`,
      whyItHelps: `A timed 12-minute flush purges accumulated metabolic CO2 and cooking VOCs with minimal thermal loss, allowing filtration scrubbers to restore clean baseline particulate levels quickly.`,
      expectedImpact: `Lowers indoor CO2 from >1500 ppm to <700 ppm, preventing cognitive fatigue and headaches while avoiding chronic particulate buildup.`,
      assumptions: `Assumes cross-ventilation with open windows on opposite exposures and an available air purifier with CADR ≥ ${(roomVol * 4).toFixed(0)} m³/h.`,
      confidenceLevel: 'Moderate',
      importantLimitations: `Ventilation must be strictly skipped on days when outdoor PM2.5 remains Severe (>300 µg/m³) throughout the afternoon.`
    };

    text = `### 🪟 Atmospheric Inversion & Ventilation Decision Matrix

**1. Scientific Reality Check:**
There is **no universally safe winter ventilation window**. Inversion strength fluctuates daily. 

**2. Current Atmospheric Dynamics:**
- Boundary Layer Height: **${pblHeight} meters** (${location.weather.inversionCondition})
- Ambient PM2.5: **${location.pollutants.pm25} µg/m³**

**3. The 12-Minute Midday Flush Protocol:**
- **Strictly Avoid:** 05:00–10:00 AM and 18:00–22:00 PM (ground inversion cap is lowest).
- **Conditional Window (12:30–14:00 PM):** Only if outdoor PM2.5 drops and indoor CO2 is elevated.
- **Scrubbing Phase:** After closing windows, ramp your purifier to maximum speed for 25 minutes to pull PM2.5 back down to **< 15 µg/m³**.`;

    suggestedActions = [
      { type: 'apply_routine', label: 'Check Hourly Ventilation Suitability' },
      { type: 'cadr_recalc', label: 'Simulate Room Decay Curve' }
    ];

  } else if (lower.includes('cook') || lower.includes('kitchen') || lower.includes('oil') || lower.includes('chulha') || lower.includes('fry') || lower.includes('gas')) {
    structured = {
      currentSituation: `Your kitchen uses ${profile.housing.cookingFuel.replace('_', ' ')} with ${profile.housing.kitchenVentilation.replace('_', ' ')}. In a closed winter apartment, searing and deep frying oils can generate indoor PM2.5 spikes exceeding 650 µg/m³ and substantial ultrafine particle counts.`,
      scientificExplanation: `Thermal decomposition of cooking oils at temperatures above smoke point (180-220°C) produces fine aerosol droplets, acrolein, and polycyclic aromatic hydrocarbons. Unvented gas flames also emit NO2 (50-250 ppb) and carbon monoxide.`,
      recommendedAction: `1. Turn on kitchen exhaust fan 2 minutes BEFORE heating cooking pans to establish an upward draft.\n2. Cook on rear stove burners to maximize capture efficiency by 25-35%.\n3. Isolate the kitchen door and open the kitchen-only window by 2 inches to establish negative pressure relative to bedrooms.\n4. Avoid dry tadka / smoking oil; switch to steaming, pressure cooking, or lid-covered simmering.`,
      whyItHelps: `Negative pressure prevents greasy aerosol plumes from migrating into bedrooms, where vulnerable family members sleep.`,
      expectedImpact: `Prevents bedroom PM2.5 spikes from exceeding 25 µg/m³ during dinner prep, eliminating ~85% of cooking-induced indoor particulate dispersion.`,
      assumptions: `Assumes kitchen door can be closed and range hood or exhaust fan exhausts directly outdoors.`,
      confidenceLevel: 'High',
      importantLimitations: `Recirculating range hoods with dirty grease meshes do not capture fine aerosol or combustion gases without active carbon and HEPA stages.`
    };

    text = `### 🍳 Kitchen Aerosol Dynamics & Cooking Smog Defense

**1. The Indoor Source Problem:**
Indoor frying and unvented gas burners can push indoor particulate to **400–700 µg/m³**, higher than outdoor street smog!

**2. Four Physics-Backed Interventions:**
1. **The 2-Minute Pre-Draft Rule:** Start the exhaust fan before lighting flames to establish laminar upward airflow.
2. **Rear Burner Priority:** Range hoods capture **25–35% more plume** from back burners than front burners.
3. **Negative Kitchen Pressure:** Close kitchen doors leading to bedrooms; crack only the kitchen window 2 inches for makeup air.
4. **Cooking Method Shift:** Substitute deep-oil frying with pressure cooking, boiling, or baking on severe smog days.`;

    suggestedActions = [
      { type: 'view_hack', label: 'View Kitchen Fluid Dynamics Hack' },
      { type: 'cadr_recalc', label: 'Model Indoor Particle Generation Rate' }
    ];

  } else if (lower.includes('asthma') || lower.includes('child') || lower.includes('baby') || lower.includes('senior') || lower.includes('cough') || lower.includes('wheez')) {
    structured = {
      currentSituation: `Your household has vulnerable members: ${profile.members.filter(m => m.type !== 'healthy_adult').map(m => `${m.label} (${m.type})`).join(', ')}. ${hasSenior ? 'Senior members face increased cardiovascular load.' : ''} ${hasInfant ? 'Pediatric airways have smaller cross-sectional radii.' : ''} Inhaling ambient PM2.5 of ${location.pollutants.pm25} µg/m³ delivers an alveolar toxicity equivalent of ~${cigData.cigarettesPerDay} cigarettes/day.`,
      scientificExplanation: `Submicron particulates (<2.5 µm) penetrate deeply into terminal bronchioles and alveoli, provoking acute oxidative stress, systemic vascular inflammation, and vagal reflex bronchoconstriction. In pediatric lungs with smaller airway diameters, mucosal swelling increases airway resistance exponentially according to Poiseuille's law (R ∝ 1/r⁴).`,
      recommendedAction: `1. Establish a dedicated "Clean Bedroom Haven" sealed with silicone door draft stoppers and continuous filtration maintaining PM2.5 < 15 µg/m³.\n2. Maintain indoor relative humidity between 40% and 50% using ultrasonic humidifiers filled ONLY with reverse osmosis or distilled water.\n3. Ensure rescue inhalers (e.g. Salbutamol / Ventolin with spacer) and pulse oximeter are readily accessible.\n4. Administer isotonic warm nasal saline rinses after outdoor exposure to clear inhaled soot from mucosal cilia.`,
      whyItHelps: `Preserves ciliary motility and prevents mucosal cracking in cold dry air, while shielding vulnerable airways during nighttime thermal inversion peaks.`,
      expectedImpact: `Reduces sleep-time inhaled particulate dose by >80%, mitigating nocturnal asthma exacerbations and pediatric emergency visits.`,
      assumptions: `Assumes clean bedroom volume ≤ 45 m³, purifier CADR ≥ 200 m³/h, and absence of indoor combustion sources (incense, dhoop, mosquito coils).`,
      confidenceLevel: 'High',
      importantLimitations: `Engineering guidance only. Consult your pulmonologist or pediatrician immediately if wheezing, stridor, or retractions occur.`
    };

    text = `### 🩺 Vulnerability Protection & Airway Shield Protocol

**1. Physiological Risk Assessment:**
- **Children & Infants:** Higher minute ventilation per kg body weight; developing lung alveoli.
- **Asthma / Respiratory Sensitivity:** Acid aerosols and cold air stimulate bronchial C-fibers, triggering bronchospasm.
- **Seniors:** Particulate translocates across alveolar membranes into circulation, accelerating cardiovascular strain.

**2. The 4-Step Clean Bedroom Haven Protocol:**
1. **Target:** Keep bedroom PM2.5 strictly under **12–15 µg/m³** 24/7.
2. **Sealing:** Install silicone door draft stoppers at the threshold to block living room infiltration.
3. **Humidity Sweet-Spot (40–50% RH):** Keeps airway cilia active without encouraging dust mites. *Never use tap water in ultrasonic humidifiers to prevent mineral aerosol.*
4. **Isotonic Saline Rinse:** Flushes deposited soot and inflammatory mediators from nasal turbinates after outdoor trips.`;

    suggestedActions = [
      { type: 'cadr_recalc', label: 'Verify Clean Bedroom Haven CADR' },
      { type: 'view_hack', label: 'Inspect 40-50% Humidity Sweetspot Hack' }
    ];

  } else {
    // General comprehensive overview
    structured = {
      currentSituation: `Location: ${location.city} | Ambient PM2.5: ${location.pollutants.pm25} µg/m³ | Indian NAQI: ${indAqi} | PBL Height: ${pblHeight}m (${location.weather.inversionCondition}). Inhaling ambient air today represents an alveolar dose proxy of ~${cigData.cigarettesPerDay} cigarettes/day.`,
      scientificExplanation: `Winter thermal inversions suppress atmospheric vertical mixing. High emissions from transport, biomass, and regional agriculture remain trapped in the shallow ground layer. Your household's steady-state indoor PM2.5 without active filtration is ~${Math.round(location.pollutants.pm25 * 0.75)} µg/m³; with your ${profile.airPurifierCADR} m³/h purifier running, it drops to ~${Math.round(simResult.steadyStateIndoorPM25)} µg/m³.`,
      recommendedAction: `1. Run air cleaners continuously on medium speed in bedrooms and living rooms.\n2. Synchronize outdoor transit and errands with the midday solar window (12:30-14:30 PM).\n3. Keep car AC in recirculation mode and wear certified N95 respirators outdoors.\n4. Eliminate indoor burning (incense, mosquito coils, open wood stoves) and use damp microfiber cleaning.`,
      whyItHelps: `Maintains indoor particulate below WHO and CPCB guideline thresholds while preventing toxic dust resuspension.`,
      expectedImpact: `Cuts family lung exposure by ${Math.round(simResult.infiltrationCutPercentage)}% indoors. Neighborhood carpooling and zero-burning mulching prevent ~65g PM2.5 and 5.8 kg CO2 daily.`,
      assumptions: `Calculated using single-compartment mass-balance equation (V=${roomVol}m³, CADR=${profile.airPurifierCADR}m³/h, λ=0.8/h, P=0.75).`,
      confidenceLevel: 'High',
      importantLimitations: `Ambient conditions change with wind shifts and frontal systems. Boundary layer heights are modelled estimates.`
    };

    text = `### 🛡️ AeroPulse 2.0 Comprehensive Air Quality Intelligence for ${location.city}

**1. Atmospheric Status & Diagnostic:**
- Ambient PM2.5: **${location.pollutants.pm25} µg/m³** | Indian NAQI: **${indAqi}** (${location.calculatedAQI?.indianNAQI?.category || 'Severe'})
- Boundary Layer Height: **${pblHeight} meters** (${location.weather.inversionCondition})
- Inhaled Particulate Toxicity Proxy: **~${cigData.cigarettesPerDay} cigarettes/day** *(Educational proxy only; not clinical equivalence)*

**2. Mass-Balance Room Forecast for Your Home:**
- Room Volume: **${roomVol} m³**
- Unfiltered Indoor PM2.5: **~${Math.round(location.pollutants.pm25 * 0.75)} µg/m³**
- Purified Steady-State PM2.5: **~${Math.round(simResult.steadyStateIndoorPM25)} µg/m³** (**${Math.round(simResult.infiltrationCutPercentage)}% personal exposure cut**)

**3. Actionable Defense Protocol:**
- **Morning Commute:** Delay trips to 09:00 AM; seal vehicle cabin with internal recirculation.
- **Indoor Clean Rooms:** Run filtration 24/7; clean with damp microfiber instead of dry sweeping.
- **Midday Window:** Confine outdoor movement to 12:30–14:30 PM when the inversion lid lifts.`;

    suggestedActions = [
      { type: 'apply_routine', label: 'Review My Personalized Daily Schedule' },
      { type: 'cadr_recalc', label: 'Simulate Room Decay Curve in IAQ Studio' },
      { type: 'view_hack', label: 'Browse 7 Science-Backed IAQ Blueprints' }
    ];
  }

  return {
    id: `msg-${Date.now()}`,
    sender: 'assistant',
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    text,
    structuredBreakdown: structured,
    suggestedActions,
    impactBadge: {
      pm25Cut: `${Math.round(simResult.infiltrationCutPercentage)}% Lower Indoor Particulate`,
      co2Saved: '5.8 kg CO2 Avoided / Day',
      lungProtection: 'Shielded against inversion peak'
    }
  };
}

function extractSuggestedActions(prompt: string): GenAIMessage['suggestedActions'] {
  const p = prompt.toLowerCase();
  if (p.includes('cadr') || p.includes('box') || p.includes('purifier') || p.includes('room')) {
    return [
      { type: 'cadr_recalc', label: 'Open IAQ Studio & CR Box Sizer' },
      { type: 'view_hack', label: 'View 7 IAQ Blueprints' }
    ];
  }
  if (p.includes('commute') || p.includes('school') || p.includes('routine') || p.includes('schedule')) {
    return [
      { type: 'apply_routine', label: 'View Personalized Daily Micro-Shifts' },
      { type: 'community_alert', label: 'Join Community Carpool Pact' }
    ];
  }
  return [
    { type: 'apply_routine', label: 'View Personalized Daily Schedule' },
    { type: 'cadr_recalc', label: 'Simulate Room Decay in IAQ Studio' }
  ];
}
