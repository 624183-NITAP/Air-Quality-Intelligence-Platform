import React, { useState } from 'react';
import { X, Key, ExternalLink } from 'lucide-react';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  onSaveApiKey: (key: string) => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({
  isOpen,
  onClose,
  apiKey,
  onSaveApiKey,
}) => {
  const [val, setVal] = useState(apiKey);
  const trapRef = useFocusTrap<HTMLDivElement>({ isOpen, onClose });

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveApiKey(val.trim());
    onClose();
  };

  const handleClear = () => {
    setVal('');
    onSaveApiKey('');
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="api-key-modal-title"
    >
      <div 
        ref={trapRef}
        className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4 focus:outline-none"
        tabIndex={-1}
      >
        
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-950 text-cyan-400 border border-cyan-800">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 id="api-key-modal-title" className="font-bold text-white text-base">Google Gemini API Key</h3>
              <p className="text-xs text-slate-400">Optional live GenAI integration</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-white p-1 rounded-lg focus-visible:ring-2 focus-visible:ring-cyan-400"
            aria-label="Close API Key dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          AeroPulse includes a high-fidelity built-in atmospheric neuro-heuristic model. If you wish to connect directly to <strong>Google Gemini 2.0 Flash</strong> for unbounded live queries, enter your API key below.
        </p>

        <div>
          <label className="text-xs font-semibold text-slate-300">Gemini API Key</label>
          <input
            type="password"
            value={val}
            onChange={(e) => setVal(e.target.value)}
            placeholder="AIzaSy..."
            className="w-full mt-1.5 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
          />
          <div className="flex items-center justify-between mt-1 text-[11px] text-slate-500">
            <span>Keys are stored strictly in your local browser storage.</span>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noreferrer"
              className="text-cyan-400 hover:underline flex items-center gap-1"
            >
              Get free key <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        <div className="pt-2 flex items-center justify-between border-t border-slate-800">
          {apiKey ? (
            <button
              onClick={handleClear}
              className="text-xs text-rose-400 hover:underline"
            >
              Remove Stored Key
            </button>
          ) : <div />}

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white shadow-md shadow-cyan-600/20"
            >
              Save API Key
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
