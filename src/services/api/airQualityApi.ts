import type { LocationData, HourlyForecast } from '../../types';
import { calculateIndianNAQI, pm25ToUSEPAAQI } from '../../utils/airCalculators';
import { INDIAN_AND_GLOBAL_LOCATIONS } from '../../data/locations';

export interface GeocodingResult {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country: string;
  admin1?: string;
  country_code: string;
}

const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes cache
const inFlightRequests = new Map<string, Promise<{ locationData: LocationData; hourlyForecast: HourlyForecast[] }>>();

export async function searchLocations(query: string): Promise<GeocodingResult[]> {
  if (!query || query.trim().length < 2) return [];

  // First check built-in predefined Indian & global list for instant offline matching
  const qLower = query.toLowerCase().trim();
  const localMatches = INDIAN_AND_GLOBAL_LOCATIONS.filter(l => 
    l.city.toLowerCase().includes(qLower) || 
    l.region.toLowerCase().includes(qLower) ||
    l.country.toLowerCase().includes(qLower)
  ).map((l, i) => ({
    id: i + 10000,
    name: l.city,
    latitude: l.latitude,
    longitude: l.longitude,
    country: l.country,
    admin1: l.region,
    country_code: l.country === 'India' ? 'IN' : 'US',
  }));

  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=8&language=en&format=json`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (data.results && Array.isArray(data.results)) {
        // Merge without duplicates
        const combined = [...localMatches];
        for (const item of data.results) {
          if (!combined.some(c => Math.abs(c.latitude - item.latitude) < 0.1 && Math.abs(c.longitude - item.longitude) < 0.1)) {
            combined.push(item);
          }
        }
        return combined.slice(0, 10);
      }
    }
  } catch (err) {
    console.warn('Geocoding API network lookup failed, using local database:', err);
  }

  return localMatches;
}

export async function fetchLiveAirQualityAndWeather(
  latitude: number,
  longitude: number,
  cityName: string,
  regionName: string,
  countryName: string,
  fallbackBase?: LocationData
): Promise<{ locationData: LocationData; hourlyForecast: HourlyForecast[] }> {
  const cacheKey = `aeropulse_aq_${latitude.toFixed(3)}_${longitude.toFixed(3)}`;
  
  // 1. Check in-flight promise deduplication
  const inFlight = inFlightRequests.get(cacheKey);
  if (inFlight) {
    return inFlight;
  }

  // 2. Check sessionStorage cache
  try {
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Date.now() - parsed.timestamp < CACHE_TTL_MS && parsed.data) {
        return parsed.data;
      }
    }
  } catch {}

  const fetchPromise = (async () => {
    try {
    const aqUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${latitude}&longitude=${longitude}&current=pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,us_aqi,aerosol_optical_depth,dust&hourly=pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,us_aqi&timezone=auto`;
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,surface_pressure,wind_speed_10m,wind_direction_10m&hourly=boundary_layer_height,temperature_2m,relative_humidity_2m,wind_speed_10m&timezone=auto`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6500);

    const [aqRes, weatherRes] = await Promise.all([
      fetch(aqUrl, { signal: controller.signal }),
      fetch(weatherUrl, { signal: controller.signal }),
    ]);
    clearTimeout(timeout);

    if (!aqRes.ok || !weatherRes.ok) {
      throw new Error(`Open-Meteo HTTP error: AQ ${aqRes.status}, Weather ${weatherRes.status}`);
    }

    const aqData = await aqRes.json();
    const weatherData = await weatherRes.json();

    const currAQ = aqData.current || {};
    const currWeather = weatherData.current || {};

    const pm25Val = +(currAQ.pm2_5 ?? 35).toFixed(1);
    const pm10Val = +(currAQ.pm10 ?? 60).toFixed(1);
    const no2Val = +(currAQ.nitrogen_dioxide ?? 25).toFixed(1);
    const so2Val = +(currAQ.sulphur_dioxide ?? 12).toFixed(1);
    const coVal = +((currAQ.carbon_monoxide ? currAQ.carbon_monoxide / 1000 : 1.2)).toFixed(2); // convert ug/m3 to mg/m3
    const ozoneVal = +(currAQ.ozone ?? 45).toFixed(1);

    // Weather
    const tempC = +(currWeather.temperature_2m ?? 20).toFixed(1);
    const humidityPct = Math.round(currWeather.relative_humidity_2m ?? 50);
    const windSpeedKmh = +(currWeather.wind_speed_10m ?? 8).toFixed(1);
    const windDirDeg = Math.round(currWeather.wind_direction_10m ?? 0);
    const surfacePressureHpa = Math.round(currWeather.surface_pressure ?? 1013);

    // Boundary Layer Height from weather hourly current hour
    const hourlyBLH = weatherData.hourly?.boundary_layer_height || [];
    const currentBLH = hourlyBLH.length > 0 ? Math.round(hourlyBLH[0]) : 350;

    // Atmospheric Inversion classification based on physical planetary boundary layer height & wind
    let inversionCondition: LocationData['weather']['inversionCondition'] = 'Unstable / Well-Mixed';
    let dispersionFactor: LocationData['weather']['dispersionFactor'] = 'Good Dispersion';

    if (currentBLH < 180 && windSpeedKmh < 6) {
      inversionCondition = 'Severe Boundary Layer Trap';
      dispersionFactor = 'Stagnant (Trapped Smog)';
    } else if (currentBLH < 350) {
      inversionCondition = 'Moderate Inversion Layer';
      dispersionFactor = 'Poor Dispersion';
    } else if (currentBLH < 650) {
      inversionCondition = 'Weak Surface Boundary';
      dispersionFactor = 'Moderate';
    }

    // Compass direction
    const compassDirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const compassIndex = Math.round(windDirDeg / 22.5) % 16;
    const windCompass = compassDirs[compassIndex];

    // Compute standard Indian NAQI & US EPA AQI
    const indianNAQI = calculateIndianNAQI({
      pm25: pm25Val,
      pm10: pm10Val,
      no2: no2Val,
      so2: so2Val,
      co: coVal,
    });
    const usEPAAQI = pm25ToUSEPAAQI(pm25Val);

    const locationData: LocationData = {
      id: `loc-${latitude.toFixed(2)}-${longitude.toFixed(2)}`,
      city: cityName,
      region: regionName,
      country: countryName,
      latitude,
      longitude,
      sourceType: 'live_api',
      dataSourceName: 'Open-Meteo Atmospheric & Copernicus CAMS Models',
      dataTimestamp: new Date().toISOString(),
      pollutants: {
        pm25: pm25Val,
        pm10: pm10Val,
        no2: no2Val,
        so2: so2Val,
        co: coVal,
        ozone: ozoneVal,
        dust: currAQ.dust,
        aod: currAQ.aerosol_optical_depth,
      },
      weather: {
        temperatureC: tempC,
        humidityPct,
        windSpeedKmh,
        windDirectionDeg: windDirDeg,
        windDirectionCompass: windCompass,
        surfacePressureHpa,
        boundaryLayerHeightMeters: currentBLH,
        visibilityKm: calculateVisibilityFromPM(pm25Val, humidityPct),
        inversionCondition,
        dispersionFactor,
        dataSource: 'Open-Meteo High-Resolution Forecast',
        isRealtime: true,
        observationTimeISO: currAQ.time || new Date().toISOString(),
      },
      calculatedAQI: {
        indianNAQI,
        usEPAAQI,
      },
      smogAlertTitle: inversionCondition.includes('Severe')
        ? 'Active Boundary-Layer Inversion Trap'
        : (pm25Val > 120 ? 'High Particulate Stagnation Alert' : 'Normal Atmospheric Dispersion'),
      smogAlertDescription: `Atmospheric boundary layer height is ${currentBLH}m with ${windSpeedKmh} km/h wind (${inversionCondition}). ${
        pm25Val > 120 
          ? 'Ground-level emissions are tightly confined; particulate accumulation is high.' 
          : 'Atmospheric mixing is sufficient to dilute local emissions.'
      }`,
      primarySources: fallbackBase?.primarySources || [
        'Vehicular traffic & cold engine starts',
        'Road silt & mechanical suspension',
        'Domestic heating & cooking plumes',
        'Industrial point sources',
      ],
    };

    // Build hourly forecast from real API arrays
    const hourlyTimes = aqData.hourly?.time || [];
    const hourlyPM25 = aqData.hourly?.pm2_5 || [];
    const hourlyPM10 = aqData.hourly?.pm10 || [];
    const hourlyTemp = weatherData.hourly?.temperature_2m || [];
    const hourlyHum = weatherData.hourly?.relative_humidity_2m || [];
    const hourlyWind = weatherData.hourly?.wind_speed_10m || [];

    const hourlyForecast: HourlyForecast[] = [];
    const count = Math.min(24, hourlyTimes.length);

    for (let i = 0; i < count; i++) {
      const timeStr = hourlyTimes[i];
      const dateObj = new Date(timeStr);
      const hourDisplay = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
      const hPM25 = +(hourlyPM25[i] ?? pm25Val).toFixed(1);
      const hPM10 = +(hourlyPM10[i] ?? pm10Val).toFixed(1);
      const hTemp = +(hourlyTemp[i] ?? tempC).toFixed(1);
      const hHum = Math.round(hourlyHum[i] ?? humidityPct);
      const hWind = +(hourlyWind[i] ?? windSpeedKmh).toFixed(1);
      const hBLH = Math.round(hourlyBLH[i] ?? currentBLH);

      const inNAQI = calculateIndianNAQI({ pm25: hPM25, pm10: hPM10 }).value;
      const usAQ = pm25ToUSEPAAQI(hPM25).value;

      let invRisk: HourlyForecast['inversionRisk'] = 'Low';
      if (hBLH < 180 && hWind < 6) invRisk = 'Extreme';
      else if (hBLH < 350) invRisk = 'High';
      else if (hBLH < 600) invRisk = 'Medium';

      // Scientific Ventilation Suitability:
      // A window is only suitable for ventilation if outdoor PM2.5 is low/moderate AND boundary layer is dilated (>350m).
      // If outdoor PM2.5 is > 90 ug/m3, outdoor air will severely worsen indoor air!
      const canVent = hPM25 <= 60 && hBLH >= 350;
      let rationale = '';
      if (canVent) {
        rationale = `Solar heating expanded boundary layer to ${hBLH}m with moderate PM2.5 (${hPM25} µg/m³). Brief 10-15m cross-ventilation flushes indoor CO2 safely.`;
      } else if (hPM25 > 120) {
        rationale = `Outdoor PM2.5 is hazardous (${hPM25} µg/m³). Opening windows will rapidly contaminate indoor space with submicron soot. Keep sealed.`;
      } else if (hBLH < 250) {
        rationale = `Shallow nocturnal boundary layer (${hBLH}m). Cold ground inversion traps surface vehicle exhaust. Keep windows closed.`;
      } else {
        rationale = `Borderline conditions (${hPM25} µg/m³ PM2.5). Ventilate only if indoor CO2 is elevated and air purifiers are running on boost.`;
      }

      let commuteSafety: HourlyForecast['commuteSafety'] = 'Safe';
      if (hPM25 > 250 || invRisk === 'Extreme') commuteSafety = 'Hazardous Travel';
      else if (hPM25 > 120 || invRisk === 'High') commuteSafety = 'High Risk';
      else if (hPM25 > 60) commuteSafety = 'Caution';

      hourlyForecast.push({
        timeISO: timeStr,
        hourDisplay,
        hourNum: dateObj.getHours(),
        pm25: hPM25,
        pm10: hPM10,
        indianAQI: inNAQI,
        usAQI: usAQ,
        temperatureC: hTemp,
        humidityPct: hHum,
        windSpeedKmh: hWind,
        boundaryLayerHeightM: hBLH,
        inversionRisk: invRisk,
        ventilationSuitability: {
          canVentilate: canVent,
          confidenceScore: Math.round(Math.max(30, Math.min(95, (hBLH / 1000) * 100))),
          rationale,
        },
        activityRecommendation: canVent 
          ? 'Safe window for outdoor errands or a timed 12-15 min indoor fresh air exchange.'
          : (hPM25 > 150 ? 'Avoid outdoor exertion. Stay indoors with mechanical filtration active.' : 'Limit strenuous outdoor exercise; wear a fitted N95 respirator if near roadways.'),
        commuteSafety,
      });
    }

    const payload = { locationData, hourlyForecast };

    // Cache in sessionStorage
    try {
      sessionStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data: payload }));
    } catch {}

      return payload;

    } catch (err) {
      console.warn(`Live API lookup failed for ${cityName} (${latitude}, ${longitude}):`, err);

      // Use fallback with clear labeling
      if (fallbackBase) {
        const fallbackLocation: LocationData = {
          ...fallbackBase,
          sourceType: 'historical_reference',
          dataSourceName: 'Historical Seasonal Reference Baseline (Network Unavailable)',
          dataTimestamp: fallbackBase.dataTimestamp || new Date().toISOString(),
          weather: {
            ...fallbackBase.weather,
            isRealtime: false,
            dataSource: 'Offline Climatological Reference Model',
          },
        };

        const fallbackHourly = generateModelledHourlyForecast(
          fallbackLocation.pollutants.pm25,
          fallbackLocation.pollutants.pm10,
          fallbackLocation.weather.boundaryLayerHeightMeters || 220
        );

        return {
          locationData: fallbackLocation,
          hourlyForecast: fallbackHourly,
        };
      }

      throw err;
    }
  })();

  inFlightRequests.set(cacheKey, fetchPromise);
  try {
    return await fetchPromise;
  } finally {
    inFlightRequests.delete(cacheKey);
  }
}

/**
 * Calculates atmospheric visibility in km based on Koschmieder formula approximation:
 * Visibility ~= 3.912 / ExtinctionCoefficient
 * Extinction approx: b_ext ~= (PM2.5 * 0.0035 + PM10 * 0.0005) * f(RH)
 */
function calculateVisibilityFromPM(pm25: number, rh: number): number {
  const rhFactor = rh > 70 ? 1 + 0.02 * (rh - 70) : 1.0;
  const bExt = (pm25 * 0.003 + 0.02) * rhFactor;
  const vis = 3.912 / Math.max(0.05, bExt);
  return +Math.min(30, Math.max(0.2, vis)).toFixed(1);
}

/**
 * Generates transparently labelled modelled diurnal forecast curve when offline
 */
export function generateModelledHourlyForecast(basePM25: number, basePM10: number, baseBLH: number): HourlyForecast[] {
  const hours: Array<{ 
    hour: string; 
    num: number; 
    mult: number; 
    blh: number; 
    inv: HourlyForecast['inversionRisk']; 
    vent: boolean 
  }> = [
    { hour: '00:00', num: 0, mult: 1.10, blh: 120, inv: 'High', vent: false },
    { hour: '02:00', num: 2, mult: 1.15, blh: 90, inv: 'High', vent: false },
    { hour: '04:00', num: 4, mult: 1.25, blh: 70, inv: 'Extreme', vent: false },
    { hour: '06:00', num: 6, mult: 1.45, blh: 100, inv: 'Extreme', vent: false },
    { hour: '07:30', num: 7.5, mult: 1.55, blh: 140, inv: 'Extreme', vent: false },
    { hour: '09:00', num: 9, mult: 1.35, blh: 240, inv: 'High', vent: false },
    { hour: '11:00', num: 11, mult: 1.05, blh: 450, inv: 'Medium', vent: false },
    { hour: '12:30', num: 12.5, mult: 0.70, blh: 820, inv: 'Low', vent: true },
    { hour: '14:00', num: 14, mult: 0.65, blh: 950, inv: 'Low', vent: true },
    { hour: '15:30', num: 15.5, mult: 0.72, blh: 780, inv: 'Low', vent: true },
    { hour: '17:00', num: 17, mult: 1.10, blh: 380, inv: 'Medium', vent: false },
    { hour: '18:30', num: 18.5, mult: 1.40, blh: 180, inv: 'High', vent: false },
    { hour: '20:00', num: 20, mult: 1.35, blh: 130, inv: 'Extreme', vent: false },
    { hour: '22:00', num: 22, mult: 1.20, blh: 110, inv: 'High', vent: false },
  ];

  return hours.map(h => {
    const pm25 = Math.round(basePM25 * h.mult);
    const pm10 = Math.round(basePM10 * h.mult);
    const inAQI = calculateIndianNAQI({ pm25, pm10 }).value;
    const usAQI = pm25ToUSEPAAQI(pm25).value;
    const canVent = h.vent && pm25 <= 60;

    const scaledBLH = Math.round(h.blh * (baseBLH > 0 ? baseBLH / 300 : 1));

    return {
      timeISO: new Date().toISOString(),
      hourDisplay: h.hour,
      hourNum: Math.floor(h.num),
      pm25,
      pm10,
      indianAQI: inAQI,
      usAQI,
      temperatureC: 18,
      humidityPct: 65,
      windSpeedKmh: 4.5,
      boundaryLayerHeightM: scaledBLH,
      inversionRisk: h.inv,
      ventilationSuitability: {
        canVentilate: canVent,
        confidenceScore: 75,
        rationale: canVent 
          ? `Modelled diurnal solar convection peak expands boundary layer to ~${scaledBLH}m. Brief 15-min flush possible.` 
          : `High modelled ground inversion risk (BLH ~${scaledBLH}m). Keep windows sealed.`,
      },
      activityRecommendation: canVent ? 'Optimal daylight movement window.' : 'Keep windows sealed; operate mechanical filtration.',
      commuteSafety: pm25 > 200 ? 'Hazardous Travel' : (pm25 > 100 ? 'High Risk' : 'Caution'),
    };
  });
}
