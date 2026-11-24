import React, { useState } from 'react';
import type { CommunityReport } from '../types';
import { INITIAL_COMMUNITY_REPORTS, COMMUNITY_PACTS } from '../data/community';
import { sanitizeUserInput, sanitizeLocationForPrivacy } from '../utils/security';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { 
  Users, 
  MapPin, 
  AlertTriangle, 
  CheckCircle2, 
  ShieldCheck, 
  X,
  Lock
} from 'lucide-react';

export const CommunityTab: React.FC = () => {
  const [reports, setReports] = useState<CommunityReport[]>(INITIAL_COMMUNITY_REPORTS);
  const [pacts, setPacts] = useState(COMMUNITY_PACTS);
  const [userJoinedPacts, setUserJoinedPacts] = useState<Record<string, boolean>>({ 'pact-carpool': true, 'pact-clean-night-heat': true });
  
  // New Report Modal State
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const modalRef = useFocusTrap({ isOpen: isReportModalOpen, onClose: () => setIsReportModalOpen(false) });
  const [newType, setNewType] = useState<CommunityReport['type']>('open_burning');
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newCity, setNewCity] = useState('Delhi NCR');
  const [filterType, setFilterType] = useState<'all' | CommunityReport['type']>('all');

  const handleVerify = (id: string) => {
    setReports(reports.map(r => {
      if (r.id === id) {
        return { ...r, verifiedCount: r.verifiedCount + 1 };
      }
      return r;
    }));
  };

  const handleTogglePact = (id: string) => {
    const isJoined = !!userJoinedPacts[id];
    setUserJoinedPacts({ ...userJoinedPacts, [id]: !isJoined });
    setPacts(pacts.map(p => {
      if (p.id === id) {
        return {
          ...p,
          participantsCount: isJoined ? p.participantsCount - 1 : p.participantsCount + 1,
        };
      }
      return p;
    }));
  };

  const handleSubmitReport = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = sanitizeUserInput(newTitle, 150);
    const cleanLocation = sanitizeLocationForPrivacy(newLocation);
    if (!cleanTitle || !cleanLocation) return;

    const newRep: CommunityReport = {
      id: `rep-${Date.now()}`,
      timestamp: 'Just now',
      type: newType,
      title: cleanTitle,
      description: sanitizeUserInput(newDesc, 500) || 'Localized smog emission source verified by resident.',
      locationName: cleanLocation,
      city: sanitizeUserInput(newCity, 60) || 'Delhi NCR',
      severity: 'high',
      verifiedCount: 1,
      actionTakenStatus: 'Reported',
      isOfficialVerification: false,
    };

    setReports([newRep, ...reports]);
    setNewTitle('');
    setNewDesc('');
    setNewLocation('');
    setIsReportModalOpen(false);
  };

  const filteredReports = filterType === 'all' 
    ? reports 
    : reports.filter(r => r.type === filterType);

  return (
    <div className="space-y-8">
      
      {/* Community Header Card */}
      <div className="rounded-2xl glass-panel p-6 border border-slate-800 bg-gradient-to-r from-slate-900/90 via-cyan-950/20 to-slate-900/90 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-950 text-cyan-300 border border-cyan-800">
                Collective Action Network
              </span>
              <span className="text-xs text-slate-400">
                Grassroots Smog Defense & Verified Shelters
              </span>
            </div>
            <h2 className="text-2xl font-black text-white mt-1">
              Community Smog Watch & Clean Air Pacts
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl mt-1 leading-relaxed">
              No family can clean outside air alone. When neighborhoods band together to stop open trash fires, pool school runs, and open filtered clean air shelters, local basin pollution drops drastically.
            </p>
          </div>

          <button
            onClick={() => setIsReportModalOpen(true)}
            className="px-4 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition flex items-center gap-2 shadow-lg shadow-rose-600/20 shrink-0 self-start sm:self-auto"
          >
            <AlertTriangle className="w-4 h-4" />
            Report Local Smog Source
          </button>
        </div>

        {/* Collective Neighborhood Scoreboard */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-800/80">
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/60 text-center">
            <span className="text-[11px] text-slate-400">Active Households</span>
            <div className="text-2xl font-black text-cyan-400 mt-0.5">853</div>
            <span className="text-[10px] text-slate-500">Participating families</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/60 text-center">
            <span className="text-[11px] text-slate-400">Daily PM2.5 Prevented</span>
            <div className="text-2xl font-black text-emerald-400 mt-0.5">1,910 g</div>
            <span className="text-[10px] text-slate-500">From neighborhood air</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/60 text-center">
            <span className="text-[11px] text-slate-400">Avoided CO2</span>
            <div className="text-2xl font-black text-teal-400 mt-0.5">910 kg</div>
            <span className="text-[10px] text-slate-500">Clean transit & heat</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/60 text-center">
            <span className="text-[11px] text-slate-400">Clean Air Shelters</span>
            <div className="text-2xl font-black text-amber-400 mt-0.5">14</div>
            <span className="text-[10px] text-slate-500">Public HEPA havens</span>
          </div>
        </div>
      </div>

      {/* SECTION 1: Active Community Clean Air Pacts */}
      <div className="rounded-2xl glass-panel p-6 border border-slate-800 space-y-4">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-cyan-400" />
            Join Neighborhood Clean Air Pacts
          </h3>
          <p className="text-xs text-slate-400">
            Pledge collective low-emission micro-shifts with your residential colony or apartment complex
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pacts.map((pact) => {
            const isJoined = !!userJoinedPacts[pact.id];

            return (
              <div
                key={pact.id}
                className={`p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-3 ${
                  isJoined
                    ? 'bg-slate-950/90 border-cyan-500/60 shadow-lg shadow-cyan-950/30'
                    : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-cyan-300 uppercase font-mono">
                      {pact.category}
                    </span>
                    <span className="text-xs font-semibold text-slate-400">
                      {pact.participantsCount} Families Pledged
                    </span>
                  </div>

                  <h4 className="text-base font-bold text-white mt-2">
                    {pact.title}
                  </h4>

                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    {pact.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                  <div className="text-xs">
                    <span className="text-emerald-400 font-bold">-{pact.preventedDailyPM25Grams}g PM2.5/day</span>
                    <span className="text-slate-500 mx-1.5">•</span>
                    <span className="text-teal-400 font-bold">-{pact.co2SavedKg}kg CO2</span>
                  </div>

                  <button
                    onClick={() => handleTogglePact(pact.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                      isJoined
                        ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                    }`}
                  >
                    {isJoined ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Pledged
                      </>
                    ) : (
                      'Join Pact'
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 2: Verified Incident Reports & Clean Air Shelters */}
      <div className="rounded-2xl glass-panel p-6 border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <MapPin className="w-5 h-5 text-rose-400" />
              Verified Smog Violations & Clean Air Shelters
            </h3>
            <p className="text-xs text-slate-400">
              Community crowdsourced reports and official municipal regulatory verifications
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs pb-1">
            <button
              onClick={() => setFilterType('all')}
              className={`px-2.5 py-1 rounded-lg transition whitespace-nowrap ${
                filterType === 'all' ? 'bg-cyan-600 text-white font-bold' : 'bg-slate-900 text-slate-400 hover:text-white'
              }`}
            >
              All ({reports.length})
            </button>
            <button
              onClick={() => setFilterType('open_burning')}
              className={`px-2.5 py-1 rounded-lg transition whitespace-nowrap ${
                filterType === 'open_burning' ? 'bg-cyan-600 text-white font-bold' : 'bg-slate-900 text-slate-400 hover:text-white'
              }`}
            >
              Open Burning
            </button>
            <button
              onClick={() => setFilterType('construction_dust')}
              className={`px-2.5 py-1 rounded-lg transition whitespace-nowrap ${
                filterType === 'construction_dust' ? 'bg-cyan-600 text-white font-bold' : 'bg-slate-900 text-slate-400 hover:text-white'
              }`}
            >
              Dust
            </button>
            <button
              onClick={() => setFilterType('clean_air_shelter')}
              className={`px-2.5 py-1 rounded-lg transition whitespace-nowrap ${
                filterType === 'clean_air_shelter' ? 'bg-cyan-600 text-white font-bold' : 'bg-slate-900 text-slate-400 hover:text-white'
              }`}
            >
              Shelters
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {filteredReports.map((report) => {
            const isShelter = report.type === 'clean_air_shelter';

            return (
              <div
                key={report.id}
                className={`p-4 rounded-xl border transition ${
                  isShelter
                    ? 'bg-cyan-950/20 border-cyan-800/60'
                    : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                      isShelter 
                        ? 'bg-cyan-900/80 text-cyan-200 border border-cyan-700'
                        : report.severity === 'severe'
                        ? 'bg-rose-950 text-rose-300 border border-rose-800'
                        : 'bg-amber-950 text-amber-300 border border-amber-800'
                    }`}>
                      {report.type.replace('_', ' ')}
                    </span>

                    {report.isOfficialVerification ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" /> Official Municipal Audit
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded-full border border-slate-800">
                        Citizen Verified ({report.verifiedCount})
                      </span>
                    )}

                    <span className="text-xs text-slate-400">• {report.timestamp}</span>
                  </div>

                  <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                    report.actionTakenStatus === 'Resolved'
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                      : report.actionTakenStatus === 'Authorities Dispatched'
                      ? 'bg-amber-950 text-amber-300 border-amber-800'
                      : 'bg-slate-900 text-slate-400 border-slate-800'
                  }`}>
                    Status: {report.actionTakenStatus}
                  </span>
                </div>

                <h4 className="text-sm font-bold text-white mt-1">
                  {report.title}
                </h4>

                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  {report.description}
                </p>

                <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{report.locationName} ({report.city})</span>
                  </div>

                  <button
                    onClick={() => handleVerify(report.id)}
                    className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-slate-800 transition"
                  >
                    +1 Confirm ({report.verifiedCount})
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Incident Reporting Modal */}
      {isReportModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          role="presentation"
        >
          <div 
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="report-modal-title"
            className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-500" aria-hidden="true" />
                <h3 id="report-modal-title" className="font-bold text-white text-base">Report Local Smog Emission Source</h3>
              </div>
              <button 
                onClick={() => setIsReportModalOpen(false)}
                aria-label="Close dialog"
                className="text-slate-400 hover:text-white p-1 rounded-lg focus-visible:ring-2 focus-visible:ring-cyan-400"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            {/* Privacy notice */}
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 flex items-start gap-2">
              <Lock className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <p>
                <strong>Privacy-Conscious Reporting:</strong> Only provide sector, landmark, or street intersection details. Do NOT enter private residential apartment numbers or private personal names.
              </p>
            </div>

            <form onSubmit={handleSubmitReport} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-300">Violation Category</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as CommunityReport['type'])}
                  className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                >
                  <option value="open_burning">Open Leaf / Trash / Biomass Burning</option>
                  <option value="construction_dust">Uncovered Construction Aggregate / Dust</option>
                  <option value="idling_fleet">Idling Commercial Diesel Bus / Fleet</option>
                  <option value="diesel_generator">Unscrubbed Commercial Diesel Generator</option>
                  <option value="unfiltered_chimney">Unfiltered Restaurant / Bakery Wood Chimney</option>
                  <option value="clean_air_shelter">Register Public Clean Air Shelter (HEPA Purified)</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-300">Title</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Dry leaf pile smoldering near Sector 15 park gate"
                  className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-300">Approximate Landmark / Sector</label>
                  <input
                    type="text"
                    required
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    placeholder="e.g. Sector 15 North Boundary"
                    className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-300">City</label>
                  <input
                    type="text"
                    required
                    value={newCity}
                    onChange={(e) => setNewCity(e.target.value)}
                    placeholder="e.g. Delhi NCR, Hyderabad..."
                    className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-300">Description & Visual Observation</label>
                <textarea
                  rows={3}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Describe smoke density, wind direction, nearby schools or hospitals..."
                  className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsReportModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg font-bold bg-rose-600 hover:bg-rose-500 text-white shadow"
                >
                  Publish Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
