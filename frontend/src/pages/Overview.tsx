import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  TrendingUp, ShieldCheck, ShieldAlert,
  ArrowRight, AlertTriangle, Clock, Eye
} from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as ChartTooltip,
  AreaChart, Area, XAxis, YAxis, CartesianGrid
} from 'recharts';

interface KPI {
  transactions_analyzed: number;
  high_risk_transactions: number;
  chargebacks_detected: number;
  estimated_loss_prevented: number;
  average_risk_score: number;
  model_precision: number;
  model_recall: number;
  model_accuracy: number;
}
interface RiskDistributionItem { name: string; value: number; }
interface TrendItem { date: string; disputes: number; }
interface RecentEvent {
  id: string; customer_name: string; amount: number;
  risk_score: number; risk_level: string; status: string; timestamp: string;
}
interface OverviewData {
  kpis: KPI;
  risk_distribution: RiskDistributionItem[];
  chargeback_trends: TrendItem[];
  recent_events: RecentEvent[];
}

const RISK_COLORS = { 'LOW RISK': '#10b981', 'MEDIUM RISK': '#f59e0b', 'HIGH RISK': '#ef4444' };

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const cfg: Record<string, [string, string, string]> = {
    APPROVED:     ['var(--success-bg)',  'var(--success-b)',  'var(--success)'],
    DECLINED:     ['var(--danger-bg)',   'var(--danger-b)',   'var(--danger)'],
    UNDER_REVIEW: ['var(--warning-bg)', 'var(--warning-b)',  'var(--warning)'],
    PENDING:      ['var(--info-bg)',     'var(--info-b)',     'var(--info)'],
  };
  const [bg, border, color] = cfg[status] || ['var(--surface-3)', 'var(--border)', 'var(--text-2)'];
  const label = status === 'UNDER_REVIEW' ? 'REVIEW / VERIFY' : status;
  return (
    <span style={{ background: bg, border: `1px solid ${border}`, color, borderRadius: '4px', fontSize: '9px', fontWeight: 700, padding: '2px 7px', letterSpacing: '0.04em', display: 'inline-block' }}>
      {label}
    </span>
  );
};

const Overview: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState<OverviewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  useEffect(() => {
    axios.get('/api/dashboard/stats')
      .then(r => setData(r.data))
      .catch(() => setError('Unable to load dashboard data.'))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) return (
    <div style={{ padding: '32px', maxWidth: '1280px', margin: '0 auto' }}>
      {[1,2,3].map(i => (
        <div key={i} className="skeleton" style={{ height: '80px', marginBottom: '16px' }} />
      ))}
    </div>
  );

  if (error || !data) return (
    <div style={{ padding: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
      <div style={{ textAlign: 'center' }}>
        <ShieldAlert size={40} style={{ color: 'var(--danger)', margin: '0 auto 12px' }} />
        <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-1)', marginBottom: '6px' }}>Unable to load dashboard</h3>
        <p style={{ fontSize: '12px', color: 'var(--text-3)', marginBottom: '16px' }}>{error}</p>
        <button onClick={() => window.location.reload()} className="btn-primary">Retry</button>
      </div>
    </div>
  );

  const { kpis, risk_distribution: riskDist, chargeback_trends: trends, recent_events: events } = data;
  const high = riskDist.find(d => d.name === 'HIGH RISK')?.value || 0;
  const medium = riskDist.find(d => d.name === 'MEDIUM RISK')?.value || 0;
  const total = kpis.transactions_analyzed;
  const riskRate = total > 0 ? (((high + medium) / total) * 100).toFixed(1) : '0.0';
  const reviewQueue = events.filter(e => e.status === 'UNDER_REVIEW' || e.status === 'PENDING');
  const highRiskEvents = events.filter(e => e.risk_level === 'HIGH RISK');

  return (
    <div className="animate-fade-in" style={{ padding: '28px 36px', maxWidth: '1400px', margin: '0 auto' }}>

      {/* ── High-risk alert banner ── */}
      {high > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'space-between',
          padding: '12px 16px', background: 'var(--danger-bg)', border: '1px solid var(--danger-b)',
          borderRadius: '8px', marginBottom: '24px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertTriangle size={15} style={{ color: 'var(--danger)', flexShrink: 0 }} />
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--danger)' }}>
              <strong>{high}</strong> high-risk transaction{high !== 1 ? 's' : ''} require immediate review.
            </span>
          </div>
          <button
            onClick={() => navigate('/transactions?risk_level=HIGH+RISK')}
            style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 700, color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            View all <ArrowRight size={12} />
          </button>
        </div>
      )}

      {/* ── Page header ── */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 className="page-title">{greeting()}, {user?.username ? user.username.charAt(0).toUpperCase() + user.username.slice(1) : 'Risk Officer'}</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-3)', marginTop: '4px' }}>
            Risk operations overview · {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        {/* Model accuracy strip */}
        <div className="accuracy-strip" style={{ display: 'flex', alignItems: 'center', gap: '0', padding: '10px 16px', borderRadius: '8px' }}>
          {[
            { label: 'Accuracy', val: (kpis.model_accuracy * 100).toFixed(2) + '%' },
            { label: 'Precision', val: (kpis.model_precision * 100).toFixed(1) + '%' },
            { label: 'Recall', val: (kpis.model_recall * 100).toFixed(1) + '%' },
          ].map((m, i) => (
            <React.Fragment key={m.label}>
              {i > 0 && <div style={{ width: '1px', height: '28px', background: 'var(--brand-mid)', margin: '0 14px' }} />}
              <div style={{ textAlign: 'center' }}>
                <div className="section-label" style={{ fontSize: '9px' }}>{m.label}</div>
                <div className="stat-value" style={{ fontSize: '16px', fontWeight: 800, color: 'var(--brand)', lineHeight: 1.2, marginTop: '2px' }}>{m.val}</div>
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* ── KPI Row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '24px' }}>
        {[
          { label: 'Total Transactions', value: total.toLocaleString(), sub: 'Dataset records', icon: TrendingUp, color: 'var(--brand)', bg: 'var(--brand-light)' },
          { label: 'High Risk Flagged', value: high.toString(), sub: `${riskRate}% of total`, icon: ShieldAlert, color: 'var(--danger)', bg: 'var(--danger-bg)' },
          { label: 'Review Queue', value: reviewQueue.length.toString(), sub: 'Pending human decision', icon: Clock, color: 'var(--warning)', bg: 'var(--warning-bg)' },
          { label: 'Loss Prevented', value: `₹${kpis.estimated_loss_prevented.toLocaleString()}`, sub: 'Blocked value', icon: ShieldCheck, color: 'var(--success)', bg: 'var(--success-bg)' },
        ].map(({ label, value, sub, icon: Icon, color, bg }) => (
          <div key={label} className="card" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="section-label" style={{ marginBottom: '6px' }}>{label}</div>
              <div className="stat-value" style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-1)', letterSpacing: '-0.03em', lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: '10px', color: 'var(--text-4)', marginTop: '5px' }}>{sub}</div>
            </div>
            <div style={{ padding: '8px', background: bg, borderRadius: '8px', color, flexShrink: 0 }}>
              <Icon size={15} />
            </div>
          </div>
        ))}
      </div>

      {/* ── Review Queue ── */}
      {highRiskEvents.length > 0 && (
        <div className="card" style={{ marginBottom: '24px', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--danger)', display: 'inline-block' }} />
                <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-1)', margin: 0 }}>Action Required</h3>
              </div>
              <p style={{ fontSize: '11px', color: 'var(--text-3)', margin: '3px 0 0' }}>High-risk transactions flagged by the ML model awaiting investigator decision</p>
            </div>
            <button
              onClick={() => navigate('/transactions')}
              style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 600, color: 'var(--brand)', background: 'none', border: '1px solid var(--brand-mid)', borderRadius: '6px', padding: '6px 12px', cursor: 'pointer' }}
            >
              All transactions <ArrowRight size={12} />
            </button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: 'var(--surface-2)' }}>
                  {['Transaction', 'Customer', 'Amount', 'Risk Score', 'Risk Level', 'Status', 'Time', ''].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: h === 'Amount' ? 'right' : h === 'Risk Score' ? 'center' : 'left', fontWeight: 600, fontSize: '10px', color: 'var(--text-3)', letterSpacing: '0.06em', textTransform: 'uppercase', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {highRiskEvents.map((evt) => (
                  <tr
                    key={evt.id}
                    style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.1s', cursor: 'pointer' }}
                    onClick={() => navigate(`/transactions/${evt.id}`)}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-2)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '12px 16px', fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', fontWeight: 700, color: 'var(--brand)' }}>{evt.id}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 500, color: 'var(--text-1)' }}>{evt.customer_name}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: 'var(--text-1)', fontVariantNumeric: 'tabular-nums' }}>₹{evt.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <span style={{ fontWeight: 800, fontSize: '13px', color: 'var(--danger)', fontVariantNumeric: 'tabular-nums' }}>{evt.risk_score}</span>
                      <span style={{ fontSize: '9px', color: 'var(--text-4)', marginLeft: '2px' }}>/100</span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-b)', color: 'var(--danger)', borderRadius: '4px', fontSize: '9px', fontWeight: 700, padding: '2px 7px' }}>{evt.risk_level}</span>
                    </td>
                    <td style={{ padding: '12px 16px' }}><StatusBadge status={evt.status} /></td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-4)', fontSize: '11px' }}>
                      {new Date(evt.timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 600, color: 'var(--brand)' }}>
                        <Eye size={11} /> Review
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Charts ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '16px', marginBottom: '24px' }}>

        {/* Trend */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-1)', margin: 0 }}>Dispute Trend</h3>
              <p style={{ fontSize: '11px', color: 'var(--text-3)', margin: '3px 0 0' }}>30-day chargeback activity</p>
            </div>
            <span className="section-label">30 days</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={trends} margin={{ top: 5, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gDisputes" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--brand)" stopOpacity={0.1} />
                  <stop offset="100%" stopColor="var(--brand)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
              <XAxis dataKey="date" stroke="var(--text-2)" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--text-2)" fontSize={10} tickLine={false} axisLine={false} />
              <ChartTooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 12px', boxShadow: 'var(--shadow-md)' }}>
                      <p style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 2px' }}>{payload[0].payload.date}</p>
                      <p style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-1)', margin: 0 }}>{payload[0].value} disputes</p>
                    </div>
                  );
                }}
              />
              <Area type="monotone" dataKey="disputes" stroke="var(--brand)" strokeWidth={2} fill="url(#gDisputes)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Risk distribution */}
        <div className="card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-1)', margin: '0 0 16px' }}>Risk Distribution</h3>
          <div style={{ position: 'relative', height: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 1 }}>
              <span className="section-label">Alerts</span>
              <span className="stat-value" style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-1)' }}>{high + medium}</span>
            </div>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={riskDist} cx="50%" cy="50%" innerRadius={52} outerRadius={70} paddingAngle={2} dataKey="value" strokeWidth={0}>
                  {riskDist.map((entry, i) => (
                    <Cell key={i} fill={RISK_COLORS[entry.name as keyof typeof RISK_COLORS] || '#94a3b8'} />
                  ))}
                </Pie>
                <ChartTooltip content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 12px', boxShadow: 'var(--shadow-md)' }}>
                      <p style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', margin: '0 0 2px' }}>{payload[0].payload.name}</p>
                      <p style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-1)', margin: 0 }}>{payload[0].value} cases</p>
                    </div>
                  );
                }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '12px', borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
            {riskDist.map(d => (
              <div key={d.name} style={{ textAlign: 'center' }}>
                <div className="section-label" style={{ fontSize: '8px', marginBottom: '2px' }}>{d.name.replace(' RISK', '')}</div>
                <div className="stat-value" style={{ fontSize: '14px', fontWeight: 800, color: RISK_COLORS[d.name as keyof typeof RISK_COLORS] }}>{d.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Recent activity (all events) ── */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-1)', margin: 0 }}>Recent Activity</h3>
            <p style={{ fontSize: '11px', color: 'var(--text-3)', margin: '3px 0 0' }}>Latest transactions processed by the risk engine</p>
          </div>
          <button onClick={() => navigate('/transactions')} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 600, color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer' }}>
            View all <ArrowRight size={12} />
          </button>
        </div>
        {events.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <ShieldCheck size={32} style={{ color: 'var(--success)', margin: '0 auto 10px' }} />
            <p style={{ fontSize: '12px', color: 'var(--text-3)' }}>No recent activity found.</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ background: 'var(--surface-2)' }}>
                {['Transaction', 'Customer', 'Amount', 'Risk Score', 'Risk Level', 'Status', 'Time', ''].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: h === 'Amount' ? 'right' : h === 'Risk Score' ? 'center' : 'left', fontWeight: 600, fontSize: '10px', color: 'var(--text-3)', letterSpacing: '0.06em', textTransform: 'uppercase', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {events.map((evt) => (
                <tr
                  key={evt.id}
                  style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background 0.1s' }}
                  onClick={() => navigate(`/transactions/${evt.id}`)}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-2)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '11px 16px', fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', fontWeight: 700, color: 'var(--text-2)' }}>{evt.id}</td>
                  <td style={{ padding: '11px 16px', color: 'var(--text-1)', fontWeight: 500 }}>{evt.customer_name}</td>
                  <td style={{ padding: '11px 16px', textAlign: 'right', fontWeight: 600, color: 'var(--text-1)', fontVariantNumeric: 'tabular-nums' }}>₹{evt.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td style={{ padding: '11px 16px', textAlign: 'center', fontWeight: 800, color: evt.risk_level === 'HIGH RISK' ? 'var(--danger)' : evt.risk_level === 'MEDIUM RISK' ? 'var(--warning)' : 'var(--success)' }}>{evt.risk_score}</td>
                  <td style={{ padding: '11px 16px' }}>
                    <span style={{
                      background: evt.risk_level === 'HIGH RISK' ? 'var(--danger-bg)' : evt.risk_level === 'MEDIUM RISK' ? 'var(--warning-bg)' : 'var(--success-bg)',
                      border: `1px solid ${evt.risk_level === 'HIGH RISK' ? 'var(--danger-b)' : evt.risk_level === 'MEDIUM RISK' ? 'var(--warning-b)' : 'var(--success-b)'}`,
                      color: evt.risk_level === 'HIGH RISK' ? 'var(--danger)' : evt.risk_level === 'MEDIUM RISK' ? 'var(--warning)' : 'var(--success)',
                      borderRadius: '4px', fontSize: '9px', fontWeight: 700, padding: '2px 7px'
                    }}>{evt.risk_level}</span>
                  </td>
                  <td style={{ padding: '11px 16px' }}><StatusBadge status={evt.status} /></td>
                  <td style={{ padding: '11px 16px', color: 'var(--text-4)', fontSize: '11px' }}>
                    {new Date(evt.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}{' '}
                    {new Date(evt.timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td style={{ padding: '11px 16px', textAlign: 'right' }}>
                    <ArrowRight size={13} style={{ color: 'var(--text-4)' }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

    </div>
  );
};

export default Overview;
