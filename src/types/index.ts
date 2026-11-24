export type AirQualityScale = 'IN_NAQI' | 'US_EPA';

export type IndianNAQICategory = 
  | 'Good' 
  | 'Satisfactory' 
  | 'Moderate' 
  | 'Poor' 
  | 'Very Poor' 
  | 'Severe';

export type USEPAAQICategory = 
  | 'Good' 
  | 'Moderate' 
  | 'Unhealthy for Sensitive Groups' 
  | 'Unhealthy' 
  | 'Very Unhealthy' 
  | 'Hazardous';

export type DataSourceType = 'live_api' | 'historical_reference' | 'user_custom';

export interface PollutantMetrics {
  pm25: number;       // ug/m3 (24h or current)
  pm10: number;       // ug/m3 (24h or current)
  no2: number;        // ug/m3 or ppb
  so2: number;        // ug/m3 or ppb
  co: number;         // mg/m3 or ppm
  ozone: number;      // ug/m3 or ppb
  dust?: number;      // ug/m3
  aod?: number;       // Aerosol Optical Depth (dimensionless, 0-2)
}

export interface AQIResult {
  value: number;
  scale: AirQualityScale;
  category: string;
  dominantPollutant: 'PM2.5' | 'PM10' | 'NO2' | 'SO2' | 'CO' | 'O3';
  colorToken: {
    bg: string;
    text: string;
    border: string;
    badgeBg: string;
    badgeText: string;
  };
  healthAdvisory: string;
}

export interface WeatherMetrics {
  temperatureC: number;
  humidityPct: number;
  windSpeedKmh: number;
  windDirectionDeg: number;
  windDirectionCompass: string;
  surfacePressureHpa?: number;
  boundaryLayerHeightMeters?: number; // Planetary Boundary Layer height in meters
  visibilityKm: number;
  inversionCondition: 'Unstable / Well-Mixed' | 'Weak Surface Boundary' | 'Moderate Inversion Layer' | 'Severe Boundary Layer Trap';
  dispersionFactor: 'Good Dispersion' | 'Moderate' | 'Poor Dispersion' | 'Stagnant (Trapped Smog)';
  dataSource: string;
  isRealtime: boolean;
  observationTimeISO: string;
}

export interface LocationData {
  id: string;
  city: string;
  region: string;
  country: string;
  latitude: number;
  longitude: number;
  elevationMeters?: number;
  timezone?: string;
  sourceType: DataSourceType;
  dataSourceName: string;
  dataTimestamp: string;
  pollutants: PollutantMetrics;
  weather: WeatherMetrics;
  calculatedAQI: {
    indianNAQI: AQIResult;
    usEPAAQI: AQIResult;
  };
  smogAlertTitle: string;
  smogAlertDescription: string;
  primarySources: string[];
}

export interface HourlyForecast {
  timeISO: string;
  hourDisplay: string; // e.g. "06:00"
  hourNum: number;
  pm25: number;
  pm10: number;
  indianAQI: number;
  usAQI: number;
  temperatureC: number;
  humidityPct: number;
  windSpeedKmh: number;
  boundaryLayerHeightM: number;
  inversionRisk: 'Low' | 'Medium' | 'High' | 'Extreme';
  ventilationSuitability: {
    canVentilate: boolean;
    confidenceScore: number; // 0 - 100
    rationale: string;
  };
  activityRecommendation: string;
  commuteSafety: 'Safe' | 'Caution' | 'High Risk' | 'Hazardous Travel';
}

export type VulnerabilityType = 
  | 'infant' 
  | 'child' 
  | 'senior' 
  | 'asthma_copd' 
  | 'cardiac' 
  | 'pregnant' 
  | 'healthy_adult' 
  | 'pet';

export interface FamilyProfile {
  name: string;
  locationId: string;
  customCityName?: string;
  preferredAQIScale: AirQualityScale;
  preferredLanguage: 'en' | 'hi' | 'te';
  budgetTier: 'low_cost' | 'moderate' | 'premium';
  members: {
    id: string;
    label: string;
    type: VulnerabilityType;
    age: number;
    specialNotes: string;
  }[];
  housing: {
    type: 'high_rise_apt' | 'mid_rise_apt' | 'ground_floor_villa' | 'traditional_house';
    floorLevel: number;
    windowDraftiness: 'sealed' | 'moderate_drafts' | 'high_leaks';
    roomLengthM: number;
    roomWidthM: number;
    roomHeightM: number;
    roomVolumeM3: number;
    heatingSystem: 'heat_pump' | 'electric_radiator' | 'gas_boiler' | 'wood_stove' | 'kerosene_heater' | 'district_heating' | 'none';
    kitchenVentilation: 'ducted_range_hood' | 'recirculating_hood' | 'exhaust_fan' | 'natural_window_only';
    cookingFuel: 'induction_electric' | 'piped_natural_gas' | 'lpg_cylinder' | 'biomass_solid';
  };
  commute: {
    primaryMode: 'metro_train' | 'electric_bus' | 'diesel_bus' | 'auto_rickshaw' | 'two_wheeler' | 'private_car' | 'cycling' | 'walking';
    commuteDistanceKm: number;
    morningDepartureTime: string; // e.g. "07:30"
    eveningReturnTime: string;    // e.g. "18:00"
    flexibleWorkHours: boolean;
  };
  airPurifierCADR: number; // m3/h
}

export interface DynamicSimulationPoint {
  timeMinutes: number;
  indoorPM25: number;
  outdoorPM25: number;
  indoorAQI: number;
  phaseLabel?: string;
}

export interface MassBalanceSimulationParams {
  outdoorPM25: number;               // C_out (ug/m3)
  initialIndoorPM25: number;         // C_0 (ug/m3)
  roomVolumeM3: number;              // V (m3)
  effectiveCADRM3h: number;          // CADR (m3/hr)
  airExchangeRateACH: number;        // lambda (1/hr)
  penetrationFactor: number;         // P (dimensionless, 0-1)
  particleDepositionRate: number;    // k (1/hr)
  indoorGenerationRateUgH: number;   // S (ug/hr)
  simulationDurationMinutes: number; // Duration
}

export interface MassBalanceSimulationResult {
  steadyStateIndoorPM25: number;
  steadyStateIndoorAQI: number;
  infiltrationCutPercentage: number;
  timeTo90PercentCleanMinutes: number;
  totalLossRatePerHr: number;
  timeSeries: DynamicSimulationPoint[];
  protectiveGrade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  modelAssumptions: string[];
}

export interface RoutineItem {
  id: string;
  timeSlot: string; // e.g. "06:30 - 08:00 AM"
  phase: 'Morning Wakeup' | 'Morning Commute' | 'Midday & Work/School' | 'Evening Return' | 'Night Rest';
  title: string;
  conventionalAction: string;
  conventionalExposureUgM3: number;
  lowEmissionShift: string;
  optimizedExposureUgM3: number;
  indoorAirHack: string;
  scientificRationale: string;
  personalExposureCutPct: number;
  communityEmissionPreventedGramsPM25: number;
  co2SavedKg: number;
  completed?: boolean;
}

export interface CorsiRosenthalBoxConfig {
  fanSizeInches: 20 | 16 | 12;
  fanCfm: number;
  fanPowerWatts: number;
  hasShroud: boolean;
  filterCount: 4 | 5 | 1;
  filterDimensionsInches: string; // e.g. "20x20x2"
  filterMervRating: 'MERV 13' | 'MERV 14' | 'MERV 16' | 'HEPA';
  roomSquareMeters: number;
  ceilingHeightMeters: number;
  targetACH: number;
}

export interface CommunityReport {
  id: string;
  timestamp: string;
  type: 'open_burning' | 'idling_fleet' | 'construction_dust' | 'unfiltered_chimney' | 'clean_air_shelter' | 'diesel_generator';
  title: string;
  description: string;
  locationName: string;
  city: string;
  severity: 'moderate' | 'high' | 'severe';
  verifiedCount: number;
  actionTakenStatus: 'Reported' | 'Community Investigating' | 'Authorities Dispatched' | 'Resolved';
  isOfficialVerification: boolean;
}

export interface GenAIMessage {
  id: string;
  sender: 'user' | 'assistant' | 'system';
  timestamp: string;
  text: string;
  structuredBreakdown?: {
    currentSituation: string;
    scientificExplanation: string;
    recommendedAction: string;
    whyItHelps: string;
    expectedImpact: string;
    assumptions: string;
    confidenceLevel: 'High' | 'Moderate' | 'Low / Empirical';
    importantLimitations: string;
  };
  suggestedActions?: {
    type: 'apply_routine' | 'cadr_recalc' | 'view_hack' | 'community_alert' | 'switch_location';
    label: string;
    payload?: Record<string, unknown> | string | number;
  }[];
  impactBadge?: {
    pm25Cut: string;
    co2Saved: string;
    lungProtection: string;
  };
}
