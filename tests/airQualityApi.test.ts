import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  searchLocations,
  fetchLiveAirQualityAndWeather
} from '../src/services/api/airQualityApi';
import type { LocationData } from '../src/types';

describe('Air Quality & Meteorological API Service (airQualityApi.ts)', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  // Mock standard Open-Meteo Air Quality and Weather payloads
  const mockAQResponse = {
    current: {
      time: '2026-11-24T10:00',
      pm2_5: 185.4,
      pm10: 290.2,
      nitrogen_dioxide: 48.6,
      sulphur_dioxide: 18.2,
      carbon_monoxide: 1850, // 1850 ug/m3 = 1.85 mg/m3
      ozone: 32.1,
      dust: 120,
      aerosol_optical_depth: 1.45,
    },
    hourly: {
      time: ['2026-11-24T10:00', '2026-11-24T11:00'],
      pm2_5: [185.4, 160.0],
      pm10: [290.2, 240.0],
    }
  };

  const mockWeatherResponse = {
    current: {
      temperature_2m: 14.8,
      relative_humidity_2m: 78,
      surface_pressure: 1018,
      wind_speed_10m: 4.2,
      wind_direction_10m: 315, // NW
    },
    hourly: {
      time: ['2026-11-24T10:00', '2026-11-24T11:00'],
      temperature_2m: [14.8, 16.5],
      relative_humidity_2m: [78, 65],
      wind_speed_10m: [4.2, 5.8],
      boundary_layer_height: [140, 380], // Low nocturnal/morning trap followed by expansion
    }
  };

  // ==========================================================================
  // 1. LOCATION GEOCODING & AUTOCOMPLETE
  // ==========================================================================
  describe('searchLocations', () => {
    it('returns empty array when query is less than 2 characters', async () => {
      const res = await searchLocations('d');
      expect(res).toEqual([]);
    });

    it('finds predefined Indian cities instantly without external network call', async () => {
      const res = await searchLocations('Delhi');
      expect(res.length).toBeGreaterThan(0);
      expect(res.some(l => l.name.toLowerCase().includes('delhi'))).toBe(true);
    });

    it('merges remote geocoding results when network is available', async () => {
      const mockGeocoding = {
        results: [
          {
            id: 9999,
            name: 'Chandigarh Extension',
            latitude: 30.73,
            longitude: 76.77,
            country: 'India',
            country_code: 'IN',
            admin1: 'Punjab',
          }
        ]
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockGeocoding,
      } as Response);

      const res = await searchLocations('Chandigarh');
      expect(res.length).toBeGreaterThan(0);
      expect(res.some(r => r.name.includes('Chandigarh'))).toBe(true);
    });

    it('falls back to local matches gracefully when geocoding network fails', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network timeout'));
      const res = await searchLocations('Mumbai');
      expect(res.length).toBeGreaterThan(0);
      expect(res.some(r => r.name.toLowerCase().includes('mumbai'))).toBe(true);
    });
  });

  // ==========================================================================
  // 2. LIVE AIR QUALITY & WEATHER FETCHING
  // ==========================================================================
  describe('fetchLiveAirQualityAndWeather', () => {
    it('successfully processes Open-Meteo responses and derives scientific metrics', async () => {
      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes('air-quality')) {
          return Promise.resolve({
            ok: true,
            json: async () => mockAQResponse,
          });
        }
        return Promise.resolve({
          ok: true,
          json: async () => mockWeatherResponse,
        });
      });

      const { locationData, hourlyForecast } = await fetchLiveAirQualityAndWeather(
        28.61,
        77.23,
        'New Delhi',
        'Delhi NCR',
        'India'
      );

      // Verify measured pollutants
      expect(locationData.pollutants.pm25).toBe(185.4);
      expect(locationData.pollutants.pm10).toBe(290.2);
      expect(locationData.pollutants.co).toBe(1.85); // converted from 1850 ug/m3 to mg/m3
      expect(locationData.sourceType).toBe('live_api');

      // Verify meteorology and boundary layer classification
      expect(locationData.weather.boundaryLayerHeightMeters).toBe(140);
      expect(locationData.weather.windSpeedKmh).toBe(4.2);
      expect(locationData.weather.inversionCondition).toBe('Severe Boundary Layer Trap');
      expect(locationData.weather.dispersionFactor).toBe('Stagnant (Trapped Smog)');

      // Verify calculated AQI indexes (CPCB 2014 PM2.5 121-250 ug/m3 -> Very Poor)
      expect(locationData.calculatedAQI?.indianNAQI?.category).toBe('Very Poor');
      expect(locationData.calculatedAQI?.indianNAQI?.value).toBeGreaterThan(300);
      expect(locationData.calculatedAQI?.usEPAAQI?.value).toBeGreaterThan(200);

      // Verify hourly forecast synthesis
      expect(hourlyForecast.length).toBe(2);
      expect(hourlyForecast[0].pm25).toBe(185.4);
      expect(hourlyForecast[0].boundaryLayerHeightM).toBe(140);
      expect(hourlyForecast[0].inversionRisk).toBe('Extreme');
      expect(hourlyForecast[0].ventilationSuitability.canVentilate).toBe(false);
    });

    it('deduplicates concurrent in-flight requests for the same coordinates', async () => {
      const fetchSpy = vi.fn().mockImplementation((url: string) => {
        if (url.includes('air-quality')) {
          return Promise.resolve({ ok: true, json: async () => mockAQResponse });
        }
        return Promise.resolve({ ok: true, json: async () => mockWeatherResponse });
      });
      global.fetch = fetchSpy;

      // Launch 2 parallel requests for exact same coords
      const p1 = fetchLiveAirQualityAndWeather(28.613, 77.209, 'Delhi', 'NCR', 'India');
      const p2 = fetchLiveAirQualityAndWeather(28.613, 77.209, 'Delhi', 'NCR', 'India');

      const [res1, res2] = await Promise.all([p1, p2]);

      expect(res1).toBe(res2); // Shared identical Promise reference
      // Exactly 2 calls (1 AQ, 1 Weather) instead of 4
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });

    it('returns cached result from sessionStorage on repeated calls within TTL', async () => {
      const fetchSpy = vi.fn().mockImplementation((url: string) => {
        if (url.includes('air-quality')) {
          return Promise.resolve({ ok: true, json: async () => mockAQResponse });
        }
        return Promise.resolve({ ok: true, json: async () => mockWeatherResponse });
      });
      global.fetch = fetchSpy;

      // First call populates cache
      await fetchLiveAirQualityAndWeather(28.613, 77.209, 'Delhi', 'NCR', 'India');
      expect(fetchSpy).toHaveBeenCalledTimes(2);

      // Second call should serve from sessionStorage cache
      const cachedRes = await fetchLiveAirQualityAndWeather(28.613, 77.209, 'Delhi', 'NCR', 'India');
      expect(cachedRes.locationData.pollutants.pm25).toBe(185.4);
      expect(fetchSpy).toHaveBeenCalledTimes(2); // No additional network requests
    });

    it('falls back to seasonal reference baseline with explicit labeling on HTTP 500/network error', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('503 Service Unavailable'));

      const fallbackBase: LocationData = {
        id: 'delhi-ncr',
        city: 'Delhi NCR',
        region: 'National Capital Region',
        country: 'India',
        latitude: 28.6139,
        longitude: 77.209,
        sourceType: 'live_api',
        dataSourceName: 'CPCB & DPCC Real-Time CAAQMS Network',
        dataTimestamp: '2026-11-20T10:00:00.000Z',
        pollutants: {
          pm25: 195,
          pm10: 310,
          no2: 52,
          so2: 18,
          co: 2.1,
          ozone: 24,
        },
        weather: {
          temperatureC: 16.5,
          humidityPct: 82,
          windSpeedKmh: 4.8,
          windDirectionDeg: 310,
          windDirectionCompass: 'NW',
          surfacePressureHpa: 1018,
          boundaryLayerHeightMeters: 195,
          visibilityKm: 0.9,
          inversionCondition: 'Severe Boundary Layer Trap',
          dispersionFactor: 'Stagnant (Trapped Smog)',
          dataSource: 'CPCB Safdarjung Meteorological Observatory',
          isRealtime: true,
          observationTimeISO: '2026-11-20T10:00:00.000Z',
        },
        primarySources: ['Vehicular exhaust', 'Crop residue smoke', 'Brick kilns'],
      };

      const result = await fetchLiveAirQualityAndWeather(
        28.6139,
        77.209,
        'Delhi NCR',
        'National Capital Region',
        'India',
        fallbackBase
      );

      // Must clearly label as non-realtime historical reference
      expect(result.locationData.sourceType).toBe('historical_reference');
      expect(result.locationData.dataSourceName).toContain('Historical Seasonal Reference Baseline');
      expect(result.locationData.weather.isRealtime).toBe(false);
      expect(result.hourlyForecast.length).toBeGreaterThan(0);
    });

    it('accurately aligns boundary layer height to the observation timestamp index (not blindly index 0)', async () => {
      // Mock observation time at 11:00 where BLH expanded to 380m
      const mockDelayedWeather = {
        current: {
          time: '2026-11-24T11:00',
          temperature_2m: 16.5,
          relative_humidity_2m: 65,
          wind_speed_10m: 6.5,
          wind_direction_10m: 270,
        },
        hourly: {
          time: ['2026-11-24T10:00', '2026-11-24T11:00'],
          boundary_layer_height: [140, 380],
        }
      };

      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes('air-quality')) {
          return Promise.resolve({ ok: true, json: async () => mockAQResponse });
        }
        return Promise.resolve({ ok: true, json: async () => mockDelayedWeather });
      });

      const { locationData } = await fetchLiveAirQualityAndWeather(
        28.61,
        77.23,
        'New Delhi',
        'Delhi NCR',
        'India'
      );

      // Verify that 11:00 timestamp selected index 1 (380m) instead of index 0 (140m)
      expect(locationData.weather.boundaryLayerHeightMeters).toBe(380);
      expect(locationData.weather.inversionCondition).toBe('Weak Surface Boundary');
    });

    it('re-throws network error when no fallbackBase is provided', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
      await expect(
        fetchLiveAirQualityAndWeather(28.6139, 77.209, 'Delhi', 'NCR', 'India')
      ).rejects.toThrow('Network error');
    });
  });
});
