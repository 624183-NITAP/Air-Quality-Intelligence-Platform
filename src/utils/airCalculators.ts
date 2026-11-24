import type {
  AirQualityScale,
  AQIResult,
  CorsiRosenthalBoxConfig,
  MassBalanceSimulationParams,
  MassBalanceSimulationResult,
  DynamicSimulationPoint
} from '../types';

// ============================================================================
// 1. UNIT CONVERSIONS & PHYSICAL CONSTANTS
// ============================================================================

export const CFM_TO_M3H = 1.699011;
export const M3H_TO_CFM = 1 / CFM_TO_M3H;
export const M3_TO_FT3 = 35.314667;
export const FT3_TO_M3 = 1 / M3_TO_FT3;

/**
 * Normal adult breathing volume: ~12 m3/day (0.5 m3/hr at rest, up to 1.5-2.5 m3/hr during exertion)
 * Child breathing volume per kg is ~50% higher than adults due to higher metabolic rate.
 */
export const PHYSIOLOGICAL_VENTILATION_RATES_M3H = {
  infant_resting: 0.15,
  child_resting: 0.35,
  child_active: 0.85,
  adult_sleep: 0.45,
  adult_sedentary: 0.60,
  adult_light_activity: 1.20,
  adult_intense_exercise: 2.50,
};

// ============================================================================
// 2. INDIAN NATIONAL AIR QUALITY INDEX (CPCB 2014)
// ============================================================================

interface CPCBBreakpoint {
  cLow: number;
  cHigh: number;
  iLow: number;
  iHigh: number;
}

// CPCB 2014 National Air Quality Index (NAQI) official breakpoint tables
const CPCB_PM25_BREAKPOINTS: CPCBBreakpoint[] = [
  { cLow: 0, cHigh: 30, iLow: 0, iHigh: 50 },
  { cLow: 31, cHigh: 60, iLow: 51, iHigh: 100 },
  { cLow: 61, cHigh: 90, iLow: 101, iHigh: 200 },
  { cLow: 91, cHigh: 120, iLow: 201, iHigh: 300 },
  { cLow: 121, cHigh: 250, iLow: 301, iHigh: 400 },
  { cLow: 251, cHigh: 500, iLow: 401, iHigh: 500 },
];

const CPCB_PM10_BREAKPOINTS: CPCBBreakpoint[] = [
  { cLow: 0, cHigh: 50, iLow: 0, iHigh: 50 },
  { cLow: 51, cHigh: 100, iLow: 51, iHigh: 100 },
  { cLow: 101, cHigh: 250, iLow: 101, iHigh: 200 },
  { cLow: 251, cHigh: 350, iLow: 201, iHigh: 300 },
  { cLow: 351, cHigh: 430, iLow: 301, iHigh: 400 },
  { cLow: 431, cHigh: 600, iLow: 401, iHigh: 500 },
];

const CPCB_NO2_BREAKPOINTS: CPCBBreakpoint[] = [
  { cLow: 0, cHigh: 40, iLow: 0, iHigh: 50 },
  { cLow: 41, cHigh: 80, iLow: 51, iHigh: 100 },
  { cLow: 81, cHigh: 180, iLow: 101, iHigh: 200 },
  { cLow: 181, cHigh: 280, iLow: 201, iHigh: 300 },
  { cLow: 281, cHigh: 400, iLow: 301, iHigh: 400 },
  { cLow: 401, cHigh: 600, iLow: 401, iHigh: 500 },
];

const CPCB_SO2_BREAKPOINTS: CPCBBreakpoint[] = [
  { cLow: 0, cHigh: 40, iLow: 0, iHigh: 50 },
  { cLow: 41, cHigh: 80, iLow: 51, iHigh: 100 },
  { cLow: 81, cHigh: 380, iLow: 101, iHigh: 200 },
  { cLow: 381, cHigh: 800, iLow: 201, iHigh: 300 },
  { cLow: 801, cHigh: 1600, iLow: 301, iHigh: 400 },
  { cLow: 1601, cHigh: 2000, iLow: 401, iHigh: 500 },
];

// CO breakpoints in mg/m3 (CPCB 8-hr standard)
const CPCB_CO_BREAKPOINTS: CPCBBreakpoint[] = [
  { cLow: 0.0, cHigh: 1.0, iLow: 0, iHigh: 50 },
  { cLow: 1.1, cHigh: 2.0, iLow: 51, iHigh: 100 },
  { cLow: 2.1, cHigh: 10.0, iLow: 101, iHigh: 200 },
  { cLow: 10.1, cHigh: 17.0, iLow: 201, iHigh: 300 },
  { cLow: 17.1, cHigh: 34.0, iLow: 301, iHigh: 400 },
  { cLow: 34.1, cHigh: 50.0, iLow: 401, iHigh: 500 },
];

// Ozone breakpoints in ug/m3 (CPCB 8-hr standard)
const CPCB_O3_BREAKPOINTS: CPCBBreakpoint[] = [
  { cLow: 0, cHigh: 50, iLow: 0, iHigh: 50 },
  { cLow: 51, cHigh: 100, iLow: 51, iHigh: 100 },
  { cLow: 101, cHigh: 168, iLow: 101, iHigh: 200 },
  { cLow: 169, cHigh: 208, iLow: 201, iHigh: 300 },
  { cLow: 209, cHigh: 748, iLow: 301, iHigh: 400 },
  { cLow: 749, cHigh: 1000, iLow: 401, iHigh: 500 },
];

// Ammonia (NH3) breakpoints in ug/m3 (CPCB 24-hr standard)
const CPCB_NH3_BREAKPOINTS: CPCBBreakpoint[] = [
  { cLow: 0, cHigh: 200, iLow: 0, iHigh: 50 },
  { cLow: 201, cHigh: 400, iLow: 51, iHigh: 100 },
  { cLow: 401, cHigh: 800, iLow: 101, iHigh: 200 },
  { cLow: 801, cHigh: 1200, iLow: 201, iHigh: 300 },
  { cLow: 1201, cHigh: 1800, iLow: 301, iHigh: 400 },
  { cLow: 1801, cHigh: 2400, iLow: 401, iHigh: 500 },
];

// Lead (Pb) breakpoints in ug/m3 (CPCB 24-hr standard)
const CPCB_PB_BREAKPOINTS: CPCBBreakpoint[] = [
  { cLow: 0.0, cHigh: 0.5, iLow: 0, iHigh: 50 },
  { cLow: 0.6, cHigh: 1.0, iLow: 51, iHigh: 100 },
  { cLow: 1.1, cHigh: 2.0, iLow: 101, iHigh: 200 },
  { cLow: 2.1, cHigh: 3.0, iLow: 201, iHigh: 300 },
  { cLow: 3.1, cHigh: 3.5, iLow: 301, iHigh: 400 },
  { cLow: 3.6, cHigh: 5.0, iLow: 401, iHigh: 500 },
];

function interpolateSubIndex(conc: number | undefined | null, breakpoints: CPCBBreakpoint[]): number | undefined {
  if (conc === undefined || conc === null || !Number.isFinite(conc) || conc < 0) {
    return undefined;
  }
  for (const bp of breakpoints) {
    if (conc <= bp.cHigh) {
      const idx = ((bp.iHigh - bp.iLow) / (bp.cHigh - bp.cLow)) * (conc - bp.cLow) + bp.iLow;
      return Math.min(500, Math.max(0, Math.round(idx)));
    }
  }
  return 500;
}

export function calculateIndianNAQI(pollutants: {
  pm25?: number;
  pm10?: number;
  no2?: number;
  so2?: number;
  co?: number;
  ozone?: number;
  nh3?: number;
  pb?: number;
}): AQIResult {
  const pm25Sub = interpolateSubIndex(pollutants.pm25, CPCB_PM25_BREAKPOINTS);
  const pm10Sub = interpolateSubIndex(pollutants.pm10, CPCB_PM10_BREAKPOINTS);
  const no2Sub = interpolateSubIndex(pollutants.no2, CPCB_NO2_BREAKPOINTS);
  const so2Sub = interpolateSubIndex(pollutants.so2, CPCB_SO2_BREAKPOINTS);
  const coSub = interpolateSubIndex(pollutants.co, CPCB_CO_BREAKPOINTS);
  const o3Sub = interpolateSubIndex(pollutants.ozone, CPCB_O3_BREAKPOINTS);
  const nh3Sub = interpolateSubIndex(pollutants.nh3, CPCB_NH3_BREAKPOINTS);
  const pbSub = interpolateSubIndex(pollutants.pb, CPCB_PB_BREAKPOINTS);

  const subMap: Array<{ pollutant: AQIResult['dominantPollutant']; subIndex: number }> = [];
  if (pm25Sub !== undefined) subMap.push({ pollutant: 'PM2.5', subIndex: pm25Sub });
  if (pm10Sub !== undefined) subMap.push({ pollutant: 'PM10', subIndex: pm10Sub });
  if (no2Sub !== undefined) subMap.push({ pollutant: 'NO2', subIndex: no2Sub });
  if (so2Sub !== undefined) subMap.push({ pollutant: 'SO2', subIndex: so2Sub });
  if (coSub !== undefined) subMap.push({ pollutant: 'CO', subIndex: coSub });
  if (o3Sub !== undefined) subMap.push({ pollutant: 'O3', subIndex: o3Sub });
  if (nh3Sub !== undefined) subMap.push({ pollutant: 'NH3', subIndex: nh3Sub });
  if (pbSub !== undefined) subMap.push({ pollutant: 'Pb', subIndex: pbSub });

  // Official CPCB Data Sufficiency Requirement:
  // Minimum 3 monitored pollutants with valid sub-indices, of which at least one must be PM2.5 or PM10.
  const hasParticulate = pm25Sub !== undefined || pm10Sub !== undefined;
  const isDataSufficient = subMap.length >= 3 && hasParticulate;
  const dataSufficiencyNote = isDataSufficient
    ? 'Official CPCB NAQI criteria satisfied (>= 3 pollutants monitored with particulate fraction).'
    : (subMap.length === 0
        ? 'No valid pollutant measurements provided.'
        : `CPCB criteria require >= 3 pollutants including PM2.5 or PM10 (Monitored: ${subMap.length}, Particulate: ${hasParticulate ? 'Yes' : 'No'}). Showing highest available sub-index.`);

  if (subMap.length === 0) {
    return {
      value: 0,
      scale: 'IN_NAQI',
      category: 'Good',
      dominantPollutant: 'PM2.5',
      colorToken: getIndianNAQICategory(0).colorToken,
      healthAdvisory: 'Insufficient pollutant measurements to calculate air quality sub-indices.',
      monitoredPollutantsCount: 0,
      isDataSufficient: false,
      dataSufficiencyNote,
    };
  }

  let dominant = subMap[0];
  for (let i = 1; i < subMap.length; i++) {
    if (subMap[i].subIndex > dominant.subIndex) {
      dominant = subMap[i];
    }
  }

  const clamped = Math.min(500, Math.max(0, dominant.subIndex));
  const categoryInfo = getIndianNAQICategory(clamped);

  return {
    value: clamped,
    scale: 'IN_NAQI',
    category: categoryInfo.category,
    dominantPollutant: dominant.pollutant,
    colorToken: categoryInfo.colorToken,
    healthAdvisory: categoryInfo.healthAdvisory,
    subIndices: {
      pm25: pm25Sub,
      pm10: pm10Sub,
      no2: no2Sub,
      so2: so2Sub,
      co: coSub,
      ozone: o3Sub,
      nh3: nh3Sub,
      pb: pbSub,
    },
    monitoredPollutantsCount: subMap.length,
    isDataSufficient,
    dataSufficiencyNote,
  };
}

export function getIndianNAQICategory(aqi: number) {
  if (aqi <= 50) {
    return {
      category: 'Good',
      colorToken: {
        bg: 'bg-emerald-500/15',
        text: 'text-emerald-400',
        border: 'border-emerald-500/30',
        badgeBg: 'bg-emerald-950',
        badgeText: 'text-emerald-300',
      },
      healthAdvisory: 'Minimal health impact; excellent for all outdoor activities.',
    };
  } else if (aqi <= 100) {
    return {
      category: 'Satisfactory',
      colorToken: {
        bg: 'bg-lime-500/15',
        text: 'text-lime-400',
        border: 'border-lime-500/30',
        badgeBg: 'bg-lime-950',
        badgeText: 'text-lime-300',
      },
      healthAdvisory: 'Minor breathing discomfort to sensitive individuals.',
    };
  } else if (aqi <= 200) {
    return {
      category: 'Moderate',
      colorToken: {
        bg: 'bg-yellow-500/15',
        text: 'text-yellow-400',
        border: 'border-yellow-500/30',
        badgeBg: 'bg-yellow-950',
        badgeText: 'text-yellow-300',
      },
      healthAdvisory: 'Breathing discomfort to people with asthma, heart conditions, and children.',
    };
  } else if (aqi <= 300) {
    return {
      category: 'Poor',
      colorToken: {
        bg: 'bg-orange-500/15',
        text: 'text-orange-400',
        border: 'border-orange-500/30',
        badgeBg: 'bg-orange-950',
        badgeText: 'text-orange-300',
      },
      healthAdvisory: 'Breathing discomfort to most people on prolonged exposure; avoid strenuous outdoor work.',
    };
  } else if (aqi <= 400) {
    return {
      category: 'Very Poor',
      colorToken: {
        bg: 'bg-rose-500/20',
        text: 'text-rose-400',
        border: 'border-rose-500/40',
        badgeBg: 'bg-rose-950',
        badgeText: 'text-rose-300',
      },
      healthAdvisory: 'Respiratory illness on prolonged exposure. Severe effect on people with existing lung disease.',
    };
  } else {
    return {
      category: 'Severe',
      colorToken: {
        bg: 'bg-red-950/60',
        text: 'text-red-400',
        border: 'border-red-600/60',
        badgeBg: 'bg-red-950',
        badgeText: 'text-red-200',
      },
      healthAdvisory: 'Affects healthy people and seriously impacts those with existing disease. Emergency precautions mandatory.',
    };
  }
}

// ============================================================================
// 3. US EPA AIR QUALITY INDEX (2024 Revised PM2.5 Standards)
// ============================================================================

export function pm25ToUSEPAAQI(pm25: number): AQIResult {
  if (typeof pm25 !== 'number' || isNaN(pm25) || !isFinite(pm25) || pm25 <= 0) {
    return {
      value: 0,
      scale: 'US_EPA',
      category: 'Good',
      dominantPollutant: 'PM2.5',
      colorToken: {
        bg: 'bg-emerald-500/15',
        text: 'text-emerald-400',
        border: 'border-emerald-500/30',
        badgeBg: 'bg-emerald-950',
        badgeText: 'text-emerald-300',
      },
      healthAdvisory: 'Air quality is satisfactory and poses little or no risk.',
    };
  }

  const c = pm25;
  let aqi = 0;

  if (c <= 9.0) {
    aqi = ((50 - 0) / (9.0 - 0.0)) * (c - 0.0) + 0;
  } else if (c <= 35.4) {
    aqi = ((100 - 51) / (35.4 - 9.1)) * (c - 9.1) + 51;
  } else if (c <= 55.4) {
    aqi = ((150 - 101) / (55.4 - 35.5)) * (c - 35.5) + 101;
  } else if (c <= 125.4) {
    aqi = ((200 - 151) / (125.4 - 55.5)) * (c - 55.5) + 151;
  } else if (c <= 225.4) {
    aqi = ((300 - 201) / (225.4 - 125.5)) * (c - 125.5) + 201;
  } else if (c <= 325.4) {
    aqi = ((400 - 301) / (325.4 - 225.5)) * (c - 225.5) + 301;
  } else {
    aqi = ((500 - 401) / (500.4 - 325.5)) * (c - 325.5) + 401;
  }

  const rounded = Math.min(500, Math.round(aqi));
  let category = 'Good';
  let colorToken = {
    bg: 'bg-emerald-500/15',
    text: 'text-emerald-400',
    border: 'border-emerald-500/30',
    badgeBg: 'bg-emerald-950',
    badgeText: 'text-emerald-300',
  };
  let healthAdvisory = 'Air quality is satisfactory and poses little or no risk.';

  if (rounded > 300) {
    category = 'Hazardous';
    colorToken = {
      bg: 'bg-red-950/60',
      text: 'text-red-400',
      border: 'border-red-600/60',
      badgeBg: 'bg-red-950',
      badgeText: 'text-red-200',
    };
    healthAdvisory = 'Health warning of emergency conditions. Entire population is likely to be affected.';
  } else if (rounded > 200) {
    category = 'Very Unhealthy';
    colorToken = {
      bg: 'bg-purple-500/20',
      text: 'text-purple-300',
      border: 'border-purple-500/40',
      badgeBg: 'bg-purple-950',
      badgeText: 'text-purple-300',
    };
    healthAdvisory = 'Health alert: risk of health effects is increased for everyone.';
  } else if (rounded > 150) {
    category = 'Unhealthy';
    colorToken = {
      bg: 'bg-rose-500/20',
      text: 'text-rose-400',
      border: 'border-rose-500/40',
      badgeBg: 'bg-rose-950',
      badgeText: 'text-rose-300',
    };
    healthAdvisory = 'Some members of the general public may experience health effects; sensitive groups may experience more serious effects.';
  } else if (rounded > 100) {
    category = 'Unhealthy for Sensitive Groups';
    colorToken = {
      bg: 'bg-orange-500/15',
      text: 'text-orange-400',
      border: 'border-orange-500/30',
      badgeBg: 'bg-orange-950',
      badgeText: 'text-orange-300',
    };
    healthAdvisory = 'Members of sensitive groups (asthma, children, seniors) may experience health effects.';
  } else if (rounded > 50) {
    category = 'Moderate';
    colorToken = {
      bg: 'bg-yellow-500/15',
      text: 'text-yellow-400',
      border: 'border-yellow-500/30',
      badgeBg: 'bg-yellow-950',
      badgeText: 'text-yellow-300',
    };
    healthAdvisory = 'Acceptable air quality; moderate health concern for a very small number of unusually sensitive people.';
  }

  return {
    value: rounded,
    scale: 'US_EPA',
    category,
    dominantPollutant: 'PM2.5',
    colorToken,
    healthAdvisory,
  };
}

// ============================================================================
// 4. SCIENTIFIC INDOOR MASS-BALANCE MODEL
// ============================================================================

/**
 * Validated well-mixed single-compartment indoor mass-balance model:
 * dC/dt = P * lambda * C_out + S/V - (lambda + k + CADR/V) * C
 * 
 * Steady-State Solution:
 * C_ss = (P * lambda * C_out + S/V) / (lambda + k + CADR/V)
 * 
 * Dynamic Analytical Solution:
 * C(t) = C_ss + (C_0 - C_ss) * exp(- (lambda + k + CADR/V) * t)
 */
export function runMassBalanceSimulation(params: MassBalanceSimulationParams): MassBalanceSimulationResult {
  const {
    outdoorPM25,
    initialIndoorPM25,
    roomVolumeM3,
    effectiveCADRM3h,
    airExchangeRateACH,
    penetrationFactor,
    particleDepositionRate,
    indoorGenerationRateUgH,
    simulationDurationMinutes,
  } = params;

  // Strict physical bounds and resilience against NaN / Infinity
  const V = Math.max(5, Number.isFinite(roomVolumeM3) ? roomVolumeM3 : 50);
  const lambda = Math.max(0.05, Number.isFinite(airExchangeRateACH) ? airExchangeRateACH : 0.5);
  const P = Math.min(1.0, Math.max(0.0, Number.isFinite(penetrationFactor) ? penetrationFactor : 0.7));
  const k = Math.max(0.05, Number.isFinite(particleDepositionRate) ? particleDepositionRate : 0.25);
  const CADR = Math.max(0, Number.isFinite(effectiveCADRM3h) ? effectiveCADRM3h : 0);
  const cOut = Math.max(0, Number.isFinite(outdoorPM25) ? outdoorPM25 : 0);
  const c0 = Math.max(0, Number.isFinite(initialIndoorPM25) ? initialIndoorPM25 : 0);
  const sGen = Math.max(0, Number.isFinite(indoorGenerationRateUgH) ? indoorGenerationRateUgH : 0);
  const duration = Math.max(10, Number.isFinite(simulationDurationMinutes) ? simulationDurationMinutes : 180);

  // Total removal loss rate L (1/hr)
  const filtrationRateACH = CADR / V;
  const totalLossRatePerHr = lambda + k + filtrationRateACH;

  // Source terms (ug/m3/hr)
  const infiltrationTerm = P * lambda * cOut;
  const internalEmissionTerm = sGen / V;
  const totalSourceTerm = infiltrationTerm + internalEmissionTerm;

  // Steady-state concentration (ug/m3)
  const steadyStateIndoorPM25 = totalSourceTerm / Math.max(0.1, totalLossRatePerHr);
  const steadyRounded = +steadyStateIndoorPM25.toFixed(1);

  // Time to 90% completion of transition: t_90 = ln(10) / L = 2.3026 / L (hours)
  const timeTo90PercentCleanMinutes = Math.round((2.3026 / totalLossRatePerHr) * 60);

  // Infiltration reduction compared to raw outdoor concentration
  const infiltrationCutPercentage = cOut > 0
    ? Math.round(Math.max(0, ((cOut - steadyRounded) / cOut) * 100))
    : 0;

  // Dynamic time series generation
  const stepMinutes = Math.max(2, Math.round(duration / 30));
  const timeSeries: DynamicSimulationPoint[] = [];

  for (let tMin = 0; tMin <= duration; tMin += stepMinutes) {
    const tHr = tMin / 60;
    // C(t) = C_ss + (C_0 - C_ss) * exp(-L * t)
    const cAtT = steadyRounded + (c0 - steadyRounded) * Math.exp(-totalLossRatePerHr * tHr);
    const clampedC = Math.max(0, +cAtT.toFixed(1));
    const aqiVal = pm25ToUSEPAAQI(clampedC).value;

    timeSeries.push({
      timeMinutes: tMin,
      indoorPM25: clampedC,
      outdoorPM25: cOut,
      indoorAQI: aqiVal,
      phaseLabel: tMin === 0 ? 'Start' : (tMin === timeTo90PercentCleanMinutes ? '90% Steady State' : undefined),
    });
  }

  // Determine protective grade based on steady state
  let protectiveGrade: MassBalanceSimulationResult['protectiveGrade'] = 'B';
  if (steadyRounded <= 10) protectiveGrade = 'A+';
  else if (steadyRounded <= 25) protectiveGrade = 'A';
  else if (steadyRounded <= 45) protectiveGrade = 'B';
  else if (steadyRounded <= 75) protectiveGrade = 'C';
  else if (steadyRounded <= 120) protectiveGrade = 'D';
  else protectiveGrade = 'F';

  return {
    steadyStateIndoorPM25: steadyRounded,
    steadyStateIndoorAQI: pm25ToUSEPAAQI(steadyRounded).value,
    infiltrationCutPercentage,
    timeTo90PercentCleanMinutes,
    totalLossRatePerHr: +totalLossRatePerHr.toFixed(2),
    timeSeries,
    protectiveGrade,
    modelAssumptions: [
      `Assumes well-mixed single zone volume of ${V} m³ with uniform pollutant concentration.`,
      `Outdoor infiltration particle penetration factor P = ${P} (fraction penetrating window/door frame cracks).`,
      `Air exchange rate lambda = ${lambda} ACH (ambient draft leakage).`,
      `Gravitational settling and surface deposition rate k = ${k} hr⁻¹.`,
      `Purifier delivery rate CADR = ${CADR} m³/h (${Math.round(CADR * M3H_TO_CFM)} CFM) equivalent to ${filtrationRateACH.toFixed(2)} ACH.`,
    ],
  };
}

// ============================================================================
// 5. CORSI-ROSENTHAL BOX ENGINEERING CALCULATOR
// ============================================================================

export function calculateCorsiRosenthalEngineering(config: CorsiRosenthalBoxConfig) {
  const roomVolumeM3 = Math.max(5, (config.roomSquareMeters || 20) * (config.ceilingHeightMeters || 2.8));

  // If fan CFM is 0 or invalid, output 0 cleanly without asserting arbitrary baseline
  if (!config.fanCfm || config.fanCfm <= 0 || !Number.isFinite(config.fanCfm)) {
    return {
      operatingCFM: 0,
      effectiveCADR_CFM: 0,
      effectiveCADR_M3H: 0,
      deliveredACH: 0,
      targetAchMet: false,
      roomVolumeM3: Math.round(roomVolumeM3),
      totalCostUSD: 0,
      totalCostINR: 0,
      commercialHepaPriceUSD: 0,
      commercialHepaPriceINR: 0,
      savingsUSD: 0,
      savingsINR: 0,
      isModelEstimate: true,
      shroudEffect: {
        hasShroud: config.hasShroud,
        shroudMultiplier: 1.0,
        contextNote: 'Fan airflow is zero; no dynamic air movement.'
      },
      assumptions: [
        'Fan speed is 0 CFM; clean air delivery and delivered ACH are 0.',
        'Install and power an operational box fan to initiate air filtration.'
      ],
    };
  }

  // Nominal free-air fan CFM
  const freeCfm = config.fanCfm;

  // Single-pass fractional collection efficiency for submicron PM2.5:
  let singlePassEfficiency = 0.85; // MERV 13 default: ~85% on 0.3-1um, >90% on PM2.5
  let filterCostUSD = 10;
  let filterCostINR = 800;

  if (config.filterMervRating === 'MERV 14') {
    singlePassEfficiency = 0.90;
    filterCostUSD = 14;
    filterCostINR = 1150;
  } else if (config.filterMervRating === 'MERV 16') {
    singlePassEfficiency = 0.95;
    filterCostUSD = 22;
    filterCostINR = 1800;
  } else if (config.filterMervRating === 'HEPA') {
    singlePassEfficiency = 0.999;
    filterCostUSD = 35;
    filterCostINR = 2900;
  }

  // Aerodynamic pressure drop & surface area benefit:
  // 4-filter cube reduces face velocity by ~75% compared to a single filter, drastically cutting static pressure drop.
  // 5-filter tower (with elevated bottom filter) adds further area.
  const filterCountFactor = config.filterCount === 5 ? 0.58 : (config.filterCount === 4 ? 0.52 : 0.28);
  
  // Donut shroud effect: prevents air recirculation backflow through blade tips, estimated ~15-20% boost in empirical tests
  const shroudMultiplier = config.hasShroud ? 1.18 : 1.0;

  // Realized system operating CFM
  const operatingCFM = Math.round(freeCfm * filterCountFactor * shroudMultiplier);
  const effectiveCADR_CFM = Math.round(operatingCFM * singlePassEfficiency);
  const effectiveCADR_M3H = Math.round(effectiveCADR_CFM * CFM_TO_M3H);

  // Room ACH deliverable
  const deliveredACH = +(effectiveCADR_M3H / roomVolumeM3).toFixed(1);
  const targetAchMet = deliveredACH >= config.targetACH;

  // Approximate construction bill of materials
  const fanCostUSD = 22;
  const fanCostINR = 1800;
  const tapeAndCardboardUSD = 6;
  const tapeAndCardboardINR = 450;

  const totalCostUSD = fanCostUSD + (filterCostUSD * config.filterCount) + tapeAndCardboardUSD;
  const totalCostINR = fanCostINR + (filterCostINR * config.filterCount) + tapeAndCardboardINR;

  // Commercial HEPA unit of equivalent CADR price benchmark (~$0.80 - $1.10 per CFM)
  const commercialHepaPriceUSD = Math.round(effectiveCADR_CFM * 0.95);
  const commercialHepaPriceINR = Math.round(commercialHepaPriceUSD * 86);

  return {
    operatingCFM,
    effectiveCADR_CFM,
    effectiveCADR_M3H,
    deliveredACH,
    targetAchMet,
    roomVolumeM3: Math.round(roomVolumeM3),
    totalCostUSD,
    totalCostINR,
    commercialHepaPriceUSD,
    commercialHepaPriceINR,
    savingsUSD: Math.max(0, commercialHepaPriceUSD - totalCostUSD),
    savingsINR: Math.max(0, commercialHepaPriceINR - totalCostINR),
    assumptions: [
      `Single-pass collection efficiency eta = ${(singlePassEfficiency * 100).toFixed(0)}% for ${config.filterMervRating}.`,
      `Fan nominal speed = ${freeCfm} free-air CFM (${config.fanPowerWatts || 65}W motor).`,
      config.hasShroud 
        ? `Cardboard donut shroud installed (+18% flow enhancement from eliminating blade tip vortex backflow).` 
        : `No shroud (blade tip vortex recirculates ~15-20% air; installing a shroud is strongly recommended).`,
      `${config.filterCount}-filter geometry divides airflow across ${config.filterCount * 400} sq inches of filter media, lowering face velocity and motor backpressure.`,
    ],
  };
}

// ============================================================================
// 6. TIME-WEIGHTED INTEGRATED EXPOSURE & INHALED DOSE
// ============================================================================

export interface DailyActivitySlot {
  label: string;
  durationHours: number;
  locationType: 'indoor_home' | 'commute' | 'work_school' | 'outdoor';
  ambientConcentrationUgM3: number;
  activityLevel: 'sleep' | 'sedentary' | 'light_active' | 'intense';
}

export function calculateIntegratedExposure(slots: DailyActivitySlot[], isChild = false) {
  let totalExposureUgHrM3 = 0;
  let totalInhaledMassUg = 0;
  let totalHours = 0;

  for (const slot of slots) {
    const dur = Math.max(0, slot.durationHours);
    totalHours += dur;

    // Integrated exposure: integral C(t) dt (ug * hr / m3)
    totalExposureUgHrM3 += slot.ambientConcentrationUgM3 * dur;

    // Inhalation rate (m3/hr)
    let ventRate = PHYSIOLOGICAL_VENTILATION_RATES_M3H.adult_sedentary;
    if (slot.activityLevel === 'sleep') ventRate = isChild ? PHYSIOLOGICAL_VENTILATION_RATES_M3H.child_resting : PHYSIOLOGICAL_VENTILATION_RATES_M3H.adult_sleep;
    else if (slot.activityLevel === 'light_active') ventRate = isChild ? PHYSIOLOGICAL_VENTILATION_RATES_M3H.child_active : PHYSIOLOGICAL_VENTILATION_RATES_M3H.adult_light_activity;
    else if (slot.activityLevel === 'intense') ventRate = PHYSIOLOGICAL_VENTILATION_RATES_M3H.adult_intense_exercise;

    const inhaledVolumeM3 = ventRate * dur;
    totalInhaledMassUg += slot.ambientConcentrationUgM3 * inhaledVolumeM3;
  }

  const effectiveHours = Math.max(1, totalHours);
  const meanConcentrationUgM3 = +(totalExposureUgHrM3 / effectiveHours).toFixed(1);
  const totalInhaledMassRounded = Math.round(totalInhaledMassUg);

  // Alveolar deposition fraction for PM2.5 in human respiratory tract: ~55% (ICRP Human Respiratory Tract Model)
  const alveolarDepositedDoseUg = Math.round(totalInhaledMassRounded * 0.55);

  return {
    totalExposureUgHrM3: Math.round(totalExposureUgHrM3),
    meanConcentrationUgM3,
    timeWeightedAveragePM25: meanConcentrationUgM3,
    totalInhaledMassUg: totalInhaledMassRounded,
    alveolarDepositedDoseUg,
  };
}

// ============================================================================
// 7. CIGARETTE EQUIVALENCE COMMUNICATION AID
// ============================================================================

export function calculateCigaretteEquivalence(pm25UgM3: number, exposureHours = 24) {
  const normalized24hDose = (Math.max(0, pm25UgM3) * Math.max(0, exposureHours)) / 24;
  // Berkeley Earth empirical communication formula: 1 cigarette equivalent ≈ 22 ug/m3 PM2.5 over 24h
  const cigarettes = +(normalized24hDose / 22).toFixed(1);
  const limitation = 'The Berkeley Earth conversion is an educational public communication aid based on ambient particulate mass loading. It is not clinically or medically equivalent to tobacco smoking, which delivers direct concentrated chemical toxins, nicotine, volatile nitrosamines, and carcinogens.';

  return {
    cigarettesPerDay: cigarettes,
    isDisclaimerPresent: true,
    scientificLimitation: limitation,
    scientificCaveat: limitation,
    formula: 'Equivalent = (Mean PM2.5 × ExposureHours / 24) / 22 μg/m³',
  };
}

// ============================================================================
// 8. COLOR TOKEN HELPER
// ============================================================================

export function getAQIColorToken(aqi: number, scale: AirQualityScale = 'IN_NAQI') {
  if (scale === 'IN_NAQI') {
    return getIndianNAQICategory(aqi).colorToken;
  }
  return pm25ToUSEPAAQI(aqi).colorToken;
}
