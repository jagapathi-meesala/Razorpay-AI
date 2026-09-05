import React, { useState, useEffect } from 'react';
import { Save, RotateCcw, Shield, DollarSign, Info, CheckCircle2, AlertTriangle, ShieldAlert } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const SETTINGS_KEY = 'riskshield_settings';

interface RiskSettings {
  highRiskThreshold: number;
  mediumRiskThreshold: number;
  falsePositiveCost: number;
  falseNegativeCost: number;
}

export const DEFAULT_SETTINGS: RiskSettings = {
  highRiskThreshold: 80,
  mediumRiskThreshold: 40,
  falsePositiveCost: 1200,
  falseNegativeCost: 12000,
};

export const loadSettings = (): RiskSettings => {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
  } catch {}
  return DEFAULT_SETTINGS;
};

const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const isReadOnly = !isAdmin;

  const [settings, setSettings] = useState<RiskSettings>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);
  const [resetNotif, setResetNotif] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  useEffect(() => {
    // Fetch system configuration from backend database
    axios.get('/api/settings')
      .then(res => {
        const d = res.data;
        const fetchedSettings: RiskSettings = {
          highRiskThreshold: d.high_risk_threshold ?? 80,
          mediumRiskThreshold: d.medium_risk_threshold ?? 40,
          falsePositiveCost: d.false_positive_cost ?? 1200,
          falseNegativeCost: d.false_negative_cost ?? 12000,
        };
        setSettings(fetchedSettings);
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(fetchedSettings));
      })
      .catch(() => {
        // Fallback to local default if endpoint loading encounters an issue
        setSettings(loadSettings());
      });
  }, []);

  const handleSave = async () => {
    if (isReadOnly) {
      setErrMsg("Permission Denied: System settings can only be modified by an ADMIN.");
      return;
    }
    setErrMsg(null);
    try {
      const payload = {
        high_risk_threshold: settings.highRiskThreshold,
        medium_risk_threshold: settings.mediumRiskThreshold,
        false_positive_cost: settings.falsePositiveCost,
        false_negative_cost: settings.falseNegativeCost,
      };
      await axios.post('/api/settings', payload);
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
      setResetNotif(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      if (err.response?.status === 403) {
        setErrMsg("HTTP 403 Forbidden: You do not have administrator permissions to save system settings.");
      } else {
        setErrMsg(err.response?.data?.detail || "Failed to save system settings.");
      }
    }
  };

  const handleReset = async () => {
    if (isReadOnly) {
      setErrMsg("Permission Denied: System settings can only be reset by an ADMIN.");
      return;
    }
    setErrMsg(null);
    try {
      const payload = {
        high_risk_threshold: DEFAULT_SETTINGS.highRiskThreshold,
        medium_risk_threshold: DEFAULT_SETTINGS.mediumRiskThreshold,
        false_positive_cost: DEFAULT_SETTINGS.falsePositiveCost,
        false_negative_cost: DEFAULT_SETTINGS.falseNegativeCost,
      };
      await axios.post('/api/settings', payload);
      setSettings(DEFAULT_SETTINGS);
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(DEFAULT_SETTINGS));
      setSaved(false);
      setResetNotif(true);
      setTimeout(() => setResetNotif(false), 3000);
    } catch (err: any) {
      setErrMsg(err.response?.data?.detail || "Failed to reset settings.");
    }
  };

  const handle = (key: keyof RiskSettings) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    if (!isNaN(v)) setSettings(prev => ({ ...prev, [key]: v }));
  };

  return (
    <div className="p-8 space-y-6 max-w-[1400px] mx-auto animate-fade-in">
      {/* Security Read-Only Warning Banner */}
      {isReadOnly && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 18px',
          background: '#fffbebf0', border: '1px solid #fde68a', borderRadius: '10px',
          color: '#92400e', fontSize: '13px', lineHeight: '1.4'
        }}>
          <ShieldAlert size={20} style={{ color: '#d97706', flexShrink: 0 }} />
          <div>
            <strong>Administrative Security Notice:</strong> System Configuration is locked. Only users with the <strong>ADMIN</strong> role have authorization to modify risk thresholds or operational cost matrices. You are logged in as <strong>{user?.role || 'ANALYST'}</strong> (Read-Only).
          </div>
        </div>
      )}

      {errMsg && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px',
          background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px',
          color: '#991b1b', fontSize: '13px'
        }}>
          <AlertTriangle size={18} style={{ color: '#dc2626' }} />
          {errMsg}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-5">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 font-sans">System Configuration</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure risk thresholds, operational costs, and machine learning decision boundaries for the risk engine.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {saved && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '7px 14px', background: '#ecfdf5', border: '1px solid #a7f3d0',
              borderRadius: '8px', fontSize: '12px', fontWeight: 700, color: '#047857',
              animation: 'fadeIn 0.2s ease-in-out'
            }}>
              <CheckCircle2 size={14} /> Settings Saved
            </span>
          )}
          {resetNotif && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '7px 14px', background: '#eef2ff', border: '1px solid #c7d2fe',
              borderRadius: '8px', fontSize: '12px', fontWeight: 700, color: '#4338ca',
              animation: 'fadeIn 0.2s ease-in-out'
            }}>
              <RotateCcw size={14} /> Defaults Restored
            </span>
          )}
          <button
            type="button"
            onClick={handleReset}
            disabled={isReadOnly}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              padding: '10px 18px', background: 'var(--surface)', border: '1.5px solid var(--border)',
              borderRadius: '9px', fontSize: '13px', fontWeight: 700, color: isReadOnly ? 'var(--text-4)' : 'var(--text-2)',
              cursor: isReadOnly ? 'not-allowed' : 'pointer', opacity: isReadOnly ? 0.6 : 1, boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              transition: 'all 0.15s ease'
            }}
          >
            <RotateCcw size={15} /> Reset Defaults
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isReadOnly}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              padding: '10px 20px', background: isReadOnly ? '#94a3b8' : 'var(--brand)', color: '#ffffff',
              border: 'none', borderRadius: '9px', fontSize: '13px', fontWeight: 700,
              cursor: isReadOnly ? 'not-allowed' : 'pointer', opacity: isReadOnly ? 0.6 : 1, boxShadow: isReadOnly ? 'none' : '0 2px 8px rgba(79, 70, 229, 0.25)',
              transition: 'all 0.15s ease'
            }}
          >
            <Save size={15} /> Save Settings
          </button>
        </div>
      </div>

      {/* Main Grid: Left Controls (8 cols) + Right Summary Inspector (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left Column: Sliders & Costs */}
        <div className="lg:col-span-8 space-y-6">

          {/* Risk Threshold Configuration */}
          <div className="glass-panel p-6 space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-rose-50 rounded-lg text-rose-700 border border-rose-100">
                <Shield size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">Risk Classification Thresholds</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Define the score boundaries that determine how the classifier labels each transaction.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* High Risk Threshold */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">High Risk Boundary</label>
                  <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded border border-rose-100 font-mono">
                    ≥ {settings.highRiskThreshold}
                  </span>
                </div>
                 <input
                  type="range"
                  min={51}
                  max={95}
                  step={1}
                  value={settings.highRiskThreshold}
                  onChange={handle('highRiskThreshold')}
                  disabled={isReadOnly}
                  className={`w-full h-1.5 bg-slate-200 rounded-full appearance-none accent-rose-600 ${isReadOnly ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-semibold font-mono">
                  <span>51</span><span>95</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Scores at or above this boundary are flagged as <strong className="text-rose-700">HIGH RISK</strong>. Recommended: 70–85.
                </p>
              </div>

              {/* Medium Risk Threshold */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Medium Risk Boundary</label>
                  <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded border border-amber-100 font-mono">
                    ≥ {settings.mediumRiskThreshold}
                  </span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={Math.max(settings.highRiskThreshold - 5, 15)}
                  step={1}
                  value={settings.mediumRiskThreshold}
                  onChange={handle('mediumRiskThreshold')}
                  disabled={isReadOnly}
                  className={`w-full h-1.5 bg-slate-200 rounded-full appearance-none accent-amber-600 ${isReadOnly ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-semibold font-mono">
                  <span>10</span><span>{Math.max(settings.highRiskThreshold - 5, 15)}</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Scores between this and the high boundary are flagged as <strong className="text-amber-700">MEDIUM RISK</strong>. Recommended: 30–50.
                </p>
              </div>
            </div>

            {/* Visual legend */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex items-center gap-6 flex-wrap">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Active Classification Spectrum</span>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></span>
                <span className="text-xs text-slate-650 font-medium">LOW: 0 – {settings.mediumRiskThreshold - 1}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0"></span>
                <span className="text-xs text-slate-650 font-medium">MEDIUM: {settings.mediumRiskThreshold} – {settings.highRiskThreshold - 1}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0"></span>
                <span className="text-xs text-slate-650 font-medium">HIGH: {settings.highRiskThreshold} – 100</span>
              </div>
            </div>
          </div>

          {/* Operational Cost Center */}
          <div className="glass-panel p-6 space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-50 rounded-lg text-indigo-700 border border-indigo-100">
                <DollarSign size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">Operational Cost Center</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Set the business cost of misclassifications to simulate financial impact in the threshold optimizer.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* FP Cost */}
              <div className="space-y-3">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Cost per False Positive (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">₹</span>
                  <input
                    type="number"
                    min={0}
                    value={settings.falsePositiveCost}
                    onChange={handle('falsePositiveCost')}
                    disabled={isReadOnly}
                    className="w-full bg-white border border-slate-200 rounded-lg pl-8 pr-4 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-50 font-semibold transition-colors disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed font-mono"
                  />
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Cost of incorrectly flagging a legitimate order as fraudulent — includes manual review labor, customer friction, and cart abandonment impact.
                </p>
              </div>

              {/* FN Cost */}
              <div className="space-y-3">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Cost per False Negative (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">₹</span>
                  <input
                    type="number"
                    min={0}
                    value={settings.falseNegativeCost}
                    onChange={handle('falseNegativeCost')}
                    disabled={isReadOnly}
                    className="w-full bg-white border border-slate-200 rounded-lg pl-8 pr-4 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-50 font-semibold transition-colors disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed font-mono"
                  />
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Cost of a missed fraudulent order getting through — includes chargeback fee, merchandise loss, and dispute management overhead.
                </p>
              </div>
            </div>

            {/* Cost summary preview */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Info size={12} /> These values power the Threshold Optimizer on the Model Performance page.
              </span>
              <div className="flex flex-wrap gap-8 pt-1">
                <div>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">FP Cost</p>
                  <p className="text-sm font-extrabold text-slate-800 font-mono">₹{settings.falsePositiveCost.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">FN Cost</p>
                  <p className="text-sm font-extrabold text-slate-800 font-mono">₹{settings.falseNegativeCost.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">FN / FP Ratio</p>
                  <p className="text-sm font-extrabold text-slate-800 font-mono">
                    {settings.falsePositiveCost > 0 ? (settings.falseNegativeCost / settings.falsePositiveCost).toFixed(1) : '—'}×
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Engine Summary & System Status Cards */}
        <div className="lg:col-span-4 space-y-6">

          {/* Real-time System Status Inspector */}
          <div className="glass-panel p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Engine Security Status</span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                ACTIVE PROD
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Access Mode</span>
                <span className="font-bold text-slate-800 font-mono">{isAdmin ? 'ADMIN (Full Write)' : 'ANALYST (Read Only)'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">DB Synchronization</span>
                <span className="font-bold text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 size={12} /> Synchronized
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Config Version</span>
                <span className="font-bold text-slate-800 font-mono">v2.5-production</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Decision Policy</span>
                <span className="font-bold text-indigo-600 font-mono">Random Forest Enforced</span>
              </div>
            </div>
          </div>

          {/* Quick Threshold Reference Guide */}
          <div className="glass-panel p-5 space-y-4">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Threshold Guidelines</h4>
            <div className="space-y-3 text-[11px] text-slate-650 leading-relaxed">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500" /> High Risk Cutoff (≥ {settings.highRiskThreshold})
                </div>
                <p className="text-slate-500">
                  Transactions scoring at or above this cutoff are automatically blocked or assigned to mandatory manual review.
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400" /> Medium Risk Band ({settings.mediumRiskThreshold} - {settings.highRiskThreshold - 1})
                </div>
                <p className="text-slate-500">
                  Step-up authentication (3DS OTP / Biometrics) is enforced on orders within this range.
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" /> Low Risk Band (0 - {settings.mediumRiskThreshold - 1})
                </div>
                <p className="text-slate-500">
                  Frictionless instant approval for clean payment flows.
                </p>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default SettingsPage;
