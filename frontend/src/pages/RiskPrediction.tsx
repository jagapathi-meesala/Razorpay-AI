import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ShieldAlert, RefreshCw, User, CreditCard, Monitor, Activity, CheckCircle, Cpu, Layers, Sparkles, RotateCcw } from 'lucide-react';
import { loadSettings } from './Settings';

interface PredictRiskFactor { feature: string; contribution: number; severity: string; description: string; }
interface PredictionResult {
  probability: number; risk_score: number; risk_level: string;
  confidence: number; recommendation: string;
  risk_factors: PredictRiskFactor[]; model_version: string;
}

const COUNTRY_OPTIONS = [
  { code: 'IN', label: '🇮🇳 India (IN)' },
  { code: 'US', label: '🇺🇸 United States (US)' },
  { code: 'GB', label: '🇬🇧 United Kingdom (GB)' },
  { code: 'AE', label: '🇦🇪 United Arab Emirates (AE)' },
  { code: 'SG', label: '🇸🇬 Singapore (SG)' },
  { code: 'CA', label: '🇨🇦 Canada (CA)' },
  { code: 'AU', label: '🇦🇺 Australia (AU)' },
  { code: 'DE', label: '🇩🇪 Germany (DE)' },
  { code: 'FR', label: '🇫🇷 France (FR)' },
  { code: 'JP', label: '🇯🇵 Japan (JP)' },
];

const Label: React.FC<{ children: React.ReactNode; required?: boolean }> = ({ children, required }) => (
  <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-3)', letterSpacing: '0.02em', display: 'block', marginBottom: '5px' }}>
    {children}{required && <span style={{ color: 'var(--danger)', marginLeft: '2px' }}>*</span>}
  </label>
);

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', background: 'var(--surface)', border: '1px solid var(--border)',
  borderRadius: '8px', fontSize: '13px', color: 'var(--text-1)', outline: 'none',
  transition: 'border-color 0.15s, box-shadow 0.15s', boxSizing: 'border-box',
};

const BoolToggle: React.FC<{ value: boolean; onChange: (v: boolean) => void }> = ({ value, onChange }) => (
  <div style={{ display: 'flex', gap: '6px' }}>
    {[true, false].map(opt => (
      <button
        key={String(opt)}
        type="button"
        onClick={() => onChange(opt)}
        style={{
          flex: 1, padding: '9px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
          border: `1px solid ${value === opt ? 'var(--brand)' : 'var(--border)'}`,
          background: value === opt ? 'var(--brand-light)' : 'var(--surface)',
          color: value === opt ? 'var(--brand)' : 'var(--text-3)',
          transition: 'all 0.15s',
        }}
      >
        {opt ? 'Yes' : 'No'}
      </button>
    ))}
  </div>
);

/* ── Pure Top-Level Component: Preserves Uninterrupted Focus & Caret Position ── */
interface NumInputProps {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  step?: number;
  placeholder?: string;
}

const NumInput: React.FC<NumInputProps> = ({
  value,
  onChange,
  min = 0,
  step = 1,
  placeholder = '0'
}) => {
  const [valStr, setValStr] = useState<string>(value ? String(value) : '');
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      setValStr(value ? String(value) : '');
    }
  }, [value, isFocused]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    // Permitting ONLY numeric digits and a single decimal point (NO ALPHABETS ALLOWED)
    const filtered = raw.replace(/[^0-9.]/g, '');
    const parts = filtered.split('.');
    const clean = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : filtered;

    setValStr(clean);
    if (clean === '' || clean === '.') {
      onChange(0);
    } else {
      const parsed = parseFloat(clean);
      if (!isNaN(parsed)) {
        onChange(parsed);
      }
    }
  };

  const handleMinus = () => {
    const curr = parseFloat(valStr) || 0;
    const next = Math.max(min, curr - step);
    const rounded = Math.round(next * 100) / 100;
    const s = rounded ? String(rounded) : '';
    setValStr(s);
    onChange(rounded);
  };

  const handlePlus = () => {
    const curr = parseFloat(valStr) || 0;
    const next = curr + step;
    const rounded = Math.round(next * 100) / 100;
    const s = String(rounded);
    setValStr(s);
    onChange(rounded);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <button
        type="button"
        onClick={handleMinus}
        title="Decrease value"
        style={{
          width: '34px', height: '36px', borderRadius: '8px', border: '1px solid var(--border)',
          background: 'var(--surface-2)', color: 'var(--text-1)', fontSize: '16px', fontWeight: 700,
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          userSelect: 'none', transition: 'all 0.15s', flexShrink: 0
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--brand-light)'; e.currentTarget.style.color = 'var(--brand)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.color = 'var(--text-1)'; }}
      >
        -
      </button>
      <input
        type="text"
        inputMode="decimal"
        value={valStr}
        placeholder={placeholder}
        onChange={handleChange}
        onFocus={(e) => {
          setIsFocused(true);
          e.target.style.borderColor = 'var(--brand)';
          e.target.style.boxShadow = '0 0 0 3px rgba(55,48,163,0.10)';
        }}
        onBlur={(e) => {
          setIsFocused(false);
          e.target.style.borderColor = 'var(--border)';
          e.target.style.boxShadow = 'none';
        }}
        style={{
          ...inputStyle,
          textAlign: 'center',
          flex: 1,
          fontFamily: 'JetBrains Mono, monospace',
          fontWeight: 600
        }}
      />
      <button
        type="button"
        onClick={handlePlus}
        title="Increase value"
        style={{
          width: '34px', height: '36px', borderRadius: '8px', border: '1px solid var(--border)',
          background: 'var(--surface-2)', color: 'var(--text-1)', fontSize: '16px', fontWeight: 700,
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          userSelect: 'none', transition: 'all 0.15s', flexShrink: 0
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--brand-light)'; e.currentTarget.style.color = 'var(--brand)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.color = 'var(--text-1)'; }}
      >
        +
      </button>
    </div>
  );
};

const SectionHeader: React.FC<{ icon: React.ReactNode; title: string }> = ({ icon, title }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid var(--border)' }}>
    <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'var(--brand-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {icon}
    </div>
    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-1)' }}>{title}</span>
  </div>
);

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <Label>{label}</Label>
    {children}
  </div>
);

const Row2: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
    {children}
  </div>
);

const RiskPrediction: React.FC = () => {
  const [amount, setAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('credit_card');
  const [customerCountry, setCustomerCountry] = useState('IN');
  const [shippingCountry, setShippingCountry] = useState('IN');
  const [accountAgeDays, setAccountAgeDays] = useState(0);
  const [prevTxnCount, setPrevTxnCount] = useState(0);
  const [prevCbCount, setPrevCbCount] = useState(0);
  const [failedPaymentCount, setFailedPaymentCount] = useState(0);
  const [deviceAccountCount, setDeviceAccountCount] = useState(1);
  const [ipAccountCount, setIpAccountCount] = useState(1);
  const [billingShippingMatch, setBillingShippingMatch] = useState(true);
  const [ipShippingMatch, setIpShippingMatch] = useState(true);
  const [deviceAgeDays, setDeviceAgeDays] = useState(0);
  const [txnFrequency, setTxnFrequency] = useState(0);
  const [avgTxnAmount, setAvgTxnAmount] = useState(0);
  const [isNewDevice, setIsNewDevice] = useState(false);
  const [isNewLocation, setIsNewLocation] = useState(false);
  const [velocity1h, setVelocity1h] = useState(0);
  const [velocity24h, setVelocity24h] = useState(0);
  const [previousFraudFlag, setPreviousFraudFlag] = useState(false);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const settings = loadSettings();

  // Live model metadata from backend — same source as Model Performance page
  const [modelAccuracy, setModelAccuracy] = useState<number | null>(null);
  const [modelVersion, setModelVersion] = useState<string>('...');
  const [modelType, setModelType] = useState<string>('...');
  const [modelFeatCount, setModelFeatCount] = useState<number>(0);

  useEffect(() => {
    axios.get('/api/model/metrics')
      .then(r => {
        setModelAccuracy(r.data.accuracy);
        setModelVersion(r.data.version);
        setModelType(r.data.model_type);
        setModelFeatCount(r.data.features_count);
      })
      .catch(() => {}); // Fail silently — pills stay as placeholder
  }, []);

  const handleResetForm = () => {
    setAmount(0);
    setPaymentMethod('credit_card');
    setCustomerCountry('IN');
    setShippingCountry('IN');
    setAccountAgeDays(0);
    setPrevTxnCount(0);
    setPrevCbCount(0);
    setFailedPaymentCount(0);
    setDeviceAccountCount(1);
    setIpAccountCount(1);
    setBillingShippingMatch(true);
    setIpShippingMatch(true);
    setDeviceAgeDays(0);
    setTxnFrequency(0);
    setAvgTxnAmount(0);
    setIsNewDevice(false);
    setIsNewLocation(false);
    setVelocity1h(0);
    setVelocity24h(0);
    setPreviousFraudFlag(false);
    setResult(null);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true); setError(null);
    const calculatedDev = avgTxnAmount > 0 ? parseFloat((amount / avgTxnAmount).toFixed(2)) : 1.0;
    try {
      const res = await axios.post('/api/transactions/predict', {
        amount, payment_method: paymentMethod, customer_country: customerCountry,
        shipping_country: shippingCountry, account_age_days: accountAgeDays,
        previous_transaction_count: prevTxnCount, previous_chargeback_count: prevCbCount,
        failed_payment_count: failedPaymentCount, device_account_count: deviceAccountCount,
        IP_account_count: ipAccountCount, billing_shipping_match: billingShippingMatch ? 1 : 0,
        IP_shipping_match: ipShippingMatch ? 1 : 0, device_age_days: deviceAgeDays,
        transaction_frequency: txnFrequency, average_transaction_amount: avgTxnAmount,
        amount_deviation: calculatedDev, is_new_device: isNewDevice ? 1 : 0,
        is_new_location: isNewLocation ? 1 : 0, velocity_1h: velocity1h, velocity_24h: velocity24h,
        previous_fraud_flag: previousFraudFlag ? 1 : 0,
      });
      setResult(res.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Analysis failed. Please check your inputs.');
    } finally { setIsLoading(false); }
  };

  const riskColor = result ? (result.risk_score >= settings.highRiskThreshold ? 'var(--danger)' : result.risk_score >= settings.mediumRiskThreshold ? 'var(--warning)' : 'var(--success)') : 'var(--text-1)';
  const scorePercent = result ? result.risk_score : 0;

  return (
    <div className="animate-fade-in" style={{ padding: '28px 36px', maxWidth: '1400px', margin: '0 auto' }}>

      {/* Title & Model Architecture Info Banner */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="page-title" style={{ fontSize: '24px', fontWeight: 800 }}>Risk Analysis & ML Predictor</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-3)', marginTop: '4px' }}>Enter transaction attributes to execute real-time ML inference & explainable risk scoring</p>
        </div>

        {/* Model Spec Pills */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ padding: '8px 14px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Cpu size={15} style={{ color: 'var(--brand)' }} />
            <div>
              <div style={{ fontSize: '10px', color: 'var(--text-4)', textTransform: 'uppercase', fontWeight: 700 }}>ML Engine</div>
              <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-1)', fontFamily: 'JetBrains Mono, monospace' }}>
                {modelType} {modelVersion}
              </div>
            </div>
          </div>

          <div style={{ padding: '8px 14px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={15} style={{ color: 'var(--brand)' }} />
            <div>
              <div style={{ fontSize: '10px', color: 'var(--text-4)', textTransform: 'uppercase', fontWeight: 700 }}>Feature Space</div>
              <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-1)', fontFamily: 'JetBrains Mono, monospace' }}>
                {modelAccuracy !== null ? `${modelFeatCount} Signals` : '...'}
              </div>
            </div>
          </div>

          <div style={{ padding: '8px 14px', background: 'var(--brand-light)', border: '1px solid var(--brand-mid)', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={15} style={{ color: 'var(--brand)' }} />
            <div>
              <div style={{ fontSize: '10px', color: 'var(--brand)', textTransform: 'uppercase', fontWeight: 700 }}>Accuracy</div>
              <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--brand)', fontFamily: 'JetBrains Mono, monospace' }}>
                {modelAccuracy !== null ? `${(modelAccuracy * 100).toFixed(2)}% Verified` : 'Loading...'}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '24px', alignItems: 'start' }}>

        {/* ── Form ── */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Customer Behaviour */}
          <div className="card" style={{ padding: '24px' }}>
            <SectionHeader icon={<User size={15} style={{ color: 'var(--brand)' }} />} title="Customer Behaviour & History" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <Row2>
                <Field label="Account Age (days)"><NumInput value={accountAgeDays} onChange={setAccountAgeDays} step={1} placeholder="0" /></Field>
                <Field label="Prior Transactions"><NumInput value={prevTxnCount} onChange={setPrevTxnCount} step={1} placeholder="0" /></Field>
              </Row2>
              <Row2>
                <Field label="Prior Chargebacks"><NumInput value={prevCbCount} onChange={setPrevCbCount} step={1} placeholder="0" /></Field>
                <Field label="Failed Payments"><NumInput value={failedPaymentCount} onChange={setFailedPaymentCount} step={1} placeholder="0" /></Field>
              </Row2>
              <Row2>
                <Field label="Avg. Txn Amount (₹)"><NumInput value={avgTxnAmount} onChange={setAvgTxnAmount} step={100} placeholder="0.00" /></Field>
                <div><Label>Previous Fraud Flag</Label><BoolToggle value={previousFraudFlag} onChange={setPreviousFraudFlag} /></div>
              </Row2>
            </div>
          </div>

          {/* Order Information */}
          <div className="card" style={{ padding: '24px' }}>
            <SectionHeader icon={<CreditCard size={15} style={{ color: 'var(--brand)' }} />} title="Order Information & Geo-Location" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <Row2>
                <Field label="Transaction Amount (₹)"><NumInput value={amount} onChange={setAmount} step={500} placeholder="0.00" /></Field>
                <Field label="Payment Method">
                  <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}
                    style={{ ...inputStyle, appearance: 'none', cursor: 'pointer', height: '36px' }}
                    onFocus={(e) => { e.target.style.borderColor = 'var(--brand)'; e.target.style.boxShadow = '0 0 0 3px rgba(55,48,163,0.10)'; }}
                    onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }}
                  >
                    {[['credit_card', 'Credit Card'], ['debit_card', 'Debit Card'], ['upi', 'UPI'], ['net_banking', 'Net Banking']].map(([v, l]) =>
                      <option key={v} value={v}>{l}</option>
                    )}
                  </select>
                </Field>
              </Row2>
              <Row2>
                <Field label="Billing Country">
                  <select
                    value={customerCountry}
                    onChange={(e) => setCustomerCountry(e.target.value)}
                    style={{ ...inputStyle, appearance: 'none', cursor: 'pointer', height: '36px' }}
                    onFocus={(e) => { e.target.style.borderColor = 'var(--brand)'; e.target.style.boxShadow = '0 0 0 3px rgba(55,48,163,0.10)'; }}
                    onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }}
                  >
                    {COUNTRY_OPTIONS.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
                  </select>
                </Field>
                <Field label="Shipping Country">
                  <select
                    value={shippingCountry}
                    onChange={(e) => setShippingCountry(e.target.value)}
                    style={{ ...inputStyle, appearance: 'none', cursor: 'pointer', height: '36px' }}
                    onFocus={(e) => { e.target.style.borderColor = 'var(--brand)'; e.target.style.boxShadow = '0 0 0 3px rgba(55,48,163,0.10)'; }}
                    onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }}
                  >
                    {COUNTRY_OPTIONS.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
                  </select>
                </Field>
              </Row2>
              <Row2>
                <div><Label>Billing = Shipping?</Label><BoolToggle value={billingShippingMatch} onChange={setBillingShippingMatch} /></div>
                <Field label="Txn Frequency (per day)"><NumInput value={txnFrequency} onChange={setTxnFrequency} step={0.5} placeholder="0" /></Field>
              </Row2>
            </div>
          </div>

          {/* Transaction Signals */}
          <div className="card" style={{ padding: '24px' }}>
            <SectionHeader icon={<Monitor size={15} style={{ color: 'var(--brand)' }} />} title="Device & Network Velocity Signals" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <Row2>
                <Field label="Device Age (days)"><NumInput value={deviceAgeDays} onChange={setDeviceAgeDays} step={1} placeholder="0" /></Field>
                <Field label="Device Account Count"><NumInput value={deviceAccountCount} onChange={setDeviceAccountCount} min={1} step={1} placeholder="1" /></Field>
              </Row2>
              <Row2>
                <Field label="IP Account Count"><NumInput value={ipAccountCount} onChange={setIpAccountCount} min={1} step={1} placeholder="1" /></Field>
                <Field label="Velocity (1h)"><NumInput value={velocity1h} onChange={setVelocity1h} step={1} placeholder="0" /></Field>
              </Row2>
              <Row2>
                <Field label="Velocity (24h)"><NumInput value={velocity24h} onChange={setVelocity24h} step={1} placeholder="0" /></Field>
                <div><Label>IP = Shipping Country?</Label><BoolToggle value={ipShippingMatch} onChange={setIpShippingMatch} /></div>
              </Row2>
              <Row2>
                <div><Label>New Device?</Label><BoolToggle value={isNewDevice} onChange={setIsNewDevice} /></div>
                <div><Label>New Location?</Label><BoolToggle value={isNewLocation} onChange={setIsNewLocation} /></div>
              </Row2>
            </div>
          </div>

          {error && (
            <div style={{ padding: '14px 18px', background: 'var(--danger-bg)', border: '1px solid var(--danger-b)', borderRadius: '10px', fontSize: '13px', color: 'var(--danger)' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px' }}>
            <button type="submit" disabled={isLoading} className="btn-primary" style={{ flex: 1, justifyContent: 'center', padding: '14px', fontSize: '14px', fontWeight: 700 }}>
              {isLoading ? <><RefreshCw size={16} className="animate-spin" /> Running Model Inference...</> : <><Activity size={16} /> Analyze Risk Now</>}
            </button>
            <button
              type="button"
              onClick={handleResetForm}
              style={{
                padding: '14px 20px', background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: '10px', fontSize: '13px', fontWeight: 700, color: 'var(--text-2)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.15s'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.color = 'var(--text-1)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--surface)'; e.currentTarget.style.color = 'var(--text-2)'; }}
            >
              <RotateCcw size={15} /> Reset Form
            </button>
          </div>
        </form>

        {/* ── Result Panel ── */}
        <div style={{ position: 'sticky', top: '76px' }}>
          {!result && !isLoading ? (
            <div className="card" style={{ padding: '44px 28px', textAlign: 'center' }}>
              <ShieldAlert size={48} style={{ color: 'var(--brand-mid)', margin: '0 auto 16px' }} />
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-1)', marginBottom: '8px' }}>Ready for Analysis</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-3)', lineHeight: 1.6 }}>Adjust transaction variables using the inputs or + / - steppers, then click "Analyze Risk Now".</p>
            </div>
          ) : isLoading ? (
            <div className="card" style={{ padding: '44px 28px', textAlign: 'center' }}>
              <RefreshCw size={36} style={{ color: 'var(--brand)', margin: '0 auto 16px', animation: 'spin 1s linear infinite' }} />
              <p style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-1)', marginBottom: '6px' }}>Evaluating {modelFeatCount || '...'} Feature Signals...</p>
              <p style={{ fontSize: '12px', color: 'var(--text-3)' }}>Running Random Forest Decision Trees</p>
              <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
            </div>
          ) : result ? (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Score */}
              <div className="card" style={{ padding: '24px' }}>
                <div className="section-label" style={{ marginBottom: '14px' }}>Risk Score Result</div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '18px', marginBottom: '18px' }}>
                  <div>
                    <div className="stat-value" style={{ fontSize: '60px', fontWeight: 900, color: riskColor, letterSpacing: '-0.05em', lineHeight: 1 }}>{result.risk_score}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-4)', marginTop: '4px' }}>out of 100</div>
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '10px' }}>
                    <div>
                      <div className="section-label" style={{ marginBottom: '2px' }}>Risk Level</div>
                      <span style={{ fontSize: '15px', fontWeight: 800, color: riskColor }}>{result.risk_level}</span>
                    </div>
                    <div>
                      <div className="section-label" style={{ marginBottom: '2px' }}>Model Confidence</div>
                      <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-1)' }}>{result.confidence}%</span>
                    </div>
                  </div>
                </div>

                {/* Horizontal risk scale */}
                <div style={{ paddingBottom: '28px' }}>
                  <div className="risk-scale-track">
                    <div className="risk-threshold-marker" style={{ left: `${settings.mediumRiskThreshold}%` }}>
                      <span className="risk-threshold-label">{settings.mediumRiskThreshold}</span>
                    </div>
                    <div className="risk-threshold-marker" style={{ left: `${settings.highRiskThreshold}%` }}>
                      <span className="risk-threshold-label">{settings.highRiskThreshold}</span>
                    </div>
                    <div className="risk-scale-dot" style={{ left: `${scorePercent}%`, background: riskColor }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', fontSize: '10px', fontWeight: 700, color: 'var(--text-4)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    <span style={{ color: 'var(--success)' }}>LOW</span>
                    <span style={{ color: 'var(--warning)' }}>MEDIUM</span>
                    <span style={{ color: 'var(--danger)' }}>HIGH</span>
                  </div>
                </div>

                {/* Recommendation */}
                <div style={{ padding: '16px', borderRadius: '10px', background: result.recommendation === 'MANUAL REVIEW' ? 'var(--danger-bg)' : result.recommendation === 'VERIFY' ? 'var(--warning-bg)' : 'var(--success-bg)', border: `1px solid ${result.recommendation === 'MANUAL REVIEW' ? 'var(--danger-b)' : result.recommendation === 'VERIFY' ? 'var(--warning-b)' : 'var(--success-b)'}` }}>
                  <div className="section-label" style={{ marginBottom: '4px' }}>AI Recommended Action</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: result.recommendation === 'MANUAL REVIEW' ? 'var(--danger)' : result.recommendation === 'VERIFY' ? 'var(--warning)' : 'var(--success)' }}>
                    {result.recommendation}
                  </div>
                </div>
              </div>

              {/* Risk factors */}
              {result.risk_factors.length > 0 && (
                <div className="card" style={{ padding: '22px' }}>
                  <div className="section-label" style={{ marginBottom: '14px' }}>Feature Importance Risk Contributions</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {result.risk_factors.map((f, i) => (
                      <div key={i}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-1)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>{f.feature.replace(/_/g, ' ')}</span>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: f.severity === 'HIGH' ? 'var(--danger)' : 'var(--warning)' }}>+{f.contribution.toFixed(1)}%</span>
                        </div>
                        <div className="factor-bar-bg">
                          <div className="factor-bar-fill" style={{ width: `${Math.min(f.contribution * 3.5, 100)}%`, background: f.severity === 'HIGH' ? 'var(--danger)' : 'var(--warning)' }} />
                        </div>
                        <p style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '4px', lineHeight: 1.4 }}>{f.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result.risk_factors.length === 0 && (
                <div className="card" style={{ padding: '24px', textAlign: 'center' }}>
                  <CheckCircle size={28} style={{ color: 'var(--success)', margin: '0 auto 8px' }} />
                  <p style={{ fontSize: '12px', color: 'var(--text-3)' }}>No significant risk factors detected for this transaction.</p>
                </div>
              )}

              <div style={{ padding: '12px 14px', background: 'var(--surface-2)', borderRadius: '10px', border: '1px solid var(--border)', fontSize: '11px', color: 'var(--text-4)', textAlign: 'center' }}>
                Engine Build: <strong style={{ color: 'var(--text-2)', fontFamily: 'JetBrains Mono, monospace' }}>{result.model_version}</strong>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default RiskPrediction;
