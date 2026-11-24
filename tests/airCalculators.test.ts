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
  // 1. UNIT CONVERSIONS
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
  // 2. INDIAN NATIONAL AQI (CPCB 2014)
  // ==========================================================================
  describe('Indian National AQI (CPCB 2014 Standard)', () => {
    it('classifies PM2.5 = 25 µg/m³ as Good (AQI <= 50)', () => {
      const res = calculateIndianNAQI({ pm25: 25 });
      expect(res.category).toBe('Good');
      expect(res.value).toBeLessThanOrEqual(50);
      expect(res.scale).toBe('IN_NAQI');
      expect(res.dominantPollutant).toBe('PM2.5');
    });

    it('classifies PM2.5 = 55 µg/m³ as Satisfactory (AQI 51-100)', () => {
      const res = calculateIndianNAQI({ pm25: 55 });
      expect(res.category).toBe('Satisfactory');
      expect(res.value).toBeGreaterThan(50);
      expect(res.value).toBeLessThanOrEqual(100);
    });

    it('classifies PM2.5 = 85 µg/m³ as Moderate (AQI 101-200)', () => {
      const res = calculateIndianNAQI({ pm25: 85 });
      expect(res.category).toBe('Moderate');
      expect(res.value).toBeGreaterThan(100);
      expect(res.value).toBeLessThanOrEqual(200);
    });

    it('classifies PM2.5 = 110 µg/m³ as Poor (AQI 201-300)', () => {
      const res = calculateIndianNAQI({ pm25: 110 });
      expect(res.category).toBe('Poor');
      expect(res.value).toBeGreaterThan(200);
      expect(res.value).toBeLessThanOrEqual(300);
    });

    it('classifies PM2.5 = 200 µg/m³ as Very Poor (AQI 301-400)', () => {
      const res = calculateIndianNAQI({ pm25: 200 });
      expect(res.category).toBe('Very Poor');
      expect(res.value).toBeGreaterThan(300);
      expect(res.value).toBeLessThanOrEqual(400);
    });

    it('classifies PM2.5 = 380 µg/m³ as Severe (AQI 401-500)', () => {
      const res = calculateIndianNAQI({ pm25: 380 });
      expect(res.category).toBe('Severe');
      expect(res.value).toBeGreaterThan(400);
      expect(res.value).toBeLessThanOrEqual(500);
    });

    it('identifies dominant pollutant among multi-pollutant inputs', () => {
      // High NO2 relative to low PM2.5
      const res = calculateIndianNAQI({ pm25: 20, no2: 250 });
      expect(res.dominantPollutant).toBe('NO2');
      expect(res.value).toBeGreaterThan(200);
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

    it('classifies PM2.5 = 350.0 µg/m³ as Hazardous (AQI > 300)', () => {
      const res = pm25ToUSEPAAQI(350.0);
      expect(res.category).toBe('Hazardous');
      expect(res.value).toBeGreaterThan(300);
    });
  });

  // ==========================================================================
  // 4. INDOOR PM2.5 MASS-BALANCE DIFFERENTIAL EQUATION MODEL
  // ==========================================================================
  describe('Single-Zone Indoor Mass-Balance Engine', () => {
    it('solves steady-state concentration C_ss accurately', () => {
      // V = 100 m3, C_out = 200 ug/m3, lambda = 1.0 hr-1, P = 0.8, k = 0.2 hr-1, CADR = 400 m3/hr, S = 0
      // L = lambda + k + CADR/V = 1.0 + 0.2 + (400/100) = 5.2 hr-1
      // Infiltration term = P * lambda * C_out = 0.8 * 1.0 * 200 = 160 ug/m3/hr
      // C_ss = 160 / 5.2 = 30.77 ug/m3
      const sim = runMassBalanceSimulation({
        outdoorPM25: 200,
        initialIndoorPM25: 150,
        roomVolumeM3: 100,
        effectiveCADRM3h: 400,
        airExchangeRateACH: 1.0,
        penetrationFactor: 0.8,
        particleDepositionRate: 0.2,
        indoorGenerationRateUgH: 0,
        simulationDurationMinutes: 180,
      });

      expect(sim.steadyStateIndoorPM25).toBeCloseTo(30.8, 1);
      expect(sim.totalLossRatePerHr).toBeCloseTo(5.2, 1);
      expect(sim.timeTo90PercentCleanMinutes).toBe(Math.round((2.3026 / 5.2) * 60));
      expect(sim.infiltrationCutPercentage).toBe(Math.round(((200 - 30.8) / 200) * 100));
    });

    it('generates a monotonic exponential decay curve towards C_ss when C_0 > C_ss', () => {
      const sim = runMassBalanceSimulation({
        outdoorPM25: 100,
        initialIndoorPM25: 100,
        roomVolumeM3: 80,
        effectiveCADRM3h: 320,
        airExchangeRateACH: 0.5,
        penetrationFactor: 0.7,
        particleDepositionRate: 0.2,
        indoorGenerationRateUgH: 0,
        simulationDurationMinutes: 120,
      });

      const series = sim.timeSeries;
      expect(series.length).toBeGreaterThan(10);
      expect(series[0].indoorPM25).toBe(100);

      // Verify strict downward decay
      for (let i = 1; i < series.length; i++) {
        expect(series[i].indoorPM25).toBeLessThanOrEqual(series[i - 1].indoorPM25);
      }

      // Final point approaches steady-state
      const finalPoint = series[series.length - 1];
      expect(finalPoint.indoorPM25).toBeCloseTo(sim.steadyStateIndoorPM25, 0);
    });

    it('accounts for indoor particle generation sources S (e.g. frying)', () => {
      const cleanRoom = runMassBalanceSimulation({
        outdoorPM25: 100,
        initialIndoorPM25: 50,
        roomVolumeM3: 60,
        effectiveCADRM3h: 300,
        airExchangeRateACH: 0.5,
        penetrationFactor: 0.7,
        particleDepositionRate: 0.2,
        indoorGenerationRateUgH: 0,
        simulationDurationMinutes: 60,
      });

      const cookingRoom = runMassBalanceSimulation({
        outdoorPM25: 100,
        initialIndoorPM25: 50,
        roomVolumeM3: 60,
        effectiveCADRM3h: 300,
        airExchangeRateACH: 0.5,
        penetrationFactor: 0.7,
        particleDepositionRate: 0.2,
        indoorGenerationRateUgH: 6000, // 6000 ug/hr frying
        simulationDurationMinutes: 60,
      });

      // Internal emission increases steady-state PM2.5
      expect(cookingRoom.steadyStateIndoorPM25).toBeGreaterThan(cleanRoom.steadyStateIndoorPM25);
    });

    it('handles zero outdoor PM2.5 edge case gracefully without NaN or negative values', () => {
      const sim = runMassBalanceSimulation({
        outdoorPM25: 0,
        initialIndoorPM25: 40,
        roomVolumeM3: 50,
        effectiveCADRM3h: 200,
        airExchangeRateACH: 0.5,
        penetrationFactor: 0.7,
        particleDepositionRate: 0.2,
        indoorGenerationRateUgH: 0,
        simulationDurationMinutes: 90,
      });

      expect(sim.steadyStateIndoorPM25).toBe(0);
      expect(sim.timeSeries[sim.timeSeries.length - 1].indoorPM25).toBeLessThan(1);
    });
  });

  // ==========================================================================
  // 5. CORSI-ROSENTHAL BOX ENGINEERING CALCULATOR
  // ==========================================================================
  describe('Corsi-Rosenthal Box Aerodynamics & Engineering', () => {
    it('calculates CADR and verifies the +18% cardboard donut shroud boost', () => {
      const withoutShroud = calculateCorsiRosenthalEngineering({
        fanSizeInches: 20,
        fanCfm: 1200,
        fanPowerWatts: 65,
        hasShroud: false,
        filterCount: 4,
        filterDimensionsInches: '20x20x2',
        filterMervRating: 'MERV 13',
        roomSquareMeters: 25,
        ceilingHeightMeters: 2.8,
        targetACH: 5,
      });

      const withShroud = calculateCorsiRosenthalEngineering({
        fanSizeInches: 20,
        fanCfm: 1200,
        fanPowerWatts: 65,
        hasShroud: true,
        filterCount: 4,
        filterDimensionsInches: '20x20x2',
        filterMervRating: 'MERV 13',
        roomSquareMeters: 25,
        ceilingHeightMeters: 2.8,
        targetACH: 5,
      });

      expect(withShroud.effectiveCADR_CFM).toBeGreaterThan(withoutShroud.effectiveCADR_CFM);
      const ratio = withShroud.effectiveCADR_CFM / withoutShroud.effectiveCADR_CFM;
      expect(ratio).toBeCloseTo(1.18, 1);
    });

    it('computes delivered ACH based on room volume', () => {
      const cr = calculateCorsiRosenthalEngineering({
        fanSizeInches: 20,
        fanCfm: 1200,
        fanPowerWatts: 65,
        hasShroud: true,
        filterCount: 4,
        filterDimensionsInches: '20x20x2',
        filterMervRating: 'MERV 13',
        roomSquareMeters: 30,
        ceilingHeightMeters: 2.8,
        targetACH: 5,
      });

      const roomVol = 30 * 2.8;
      expect(cr.roomVolumeM3).toBe(Math.round(roomVol));
      expect(cr.deliveredACH).toBeCloseTo(cr.effectiveCADR_M3H / roomVol, 1);
    });

    it('calculates construction costs in both INR and USD with positive savings', () => {
      const cr = calculateCorsiRosenthalEngineering({
        fanSizeInches: 20,
        fanCfm: 1200,
        fanPowerWatts: 65,
        hasShroud: true,
        filterCount: 4,
        filterDimensionsInches: '20x20x2',
        filterMervRating: 'MERV 13',
        roomSquareMeters: 20,
        ceilingHeightMeters: 2.8,
        targetACH: 5,
      });

      expect(cr.totalCostUSD).toBeGreaterThan(40);
      expect(cr.totalCostUSD).toBeLessThan(100);
      expect(cr.totalCostINR).toBeGreaterThan(3000);
      expect(cr.totalCostINR).toBeLessThan(8000);
      expect(cr.savingsUSD).toBeGreaterThan(0);
      expect(cr.savingsINR).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // 6. TIME-WEIGHTED INTEGRATED EXPOSURE & INHALED ALVEOLAR DOSE
  // ==========================================================================
  describe('Time-Weighted Integrated Exposure & Inhaled Dose', () => {
    it('integrates exposure concentration over 24 hours: integral C(t) dt', () => {
      const slots: DailyActivitySlot[] = [
        { label: 'Sleep in Clean Haven', durationHours: 8, locationType: 'indoor_home', ambientConcentrationUgM3: 15, activityLevel: 'sleep' },
        { label: 'Morning Commute', durationHours: 1, locationType: 'commute', ambientConcentrationUgM3: 180, activityLevel: 'light_active' },
        { label: 'Workplace Indoors', durationHours: 8, locationType: 'work_school', ambientConcentrationUgM3: 40, activityLevel: 'sedentary' },
        { label: 'Evening Return', durationHours: 1, locationType: 'commute', ambientConcentrationUgM3: 160, activityLevel: 'light_active' },
        { label: 'Evening Home Living', durationHours: 6, locationType: 'indoor_home', ambientConcentrationUgM3: 25, activityLevel: 'sedentary' },
      ];

      const res = calculateIntegratedExposure(slots, false);
      // Total exposure: (8*15) + (1*180) + (8*40) + (1*160) + (6*25) = 120 + 180 + 320 + 160 + 150 = 930 ug*hr/m3
      expect(res.totalExposureUgHrM3).toBe(930);
      expect(res.meanConcentrationUgM3).toBeCloseTo(930 / 24, 1);
      expect(res.totalInhaledMassUg).toBeGreaterThan(0);
      // Alveolar dose is approximately 55% of inhaled mass
      expect(res.alveolarDepositedDoseUg).toBe(Math.round(res.totalInhaledMassUg * 0.55));
    });
  });

  // ==========================================================================
  // 7. CIGARETTE EQUIVALENCE COMMUNICATION AID
  // ==========================================================================
  describe('Cigarette Equivalence Communication Aid', () => {
    it('applies the Berkeley Earth formula (22 ug/m3 * 24h = 1 cig) with medical disclaimer', () => {
      const res = calculateCigaretteEquivalence(110, 24);
      // 110 / 22 = 5.0
      expect(res.cigarettesPerDay).toBe(5.0);
      expect(res.scientificCaveat).toContain('NOT medically or clinically identical to tobacco smoking');
    });

    it('scales linearly with exposure duration', () => {
      const res12h = calculateCigaretteEquivalence(110, 12);
      expect(res12h.cigarettesPerDay).toBe(2.5);
    });
  });

});
