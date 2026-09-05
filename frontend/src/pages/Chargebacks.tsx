import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, ShieldAlert, ArrowRight, AlertTriangle } from 'lucide-react';

interface ChargebackListItem {
  id: string; transaction_id: string; amount: number; reason: string;
  deadline: string; status: string; evidence_strength: number;
  suggested_action: string; risk_score: number;
}

const Chargebacks: React.FC = () => {
  const navigate = useNavigate();
  const [chargebacks, setChargebacks] = useState<ChargebackListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => {
    axios.get('/api/chargebacks')
      .then(r => setChargebacks(r.data))
      .catch(() => setError('Failed to fetch risk alerts.'))
      .finally(() => setIsLoading(false));
  }, []);

  const statuses = Array.from(new Set(chargebacks.map(c => c.status))).sort();
  const filtered = filterStatus ? chargebacks.filter(c => c.status === filterStatus) : chargebacks;

  const actionStyle = (action: string): [string, string, string] => {
    if (action === 'SUBMIT_EVIDENCE') return ['var(--brand-light)', 'var(--brand-mid)', 'var(--brand)'];
    if (action === 'ACCEPT_CHARGEBACK') return ['var(--danger-bg)', 'var(--danger-b)', 'var(--danger)'];
    return ['var(--warning-bg)', 'var(--warning-b)', 'var(--warning)'];
  };

  const statusStyle = (s: string): [string, string, string] => {
    if (s === 'WON' || s === 'RESOLVED') return ['var(--success-bg)', 'var(--success-b)', 'var(--success)'];
    if (s === 'LOST' || s === 'CLOSED') return ['var(--danger-bg)', 'var(--danger-b)', 'var(--danger)'];
    if (s === 'PENDING' || s === 'UNDER_REVIEW') return ['var(--warning-bg)', 'var(--warning-b)', 'var(--warning)'];
    return ['var(--surface-3)', 'var(--border)', 'var(--text-3)'];
  };

  return (
    <div className="animate-fade-in" style={{ padding: '28px 36px', maxWidth: '1400px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 className="page-title">Risk Alerts</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-3)', marginTop: '4px' }}>High-risk transactions and chargeback disputes requiring attention</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <select
            value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
            style={{ padding: '7px 10px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '12px', color: 'var(--text-1)', outline: 'none' }}
          >
            <option value="">All Statuses</option>
            {statuses.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Stats strip */}
      {!isLoading && !error && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
          {[
            { label: 'Total Cases', value: chargebacks.length, color: 'var(--brand)', bg: 'var(--brand-light)' },
            { label: 'Avg Evidence Strength', value: chargebacks.length > 0 ? `${(chargebacks.reduce((a, c) => a + c.evidence_strength, 0) / chargebacks.length * 100).toFixed(0)}%` : '—', color: 'var(--success)', bg: 'var(--success-bg)' },
            { label: 'Total Exposure', value: `₹${chargebacks.reduce((a, c) => a + c.amount, 0).toLocaleString(undefined, { minimumFractionDigits: 0 })}`, color: 'var(--danger)', bg: 'var(--danger-bg)' },
          ].map(({ label, value, color }) => (
            <div key={label} className="card" style={{ padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div className="section-label" style={{ marginBottom: '4px' }}>{label}</div>
                <div className="stat-value" style={{ fontSize: '20px', fontWeight: 800, color }}>{value}</div>
              </div>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: color }} />
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        {isLoading ? (
          <div>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', gap: '16px', alignItems: 'center' }}>
                {['140px','80px','80px','120px','100px','80px','60px'].map((w, j) => <div key={j} className="skeleton" style={{ height: '12px', width: w }} />)}
              </div>
            ))}
          </div>
        ) : error ? (
          <div style={{ padding: '60px', textAlign: 'center' }}>
            <ShieldAlert size={32} style={{ color: 'var(--danger)', margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-1)', marginBottom: '6px' }}>Unable to load risk alerts</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-3)', marginBottom: '16px' }}>{error}</p>
            <button onClick={() => window.location.reload()} className="btn-primary">Retry</button>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center' }}>
            <ShieldCheck size={32} style={{ color: 'var(--success)', margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-1)', marginBottom: '6px' }}>No Active Risk Alerts</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-3)' }}>New high-risk transactions and disputes will appear here.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: 'var(--surface-2)' }}>
                  {['Case', 'Transaction', 'Amount', 'Reason', 'Suggested Action', 'Evidence', 'Status', 'Deadline', ''].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: h === 'Amount' || h === 'Evidence' ? 'center' : 'left', fontWeight: 600, fontSize: '10px', color: 'var(--text-3)', letterSpacing: '0.06em', textTransform: 'uppercase', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((cb) => {
                  const actionS = actionStyle(cb.suggested_action);
                  const statusS = statusStyle(cb.status);
                  const deadlinePast = new Date(cb.deadline) < new Date();
                  const strengthPct = cb.evidence_strength > 1 ? cb.evidence_strength : cb.evidence_strength * 100;
                  return (
                    <tr key={cb.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.1s', cursor: 'pointer' }}
                      onClick={() => navigate(`/transactions/${cb.transaction_id}`)}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-2)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '12px 16px', fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', fontWeight: 700, color: 'var(--text-2)' }}>{cb.id}</td>
                      <td style={{ padding: '12px 16px', fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', fontWeight: 700, color: 'var(--brand)' }}>{cb.transaction_id}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700, color: 'var(--text-1)', fontVariantNumeric: 'tabular-nums' }}>₹{cb.amount.toLocaleString()}</td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-2)', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cb.reason}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ background: actionS[0], border: `1px solid ${actionS[1]}`, color: actionS[2], borderRadius: '4px', fontSize: '9px', fontWeight: 700, padding: '2px 7px', whiteSpace: 'nowrap' }}>{cb.suggested_action.replace(/_/g, ' ')}</span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                          <div style={{ width: '48px', height: '4px', background: 'var(--border)', borderRadius: '999px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', background: strengthPct > 70 ? 'var(--success)' : strengthPct > 40 ? 'var(--warning)' : 'var(--danger)', width: `${Math.min(100, Math.max(0, strengthPct))}%`, borderRadius: '999px' }} />
                          </div>
                          <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-2)' }}>{strengthPct.toFixed(0)}%</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ background: statusS[0], border: `1px solid ${statusS[1]}`, color: statusS[2], borderRadius: '4px', fontSize: '9px', fontWeight: 700, padding: '2px 7px' }}>{cb.status}</span>
                      </td>
                      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                        <span style={{ fontSize: '11px', color: deadlinePast ? 'var(--danger)' : 'var(--text-3)', fontWeight: deadlinePast ? 700 : 400, display: 'flex', alignItems: 'center', gap: '4px' }}>
                          {deadlinePast && <AlertTriangle size={10} />}
                          {new Date(cb.deadline).toLocaleDateString()}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <ArrowRight size={12} style={{ color: 'var(--text-4)' }} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chargebacks;
