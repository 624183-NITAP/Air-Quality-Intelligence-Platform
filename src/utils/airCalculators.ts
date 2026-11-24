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

function interpolateSubIndex(conc: number, breakpoints: CPCBBreakpoint[]): number {
  if (conc < 0) return 0;
  for (const bp of breakpoints) {
    if (conc <= bp.cHigh) {
      const idx = ((bp.iHigh - bp.iLow) / (bp.cHigh - bp.cLow)) * (conc - bp.cLow) + bp.iLow;
      return Math.round(idx);
    }
  }
  return 500;
}

export function calculateIndianNAQI(pollutants: {
  pm25: number;
  pm10?: number;
  no2?: number;
  so2?: number;
  co?: number;
}): AQIResult {
  const pm25Sub = interpolateSubIndex(pollutants.pm25, CPCB_PM25_BREAKPOINTS);
  const pm10Sub = pollutants.pm10 ? interpolateSubIndex(pollutants.pm10, CPCB_PM10_BREAKPOINTS) : 0;
  const no2Sub = pollutants.no2 ? interpolateSubIndex(pollutants.no2, CPCB_NO2_BREAKPOINTS) : 0;

  let maxAQI = pm25Sub;
  let dominant: AQIResult['dominantPollutant'] = 'PM2.5';

  if (pm10Sub > maxAQI) {
    maxAQI = pm10Sub;
    dominant = 'PM10';
  }
  if (no2Sub > maxAQI) {
    maxAQI = no2Sub;
    dominant = 'NO2';
  }

  const clamped = Math.min(500, Math.max(0, maxAQI));
  const categoryInfo = getIndianNAQICategory(clamped);

  return {
    value: clamped,
    scale: 'IN_NAQI',
    category: categoryInfo.category,
    dominantPollutant: dominant,
    colorToken: categoryInfo.colorToken,
    healthAdvisory: categoryInfo.healthAdvisory,
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
  const c = Math.max(0, pm25);
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

  const V = Math.max(5, roomVolumeM3);
  const lambda = Math.max(0.05, airExchangeRateACH);
  const P = Math.min(1.0, Math.max(0.1, penetrationFactor));
  const k = Math.max(0.05, particleDepositionRate);
  const CADR = Math.max(0, effectiveCADRM3h);

  // Total removal loss rate L (1/hr)
  const filtrationRateACH = CADR / V;
  const totalLossRatePerHr = lambda + k + filtrationRateACH;

  // Source terms (ug/m3/hr)
  const infiltrationTerm = P * lambda * outdoorPM25;
  const internalEmissionTerm = indoorGenerationRateUgH / V;
  const totalSourceTerm = infiltrationTerm + internalEmissionTerm;

  // Steady-state concentration (ug/m3)
  const steadyStateIndoorPM25 = totalSourceTerm / Math.max(0.1, totalLossRatePerHr);
  const steadyRounded = +steadyStateIndoorPM25.toFixed(1);

  // Time to 90% completion of transition: t_90 = ln(10) / L = 2.3026 / L (hours)
  const timeTo90PercentCleanMinutes = Math.round((2.3026 / totalLossRatePerHr) * 60);

  // Infiltration reduction compared to raw outdoor concentration
  const infiltrationCutPercentage = outdoorPM25 > 0
    ? Math.round(Math.max(0, ((outdoorPM25 - steadyRounded) / outdoorPM25) * 100))
    : 0;

  // Dynamic time series generation
  const stepMinutes = Math.max(2, Math.round(simulationDurationMinutes / 30));
  const timeSeries: DynamicSimulationPoint[] = [];

  for (let tMin = 0; tMin <= simulationDurationMinutes; tMin += stepMinutes) {
    const tHr = tMin / 60;
    // C(t) = C_ss + (C_0 - C_ss) * exp(-L * t)
    const cAtT = steadyRounded + (initialIndoorPM25 - steadyRounded) * Math.exp(-totalLossRatePerHr * tHr);
    const clampedC = Math.max(0, +cAtT.toFixed(1));
    const aqiVal = pm25ToUSEPAAQI(clampedC).value;

    timeSeries.push({
      timeMinutes: tMin,
      indoorPM25: clampedC,
      outdoorPM25,
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
  // Nominal free-air fan CFM (e.g. 20" box fan on medium ~1200 CFM, high ~1800 CFM)
  const freeCfm = Math.max(300, config.fanCfm);

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
  
  // Donut shroud effect: prevents air recirculation backflow through blade tips, improving net forward throughput by +18%
  const shroudMultiplier = config.hasShroud ? 1.18 : 1.0;

  // Realized system operating CFM
  const operatingCFM = Math.round(freeCfm * filterCountFactor * shroudMultiplier);
  const effectiveCADR_CFM = Math.round(operatingCFM * singlePassEfficiency);
  const effectiveCADR_M3H = Math.round(effectiveCADR_CFM * CFM_TO_M3H);

  // Room ACH deliverable
  const roomVolumeM3 = config.roomSquareMeters * config.ceilingHeightMeters;
  const deliveredACH = +(effectiveCADR_M3H / Math.max(10, roomVolumeM3)).toFixed(1);
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
    totalInhaledMassUg: totalInhaledMassRounded,
    alveolarDepositedDoseUg,
  };
}

// ============================================================================
// 7. CIGARETTE EQUIVALENCE COMMUNICATION AID
// ============================================================================

export function calculateCigaretteEquivalence(pm25UgM3: number, exposureHours = 24) {
  const normalized24hDose = (pm25UgM3 * exposureHours) / 24;
  // Berkeley Earth empirical communication formula: 1 cigarette equivalent ≈ 22 ug/m3 PM2.5 over 24h
  const cigarettes = +(normalized24hDose / 22).toFixed(1);

  return {
    cigarettesPerDay: cigarettes,
    formula: 'Equivalent = (Mean PM2.5 × ExposureHours / 24) / 22 μg/m³',
    scientificCaveat: 'The Berkeley Earth conversion is an educational public communication aid based on ambient particulate mass loading. It is NOT medically or clinically identical to tobacco smoking, which delivers direct concentrated chemical toxins, nicotine, volatile nitrosamines, and carcinogens.',
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
