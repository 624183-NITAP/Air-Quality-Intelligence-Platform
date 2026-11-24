import React, { useState, useEffect } from 'react';
import type { FamilyProfile, RoutineItem, LocationData } from '../types';
import { getPersonalizedRoutines } from '../data/routines';
import confetti from 'canvas-confetti';
import { 
  CheckCircle2, 
  Circle, 
  Sparkles, 
  Clock, 
  ShieldCheck, 
  Users2, 
  Leaf, 
  ArrowRight
} from 'lucide-react';

interface DailyRoutineTabProps {
  profile: FamilyProfile;
  location: LocationData;
  onNavigateToHacks: () => void;
  onAskAI: (query: string) => void;
}

export const DailyRoutineTab: React.FC<DailyRoutineTabProps> = ({
  profile,
  location,
  onAskAI,
}) => {
  const [calculationData, setCalculationData] = useState(() => 
    getPersonalizedRoutines(profile, location.pollutants.pm25)
  );
  const [routines, setRoutines] = useState<RoutineItem[]>(calculationData.routines);

  useEffect(() => {
    const calc = getPersonalizedRoutines(profile, location.pollutants.pm25);
    setCalculationData(calc);
    setRoutines(calc.routines);
  }, [profile, location]);

  const toggleComplete = (id: string) => {
    const next = routines.map(r => {
      if (r.id === id) {
        const updated = !r.completed;
        if (updated) {
          try {
            confetti({
              particleCount: 40,
              spread: 60,
              origin: { y: 0.7 }
            });
          } catch {}
        }
        return { ...r, completed: updated };
      }
      return r;
    });
    setRoutines(next);
  };

  const completedCount = routines.filter(r => r.completed).length;
  const progressPct = Math.round((completedCount / routines.length) * 100);

  // Cumulative community savings from checked routines
  const totalPM25Avoided = routines
    .filter(r => r.completed)
    .reduce((acc, curr) => acc + curr.communityEmissionPreventedGramsPM25, 0);

  const totalCO2Saved = routines
    .filter(r => r.completed)
    .reduce((acc, curr) => acc + curr.co2SavedKg, 0);

  // Realized personal exposure cut based on completed routines
  const realizedExposureCut = completedCount > 0
    ? Math.round(routines.filter(r => r.completed).reduce((acc, curr) => acc + curr.personalExposureCutPct, 0) / completedCount)
    : 0;

  return (
    <div className="space-y-6">
      
      {/* Dynamic Routine Impact Header Card */}
      <div className="rounded-2xl glass-panel p-6 border border-slate-800 bg-gradient-to-r from-slate-900/90 via-cyan-950/20 to-slate-900/90 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-950 text-cyan-300 border border-cyan-800">
                Science-Backed Lifestyle Model
              </span>
              <span className="text-xs text-slate-400">
                Personalized for {profile.name} • {location.city}
              </span>
            </div>
            <h2 className="text-2xl font-black text-white mt-1">
              Personalized Low-Emission Daily Schedule
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl mt-1">
              Timing daily habits around atmospheric boundary-layer height reduces family inhalation dose while eliminating direct tailpipe and domestic emissions from your neighborhood air shed.
            </p>
          </div>

          {/* Action Progress Meter */}
          <div className="flex items-center gap-4 bg-slate-950/80 border border-slate-800/80 p-3.5 rounded-2xl shrink-0">
            <div className="text-center">
              <div className="text-2xl font-black text-cyan-400">{progressPct}%</div>
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Active</div>
            </div>
            <div className="w-24 bg-slate-800 rounded-full h-2.5 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-cyan-500 to-emerald-400 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <div className="text-xs text-slate-300">
              <span className="font-bold text-white">{completedCount}</span> / {routines.length} Shifts
            </div>
          </div>
        </div>

        {/* Transparent Baseline vs Optimized Routine Comparison */}
        <div className="mt-5 p-4 rounded-xl bg-slate-950 border border-cyan-800/40 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center text-xs">
          <div>
            <span className="text-slate-400 block text-[11px]">Conventional 24h Mean Dose:</span>
            <strong className="text-lg text-rose-400 mt-0.5 block">{calculationData.baselineDailyMeanUgM3} µg/m³</strong>
            <span className="text-[10px] text-slate-500">Uncontrolled exposure</span>
          </div>

          <div>
            <span className="text-slate-400 block text-[11px]">AeroPulse 24h Mean Dose:</span>
            <strong className="text-lg text-emerald-400 mt-0.5 block">{calculationData.optimizedDailyMeanUgM3} µg/m³</strong>
            <span className="text-[10px] text-slate-500">With micro-shifts active</span>
          </div>

          <div>
            <span className="text-slate-400 block text-[11px]">Potential Exposure Cut:</span>
            <strong className="text-lg text-cyan-300 mt-0.5 block">-{calculationData.overallExposureReductionPct}%</strong>
            <span className="text-[10px] text-slate-500">Calculated mass balance</span>
          </div>

          <div>
            <span className="text-slate-400 block text-[11px]">Daily Inhaled Mass Prevented:</span>
            <strong className="text-lg text-amber-300 mt-0.5 block">~{calculationData.dailyAvoidedInhaledMassUg} µg</strong>
            <span className="text-[10px] text-slate-500">Kept out of family lungs</span>
          </div>
        </div>

        {/* Realized Cumulative Impact Scoreboard */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-800/80">
          <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/60 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-950 text-emerald-400 border border-emerald-800/50">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] text-slate-400 font-medium">Realized Dose Reduction</span>
              <div className="text-lg font-bold text-emerald-400">
                {realizedExposureCut > 0 ? `-${realizedExposureCut}% Exposure Cut` : 'Select active habits below'}
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/60 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-950 text-cyan-400 border border-cyan-800/50">
              <Users2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] text-slate-400 font-medium">Neighbourhood PM2.5 Prevented</span>
              <div className="text-lg font-bold text-cyan-300">
                {totalPM25Avoided > 0 ? `${totalPM25Avoided} grams PM2.5` : '0 grams'}
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/60 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-teal-950 text-teal-400 border border-teal-800/50">
              <Leaf className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] text-slate-400 font-medium">Carbon Emissions Saved</span>
              <div className="text-lg font-bold text-teal-300">
                {totalCO2Saved > 0 ? `${totalCO2Saved.toFixed(1)} kg CO2` : '0.0 kg'}
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Routine Timeline Cards */}
      <div className="space-y-4">
        {routines.map((routine) => {
          const isDone = routine.completed;

          return (
            <div
              key={routine.id}
              className={`rounded-2xl p-5 border transition-all ${
                isDone
                  ? 'bg-slate-950/80 border-emerald-800/60 shadow-md shadow-emerald-950/30'
                  : 'glass-panel border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                
                {/* Left Section: Time, Phase, Title, Checkbox */}
                <div className="flex items-start gap-3.5 flex-1">
                  <button
                    onClick={() => toggleComplete(routine.id)}
                    className="mt-0.5 text-slate-500 hover:text-emerald-400 transition shrink-0"
                    title={isDone ? 'Mark Incomplete' : 'Mark Completed'}
                  >
                    {isDone ? (
                      <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                    ) : (
                      <Circle className="w-6 h-6 text-slate-600 hover:text-cyan-400" />
                    )}
                  </button>

                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-800 text-cyan-300">
                        <Clock className="w-3 h-3" />
                        {routine.timeSlot}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">
                        {routine.phase}
                      </span>
                      {isDone && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800">
                          Active Habit
                        </span>
                      )}
                    </div>

                    <h3 className={`text-base font-bold text-white ${isDone ? 'line-through text-slate-400' : ''}`}>
                      {routine.title}
                    </h3>

                    {/* Conventional vs Low-Emission Shift Comparison with Transparent Numbers */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 text-xs">
                      <div className="p-3 rounded-xl bg-rose-950/20 border border-rose-900/30">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400">
                            Conventional Practice
                          </span>
                          <span className="font-mono text-rose-300 font-bold text-[11px]">
                            ~{routine.conventionalExposureUgM3} µg/m³
                          </span>
                        </div>
                        <p className="text-rose-200/90 leading-relaxed">
                          {routine.conventionalAction}
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-800/40">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">
                            AeroPulse Micro-Shift
                          </span>
                          <span className="font-mono text-emerald-300 font-bold text-[11px]">
                            ~{routine.optimizedExposureUgM3} µg/m³
                          </span>
                        </div>
                        <p className="text-cyan-100 font-medium leading-relaxed">
                          {routine.lowEmissionShift}
                        </p>
                      </div>
                    </div>

                    {/* Indoor Air Hack & Scientific Reason */}
                    <div className="pt-2 space-y-1.5 text-xs">
                      <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 text-slate-300 flex items-start gap-2">
                        <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-amber-300">Indoor Physics Hack:</strong> {routine.indoorAirHack}
                        </div>
                      </div>

                      <p className="text-slate-400 text-[11px] leading-relaxed">
                        <strong className="text-slate-300">Scientific Rationale:</strong> {routine.scientificRationale}
                      </p>
                    </div>

                  </div>
                </div>

                {/* Right Section: Impact Stats & AI Context Button */}
                <div className="flex flex-row md:flex-col items-center md:items-end justify-between gap-3 pt-2 md:pt-0 border-t md:border-t-0 border-slate-800/80 shrink-0">
                  <div className="text-left md:text-right space-y-1 text-xs">
                    <div className="font-black text-emerald-400 text-sm">
                      -{routine.personalExposureCutPct}% Exposure
                    </div>
                    {routine.communityEmissionPreventedGramsPM25 > 0 && (
                      <div className="text-[11px] text-cyan-300">
                        Prevents {routine.communityEmissionPreventedGramsPM25}g PM2.5
                      </div>
                    )}
                    {routine.co2SavedKg > 0 && (
                      <div className="text-[11px] text-teal-300">
                        Saves {routine.co2SavedKg}kg CO2
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => onAskAI(`How should our family implement "${routine.title}" given we have ${profile.members.length} members in a ${profile.housing.type} with ${location.pollutants.pm25} µg/m³ PM2.5?`)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition flex items-center gap-1"
                  >
                    Ask AI Details
                    <ArrowRight className="w-3 h-3 text-cyan-400" />
                  </button>
                </div>

              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};
