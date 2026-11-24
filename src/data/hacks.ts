export interface IAQHack {
  id: string;
  category: 'diy_purification' | 'draft_proofing' | 'cooking_exhaust' | 'cleaning_habits' | 'humidity_plants' | 'filter_maintenance';
  title: string;
  difficulty: 'Easy (5 mins)' | 'Moderate (20 mins)' | 'Advanced DIY';
  costLevel: '$ (Under $15)' | '$$ ($20 - $50)' | '$$$ ($60+)';
  cadrOrImpact: string;
  summary: string;
  scientificMechanism: string;
  stepByStep: string[];
  commonPitfalls: string[];
  equipmentNeeded: string[];
}

export const IAQ_HACKS: IAQHack[] = [
  {
    id: 'corsi-rosenthal-box',
    category: 'diy_purification',
    title: 'The Corsi-Rosenthal DIY Air Scrubber',
    difficulty: 'Moderate (20 mins)',
    costLevel: '$$ ($20 - $50)',
    cadrOrImpact: 'Delivers 450 - 650 CFM CADR (Equivalent to $600 commercial HEPA units)',
    summary: 'A viral, open-source clean air engineering marvel using a 20-inch box fan and 4 MERV 13 furnace filters taped into a cube.',
    scientificMechanism: 'By creating a 4-sided cube, filter surface area increases by 400% compared to a single flat filter. This drops air resistance (static pressure), allowing the fan to pull massive CFM whisper-quietly while capturing >85% of PM2.5 and aerosol droplets on every pass.',
    stepByStep: [
      'Lay a 20" x 20" cardboard square on the floor as the bottom base.',
      'Arrange 4 MERV-13 filters (20" x 20" x 1" or 2") around the edges, arrows pointing INWARD toward the center.',
      'Tape the filter vertical seams securely using duct tape or painters tape, ensuring an airtight box.',
      'Tape the bottom cardboard base to seal all bottom gaps.',
      'Place a 20" box fan on top, blowing UPWARD into the room (arrows facing up).',
      'Cut a cardboard circular shroud (donut shape with a 15" hole) and tape it over the fan face: this prevents air vortex backflow at blade tips, increasing clean air output by 18-20%!'
    ],
    commonPitfalls: [
      'Putting filters on backwards (look for airflow arrow pointing INTO the box).',
      'Leaving corner gaps untaped (unfiltered dirty air will short-circuit through cracks).',
      'Using low-grade MERV 8 filters (which only catch hair, not toxic submicron PM2.5).'
    ],
    equipmentNeeded: ['1x 20-inch Box Fan', '4x MERV 13 Filters (20"x20")', '1x Duct Tape Roll', '1x Cardboard Box for base & shroud']
  },
  {
    id: 'filter-maintenance-protocol',
    category: 'filter_maintenance',
    title: 'Filter Maintenance & Static Pressure Management',
    difficulty: 'Easy (5 mins)',
    costLevel: '$ (Under $15)',
    cadrOrImpact: 'Preserves 90% of CADR over 6 months & prevents fan motor burnout',
    summary: 'A disciplined protocol for inspecting, vacuuming pre-filters, and replacing pleated MERV/HEPA filters.',
    scientificMechanism: 'As particulate builds up on filter fibers, interstitial pore space narrows. While collection efficiency initially rises, aerodynamic resistance (static pressure) escalates exponentially. When pressure drop doubles, box fan airflow collapses by over 40%, slashing CADR while overheating fan coils.',
    stepByStep: [
      'Every 2 weeks: Gently vacuum the exterior pre-filter mesh or nylon screen using a brush attachment to remove lint and pet hair.',
      'Never wash or wet pleated MERV 13/HEPA paper media: water permanently collapses electrostatic electret charge and destroys submicron fiber matrix.',
      'Inspect filter pleats using a flashlight: if media is dark grey/black throughout depth or airflow feels restricted, replace filters.',
      'In severe winter smog (AQI > 300), Corsi-Rosenthal boxes typically run 5 to 7 months before replacement is required (due to the enormous 4-filter surface area).'
    ],
    commonPitfalls: [
      'Washing pleated paper filters under water (destroys filtration matrix permanently).',
      'Running clogged filters past 9 months in high smog (overheats motor and reduces airflow).'
    ],
    equipmentNeeded: ['HEPA vacuum with soft brush attachment', 'Flashlight', 'Replacement MERV 13 filters']
  },
  {
    id: 'bubble-wrap-insulation',
    category: 'draft_proofing',
    title: 'Double-Glazing Hack: Static Window Bubble Barrier',
    difficulty: 'Easy (5 mins)',
    costLevel: '$ (Under $15)',
    cadrOrImpact: 'Cuts winter window draft leakage by 40% & saves 15% heating loss',
    summary: 'A non-permanent, zero-residue technique to seal drafty single-pane windows against cold air infiltration and smog ingress.',
    scientificMechanism: 'The trapped air pockets in standard packaging bubble wrap act as insulating thermal dead-air cavities (similar to double glazing), preventing convection currents and cold boundary layer air suction through leaky window sashes.',
    stepByStep: [
      'Clean the interior glass pane with a damp microfiber cloth to remove dust.',
      'Spray a fine mist of clean tap water directly onto the glass pane.',
      'Take cut-to-size packing bubble wrap (bubbles facing the glass) and press firmly against the moist window.',
      'Surface tension holds the wrap securely for months without glue or tape!',
      'Apply peelable silicone weatherstripping cord along window frame cracks for a zero-leak seal.'
    ],
    commonPitfalls: [
      'Using tape that peels off frame paint.',
      'Bubbles facing away from glass (they must face glass so surface tension locks them).'
    ],
    equipmentNeeded: ['Standard bubble wrap roll', 'Spray bottle with tap water', 'Scissors / Utility knife', 'Silicone weatherstrip tape']
  },
  {
    id: 'kitchen-exhaust-physics',
    category: 'cooking_exhaust',
    title: 'Stovetop Negative Pressure & Oil Smoke Control',
    difficulty: 'Easy (5 mins)',
    costLevel: '$ (Under $15)',
    cadrOrImpact: 'Prevents 85% of indoor ultrafine cooking PM2.5 from reaching bedrooms',
    summary: 'Optimize kitchen fluid dynamics to trap cooking VOCs, acrolein, and combustion byproducts before they contaminate living rooms.',
    scientificMechanism: 'Combustion burners and searing oils create buoyant thermal plumes that travel at 0.5 m/s upwards. If a range hood lacks sufficient capture velocity or runs on recirculating charcoal with clogged pads, the plume bounces off ceilings and disseminates throughout the home.',
    stepByStep: [
      'Turn on exhaust hood 2 minutes BEFORE heating pan: this initiates chimney draw.',
      'Crack a kitchen-only window 2 inches open to provide replacement makeup air, preventing the exhaust fan from pulling toxic air backwards through hallway cracks.',
      'Use back stove burners whenever possible (range hoods capture 30% more plume from rear burners).',
      'Substitute deep frying with covered steaming, braising, or induction boiling during high smog days.',
      'Never allow oil to reach smoke point (use avocado or refined oils above 240°C or switch to water-sautéing).'
    ],
    commonPitfalls: [
      'Keeping kitchen doors wide open while cooking in a sealed winter apartment.',
      'Using unvented gas burners without range exhaust (produces massive NO2 spikes).'
    ],
    equipmentNeeded: ['Pot covers / splat screens', 'High smoke point oil / steamer', 'Exhaust timer']
  },
  {
    id: 'damp-dusting-protocol',
    category: 'cleaning_habits',
    title: 'Microfiber Damp-Dusting vs Dry Resuspension',
    difficulty: 'Easy (5 mins)',
    costLevel: '$ (Under $15)',
    cadrOrImpact: 'Eliminates 92% of floor dust resuspension spikes during cleaning',
    summary: 'Never dry-sweep or feather-dust in winter smog; adopt electrostatic damp capture.',
    scientificMechanism: 'Dry sweeping and synthetic feather dusters generate mechanical turbulence that resuspends settled toxic particulates (heavy metals, PAHs, brake dust) into breathing zones for up to 4 hours.',
    stepByStep: [
      'Mist a high-density microfiber cloth with 50/50 water and white vinegar.',
      'Wipe hard surfaces in an S-pattern, folding the cloth to trap particulate rather than spreading it.',
      'Mop hard floors with a damp microfiber flat mop; rinse pad frequently in clean water.',
      'If vacuuming, verify your vacuum has a sealed HEPA exhaust gasket; unsealed vacuums spray submicron dust out the exhaust vent directly into your face!',
      'Wear an N95 mask while dusting if outdoor air is hazardous.'
    ],
    commonPitfalls: [
      'Using dry brooms on tile/wood floors during winter mornings.',
      'Using vacuum cleaners with basic bag filters that lack true HEPA filtration.'
    ],
    equipmentNeeded: ['Microfiber cloths', 'Spray bottle with water & vinegar', 'Sealed HEPA vacuum or microfiber flat mop']
  },
  {
    id: 'indoor-plant-reality-check',
    category: 'humidity_plants',
    title: 'Indoor Plants: Scientific Reality vs Particulate Filtration',
    difficulty: 'Easy (5 mins)',
    costLevel: '$$ ($20 - $50)',
    cadrOrImpact: 'Improves psychological well-being & modest CO2 uptake, but 0% PM2.5 CADR',
    summary: 'The honest science on what house plants actually do (and what they cannot do) during severe winter pollution.',
    scientificMechanism: 'While NASA Clean Air studies (1989) showed plants can absorb certain VOCs (benzene, formaldehyde) in tiny sealed airtight chambers over weeks, real-world field studies (Drexel University, 2019) proved that natural house plants have a CADR of less than 0.1 CFM for PM2.5. Mechanical filtration is mandatory for particulates.',
    stepByStep: [
      'Keep Areca Palms, Snake Plants (Sansevieria), or Spider Plants for modest night-time CO2 absorption and natural humidity release.',
      'Wipe plant leaves monthly with a damp cloth: dust-caked leaves cannot breathe or transpire.',
      'Never rely on plants to replace HEPA filters for winter smog, smoke, or PM2.5.',
      'Ensure soil pots do not become soggy: winter cold + overwatered soil creates fungal mold spores (Aspergillus) that trigger respiratory attacks.'
    ],
    commonPitfalls: [
      'Buying 10 plants thinking you do not need an air purifier during 400 AQI episodes.',
      'Overwatering pots in stagnant winter air causing toxic mold bloom.'
    ],
    equipmentNeeded: ['Snake Plant or Peace Lily', 'Moisture meter', 'Leaf cleaning sponge']
  },
  {
    id: 'winter-humidity-sweetspot',
    category: 'humidity_plants',
    title: 'The 40–50% Relative Humidity Sweetspot',
    difficulty: 'Easy (5 mins)',
    costLevel: '$ (Under $15)',
    cadrOrImpact: 'Preserves mucociliary airway defense & halves airborne virus half-life',
    summary: 'Why balancing indoor moisture between 40% and 50% is your lungs first line of defense in freezing smog.',
    scientificMechanism: 'Cold outdoor winter air holds very little moisture; when heated indoors, relative humidity drops below 25%. Dry air dries out the nasal mucosa and mucociliary escalator, paralyzing the micro-cilia that physically sweep inhaled smog particles out of your bronchi. However, RH >55% fosters mold and dust mite multiplication.',
    stepByStep: [
      'Place a cheap $8 digital hygrometer in your living room and bedroom.',
      'If RH is <35%: Use an ultrasonic or evaporative humidifier with distilled or boiled water (tap water produces white mineral dust PM2.5!).',
      'Natural passive hack: Hang damp cotton towels on clothes racks near warm radiators to release clean water vapor without mineral dust.',
      'If RH exceeds 50%: Turn down humidifier immediately to prevent condensation on cold window panes.'
    ],
    commonPitfalls: [
      'Using hard mineral tap water in ultrasonic humidifiers (turns dissolved calcium into artificial PM2.5 "white dust" that triggers air purifier sensors!).',
      'Letting humidifier tanks develop bacterial biofilm (rinse with white vinegar weekly).'
    ],
    equipmentNeeded: ['Digital Hygrometer', 'Evaporative humidifier or clean damp towels', 'Distilled / RO water']
  }
];
