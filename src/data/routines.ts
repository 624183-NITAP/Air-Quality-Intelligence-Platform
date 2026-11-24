import type { RoutineItem, FamilyProfile } from '../types';

export function getPersonalizedRoutines(profile: FamilyProfile, currentPM25: number): {
  routines: RoutineItem[];
  baselineDailyMeanUgM3: number;
  optimizedDailyMeanUgM3: number;
  overallExposureReductionPct: number;
  dailyAvoidedInhaledMassUg: number;
} {
  const pm = Math.max(15, currentPM25);
  const isHighRise = profile.housing.floorLevel > 4;
  const hasAsthma = profile.members.some(m => m.type === 'asthma_copd');
  const hasYoungChild = profile.members.some(m => m.type === 'infant' || m.type === 'child');
  const commuteDist = profile.commute.commuteDistanceKm || 12;
  const commuteMode = profile.commute.primaryMode;

  // 1. Morning Routine (06:00 - 07:30 AM)
  // Conventional: early open window + morning jog in morning inversion trap
  const morningConvExposure = Math.round(pm * (isHighRise ? 1.1 : 1.35));
  const morningOptExposure = Math.round(Math.min(25, pm * 0.15));
  const morningCut = Math.round(((morningConvExposure - morningOptExposure) / morningConvExposure) * 100);

  // 2. Commute & School Run (07:30 - 08:45 AM)
  // Open two-wheeler or auto-rickshaw vs N95 or AC recirculation / Metro
  let commuteConvExposure = Math.round(pm * 1.4); // direct roadway breathing zone
  let commuteOptExposure = Math.round(pm * 0.12); // N95 respirator + cabin recirculation
  let commuteCommunityPM25 = Math.round(commuteDist * 2.8); // grams avoided if public transit / pooled
  let commuteCO2 = +(commuteDist * 0.19).toFixed(1);

  if (commuteMode === 'metro_train') {
    commuteConvExposure = Math.round(pm * 0.4);
    commuteOptExposure = Math.round(pm * 0.1);
    commuteCommunityPM25 = 0;
  } else if (commuteMode === 'two_wheeler' || commuteMode === 'auto_rickshaw') {
    commuteConvExposure = Math.round(pm * 1.55); // intense tailpipe exposure
    commuteOptExposure = Math.round(pm * 0.08); // well-fitted N95
    commuteCommunityPM25 = Math.round(commuteDist * 1.6);
  }

  const commuteCut = Math.round(((commuteConvExposure - commuteOptExposure) / commuteConvExposure) * 100);

  // 3. Clean Cooking (08:30 - 09:30 AM)
  const cookingFuel = profile.housing.cookingFuel;
  const isBiomassOrKero = cookingFuel === 'biomass_solid';
  const cookingConvExposure = Math.round(isBiomassOrKero ? pm + 280 : pm + 95);
  const cookingOptExposure = Math.round(Math.min(35, pm * 0.3 + 12));
  const cookingCut = Math.round(((cookingConvExposure - cookingOptExposure) / cookingConvExposure) * 100);

  // 4. Midday Indoor Management (12:30 - 02:00 PM)
  const middayConvExposure = Math.round(pm * 0.85); // dirty indoor stagnation
  const middayOptExposure = Math.round(Math.min(25, pm * 0.25));
  const middayCut = Math.round(((middayConvExposure - middayOptExposure) / middayConvExposure) * 100);

  // 5. Evening Return & Delivery Bundling (05:30 - 07:30 PM)
  const eveningConvExposure = Math.round(pm * 1.25);
  const eveningOptExposure = Math.round(pm * 0.20);
  const eveningCut = Math.round(((eveningConvExposure - eveningOptExposure) / eveningConvExposure) * 100);

  // 6. Night Clean Bedroom Haven (08:30 - 10:30 PM & overnight)
  const heating = profile.housing.heatingSystem;
  const isSolidHeat = heating === 'wood_stove' || heating === 'kerosene_heater';
  const nightConvExposure = Math.round(isSolidHeat ? pm + 160 : pm * 0.75);
  const nightOptExposure = Math.round(Math.min(15, pm * 0.12));
  const nightCut = Math.round(((nightConvExposure - nightOptExposure) / nightConvExposure) * 100);

  const routines: RoutineItem[] = [
    {
      id: 'routine-1',
      timeSlot: '06:00 - 07:30 AM',
      phase: 'Morning Wakeup',
      title: 'Morning Awakening & Inversion Avoidance',
      conventionalAction: 'Opening windows for "fresh air" and outdoor morning walk or run during ground inversion.',
      conventionalExposureUgM3: morningConvExposure,
      lowEmissionShift: 'Shift cardio to indoor exercise/yoga. Keep windows sealed during ground cold-pool peak.',
      optimizedExposureUgM3: morningOptExposure,
      indoorAirHack: isHighRise 
        ? 'High-rise floor: street dust is lower, but wind pushes window drafts. Run purifier on medium.' 
        : 'Ground floor unit: cold ground inversion traps street exhaust directly at door level. Keep threshold seals tight.',
      scientificRationale: `Nighttime radiative surface cooling creates a stable cold pool (lapse rate inversion). Inhaling dense cold air loaded with ${pm} µg/m³ PM2.5 triggers immediate bronchoconstriction${hasAsthma ? ' (dangerous for asthma)' : ''}.`,
      personalExposureCutPct: morningCut,
      communityEmissionPreventedGramsPM25: 0,
      co2SavedKg: 0.2,
      completed: false,
    },
    {
      id: 'routine-2',
      timeSlot: `${profile.commute.morningDepartureTime || '07:30'} - 08:45 AM`,
      phase: 'Morning Commute',
      title: 'Commute & School Run Micro-Shift',
      conventionalAction: commuteMode === 'private_car'
        ? 'Single-occupancy car with external air vent open in bumper-to-bumper traffic.'
        : 'Open two-wheeler or auto-rickshaw commute without certified particulate mask.',
      conventionalExposureUgM3: commuteConvExposure,
      lowEmissionShift: profile.commute.flexibleWorkHours
        ? 'Shift departure to 09:15 AM (after solar boundary-layer lift) or switch to electric metro / pooled transit with N95.'
        : 'Car: set cabin AC to Internal Recirculation. Two-wheeler/Auto: wear certified snug N95/KF94 respirator.',
      optimizedExposureUgM3: commuteOptExposure,
      indoorAirHack: 'Cabin AC: Internal recirculation cuts submicron vehicle soot penetration by 85–90% compared to fresh air intake mode.',
      scientificRationale: 'Vehicle tailpipes emit high concentrations of ultrafine particles (<0.1 µm), NO2, and black carbon. During morning inversion, road canyons exhibit zero horizontal dispersion.',
      personalExposureCutPct: commuteCut,
      communityEmissionPreventedGramsPM25: commuteCommunityPM25,
      co2SavedKg: commuteCO2,
      completed: false,
    },
    {
      id: 'routine-3',
      timeSlot: '08:30 - 09:30 AM',
      phase: 'Morning Wakeup',
      title: 'Clean Cooking & Breakfast Preparation',
      conventionalAction: isBiomassOrKero
        ? 'Lighting solid biomass or unvented stove in living quarters.'
        : 'High-heat shallow pan frying or sputtering spices without turning on range exhaust before heating.',
      conventionalExposureUgM3: cookingConvExposure,
      lowEmissionShift: isBiomassOrKero
        ? 'Transition to electric induction cooktop or LPG with dedicated chimney ventilation.'
        : 'Switch to covered steaming/boiling; start range exhaust 2 minutes BEFORE heating oil; crack kitchen window only.',
      optimizedExposureUgM3: cookingOptExposure,
      indoorAirHack: 'Negative pressure kitchen: keep kitchen door closed to rest of home; exhaust fan creates negative pressure, pulling air into kitchen rather than letting fumes leak into bedrooms.',
      scientificRationale: 'Thermal breakdown of culinary oils above smoke points generates 120–400 µg/m³ of acrolein, formaldehyde, and ultrafine particles. In a sealed winter home, cooking can exceed outdoor smog.',
      personalExposureCutPct: cookingCut,
      communityEmissionPreventedGramsPM25: isBiomassOrKero ? 65 : 4,
      co2SavedKg: 0.6,
      completed: false,
    },
    {
      id: 'routine-4',
      timeSlot: '12:30 - 02:00 PM',
      phase: 'Midday & Work/School',
      title: 'Solar Convective Flush or Managed Airing',
      conventionalAction: 'Keeping home sealed 24/7 causing indoor CO2 to exceed 2000 ppm, or opening windows randomly during dirty periods.',
      conventionalExposureUgM3: middayConvExposure,
      lowEmissionShift: 'Execute a timed 12–15 minute cross-ventilation flush ONLY if outdoor PM2.5 has dropped below indoor level; then close and ramp purifiers to MAX for 20 mins.',
      optimizedExposureUgM3: middayOptExposure,
      indoorAirHack: 'Controlled flush: Open two opposite windows for 12 minutes to purge exhaled CO2 and radon; immediately close and let HEPA scrub incoming dust.',
      scientificRationale: 'Solar insolation expands the planetary boundary layer height to 600–1000m midday, creating convective dilution. This is the optimal window to purge indoor CO2 without catastrophic particle loading.',
      personalExposureCutPct: middayCut,
      communityEmissionPreventedGramsPM25: 0,
      co2SavedKg: 0.1,
      completed: false,
    },
    {
      id: 'routine-5',
      timeSlot: '05:30 - 07:30 PM',
      phase: 'Evening Return',
      title: 'Evening Transit & Entryway Airlock Protocol',
      conventionalAction: 'Walking into living rooms in dusty street outerwear; ordering multiple fragmented on-demand courier deliveries.',
      conventionalExposureUgM3: eveningConvExposure,
      lowEmissionShift: 'Consolidate online deliveries into 1–2 weekly drops; establish a shoe & coat removal airlock at the front door; damp-wipe pet paws.',
      optimizedExposureUgM3: eveningOptExposure,
      indoorAirHack: 'Entryway particulate barrier: Street dust contains heavy metals and silica. Taking off shoes at threshold prevents tracking 80% of toxic particles onto indoor rugs.',
      scientificRationale: 'Evening ground cooling reforms the surface thermal inversion lid, locking evening rush-hour emissions. Walking indoors with street outerwear resuspends settled dust into breathing zones.',
      personalExposureCutPct: eveningCut,
      communityEmissionPreventedGramsPM25: 28,
      co2SavedKg: 2.4,
      completed: false,
    },
    {
      id: 'routine-6',
      timeSlot: '08:30 - 10:30 PM',
      phase: 'Night Rest',
      title: 'Nighttime Heating & Clean Bedroom Haven',
      conventionalAction: isSolidHeat
        ? 'Operating unvented solid fuel / kerosene heater in closed bedrooms overnight.'
        : 'Burning synthetic incense sticks or scented candles in sealed rooms; sleeping with no air filtration.',
      conventionalExposureUgM3: nightConvExposure,
      lowEmissionShift: isSolidHeat
        ? 'Switch to electric oil-filled radiant heater with thick duvets; ban open combustion in sleeping zones.'
        : 'Eliminate incense/candles; seal bedroom door gaps with a draft snake; run HEPA purifier on whisper quiet mode 1.5m from bed.',
      optimizedExposureUgM3: nightOptExposure,
      indoorAirHack: 'A clean sleeping sanctuary maintains PM2.5 < 12 µg/m³ for 8 continuous hours, allowing alveolar macrophages to clear daytime particulate burden.',
      scientificRationale: `${hasYoungChild ? 'Infants and children' : 'Human respiratory systems'} spend 8 hours sleeping in one room. Scented candles release benzene and toluene; solid fuel heaters emit deadly carbon monoxide. A purified bedroom ensures restorative lung recovery.`,
      personalExposureCutPct: nightCut,
      communityEmissionPreventedGramsPM25: isSolidHeat ? 110 : 8,
      co2SavedKg: 4.5,
      completed: false,
    },
  ];

  // Time-weighted daily mean calculation
  // Slot durations (hours): 2.5, 2.0, 1.5, 4.0, 3.0, 11.0 = 24.0 hours total
  const durations = [2.5, 2.0, 1.5, 4.0, 3.0, 11.0];
  let totalConvDose = 0;
  let totalOptDose = 0;

  routines.forEach((r, idx) => {
    const dur = durations[idx] || 4.0;
    totalConvDose += r.conventionalExposureUgM3 * dur;
    totalOptDose += r.optimizedExposureUgM3 * dur;
  });

  const baselineDailyMeanUgM3 = Math.round(totalConvDose / 24);
  const optimizedDailyMeanUgM3 = Math.round(totalOptDose / 24);
  const overallExposureReductionPct = Math.round(((baselineDailyMeanUgM3 - optimizedDailyMeanUgM3) / baselineDailyMeanUgM3) * 100);

  // Inhaled mass reduction: daily adult breathes ~12 m3 air
  const baselineInhaledUg = Math.round(baselineDailyMeanUgM3 * 12);
  const optimizedInhaledUg = Math.round(optimizedDailyMeanUgM3 * 12);
  const dailyAvoidedInhaledMassUg = Math.max(0, baselineInhaledUg - optimizedInhaledUg);

  return {
    routines,
    baselineDailyMeanUgM3,
    optimizedDailyMeanUgM3,
    overallExposureReductionPct,
    dailyAvoidedInhaledMassUg,
  };
}
