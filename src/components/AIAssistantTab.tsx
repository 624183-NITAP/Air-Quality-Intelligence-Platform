import React, { useState, useRef, useEffect } from 'react';
import type { FamilyProfile, LocationData, GenAIMessage } from '../types';
import { askAeroAI, type GeminiModelName } from '../services/aiService';
import { sanitizeUserInput, resolveGeminiApiKey, scrubErrorDetails } from '../utils/security';
import { 
  Bot, 
  Send, 
  Sparkles, 
  User, 
  ShieldCheck, 
  Leaf, 
  ArrowRight, 
  Key, 
  RefreshCw,
  Lightbulb,
  Trash2,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Activity,
  Layers,
  Cpu
} from 'lucide-react';

interface AIAssistantTabProps {
  profile: FamilyProfile;
  location: LocationData;
  apiKey?: string;
  onOpenApiKeyModal: () => void;
  onNavigateTab: (tab: 'intelligence' | 'routines' | 'indoor' | 'community' | 'cleanheat') => void;
}

const SUGGESTED_PROMPTS = [
  "How should I shield my asthmatic child during the 07:30 AM school run?",
  "When is the safest 15-minute window to ventilate and flush indoor CO2 today?",
  "How can I construct an ultra-high CADR Corsi-Rosenthal Box under $50?",
  "What is the direct neighborhood emission cut if our block stops burning leaves?",
  "Our kitchen fills with oil smoke during dinner. What is the physics-backed fix?",
  "We live in a high-rise on the 14th floor. How does winter smog affect us differently?"
];

export const AIAssistantTab: React.FC<AIAssistantTabProps> = ({
  profile,
  location,
  apiKey,
  onOpenApiKeyModal,
  onNavigateTab,
}) => {
  const [selectedModel, setSelectedModel] = useState<GeminiModelName>('gemini-2.0-flash');
  const [expandedBreakdownId, setExpandedBreakdownId] = useState<string | null>(null);

  const initialWelcomeMessage: GenAIMessage = {
    id: 'welcome-1',
    sender: 'assistant',
    timestamp: 'Just now',
    text: `Hello ${profile.name}! I am **AeroPulse 2.0 AI**, your science-driven atmospheric health and clean air lifestyle guide.

I have analyzed your real-time environmental context:
- **Location:** ${location.city}, ${location.country} (AQI **${location.calculatedAQI?.indianNAQI?.value ?? 150}**, PM2.5 **${location.pollutants.pm25} µg/m³**, Inversion: **${location.weather.inversionCondition}**)
- **Boundary Layer Height:** **${location.weather.boundaryLayerHeightMeters ?? 220} meters** (${location.weather.dispersionFactor})
- **Household:** ${profile.members.length} members (${profile.members.map(m => m.label).join(', ')})
- **Housing:** ${profile.housing.type} (Floor ${profile.housing.floorLevel}, room volume ${profile.housing.roomVolumeM3 || 85} m³)

Ask me anything about protecting family airways, timing micro-shifts around the diurnal smog curve, building DIY purifiers, or measuring your neighborhood emissions impact!`,
    structuredBreakdown: {
      currentSituation: `Ambient PM2.5 in ${location.city} is ${location.pollutants.pm25} µg/m³ with a boundary layer compressed at ${location.weather.boundaryLayerHeightMeters ?? 220}m.`,
      scientificExplanation: `Winter radiational cooling traps vehicular exhaust and cooking emissions near the surface. Ordinary room air exchange without filtration causes indoor particulate to reach 75% of outdoor levels within 2 hours.`,
      recommendedAction: `Establish a Clean Bedroom Haven with CADR matching room volume (achieving ≥ 4 ACH), delay morning exercise to midday, and switch car ventilation to recirculation.`,
      whyItHelps: `Mitigates acute bronchial inflammation in vulnerable family members and prevents chronic alveolar particle accumulation.`,
      expectedImpact: `Reduces sleep-time lung particle exposure by > 75%, while neighborhood carpooling eliminates ~180g PM2.5 weekly.`,
      assumptions: `Room volume = ${profile.housing.roomVolumeM3 || 85} m³, continuous filtration operation, windows closed during morning inversion.`,
      confidenceLevel: 'High',
      importantLimitations: `Engineering guidance only. Does not replace individual medical prescriptions.`
    },
    suggestedActions: [
      { type: 'apply_routine', label: 'View Personalized Daily Micro-Shifts' },
      { type: 'cadr_recalc', label: 'Open Corsi-Rosenthal Box Sizer' },
      { type: 'view_hack', label: 'Browse 7 IAQ Blueprints' }
    ]
  };

  const [messages, setMessages] = useState<GenAIMessage[]>([initialWelcomeMessage]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleResetChat = () => {
    setMessages([initialWelcomeMessage]);
    setErrorMessage(null);
    setExpandedBreakdownId(null);
  };

  const handleSend = async (textToSend?: string) => {
    const raw = textToSend || inputPrompt;
    const query = sanitizeUserInput(raw, 1000);
    if (!query || isLoading) return;

    setErrorMessage(null);
    const userMessage: GenAIMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: query,
    };

    setMessages(prev => [...prev, userMessage]);
    setInputPrompt('');
    setIsLoading(true);

    try {
      const response = await askAeroAI({
        userPrompt: query,
        conversationHistory: [...messages, userMessage],
        profile,
        currentLocation: location,
        apiKey: resolveGeminiApiKey(apiKey),
        model: selectedModel,
      });

      setMessages(prev => [...prev, response]);
      if (response.structuredBreakdown) {
        setExpandedBreakdownId(response.id);
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setErrorMessage(scrubErrorDetails(err));
        // Generate fallback message
        try {
          const fallback = await askAeroAI({
            userPrompt: query,
            conversationHistory: [...messages, userMessage],
            profile,
            currentLocation: location,
            apiKey: undefined, // Force local engine
          });
          setMessages(prev => [...prev, fallback]);
        } catch {
          setErrorMessage('Unable to process request safely at this time.');
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleActionClick = (action: NonNullable<GenAIMessage['suggestedActions']>[0]) => {
    if (action.type === 'apply_routine') {
      onNavigateTab('routines');
    } else if (action.type === 'cadr_recalc') {
      onNavigateTab('indoor');
    } else if (action.type === 'view_hack') {
      onNavigateTab('indoor');
    } else if (action.type === 'community_alert') {
      onNavigateTab('community');
    }
  };

  const toggleBreakdown = (msgId: string) => {
    setExpandedBreakdownId(prev => prev === msgId ? null : msgId);
  };

  const hasActiveKey = Boolean(resolveGeminiApiKey(apiKey));

  return (
    <div className="flex flex-col h-[780px] rounded-2xl glass-panel border border-slate-800 overflow-hidden shadow-2xl">
      
      {/* Chat Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/90 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/20">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">AeroPulse 2.0 AI Assistant</h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800 flex items-center gap-1 font-mono">
                <Cpu className="w-2.5 h-2.5" />
                {hasActiveKey ? selectedModel : 'Local Physics Engine'}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Tailored for {profile.name} • {location.city} (PM2.5 {location.pollutants.pm25} µg/m³)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Model selection if API key is present */}
          {hasActiveKey && (
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value as GeminiModelName)}
              className="text-xs bg-slate-900 border border-slate-800 text-slate-300 rounded-lg px-2.5 py-1 focus:outline-none focus:border-cyan-500"
              title="Select Gemini Model"
            >
              <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
              <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
              <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
            </select>
          )}

          <button
            onClick={onOpenApiKeyModal}
            className="text-xs text-slate-400 hover:text-cyan-300 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 transition"
          >
            <Key className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{hasActiveKey ? 'API Key Active' : 'Connect Gemini API'}</span>
          </button>

          <button
            onClick={handleResetChat}
            className="text-xs text-slate-400 hover:text-rose-400 flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 transition"
            title="Clear Chat History"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Suggested Prompt Chips */}
      <div className="px-4 py-2 bg-slate-950/60 border-b border-slate-800/80 flex items-center gap-2 overflow-x-auto text-xs">
        <span className="text-slate-500 font-semibold flex items-center gap-1 shrink-0">
          <Lightbulb className="w-3.5 h-3.5 text-amber-400" /> Prompts:
        </span>
        {SUGGESTED_PROMPTS.map((prompt, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(prompt)}
            className="px-2.5 py-1 rounded-full bg-slate-900 hover:bg-cyan-950 hover:text-cyan-300 text-slate-300 border border-slate-800/80 whitespace-nowrap text-[11px] transition shrink-0"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          const isExpanded = expandedBreakdownId === msg.id;

          return (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''}`}
            >
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                isUser ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-cyan-400 border border-slate-700'
              }`}>
                {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              <div className={`max-w-[90%] sm:max-w-[85%] space-y-3 ${isUser ? 'items-end' : ''}`}>
                <div className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                  isUser
                    ? 'bg-cyan-600 text-white rounded-tr-none'
                    : 'bg-slate-950/95 border border-slate-800 text-slate-200 rounded-tl-none space-y-3'
                }`}>
                  <div className="whitespace-pre-line prose prose-invert prose-xs max-w-none">
                    {msg.text}
                  </div>

                  {/* Structured 8-Part Scientific Breakdown Card (for Assistant responses) */}
                  {!isUser && msg.structuredBreakdown && (
                    <div className="mt-3 pt-3 border-t border-slate-800/80">
                      <button
                        onClick={() => toggleBreakdown(msg.id)}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-slate-900/90 border border-cyan-800/40 text-cyan-300 text-xs font-semibold hover:bg-slate-800/90 transition"
                      >
                        <span className="flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-cyan-400" />
                          Scientific 8-Part Atmospheric & Aerosol Breakdown
                        </span>
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>

                      {isExpanded && (
                        <div className="mt-2.5 p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2.5 text-xs text-slate-300">
                          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                              Physics-Based Validation
                            </span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                              msg.structuredBreakdown.confidenceLevel === 'High' 
                                ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                                : msg.structuredBreakdown.confidenceLevel === 'Moderate'
                                ? 'bg-amber-950 text-amber-300 border-amber-800'
                                : 'bg-slate-800 text-slate-300 border-slate-700'
                            }`}>
                              Confidence: {msg.structuredBreakdown.confidenceLevel}
                            </span>
                          </div>

                          <div>
                            <span className="font-bold text-cyan-400">1. Current Situation:</span>
                            <p className="mt-0.5 text-slate-300">{msg.structuredBreakdown.currentSituation}</p>
                          </div>

                          <div>
                            <span className="font-bold text-cyan-400">2. Scientific Explanation:</span>
                            <p className="mt-0.5 text-slate-300">{msg.structuredBreakdown.scientificExplanation}</p>
                          </div>

                          <div>
                            <span className="font-bold text-cyan-400">3. Recommended Action:</span>
                            <p className="mt-0.5 text-slate-300 whitespace-pre-line">{msg.structuredBreakdown.recommendedAction}</p>
                          </div>

                          <div>
                            <span className="font-bold text-cyan-400">4. Why It Helps:</span>
                            <p className="mt-0.5 text-slate-300">{msg.structuredBreakdown.whyItHelps}</p>
                          </div>

                          <div>
                            <span className="font-bold text-emerald-400">5. Expected Impact:</span>
                            <p className="mt-0.5 text-emerald-300/90">{msg.structuredBreakdown.expectedImpact}</p>
                          </div>

                          <div>
                            <span className="font-bold text-slate-400">6. Physical Assumptions:</span>
                            <p className="mt-0.5 text-slate-400">{msg.structuredBreakdown.assumptions}</p>
                          </div>

                          <div className="pt-1 border-t border-slate-800/60">
                            <span className="font-bold text-amber-400 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" /> 8. Important Limitations:
                            </span>
                            <p className="mt-0.5 text-amber-300/80 text-[11px]">{msg.structuredBreakdown.importantLimitations}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Impact badge attached to AI response */}
                  {msg.impactBadge && (
                    <div className="mt-3 pt-3 border-t border-slate-800 flex flex-wrap gap-2 text-xs">
                      <span className="px-2 py-0.5 rounded-md bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 font-semibold flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" /> {msg.impactBadge.pm25Cut}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-teal-950/80 text-teal-300 border border-teal-800/60 font-semibold flex items-center gap-1">
                        <Leaf className="w-3 h-3" /> {msg.impactBadge.co2Saved}
                      </span>
                    </div>
                  )}
                </div>

                {/* Suggested Action Buttons */}
                {msg.suggestedActions && msg.suggestedActions.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {msg.suggestedActions.map((action, i) => (
                      <button
                        key={i}
                        onClick={() => handleActionClick(action)}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-cyan-800/60 transition flex items-center gap-1.5 shadow-sm"
                      >
                        <Sparkles className="w-3 h-3 text-amber-400" />
                        {action.label}
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    ))}
                  </div>
                )}

                <div className={`text-[10px] text-slate-500 px-1 ${isUser ? 'text-right' : ''}`}>
                  {msg.timestamp}
                </div>
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-slate-800 text-cyan-400 flex items-center justify-center shrink-0 animate-pulse">
              <Bot className="w-4 h-4" />
            </div>
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-300 flex items-center gap-3">
              <RefreshCw className="w-4 h-4 animate-spin text-cyan-400 shrink-0" />
              <div>
                <p className="font-semibold text-white">Computing aerosol dispersion & personalized shielding...</p>
                <p className="text-[11px] text-slate-400">Evaluating mass-balance equation and planetary boundary layer trap.</p>
              </div>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input Bar */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/95">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            placeholder={`Ask AeroPulse 2.0 AI about smog defense for ${profile.name}...`}
            className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
          />
          <button
            type="submit"
            disabled={!inputPrompt.trim() || isLoading}
            className="p-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed text-white transition shadow-lg shadow-cyan-600/20"
            title="Send Query"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
        <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 px-1">
          <span className="flex items-center gap-1">
            <Activity className="w-3 h-3 text-cyan-400" />
            Context-aware: Live PM2.5 ({location.pollutants.pm25} µg/m³), PBL ({location.weather.boundaryLayerHeightMeters ?? 220}m), Room ({profile.housing.roomVolumeM3 || 85} m³)
          </span>
          <span className="hidden sm:inline">Press Enter to send</span>
        </div>
      </div>

    </div>
  );
};
