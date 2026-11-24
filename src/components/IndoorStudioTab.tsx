import React, { useState } from 'react';
import type { FamilyProfile, CorsiRosenthalBoxConfig, MassBalanceSimulationParams } from '../types';
import type { IAQHack } from '../data/hacks';
import { IAQ_HACKS } from '../data/hacks';
import { 
  calculateCorsiRosenthalEngineering, 
  runMassBalanceSimulation,
  M3H_TO_CFM,
  M3_TO_FT3
} from '../utils/airCalculators';
import { 
  Box, 
  Wrench, 
  Check, 
  AlertCircle, 
  Sliders,
  TrendingDown,
  CheckCircle2
} from 'lucide-react';

interface IndoorStudioTabProps {
  profile: FamilyProfile;
  currentOutdoorPM25: number;
}

export const IndoorStudioTab: React.FC<IndoorStudioTabProps> = ({
  profile,
  currentOutdoorPM25,
}) => {
  // Room dimensions state
  const [roomLengthM, setRoomLengthM] = useState<number>(profile.housing.roomLengthM || 5.5);
  const [roomWidthM, setRoomWidthM] = useState<number>(profile.housing.roomWidthM || 4.2);
  const [roomHeightM, setRoomHeightM] = useState<number>(profile.housing.roomHeightM || 2.8);
  const roomVolumeM3 = +(roomLengthM * roomWidthM * roomHeightM).toFixed(1);
  const roomSquareMeters = +(roomLengthM * roomWidthM).toFixed(1);

  // Corsi-Rosenthal Box Config State
  const [crConfig, setCrConfig] = useState<CorsiRosenthalBoxConfig>({
    fanSizeInches: 20,
    fanCfm: 1200,
    fanPowerWatts: 65,
    hasShroud: true,
    filterCount: 4,
    filterDimensionsInches: '20x20x2',
    filterMervRating: 'MERV 13',
    roomSquareMeters,
    ceilingHeightMeters: roomHeightM,
    targetACH: 5.0,
  });

  // Dynamic Mass-Balance Simulator State
  const [simOutdoorPM25, setSimOutdoorPM25] = useState<number>(currentOutdoorPM25 || 120);
  const [simInitialPM25, setSimInitialPM25] = useState<number>(Math.round((currentOutdoorPM25 || 120) * 0.7));
  const [simACHDraft, setSimACHDraft] = useState<number>(
    profile.housing.windowDraftiness === 'sealed' ? 0.3 : (profile.housing.windowDraftiness === 'high_leaks' ? 1.4 : 0.7)
  );
  const [simPenetration, setSimPenetration] = useState<number>(
    profile.housing.windowDraftiness === 'sealed' ? 0.55 : 0.78
  );
  const [simCADRM3h, setSimCADRM3h] = useState<number>(profile.airPurifierCADR || 350);
  const [simDepositionRate] = useState<number>(0.25);
  const [simEmissionSource, setSimEmissionSource] = useState<'none' | 'cooking_fry' | 'candle_incense' | 'custom'>('none');
  const [customEmissionUgH] = useState<number>(0);

  // Selected Hack Modal View
  const [selectedHack, setSelectedHack] = useState<IAQHack | null>(null);
  const [hackCategoryFilter, setHackCategoryFilter] = useState<string>('all');

  // Emission rate calculation (ug/hr)
  let emissionRateUgH = 0;
  if (simEmissionSource === 'cooking_fry') emissionRateUgH = 6500; // Searing/frying release
  else if (simEmissionSource === 'candle_incense') emissionRateUgH = 3200; // Incense/candle smoke
  else if (simEmissionSource === 'custom') emissionRateUgH = customEmissionUgH;

  // Run dynamic mass-balance simulation
  const simParams: MassBalanceSimulationParams = {
    outdoorPM25: simOutdoorPM25,
    initialIndoorPM25: simInitialPM25,
    roomVolumeM3,
    effectiveCADRM3h: simCADRM3h,
    airExchangeRateACH: simACHDraft,
    penetrationFactor: simPenetration,
    particleDepositionRate: simDepositionRate,
    indoorGenerationRateUgH: emissionRateUgH,
    simulationDurationMinutes: 180,
  };

  const simResult = runMassBalanceSimulation(simParams);

  // Run CR Box Engineering specs
  const crSpecs = calculateCorsiRosenthalEngineering({
    ...crConfig,
    roomSquareMeters,
    ceilingHeightMeters: roomHeightM,
  });

  const filteredHacks = hackCategoryFilter === 'all'
    ? IAQ_HACKS
    : IAQ_HACKS.filter(h => h.category === hackCategoryFilter);

  // SVG Chart Dimensions
  const chartWidth = 560;
  const chartHeight = 160;
  const maxPMInPlot = Math.max(simOutdoorPM25, simInitialPM25, simResult.steadyStateIndoorPM25, 60) * 1.15;
  
  const pointsString = simResult.timeSeries.map((pt) => {
    const x = (pt.timeMinutes / 180) * chartWidth;
    const y = chartHeight - (pt.indoorPM25 / maxPMInPlot) * chartHeight;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  return (
    <div className="space-y-8">
      
      {/* Studio Header Card */}
      <div className="rounded-2xl glass-panel p-6 border border-slate-800 bg-gradient-to-r from-slate-900/90 via-cyan-950/20 to-slate-900/90">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-950 text-cyan-300 border border-cyan-800">
            Aerosol Fluid Dynamics Studio
          </span>
          <span className="text-xs text-slate-400">
            Mass-Balance Modeling & DIY Air Cleaner Engineering
          </span>
        </div>
        <h2 className="text-2xl font-black text-white mt-1">
          Indoor Air Quality Studio & Corsi-Rosenthal Laboratory
        </h2>
        <p className="text-xs text-slate-300 max-w-2xl mt-1">
          Indoor pollution is governed by physical mass conservation. Model outdoor infiltration, internal emissions, particle settling, and effective CADR filtration with mathematical rigor.
        </p>

        {/* Room Dimensions Banner */}
        <div className="mt-4 p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="font-bold text-white">Target Room Dimensions:</span>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Length:</span>
              <input
                type="number"
                min={2}
                max={25}
                step={0.1}
                value={roomLengthM}
                onChange={(e) => setRoomLengthM(Number(e.target.value))}
                className="w-16 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-cyan-300 font-mono"
              />
              <span className="text-slate-400">m</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Width:</span>
              <input
                type="number"
                min={2}
                max={25}
                step={0.1}
                value={roomWidthM}
                onChange={(e) => setRoomWidthM(Number(e.target.value))}
                className="w-16 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-cyan-300 font-mono"
              />
              <span className="text-slate-400">m</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Height:</span>
              <input
                type="number"
                min={2.0}
                max={6.0}
                step={0.1}
                value={roomHeightM}
                onChange={(e) => setRoomHeightM(Number(e.target.value))}
                className="w-16 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-cyan-300 font-mono"
              />
              <span className="text-slate-400">m</span>
            </div>
          </div>

          <div className="flex items-center gap-3 text-slate-300">
            <span>Area: <strong className="text-white">{roomSquareMeters} m²</strong> ({Math.round(roomSquareMeters * 10.76)} sq ft)</span>
            <span>•</span>
            <span>Volume V: <strong className="text-cyan-400">{roomVolumeM3} m³</strong> ({Math.round(roomVolumeM3 * M3_TO_FT3)} ft³)</span>
          </div>
        </div>
      </div>

      {/* SECTION 1: Mass-Balance Time-Dependent Simulation & Graph */}
      <div className="rounded-2xl glass-panel p-6 border border-slate-800 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Sliders className="w-5 h-5 text-cyan-400" />
              Dynamic Indoor PM2.5 Mass-Balance Simulation
            </h3>
            <p className="text-xs text-slate-400">
              dC/dt = P·λ·C_out + S/V - (λ + k + CADR/V)·C (Peer-reviewed single compartment model)
            </p>
          </div>

          <span className={`px-3 py-1 rounded-xl text-xs font-black border ${
            simResult.protectiveGrade === 'A+' || simResult.protectiveGrade === 'A'
              ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
              : simResult.protectiveGrade === 'B'
              ? 'bg-cyan-950 text-cyan-400 border-cyan-800'
              : 'bg-rose-950 text-rose-400 border-rose-800'
          }`}>
            Airway Shield Grade: {simResult.protectiveGrade}
          </span>
        </div>

        {/* Dynamic Simulation Controls Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          
          {/* Outdoor PM2.5 */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-400">Outdoor PM2.5 (C_out)</span>
              <strong className="text-rose-400">{simOutdoorPM25} µg/m³</strong>
            </div>
            <input
              type="range"
              min={10}
              max={550}
              step={5}
              value={simOutdoorPM25}
              onChange={(e) => setSimOutdoorPM25(Number(e.target.value))}
              className="w-full accent-rose-400 cursor-pointer"
            />
          </div>

          {/* Starting Indoor PM2.5 */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-400">Initial Indoor PM2.5 (C_0)</span>
              <strong className="text-amber-400">{simInitialPM25} µg/m³</strong>
            </div>
            <input
              type="range"
              min={5}
              max={400}
              step={5}
              value={simInitialPM25}
              onChange={(e) => setSimInitialPM25(Number(e.target.value))}
              className="w-full accent-amber-400 cursor-pointer"
            />
          </div>

          {/* Air Purifier CADR */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-400">Effective Purifier CADR</span>
              <strong className="text-cyan-400">{simCADRM3h} m³/h ({Math.round(simCADRM3h * M3H_TO_CFM)} CFM)</strong>
            </div>
            <input
              type="range"
              min={0}
              max={1200}
              step={25}
              value={simCADRM3h}
              onChange={(e) => setSimCADRM3h(Number(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer"
            />
          </div>

          {/* Air Exchange Rate (lambda) */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-400">Air Exchange (λ)</span>
              <strong className="text-slate-200">{simACHDraft} ACH</strong>
            </div>
            <select
              value={simACHDraft}
              onChange={(e) => {
                const val = Number(e.target.value);
                setSimACHDraft(val);
                setSimPenetration(val <= 0.3 ? 0.55 : (val <= 0.7 ? 0.75 : 0.90));
              }}
              className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-white"
            >
              <option value={0.25}>Tight Sealed Sash (0.25 ACH)</option>
              <option value={0.5}>Standard Window (0.50 ACH)</option>
              <option value={1.0}>Moderate Draft Leaks (1.0 ACH)</option>
              <option value={2.5}>Window Cracked Open (2.5 ACH)</option>
            </select>
          </div>

          {/* Indoor Emission Source */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2 sm:col-span-2">
            <div className="flex justify-between">
              <span className="text-slate-400">Indoor Emission Source (S)</span>
              <strong className="text-amber-300">{emissionRateUgH} µg/hr</strong>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setSimEmissionSource('none')}
                className={`py-1.5 px-2 rounded-lg border text-center transition ${
                  simEmissionSource === 'none' ? 'bg-cyan-950 border-cyan-400 text-cyan-200' : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}
              >
                Zero Indoor Flames
              </button>
              <button
                type="button"
                onClick={() => setSimEmissionSource('cooking_fry')}
                className={`py-1.5 px-2 rounded-lg border text-center transition ${
                  simEmissionSource === 'cooking_fry' ? 'bg-rose-950 border-rose-400 text-rose-200' : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}
              >
                Searing / Frying Plume
              </button>
              <button
                type="button"
                onClick={() => setSimEmissionSource('candle_incense')}
                className={`py-1.5 px-2 rounded-lg border text-center transition ${
                  simEmissionSource === 'candle_incense' ? 'bg-amber-950 border-amber-400 text-amber-200' : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}
              >
                Incense / Candle Smoke
              </button>
            </div>
          </div>

          {/* Penetration & Deposition Summary */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 sm:col-span-2 flex items-center justify-between">
            <div>
              <span className="text-slate-400 block text-[11px]">Penetration Factor P:</span>
              <strong className="text-white">{simPenetration}</strong>
              <span className="text-[10px] text-slate-500 block">Fraction penetrating crack envelopes</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Deposition Rate k:</span>
              <strong className="text-white">{simDepositionRate} hr⁻¹</strong>
              <span className="text-[10px] text-slate-500 block">Natural gravitational settling</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Total Loss Rate L:</span>
              <strong className="text-cyan-400">{simResult.totalLossRatePerHr} hr⁻¹</strong>
              <span className="text-[10px] text-slate-500 block">λ + k + (CADR/V)</span>
            </div>
          </div>

        </div>

        {/* Time-Dependent SVG Decay Curve */}
        <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-white flex items-center gap-1.5">
              <TrendingDown className="w-4 h-4 text-cyan-400" />
              Time-Dependent Indoor Concentration Trajectory C(t) [0 to 180 Minutes]
            </span>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1 text-cyan-300">
                <span className="w-3 h-0.5 bg-cyan-400 inline-block" /> Indoor PM2.5
              </span>
              <span className="flex items-center gap-1 text-rose-400">
                <span className="w-3 h-0.5 bg-rose-500 border-t border-dashed inline-block" /> Outdoor PM2.5 ({simOutdoorPM25})
              </span>
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="w-3 h-0.5 bg-emerald-400 inline-block" /> Steady State ({simResult.steadyStateIndoorPM25})
              </span>
            </div>
          </div>

          {/* SVG Canvas */}
          <div className="w-full bg-slate-900/90 rounded-xl p-4 overflow-hidden border border-slate-800 relative">
            <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-44 overflow-visible">
              {/* Grid Lines */}
              <line x1="0" y1={chartHeight * 0.25} x2={chartWidth} y2={chartHeight * 0.25} stroke="#334155" strokeDasharray="3,3" opacity="0.4" />
              <line x1="0" y1={chartHeight * 0.50} x2={chartWidth} y2={chartHeight * 0.50} stroke="#334155" strokeDasharray="3,3" opacity="0.4" />
              <line x1="0" y1={chartHeight * 0.75} x2={chartWidth} y2={chartHeight * 0.75} stroke="#334155" strokeDasharray="3,3" opacity="0.4" />

              {/* Outdoor PM2.5 Reference Line */}
              <line
                x1="0"
                y1={chartHeight - (simOutdoorPM25 / maxPMInPlot) * chartHeight}
                x2={chartWidth}
                y2={chartHeight - (simOutdoorPM25 / maxPMInPlot) * chartHeight}
                stroke="#f43f5e"
                strokeWidth="1.5"
                strokeDasharray="4,4"
              />

              {/* Steady State PM2.5 Line */}
              <line
                x1="0"
                y1={chartHeight - (simResult.steadyStateIndoorPM25 / maxPMInPlot) * chartHeight}
                x2={chartWidth}
                y2={chartHeight - (simResult.steadyStateIndoorPM25 / maxPMInPlot) * chartHeight}
                stroke="#10b981"
                strokeWidth="1.5"
                strokeDasharray="3,3"
              />

              {/* Dynamic Decay Polyline */}
              <polyline
                fill="none"
                stroke="#06b6d4"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={pointsString}
              />

              {/* 90% Clean Marker Circle */}
              <circle
                cx={Math.min(chartWidth - 5, (simResult.timeTo90PercentCleanMinutes / 180) * chartWidth)}
                cy={chartHeight - (simResult.steadyStateIndoorPM25 / maxPMInPlot) * chartHeight}
                r="4.5"
                fill="#06b6d4"
                stroke="#fff"
                strokeWidth="1.5"
              />
            </svg>

            {/* Time Axis Labels */}
            <div className="flex justify-between text-[10px] text-slate-500 pt-1 font-mono">
              <span>0 min (C_0 = {simInitialPM25})</span>
              <span>30 min</span>
              <span>60 min</span>
              <span>90 min</span>
              <span>120 min</span>
              <span>150 min</span>
              <span>180 min (C_ss = {simResult.steadyStateIndoorPM25})</span>
            </div>
          </div>

          {/* Model Output Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs pt-1">
            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-slate-400 block text-[11px]">Steady-State PM2.5:</span>
              <strong className="text-lg text-cyan-300 font-bold">{simResult.steadyStateIndoorPM25} µg/m³</strong>
              <span className="text-[10px] text-slate-500">AQI: {simResult.steadyStateIndoorAQI}</span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-slate-400 block text-[11px]">Infiltration Cut:</span>
              <strong className="text-lg text-emerald-400 font-bold">-{simResult.infiltrationCutPercentage}%</strong>
              <span className="text-[10px] text-slate-500">vs Outdoor air</span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-slate-400 block text-[11px]">Time to 90% Clean:</span>
              <strong className="text-lg text-amber-300 font-bold">{simResult.timeTo90PercentCleanMinutes} mins</strong>
              <span className="text-[10px] text-slate-500">t_90 = 2.303 / L</span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-slate-400 block text-[11px]">Effective Filtration:</span>
              <strong className="text-lg text-white font-bold">{(simCADRM3h / roomVolumeM3).toFixed(1)} ACH</strong>
              <span className="text-[10px] text-slate-500">CADR / Room Volume</span>
            </div>
          </div>
        </div>

      </div>

      {/* SECTION 2: The Corsi-Rosenthal Box Interactive Engineering Calculator */}
      <div className="rounded-2xl glass-panel p-6 border border-slate-800 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-950 text-cyan-400 border border-cyan-800/60">
              <Box className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">
                Corsi-Rosenthal Box DIY Clean Air Scrubber Calculator
              </h3>
              <p className="text-xs text-slate-400">
                Created by aerosol researchers Dr. Richard Corsi & Jim Rosenthal
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="px-3 py-1 rounded-full font-bold bg-emerald-950/70 text-emerald-400 border border-emerald-800/60">
              Save ₹{crSpecs.savingsINR.toLocaleString()} ($ {crSpecs.savingsUSD}) vs Commercial HEPA
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Controls Column (7 cols) */}
          <div className="lg:col-span-7 space-y-4 text-xs">
            
            {/* Fan Free-Air CFM & Power */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-slate-300 font-medium block mb-1">Fan Nominal Free-Air CFM</label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={400}
                    max={2200}
                    step={50}
                    value={crConfig.fanCfm}
                    onChange={(e) => setCrConfig({ ...crConfig, fanCfm: Number(e.target.value) })}
                    className="flex-1 accent-cyan-400 cursor-pointer"
                  />
                  <strong className="text-cyan-300 font-mono w-20 text-right">{crConfig.fanCfm} CFM</strong>
                </div>
                <span className="text-[10px] text-slate-500">Standard 20" Box Fan: ~1200 CFM (Med), ~1800 CFM (High)</span>
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">Filter Media Rating</label>
                <select
                  value={crConfig.filterMervRating}
                  onChange={(e) => setCrConfig({ ...crConfig, filterMervRating: e.target.value as CorsiRosenthalBoxConfig['filterMervRating'] })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white"
                >
                  <option value="MERV 13">MERV 13 (Recommended: ~85% on 0.3-1um, lowest drag)</option>
                  <option value="MERV 14">MERV 14 (~90% PM2.5 efficiency)</option>
                  <option value="MERV 16">MERV 16 (~95% PM2.5 efficiency)</option>
                  <option value="HEPA">True HEPA (99.97% - higher pressure drop caveat)</option>
                </select>
              </div>
            </div>

            {/* Filter Count & Shroud */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-slate-300 font-medium block mb-1">Cube Geometry</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCrConfig({ ...crConfig, filterCount: 4 })}
                    className={`p-2 rounded-lg border text-left transition ${
                      crConfig.filterCount === 4 ? 'bg-cyan-950 border-cyan-400 text-cyan-200' : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <div className="font-bold">4-Filter Cube</div>
                    <div className="text-[10px] text-slate-500">4 vertical sides</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCrConfig({ ...crConfig, filterCount: 5 })}
                    className={`p-2 rounded-lg border text-left transition ${
                      crConfig.filterCount === 5 ? 'bg-cyan-950 border-cyan-400 text-cyan-200' : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <div className="font-bold">5-Filter Tower</div>
                    <div className="text-[10px] text-slate-500">+Bottom filter on feet</div>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">Cardboard Donut Shroud</label>
                <label className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-950 border border-slate-800 cursor-pointer text-slate-200">
                  <input
                    type="checkbox"
                    checked={crConfig.hasShroud}
                    onChange={(e) => setCrConfig({ ...crConfig, hasShroud: e.target.checked })}
                    className="accent-cyan-400 rounded"
                  />
                  <span>Installed 15" Donut Shroud (+18% CADR)</span>
                </label>
                <span className="text-[10px] text-slate-500">Stops air vortex recirculating backwards at blade tips.</span>
              </div>
            </div>

            {/* Target ACH Slider */}
            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>Target Air Changes per Hour (ACH)</span>
                <strong className="text-emerald-400 font-mono">{crConfig.targetACH} ACH (Clean Room Baseline)</strong>
              </div>
              <input
                type="range"
                min={3}
                max={8}
                step={0.5}
                value={crConfig.targetACH}
                onChange={(e) => setCrConfig({ ...crConfig, targetACH: Number(e.target.value) })}
                className="w-full accent-emerald-400 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500">
                Harvard School of Public Health & CDC recommend 5–6 ACH in indoor living spaces during high viral/smog episodes.
              </span>
            </div>

            {/* Engineering Assumptions Checklist */}
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 space-y-1">
              <strong className="text-slate-300 block mb-1">Engineering Model Assumptions:</strong>
              {crSpecs.assumptions.map((ass, i) => (
                <div key={i} className="flex items-start gap-1.5">
                  <span className="text-cyan-400">•</span>
                  <span>{ass}</span>
                </div>
              ))}
            </div>

          </div>

          {/* Results & Sizing Metric Output (5 cols) */}
          <div className="lg:col-span-5 flex flex-col justify-between p-5 rounded-2xl bg-slate-950 border border-cyan-800/40 text-xs">
            <div className="space-y-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 block">
                Calculated Clean Air Delivery
              </span>

              {/* Main CADR Deliverable */}
              <div className="p-4 rounded-xl bg-cyan-950/40 border border-cyan-800/60 text-center">
                <div className="text-3xl font-black text-cyan-300">
                  {crSpecs.effectiveCADR_CFM} <span className="text-base font-normal text-slate-400">CFM</span>
                </div>
                <div className="text-xs text-cyan-200 mt-0.5 font-mono">
                  ({crSpecs.effectiveCADR_M3H} m³/h Clean Air Rate)
                </div>
              </div>

              {/* Delivered Room ACH */}
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Delivered Room ACH:</span>
                  <span className={`text-xl font-black ${crSpecs.targetAchMet ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {crSpecs.deliveredACH} ACH
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-1.5 text-xs">
                  {crSpecs.targetAchMet ? (
                    <span className="text-emerald-300 font-semibold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Exceeds target of {crConfig.targetACH} ACH in {crSpecs.roomVolumeM3} m³!
                    </span>
                  ) : (
                    <span className="text-amber-300 font-semibold flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> High room volume; construct 2 units or add 5th filter.
                    </span>
                  )}
                </div>
              </div>

              {/* BOM Cost in INR & USD vs Commercial */}
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">DIY Bill of Materials:</span>
                  <strong className="text-white">₹{crSpecs.totalCostINR.toLocaleString()} (~${crSpecs.totalCostUSD} USD)</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Commercial Purifier Equiv.:</span>
                  <span className="text-slate-400 line-through">₹{crSpecs.commercialHepaPriceINR.toLocaleString()} (~${crSpecs.commercialHepaPriceUSD} USD)</span>
                </div>
                <div className="flex justify-between py-1 text-emerald-400 font-bold">
                  <span>Net Household Savings:</span>
                  <span>₹{crSpecs.savingsINR.toLocaleString()} (80% cheaper)</span>
                </div>
              </div>
            </div>

            {/* Quick apply button to mass-balance simulator */}
            <button
              onClick={() => setSimCADRM3h(crSpecs.effectiveCADR_M3H)}
              className="mt-4 w-full py-2 px-3 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white transition flex items-center justify-center gap-1.5 shadow"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Apply CR Box CADR ({crSpecs.effectiveCADR_M3H} m³/h) to Room Simulator Above
            </button>
          </div>

        </div>
      </div>

      {/* SECTION 3: 7 Science-Backed Indoor Air Quality Blueprints */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Wrench className="w-5 h-5 text-amber-400" />
              Science-Backed Indoor Air Quality Blueprints
            </h3>
            <p className="text-xs text-slate-400">
              Rigorous aerosol physics applied to household comfort and lung protection
            </p>
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs pb-1">
            {[
              { id: 'all', label: 'All Blueprints' },
              { id: 'diy_purification', label: 'DIY Purifiers' },
              { id: 'filter_maintenance', label: 'Filter Maintenance' },
              { id: 'draft_proofing', label: 'Draft Proofing' },
              { id: 'cooking_exhaust', label: 'Kitchen Smog' },
              { id: 'cleaning_habits', label: 'Cleaning' },
              { id: 'humidity_plants', label: 'Humidity & Plants' },
            ].map(cat => (
              <button
                key={cat.id}
                onClick={() => setHackCategoryFilter(cat.id)}
                className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition ${
                  hackCategoryFilter === cat.id
                    ? 'bg-cyan-600 text-white'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Hacks Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredHacks.map(hack => (
            <div
              key={hack.id}
              className="rounded-2xl p-5 glass-panel border border-slate-800 hover:border-cyan-500/50 transition-all flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-800 text-cyan-300">
                    {hack.difficulty}
                  </span>
                  <span className="text-[11px] font-semibold text-emerald-400">
                    {hack.costLevel}
                  </span>
                </div>

                <h4 className="font-bold text-white text-base">
                  {hack.title}
                </h4>

                <div className="text-xs font-semibold text-cyan-400/90">
                  ⚡ {hack.cadrOrImpact}
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  {hack.summary}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-800/80">
                <button
                  onClick={() => setSelectedHack(hack)}
                  className="w-full py-2 px-3 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 transition flex items-center justify-center gap-1.5"
                >
                  <Wrench className="w-3.5 h-3.5 text-cyan-400" />
                  View Blueprint & Steps
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Selected Hack Modal View */}
      {selectedHack && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">
                  IAQ Science Blueprint
                </span>
                <h3 className="text-lg font-bold text-white mt-0.5">{selectedHack.title}</h3>
              </div>
              <button
                onClick={() => setSelectedHack(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-800"
              >
                ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs text-slate-300">
              {/* Scientific Mechanism */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                <strong className="text-cyan-300 text-sm block mb-1">Aerosol Physics Behind This:</strong>
                <p className="leading-relaxed text-slate-300">{selectedHack.scientificMechanism}</p>
              </div>

              {/* Equipment Needed */}
              <div>
                <strong className="text-white text-xs block mb-1.5">Required Materials & Tools:</strong>
                <div className="flex flex-wrap gap-1.5">
                  {selectedHack.equipmentNeeded.map((eq, i) => (
                    <span key={i} className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 text-xs border border-slate-700">
                      ✓ {eq}
                    </span>
                  ))}
                </div>
              </div>

              {/* Step by Step */}
              <div>
                <strong className="text-white text-xs block mb-2">Step-by-Step Execution Protocol:</strong>
                <ol className="space-y-2 list-decimal list-inside text-slate-200">
                  {selectedHack.stepByStep.map((step, idx) => (
                    <li key={idx} className="leading-relaxed pl-1">
                      {step}
                    </li>
                  ))}
                </ol>
              </div>

              {/* Common Pitfalls */}
              <div className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-900/40">
                <strong className="text-rose-400 text-xs block mb-1">Common Pitfalls to Avoid:</strong>
                <ul className="space-y-1 list-disc list-inside text-rose-200/90">
                  {selectedHack.commonPitfalls.map((pitfall, idx) => (
                    <li key={idx}>{pitfall}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-950 flex justify-end">
              <button
                onClick={() => setSelectedHack(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
