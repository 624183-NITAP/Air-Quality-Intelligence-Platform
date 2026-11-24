import React, { useState } from 'react';
import { HEATING_ALTERNATIVES } from '../data/community';
import { 
  Flame, 
  Leaf, 
  Zap, 
  AlertTriangle, 
  CheckCircle2, 
  ShieldCheck,
  PackageCheck,
  Fuel,
  Info
} from 'lucide-react';

export const CleanHeatTab: React.FC = () => {
  const [selectedCurrency, setSelectedCurrency] = useState<'INR' | 'USD'>('INR');

  return (
    <div className="space-y-8">
      
      {/* Header Card */}
      <div className="rounded-2xl glass-panel p-6 border border-slate-800 bg-gradient-to-r from-slate-900/90 via-cyan-950/20 to-slate-900/90 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-950 text-cyan-300 border border-cyan-800">
                Atmospheric Decarbonization Guide
              </span>
              <span className="text-xs text-slate-400">
                Zero-Combustion Living
              </span>
            </div>
            <h2 className="text-2xl font-black text-white mt-1">
              Clean Heating, Cooking Alternatives & Waste Mulching
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl mt-1 leading-relaxed">
              During winter atmospheric inversions, surface emissions cannot escape vertically. Eliminating open fires, unvented kerosene, and solid biomass chulhas is the single most potent intervention to clear neighborhood air.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl p-1 shrink-0 self-start sm:self-auto">
            <span className="text-[11px] text-slate-400 px-2 font-medium">Currency:</span>
            <button
              onClick={() => setSelectedCurrency('INR')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                selectedCurrency === 'INR' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              INR (₹)
            </button>
            <button
              onClick={() => setSelectedCurrency('USD')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                selectedCurrency === 'USD' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              USD ($)
            </button>
          </div>
        </div>

        {/* Upstream vs Direct Emissions Science Callout */}
        <div className="mt-5 p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex items-start gap-3 text-xs text-slate-300">
          <Info className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <strong className="text-white">Scientific Principle: Direct Breathing-Zone Emissions vs. Upstream Grid Emissions</strong>
            <p className="leading-relaxed text-slate-300">
              In urban smog navigation, we must separate <em>direct household emissions</em> (released at breathing height in living rooms and residential lanes) from <em>upstream emissions</em> (released at distant thermal power stations). While India's electricity grid currently emits approximately <strong>~710 g CO₂ / kWh</strong> from coal, switching from wood or kerosene to electric heat pumps and induction stoves immediately eliminates 100% of direct household PM2.5, NO₂, and CO from children's airways!
            </p>
          </div>
        </div>
      </div>

      {/* SECTION 1: Heating & Cooking Technology Comparison Matrix */}
      <div className="rounded-2xl glass-panel p-6 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Flame className="w-5 h-5 text-amber-400" />
              Heating & Cooking Technology Comparison Matrix
            </h3>
            <p className="text-xs text-slate-400">
              Evaluating direct particulate risks, thermodynamic efficiency, and complete energy pathways
            </p>
          </div>
        </div>

        <div className="space-y-3.5">
          {HEATING_ALTERNATIVES.map((alt, idx) => {
            let riskBadge = 'bg-emerald-950 text-emerald-300 border-emerald-800';
            if (alt.indoorPM25Risk === 'Dangerous') riskBadge = 'bg-rose-950 text-rose-300 border-rose-800';
            if (alt.indoorPM25Risk === 'Severe Hazard') riskBadge = 'bg-red-950 text-red-300 border-red-700 animate-pulse';
            if (alt.indoorPM25Risk === 'Low') riskBadge = 'bg-cyan-950 text-cyan-300 border-cyan-800';

            return (
              <div
                key={idx}
                className="p-5 rounded-2xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-cyan-400">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-white">{alt.technology}</h4>
                      <span className="text-[11px] text-slate-400">{alt.bestFor}</span>
                    </div>
                  </div>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full border ${riskBadge} self-start sm:self-auto`}>
                    Indoor Risk: {alt.indoorPM25Risk}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800/80">
                    <span className="text-slate-400 block mb-0.5">Operating Cost</span>
                    <strong className="text-white text-sm">
                      {selectedCurrency === 'INR' ? alt.costToRunINR : alt.costToRun}
                    </strong>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800/80">
                    <span className="text-slate-400 block mb-0.5">Thermodynamic Efficiency</span>
                    <strong className="text-cyan-300">{alt.energyEfficiency}</strong>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800/80">
                    <span className="text-slate-400 block mb-0.5">Direct Emissions (Breathing Zone)</span>
                    <strong className="text-emerald-300">{alt.directEmissions}</strong>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800/80">
                    <span className="text-slate-400 block mb-0.5">Upstream Lifecycle Impact</span>
                    <strong className="text-slate-300">{alt.upstreamEmissions}</strong>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 text-xs text-slate-300">
                  <div className="flex items-start gap-2 p-2.5 rounded-xl bg-emerald-950/20 border border-emerald-900/30">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong>Advantages:</strong> {alt.pros}</span>
                  </div>
                  <div className="flex items-start gap-2 p-2.5 rounded-xl bg-rose-950/20 border border-rose-900/30">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <span><strong>Drawbacks & Hazards:</strong> {alt.cons}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 2: Zero-Waste Leaf & Biomass Mulching Collective */}
      <div className="rounded-2xl glass-panel p-6 border border-slate-800 space-y-4">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Leaf className="w-5 h-5 text-emerald-400" />
            The Zero-Burning Bio-Mulch Protocol
          </h3>
          <p className="text-xs text-slate-400">
            Why sweeping and burning winter fallen leaves poisons neighborhood air, and how to mulch instead
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs text-slate-300">
          
          <div className="p-5 rounded-2xl bg-rose-950/20 border border-rose-900/40 space-y-3">
            <h4 className="font-bold text-rose-300 text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              The Hidden Toxicology of Smoldering Roadside Leaf Piles
            </h4>
            <p className="leading-relaxed">
              When dry winter leaves, twigs, and plastic litter are swept into roadside piles and lit, they smolder at low temperatures (300°C–500°C) under oxygen-starved conditions.
            </p>
            <ul className="space-y-1.5 list-disc list-inside text-rose-200">
              <li>Releases heavy plumes of <strong>Benzo[a]pyrene</strong> and Polycyclic Aromatic Hydrocarbons (PAHs).</li>
              <li>Generates up to <strong>40 times more particulate per kilogram</strong> than an efficient wood combustion stove.</li>
              <li>Because the nocturnal inversion cap sits at 100m–200m, this toxic smoke cannot rise and lingers directly at stroller and child breathing height (0.6m - 1.2m).</li>
            </ul>
          </div>

          <div className="p-5 rounded-2xl bg-emerald-950/20 border border-emerald-800/40 space-y-3">
            <h4 className="font-bold text-emerald-300 text-sm flex items-center gap-2">
              <Leaf className="w-4 h-4 text-emerald-400" />
              The Neighborhood Soil Regeneration Protocol
            </h4>
            <p className="leading-relaxed">
              Fallen deciduous leaves represent nutrient-dense organic carbon that can regenerate degraded urban soil and conserve soil moisture:
            </p>
            <ul className="space-y-1.5 list-disc list-inside text-emerald-200">
              <li><strong>Trench Composting:</strong> Dig a 1-foot trench in garden borders; pack tightly with fallen leaves and cover with soil. Decomposes into dark organic loam by springtime.</li>
              <li><strong>Sheet Mulching:</strong> Spread a 3-inch layer of crushed leaves around trees and flowerbeds to protect root systems from winter frost and suppress weeds without chemicals.</li>
              <li><strong>Municipal Biochar / Composting:</strong> Coordinate with residential RWAs for designated green waste bags picked up by municipal composting plants.</li>
            </ul>
          </div>

        </div>
      </div>

      {/* SECTION 3: Eco-Lifestyle Micro-Hacks for Indian Neighborhoods */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        <div className="p-5 rounded-2xl glass-panel border border-slate-800 space-y-2.5">
          <div className="p-2.5 rounded-xl bg-teal-950 text-teal-400 w-fit border border-teal-800">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h4 className="font-bold text-white text-sm">Community Guard Heating</h4>
          <p className="text-xs text-slate-300 leading-relaxed">
            Support residential night security guards by sponsoring windproof thermal cabins and radiant electric quartz/carbon heaters. Eliminates roadside wood and plastic warming fires during cold night shifts.
          </p>
        </div>

        <div className="p-5 rounded-2xl glass-panel border border-slate-800 space-y-2.5">
          <div className="p-2.5 rounded-xl bg-cyan-950 text-cyan-400 w-fit border border-cyan-800">
            <PackageCheck className="w-5 h-5" />
          </div>
          <h4 className="font-bold text-white text-sm">Delivery Consolidation</h4>
          <p className="text-xs text-slate-300 leading-relaxed">
            Consolidate your online grocery and e-commerce orders into 1 or 2 weekly delivery days. Eliminates 70% of delivery motorbike cold-starts and idling in narrow residential lanes.
          </p>
        </div>

        <div className="p-5 rounded-2xl glass-panel border border-slate-800 space-y-2.5">
          <div className="p-2.5 rounded-xl bg-amber-950 text-amber-400 w-fit border border-amber-800">
            <Fuel className="w-5 h-5" />
          </div>
          <h4 className="font-bold text-white text-sm">Cold Engine Micro-Trips</h4>
          <p className="text-xs text-slate-300 leading-relaxed">
            During the first 5 minutes of vehicle operation in winter, catalytic converters are cold and emit 80% of total trip particulate. Avoid cold car trips under 2 km; walk or take electric transit!
          </p>
        </div>

      </div>

    </div>
  );
};
