import React from 'react';
import type { FamilyProfile, LocationData } from '../types';
import { X, Printer, ShieldCheck, AlertTriangle, Wind, HeartPulse, Activity, AlertCircle } from 'lucide-react';
import { calculateCigaretteEquivalence } from '../utils/airCalculators';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface FamilyActionPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: FamilyProfile;
  location: LocationData;
}

export const FamilyActionPlanModal: React.FC<FamilyActionPlanModalProps> = ({
  isOpen,
  onClose,
  profile,
  location,
}) => {
  const trapRef = useFocusTrap<HTMLDivElement>({ isOpen, onClose });

  if (!isOpen) return null;

  const cigData = calculateCigaretteEquivalence(location.pollutants.pm25);
  const indAqi = location.calculatedAQI?.indianNAQI?.value ?? 150;
  const indCat = location.calculatedAQI?.indianNAQI?.category ?? 'Severe';
  const pblHeight = location.weather.boundaryLayerHeightMeters ?? 220;
  const generationDate = React.useMemo(() => new Date().toLocaleDateString(), []);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="action-plan-modal-title"
    >
      <div 
        ref={trapRef}
        className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[94vh] flex flex-col shadow-2xl focus:outline-none"
        tabIndex={-1}
      >
        
        {/* Header (Screen only) */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-cyan-400" />
            <div>
              <h3 id="action-plan-modal-title" className="font-bold text-white text-base">Printable Family Clean Air Action Plan</h3>
              <p className="text-xs text-slate-400">Emergency Smog Escalation & Inversion Protocol</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white flex items-center gap-1.5 shadow-md shadow-cyan-600/20 transition focus-visible:ring-2 focus-visible:ring-cyan-400"
              aria-label="Print or save protocol as PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              Print / Save as PDF
            </button>
            <button 
              onClick={onClose} 
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition focus-visible:ring-2 focus-visible:ring-cyan-400"
              aria-label="Close action plan dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-slate-200 bg-slate-950 print:bg-white print:text-black print:p-8 print:overflow-visible">
          
          {/* Header Banner */}
          <div className="border-b-2 border-cyan-500 pb-4 flex flex-col sm:flex-row justify-between items-start gap-4">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-cyan-400 print:text-cyan-800">
                AeroPulse 2.0 Atmospheric Environmental Protocol
              </div>
              <h1 className="text-2xl font-black text-white print:text-black mt-0.5">
                {profile.name} — Winter Smog Defense Plan
              </h1>
              <p className="text-xs text-slate-400 print:text-gray-600 mt-1">
                Location: <strong>{location.city}, {location.country}</strong> ({location.latitude.toFixed(2)}°N, {location.longitude.toFixed(2)}°E) • Generated {generationDate}
              </p>
            </div>
            <div className="text-left sm:text-right p-3 rounded-xl bg-slate-900 border border-slate-800 print:border-gray-400 print:bg-gray-100">
              <div className="text-xs font-bold text-rose-400 print:text-red-700">
                CURRENT AQI: {indAqi} ({indCat})
              </div>
              <div className="text-[11px] text-slate-400 print:text-gray-700 mt-0.5">
                PM2.5: <strong>{location.pollutants.pm25} µg/m³</strong> | PBL: <strong>{pblHeight}m</strong>
              </div>
              <div className="text-[10px] text-slate-500 print:text-gray-600">
                Equiv. Inhaled Proxy: ~{cigData.cigarettesPerDay} cigs/day
              </div>
            </div>
          </div>

          {/* Section 1: Household Vulnerability Roster */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-cyan-400 print:text-cyan-800 mb-2.5 flex items-center gap-1.5">
              <HeartPulse className="w-4 h-4" />
              1. Household Vulnerability & Health Shield Roster
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {profile.members.map((m) => (
                <div key={m.id} className="p-3 rounded-xl border border-slate-800 print:border-gray-300 bg-slate-900/60 print:bg-gray-50">
                  <div className="flex justify-between font-bold text-white print:text-black">
                    <span>{m.label} ({m.age} yrs)</span>
                    <span className="text-cyan-400 print:text-cyan-700 capitalize font-mono text-[11px]">
                      {m.type.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 print:text-gray-700 mt-1.5">
                    <strong>Specific Directives:</strong> {m.specialNotes || 'Wear certified N95 during all outdoor transits; maintain indoor Clean Room haven.'}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Section 2: 3-Tier Emergency Escalation Matrix */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-cyan-400 print:text-cyan-800 mb-2.5 flex items-center gap-1.5">
              <Activity className="w-4 h-4" />
              2. Three-Tier Smog Severity Escalation Protocol
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              
              <div className="p-3 rounded-xl border border-amber-900/40 bg-amber-950/20 print:border-amber-300 print:bg-amber-50 space-y-1.5">
                <span className="font-bold text-amber-400 print:text-amber-800 block text-[11px]">
                  TIER 1: MODERATE / POOR (AQI 100-250)
                </span>
                <p className="text-[11px] text-slate-300 print:text-gray-800">
                  • Shift physical exercise to enclosed gym or living room.<br />
                  • Asthmatics & seniors keep rescue inhalers within arm's reach.<br />
                  • Engage car internal recirculation.<br />
                  • Run bedroom air purifier on medium.
                </p>
              </div>

              <div className="p-3 rounded-xl border border-rose-900/40 bg-rose-950/20 print:border-rose-300 print:bg-rose-50 space-y-1.5">
                <span className="font-bold text-rose-400 print:text-rose-800 block text-[11px]">
                  TIER 2: VERY POOR (AQI 251-380)
                </span>
                <p className="text-[11px] text-slate-300 print:text-gray-800">
                  • Children wear fitted KF94/N95 masks on school run.<br />
                  • Strictly seal windows during morning inversion (06:00-09:30).<br />
                  • Limit cooking to rear burners with ducted exhaust.<br />
                  • Execute 12-min flush only during midday solar peak.
                </p>
              </div>

              <div className="p-3 rounded-xl border border-red-900/60 bg-red-950/30 print:border-red-400 print:bg-red-100 space-y-1.5">
                <span className="font-bold text-red-400 print:text-red-900 block text-[11px]">
                  TIER 3: SEVERE / HAZARDOUS (AQI 381+)
                </span>
                <p className="text-[11px] text-slate-300 print:text-gray-900">
                  • Emergency clean room lockdown.<br />
                  • Cancel all outdoor sports and non-essential travel.<br />
                  • Double mask or fit-tested N95 respirator mandatory.<br />
                  • Purifiers running 24/7 on maximum boost speed.
                </p>
              </div>

            </div>
          </div>

          {/* Section 3: Daily Diurnal Schedule DOs & DONTs */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-cyan-400 print:text-cyan-800 mb-2.5 flex items-center gap-1.5">
              <Wind className="w-4 h-4" />
              3. Diurnal Atmospheric Inversion Windows (DOs & DONTs)
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              
              <div className="p-3.5 rounded-xl border border-rose-900/40 bg-rose-950/20 print:border-red-300 print:bg-red-50">
                <span className="font-bold text-rose-400 print:text-red-700 block mb-1.5 flex items-center gap-1.5 text-xs">
                  <AlertTriangle className="w-4 h-4" /> BANNED INVERSION WINDOWS (05:00 - 09:30 & 18:00 - 22:00)
                </span>
                <ul className="space-y-1 text-slate-300 print:text-gray-800 list-disc list-inside text-[11px]">
                  <li><strong>NEVER open exterior windows or doors.</strong> Trapped toxic smog rushes inside.</li>
                  <li>Postpone outdoor jogging, cycling, or morning walks.</li>
                  <li>In transit: set vehicle ventilation to <strong>Internal Recirculation</strong>.</li>
                  <li>Children must wear certified, snug KF94/N95 respirators with pinched metal nose-strip.</li>
                </ul>
              </div>

              <div className="p-3.5 rounded-xl border border-emerald-900/40 bg-emerald-950/20 print:border-green-300 print:bg-green-50">
                <span className="font-bold text-emerald-400 print:text-green-700 block mb-1.5 flex items-center gap-1.5 text-xs">
                  <Wind className="w-4 h-4" /> CONDITIONAL MIDDAY FLUSH WINDOW (12:30 - 14:00 PM)
                </span>
                <ul className="space-y-1 text-slate-300 print:text-gray-800 list-disc list-inside text-[11px]">
                  <li>Solar radiation temporarily elevates boundary layer height to disperse surface soot.</li>
                  <li>Check live PM2.5: only open if outdoor air has dropped below 150 µg/m³.</li>
                  <li>Flush cross-ventilation for <strong>exactly 12 to 15 minutes</strong> to purge CO2.</li>
                  <li>Close windows completely, then run air cleaners on BOOST for 20 minutes.</li>
                </ul>
              </div>

            </div>
          </div>

          {/* Section 4: Clean Bedroom Haven Rules */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-cyan-400 print:text-cyan-800 mb-2 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              4. Clean Room Haven & Indoor Engineering Rules
            </h2>
            <div className="p-3.5 rounded-xl border border-slate-800 print:border-gray-300 bg-slate-900/40 print:bg-gray-50 text-xs space-y-2 text-slate-300 print:text-gray-800">
              <p>• <strong>Clean Haven Isolation:</strong> Seal bedroom door thresholds with silicone draft snakes. Run purifier (CADR ≥ {(profile.airPurifierCADR || 300)} m³/h) continuously to maintain PM2.5 &lt; 15 µg/m³.</p>
              <p>• <strong>Cooking Protocols:</strong> Engage range hood 2 minutes BEFORE lighting flames. Cook on rear burners. Crack only the kitchen window 2 inches for makeup air.</p>
              <p>• <strong>Resuspension Defense:</strong> Prohibit dry sweeping or feather dusters. Use damp microfiber cloths with water & vinegar.</p>
              <p>• <strong>Combustion Ban:</strong> Strictly prohibit agarbatti (incense sticks), dhoop, scented paraffin candles, and open heating fires inside living quarters.</p>
            </div>
          </div>

          {/* Section 5: Medical Disclaimer & Contacts */}
          <div className="p-3.5 rounded-xl border border-slate-800 print:border-gray-300 bg-slate-900/60 print:bg-gray-100 text-xs text-slate-400 print:text-gray-700 space-y-2">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-300 print:text-black">Scientific & Medical Limitation Notice:</strong>
                <p className="text-[11px] mt-0.5 leading-relaxed">
                  AeroPulse 2.0 provides environmental monitoring data, aerosol physics mass-balance simulations, and engineering guidance. It is not a clinical medical diagnostic tool and does not replace professional medical advice, diagnosis, or treatment. Always follow your pulmonologist's individualized asthma action plan. In case of severe respiratory distress (stridor, cyanosis, chest retractions), seek emergency pediatric or hospital care immediately.
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800/80 print:border-gray-300 flex flex-col sm:flex-row justify-between text-[11px] text-slate-500 print:text-gray-600 gap-1">
              <div>
                <strong>Emergency Helpline:</strong> National Emergency 112 (India) / 911 (US) • Local Ambulance 102
              </div>
              <div>
                <strong>AeroPulse 2.0:</strong> Calibrated for Winter Atmospheric Inversions
              </div>
            </div>
          </div>

        </div>

        {/* Footer (Screen only) */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex justify-between items-center print:hidden">
          <span className="text-xs text-slate-400">
            Click 'Print / Save as PDF' to generate a physical protocol for refrigerator or school bag.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
