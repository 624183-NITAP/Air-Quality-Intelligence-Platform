import React, { useState } from 'react';
import type { LocationData, FamilyProfile, HourlyForecast, AirQualityScale } from '../types';
import { calculateCigaretteEquivalence } from '../utils/airCalculators';
import { 
  Cigarette, 
  ShieldAlert, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  HeartPulse,
  Layers,
  Info,
  Radio
} from 'lucide-react';

interface AirIntelligenceTabProps {
  location: LocationData;
  hourlyForecast: HourlyForecast[];
  profile: FamilyProfile;
  preferredScale: AirQualityScale;
  onToggleScale: (scale: AirQualityScale) => void;
  onNavigateToRoutine: () => void;
  onNavigateToHacks: () => void;
}

export const AirIntelligenceTab: React.FC<AirIntelligenceTabProps> = ({
  location,
  hourlyForecast,
  profile,
  preferredScale,
  onToggleScale,
  onNavigateToRoutine,
  onNavigateToHacks,
}) => {
  const [selectedHourIndex, setSelectedHourIndex] = useState<number>(0);
  const [showInversionScience, setShowInversionScience] = useState<boolean>(false);

  const selectedForecast = hourlyForecast[selectedHourIndex] || hourlyForecast[0] || {
    hourDisplay: 'Now',
    pm25: location.pollutants.pm25,
    pm10: location.pollutants.pm10,
    indianAQI: location.calculatedAQI.indianNAQI.value,
    usAQI: location.calculatedAQI.usEPAAQI.value,
    temperatureC: location.weather.temperatureC,
    humidityPct: location.weather.humidityPct,
    windSpeedKmh: location.weather.windSpeedKmh,
    boundaryLayerHeightM: location.weather.boundaryLayerHeightMeters || 220,
    inversionRisk: 'Medium',
    ventilationSuitability: {
      canVentilate: false,
      confidenceScore: 70,
      rationale: 'Review current outdoor particulate loading.',
    },
    activityRecommendation: 'Wear N95 outdoors if particulate is elevated.',
    commuteSafety: 'Caution',
  };

  const cigData = calculateCigaretteEquivalence(location.pollutants.pm25);
  const activeAQI = preferredScale === 'IN_NAQI' 
    ? location.calculatedAQI.indianNAQI 
    : location.calculatedAQI.usEPAAQI;

  const blh = location.weather.boundaryLayerHeightMeters || 250;

  return (
    <div className="space-y-6">
      
      {/* SECTION 1: Atmospheric Overview & Provenance Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-900/70 border border-slate-800 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-white flex items-center gap-1.5">
            <Radio className={`w-3.5 h-3.5 ${location.sourceType === 'live_api' ? 'text-emerald-400 animate-pulse' : 'text-amber-400'}`} />
            {location.sourceType === 'live_api' ? 'Live External Feed' : 'Verified Seasonal Baseline'}
          </span>
          <span className="text-slate-500">•</span>
          <span className="text-slate-300">Source: <strong className="text-cyan-300">{location.dataSourceName}</strong></span>
          <span className="text-slate-500">•</span>
          <span className="text-slate-400">Observed: {new Date(location.weather.observationTimeISO).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>

        <div className="flex items-center gap-3 text-slate-400">
          <span>Coords: <strong className="text-slate-300 font-mono">{location.latitude.toFixed(2)}°N, {location.longitude.toFixed(2)}°E</strong></span>
          <div className="flex items-center gap-1 bg-slate-950 px-2 py-0.5 rounded-lg border border-slate-800">
            <span>Scale:</span>
            <button 
              onClick={() => onToggleScale(preferredScale === 'IN_NAQI' ? 'US_EPA' : 'IN_NAQI')}
              className="text-cyan-400 font-bold hover:underline"
            >
              {preferredScale === 'IN_NAQI' ? 'Indian NAQI (CPCB)' : 'US EPA AQI'}
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 2: Hero Atmospheric Inversion & AQI Metrics Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Main AQI & Health Gauge Card */}
        <div className="lg:col-span-2 rounded-2xl glass-panel p-6 border border-slate-800 relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800/80">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-300">
                  {location.city}, {location.country}
                </span>
                <span className="text-[11px] text-slate-400">
                  {location.region}
                </span>
              </div>
              <h2 className="text-2xl font-black text-white mt-1">
                Real-Time Atmospheric & Particulate Metrics
              </h2>
            </div>
            
            <div className={`px-4 py-2.5 rounded-2xl border text-center ${activeAQI.colorToken.bg} ${activeAQI.colorToken.border}`}>
              <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
                {preferredScale === 'IN_NAQI' ? 'Indian National AQI (CPCB)' : 'US EPA AQI'}
              </div>
              <div className={`text-xl font-black ${activeAQI.colorToken.text}`}>
                {activeAQI.category} ({activeAQI.value})
              </div>
              <div className="text-[10px] text-slate-400">
                Dominant: <strong className="text-slate-200">{activeAQI.dominantPollutant}</strong>
              </div>
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5">
            {/* PM2.5 Metric */}
            <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
              <span className="text-[11px] text-slate-400 font-medium">PM2.5 (Fine Particles)</span>
              <div className="text-3xl font-black text-cyan-300 mt-1">
                {location.pollutants.pm25}
                <span className="text-xs font-normal text-slate-400 ml-1">µg/m³</span>
              </div>
              <span className="text-[10px] text-slate-400">
                {location.pollutants.pm25 > 60 
                  ? `${(location.pollutants.pm25 / 60).toFixed(1)}x CPCB Limit (60)` 
                  : 'Within CPCB Limit'}
              </span>
            </div>

            {/* PM10 Metric */}
            <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
              <span className="text-[11px] text-slate-400 font-medium">PM10 (Coarse Dust)</span>
              <div className="text-3xl font-black text-slate-200 mt-1">
                {location.pollutants.pm10}
                <span className="text-xs font-normal text-slate-400 ml-1">µg/m³</span>
              </div>
              <span className="text-[10px] text-slate-400">
                {location.pollutants.pm10 > 100 
                  ? `${(location.pollutants.pm10 / 100).toFixed(1)}x CPCB Limit (100)` 
                  : 'Within CPCB Limit'}
              </span>
            </div>

            {/* Boundary Layer Height */}
            <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
              <span className="text-[11px] text-slate-400 font-medium">Boundary Layer Height</span>
              <div className="text-2xl font-bold text-amber-400 mt-1 flex items-baseline gap-1">
                {blh} <span className="text-xs font-normal text-slate-400">meters</span>
              </div>
              <span className="text-[10px] text-amber-300/80 truncate block">
                {location.weather.inversionCondition}
              </span>
            </div>

            {/* Wind & Dispersion */}
            <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
              <span className="text-[11px] text-slate-400 font-medium">Surface Wind</span>
              <div className="text-2xl font-bold text-slate-200 mt-1">
                {location.weather.windSpeedKmh} <span className="text-xs font-normal text-slate-400">km/h</span>
              </div>
              <span className="text-[10px] text-slate-400">
                Dir: {location.weather.windDirectionCompass} ({location.weather.dispersionFactor})
              </span>
            </div>
          </div>

          {/* Secondary Pollutants Row */}
          <div className="grid grid-cols-4 gap-2 mt-4 text-center">
            <div className="p-2 rounded-lg bg-slate-950/40 border border-slate-800/60 text-xs">
              <span className="text-slate-500 block text-[10px]">NO2 (Traffic)</span>
              <div className="font-semibold text-slate-200">{location.pollutants.no2} µg/m³</div>
            </div>
            <div className="p-2 rounded-lg bg-slate-950/40 border border-slate-800/60 text-xs">
              <span className="text-slate-500 block text-[10px]">SO2 (Industrial)</span>
              <div className="font-semibold text-slate-200">{location.pollutants.so2} µg/m³</div>
            </div>
            <div className="p-2 rounded-lg bg-slate-950/40 border border-slate-800/60 text-xs">
              <span className="text-slate-500 block text-[10px]">CO (Incomplete Comb.)</span>
              <div className="font-semibold text-slate-200">{location.pollutants.co} mg/m³</div>
            </div>
            <div className="p-2 rounded-lg bg-slate-950/40 border border-slate-800/60 text-xs">
              <span className="text-slate-500 block text-[10px]">O3 (Ground Ozone)</span>
              <div className="font-semibold text-slate-200">{location.pollutants.ozone} µg/m³</div>
            </div>
          </div>

          {/* Health Advisory Text */}
          <div className="mt-4 p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-white block mb-0.5">Health Guidance ({activeAQI.category}):</strong>
              <p className="leading-relaxed">{activeAQI.healthAdvisory}</p>
            </div>
          </div>

        </div>

        {/* Biological Dose & Cigarette Equivalence Communication Aid */}
        <div className="rounded-2xl glass-panel p-6 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-rose-400">
              <Cigarette className="w-5 h-5" />
              <h3 className="font-bold text-white text-base">Educational Particulate Burden</h3>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Public communication model (Berkeley Earth empirical scaling)
            </p>

            <div className="mt-4 p-4 rounded-xl bg-rose-950/30 border border-rose-900/50 text-center">
              <span className="text-[10px] text-rose-300/80 uppercase font-semibold">24h Particulate Mass Equivalence</span>
              <div className="text-4xl font-black text-rose-400 my-1">
                {cigData.cigarettesPerDay} <span className="text-base font-normal text-rose-300">cigs / day</span>
              </div>
              <p className="text-[11px] text-rose-200/90 font-medium">
                Formula: (Ambient PM2.5 × 24h / 24) / 22 µg/m³
              </p>
            </div>

            {/* Crucial Scientific Caveat */}
            <div className="mt-3 p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-[10px] text-slate-400 leading-relaxed">
              <strong className="text-amber-400 block mb-0.5">Scientific Caveat:</strong>
              {cigData.scientificCaveat}
            </div>

            <div className="mt-3 space-y-1.5 text-xs text-slate-300">
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Mean 24h Inhaled Air:</span>
                <span className="font-semibold text-slate-200">~12 m³ (Adult)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Total Inhaled PM2.5 Mass:</span>
                <span className="font-semibold text-rose-300">~{Math.round(location.pollutants.pm25 * 12)} µg/day</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Est. Alveolar Deposited (55%):</span>
                <span className="font-semibold text-rose-400">~{Math.round(location.pollutants.pm25 * 12 * 0.55)} µg/day</span>
              </div>
            </div>
          </div>

          <button
            onClick={onNavigateToRoutine}
            className="w-full mt-4 py-2.5 px-4 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white transition flex items-center justify-center gap-2"
          >
            <ShieldAlert className="w-4 h-4" />
            Apply Shielding Routine
          </button>
        </div>

      </div>

      {/* SECTION 3: Atmospheric Inversion Intelligence (Educational Model) */}
      <div className="rounded-2xl glass-panel p-6 border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-950 text-amber-400 border border-amber-800/60">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Atmospheric Inversion & Boundary-Layer Science
                <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-slate-800 text-cyan-300">
                  Educational Model
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Understanding why winter air traps toxic pollutants near ground breathing level
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowInversionScience(!showInversionScience)}
            className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 underline self-start sm:self-auto"
          >
            {showInversionScience ? 'Hide Scientific Deep Dive' : 'Explore Atmospheric Inversion Physics'}
          </button>
        </div>

        {/* Inversion Status Summary Pill */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div>
            <span className="text-slate-400 block text-[11px]">Current Boundary Layer (PBLH):</span>
            <strong className="text-base text-amber-400">{blh} meters</strong>
            <p className="text-[10px] text-slate-500 mt-0.5">
              {blh < 200 ? 'Severe compression: all emissions trapped in thin ground layer.' : 'Moderate convective mixing layer.'}
            </p>
          </div>

          <div>
            <span className="text-slate-400 block text-[11px]">Atmospheric Stability:</span>
            <strong className="text-base text-white">{location.weather.inversionCondition}</strong>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Surface wind: {location.weather.windSpeedKmh} km/h • Pressure: {location.weather.surfacePressureHpa || 1013} hPa
            </p>
          </div>

          <div>
            <span className="text-slate-400 block text-[11px]">Surface Dispersion Index:</span>
            <strong className="text-base text-cyan-300">{location.weather.dispersionFactor}</strong>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Calculated from PBL height, surface wind shear, and diurnal solar radiation.
            </p>
          </div>
        </div>

        {/* Expandable Atmospheric Physics Deep Dive */}
        {showInversionScience && (
          <div className="p-5 rounded-2xl bg-slate-950/90 border border-cyan-800/40 text-xs text-slate-300 space-y-4">
            <h4 className="font-bold text-white text-sm">How Winter Inversions Form:</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                <strong className="text-cyan-300 block">Normal Atmosphere (Lapse Rate ~ -6.5°C/km):</strong>
                <p className="leading-relaxed">
                  Under normal conditions, air warms near the ground and cools with altitude. Warm buoyant air packets naturally rise, carrying vehicle tailpipe emissions and smoke high into the troposphere to disperse harmlessly.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-rose-950/20 border border-rose-900/40 space-y-2">
                <strong className="text-rose-300 block">Thermal Inversion (dT/dz &gt; 0):</strong>
                <p className="leading-relaxed">
                  On clear, calm winter nights, the ground loses heat rapidly via infrared radiational cooling. A cold, dense air pool forms at ground level beneath a blanket of warmer air aloft. This acts as an invisible physical lid, trapping 100% of morning smoke at head height.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400">
              <strong className="text-slate-200">Scientific Transparency Notice:</strong> Surface-based air quality sensors measure pollutant concentrations at ground level (~2–10m). Direct continuous measurement of upper-air temperature profiles requires radiosondes (weather balloons), sodar, or microwave radiometers. The boundary layer height reported above is derived from high-resolution meteorological models (ECMWF/Open-Meteo).
            </div>
          </div>
        )}
      </div>

      {/* SECTION 4: Diurnal Pollution & Ventilation Cycle */}
      <div className="rounded-2xl glass-panel p-6 border border-slate-800 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              <h3 className="text-base font-bold text-white">
                Hourly Forecast & Scientific Ventilation Suitability
              </h3>
            </div>
            <p className="text-xs text-slate-400">
              Winter pollution changes hour by hour. Click any hour to inspect boundary-layer behavior and ventilation safety.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-950/60 text-emerald-300 border border-emerald-800/40">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> Suitable Ventilation Slot
            </span>
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-950/60 text-rose-300 border border-rose-800/40">
              <span className="w-2 h-2 rounded-full bg-rose-500" /> Inversion Trap / High PM2.5
            </span>
          </div>
        </div>

        {/* Hourly Forecast Bar Timeline */}
        <div className="grid grid-cols-6 sm:grid-cols-12 lg:grid-cols-14 gap-1.5 pt-2 overflow-x-auto">
          {hourlyForecast.slice(0, 14).map((item, idx) => {
            const isSelected = idx === selectedHourIndex;
            const heightPct = Math.min(100, Math.max(20, (item.pm25 / 350) * 100));
            const isVent = item.ventilationSuitability.canVentilate;

            return (
              <button
                key={`${item.timeISO}-${idx}`}
                onClick={() => setSelectedHourIndex(idx)}
                className={`flex flex-col items-center justify-end p-2 rounded-xl border transition-all text-center min-w-[60px] ${
                  isSelected 
                    ? 'border-cyan-400 bg-cyan-950/50 shadow-md shadow-cyan-500/20 scale-105 z-10' 
                    : 'border-slate-800 bg-slate-950/50 hover:border-slate-700'
                }`}
              >
                {isVent && (
                  <span className="text-[9px] text-emerald-400 font-bold mb-1">
                    FLUSH
                  </span>
                )}

                {/* Vertical Bar */}
                <div className="w-full h-20 bg-slate-900 rounded-lg p-1 flex items-end justify-center overflow-hidden">
                  <div
                    style={{ height: `${heightPct}%` }}
                    className={`w-full rounded-md transition-all ${
                      isVent ? 'bg-gradient-to-t from-emerald-600 to-teal-400' : 'bg-gradient-to-t from-rose-700 to-amber-500'
                    }`}
                  />
                </div>

                <span className="text-[11px] font-bold text-white mt-1.5">{item.hourDisplay}</span>
                <span className="text-[10px] text-slate-400">{item.pm25} µg</span>
                <span className="text-[9px] text-amber-400/90">{item.boundaryLayerHeightM}m</span>
              </button>
            );
          })}
        </div>

        {/* Selected Hour Insight Card */}
        <div className="p-4 rounded-xl bg-slate-950/80 border border-cyan-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-cyan-400">
                At {selectedForecast.hourDisplay}:
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                selectedForecast.ventilationSuitability.canVentilate 
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' 
                  : 'bg-rose-950 text-rose-300 border border-rose-800'
              }`}>
                {selectedForecast.ventilationSuitability.canVentilate ? '✅ Suitable for 12-15m Flush' : '🚫 Keep Windows Sealed'}
              </span>
              <span className="text-slate-400">
                Boundary Layer: <strong className="text-white">{selectedForecast.boundaryLayerHeightM}m</strong>
              </span>
              <span className="text-slate-400">
                PM2.5: <strong className="text-cyan-300">{selectedForecast.pm25} µg/m³</strong>
              </span>
            </div>
            
            <p className="text-slate-300 leading-relaxed pt-0.5">
              <strong>Ventilation Analysis:</strong> {selectedForecast.ventilationSuitability.rationale}
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            {selectedForecast.ventilationSuitability.canVentilate ? (
              <button
                onClick={onNavigateToHacks}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Flush Protocol
              </button>
            ) : (
              <span className="text-xs text-rose-400 font-medium flex items-center gap-1 bg-rose-950/40 px-2.5 py-1 rounded-lg border border-rose-900/50">
                <AlertTriangle className="w-3.5 h-3.5" />
                Commute: {selectedForecast.commuteSafety}
              </span>
            )}
          </div>
        </div>

      </div>

      {/* SECTION 5: Household Vulnerability Matrix */}
      <div className="rounded-2xl glass-panel p-6 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-cyan-400">
            <HeartPulse className="w-5 h-5" />
            <h3 className="font-bold text-white text-base">
              Family Member Vulnerability Shield ({profile.name})
            </h3>
          </div>
          <span className="text-xs text-slate-400">
            Evaluated against current {location.pollutants.pm25} µg/m³ PM2.5 loading
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {profile.members.map((member) => {
            let risk = 'Moderate';
            let advice = 'Normal indoor air hygiene; use air purifier on low.';
            let badgeBg = 'bg-slate-800 text-slate-300';

            if (member.type === 'asthma_copd') {
              risk = 'HIGH BRONCHOSPASM RISK';
              advice = 'Cold acid particulates irritate hyper-reactive airways. Maintain indoor PM2.5 <15 µg/m³; rescue inhaler nearby.';
              badgeBg = 'bg-rose-950 text-rose-300 border border-rose-800';
            } else if (member.type === 'infant') {
              risk = 'DEVELOPING ALVEOLAR SENSITIVITY';
              advice = 'Immature airway clearance. Eliminate all indoor combustion (scented candles, incense); run HEPA 24/7.';
              badgeBg = 'bg-amber-950 text-amber-300 border border-amber-800';
            } else if (member.type === 'senior' || member.type === 'cardiac') {
              risk = 'VASCULAR INFLAMMATION RISK';
              advice = 'Cold + submicron particles promote autonomic imbalance and blood pressure spikes. Avoid early morning cold walks.';
              badgeBg = 'bg-purple-950 text-purple-300 border border-purple-800';
            } else if (member.type === 'child') {
              risk = 'ELEVATED METABOLIC VENTILATION';
              advice = 'Children inhale 50% more air per kg of body mass. Certified snug-fitting KF94/N95 during outdoor school runs.';
              badgeBg = 'bg-yellow-950 text-yellow-300 border border-yellow-800';
            } else if (member.type === 'pet') {
              risk = 'COAT DUST ACCUMULATION';
              advice = 'Damp-wipe fur after walks to avoid tracking outdoor street silt and tire microplastics into sleeping quarters.';
              badgeBg = 'bg-blue-950 text-blue-300 border border-blue-800';
            }

            return (
              <div key={member.id} className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-white text-sm">
                    {member.label} <span className="text-xs font-normal text-slate-400">({member.age} yrs)</span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badgeBg}`}>
                    {member.type.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
                <div className="text-[11px] font-bold text-rose-300">
                  {risk}
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {advice}
                </p>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
