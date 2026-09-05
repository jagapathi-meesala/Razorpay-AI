import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { TrendingDown, TrendingUp, ShieldAlert } from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip as ChartTooltip, BarChart, Bar
} from 'recharts';

interface VolumeTrendItem { date: string; volume: number; avg_risk: number; }
interface PMItem { payment_method: string; count: number; amount: number; avg_risk: number; }
interface CountryItem { country: string; count: number; avg_risk: number; amount: number; }
interface AnalyticsData {
  total_volume: number; loss_exposure: number; prevented_loss: number;
  payment_method_distribution: PMItem[];
  country_distribution: CountryItem[];
  volume_trends: VolumeTrendItem[];
}

const Analytics: React.FC = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    axios.get('/api/analytics').then(r => setData(r.data)).catch(() => {}).finally(() => setIsLoading(false));
  }, []);

  if (isLoading) return (
    <div style={{ padding: '28px 32px' }}>
      {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: '80px', marginBottom: '14px', borderRadius: '10px' }} />)}
    </div>
  );

  if (!data) return (
    <div style={{ padding: '28px 32px', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
      <div style={{ textAlign: 'center' }}>
        <ShieldAlert size={36} style={{ color: 'var(--danger)', margin: '0 auto 12px' }} />
        <p style={{ color: 'var(--text-3)', fontSize: '13px' }}>Unable to load analytics data.</p>
        <button onClick={() => window.location.reload()} className="btn-primary" style={{ marginTop: '12px' }}>Retry</button>
      </div>
    </div>
  );

  const trendData = data.volume_trends.map(t => ({
    date: t.date, volume: t.volume, avg_risk: parseFloat(t.avg_risk.toFixed(1))
  }));

  const pmData = data.payment_method_distribution.map(pm => ({
    name: pm.payment_method.replace(/_/g, ' ').toUpperCase(),
    txns: pm.count, avgRisk: parseFloat(pm.avg_risk.toFixed(1)), amount: pm.amount
  }));

  const tooltip = {
    contentStyle: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', boxShadow: 'var(--shadow-md)', fontSize: '11px' }
  };

  return (
    <div className="animate-fade-in" style={{ padding: '28px 36px', maxWidth: '1400px', margin: '0 auto' }}>

      <div style={{ marginBottom: '24px' }}>
        <h1 className="page-title">Analytics</h1>
        <p style={{ fontSize: '13px', color: 'var(--text-3)', marginTop: '4px' }}>Deep analysis of transaction volumes, risk trends, and payment channel risk</p>
      </div>

      {/* Summary strips */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: 'Total Volume', value: `₹${data.total_volume.toLocaleString()}`, sub: 'Gross transaction amount', icon: TrendingUp, color: 'var(--brand)', bg: 'var(--brand-light)' },
          { label: 'Loss Exposure', value: `₹${data.loss_exposure.toLocaleString()}`, sub: 'High-risk transaction value', icon: TrendingDown, color: 'var(--danger)', bg: 'var(--danger-bg)' },
          { label: 'Prevented Loss', value: `₹${data.prevented_loss.toLocaleString()}`, sub: 'Blocked via ML detection', icon: ShieldAlert, color: 'var(--success)', bg: 'var(--success-bg)' },
        ].map(({ label, value, sub, icon: Icon, color, bg }) => (
          <div key={label} className="card" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="section-label" style={{ marginBottom: '5px' }}>{label}</div>
              <div className="stat-value" style={{ fontSize: '22px', fontWeight: 800, color, letterSpacing: '-0.03em' }}>{value}</div>
              <div style={{ fontSize: '10px', color: 'var(--text-4)', marginTop: '4px' }}>{sub}</div>
            </div>
            <div style={{ padding: '8px', background: bg, borderRadius: '8px', color, flexShrink: 0 }}>
              <Icon size={15} />
            </div>
          </div>
        ))}
      </div>

      {/* Volume + Risk trend */}
      <div className="card" style={{ padding: '20px', marginBottom: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div>
            <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-1)', margin: 0 }}>Transaction Volume & Average Risk</h3>
            <p style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '3px' }}>30-day daily volume with risk trend overlay</p>
          </div>
          <div style={{ display: 'flex', gap: '16px', fontSize: '10px', fontWeight: 600 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--brand)' }}>
              <span style={{ width: '12px', height: '2px', background: 'var(--brand)', display: 'inline-block', borderRadius: '2px' }} /> Volume
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--warning)' }}>
              <span style={{ width: '12px', height: '2px', background: 'var(--warning)', display: 'inline-block', borderRadius: '2px', borderStyle: 'dashed' }} /> Avg Risk
            </span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={trendData} margin={{ top: 5, right: 4, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="gVol" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--brand)" stopOpacity={0.1} />
                <stop offset="100%" stopColor="var(--brand)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gRisk" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--warning)" stopOpacity={0.08} />
                <stop offset="100%" stopColor="var(--warning)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
            <XAxis dataKey="date" stroke="var(--text-2)" fontSize={10} tickLine={false} axisLine={false} />
            <YAxis yAxisId="vol" stroke="var(--text-2)" fontSize={10} tickLine={false} axisLine={false} />
            <YAxis yAxisId="risk" orientation="right" stroke="var(--text-2)" fontSize={10} tickLine={false} axisLine={false} domain={[0, 100]} />
            <ChartTooltip {...tooltip} />
            <Area yAxisId="vol" type="monotone" dataKey="volume" stroke="var(--brand)" strokeWidth={2} fill="url(#gVol)" dot={false} name="Volume" />
            <Area yAxisId="risk" type="monotone" dataKey="avg_risk" stroke="var(--warning)" strokeWidth={1.5} fill="url(#gRisk)" dot={false} strokeDasharray="4 2" name="Avg Risk" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Two-column: Payment method + Country */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>

        {/* Payment method breakdown */}
        <div className="card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-1)', margin: '0 0 14px' }}>Payment Channel Risk</h3>
          <div style={{ height: '200px', marginBottom: '14px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pmData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="name" stroke="var(--text-2)" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-2)" fontSize={10} tickLine={false} axisLine={false} />
                <ChartTooltip {...tooltip} />
                <Bar dataKey="avgRisk" fill="var(--brand)" radius={[4, 4, 0, 0]} barSize={28} name="Avg Risk Score" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
            <thead>
              <tr>
                {['Method', 'Transactions', 'Avg Risk', 'Volume'].map(h => (
                  <th key={h} style={{ padding: '6px 8px', textAlign: h === 'Transactions' || h === 'Avg Risk' ? 'center' : h === 'Volume' ? 'right' : 'left', fontWeight: 600, fontSize: '9px', color: 'var(--text-3)', letterSpacing: '0.06em', textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pmData.map(pm => (
                <tr key={pm.name} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '8px 8px', fontWeight: 600, color: 'var(--text-1)' }}>{pm.name}</td>
                  <td style={{ padding: '8px 8px', textAlign: 'center', color: 'var(--text-2)', fontVariantNumeric: 'tabular-nums' }}>{pm.txns.toLocaleString()}</td>
                  <td style={{ padding: '8px 8px', textAlign: 'center', fontWeight: 700, color: pm.avgRisk >= 60 ? 'var(--danger)' : pm.avgRisk >= 40 ? 'var(--warning)' : 'var(--success)', fontVariantNumeric: 'tabular-nums' }}>{pm.avgRisk}</td>
                  <td style={{ padding: '8px 8px', textAlign: 'right', color: 'var(--text-2)', fontVariantNumeric: 'tabular-nums' }}>₹{pm.amount.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Country risk breakdown */}
        <div className="card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-1)', margin: '0 0 14px' }}>Country Risk Distribution</h3>
          {data.country_distribution.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-4)', fontSize: '12px' }}>No country data available.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
              <thead>
                <tr>
                  {['Country', 'Transactions', 'Avg Risk', 'Volume'].map(h => (
                    <th key={h} style={{ padding: '6px 8px', textAlign: h === 'Transactions' || h === 'Avg Risk' ? 'center' : h === 'Volume' ? 'right' : 'left', fontWeight: 600, fontSize: '9px', color: 'var(--text-3)', letterSpacing: '0.06em', textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.country_distribution.slice(0, 10).map(c => (
                  <tr key={c.country} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '8px 8px', fontWeight: 700, color: 'var(--text-1)', fontFamily: 'JetBrains Mono, monospace' }}>{c.country}</td>
                    <td style={{ padding: '8px 8px', textAlign: 'center', color: 'var(--text-2)', fontVariantNumeric: 'tabular-nums' }}>{c.count.toLocaleString()}</td>
                    <td style={{ padding: '8px 8px', textAlign: 'center', fontWeight: 700, color: c.avg_risk >= 60 ? 'var(--danger)' : c.avg_risk >= 40 ? 'var(--warning)' : 'var(--success)', fontVariantNumeric: 'tabular-nums' }}>{c.avg_risk.toFixed(1)}</td>
                    <td style={{ padding: '8px 8px', textAlign: 'right', color: 'var(--text-2)', fontVariantNumeric: 'tabular-nums' }}>₹{c.amount.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default Analytics;
