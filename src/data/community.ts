import type { CommunityReport } from '../types';

export const INITIAL_COMMUNITY_REPORTS: CommunityReport[] = [
  {
    id: 'rep-1',
    timestamp: '28 mins ago',
    type: 'open_burning',
    title: 'Municipal sweeping leaf & plastic burning near Sector 4 Colony Gate',
    description: 'Ground maintenance crew lit 3 large smoldering piles of dry leaves and plastic wrappers. Heavy acrid smoke dispersing toward apartment playground at child breathing height.',
    locationName: 'Sector 4 Colony, Near Park East Perimeter',
    city: 'Delhi NCR',
    severity: 'severe',
    verifiedCount: 14,
    actionTakenStatus: 'Authorities Dispatched',
    isOfficialVerification: true,
  },
  {
    id: 'rep-2',
    timestamp: '1 hour ago',
    type: 'idling_fleet',
    title: 'Commercial school bus fleet idling in residential lane with heater on',
    description: '6 commercial diesel buses idling continuously for 35 minutes outside colony gate before morning pickup, creating a dense exhaust cloud trapped beneath morning inversion.',
    locationName: 'Oakwood Avenue & 14th Cross Corridor',
    city: 'Hyderabad',
    severity: 'high',
    verifiedCount: 9,
    actionTakenStatus: 'Community Investigating',
    isOfficialVerification: false,
  },
  {
    id: 'rep-3',
    timestamp: '3 hours ago',
    type: 'construction_dust',
    title: 'Uncovered demolition aggregate pile with dry mechanical stone cutting',
    description: 'Construction site operating without required anti-smog mist water cannon or geotextile green screens. High silica particulate cloud blowing onto main road.',
    locationName: 'Phase II Commercial Corridor, Sector 12',
    city: 'Visakhapatnam',
    severity: 'high',
    verifiedCount: 19,
    actionTakenStatus: 'Reported',
    isOfficialVerification: true,
  },
  {
    id: 'rep-4',
    timestamp: '5 hours ago',
    type: 'clean_air_shelter',
    title: 'Community Public Library opened as Free Verified Clean Air Shelter',
    description: 'Equipped with 6 industrial HEPA purifiers maintaining indoor PM2.5 < 12 µg/m³. Free filtered haven for senior citizens, asthmatics, and students during high smog hours (08:00 - 20:00).',
    locationName: 'Central District Library, Reading Hall 2',
    city: 'Delhi NCR',
    severity: 'moderate',
    verifiedCount: 42,
    actionTakenStatus: 'Resolved',
    isOfficialVerification: true,
  },
  {
    id: 'rep-5',
    timestamp: '6 hours ago',
    type: 'diesel_generator',
    title: 'Unvented commercial diesel generator running without acoustic/emission scrubbers',
    description: 'Commercial complex running 250 kVA backup diesel genset with rooftop exhaust discharging directly against adjoining apartment balconies.',
    locationName: 'Banjara Hills Road No. 3 Junction',
    city: 'Hyderabad',
    severity: 'severe',
    verifiedCount: 16,
    actionTakenStatus: 'Community Investigating',
    isOfficialVerification: false,
  }
];

export interface CleanAirPact {
  id: string;
  title: string;
  description: string;
  participantsCount: number;
  preventedDailyPM25Grams: number;
  co2SavedKg: number;
  category: 'transit' | 'heating' | 'waste' | 'school';
}

export const COMMUNITY_PACTS: CleanAirPact[] = [
  {
    id: 'pact-carpool',
    title: 'Neighbourhood School Run Carpool Circle',
    description: 'Replace 40 individual morning vehicle trips with 8 coordinated carpool clusters with vehicle AC set to internal recirculation and certified N95 masks.',
    participantsCount: 142,
    preventedDailyPM25Grams: 320,
    co2SavedKg: 185,
    category: 'school',
  },
  {
    id: 'pact-no-leaf-burn',
    title: 'Zero Open Burning: Community Garden Mulch Collective',
    description: 'Collect winter dried leaves for community trench composting and municipal bio-mulching pits instead of lighting roadside smoldering fires.',
    participantsCount: 318,
    preventedDailyPM25Grams: 890,
    co2SavedKg: 420,
    category: 'waste',
  },
  {
    id: 'pact-delivery-bundling',
    title: 'Collective "Green Tuesday & Friday" Delivery Consolidation',
    description: 'Apartment complex bundles e-commerce and grocery deliveries into 2 coordinated windows per week, eliminating 70% of courier motorcycle cold starts in colony lanes.',
    participantsCount: 205,
    preventedDailyPM25Grams: 160,
    co2SavedKg: 95,
    category: 'transit',
  },
  {
    id: 'pact-clean-night-heat',
    title: 'Night Security Guard Clean Electric Heating Drive',
    description: 'Sponsor oil-filled electric radiant heaters and heavy windproof thermal cabins for residential security guards, eliminating roadside scrap-wood and plastic warming fires.',
    participantsCount: 88,
    preventedDailyPM25Grams: 540,
    co2SavedKg: 210,
    category: 'heating',
  }
];

export interface SustainableHeatingComparison {
  technology: string;
  costToRun: string;
  costToRunINR: string;
  indoorPM25Risk: 'Zero Emission' | 'Low' | 'Dangerous' | 'Severe Hazard';
  directEmissions: string;
  upstreamEmissions: string;
  carbonFootprint: string;
  energyEfficiency: string;
  bestFor: string;
  pros: string;
  cons: string;
}

export const HEATING_ALTERNATIVES: SustainableHeatingComparison[] = [
  {
    technology: 'Air-Source Heat Pump / Inverter AC in Heating Mode',
    costToRun: '$0.08 - $0.14 / hr',
    costToRunINR: '₹7 - ₹12 / hr',
    indoorPM25Risk: 'Zero Emission',
    directEmissions: 'Zero (0 g PM2.5, 0 ppm CO, 0 ppb NO2 at breathing height)',
    upstreamEmissions: 'Low-to-Moderate (depends on grid fuel mix; ~220-300g CO2/kWh on coal-heavy grid)',
    carbonFootprint: 'Lowest lifecycle emissions due to thermodynamic multiplication',
    energyEfficiency: '300% – 400% COP (Delivers 3.5 kW heat per 1 kW electricity)',
    bestFor: 'Modern apartments and houses with inverter ACs installed',
    pros: 'Zero combustion inside or outside living space; recirculates and filters room air; extracts ambient warmth even in 5°C winter cold.',
    cons: 'Higher initial purchase cost if not already installed; heating mode requires reverse-cycle inverter unit.'
  },
  {
    technology: 'Oil-Filled Electric Radiant Radiator / Quartz Radiant Heater',
    costToRun: '$0.18 - $0.30 / hr',
    costToRunINR: '₹14 - ₹24 / hr',
    indoorPM25Risk: 'Zero Emission',
    directEmissions: 'Zero direct indoor particulate or combustion gases',
    upstreamEmissions: 'Grid-dependent: In India coal grid, ~710g CO2/kWh upstream at power plant',
    carbonFootprint: 'Moderate (zero local smog; upstream emissions subject to grid transition)',
    energyEfficiency: '100% thermodynamic conversion of electrical energy into radiant heat',
    bestFor: 'Bedrooms, nurseries, elderly rooms, night security guard cabins',
    pros: 'Silent, completely sealed radiant surface; does not blow dust or dry out sensitive nasal mucosal membranes like fan blowers.',
    cons: 'Radiator takes 15 minutes to reach full thermal equilibrium; requires continuous electrical supply.'
  },
  {
    technology: 'Induction Electric Stovetop / Cooking Range',
    costToRun: '$0.06 - $0.12 / meal',
    costToRunINR: '₹5 - ₹10 / meal',
    indoorPM25Risk: 'Zero Emission',
    directEmissions: 'Zero direct combustion emissions (only aerosol generated from cooking oil itself)',
    upstreamEmissions: '~710g CO2/kWh on Indian national grid, dropping as solar/nuclear share rises',
    carbonFootprint: 'Significantly lower total life-cycle footprint than piped gas or coal',
    energyEfficiency: '84% – 90% direct electromagnetic pan heating efficiency',
    bestFor: 'All daily household cooking, frying, boiling, and water heating',
    pros: 'Eliminates open flame combustion gases (NO2, CO, benzene); cools down instantly; easy to wipe clean; no unburned fuel leakage.',
    cons: 'Requires ferromagnetic (cast iron / stainless steel) cookware; dependent on stable electricity.'
  },
  {
    technology: 'Piped Natural Gas (PNG) / Domestic LPG Cylinder',
    costToRun: '$0.12 - $0.22 / hr',
    costToRunINR: '₹10 - ₹18 / hr',
    indoorPM25Risk: 'Low',
    directEmissions: 'Direct indoor NO2 (50-200 ppb), CO, unburned methane, and ultrafine particles if unvented',
    upstreamEmissions: 'Fossil gas extraction, refining, pressurization, and cylinder distribution logistics',
    carbonFootprint: 'Fossil fuel: produces ~2.3 kg CO2 per kg LPG burned',
    energyEfficiency: '40% – 55% thermal transfer to cookware (excess heat escapes into room)',
    bestFor: 'Households with high-velocity ducted range hood exhaust venting outdoors',
    pros: 'Established supply chain throughout urban India; high immediate flame temperature; works during power outages.',
    cons: 'Without strong ducted range hoods, indoor NO2 easily exceeds WHO limits within 20 minutes of burner operation.'
  },
  {
    technology: 'Unvented Kerosene Stove / Portable Kerosene Heater',
    costToRun: '$0.25 - $0.45 / hr',
    costToRunINR: '₹20 - ₹38 / hr',
    indoorPM25Risk: 'Dangerous',
    directEmissions: 'Heavy soot, sulfur oxides (SO2), carbon monoxide (CO), aromatic hydrocarbons',
    upstreamEmissions: 'Petroleum refining and distribution',
    carbonFootprint: 'High local and global carbon footprint',
    energyEfficiency: 'Variable; low combustion efficiency produces heavy soot',
    bestFor: 'STRICTLY AVOID INSIDE LIVING QUARTERS',
    pros: 'High raw heat output without electricity.',
    cons: 'Releases combustion products directly into breathing air; high risk of acute carbon monoxide poisoning and child respiratory distress.'
  },
  {
    technology: 'Traditional Biomass Chulha / Firewood / Coal Angithi',
    costToRun: 'Low financial cost (often collected wood/dung/scrap)',
    costToRunINR: '₹0 - ₹10 / day (severe health cost)',
    indoorPM25Risk: 'Severe Hazard',
    directEmissions: 'Catastrophic: Indoor PM2.5 often spikes to 800–2,500 µg/m³ with heavy Benzo[a]pyrene',
    upstreamEmissions: 'Direct black carbon soot and deforestation impact',
    carbonFootprint: 'Extreme climate-forcing black carbon and carbon monoxide',
    energyEfficiency: '8% – 15% (85%+ of fuel energy wasted in smoke and thermal loss)',
    bestFor: 'MUST BE PHASED OUT WITH UJJWALA / INDUCTION SUPPORT',
    pros: 'Utilizes zero-cost agricultural residues and dried cowdung cakes.',
    cons: 'Single hour of burning produces particulate dose equivalent to multiple packs of cigarettes; primary driver of chronic obstructive pulmonary disease in non-smoking rural/urban fringe women and children.'
  }
];
