import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  ArrowLeft, ShieldAlert, ShieldCheck, CheckCircle2, XCircle,
  AlertTriangle, RefreshCw, User, CreditCard, Monitor, Activity,
  Clock, FileText, ChevronDown
} from 'lucide-react';
import { loadSettings } from './Settings';
import { useAuth } from '../context/AuthContext';

interface RiskFactor { feature: string; contribution: number; description: string; }
interface AuditLog { id: number; timestamp: string; actor: string; action: string; reason: string | null; }
interface DecisionDetail {
  id: number; timestamp: string; actor: string; action: string; notes: string;
  ai_recommendation: string; human_decision: string; override: boolean; override_reason: string | null;
}
interface CustomerDetail {
  id: string; name: string; email: string; account_age_days: number;
  previous_transaction_count: number; previous_chargeback_count: number;
  failed_payment_count: number; average_transaction_amount: number;
  successful_payments: number; average_order_value: number;
}
interface TransactionDetailData {
  id: string; customer_id: string; amount: number; currency: string;
  payment_method: string; device_id: string; device_account_count: number;
  IP_account_count: number; billing_shipping_match: boolean; IP_shipping_match: boolean;
  customer_country: string; shipping_country: string; device_age_days: number;
  transaction_frequency: number; average_transaction_amount: number; amount_deviation: number;
  is_new_device: boolean; is_new_location: boolean; velocity_1h: number; velocity_24h: number;
  previous_fraud_flag: boolean; timestamp: string; risk_score: number; risk_level: string;
  status: string; customer: CustomerDetail; fraud_probability: number; model_version: string;
  risk_factors: RiskFactor[]; audit_logs: AuditLog[]; decisions: DecisionDetail[];
}

/* ── Horizontal Risk Scale ── */
const RiskScale: React.FC<{ score: number; medium: number; high: number }> = ({ score, medium, high }) => {
  const pct = (score / 100) * 100;
  const dotColor = score >= high ? 'var(--danger)' : score >= medium ? 'var(--warning)' : 'var(--success)';
  return (
    <div style={{ padding: '4px 0 28px' }}>
      <div className="risk-scale-track">
        {/* Threshold markers */}
        <div className="risk-threshold-marker" style={{ left: `${medium}%` }}>
          <span className="risk-threshold-label">{medium}</span>
        </div>
        <div className="risk-threshold-marker" style={{ left: `${high}%` }}>
          <span className="risk-threshold-label">{high}</span>
        </div>
        {/* Score dot */}
        <div className="risk-scale-dot" style={{ left: `${pct}%`, background: dotColor }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '9px', fontWeight: 600, color: 'var(--text-4)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        <span style={{ color: 'var(--success)' }}>LOW</span>
        <span style={{ color: 'var(--warning)' }}>MEDIUM</span>
        <span style={{ color: 'var(--danger)' }}>HIGH</span>
      </div>
    </div>
  );
};

/* ── Data Row ── */
const DataRow: React.FC<{ label: string; value: React.ReactNode; highlight?: boolean }> = ({ label, value, highlight }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
    <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>{label}</span>
    <span style={{ fontSize: '12px', fontWeight: 600, color: highlight ? 'var(--danger)' : 'var(--text-1)', textAlign: 'right', maxWidth: '55%' }}>{value}</span>
  </div>
);

/* ── Status Badge ── */
const StatusBadge: React.FC<{ status: string; large?: boolean }> = ({ status, large }) => {
  const cfg: Record<string, [string, string, string]> = {
    APPROVED:     ['var(--success-bg)',  'var(--success-b)',  'var(--success)'],
    DECLINED:     ['var(--danger-bg)',   'var(--danger-b)',   'var(--danger)'],
    UNDER_REVIEW: ['var(--warning-bg)', 'var(--warning-b)',  'var(--warning)'],
    PENDING:      ['var(--info-bg)',     'var(--info-b)',     'var(--info)'],
  };
  const [bg, border, color] = cfg[status] || ['var(--surface-3)', 'var(--border)', 'var(--text-2)'];
  const label = status === 'UNDER_REVIEW' ? 'REVIEW / VERIFY' : status;
  return (
    <span style={{ background: bg, border: `1px solid ${border}`, color, borderRadius: '4px', fontSize: large ? '11px' : '9px', fontWeight: 700, padding: large ? '4px 10px' : '2px 7px', letterSpacing: '0.04em' }}>
      {label}
    </span>
  );
};

const TransactionDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState<TransactionDetailData | null>(null);
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAction, setSelectedAction] = useState<'MARK_SAFE' | 'ESCALATE' | 'DECLINE' | 'VERIFY' | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [overrideReasonText, setOverrideReasonText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showNotes, setShowNotes] = useState(false);

  const fetchDetail = async () => {
    try {
      const res = await axios.get(`/api/transactions/${id}`);
      setData(res.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load transaction data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchDetail(); }, [id]);

  const handleAction = async (_action: string, decisionPayload?: any) => {
    setIsSubmitting(true);
    try {
      if (decisionPayload) await axios.post(`/api/transactions/${id}/decision`, decisionPayload);
      await fetchDetail();
      setShowConfirmation(false);
      setSelectedAction(null);
      setOverrideReasonText('');
      setNotes('');
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to commit decision action.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const settings = loadSettings();

  if (isLoading) return (
    <div style={{ padding: '28px 36px', maxWidth: '1400px', margin: '0 auto' }}>
      <div className="skeleton" style={{ height: '20px', width: '160px', marginBottom: '24px' }} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px' }}>
        <div className="skeleton" style={{ height: '600px', borderRadius: '10px' }} />
        <div className="skeleton" style={{ height: '600px', borderRadius: '10px' }} />
      </div>
    </div>
  );

  if (error || !data) return (
    <div style={{ padding: '28px 32px', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
      <div style={{ textAlign: 'center' }}>
        <ShieldAlert size={40} style={{ color: 'var(--danger)', margin: '0 auto 12px' }} />
        <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-1)', marginBottom: '6px' }}>Transaction not found</h3>
        <p style={{ fontSize: '12px', color: 'var(--text-3)', marginBottom: '16px' }}>{error}</p>
        <button onClick={() => navigate('/transactions')} className="btn-primary">Back to transactions</button>
      </div>
    </div>
  );

  const score = data.risk_score;
  const aiRec = score >= settings.highRiskThreshold ? 'DECLINE' : score >= settings.mediumRiskThreshold ? 'VERIFY' : 'APPROVE';
  const confidence = Math.max(data.fraud_probability, 1 - data.fraud_probability) * 100;
  const riskColor = score >= settings.highRiskThreshold ? 'var(--danger)' : score >= settings.mediumRiskThreshold ? 'var(--warning)' : 'var(--success)';

  const getLockState = () => {
    if (data.decisions?.length > 0) {
      const last = data.decisions[data.decisions.length - 1];
      return { locked: true, status: last.human_decision, actor: last.actor, isOverride: last.override, overrideReason: last.override_reason };
    }
    if (data.status === 'APPROVED') return { locked: true, status: 'APPROVED', actor: 'Auto-Classifier', isOverride: false, overrideReason: null };
    if (data.status === 'DECLINED') return { locked: true, status: 'DECLINED', actor: 'Auto-Classifier', isOverride: false, overrideReason: null };
    return { locked: false, status: '', actor: '', isOverride: false, overrideReason: null };
  };

  const lockState = getLockState();

  const isOverride = (action: string) =>
    (action === 'MARK_SAFE' && aiRec !== 'APPROVE') ||
    (action === 'DECLINE' && aiRec !== 'DECLINE') ||
    (action === 'VERIFY' && aiRec !== 'VERIFY');

  const actionLabel = (action: string) => {
    const over = isOverride(action);
    const labels: Record<string, string> = { MARK_SAFE: 'APPROVE', DECLINE: 'DECLINE', VERIFY: 'VERIFY' };
    return over ? `${labels[action]} ↑ OVERRIDE` : labels[action];
  };

  const humanDecision = (action: string) =>
    action === 'MARK_SAFE' ? 'APPROVED' : action === 'DECLINE' ? 'DECLINED' : 'UNDER_REVIEW';

  return (
    <div className="animate-fade-in" style={{ padding: '28px 36px', maxWidth: '1400px', margin: '0 auto' }}>

      {/* Breadcrumb */}
      <button
        onClick={() => navigate('/transactions')}
        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer', marginBottom: '20px', padding: 0 }}
        onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-1)')}
        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-3)')}
      >
        <ArrowLeft size={14} /> Transactions
      </button>

      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <h1 style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '20px', fontWeight: 800, color: 'var(--text-1)', margin: 0, letterSpacing: '-0.01em' }}>{data.id}</h1>
            <span style={{ fontSize: '10px', fontWeight: 700, padding: '3px 8px', borderRadius: '4px', background: 'var(--brand-light)', color: 'var(--brand)', border: '1px solid var(--brand-mid)', letterSpacing: '0.04em' }}>Risk Investigation</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px', flexWrap: 'wrap' }}>
            <StatusBadge status={data.status} large />
            <span style={{ fontSize: '11px', color: 'var(--text-4)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Clock size={11} /> {new Date(data.timestamp).toLocaleString()}
            </span>
            <span style={{ fontSize: '10px', color: 'var(--text-4)', fontFamily: 'JetBrains Mono, monospace' }}>Model: {data.model_version}</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ background: data.risk_level === 'HIGH RISK' ? 'var(--danger-bg)' : data.risk_level === 'MEDIUM RISK' ? 'var(--warning-bg)' : 'var(--success-bg)', border: `1px solid ${data.risk_level === 'HIGH RISK' ? 'var(--danger-b)' : data.risk_level === 'MEDIUM RISK' ? 'var(--warning-b)' : 'var(--success-b)'}`, color: riskColor, borderRadius: '6px', fontSize: '13px', fontWeight: 800, padding: '6px 14px', letterSpacing: '0.02em' }}>
            {data.risk_level}
          </span>
        </div>
      </div>

      {/* Two-column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px', alignItems: 'start' }}>

        {/* ──────── LEFT COLUMN ──────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Risk Score + Scale */}
          <div className="card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <div className="section-label" style={{ marginBottom: '4px' }}>Fraud Risk Score</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                  <span className="stat-value" style={{ fontSize: '40px', fontWeight: 900, color: riskColor, letterSpacing: '-0.04em', lineHeight: 1 }}>{score}</span>
                  <span style={{ fontSize: '14px', color: 'var(--text-4)', fontWeight: 500 }}>/100</span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '4px' }}>
                  Probability: <strong style={{ color: riskColor }}>{(data.fraud_probability * 100).toFixed(1)}%</strong> · Confidence: <strong style={{ color: 'var(--text-1)' }}>{confidence.toFixed(1)}%</strong>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="section-label" style={{ marginBottom: '4px' }}>AI Recommendation</div>
                <span style={{
                  fontSize: '14px', fontWeight: 800, padding: '6px 14px', borderRadius: '6px',
                  background: aiRec === 'DECLINE' ? 'var(--danger-bg)' : aiRec === 'VERIFY' ? 'var(--warning-bg)' : 'var(--success-bg)',
                  color: aiRec === 'DECLINE' ? 'var(--danger)' : aiRec === 'VERIFY' ? 'var(--warning)' : 'var(--success)',
                  border: `1px solid ${aiRec === 'DECLINE' ? 'var(--danger-b)' : aiRec === 'VERIFY' ? 'var(--warning-b)' : 'var(--success-b)'}`,
                }}>
                  {aiRec}
                </span>
              </div>
            </div>
            <RiskScale score={score} medium={settings.mediumRiskThreshold} high={settings.highRiskThreshold} />
          </div>

          {/* Why flagged — Risk Factors */}
          <div className="card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-1)', margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: '7px' }}>
              <Activity size={14} style={{ color: 'var(--brand)' }} />
              Why This Transaction Was Flagged
            </h3>
            {data.risk_factors.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', background: 'var(--surface-2)', borderRadius: '8px' }}>
                <ShieldCheck size={24} style={{ color: 'var(--success)', margin: '0 auto 8px' }} />
                <p style={{ fontSize: '12px', color: 'var(--text-3)' }}>No anomalous signals detected. All features within baseline.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {data.risk_factors.map((f, i) => (
                  <div key={i} style={{ padding: '12px 14px', background: 'var(--surface-2)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-1)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {f.feature.replace(/_/g, ' ')}
                      </span>
                      <span style={{
                        fontSize: '9px', fontWeight: 700, padding: '2px 7px', borderRadius: '4px',
                        background: f.contribution >= 15 ? 'var(--danger-bg)' : 'var(--warning-bg)',
                        color: f.contribution >= 15 ? 'var(--danger)' : 'var(--warning)',
                        border: `1px solid ${f.contribution >= 15 ? 'var(--danger-b)' : 'var(--warning-b)'}`,
                      }}>+{f.contribution.toFixed(1)}% risk</span>
                    </div>
                    <div className="factor-bar-bg" style={{ marginBottom: '7px' }}>
                      <div className="factor-bar-fill" style={{
                        width: `${Math.min(f.contribution * 3.5, 100)}%`,
                        background: f.contribution >= 15 ? 'var(--danger)' : 'var(--warning)'
                      }} />
                    </div>
                    <p style={{ fontSize: '11px', color: 'var(--text-3)', margin: 0, lineHeight: 1.5 }}>{f.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Customer + Order + Signals grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
            {/* Customer */}
            <div className="card" style={{ padding: '16px' }}>
              <h4 style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-1)', margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <User size={12} style={{ color: 'var(--brand)' }} /> Customer
              </h4>
              <DataRow label="Name" value={data.customer?.name || 'N/A'} />
              <DataRow label="Account age" value={`${data.customer?.account_age_days ?? 'N/A'} days`} />
              <DataRow label="Prior orders" value={data.customer?.previous_transaction_count ?? 0} />
              <DataRow label="Chargebacks" value={data.customer?.previous_chargeback_count ?? 0} highlight={(data.customer?.previous_chargeback_count ?? 0) > 0} />
              <DataRow label="Return rate" value={
                (data.customer?.previous_transaction_count ?? 0) > 0
                  ? `${(((data.customer?.previous_chargeback_count ?? 0) / data.customer.previous_transaction_count) * 100).toFixed(1)}%`
                  : '0%'
              } />
            </div>

            {/* Order */}
            <div className="card" style={{ padding: '16px' }}>
              <h4 style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-1)', margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CreditCard size={12} style={{ color: 'var(--brand)' }} /> Order Details
              </h4>
              <DataRow label="Amount" value={`₹${data.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} />
              <DataRow label="Method" value={data.payment_method.replace(/_/g, ' ').toUpperCase()} />
              <DataRow label="Bill country" value={data.customer_country} />
              <DataRow label="Ship country" value={data.shipping_country} />
              <DataRow label="Addr mismatch" value={!data.billing_shipping_match ? 'Yes' : 'No'} highlight={!data.billing_shipping_match} />
            </div>

            {/* Signals */}
            <div className="card" style={{ padding: '16px' }}>
              <h4 style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-1)', margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Monitor size={12} style={{ color: 'var(--brand)' }} /> Risk Signals
              </h4>
              <DataRow label="Velocity 1h" value={`${data.velocity_1h} hits`} highlight={data.velocity_1h > 3} />
              <DataRow label="Velocity 24h" value={`${data.velocity_24h} hits`} highlight={data.velocity_24h > 10} />
              <DataRow label="IP match" value={data.IP_shipping_match ? 'Matched' : 'Mismatch'} highlight={!data.IP_shipping_match} />
              <DataRow label="Device accounts" value={`${data.device_account_count}`} highlight={data.device_account_count > 2} />
              <DataRow label="Prev fraud flag" value={data.previous_fraud_flag ? 'Yes' : 'No'} highlight={data.previous_fraud_flag} />
            </div>
          </div>

          {/* Audit Timeline */}
          <div className="card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-1)', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '7px' }}>
              <FileText size={14} style={{ color: 'var(--brand)' }} />
              Audit Trail
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
              {/* Initial prediction */}
              <div style={{ display: 'flex', gap: '14px', paddingBottom: '16px', position: 'relative' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                  <div className="timeline-dot" style={{ background: 'var(--brand)' }} />
                  <div style={{ flex: 1, width: '1px', background: 'var(--border)', marginTop: '4px', minHeight: '20px' }} />
                </div>
                <div style={{ flex: 1, paddingBottom: '4px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-1)' }}>ML Prediction Generated</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-3)', marginTop: '2px' }}>
                    Score: <strong>{score}/100</strong> · Probability: <strong>{(data.fraud_probability * 100).toFixed(1)}%</strong> · {data.model_version}
                  </div>
                  <div style={{ fontSize: '9px', color: 'var(--text-4)', marginTop: '3px' }}>{new Date(data.timestamp).toLocaleString()}</div>
                </div>
              </div>
              {data.audit_logs.map((log, i) => (
                <div key={log.id} style={{ display: 'flex', gap: '14px', paddingBottom: i < data.audit_logs.length - 1 ? '16px' : 0, position: 'relative' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                    <div className="timeline-dot" style={{ background: 'var(--text-4)' }} />
                    {i < data.audit_logs.length - 1 && <div style={{ flex: 1, width: '1px', background: 'var(--border)', marginTop: '4px', minHeight: '20px' }} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-1)' }}>
                      {log.action.replace('TRANSACTION_', '')}
                      <span style={{ fontWeight: 500, color: 'var(--text-3)' }}> by </span>
                      <span style={{ color: 'var(--brand)' }}>{log.actor}</span>
                    </div>
                    {log.reason && <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '2px', fontStyle: 'italic' }}>{log.reason}</div>}
                    <div style={{ fontSize: '9px', color: 'var(--text-4)', marginTop: '3px' }}>{new Date(log.timestamp).toLocaleString()}</div>
                  </div>
                </div>
              ))}
              {data.decisions.map((d, i) => (
                <div key={d.id} style={{ display: 'flex', gap: '14px', paddingTop: '16px', paddingBottom: i < data.decisions.length - 1 ? '16px' : 0, borderTop: '1px solid var(--border)' }}>
                  <div style={{ flexShrink: 0 }}>
                    <div className="timeline-dot" style={{ background: d.override ? 'var(--warning)' : 'var(--success)' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-1)' }}>
                      Human Decision: <span style={{ color: d.human_decision === 'APPROVED' ? 'var(--success)' : d.human_decision === 'DECLINED' ? 'var(--danger)' : 'var(--warning)' }}>{d.human_decision}</span>
                      {d.override && <span style={{ marginLeft: '8px', fontSize: '9px', fontWeight: 700, background: 'var(--warning-bg)', color: 'var(--warning)', border: '1px solid var(--warning-b)', borderRadius: '4px', padding: '1px 5px' }}>OVERRIDE</span>}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '2px' }}>
                      By {d.actor} · AI Rec was: <strong>{d.ai_recommendation}</strong>
                    </div>
                    {d.override_reason && <div style={{ fontSize: '11px', color: 'var(--warning)', marginTop: '3px', fontStyle: 'italic' }}>Override: {d.override_reason}</div>}
                    {d.notes && <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '3px' }}>Notes: {d.notes}</div>}
                    <div style={{ fontSize: '9px', color: 'var(--text-4)', marginTop: '3px' }}>{new Date(d.timestamp).toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ──────── RIGHT COLUMN (sticky) ──────── */}
        <div style={{ position: 'sticky', top: '76px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

          {/* AI Assessment */}
          <div className="card" style={{ padding: '18px', overflow: 'hidden' }}>
            <h3 style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-1)', margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldAlert size={14} style={{ color: 'var(--brand)' }} />
              AI Risk Assessment
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
              <div style={{ padding: '10px', background: 'var(--surface-2)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <div className="section-label" style={{ marginBottom: '4px' }}>Risk Score</div>
                <div className="stat-value" style={{ fontSize: '24px', fontWeight: 900, color: riskColor, letterSpacing: '-0.03em' }}>{score}</div>
              </div>
              <div style={{ padding: '10px', background: 'var(--surface-2)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <div className="section-label" style={{ marginBottom: '4px' }}>Confidence</div>
                <div className="stat-value" style={{ fontSize: '24px', fontWeight: 900, color: 'var(--text-1)', letterSpacing: '-0.03em' }}>{confidence.toFixed(0)}%</div>
              </div>
            </div>
            <div style={{ padding: '10px 12px', background: aiRec === 'DECLINE' ? 'var(--danger-bg)' : aiRec === 'VERIFY' ? 'var(--warning-bg)' : 'var(--success-bg)', border: `1px solid ${aiRec === 'DECLINE' ? 'var(--danger-b)' : aiRec === 'VERIFY' ? 'var(--warning-b)' : 'var(--success-b)'}`, borderRadius: '8px' }}>
              <div className="section-label" style={{ marginBottom: '3px' }}>AI Recommendation</div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: aiRec === 'DECLINE' ? 'var(--danger)' : aiRec === 'VERIFY' ? 'var(--warning)' : 'var(--success)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                {aiRec === 'DECLINE' ? '🔴 DECLINE' : aiRec === 'VERIFY' ? '🟡 VERIFY' : '🟢 APPROVE'}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-3)', marginTop: '4px' }}>
                {aiRec === 'DECLINE' ? "Risk score exceeds the configured high-risk threshold." :
                 aiRec === 'VERIFY' ? "Risk score in medium band." :
                 "Risk score is below low risk boundary."}
              </div>
            </div>
          </div>

          {/* Human Review Panel */}
          <div className="card" style={{ padding: '18px' }}>
            <h3 style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-1)', margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldCheck size={14} style={{ color: 'var(--brand)' }} />
              Human Review
            </h3>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
              <ChevronDown size={12} style={{ color: 'var(--text-4)' }} />
              <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
            </div>

            {lockState.locked ? (
              /* Locked state */
              <div style={{ padding: '16px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '8px', textAlign: 'center' }}>
                {lockState.status === 'APPROVED' || lockState.status === 'APPROVED' ?
                  <CheckCircle2 size={28} style={{ color: 'var(--success)', margin: '0 auto 10px' }} /> :
                  lockState.status === 'DECLINED' ?
                  <XCircle size={28} style={{ color: 'var(--danger)', margin: '0 auto 10px' }} /> :
                  <ShieldCheck size={28} style={{ color: 'var(--brand)', margin: '0 auto 10px' }} />
                }
                <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-1)', marginBottom: '6px' }}>Decision Locked</div>
                <div style={{ fontSize: '11px', color: 'var(--text-3)', marginBottom: '12px' }}>
                  Final status: <strong style={{ color: 'var(--text-1)' }}>{lockState.status}</strong>
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-4)', borderTop: '1px solid var(--border)', paddingTop: '10px', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Resolved by:</span>
                    <span style={{ fontWeight: 700, color: 'var(--text-2)' }}>{lockState.actor}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Override:</span>
                    <span style={{ fontWeight: 700, color: lockState.isOverride ? 'var(--danger)' : 'var(--success)' }}>
                      {lockState.isOverride ? 'YES' : 'NO'}
                    </span>
                  </div>
                  {lockState.isOverride && lockState.overrideReason && (
                    <div style={{ marginTop: '6px', padding: '8px', background: 'var(--warning-bg)', border: '1px solid var(--warning-b)', borderRadius: '6px' }}>
                      <div style={{ fontSize: '8px', fontWeight: 700, color: 'var(--warning)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '3px' }}>Override Reason</div>
                      <div style={{ fontSize: '10px', color: 'var(--warning)', fontStyle: 'italic' }}>{lockState.overrideReason}</div>
                    </div>
                  )}
                </div>
              </div>
            ) : user?.role === 'VIEWER' ? (
              /* Restricted viewer state */
              <div style={{ padding: '16px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '8px', textAlign: 'center' }}>
                <ShieldAlert size={28} style={{ color: 'var(--text-4)', margin: '0 auto 10px' }} />
                <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-1)', marginBottom: '6px' }}>Review Restricted</div>
                <div style={{ fontSize: '11px', color: 'var(--text-3)', lineHeight: 1.4 }}>
                  Decision-making is restricted for your role. Contact an Analyst or Administrator to approve or decline this transaction.
                </div>
              </div>
            ) : showConfirmation && selectedAction ? (
              /* Confirmation step */
              <div className="animate-fade-in">
                <div style={{ padding: '12px', background: 'var(--brand-light)', border: '1px solid var(--brand-mid)', borderRadius: '8px', marginBottom: '12px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--brand)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <AlertTriangle size={12} /> Confirm Action
                  </div>
                  {[
                    ['AI Recommendation', aiRec],
                    ['Your Decision', actionLabel(selectedAction)],
                    ['Override', isOverride(selectedAction) ? 'YES' : 'NO'],
                  ].map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                      <span style={{ color: 'var(--text-3)' }}>{k}:</span>
                      <span style={{ fontWeight: 700, color: k === 'Override' && v === 'YES' ? 'var(--danger)' : 'var(--text-1)' }}>{v}</span>
                    </div>
                  ))}
                  {isOverride(selectedAction) && overrideReasonText && (
                    <div style={{ marginTop: '6px', fontSize: '10px', color: 'var(--text-3)', fontStyle: 'italic', borderTop: '1px solid var(--brand-mid)', paddingTop: '6px' }}>"{overrideReasonText}"</div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => handleAction(selectedAction, {
                      action: selectedAction,
                      notes: notes.trim() || undefined,
                      ai_recommendation: aiRec,
                      human_decision: humanDecision(selectedAction),
                      override: isOverride(selectedAction),
                      override_reason: isOverride(selectedAction) ? overrideReasonText : ''
                    })}
                    disabled={isSubmitting}
                    className="btn-primary"
                    style={{ flex: 1, justifyContent: 'center' }}
                  >
                    {isSubmitting ? <><RefreshCw size={11} className="animate-spin" /> Processing...</> : 'Confirm Decision'}
                  </button>
                  <button onClick={() => setShowConfirmation(false)} disabled={isSubmitting} className="btn-secondary">Cancel</button>
                </div>
              </div>
            ) : (
              /* Action selection */
              <>
                {/* Notes toggle */}
                <button
                  onClick={() => setShowNotes(v => !v)}
                  style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: 600, color: 'var(--text-3)', marginBottom: '8px', borderBottom: '1px solid var(--border)' }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><FileText size={11} /> Investigation Notes (optional)</span>
                  <ChevronDown size={11} style={{ transform: showNotes ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                </button>
                {showNotes && (
                  <textarea
                    value={notes} onChange={(e) => setNotes(e.target.value)}
                    placeholder="Record review findings, customer correspondence..."
                    style={{ width: '100%', padding: '8px 10px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '11px', color: 'var(--text-1)', outline: 'none', resize: 'none', height: '64px', marginBottom: '12px', display: 'block' }}
                  />
                )}

                <div className="section-label" style={{ marginBottom: '8px' }}>Your Decision</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '7px', marginBottom: '12px' }}>
                  {(['MARK_SAFE', 'VERIFY', 'DECLINE'] as const).map(action => {
                    const over = isOverride(action);
                    const colorMap = { MARK_SAFE: 'selected-approve', VERIFY: 'selected-verify', DECLINE: 'selected-decline' };
                    return (
                      <button
                        key={action}
                        onClick={() => setSelectedAction(action)}
                        className={`decision-btn ${selectedAction === action ? colorMap[action] : ''}`}
                        style={{ height: '36px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}
                      >
                        <span style={{ fontSize: '10px', fontWeight: 800 }}>{action === 'MARK_SAFE' ? 'APPROVE' : action}</span>
                        {over && <span style={{ fontSize: '6px', color: 'inherit', opacity: 0.8, marginTop: '1px', textTransform: 'uppercase' }}>OVERRIDE</span>}
                      </button>
                    );
                  })}
                </div>

                {/* Override reason */}
                {selectedAction && isOverride(selectedAction) && (
                  <div className="animate-fade-in" style={{ marginBottom: '12px', padding: '10px', background: 'var(--warning-bg)', border: '1px solid var(--warning-b)', borderRadius: '8px' }}>
                    <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '6px' }}>
                      <AlertTriangle size={11} /> Override reason required
                    </div>
                    <input
                      type="text" value={overrideReasonText} onChange={(e) => setOverrideReasonText(e.target.value)}
                      placeholder="Justify your override..."
                      style={{ width: '100%', padding: '7px 10px', background: 'var(--surface)', border: '1px solid var(--warning-b)', borderRadius: '5px', fontSize: '11px', color: 'var(--text-1)', outline: 'none' }}
                    />
                  </div>
                )}

                {selectedAction && (
                  <button
                    onClick={() => setShowConfirmation(true)}
                    disabled={isOverride(selectedAction) && overrideReasonText.trim().length === 0}
                    className="btn-primary"
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    Submit Decision
                  </button>
                )}
              </>
            )}
          </div>

          {/* Transaction summary card */}
          <div className="card" style={{ padding: '14px 16px' }}>
            <div className="section-label" style={{ marginBottom: '10px' }}>Transaction Summary</div>
            <DataRow label="Amount" value={`₹${data.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} />
            <DataRow label="Method" value={data.payment_method.replace(/_/g, ' ').toUpperCase()} />
            <DataRow label="Currency" value={data.currency} />
            <DataRow label="Customer ID" value={<span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px' }}>{data.customer_id}</span>} />
          </div>
        </div>

      </div>
    </div>
  );
};

export default TransactionDetail;
