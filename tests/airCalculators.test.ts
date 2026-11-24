import { describe, it, expect } from 'vitest';
import {
  calculateIndianNAQI,
  pm25ToUSEPAAQI,
  runMassBalanceSimulation,
  calculateCorsiRosenthalEngineering,
  calculateIntegratedExposure,
  calculateCigaretteEquivalence,
  CFM_TO_M3H,
  M3H_TO_CFM,
  type DailyActivitySlot
} from '../src/utils/airCalculators';

describe('AeroPulse 2.0 Scientific Calculators Test Suite', () => {

  // ==========================================================================
  // 1. UNIT CONVERSIONS & PHYSICAL CONSTANTS
  // ==========================================================================
  describe('Unit Conversions & Physical Constants', () => {
    it('accurately converts CFM to m³/h and vice versa', () => {
      const cfm = 100;
      const m3h = cfm * CFM_TO_M3H;
      expect(m3h).toBeCloseTo(169.90, 1);
      expect(m3h * M3H_TO_CFM).toBeCloseTo(cfm, 1);
    });
  });

  // ==========================================================================
  // 2. INDIAN NATIONAL AQI (CPCB 2014 FRAMEWORK - ALL 8 POLLUTANTS)
  // ==========================================================================
  describe('Indian National AQI (CPCB 2014 Framework)', () => {
    // PM2.5 Breakpoints (0-30, 31-60, 61-90, 91-120, 121-250, 251-500)
    it('accurately evaluates PM2.5 breakpoints and categories', () => {
      expect(calculateIndianNAQI({ pm25: 15 }).category).toBe('Good');
      expect(calculateIndianNAQI({ pm25: 30 }).value).toBe(50);
      expect(calculateIndianNAQI({ pm25: 31 }).value).toBe(51);
      expect(calculateIndianNAQI({ pm25: 60 }).value).toBe(100);
      expect(calculateIndianNAQI({ pm25: 61 }).value).toBe(101);
      expect(calculateIndianNAQI({ pm25: 90 }).value).toBe(200);
      expect(calculateIndianNAQI({ pm25: 91 }).value).toBe(201);
      expect(calculateIndianNAQI({ pm25: 120 }).value).toBe(300);
      expect(calculateIndianNAQI({ pm25: 121 }).value).toBe(301);
      expect(calculateIndianNAQI({ pm25: 250 }).value).toBe(400);
      expect(calculateIndianNAQI({ pm25: 251 }).value).toBe(401);
      expect(calculateIndianNAQI({ pm25: 500 }).value).toBe(500);
    });

    // PM10 Breakpoints (0-50, 51-100, 101-250, 251-350, 351-430, 431-600)
    it('accurately evaluates PM10 sub-index', () => {
      const res = calculateIndianNAQI({ pm10: 275 });
      expect(res.subIndices?.pm10).toBeGreaterThan(200);
      expect(res.subIndices?.pm10).toBeLessThanOrEqual(300);
      expect(res.dominantPollutant).toBe('PM10');
    });

    // NO2 Breakpoints (0-40, 41-80, 81-180, 181-280, 281-400, 401-600)
    it('accurately evaluates NO2 sub-index', () => {
      const res = calculateIndianNAQI({ no2: 120 });
      expect(res.subIndices?.no2).toBeGreaterThan(100);
      expect(res.subIndices?.no2).toBeLessThanOrEqual(200);
      expect(res.dominantPollutant).toBe('NO2');
    });

    // SO2 Breakpoints (0-40, 41-80, 81-380, 381-800, 801-1600, 1601-2000)
    it('accurately evaluates SO2 sub-index', () => {
      const res = calculateIndianNAQI({ so2: 600 });
      expect(res.subIndices?.so2).toBeGreaterThan(200);
      expect(res.subIndices?.so2).toBeLessThanOrEqual(300);
      expect(res.dominantPollutant).toBe('SO2');
    });

    // CO Breakpoints (0-1.0, 1.1-2.0, 2.1-10.0, 10.1-17.0, 17.1-34.0, 34.1-50.0 mg/m3)
    it('accurately evaluates CO sub-index in mg/m3', () => {
      const res = calculateIndianNAQI({ co: 12.0 });
      expect(res.subIndices?.co).toBeGreaterThan(200);
      expect(res.subIndices?.co).toBeLessThanOrEqual(300);
      expect(res.dominantPollutant).toBe('CO');
    });

    // O3 Breakpoints (0-50, 51-100, 101-168, 169-208, 209-748, 749-1000)
    it('accurately evaluates Ozone (O3) sub-index', () => {
      const res = calculateIndianNAQI({ ozone: 150 });
      expect(res.subIndices?.ozone).toBeGreaterThan(100);
      expect(res.subIndices?.ozone).toBeLessThanOrEqual(200);
      expect(res.dominantPollutant).toBe('O3');
    });

    // NH3 Breakpoints (0-200, 201-400, 401-800, 801-1200, 1201-1800, 1801-2400)
    it('accurately evaluates Ammonia (NH3) sub-index', () => {
      const res = calculateIndianNAQI({ nh3: 600 });
      expect(res.subIndices?.nh3).toBeGreaterThan(100);
      expect(res.subIndices?.nh3).toBeLessThanOrEqual(200);
      expect(res.dominantPollutant).toBe('NH3');
    });

    // Pb Breakpoints (0-0.5, 0.6-1.0, 1.1-2.0, 2.1-3.0, 3.1-3.5, 3.6-5.0)
    it('accurately evaluates Lead (Pb) sub-index', () => {
      const res = calculateIndianNAQI({ pb: 2.5 });
      expect(res.subIndices?.pb).toBeGreaterThan(200);
      expect(res.subIndices?.pb).toBeLessThanOrEqual(300);
      expect(res.dominantPollutant).toBe('Pb');
    });

    // CPCB Data Sufficiency Check:
    it('evaluates CPCB data sufficiency requiring >= 3 pollutants including PM', () => {
      // 1 pollutant only
      const res1 = calculateIndianNAQI({ pm25: 45 });
      expect(res1.monitoredPollutantsCount).toBe(1);
      expect(res1.isDataSufficient).toBe(false);

      // 3 pollutants with PM
      const res2 = calculateIndianNAQI({ pm25: 45, pm10: 80, no2: 30 });
      expect(res2.monitoredPollutantsCount).toBe(3);
      expect(res2.isDataSufficient).toBe(true);

      // 3 pollutants WITHOUT PM (NO2, SO2, CO)
      const res3 = calculateIndianNAQI({ no2: 50, so2: 30, co: 1.5 });
      expect(res3.monitoredPollutantsCount).toBe(3);
      expect(res3.isDataSufficient).toBe(false); // Fails particulate requirement
    });

    it('safely handles missing, null, undefined, negative and NaN values', () => {
      // @ts-expect-error testing null
      const resNull = calculateIndianNAQI({ pm25: null });
      expect(resNull.value).toBe(0);
      expect(resNull.isDataSufficient).toBe(false);

      const resNaN = calculateIndianNAQI({ pm25: NaN, pm10: -5 });
      expect(resNaN.value).toBe(0);
      expect(resNaN.monitoredPollutantsCount).toBe(0);
    });

    it('identifies dominant pollutant by highest sub-index', () => {
      // Moderate PM2.5 (AQI ~120) but Severe NO2 (AQI ~450)
      const res = calculateIndianNAQI({ pm25: 65, no2: 450 });
      expect(res.dominantPollutant).toBe('NO2');
      expect(res.value).toBeGreaterThan(400);
    });
  });

  // ==========================================================================
  // 3. US EPA AQI (REVISED 2024 STANDARD)
  // ==========================================================================
  describe('US EPA AQI (Revised 2024 Standard)', () => {
    it('classifies PM2.5 = 8.5 µg/m³ as Good (revised 9.0 µg/m³ threshold)', () => {
      const res = pm25ToUSEPAAQI(8.5);
      expect(res.category).toBe('Good');
      expect(res.value).toBeLessThanOrEqual(50);
      expect(res.scale).toBe('US_EPA');
    });

    it('classifies PM2.5 = 25.0 µg/m³ as Moderate (AQI 51-100)', () => {
      const res = pm25ToUSEPAAQI(25.0);
      expect(res.category).toBe('Moderate');
      expect(res.value).toBeGreaterThan(50);
      expect(res.value).toBeLessThanOrEqual(100);
    });

    it('classifies PM2.5 = 45.0 µg/m³ as Unhealthy for Sensitive Groups (AQI 101-150)', () => {
      const res = pm25ToUSEPAAQI(45.0);
      expect(res.category).toBe('Unhealthy for Sensitive Groups');
      expect(res.value).toBeGreaterThan(100);
      expect(res.value).toBeLessThanOrEqual(150);
    });

    it('classifies PM2.5 = 85.0 µg/m³ as Unhealthy (AQI 151-200)', () => {
      const res = pm25ToUSEPAAQI(85.0);
      expect(res.category).toBe('Unhealthy');
      expect(res.value).toBeGreaterThan(150);
      expect(res.value).toBeLessThanOrEqual(200);
    });

    it('classifies PM2.5 = 180.0 µg/m³ as Very Unhealthy (AQI 201-300)', () => {
      const res = pm25ToUSEPAAQI(180.0);
      expect(res.category).toBe('Very Unhealthy');
      expect(res.value).toBeGreaterThan(200);
      expect(res.value).toBeLessThanOrEqual(300);
    });

    it('classifies PM2.5 = 280.0 µg/m³ as Hazardous (AQI 301-500)', () => {
      const res = pm25ToUSEPAAQI(280.0);
      expect(res.category).toBe('Hazardous');
      expect(res.value).toBeGreaterThan(300);
      expect(res.value).toBeLessThanOrEqual(500);
    });

    it('handles negative or NaN concentrations safely', () => {
      expect(pm25ToUSEPAAQI(-10).value).toBe(0);
      expect(pm25ToUSEPAAQI(NaN).value).toBe(0);
    });
  });

  // ==========================================================================
  // 4. SCIENTIFIC INDOOR MASS-BALANCE MODEL
  // ==========================================================================
  describe('Indoor PM2.5 Single-Zone Mass-Balance Model', () => {
    it('calculates steady-state concentration matching analytical solution', () => {
      const result = runMassBalanceSimulation({
        outdoorPM25: 200,
        initialIndoorPM25: 150,
        roomVolumeM3: 60,
        effectiveCADRM3h: 300,
        airExchangeRateACH: 0.5,
        penetrationFactor: 0.7,
        particleDepositionRate: 0.2,
        indoorGenerationRateUgH: 0,
        simulationDurationMinutes: 180,
      });

      // L = 0.5 + 0.2 + (300 / 60) = 5.7 /hr
      // Source = 0.7 * 0.5 * 200 = 70 ug/m3/hr
      // Css = 70 / 5.7 ≈ 12.28 ug/m3
      expect(result.steadyStateIndoorPM25).toBeCloseTo(12.3, 1);
      expect(result.infiltrationCutPercentage).toBeGreaterThanOrEqual(90);
      expect(result.protectiveGrade).toBe('A');
    });

    it('handles zero CADR without division by zero', () => {
      const result = runMassBalanceSimulation({
        outdoorPM25: 100,
        initialIndoorPM25: 80,
        roomVolumeM3: 50,
        effectiveCADRM3h: 0,
        airExchangeRateACH: 1.0,
        penetrationFactor: 0.8,
        particleDepositionRate: 0.2,
        indoorGenerationRateUgH: 0,
        simulationDurationMinutes: 120,
      });

      // L = 1.0 + 0.2 + 0 = 1.2 /hr
      // Source = 0.8 * 1.0 * 100 = 80 ug/m3/hr
      // Css = 80 / 1.2 ≈ 66.7 ug/m3
      expect(result.steadyStateIndoorPM25).toBeCloseTo(66.7, 1);
      expect(result.protectiveGrade).toBe('C');
    });

    it('accurately incorporates indoor source generation rate (cooking/frying)', () => {
      const withCooking = runMassBalanceSimulation({
        outdoorPM25: 100,
        initialIndoorPM25: 50,
        roomVolumeM3: 50,
        effectiveCADRM3h: 200,
        airExchangeRateACH: 0.5,
        penetrationFactor: 0.7,
        particleDepositionRate: 0.2,
        indoorGenerationRateUgH: 1500, // Cooking adds 1500 ug/hr
        simulationDurationMinutes: 120,
      });

      const withoutCooking = runMassBalanceSimulation({
        outdoorPM25: 100,
        initialIndoorPM25: 50,
        roomVolumeM3: 50,
        effectiveCADRM3h: 200,
        airExchangeRateACH: 0.5,
        penetrationFactor: 0.7,
        particleDepositionRate: 0.2,
        indoorGenerationRateUgH: 0,
        simulationDurationMinutes: 120,
      });

      expect(withCooking.steadyStateIndoorPM25).toBeGreaterThan(withoutCooking.steadyStateIndoorPM25);
    });

    it('safely handles non-finite or degenerate room volumes and negative rates', () => {
      const result = runMassBalanceSimulation({
        outdoorPM25: -50,
        initialIndoorPM25: NaN,
        roomVolumeM3: 0,
        effectiveCADRM3h: -100,
        airExchangeRateACH: 0,
        penetrationFactor: -0.5,
        particleDepositionRate: 0,
        indoorGenerationRateUgH: -50,
        simulationDurationMinutes: 0,
      });

      expect(Number.isFinite(result.steadyStateIndoorPM25)).toBe(true);
      expect(result.steadyStateIndoorPM25).toBe(0);
      expect(result.timeSeries.length).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // 5. CORSI-ROSENTHAL BOX AERODYNAMICS & ENGINEERING
  // ==========================================================================
  describe('Corsi-Rosenthal Box Aerodynamics & Engineering', () => {
    it('applies the shroud effect appropriately with transparent contextualization', () => {
      const withShroud = calculateCorsiRosenthalEngineering({
        fanSizeInches: 20,
        fanCfm: 1200,
        fanPowerWatts: 45,
        hasShroud: true,
        filterCount: 4,
        filterDimensionsInches: '20x20x2',
        filterMervRating: 'MERV 13',
        roomSquareMeters: 25,
        ceilingHeightMeters: 2.8,
        targetACH: 5,
      });

      const withoutShroud = calculateCorsiRosenthalEngineering({
        fanSizeInches: 20,
        fanCfm: 1200,
        fanPowerWatts: 45,
        hasShroud: false,
        filterCount: 4,
        filterDimensionsInches: '20x20x2',
        filterMervRating: 'MERV 13',
        roomSquareMeters: 25,
        ceilingHeightMeters: 2.8,
        targetACH: 5,
      });

      expect(withShroud.effectiveCADR_CFM).toBeGreaterThan(withoutShroud.effectiveCADR_CFM);
      expect(withShroud.effectiveCADR_CFM / withoutShroud.effectiveCADR_CFM).toBeCloseTo(1.18, 2);
    });

    it('safely handles 0 CFM fan without producing arbitrary non-zero CADR', () => {
      const zeroFan = calculateCorsiRosenthalEngineering({
        fanSizeInches: 20,
        fanCfm: 0,
        fanPowerWatts: 0,
        hasShroud: true,
        filterCount: 4,
        filterDimensionsInches: '20x20x2',
        filterMervRating: 'MERV 13',
        roomSquareMeters: 20,
        ceilingHeightMeters: 2.5,
        targetACH: 4,
      });

      expect(zeroFan.operatingCFM).toBe(0);
      expect(zeroFan.effectiveCADR_CFM).toBe(0);
      expect(zeroFan.deliveredACH).toBe(0);
      expect(zeroFan.targetAchMet).toBe(false);
    });

    it('calculates bill of materials and savings in dual currencies (USD and INR)', () => {
      const res = calculateCorsiRosenthalEngineering({
        fanSizeInches: 20,
        fanCfm: 1000,
        fanPowerWatts: 40,
        hasShroud: true,
        filterCount: 4,
        filterDimensionsInches: '20x20x2',
        filterMervRating: 'MERV 13',
        roomSquareMeters: 20,
        ceilingHeightMeters: 3,
        targetACH: 4,
      });

      expect(res.totalCostUSD).toBeGreaterThan(0);
      expect(res.totalCostINR).toBeGreaterThan(0);
      expect(res.savingsINR).toBeGreaterThan(res.totalCostINR);
    });
  });

  // ==========================================================================
  // 6. TIME-WEIGHTED EXPOSURE & INHALATION DOSIMETRY
  // ==========================================================================
  describe('Time-Weighted Integrated Exposure & Dose Integrals', () => {
    it('accurately integrates inhaled particulate mass across multiple activity slots', () => {
      const slots: DailyActivitySlot[] = [
        { label: 'Sleep', durationHours: 8, locationType: 'bedroom', ambientConcentrationUgM3: 20, activityLevel: 'sleep' },
        { label: 'Commute', durationHours: 1, locationType: 'commute', ambientConcentrationUgM3: 200, activityLevel: 'light_active' },
        { label: 'Office', durationHours: 8, locationType: 'office', ambientConcentrationUgM3: 40, activityLevel: 'sedentary' },
      ];

      const exposure = calculateIntegratedExposure(slots);

      // Sleep: 8h * 20 ug/m3 = 160 ug*h/m3
      // Commute: 1h * 200 ug/m3 = 200 ug*h/m3
      // Office: 8h * 40 ug/m3 = 320 ug*h/m3
      // Total = 680 ug*h/m3 / 17h = 40 ug/m3 TWA
      expect(exposure.timeWeightedAveragePM25).toBeCloseTo(40, 0);
      expect(exposure.totalInhaledMassUg).toBeGreaterThan(0);
      expect(exposure.alveolarDepositedDoseUg).toBeCloseTo(exposure.totalInhaledMassUg * 0.55, 0);
    });
  });

  // ==========================================================================
  // 7. CIGARETTE EQUIVALENCE COMMUNICATION AID
  // ==========================================================================
  describe('Cigarette Equivalence Public Health Communication Aid', () => {
    it('applies Berkeley Earth formulation with explicit scientific disclaimer', () => {
      // 22 ug/m3 24h average = 1 cigarette
      const oneCig = calculateCigaretteEquivalence(22, 24);
      expect(oneCig.cigarettesPerDay).toBe(1);
      expect(oneCig.isDisclaimerPresent).toBe(true);
      expect(oneCig.scientificLimitation).toContain('not clinically or medically equivalent');

      // Severe smog: 220 ug/m3 = 10 cigarettes
      const tenCigs = calculateCigaretteEquivalence(220, 24);
      expect(tenCigs.cigarettesPerDay).toBe(10);
    });
  });
});
