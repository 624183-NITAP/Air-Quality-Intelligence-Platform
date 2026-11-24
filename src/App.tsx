import React, { useState, useEffect, useCallback } from 'react';
import type { LocationData, FamilyProfile, HourlyForecast, AirQualityScale } from './types';
import { INDIAN_AND_GLOBAL_LOCATIONS } from './data/locations';
import { fetchLiveAirQualityAndWeather } from './services/api/airQualityApi';
import { Header } from './components/Header';
import { FamilyProfileModal } from './components/FamilyProfileModal';
import { ApiKeyModal } from './components/ApiKeyModal';
import { FamilyActionPlanModal } from './components/FamilyActionPlanModal';
// Lazy-loaded Tab views for optimized code splitting and initial page load performance
const AirIntelligenceTab = React.lazy(() => import('./components/AirIntelligenceTab').then(m => ({ default: m.AirIntelligenceTab })));
const DailyRoutineTab = React.lazy(() => import('./components/DailyRoutineTab').then(m => ({ default: m.DailyRoutineTab })));
const IndoorStudioTab = React.lazy(() => import('./components/IndoorStudioTab').then(m => ({ default: m.IndoorStudioTab })));
const AIAssistantTab = React.lazy(() => import('./components/AIAssistantTab').then(m => ({ default: m.AIAssistantTab })));
const CommunityTab = React.lazy(() => import('./components/CommunityTab').then(m => ({ default: m.CommunityTab })));
const CleanHeatTab = React.lazy(() => import('./components/CleanHeatTab').then(m => ({ default: m.CleanHeatTab })));

const TabLoadingSkeleton: React.FC = () => (
  <div 
    role="status" 
    aria-label="Loading section content" 
    className="w-full min-h-[380px] flex flex-col items-center justify-center p-8 bg-slate-900/40 border border-slate-800 rounded-2xl animate-pulse space-y-4"
  >
    <div className="w-12 h-12 rounded-full border-2 border-cyan-500/20 border-t-cyan-500 animate-spin" />
    <p className="text-sm font-medium text-slate-400">Loading module workspace...</p>
    <span className="sr-only">Loading content, please wait.</span>
  </div>
);
import { 
  Activity, 
  CalendarClock, 
  Box, 
  Bot, 
  Users, 
  Flame, 
  FileDown
} from 'lucide-react';

const DEFAULT_PROFILE: FamilyProfile = {
  name: 'The Sharma-Miller Family',
  locationId: 'delhi-ncr',
  preferredAQIScale: 'IN_NAQI',
  preferredLanguage: 'en',
  budgetTier: 'moderate',
  members: [
    { id: 'm1', label: 'Aarav (Son)', type: 'asthma_copd', age: 7, specialNotes: 'Cold air triggers exercise-induced bronchospasm. Uses Alvesco & Ventolin.' },
    { id: 'm2', label: 'Tara (Daughter)', type: 'infant', age: 1.5, specialNotes: 'Developing lungs; sensitive to indoor VOCs.' },
    { id: 'm3', label: 'Grandmother Sunita', type: 'senior', age: 68, specialNotes: 'Hypertension and reduced cardiac reserve in cold smog.' },
    { id: 'm4', label: 'Kavita & David', type: 'healthy_adult', age: 38, specialNotes: 'Daily commuters.' },
    { id: 'm5', label: 'Bruno (Golden Retriever)', type: 'pet', age: 4, specialNotes: 'Brings street silt on coat.' },
  ],
  housing: {
    type: 'mid_rise_apt',
    floorLevel: 3,
    windowDraftiness: 'moderate_drafts',
    roomLengthM: 6,
    roomWidthM: 5,
    roomHeightM: 2.8,
    roomVolumeM3: 84,
    heatingSystem: 'electric_radiator',
    kitchenVentilation: 'ducted_range_hood',
    cookingFuel: 'piped_natural_gas',
  },
  commute: {
    primaryMode: 'private_car',
    commuteDistanceKm: 14,
    morningDepartureTime: '07:30',
    eveningReturnTime: '18:00',
    flexibleWorkHours: true,
  },
  airPurifierCADR: 380,
};

export const App: React.FC = () => {
  // Load saved profile or default
  const [profile, setProfile] = useState<FamilyProfile>(() => {
    try {
      const saved = localStorage.getItem('aeropulse_profile');
      return saved ? JSON.parse(saved) : DEFAULT_PROFILE;
    } catch {
      return DEFAULT_PROFILE;
    }
  });

  // Preferred AQI Scale
  const [preferredScale, setPreferredScale] = useState<AirQualityScale>(
    profile.preferredAQIScale || 'IN_NAQI'
  );

  // Current selected location
  const [currentLocation, setCurrentLocation] = useState<LocationData>(() => {
    const found = INDIAN_AND_GLOBAL_LOCATIONS.find(l => l.id === profile.locationId);
    return found || INDIAN_AND_GLOBAL_LOCATIONS[0];
  });

  // Hourly forecasts for timeline and ventilation suitability
  const [hourlyForecast, setHourlyForecast] = useState<HourlyForecast[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Gemini API Key state
  const [apiKey, setApiKey] = useState<string>(() => {
    try {
      return localStorage.getItem('aeropulse_gemini_api_key') || '';
    } catch {
      return '';
    }
  });

  // Active Tab navigation
  const [activeTab, setActiveTab] = useState<'intelligence' | 'routines' | 'indoor' | 'assistant' | 'community' | 'cleanheat'>('intelligence');

  // Modals state
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [isActionPlanModalOpen, setIsActionPlanModalOpen] = useState(false);

  // Fetch live API data for coordinates or location
  const fetchLiveData = useCallback(async (
    lat: number, 
    lon: number, 
    city: string, 
    region: string, 
    country: string, 
    fallbackBase?: LocationData
  ) => {
    setIsRefreshing(true);
    try {
      const result = await fetchLiveAirQualityAndWeather(lat, lon, city, region, country, fallbackBase);
      setCurrentLocation(result.locationData);
      setHourlyForecast(result.hourlyForecast);
    } catch (err) {
      console.warn('Live API fetch error, relying on validated reference data:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Fetch live air quality on initial load
  useEffect(() => {
    fetchLiveData(
      currentLocation.latitude,
      currentLocation.longitude,
      currentLocation.city,
      currentLocation.region,
      currentLocation.country,
      currentLocation
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save profile changes
  const handleSaveProfile = (newProfile: FamilyProfile) => {
    setProfile(newProfile);
    setPreferredScale(newProfile.preferredAQIScale || 'IN_NAQI');
    try {
      localStorage.setItem('aeropulse_profile', JSON.stringify(newProfile));
    } catch {}
  };

  // Toggle preferred scale
  const handleToggleScale = (scale: AirQualityScale) => {
    setPreferredScale(scale);
    handleSaveProfile({ ...profile, preferredAQIScale: scale });
  };

  // Save API key changes
  const handleSaveApiKey = (key: string) => {
    setApiKey(key);
    try {
      localStorage.setItem('aeropulse_gemini_api_key', key);
    } catch {}
  };

  const handleSelectLocation = (loc: LocationData) => {
    setCurrentLocation(loc);
    handleSaveProfile({ ...profile, locationId: loc.id });
    fetchLiveData(loc.latitude, loc.longitude, loc.city, loc.region, loc.country, loc);
  };

  const handleSelectCoordinates = (lat: number, lon: number, cityName: string, region: string, country: string) => {
    fetchLiveData(lat, lon, cityName, region, country, currentLocation);
  };

  const handleRefreshLive = () => {
    // Clear session cache key to force fresh API call
    const cacheKey = `aeropulse_aq_${currentLocation.latitude.toFixed(3)}_${currentLocation.longitude.toFixed(3)}`;
    try {
      sessionStorage.removeItem(cacheKey);
    } catch {}
    fetchLiveData(
      currentLocation.latitude, 
      currentLocation.longitude, 
      currentLocation.city, 
      currentLocation.region, 
      currentLocation.country,
      currentLocation
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-cyan-500 selection:text-slate-950 font-sans">
      
      {/* Accessible Skip Link (WCAG 2.2 AA) */}
      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:bg-cyan-400 focus:text-slate-950 focus:font-bold focus:rounded-xl focus:shadow-xl focus:outline-none"
      >
        Skip to main content
      </a>

      {/* App Header with Geocoding Search, Scale Toggle, & Live Refresh */}
      <Header
        currentLocation={currentLocation}
        onSelectLocation={handleSelectLocation}
        onSelectCoordinates={handleSelectCoordinates}
        profile={profile}
        onOpenProfileModal={() => setIsProfileModalOpen(true)}
        onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
        hasApiKey={!!apiKey && apiKey.trim().length > 10}
        onRefreshLive={handleRefreshLive}
        isRefreshing={isRefreshing}
        preferredScale={preferredScale}
        onToggleScale={handleToggleScale}
      />

      {/* Main Container */}
      <main id="main-content" className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Navigation Tabs Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs sm:text-sm font-semibold pb-1">
            
            <button
              onClick={() => setActiveTab('intelligence')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition whitespace-nowrap ${
                activeTab === 'intelligence'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                  : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>Smog Intelligence</span>
            </button>

            <button
              onClick={() => setActiveTab('routines')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition whitespace-nowrap ${
                activeTab === 'routines'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                  : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <CalendarClock className="w-4 h-4" />
              <span>Daily Micro-Shifts</span>
            </button>

            <button
              onClick={() => setActiveTab('indoor')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition whitespace-nowrap ${
                activeTab === 'indoor'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                  : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Box className="w-4 h-4" />
              <span>IAQ Studio & DIY Box</span>
            </button>

            <button
              onClick={() => setActiveTab('assistant')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition whitespace-nowrap ${
                activeTab === 'assistant'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                  : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Bot className="w-4 h-4 text-cyan-400" />
              <span>AeroAI Guide</span>
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            </button>

            <button
              onClick={() => setActiveTab('community')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition whitespace-nowrap ${
                activeTab === 'community'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                  : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Community Pacts</span>
            </button>

            <button
              onClick={() => setActiveTab('cleanheat')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition whitespace-nowrap ${
                activeTab === 'cleanheat'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                  : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Flame className="w-4 h-4" />
              <span>Clean Heating</span>
            </button>

          </div>

          {/* Export Action Plan Button */}
          <button
            onClick={() => setIsActionPlanModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-slate-700/80 transition shadow-sm shrink-0"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>Export Action Plan</span>
          </button>
        </div>

        {/* Tab View Render */}
        <div className="pt-2">
          <React.Suspense fallback={<TabLoadingSkeleton />}>
            {activeTab === 'intelligence' && (
              <AirIntelligenceTab
                location={currentLocation}
                hourlyForecast={hourlyForecast}
                profile={profile}
                preferredScale={preferredScale}
                onToggleScale={handleToggleScale}
                onNavigateToRoutine={() => setActiveTab('routines')}
                onNavigateToHacks={() => setActiveTab('indoor')}
              />
            )}

            {activeTab === 'routines' && (
              <DailyRoutineTab
                profile={profile}
                location={currentLocation}
                onNavigateToHacks={() => setActiveTab('indoor')}
                onAskAI={() => {
                  setActiveTab('assistant');
                }}
              />
            )}

            {activeTab === 'indoor' && (
              <IndoorStudioTab
                profile={profile}
                currentOutdoorPM25={currentLocation.pollutants.pm25}
              />
            )}

            {activeTab === 'assistant' && (
              <AIAssistantTab
                profile={profile}
                location={currentLocation}
                apiKey={apiKey}
                onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
                onNavigateTab={(tab) => {
                  if (tab === 'routines') setActiveTab('routines');
                  if (tab === 'indoor') setActiveTab('indoor');
                  if (tab === 'community') setActiveTab('community');
                  if (tab === 'cleanheat') setActiveTab('cleanheat');
                }}
              />
            )}

            {activeTab === 'community' && (
              <CommunityTab />
            )}

            {activeTab === 'cleanheat' && (
              <CleanHeatTab />
            )}
          </React.Suspense>
        </div>

      </main>

      {/* Global Modals */}
      <FamilyProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        profile={profile}
        onSaveProfile={handleSaveProfile}
      />

      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
        apiKey={apiKey}
        onSaveApiKey={handleSaveApiKey}
      />

      <FamilyActionPlanModal
        isOpen={isActionPlanModalOpen}
        onClose={() => setIsActionPlanModalOpen(false)}
        profile={profile}
        location={currentLocation}
      />

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-6 mt-12 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-300">AeroPulse 2.0</span>
            <span>•</span>
            <span>Science-Driven GenAI Air Quality Intelligence Platform</span>
          </div>
          <div className="flex items-center gap-4">
            <span>CPCB Indian NAQI & US EPA Dual Scales</span>
            <span>•</span>
            <button
              onClick={() => setIsActionPlanModalOpen(true)}
              className="text-cyan-400 hover:underline"
            >
              Action Plan PDF
            </button>
            <span>•</span>
            <button
              onClick={() => setIsApiKeyModalOpen(true)}
              className="text-cyan-400 hover:underline"
            >
              Gemini API Key
            </button>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default App;
