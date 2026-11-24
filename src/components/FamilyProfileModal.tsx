import React, { useState } from 'react';
import type { FamilyProfile, VulnerabilityType } from '../types';
import { X, UserPlus, Trash2, Home, ShieldAlert, Sliders } from 'lucide-react';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface FamilyProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: FamilyProfile;
  onSaveProfile: (newProfile: FamilyProfile) => void;
}

export const FamilyProfileModal: React.FC<FamilyProfileModalProps> = ({
  isOpen,
  onClose,
  profile,
  onSaveProfile,
}) => {
  const [edited, setEdited] = useState<FamilyProfile>({ ...profile });
  const [activeTab, setActiveTab] = useState<'members' | 'housing' | 'commute' | 'preferences'>('members');
  const trapRef = useFocusTrap<HTMLDivElement>({ isOpen, onClose });

  if (!isOpen) return null;

  const handleAddMember = () => {
    const newId = `mem-${Date.now()}`;
    setEdited({
      ...edited,
      members: [
        ...edited.members,
        {
          id: newId,
          label: 'New Member',
          type: 'child',
          age: 6,
          specialNotes: 'Winter respiratory sensitivity',
        },
      ],
    });
  };

  const handleRemoveMember = (id: string) => {
    setEdited({
      ...edited,
      members: edited.members.filter(m => m.id !== id),
    });
  };

  const handleRoomDimensionChange = (key: 'roomLengthM' | 'roomWidthM' | 'roomHeightM', val: number) => {
    const length = key === 'roomLengthM' ? val : (edited.housing.roomLengthM || 6);
    const width = key === 'roomWidthM' ? val : (edited.housing.roomWidthM || 5);
    const height = key === 'roomHeightM' ? val : (edited.housing.roomHeightM || 2.8);
    const volume = Math.round(length * width * height * 10) / 10;

    setEdited({
      ...edited,
      housing: {
        ...edited.housing,
        [key]: val,
        roomVolumeM3: volume,
      }
    });
  };

  const handleSave = () => {
    onSaveProfile(edited);
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-modal-title"
    >
      <div 
        ref={trapRef}
        className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl shadow-cyan-950/40 focus:outline-none"
        tabIndex={-1}
      >
        
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-950 text-cyan-400 border border-cyan-800/60">
              <Home className="w-5 h-5" />
            </div>
            <div>
              <h2 id="profile-modal-title" className="text-lg font-bold text-white">Household & Vulnerability Profile</h2>
              <p className="text-xs text-slate-400">
                Personalized aerosol mass balance & tailored low-emission routines
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition focus-visible:ring-2 focus-visible:ring-cyan-400"
            aria-label="Close household profile dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Profile Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-5 pt-2 gap-2 text-xs font-semibold overflow-x-auto">
          <button
            onClick={() => setActiveTab('members')}
            className={`pb-2.5 px-3 border-b-2 transition whitespace-nowrap ${
              activeTab === 'members'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Family Members ({edited.members.length})
          </button>
          <button
            onClick={() => setActiveTab('housing')}
            className={`pb-2.5 px-3 border-b-2 transition whitespace-nowrap ${
              activeTab === 'housing'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Housing & Room Geometry
          </button>
          <button
            onClick={() => setActiveTab('commute')}
            className={`pb-2.5 px-3 border-b-2 transition whitespace-nowrap ${
              activeTab === 'commute'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Daily Commute & School Run
          </button>
          <button
            onClick={() => setActiveTab('preferences')}
            className={`pb-2.5 px-3 border-b-2 transition whitespace-nowrap ${
              activeTab === 'preferences'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            AQI Scale & Budget
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1 text-sm text-slate-200">
          
          {/* TAB 1: MEMBERS */}
          {activeTab === 'members' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800">
                <div className="flex-1">
                  <label className="text-xs font-medium text-slate-400">Household Label</label>
                  <input
                    type="text"
                    value={edited.name}
                    onChange={(e) => setEdited({ ...edited, name: e.target.value })}
                    className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddMember}
                  className="sm:mt-5 flex items-center gap-1.5 px-3 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs transition shrink-0"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Add Member
                </button>
              </div>

              <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-800/40 text-xs text-cyan-300 flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <p>
                  <strong>Voluntary Health Information:</strong> Respiratory conditions are used solely to calibrate personal inhalation exposure models and highlight high-risk inversion hours. Data is never shared or stored externally.
                </p>
              </div>

              <div className="space-y-3 pt-1">
                {edited.members.map((member, idx) => (
                  <div key={member.id} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-cyan-400">Member #{idx + 1}</span>
                      {edited.members.length > 1 && (
                        <button
                          onClick={() => handleRemoveMember(member.id)}
                          className="text-slate-500 hover:text-red-400 transition"
                          title="Remove Member"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div>
                        <label className="text-[11px] text-slate-400">Name / Relation</label>
                        <input
                          type="text"
                          value={member.label}
                          onChange={(e) => {
                            const updated = [...edited.members];
                            updated[idx].label = e.target.value;
                            setEdited({ ...edited, members: updated });
                          }}
                          className="w-full mt-1 bg-slate-900 border border-slate-800 rounded-md px-2.5 py-1.5 text-xs text-white"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] text-slate-400">Vulnerability Category</label>
                        <select
                          value={member.type}
                          onChange={(e) => {
                            const updated = [...edited.members];
                            updated[idx].type = e.target.value as VulnerabilityType;
                            setEdited({ ...edited, members: updated });
                          }}
                          className="w-full mt-1 bg-slate-900 border border-slate-800 rounded-md px-2.5 py-1.5 text-xs text-white"
                        >
                          <option value="infant">Infant (0-2 yrs)</option>
                          <option value="child">Child (3-12 yrs)</option>
                          <option value="senior">Senior (60+ yrs)</option>
                          <option value="asthma_copd">Asthma / COPD / Wheezing</option>
                          <option value="cardiac">Cardiovascular Patient</option>
                          <option value="pregnant">Pregnant Individual</option>
                          <option value="healthy_adult">Healthy Adult</option>
                          <option value="pet">Family Pet (Dog/Cat)</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] text-slate-400">Age</label>
                        <input
                          type="number"
                          value={member.age}
                          onChange={(e) => {
                            const updated = [...edited.members];
                            updated[idx].age = Number(e.target.value);
                            setEdited({ ...edited, members: updated });
                          }}
                          className="w-full mt-1 bg-slate-900 border border-slate-800 rounded-md px-2.5 py-1.5 text-xs text-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-400">Special Inhalation Notes / Medications</label>
                      <input
                        type="text"
                        value={member.specialNotes}
                        placeholder="e.g. Inhaler on standby, sensitive to dust resuspension, morning bus commuter..."
                        onChange={(e) => {
                          const updated = [...edited.members];
                          updated[idx].specialNotes = e.target.value;
                          setEdited({ ...edited, members: updated });
                        }}
                        className="w-full mt-1 bg-slate-900 border border-slate-800 rounded-md px-2.5 py-1 text-xs text-slate-300"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: HOUSING & ROOM GEOMETRY */}
          {activeTab === 'housing' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300">Dwelling Type</label>
                  <select
                    value={edited.housing.type}
                    onChange={(e) => setEdited({
                      ...edited,
                      housing: { ...edited.housing, type: e.target.value as FamilyProfile['housing']['type'] }
                    })}
                    className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white"
                  >
                    <option value="high_rise_apt">High-Rise Apartment (Floors 5+)</option>
                    <option value="mid_rise_apt">Mid-Rise Apartment (Floors 2-4)</option>
                    <option value="ground_floor_villa">Ground-Floor Independent House / Villa</option>
                    <option value="traditional_house">Traditional / Semi-Ventilated Residence</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300">Floor Level</label>
                  <input
                    type="number"
                    value={edited.housing.floorLevel}
                    onChange={(e) => setEdited({
                      ...edited,
                      housing: { ...edited.housing, floorLevel: Number(e.target.value) }
                    })}
                    className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white"
                  />
                </div>
              </div>

              {/* Room Dimensions & Volume Calculator */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                    Clean Haven Room Dimensions
                  </span>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800">
                    Volume: {edited.housing.roomVolumeM3 || 85} m³
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2.5 text-xs">
                  <div>
                    <label className="text-[11px] text-slate-400">Length (m)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={edited.housing.roomLengthM || 6}
                      onChange={(e) => handleRoomDimensionChange('roomLengthM', parseFloat(e.target.value) || 6)}
                      className="w-full mt-1 bg-slate-900 border border-slate-800 rounded-md p-1.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400">Width (m)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={edited.housing.roomWidthM || 5}
                      onChange={(e) => handleRoomDimensionChange('roomWidthM', parseFloat(e.target.value) || 5)}
                      className="w-full mt-1 bg-slate-900 border border-slate-800 rounded-md p-1.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400">Height (m)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={edited.housing.roomHeightM || 2.8}
                      onChange={(e) => handleRoomDimensionChange('roomHeightM', parseFloat(e.target.value) || 2.8)}
                      className="w-full mt-1 bg-slate-900 border border-slate-800 rounded-md p-1.5 text-xs text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Infiltration & Equipment */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300">Window Draftiness / Sealing</label>
                  <select
                    value={edited.housing.windowDraftiness}
                    onChange={(e) => setEdited({
                      ...edited,
                      housing: { ...edited.housing, windowDraftiness: e.target.value as FamilyProfile['housing']['windowDraftiness'] }
                    })}
                    className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white"
                  >
                    <option value="sealed">Double Glazed / Well-Sealed (λ ≈ 0.35 ACH)</option>
                    <option value="moderate_drafts">Standard Windows with Minor Gaps (λ ≈ 0.8 ACH)</option>
                    <option value="high_leaks">Loose Sliding Doors / High Leaks (λ ≈ 1.5 ACH)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300">Clean Air Purifier CADR (m³/h)</label>
                  <input
                    type="number"
                    value={edited.airPurifierCADR}
                    onChange={(e) => setEdited({ ...edited, airPurifierCADR: Number(e.target.value) })}
                    className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white"
                  />
                </div>
              </div>

              {/* Kitchen & Heating Fuel */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300">Cooking Fuel</label>
                  <select
                    value={edited.housing.cookingFuel}
                    onChange={(e) => setEdited({
                      ...edited,
                      housing: { ...edited.housing, cookingFuel: e.target.value as FamilyProfile['housing']['cookingFuel'] }
                    })}
                    className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white"
                  >
                    <option value="induction_electric">Induction / Electric Stovetop (Zero Direct Flame)</option>
                    <option value="piped_natural_gas">Piped Natural Gas (PNG)</option>
                    <option value="lpg_cylinder">LPG Cylinder</option>
                    <option value="biomass_solid">Biomass / Traditional Chulha (High Indoor PM)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300">Kitchen Ventilation</label>
                  <select
                    value={edited.housing.kitchenVentilation}
                    onChange={(e) => setEdited({
                      ...edited,
                      housing: { ...edited.housing, kitchenVentilation: e.target.value as FamilyProfile['housing']['kitchenVentilation'] }
                    })}
                    className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white"
                  >
                    <option value="ducted_range_hood">Ducted Range Hood (Vents Outside)</option>
                    <option value="exhaust_fan">Wall Exhaust Fan</option>
                    <option value="recirculating_hood">Recirculating Grease Hood (No Outside Duct)</option>
                    <option value="natural_window_only">Window Only</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: COMMUTE */}
          {activeTab === 'commute' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300">Primary Commute Mode</label>
                  <select
                    value={edited.commute.primaryMode}
                    onChange={(e) => setEdited({
                      ...edited,
                      commute: { ...edited.commute, primaryMode: e.target.value as FamilyProfile['commute']['primaryMode'] }
                    })}
                    className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white"
                  >
                    <option value="metro_train">Metro / Rapid Transit (Shielded Underground/Elevated)</option>
                    <option value="electric_bus">Electric Bus (AC)</option>
                    <option value="diesel_bus">Diesel Public Bus</option>
                    <option value="auto_rickshaw">Auto-Rickshaw (High Roadside Exposure)</option>
                    <option value="two_wheeler">Two-Wheeler / Motorbike (Direct Exposure)</option>
                    <option value="private_car">Private Car (Internal Cabin Recirculation)</option>
                    <option value="cycling">Bicycle / Cycle Rickshaw</option>
                    <option value="walking">Walking Commuter</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300">One-Way Commute Distance (km)</label>
                  <input
                    type="number"
                    value={edited.commute.commuteDistanceKm}
                    onChange={(e) => setEdited({
                      ...edited,
                      commute: { ...edited.commute, commuteDistanceKm: Number(e.target.value) }
                    })}
                    className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300">Morning Departure Time</label>
                  <input
                    type="time"
                    value={edited.commute.morningDepartureTime || '07:30'}
                    onChange={(e) => setEdited({
                      ...edited,
                      commute: { ...edited.commute, morningDepartureTime: e.target.value }
                    })}
                    className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white"
                  />
                  <span className="text-[10px] text-slate-500">Departure between 06:30 and 08:30 coincides with peak ground inversion.</span>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300">Evening Return Time</label>
                  <input
                    type="time"
                    value={edited.commute.eveningReturnTime || '18:00'}
                    onChange={(e) => setEdited({
                      ...edited,
                      commute: { ...edited.commute, eveningReturnTime: e.target.value }
                    })}
                    className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white"
                  />
                  <span className="text-[10px] text-slate-500">Coincides with nocturnal boundary layer collapse.</span>
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={edited.commute.flexibleWorkHours}
                    onChange={(e) => setEdited({
                      ...edited,
                      commute: { ...edited.commute, flexibleWorkHours: e.target.checked }
                    })}
                    className="w-4 h-4 rounded text-cyan-500 bg-slate-900 border-slate-800 focus:ring-0"
                  />
                  <span className="text-xs text-slate-300">
                    Employer / school allows flexible departure timings (allows 35-minute delay to bypass peak inversion)
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* TAB 4: PREFERENCES & BUDGET */}
          {activeTab === 'preferences' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300">Preferred Air Quality Index (AQI) Standard</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1.5">
                  <div 
                    onClick={() => setEdited({ ...edited, preferredAQIScale: 'IN_NAQI' })}
                    className={`p-3 rounded-xl border cursor-pointer transition ${
                      edited.preferredAQIScale === 'IN_NAQI'
                        ? 'bg-cyan-950/60 border-cyan-500 text-white shadow-md'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold text-xs text-cyan-300">
                      <span>Indian National AQI (CPCB 2014)</span>
                      {edited.preferredAQIScale === 'IN_NAQI' && <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500 text-black">Active</span>}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Calibrated for Indian atmospheric aerosol loadings. Good: 0-50, Satisfactory: 51-100, Moderate: 101-200, Poor: 201-300, Very Poor: 301-400, Severe: 401-500.
                    </p>
                  </div>

                  <div 
                    onClick={() => setEdited({ ...edited, preferredAQIScale: 'US_EPA' })}
                    className={`p-3 rounded-xl border cursor-pointer transition ${
                      edited.preferredAQIScale === 'US_EPA'
                        ? 'bg-cyan-950/60 border-cyan-500 text-white shadow-md'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold text-xs text-cyan-300">
                      <span>US EPA AQI (Revised 2024 Standard)</span>
                      {edited.preferredAQIScale === 'US_EPA' && <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500 text-black">Active</span>}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Stricter annual & 24h standard (PM2.5 9.0 µg/m³ Good threshold). Good: 0-50, Moderate: 51-100, USG: 101-150, Unhealthy: 151-200, Very Unhealthy: 201-300, Hazardous: 301+.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="text-xs font-semibold text-slate-300">Household Budget Tier</label>
                  <select
                    value={edited.budgetTier || 'moderate'}
                    onChange={(e) => setEdited({
                      ...edited,
                      budgetTier: e.target.value as FamilyProfile['budgetTier']
                    })}
                    className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white"
                  >
                    <option value="low_cost">Low Cost / DIY (Corsi-Rosenthal Boxes, Draft Snakes, ₹3,500)</option>
                    <option value="moderate">Moderate (Standard HEPA Units, Smart Plugs, ₹12,000–₹25,000)</option>
                    <option value="premium">Premium (Multi-Room Commercial Purifiers, HRV/ERV, ₹50,000+)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300">Language Preference</label>
                  <select
                    value={edited.preferredLanguage || 'en'}
                    onChange={(e) => setEdited({
                      ...edited,
                      preferredLanguage: e.target.value as FamilyProfile['preferredLanguage']
                    })}
                    className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white"
                  >
                    <option value="en">English</option>
                    <option value="hi">हिंदी (Hindi)</option>
                    <option value="te">తెలుగు (Telugu)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-600/20 transition"
          >
            Save Household Profile
          </button>
        </div>

      </div>
    </div>
  );
};
