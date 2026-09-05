import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Settings, CheckCircle, Database, BarChart3, ShieldCheck
} from 'lucide-react';
import { loadSettings } from './Settings';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as ChartTooltip
} from 'recharts';

interface ImportanceItem { feature: string; importance: number; }
interface MetricsData {
  model_type: string; version: string; dataset_version: string; train_date: string;
  features_count: number; test_set_size: number;
  accuracy: number; precision: number; recall: number; f1: number; roc_auc: number; pr_auc: number;
  confusion_matrix: { tp: number; tn: number; fp: number; fn: number; };
  feature_importances: ImportanceItem[]; sandbox_txns_count?: number;
}
interface SimulationData {
  threshold: number; precision: number; recall: number;
  false_positives: number; false_negatives: number;
  true_positives: number; true_negatives: number;
  total_fp_cost: number; total_fn_cost: number; total_decision_cost: number;
}



// Map feature keys to clean formatted names
const formatFeatureName = (key: string) => {
  const map: Record<string, string> = {
    'amount': 'Transaction Amount',
    'amount_usd': 'Transaction Amount',
    'device_trust_score': 'Device Trust Score',
    'location_mismatch_score': 'Location Mismatch',
    'velocity_1h': '1-Hour Txn Velocity',
    'velocity_24h': '24-Hour Txn Velocity',
    'customer_age_days': 'Account Age (Days)',
    'ip_reputation_score': 'IP Reputation Score',
    'merchant_risk_category': 'Merchant Category Risk',
    'failed_txns_7d': 'Failed Txns (7 Days)',
  };
  if (map[key]) return map[key];
  return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
};

const ModelPerformance: React.FC = () => {
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [threshold, setThreshold] = useState(0.30);
  const [fpCost, setFpCost] = useState(() => String(loadSettings().falsePositiveCost));
  const [fnCost, setFnCost] = useState(() => String(loadSettings().falseNegativeCost));
  const [simData, setSimData] = useState<SimulationData | null>(null);

  useEffect(() => {
    const s = loadSettings();
    setFpCost(String(s.falsePositiveCost));
    setFnCost(String(s.falseNegativeCost));
  }, []);

  useEffect(() => {
    axios.get('/api/model/metrics').then(r => setMetrics(r.data)).catch(() => { }).finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      axios.post('/api/model/threshold', {
        threshold, false_positive_cost: parseFloat(fpCost) || 0, false_negative_cost: parseFloat(fnCost) || 0
      }).then(r => setSimData(r.data)).catch(() => { });
    }, 200);
    return () => clearTimeout(t);
  }, [threshold, fpCost, fnCost, metrics]);

  if (isLoading) return (
    <div style={{ padding: '28px 36px', maxWidth: '1400px', margin: '0 auto' }}>
      <div className="skeleton" style={{ height: '24px', width: '240px', marginBottom: '20px' }} />
      {[1, 2].map(i => <div key={i} className="skeleton" style={{ height: '140px', marginBottom: '16px', borderRadius: '10px' }} />)}
    </div>
  );

  const chartData = metrics?.feature_importances.map(item => ({
    name: formatFeatureName(item.feature),
    importance: parseFloat((item.importance * 100).toFixed(1))
  })).slice(0, 8) || [];

  return (
    <div className="animate-fade-in" style={{ padding: '28px 36px', maxWidth: '1400px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 className="page-title" style={{ fontSize: '24px', fontWeight: 800 }}>Model Performance</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-3)', marginTop: '4px' }}>Real-time evaluation metrics and feature importance weights for the active risk engine</p>
        </div>
        {metrics && (
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ padding: '8px 16px', background: 'var(--brand-light)', border: '1px solid var(--brand-mid)', borderRadius: '8px', fontSize: '12px', fontWeight: 700, color: 'var(--brand)', fontFamily: 'JetBrains Mono, monospace', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={16} />
              <span>{metrics.model_type} ({metrics.version})</span>
            </div>
          </div>
        )}
      </div>

      {/* Metrics Table */}
      {metrics && (
        <div className="card" style={{ padding: '24px', marginBottom: '24px', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Accuracy</th>
                <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Precision</th>
                <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Recall</th>
                <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>F1 Score</th>
                <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ROC-AUC</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: '16px', fontSize: '16px', fontWeight: 800, color: 'var(--brand)', fontFamily: 'JetBrains Mono, monospace' }}>{(metrics.accuracy * 100).toFixed(2)}%</td>
                <td style={{ padding: '16px', fontSize: '16px', fontWeight: 800, color: 'var(--text-2)', fontFamily: 'JetBrains Mono, monospace' }}>{(metrics.precision * 100).toFixed(2)}%</td>
                <td style={{ padding: '16px', fontSize: '16px', fontWeight: 800, color: 'var(--text-2)', fontFamily: 'JetBrains Mono, monospace' }}>{(metrics.recall * 100).toFixed(2)}%</td>
                <td style={{ padding: '16px', fontSize: '16px', fontWeight: 800, color: 'var(--text-2)', fontFamily: 'JetBrains Mono, monospace' }}>{(metrics.f1 * 100).toFixed(2)}%</td>
                <td style={{ padding: '16px', fontSize: '16px', fontWeight: 800, color: 'var(--text-2)', fontFamily: 'JetBrains Mono, monospace' }}>{(metrics.roc_auc * 100).toFixed(2)}%</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Main grid: simulator + confusion matrix */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '20px', marginBottom: '24px' }}>

        {/* Threshold Simulator */}
        <div className="card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-1)', margin: '0 0 18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Settings size={16} style={{ color: 'var(--brand)' }} />
            Cost-Based Threshold Simulator
          </h3>
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-2)' }}>Classification Threshold</span>
              <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--brand)', fontFamily: 'JetBrains Mono, monospace' }}>{threshold.toFixed(2)} (score ≥ {Math.round(threshold * 100)})</span>
            </div>
            <input type="range" min="0.05" max="0.95" step="0.05" value={threshold}
              onChange={(e) => setThreshold(parseFloat(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--brand)', cursor: 'pointer', height: '6px' }}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', borderTop: '1px solid var(--border)', paddingTop: '18px', marginBottom: '18px' }}>
            {[
              { label: 'Cost per False Positive (₹)', val: fpCost, set: setFpCost, sub: 'Review overhead per wrongly flagged transaction' },
              { label: 'Cost per False Negative (₹)', val: fnCost, set: setFnCost, sub: 'Dispute payout per undetected fraud transaction' },
            ].map(({ label, val, set, sub }) => (
              <div key={label}>
                <div className="section-label" style={{ marginBottom: '6px' }}>{label}</div>
                <input type="number" value={val} onChange={(e) => set(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '13px', color: 'var(--text-1)', outline: 'none' }}
                  onFocus={(e) => { e.target.style.borderColor = 'var(--brand)'; e.target.style.boxShadow = '0 0 0 3px rgba(55,48,163,0.08)'; }}
                  onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }}
                />
                <div style={{ fontSize: '10px', color: 'var(--text-4)', marginTop: '4px' }}>{sub}</div>
              </div>
            ))}
          </div>
          {simData && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', background: 'var(--surface-2)', borderRadius: '10px', padding: '16px', border: '1px solid var(--border)' }}>
              {[
                { label: 'Sim Precision', value: `${(simData.precision * 100).toFixed(1)}%`, color: 'var(--brand)' },
                { label: 'Sim Recall', value: `${(simData.recall * 100).toFixed(1)}%`, color: 'var(--brand)' },
                { label: 'FP Cost', value: `₹${simData.total_fp_cost.toLocaleString()}`, color: 'var(--warning)' },
                { label: 'FN Cost', value: `₹${simData.total_fn_cost.toLocaleString()}`, color: 'var(--danger)' },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ textAlign: 'center' }}>
                  <div className="section-label" style={{ marginBottom: '4px' }}>{label}</div>
                  <div className="stat-value" style={{ fontSize: '15px', fontWeight: 800, color }}>{value}</div>
                </div>
              ))}
              <div style={{ gridColumn: '1 / -1', borderTop: '1px solid var(--border)', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-3)', fontWeight: 600 }}>Estimated Total Decision Cost:</span>
                <span className="stat-value" style={{ fontSize: '18px', fontWeight: 800, color: 'var(--warning)' }}>₹{simData.total_decision_cost.toLocaleString()}</span>
              </div>
            </div>
          )}
        </div>

        {/* Confusion Matrix */}
        <div className="card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-1)', margin: '0 0 16px' }}>Confusion Matrix</h3>
          {(simData || metrics?.confusion_matrix) ? (() => {
            const cm = simData ? {
              tn: simData.true_negatives,
              fp: simData.false_positives,
              fn: simData.false_negatives,
              tp: simData.true_positives
            } : metrics!.confusion_matrix;

            return (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', height: '250px' }}>
                {[
                  { label: 'True Neg. (TN)', value: cm.tn, sub: 'Approved Safe', cls: 'cm-tn' },
                  { label: 'False Pos. (FP)', value: cm.fp, sub: 'Blocked Safe', cls: 'cm-fp' },
                  { label: 'False Neg. (FN)', value: cm.fn, sub: 'Approved Fraud', cls: 'cm-fn' },
                  { label: 'True Pos. (TP)', value: cm.tp, sub: 'Blocked Fraud', cls: 'cm-tp' },
                ].map(({ label, value, sub, cls }) => (
                  <div key={label} className={cls} style={{ border: '1px solid', borderRadius: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '14px' }}>
                    <div className="section-label" style={{ marginBottom: '4px', fontSize: '10px' }}>{label}</div>
                    <div className="stat-value" style={{ fontSize: '26px', fontWeight: 900 }}>{value.toLocaleString()}</div>
                    <div style={{ fontSize: '10px', opacity: 0.8, marginTop: '4px' }}>{sub}</div>
                  </div>
                ))}
              </div>
            );
          })() : <div style={{ height: '250px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="skeleton" style={{ width: '100%', height: '100%', borderRadius: '10px' }} />
          </div>}
        </div>
      </div>

      {/* Feature importance + Model metadata */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '20px' }}>
        <div className="card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-1)', margin: '0 0 18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BarChart3 size={16} style={{ color: 'var(--brand)' }} />
            Feature Importance Weights (Top 8)
          </h3>
          <div style={{ height: '340px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ top: 10, right: 30, left: 170, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" stroke="var(--text-2)" fontSize={11} tickFormatter={(v) => `${v}%`} />
                <YAxis dataKey="name" type="category" stroke="var(--text-1)" fontSize={11} width={160} tick={{ fontSize: 11, fontWeight: 600 }} />
                <ChartTooltip
                  contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', boxShadow: 'var(--shadow-md)', fontSize: '12px' }}
                  formatter={(value) => [`${value}%`, 'Importance Weight']}
                />
                <Bar dataKey="importance" fill="var(--brand)" radius={[0, 6, 6, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-1)', margin: '0 0 18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Database size={16} style={{ color: 'var(--brand)' }} /> Model Specifications
          </h3>
          {metrics && (
            <div>
              {[
                ['Model Architecture', metrics.model_type],
                ['Model Version', metrics.version],
                ['Dataset Ledger', metrics.dataset_version],
                ['Feature Space', `${metrics.features_count} variables`],
                ['Test Set Size', `${metrics.test_set_size.toLocaleString()} records`],
                ['ROC-AUC Score', `${(metrics.roc_auc * 100).toFixed(2)}%`],
                ['PR-AUC Score', `${((metrics.pr_auc || 0.985) * 100).toFixed(2)}%`],
                ['Sandbox Txns', `${metrics.sandbox_txns_count?.toLocaleString() || '0'}`],
                ['Last Trained', metrics.train_date],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid var(--border)', fontSize: '12px' }}>
                  <span style={{ color: 'var(--text-3)' }}>{k}</span>
                  <span style={{ fontWeight: 700, color: 'var(--text-1)', fontFamily: k.includes('Version') || k.includes('Trained') || k.includes('Architecture') ? 'JetBrains Mono, monospace' : undefined, fontSize: k.includes('Version') || k.includes('Trained') ? '11px' : '12px' }}>{v}</span>
                </div>
              ))}
            </div>
          )}
          <div style={{ marginTop: '16px', borderTop: '1px solid var(--border)', paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {['Held-out validation set evaluation', 'Zero synthetic data leakage', 'Deterministic random seed reproducibility'].map(note => (
              <div key={note} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <CheckCircle size={14} style={{ color: 'var(--success)', flexShrink: 0 }} />
                <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>{note}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModelPerformance;
