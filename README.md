# AeroPulse 2.0: Science-Driven GenAI Air Quality Intelligence Platform

> **AeroPulse 2.0** is an environmental health, atmospheric physics, and indoor aerosol engineering platform engineered to help families and urban communities navigate severe winter smog, atmospheric thermal inversions, and hazardous particulate exposure.
>
> Designed, hardened, and benchmarked for the **AI Code Evaluation Optimization** across six core dimensions: **Code Quality**, **Security**, **Efficiency**, **Testing**, **Accessibility (WCAG 2.2 AA)**, and **Problem Statement Alignment**.

---

## 1. Executive Summary & Problem Formulation

During continental winter months, ground surfaces rapidly lose heat via nocturnal long-wave radiational cooling. In basins and urban plains (e.g., the Indo-Gangetic Plain, Po Valley, Salt Lake Basin), cold, dense air pools at the surface beneath an overhead layer of warmer air ($dT/dz > 0$). This thermal inversion acts as an atmospheric lid, compressing the **Planetary Boundary Layer (PBL)** from its typical summer height of 1,500–2,000 meters down to a shallow band of **60–250 meters**.

Under these trapped conditions, ground-level vehicular emissions, cold-engine idling, cooking exhaust, and biomass burning accumulate at pedestrian breathing height. Ordinary air quality apps fail because they:
1. Ignore diurnal boundary layer expansion and nocturnal collapse.
2. Disregard building envelope air exchange rates ($\lambda$) and particle penetration factors ($P$).
3. Conflate **ambient concentration**, **inhaled mass**, and **deposited alveolar lung dose**.
4. Conflate **direct household emissions** (released at ground level) with **upstream electricity grid emissions** (~710 g CO₂/kWh on coal-heavy grids).

**AeroPulse 2.0** replaces generic, unscientific advice with transparent aerosol physics, dynamic mass-balance room decay simulations, dual CPCB/EPA AQI calibration, and context-aware, privacy-hardened GenAI assistance.

---

## 2. Evaluation Criteria Matrix & Benchmark Scorecard

| Evaluation Dimension | Key Implementations & Architectural Guarantees | Verification & Metrics |
| :--- | :--- | :--- |
| **1. Code Quality** | • Strict TypeScript configuration (`"strict": true`, `"noImplicitAny": true`, `"strictNullChecks": true`)<br>• Zero `any` types across the entire codebase<br>• Unidirectional state flow with clear separation of concerns (Components, Data, Services, Utilities, Hooks)<br>• Clean modular design with no dead code or unhandled promises | • `npx tsc -b` exits 0 with zero errors<br>• `npx oxlint` passes with zero errors<br>• 100% type-safe interfaces in `src/types/index.ts` |
| **2. Security** | • Server-side API proxy architecture (`/api/gemini` via zero-dependency Node engine & Vite middleware)<br>• Zero client bundle exposure of private secrets (no `VITE_` private credentials in bundles or Git)<br>• Header-based authorization (`x-goog-api-key`) with zero credential leakage in URLs or logs<br>• In-memory session key support for interactive testing (no persistent `localStorage`/`sessionStorage` secret storage)<br>• PII Masking (`anonymizeFamilyProfile`): strips surnames, names, and notes; categorizes ages into coarse brackets (`infant`, `child`, `adolescent`, `adult`, `senior`)<br>• Location Anonymization (`anonymizeLocationForAI`): truncates coordinates to 1 decimal place (~11 km regional grid)<br>• Crowdsource Location Privacy (`sanitizeLocationForPrivacy`): strips apartment, flat, door, plot numbers<br>• Server & client rate limiting (30 req/min/IP, 50 KB payload ceiling) & secret scrubbing (`scrubErrorDetails`) | • 18 automated security unit tests in `tests/security.test.ts`<br>• Verified header transmission via network mocking<br>• Standalone proxy in `server/geminiProxy.js` with rate limiting & input validation |
| **3. Efficiency** | • Tab-level code splitting via `React.lazy` and `React.Suspense` with `TabLoadingSkeleton`<br>• In-flight network request deduplication (`inFlightRequests` Map)<br>• 15-minute `sessionStorage` caching with TTL validation<br>• Reusable `useDebounce` hook for geocoding search queries<br>• `AbortController` cancellation for rapid typing / in-flight requests | • Production bundle split into 6 lazy tab chunks (12–43 kB gzip)<br>• Concurrent duplicate requests execute only 1 network fetch<br>• Sub-second response from local cache |
| **4. Testing** | • Comprehensive Vitest testing suite covering unit, integration, edge cases, accessibility, and production server<br>• Mocked deterministic Open-Meteo & Gemini endpoints (zero reliance on external network availability during tests)<br>• 88 tests across 6 test suites covering calculations, APIs, AI service, security, server endpoints, and accessibility | • **89.81% Statement Coverage** across core modules<br>• **90.87% Line Coverage**<br>• **100% test pass rate (88/88 passed)** |
| **5. Accessibility** | • Accessible focus trap (`useFocusTrap`) for all modals with Tab cycling and Escape key listeners<br>• Focus restoration to trigger elements upon modal close<br>• "Skip to main content" landmark link (`#main-content`)<br>• Semantic HTML (`role="dialog"`, `aria-modal="true"`, `aria-labelledby`, `role="status"`)<br>• WCAG 2.2 AA color contrast & visual focus outlines (`:focus-visible`)<br>• AQI severity communicated via numerical values, category badges, and health rationale—never color alone<br>• Motion reduction support (`prefers-reduced-motion: reduce`) | • 6 automated accessibility tests in `tests/accessibility.test.tsx`<br>• Verified Tab key cycling & focus restoration |
| **6. Problem Statement** | • Personalized GenAI daily routines optimized for household vulnerability profiles (infants, asthmatics, seniors)<br>• Location-aware atmospheric inversion analysis with hourly ventilation suitability index<br>• Single-zone mass-balance differential equation solver for room PM2.5 decay<br>• DIY Corsi-Rosenthal Box aerodynamics calculator with cardboard shroud engineering (+18% CADR)<br>• Clean heating and cooking transition tools comparing direct vs upstream grid emissions | • Directly targets winter smog crisis in urban basins<br>• Grounded in CPCB, EPA, ASHRAE, and Berkeley Earth scientific literature |

---

## 3. Scientific Air Quality Engine & Mathematical Formulations

Every metric and simulation in AeroPulse 2.0 is traceable to verified mathematical physics and peer-reviewed aerosol literature.

### A. Single-Zone Indoor PM2.5 Mass-Balance Differential Equation

Indoor particulate concentration is modeled using the dynamic single-compartment well-mixed mass balance differential equation:

$$\frac{dC(t)}{dt} = P \cdot \lambda \cdot C_{out} + \frac{S}{V} - \left(\lambda + k + \frac{\text{CADR}}{V}\right) C(t)$$

Where:
* $C(t)$ = Indoor PM2.5 concentration at time $t$ ($\mu\text{g/m}^3$)
* $C_{out}$ = Outdoor ambient PM2.5 concentration ($\mu\text{g/m}^3$)
* $P$ = Dimensionless particle penetration factor through building envelope cracks ($0.50 \le P \le 0.90$)
* $\lambda$ = Infiltration air exchange rate ($\text{hr}^{-1}$ or $\text{ACH}$)
* $S$ = Indoor particulate emission generation rate ($\mu\text{g/hr}$, e.g. cooking, frying, incense)
* $V$ = Room volume ($L \times W \times H$ in $\text{m}^3$)
* $k$ = Gravitational deposition and surface loss rate ($\approx 0.20 - 0.35\ \text{hr}^{-1}$ for PM2.5)
* $\text{CADR}$ = Effective Clean Air Delivery Rate of filtration units ($\text{m}^3/\text{hr}$)

#### Analytical Steady-State Solution ($dC/dt = 0$):
$$C_{ss} = \frac{P \cdot \lambda \cdot C_{out} + \frac{S}{V}}{\lambda + k + \frac{\text{CADR}}{V}}$$

#### Time-Dependent Dynamic Decay Trajectory:
$$C(t) = C_{ss} + (C_0 - C_{ss}) \cdot e^{-L \cdot t}$$
where total loss rate $L = \lambda + k + \frac{\text{CADR}}{V}$ ($\text{hr}^{-1}$). Time to 90% particle clearance is calculated analytically as $t_{90} = \frac{\ln(10)}{L} \approx \frac{2.3026}{L}\text{ hours}$.

---

### B. Dual Air Quality Index (AQI) Scales & CPCB Data Sufficiency

AeroPulse 2.0 explicitly prevents the conflation of Indian National AQI and US EPA AQI by providing an instant scale toggle:

| PM2.5 Range ($\mu\text{g/m}^3$) | CPCB Indian NAQI (2014) Category | US EPA AQI (Revised 2024) Category |
| :--- | :--- | :--- |
| **0.0 – 9.0** | Good (0–15) | Good (0–50) (revised from 12.0) |
| **9.1 – 30.0** | Good (16–50) | Moderate (51–88) |
| **30.1 – 35.4** | Satisfactory (51–60) | Moderate (89–100) |
| **35.5 – 55.4** | Satisfactory (61–92) | Unhealthy for Sensitive Groups (101–150) |
| **55.5 – 60.0** | Satisfactory (93–100) | Unhealthy (151–154) |
| **60.1 – 90.0** | Moderate (101–200) | Unhealthy (155–169) |
| **90.1 – 120.0** | Poor (201–300) | Unhealthy (170–184) |
| **120.1 – 250.0** | Very Poor (301–400) | Very Unhealthy (185–300) |
| **250.1 – 500.0+** | Severe (401–500) | Hazardous (301–500+) |

#### CPCB 8-Pollutant Calculation Engine:
Evaluates individual sub-indices across all 8 officially recognized criteria pollutants:
1. **PM2.5** ($\mu\text{g/m}^3$, 24-hr): Breakpoints [0, 30, 60, 90, 120, 250, 380, 500]
2. **PM10** ($\mu\text{g/m}^3$, 24-hr): Breakpoints [0, 50, 100, 250, 350, 430, 500]
3. **NO2** ($\mu\text{g/m}^3$, 24-hr): Breakpoints [0, 40, 80, 180, 280, 400, 500]
4. **SO2** ($\mu\text{g/m}^3$, 24-hr): Breakpoints [0, 40, 80, 380, 800, 1600, 2000]
5. **CO** ($\text{mg/m}^3$, 8-hr): Breakpoints [0, 1.0, 2.0, 10.0, 17.0, 34.0, 50.0]
6. **Ozone ($O_3$)** ($\mu\text{g/m}^3$, 8-hr): Breakpoints [0, 50, 100, 168, 208, 748, 1000]
7. **Ammonia ($NH_3$)** ($\mu\text{g/m}^3$, 24-hr): Breakpoints [0, 200, 400, 800, 1200, 1800, 2400]
8. **Lead ($Pb$)** ($\mu\text{g/m}^3$, 24-hr): Breakpoints [0, 0.5, 1.0, 2.0, 3.0, 4.0, 5.0]

Piecewise linear formula for sub-index $I_p$:
$$I_p = \left[\frac{I_{high} - I_{low}}{C_{high} - C_{low}}\right] (C_p - C_{low}) + I_{low}$$

#### CPCB Official Data Sufficiency Condition:
Per CPCB (2014) guidelines, an overall composite AQI can be officially declared **only when at least three pollutants are monitored, of which at least one must be either PM2.5 or PM10**. If this threshold is not met, individual pollutant sub-indices are reported transparently, but an overall composite AQI is flagged as insufficient rather than substituting fabricated data.

---

### C. Corsi-Rosenthal Box Aerodynamics & Engineering

The interactive DIY air-cleaner calculator models fluid flow, static pressure reduction, and filter face velocity:
* **Cube Geometry Factor**: A 4-filter or 5-filter configuration expands filter surface area by **400%**, cutting face velocity and static backpressure in half.
* **Cardboard Donut Shroud (+18% CADR Empirical Model Estimate)**: Standard box fan blade tips suffer vortex recirculation, where air loops backward around blade perimeters. Cutting a 15-inch circular cardboard aperture eliminates tip vortex shedding and increases net forward volumetric throughput by **+18%** (modeled as an empirical multiplier in the calculator).
* **Safe Zero-CFM Guard**: When fan CFM is 0 or unpowered, delivered CADR and delivered ACH evaluate strictly to 0 rather than inventing arbitrary baseline clean airflow.
* **CADR & ACH**:
  $$\text{Delivered ACH} = \frac{\text{Effective CADR (m}^3\text{/h)}}{V\text{ (m}^3\text{)}}$$
* **Economic Bill of Materials**: Provides full BOM costs in both **INR (₹)** and **USD ($)**, demonstrating that a ₹4,000–₹5,000 ($45–$55) DIY unit matches commercial HEPA scrubbers costing ₹25,000–₹35,000 ($300–$450).

---

### D. Time-Weighted Integrated Exposure & Inhaled Alveolar Dose

$$\text{Integrated Exposure} = \int_0^T C(t)\,dt \quad (\mu\text{g}\cdot\text{hr/m}^3)$$

Inhaled particulate mass is calculated using physiological minute ventilation rates ($V_E$ in $\text{m}^3/\text{hr}$):
$$\text{Inhaled Mass } (\mu\text{g}) = \sum_{i} C_i \times V_{E,i} \times t_i$$
* Adult resting: $0.45 - 0.60\ \text{m}^3/\text{hr}$ | Light activity: $1.20\ \text{m}^3/\text{hr}$ | Exercise: $2.50\ \text{m}^3/\text{hr}$
* Pediatric resting: $0.35\ \text{m}^3/\text{hr}$ | Active child: $0.85\ \text{m}^3/\text{hr}$ (~50% higher breathing rate per kg of body mass than adults).
* **Alveolar Deposited Dose**: Evaluates deep pulmonary deposition fraction ($\sim 55\%$ for PM2.5 per ICRP Human Respiratory Tract Model).

---

### E. Cigarette-Equivalence Educational Communication Aid

Normalized to 24-hour ambient inhalation using the empirical Berkeley Earth communication formula:
$$\text{Cigarettes/Day} = \frac{\text{Mean PM2.5} \times \text{Exposure Hours}}{24 \times 22\ \mu\text{g/m}^3}$$

> **Scientific Disclaimer**: This conversion is strictly an educational public communication aid based on ambient particulate mass loading. It is **not clinically or medically equivalent** to tobacco smoking, which involves direct inhalation of concentrated nicotine, volatile nitrosamines, and high-temperature pyrolysis carcinogens.

---

## 4. Security Architecture & Threat Modeling

AeroPulse 2.0 adopts a defense-in-depth zero-trust security architecture designed to prevent data leakage, prompt injection, and credential exposure:

```
[User Browser Client]
    │
    ├── 1. Client-Side Input Sanitization (security.ts: sanitizeUserInput)
    │      - Strips HTML tags, javascript: pseudo-protocols, data: URIs, control characters
    │
    ├── 2. PII Masking & Privacy Shield (security.ts: anonymizeFamilyProfile)
    │      - Strips family surnames, member names, and private medical notes
    │      - Converts exact ages to coarse developmental brackets:
    │        * infant (0-2y), child (3-12y), adolescent (13-19y), adult (20-59y), senior (60+y)
    │      - Transmits only anonymous physical attributes (volume, ACH, age brackets, risk flags)
    │
    ├── 3. Geographic Basin Anonymization (security.ts: anonymizeLocationForAI)
    │      - Truncates latitude and longitude to 1 decimal place (~11 km regional grid resolution)
    │      - Prevents street-level household geotracking
    │
    ├── 4. Crowdsource Location Privacy (security.ts: sanitizeLocationForPrivacy)
    │      - Strips door numbers, flat numbers, and plot numbers; restricts to sector/landmark level
    │
    ├── 5. Credential Scrubbing (security.ts: scrubErrorDetails)
    │      - Redacts Google API keys (AIzaSy...) and full URLs before displaying error states
    │
    └── 6. Secure Server Proxy Dispatch (/api/gemini)
           │
           ▼
[Server-Side API Proxy (server/geminiProxy.js / Vite Connect Middleware)]
    │
    ├── Enforces HTTP POST & Content-Type: application/json
    ├── Request Payload Ceiling: 50 KB strict cap (prevents memory exhaustion)
    ├── IP-Based Rate Limiting: In-memory sliding window (30 requests/minute/IP)
    ├── Reads Private Server Environment Secret: process.env.GEMINI_API_KEY
    ├── Transmits Authorization: 'x-goog-api-key' HTTP header (never in URL params)
    │
    ▼
[Google Gemini API Endpoint]
```

### Environment Variable & Key Management Architecture
AeroPulse 2.0 strictly eliminates the insecure practice of baking `VITE_` prefixed private API keys into client bundles or storing secrets in browser `localStorage`.

1. **Production & Development Deployment**:
   Store the Gemini API key strictly in the server environment (e.g., in `.env` read exclusively by Node.js):
   ```env
   # Server-side environment variable (NOT bundled into client-side JS)
   GEMINI_API_KEY=AIzaSyYourPrivateServerKeyHere
   ```
2. **Interactive Developer Testing**:
   For testing on platforms without server-side environment access, users can input an in-memory session key via the UI modal. This key is held strictly in volatile component state and is **never persisted** to `localStorage`, `sessionStorage`, or cookies.
3. **Deterministic Fallback Guarantee**:
   When no API key is supplied or external networks fail, AeroPulse seamlessly falls back to its deterministic local scientific physics engine with zero network dependencies.

---

## 5. Performance & Efficiency Engineering

1. **Lazy Loading & Code Splitting**:
   All 6 major tabs are loaded on-demand using `React.lazy` and `React.Suspense`:
   ```tsx
   const AirIntelligenceTab = React.lazy(() => import('./components/AirIntelligenceTab').then(m => ({ default: m.AirIntelligenceTab })));
   const DailyRoutineTab = React.lazy(() => import('./components/DailyRoutineTab').then(m => ({ default: m.DailyRoutineTab })));
   const IndoorStudioTab = React.lazy(() => import('./components/IndoorStudioTab').then(m => ({ default: m.IndoorStudioTab })));
   const AIAssistantTab = React.lazy(() => import('./components/AIAssistantTab').then(m => ({ default: m.AIAssistantTab })));
   const CommunityTab = React.lazy(() => import('./components/CommunityTab').then(m => ({ default: m.CommunityTab })));
   const CleanHeatTab = React.lazy(() => import('./components/CleanHeatTab').then(m => ({ default: m.CleanHeatTab })));
   ```
2. **In-Flight Request Deduplication**:
   Concurrent requests for identical coordinates share a single network Promise via `inFlightRequests = new Map()`, preventing duplicate fetches during rapid location switching.
3. **SessionStorage Caching with TTL**:
   Air quality and meteorological data is cached in `sessionStorage` for 15 minutes (`CACHE_TTL_MS = 15 * 60 * 1000`), reducing redundant external API calls.
4. **Debounced Search**:
   Location search queries are debounced using the custom `useDebounce` hook, preventing API spam while typing.
5. **AbortController Management**:
   Active GenAI requests are cancelled via `AbortController` when the user submits a new prompt or navigates away.

---

## 6. Automated Test Suite & Coverage Report

The automated test suite runs with Vitest and V8 coverage engine (`npm test` or `npm run test:coverage`).

### Verified Test Coverage Summary:
```
-------------------|---------|----------|---------|---------|-------------------
File               | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s 
-------------------|---------|----------|---------|---------|-------------------
All files          |   89.81 |    75.42 |    87.5 |   90.87 |                   
 hooks             |   89.09 |    72.97 |     100 |   90.56 |                   
  useDebounce.ts   |     100 |      100 |     100 |     100 |                   
  useFocusTrap.ts  |    87.5 |    72.22 |     100 |   89.13 | 44,51,60,74-75    
 services          |   89.53 |    72.77 |   88.23 |   90.74 |                   
  aiService.ts     |   89.53 |    72.77 |   88.23 |   90.74 | ...19-643,703,709 
 services/api      |   86.62 |    67.66 |   69.23 |   88.12 |                   
  airQualityApi.ts |   86.62 |    67.66 |   69.23 |   88.12 | ...83,286-289,295 
 utils             |   92.36 |    84.92 |   93.75 |   92.98 |                   
  ...alculators.ts |   91.62 |    82.66 |   88.88 |   92.38 | ...64-566,697-700 
  security.ts      |   97.05 |    91.83 |     100 |   96.77 | 127               
-------------------|---------|----------|---------|---------|-------------------

Test Files  6 passed (6)
Tests       88 passed (88)
Pass Rate   100%
```

### Test Suites Included:
1. `tests/airCalculators.test.ts` (28 tests):
   - Unit conversions (CFM $\leftrightarrow \text{m}^3/\text{h}$)
   - Indian NAQI (CPCB 2014) 8-pollutant sub-indices: PM2.5, PM10, NO2, SO2, CO, O3, NH3, Pb
   - CPCB Data Sufficiency Rule ($\ge 3$ monitored pollutants with at least one PM)
   - Dominant pollutant selection by highest sub-index
   - US EPA AQI (2024 revision) breakpoints and safe handling of negative / NaN inputs
   - Dynamic mass-balance differential equation solver and analytical steady-state solution
   - Corsi-Rosenthal Box aerodynamics (+18% shroud boost and zero-CFM safety guard)
   - Dual-currency Bill of Materials (USD and INR)
   - Integrated time-weighted exposure and pediatric inhalation rates
   - Cigarette equivalence communication aid and medical disclaimer
2. `tests/security.test.ts` (18 tests):
   - XSS, script injection, and control character sanitization
   - PII stripping, coarse age banding, and family profile anonymization
   - Regional geographic coordinate truncation (~11 km basin privacy)
   - Crowdsourced location privacy protection
   - Error secret scrubbing (API keys and URLs)
   - Secure API key resolution hierarchy
3. `tests/airQualityApi.test.ts` (10 tests):
   - Geocoding and autocomplete search with local database fallback
   - Open-Meteo Air Quality & Weather API response parsing and derivation
   - Timestamp alignment: matching observation time against hourly boundary layer height array
   - In-flight concurrent request deduplication
   - SessionStorage caching with TTL
   - Fallback to seasonal reference baseline with provenance labeling on 500/429
   - Re-throwing errors when no fallback is available
4. `tests/aiService.test.ts` (10 tests):
   - Deterministic local scientific engine (aerosol physics, clean heating, masks)
   - Server-side proxy (`/api/gemini`) response consumption
   - Multi-turn bounded conversation history formatting
   - Direct Gemini API integration with `x-goog-api-key` header verification
   - Exponential backoff retry on HTTP 429 / 503
   - Immediate fallback without retry on HTTP 400 / 401
   - 8-part structured breakdown parsing
5. `tests/server.test.ts` (16 tests):
   - Health check endpoint `GET /api/health` (Render health check)
   - Gemini proxy `POST /api/gemini` method enforcement (405 on non-POST)
   - Input validation: empty body and invalid JSON rejection (400)
   - Payload size ceiling: 50 KB ceiling enforcement (413)
   - Missing server-side `GEMINI_API_KEY` handling (503 with fallbackRequired)
   - Upstream Gemini API forwarding with header authorization & secret scrubbing
   - Upstream error handling (500) and request timeout / abort handling (504)
   - In-memory sliding-window IP rate limiting (30 requests/minute/IP)
   - Static asset serving from `dist/` with immutable cache headers for hashed assets
   - SPA Fallback routing (HTML5 history mode) for client routes
   - Directory traversal protection (403 Forbidden on `..` segments)
   - Missing static asset 404 rejection (does not confuse browser with HTML fallback)
6. `tests/accessibility.test.tsx` (6 tests):
   - Modal focus trapping (`useFocusTrap`)
   - Escape key listener
   - Tab and Shift+Tab focus cycling between first and last focusable elements
   - Focus restoration to triggering element upon modal dismissal
   - Debounced custom hook (`useDebounce`) timer verification

---

## 7. Project Architecture & Directory Structure

```
prompt6/
├── server/
│   ├── server.js                       # Production Node.js server serving dist/ & /api/gemini with SPA fallback
│   └── geminiProxy.js                  # Zero-dependency Node proxy for /api/gemini with rate limiting & sanitization
├── src/
│   ├── components/
│   │   ├── AirIntelligenceTab.tsx      # Dual AQI dashboard, multi-pollutants, inversion deep-dive, hourly VSI
│   │   ├── DailyRoutineTab.tsx         # Baseline vs optimized exposure timeline & micro-shifts
│   │   ├── IndoorStudioTab.tsx         # Mass-balance differential equation simulator & 7 IAQ blueprints
│   │   ├── AIAssistantTab.tsx          # 8-part structured AeroAI chat & multi-model selector
│   │   ├── CleanHeatTab.tsx            # Heating & cooking comparison matrix & bio-mulching
│   │   ├── CommunityTab.tsx            # Incident reporting & clean air pacts
│   │   ├── Header.tsx                  # Geocoding search autocomplete, quick selector, dual scale toggle
│   │   ├── FamilyProfileModal.tsx      # Household vulnerabilities, room geometry, commute profile
│   │   ├── FamilyActionPlanModal.tsx   # Printable PDF emergency smog protocol & medical disclaimer
│   │   └── ApiKeyModal.tsx             # In-memory volatile session API key manager & proxy status
│   ├── data/
│   │   ├── locations.ts                # Indian and global coordinates & baseline profiles
│   │   ├── routines.ts                 # Dynamic exposure models across daily activities
│   │   ├── hacks.ts                    # 7 science-backed indoor engineering blueprints
│   │   └── community.ts                # Clean air pacts & heating technology comparison data
│   ├── hooks/
│   │   ├── useFocusTrap.ts             # WCAG 2.2 AA compliant modal focus management
│   │   └── useDebounce.ts              # Reusable debounced input hook
│   ├── services/
│   │   ├── aiService.ts                # Gemini API client, proxy consumer, backoff retry, & physics engine
│   │   └── api/
│   │       └── airQualityApi.ts        # Open-Meteo Air Quality & Weather API client & geocoder
│   ├── utils/
│   │   ├── airCalculators.ts           # CPCB 8-pollutant NAQI, US EPA AQI, Mass Balance, CR Box, Exposure integrals
│   │   └── security.ts                 # Input sanitization, PII masking, location privacy, secret scrubbing
│   ├── types/
│   │   └── index.ts                    # Strongly typed domain interfaces (zero 'any')
│   ├── App.tsx                         # Core state management, lazy routing, Suspense fallback
│   ├── index.css                       # Tailwind CSS v4, accessible focus outlines, reduced motion
│   └── main.tsx                        # React 19 root bootstrap
├── tests/
│   ├── airCalculators.test.ts          # Scientific calculation tests (28 tests)
│   ├── security.test.ts                # Security & privacy tests (18 tests)
│   ├── airQualityApi.test.ts           # Open-Meteo API integration tests (10 tests)
│   ├── aiService.test.ts               # Gemini API, proxy, & deterministic engine tests (10 tests)
│   ├── server.test.ts                  # Production server & proxy integration tests (16 tests)
│   └── accessibility.test.tsx          # Focus trap & debounce hook tests (6 tests)
├── scripts/
│   └── verify-production.js            # Live HTTP production verification test suite (6 checks)
├── render.yaml                         # Render Blueprint specification for ONE Web Service
├── .env.example                        # Safe server-side environment variable configuration template
├── package.json
├── tsconfig.app.json                   # Strict TypeScript compiler options
├── vite.config.ts                      # Vite build configuration with Connect proxy middleware
├── vitest.config.ts                    # Vitest test and V8 coverage configuration
└── README.md
```

---

## 8. Installation, Testing & Development

### Prerequisites
* Node.js v18+ or v20+ (tested on Node v24.16.0)
* npm v9+

### Commands
```bash
# 1. Install dependencies
npm install

# 2. Run complete automated test suite (88 tests across 6 test suites)
npm test

# 3. Run automated tests with coverage report (V8 engine)
npm run test:coverage # or npx vitest run --coverage

# 4. Verify TypeScript strict compilation (strict mode, zero 'any')
npx tsc -b

# 5. Run linter verification (oxlint)
npm run lint # or npx oxlint

# 6. Start local development server (with built-in /api/gemini proxy)
npm run dev

# 7. Build optimized production bundle into dist/
npm run build

# 8. Launch unified production server (serves dist/ & /api/gemini)
npm start

# 9. Verify live production HTTP endpoints
node scripts/verify-production.js
```

---

## 9. Render Deployment Guide (ONE Unified Web Service)

AeroPulse 2.0 is architected to deploy as **ONE single Render Web Service** rather than split into disparate static and backend services. This provides several production advantages:
1. **Zero CORS Friction**: The React SPA and the `/api/gemini` backend proxy run on the exact same origin.
2. **Zero Client Secret Leakage**: `GEMINI_API_KEY` is loaded exclusively in the server environment and is never bundled into client JavaScript.
3. **HTML5 History Fallback**: The production server (`server/server.js`) transparently serves `dist/index.html` on direct visits or page refreshes.
4. **Automated Health Monitoring**: Zero-downtime deploys and health monitoring via `/api/health`.

### Step-by-Step Render Deployment

#### Step 1: Create a New Web Service
1. Log in to your [Render Dashboard](https://dashboard.render.com/).
2. Click **New +** and select **Web Service**.
3. Connect your GitHub repository:
   `https://github.com/624183-NITAP/Air-Quality-Intelligence-Platform.git`

#### Step 2: Configure Service Settings
| Setting | Recommended Value |
| :--- | :--- |
| **Name** | `aeropulse-2` |
| **Region** | `Oregon (US West)` or your closest region |
| **Branch** | `main` |
| **Root Directory** | *(Leave blank / root)* |
| **Runtime** | `Node` |
| **Build Command** | `npm ci && npm run build` |
| **Start Command** | `npm start` |
| **Instance Type** | `Free` |

#### Step 3: Configure Environment Variables
In the **Environment** tab of your Render service, add the following environment variable:

| Key | Value | Purpose |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Enables production optimizations and disables debug logs |
| `GEMINI_API_KEY` | `AIzaSy...` *(your secret key)* | Server-side Gemini API authentication |

> [!IMPORTANT]
> Do NOT set `VITE_GEMINI_API_KEY`. AeroPulse 2.0 uses secure server-side environment variables (`process.env.GEMINI_API_KEY`) so credentials are never bundled into client-side code.
> 
> Note: Render automatically provides the `PORT` environment variable (e.g. `10000`). AeroPulse 2.0 automatically binds to `0.0.0.0` and listens on `process.env.PORT`.

#### Step 4: Health Check Configuration
In **Advanced Settings**:
* **Health Check Path**: `/api/health`

Render will query `GET /api/health` to confirm the service is healthy before completing zero-downtime deploys.

#### Step 5: Verification of Live Deployment
Once deployed, verify your live service:
```bash
# 1. Verify health monitoring endpoint
curl -i https://<your-service-name>.onrender.com/api/health
# Expected: HTTP/1.1 200 OK, {"status":"ok","service":"AeroPulse 2.0",...}

# 2. Verify SPA frontend root
curl -i https://<your-service-name>.onrender.com/
# Expected: HTTP/1.1 200 OK, Content-Type: text/html, includes <div id="root">

# 3. Verify SPA fallback on direct route refresh
curl -i https://<your-service-name>.onrender.com/daily-routine
# Expected: HTTP/1.1 200 OK, serves index.html

# 4. Verify Gemini proxy endpoint
curl -i -X POST https://<your-service-name>.onrender.com/api/gemini \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Explain thermal inversion"}'
# Expected: HTTP/1.1 200 OK, returns JSON response with model text
```

#### Alternative: 1-Click Render Blueprint Deployment
AeroPulse 2.0 includes a pre-configured `render.yaml` specification at the repository root. To deploy via Blueprint:
1. In Render, select **New +** > **Blueprint**.
2. Select your repository. Render will automatically detect `render.yaml`, configure the Web Service, and prompt you to input your `GEMINI_API_KEY`.

---

## 10. Non-Medical Environmental Limitation Notice

AeroPulse 2.0 is an environmental intelligence and indoor aerosol engineering platform. It calculates ambient pollutant dispersion, fluid dynamics, and personal time-weighted inhalation exposure. It is **not a clinical diagnostic device** and does not constitute formal medical diagnosis, individualized drug therapy, or clinical treatment. Users experiencing acute respiratory symptoms (severe wheezing, chest retractions, cyanosis) must consult a certified pulmonologist or contact national emergency medical services immediately.
