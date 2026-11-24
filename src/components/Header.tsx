import React, { useState, useEffect, useRef } from 'react';
import type { LocationData, FamilyProfile, AirQualityScale } from '../types';
import { INDIAN_AND_GLOBAL_LOCATIONS } from '../data/locations';
import { searchLocations, type GeocodingResult } from '../services/api/airQualityApi';
import { 
  Wind, 
  AlertTriangle, 
  Users, 
  MapPin, 
  SlidersHorizontal,
  Key,
  Search,
  RefreshCw,
  Radio,
  Check
} from 'lucide-react';

interface HeaderProps {
  currentLocation: LocationData;
  onSelectLocation: (loc: LocationData) => void;
  onSelectCoordinates: (lat: number, lon: number, cityName: string, region: string, country: string) => void;
  profile: FamilyProfile;
  onOpenProfileModal: () => void;
  onOpenApiKeyModal: () => void;
  hasApiKey: boolean;
  onRefreshLive: () => void;
  isRefreshing: boolean;
  preferredScale: AirQualityScale;
  onToggleScale: (scale: AirQualityScale) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentLocation,
  onSelectLocation,
  onSelectCoordinates,
  profile,
  onOpenProfileModal,
  onOpenApiKeyModal,
  hasApiKey,
  onRefreshLive,
  isRefreshing,
  preferredScale,
  onToggleScale,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GeocodingResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      const results = await searchLocations(searchQuery);
      setSearchResults(results);
      setIsSearching(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Click outside listener for search dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeAQI = preferredScale === 'IN_NAQI' 
    ? currentLocation.calculatedAQI.indianNAQI 
    : currentLocation.calculatedAQI.usEPAAQI;

  const blh = currentLocation.weather.boundaryLayerHeightMeters || 180;
  const isSevereInversion = currentLocation.weather.inversionCondition.includes('Severe') || blh < 180;

  return (
    <header className="border-b border-slate-800 bg-slate-950/90 backdrop-blur-xl sticky top-0 z-40">
      
      {/* Top Atmospheric Inversion Warning Bar */}
      {isSevereInversion && (
        <div className="bg-gradient-to-r from-rose-950 via-red-950 to-amber-950 px-4 py-1.5 text-xs text-red-200 border-b border-red-900/60 flex items-center justify-between">
          <div className="flex items-center gap-2 font-medium max-w-5xl">
            <span className="flex h-2 w-2 relative shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="truncate">
              <strong>SURFACE BOUNDARY-LAYER INVERSION:</strong> Planetary boundary layer capped at <strong>{blh}m</strong> in {currentLocation.city}. Ground-level exhaust and smoke are physically trapped.
            </span>
          </div>
          <span className="hidden md:inline-flex items-center gap-1.5 text-[11px] bg-red-900/60 px-2 py-0.5 rounded-md border border-red-700/50 text-red-200">
            Dispersion: {currentLocation.weather.dispersionFactor}
          </span>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          
          {/* Logo & Platform Info */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 text-white font-black text-lg">
                <Wind className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-black tracking-tight text-white">
                    Aero<span className="text-cyan-400">Pulse</span> <span className="text-xs font-semibold text-slate-400">2.0</span>
                  </h1>
                  <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-md bg-cyan-950 text-cyan-300 border border-cyan-800/80">
                    Science Platform
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Real-Time Atmospheric Inversion & Community Clean Air Platform
                </p>
              </div>
            </div>

            {/* Mobile Actions */}
            <div className="flex items-center gap-2 lg:hidden">
              <button
                onClick={onRefreshLive}
                disabled={isRefreshing}
                className="p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:text-white"
                title="Refresh Live Data"
              >
                <RefreshCw className={`w-4 h-4 text-cyan-400 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={onOpenProfileModal}
                className="p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:text-white"
                title="Household Settings"
              >
                <Users className="w-4 h-4 text-cyan-400" />
              </button>
            </div>
          </div>

          {/* Location Search & Selection Controls */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Location Autocomplete Search */}
            <div ref={searchContainerRef} className="relative flex-1 sm:w-64">
              <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 shadow-inner focus-within:border-cyan-500 transition">
                <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setIsSearchOpen(true);
                  }}
                  onFocus={() => setIsSearchOpen(true)}
                  placeholder="Search city (e.g. Hyderabad, Tadepalligudem)..."
                  className="bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none w-full"
                />
                {isSearching && <RefreshCw className="w-3 h-3 text-cyan-400 animate-spin shrink-0" />}
              </div>

              {/* Autocomplete Dropdown */}
              {isSearchOpen && (searchResults.length > 0 || isSearching) && (
                <div className="absolute left-0 right-0 top-full mt-1.5 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 max-h-64 overflow-y-auto divide-y divide-slate-800 text-xs">
                  {searchResults.map((res) => (
                    <button
                      key={`${res.latitude}-${res.longitude}-${res.id}`}
                      onClick={() => {
                        onSelectCoordinates(
                          res.latitude,
                          res.longitude,
                          res.name,
                          res.admin1 || res.name,
                          res.country
                        );
                        setIsSearchOpen(false);
                        setSearchQuery('');
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-cyan-950/60 hover:text-cyan-200 transition flex items-center justify-between"
                    >
                      <div className="truncate">
                        <span className="font-bold text-white">{res.name}</span>
                        {res.admin1 && <span className="text-slate-400 text-[11px] ml-1">({res.admin1})</span>}
                        <span className="text-slate-500 text-[10px] ml-1.5">[{res.country}]</span>
                      </div>
                      <span className="text-[10px] text-cyan-400 font-mono shrink-0">
                        {res.latitude.toFixed(2)}, {res.longitude.toFixed(2)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Hotspot Select */}
            <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl px-2 py-1">
              <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <select
                aria-label="Popular Cities"
                value={currentLocation.id}
                onChange={(e) => {
                  const found = INDIAN_AND_GLOBAL_LOCATIONS.find(l => l.id === e.target.value);
                  if (found) onSelectLocation(found);
                }}
                className="bg-transparent text-xs font-semibold text-slate-200 focus:outline-none cursor-pointer pr-1 max-w-[140px] truncate"
              >
                <optgroup label="India (Major Hubs & Regional)">
                  <option value="delhi-ncr">Delhi NCR</option>
                  <option value="hyderabad-in">Hyderabad (TG)</option>
                  <option value="visakhapatnam-in">Visakhapatnam (AP)</option>
                  <option value="vijayawada-in">Vijayawada (AP)</option>
                  <option value="tadepalligudem-in">Tadepalligudem (AP)</option>
                  <option value="kolkata-in">Kolkata (WB)</option>
                  <option value="mumbai-in">Mumbai (MH)</option>
                  <option value="bengaluru-in">Bengaluru (KA)</option>
                  <option value="chennai-in">Chennai (TN)</option>
                  <option value="pune-in">Pune (MH)</option>
                </optgroup>
                <optgroup label="Global Inversion Hotspots">
                  <option value="lahore-pk">Lahore, PK</option>
                  <option value="salt-lake-city-us">Salt Lake City, US</option>
                  <option value="beijing-cn">Beijing, CN</option>
                  <option value="krakow-pl">Krakow, PL</option>
                  <option value="milan-it">Milan, IT</option>
                  <option value="london-uk">London, UK</option>
                </optgroup>
              </select>
            </div>

            {/* Live Refresh Button */}
            <button
              onClick={onRefreshLive}
              disabled={isRefreshing}
              className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition"
              title="Refresh Real-Time API Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>

            {/* AQI Scale Toggle Pill */}
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-0.5 text-[11px] font-semibold">
              <button
                onClick={() => onToggleScale('IN_NAQI')}
                className={`px-2 py-1 rounded-lg transition ${
                  preferredScale === 'IN_NAQI'
                    ? 'bg-cyan-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Indian National Air Quality Index (CPCB 2014 Standard)"
              >
                CPCB NAQI
              </button>
              <button
                onClick={() => onToggleScale('US_EPA')}
                className={`px-2 py-1 rounded-lg transition ${
                  preferredScale === 'US_EPA'
                    ? 'bg-cyan-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="US EPA Air Quality Index (2024 Revised Standard)"
              >
                US EPA
              </button>
            </div>

            {/* Provenance Badge */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900/80 border border-slate-800 text-[11px]">
              {currentLocation.sourceType === 'live_api' ? (
                <span className="flex items-center gap-1 text-emerald-400 font-medium">
                  <Radio className="w-3 h-3 animate-pulse" /> Live Atmospheric Feed
                </span>
              ) : (
                <span className="text-amber-400/90 font-medium">
                  [Verified Historical Baseline]
                </span>
              )}
            </div>

            {/* Current AQI Badge */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${activeAQI.colorToken.bg} ${activeAQI.colorToken.border}`}>
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className={`text-sm font-black ${activeAQI.colorToken.text}`}>
                    {preferredScale === 'IN_NAQI' ? 'NAQI' : 'AQI'} {activeAQI.value}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    PM2.5: {currentLocation.pollutants.pm25} µg/m³
                  </span>
                </div>
              </div>
            </div>

            {/* Family Profile Trigger */}
            <button
              onClick={onOpenProfileModal}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-cyan-950/60 hover:bg-cyan-900/60 text-cyan-300 border border-cyan-800/60 transition"
              title="Family Profile & Lungs"
            >
              <Users className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden xl:inline">{profile.name}</span>
              <span className="text-[10px] text-cyan-300/80">({profile.members.length})</span>
              <SlidersHorizontal className="w-3 h-3 text-cyan-400/70 ml-0.5" />
            </button>

            {/* Gemini API Indicator */}
            <button
              onClick={onOpenApiKeyModal}
              className={`flex items-center gap-1 px-2 py-1.5 rounded-xl text-[11px] font-medium border transition ${
                hasApiKey 
                  ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/60' 
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
              title="Google Gemini AI Key Configuration"
            >
              <Key className="w-3 h-3" />
              <span className="hidden sm:inline">{hasApiKey ? 'Gemini Active' : 'Gemini Key'}</span>
              {hasApiKey && <Check className="w-3 h-3 text-emerald-400" />}
            </button>

          </div>

        </div>
      </div>
    </header>
  );
};
