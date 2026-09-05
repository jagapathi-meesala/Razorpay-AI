import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import {
  Search, ChevronLeft, ChevronRight,
  SlidersHorizontal, ArrowUpDown
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

interface TransactionItem {
  id: string; customer_name: string; amount: number; currency: string;
  payment_method: string; customer_country: string; shipping_country: string;
  risk_score: number; risk_level: string; status: string; timestamp: string;
}

const getAIRec = (score: number): { text: string; color: string; bg: string; border: string } => {
  if (score >= 70) return { text: 'DECLINE', color: 'var(--danger)', bg: 'var(--danger-bg)', border: 'var(--danger-b)' };
  if (score >= 40) return { text: 'VERIFY', color: 'var(--warning)', bg: 'var(--warning-bg)', border: 'var(--warning-b)' };
  return { text: 'APPROVE', color: 'var(--success)', bg: 'var(--success-bg)', border: 'var(--success-b)' };
};

const RiskBadge: React.FC<{ level: string }> = ({ level }) => {
  const cfg: Record<string, [string, string, string]> = {
    'HIGH RISK':   ['var(--danger-bg)',  'var(--danger-b)',  'var(--danger)'],
    'MEDIUM RISK': ['var(--warning-bg)', 'var(--warning-b)', 'var(--warning)'],
    'LOW RISK':    ['var(--success-bg)', 'var(--success-b)', 'var(--success)'],
  };
  const [bg, border, color] = cfg[level] || ['var(--surface-3)', 'var(--border)', 'var(--text-2)'];
  return <span style={{ background: bg, border: `1px solid ${border}`, color, borderRadius: '4px', fontSize: '9px', fontWeight: 700, padding: '2px 7px', whiteSpace: 'nowrap' }}>{level}</span>;
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const cfg: Record<string, [string, string, string]> = {
    APPROVED:     ['var(--success-bg)',  'var(--success-b)',  'var(--success)'],
    DECLINED:     ['var(--danger-bg)',   'var(--danger-b)',   'var(--danger)'],
    UNDER_REVIEW: ['var(--warning-bg)', 'var(--warning-b)',  'var(--warning)'],
    PENDING:      ['var(--info-bg)',     'var(--info-b)',     'var(--info)'],
  };
  const [bg, border, color] = cfg[status] || ['var(--surface-3)', 'var(--border)', 'var(--text-2)'];
  const label = status === 'UNDER_REVIEW' ? 'REVIEW / VERIFY' : status;
  return <span style={{ background: bg, border: `1px solid ${border}`, color, borderRadius: '4px', fontSize: '9px', fontWeight: 700, padding: '2px 7px', whiteSpace: 'nowrap' }}>{label}</span>;
};

const Transactions: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [riskLevel, setRiskLevel] = useState(searchParams.get('risk_level') || '');
  const [status, setStatus] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [sortBy, setSortBy] = useState('timestamp');
  const [sortOrder, setSortOrder] = useState('desc');
  const [page, setPage] = useState(1);
  const limit = 20;

  const fetchTransactions = async () => {
    setIsLoading(true);
    try {
      const params: any = { offset: (page - 1) * limit, limit };
      if (search) params.search = search;
      if (riskLevel) params.risk_level = riskLevel;
      if (status) params.status = status;
      if (paymentMethod) params.payment_method = paymentMethod;
      if (minAmount) params.min_amount = parseFloat(minAmount);
      if (maxAmount) params.max_amount = parseFloat(maxAmount);
      params.sort_by = sortBy;
      params.sort_order = sortOrder;
      const res = await axios.get('/api/transactions', { params });
      setTransactions(res.data);
    } catch { /* silent */ }
    finally { setIsLoading(false); }
  };

  useEffect(() => {
    const s = searchParams.get('search');
    if (s !== null) setSearch(s);
    const r = searchParams.get('risk_level');
    if (r !== null) setRiskLevel(r);
  }, [searchParams]);

  useEffect(() => { fetchTransactions(); }, [page, riskLevel, status, paymentMethod, sortBy, sortOrder]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchTransactions();
  };

  const resetFilters = () => {
    setSearch(''); setRiskLevel(''); setStatus(''); setPaymentMethod('');
    setMinAmount(''); setMaxAmount(''); setSortBy('timestamp'); setSortOrder('desc'); setPage(1);
  };

  const toggleSort = (field: string) => {
    if (sortBy === field) setSortOrder(o => o === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setSortOrder('desc'); }
    setPage(1);
  };

  const SortIcon: React.FC<{ field: string }> = ({ field }) => (
    <ArrowUpDown size={10} style={{ opacity: sortBy === field ? 1 : 0.35, marginLeft: '4px', display: 'inline', verticalAlign: 'middle' }} />
  );

  const activeFilterCount = [riskLevel, status, paymentMethod, minAmount, maxAmount].filter(Boolean).length;

  return (
    <div className="animate-fade-in" style={{ padding: '28px 36px', maxWidth: '1400px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <h1 className="page-title">Transactions</h1>
        <p style={{ fontSize: '13px', color: 'var(--text-3)', marginTop: '4px' }}>Monitor and investigate transaction-level risk scores across all payment channels</p>
      </div>

      {/* Filter Bar */}
      <form onSubmit={handleSearch} style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: '1', minWidth: '220px', maxWidth: '360px' }}>
            <Search size={12} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-4)', pointerEvents: 'none' }} />
            <input
              type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by ID or customer..."
              style={{ width: '100%', padding: '8px 10px 8px 28px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '12px', color: 'var(--text-1)', outline: 'none' }}
              onFocus={(e) => { e.target.style.borderColor = 'var(--brand)'; e.target.style.boxShadow = '0 0 0 3px rgba(55,48,163,0.08)'; }}
              onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }}
            />
          </div>

          {/* Selects */}
          {[
            { val: riskLevel, set: setRiskLevel, opts: [['', 'All Risk Levels'], ['LOW RISK', 'Low Risk'], ['MEDIUM RISK', 'Medium Risk'], ['HIGH RISK', 'High Risk']] },
            { val: status, set: setStatus, opts: [['', 'All Statuses'], ['APPROVED', 'Approved'], ['DECLINED', 'Declined'], ['UNDER_REVIEW', 'Under Review'], ['PENDING', 'Pending']] },
            { val: paymentMethod, set: setPaymentMethod, opts: [['', 'All Methods'], ['credit_card', 'Credit Card'], ['debit_card', 'Debit Card'], ['upi', 'UPI'], ['net_banking', 'Net Banking']] },
            { val: `${sortBy}-${sortOrder}`, set: (v: string) => { const [f,o] = v.split('-'); setSortBy(f); setSortOrder(o); setPage(1); }, opts: [['timestamp-desc','Date: Newest'],['timestamp-asc','Date: Oldest'],['risk_score-desc','Risk: High→Low'],['risk_score-asc','Risk: Low→High'],['amount-desc','Amount: High→Low'],['amount-asc','Amount: Low→High']] },
          ].map(({ val, set, opts }, i) => (
            <select
              key={i} value={val} onChange={(e) => { (set as (v: string) => void)(e.target.value); if (i < 3) setPage(1); }}
              style={{ padding: '8px 10px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '12px', color: 'var(--text-1)', outline: 'none', cursor: 'pointer' }}
            >
              {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          ))}

          <div style={{ display: 'flex', gap: '6px', marginLeft: 'auto' }}>
            {activeFilterCount > 0 && (
              <button type="button" onClick={resetFilters} style={{ padding: '8px 12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '12px', fontWeight: 600, color: 'var(--text-2)', cursor: 'pointer' }}>
                Clear {activeFilterCount > 0 ? `(${activeFilterCount})` : ''}
              </button>
            )}
            <button type="submit" className="btn-primary">Search</button>
          </div>
        </div>
      </form>

      {/* Table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        {isLoading ? (
          <div>
            <div style={{ padding: '10px 16px', background: 'var(--surface-2)', borderBottom: '1px solid var(--border)', display: 'flex', gap: '24px' }}>
              {['240px','120px','100px','80px','80px','90px','80px','80px','80px','40px'].map((w,i) => <div key={i} className="skeleton" style={{ height: '14px', width: w }} />)}
            </div>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="skeleton-row" style={{ borderBottom: '1px solid var(--border)', padding: '12px 16px', display: 'flex', gap: '24px', alignItems: 'center' }}>
                {['200px','120px','90px','70px','80px','80px','80px','70px','60px','24px'].map((w,j) => <div key={j} className="skeleton" style={{ height: '12px', width: w }} />)}
              </div>
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center' }}>
            <SlidersHorizontal size={32} style={{ color: 'var(--text-4)', margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-1)', marginBottom: '6px' }}>No transactions found</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-3)', maxWidth: '280px', margin: '0 auto 16px' }}>Try expanding your search criteria or resetting the filters.</p>
            <button onClick={resetFilters} className="btn-secondary">Reset filters</button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: 'var(--surface-2)' }}>
                  <th onClick={() => toggleSort('id')} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, fontSize: '10px', color: 'var(--text-3)', letterSpacing: '0.06em', textTransform: 'uppercase', borderBottom: '1px solid var(--border)', cursor: 'pointer', whiteSpace: 'nowrap', userSelect: 'none' }}>Transaction <SortIcon field="id" /></th>
                  <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, fontSize: '10px', color: 'var(--text-3)', letterSpacing: '0.06em', textTransform: 'uppercase', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>Customer</th>
                  <th onClick={() => toggleSort('amount')} style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 600, fontSize: '10px', color: 'var(--text-3)', letterSpacing: '0.06em', textTransform: 'uppercase', borderBottom: '1px solid var(--border)', cursor: 'pointer', whiteSpace: 'nowrap', userSelect: 'none' }}>Amount <SortIcon field="amount" /></th>
                  <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, fontSize: '10px', color: 'var(--text-3)', letterSpacing: '0.06em', textTransform: 'uppercase', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>Method</th>
                  <th onClick={() => toggleSort('risk_score')} style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600, fontSize: '10px', color: 'var(--text-3)', letterSpacing: '0.06em', textTransform: 'uppercase', borderBottom: '1px solid var(--border)', cursor: 'pointer', whiteSpace: 'nowrap', userSelect: 'none' }}>Risk <SortIcon field="risk_score" /></th>
                  <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, fontSize: '10px', color: 'var(--text-3)', letterSpacing: '0.06em', textTransform: 'uppercase', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>Level</th>
                  <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, fontSize: '10px', color: 'var(--text-3)', letterSpacing: '0.06em', textTransform: 'uppercase', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>AI Rec</th>
                  <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, fontSize: '10px', color: 'var(--text-3)', letterSpacing: '0.06em', textTransform: 'uppercase', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>Status</th>
                  <th onClick={() => toggleSort('timestamp')} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, fontSize: '10px', color: 'var(--text-3)', letterSpacing: '0.06em', textTransform: 'uppercase', borderBottom: '1px solid var(--border)', cursor: 'pointer', whiteSpace: 'nowrap', userSelect: 'none' }}>Date <SortIcon field="timestamp" /></th>
                  <th style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 600, fontSize: '10px', color: 'var(--text-3)', letterSpacing: '0.06em', textTransform: 'uppercase', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((txn) => {
                  const rec = getAIRec(txn.risk_score);
                  return (
                    <tr
                      key={txn.id}
                      onClick={() => navigate(`/transactions/${txn.id}`)}
                      style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background 0.1s' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-2)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '12px 16px', fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', fontWeight: 700, color: 'var(--brand)' }}>{txn.id}</td>
                      <td style={{ padding: '12px 16px', fontWeight: 500, color: 'var(--text-1)', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{txn.customer_name}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: 'var(--text-1)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>₹{txn.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-3)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{txn.payment_method.replace(/_/g, ' ')}</td>
                      <td style={{ padding: '12px 12px', textAlign: 'center' }}>
                        <span style={{ fontWeight: 800, fontSize: '13px', fontVariantNumeric: 'tabular-nums', color: txn.risk_level === 'HIGH RISK' ? 'var(--danger)' : txn.risk_level === 'MEDIUM RISK' ? 'var(--warning)' : 'var(--success)' }}>{txn.risk_score}</span>
                      </td>
                      <td style={{ padding: '12px 16px' }}><RiskBadge level={txn.risk_level} /></td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ background: rec.bg, border: `1px solid ${rec.border}`, color: rec.color, borderRadius: '4px', fontSize: '9px', fontWeight: 700, padding: '2px 7px' }}>{rec.text}</span>
                      </td>
                      <td style={{ padding: '12px 16px' }}><StatusBadge status={txn.status} /></td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-4)', fontSize: '11px', whiteSpace: 'nowrap' }}>
                        {new Date(txn.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} {new Date(txn.timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <span style={{ 
                          color: txn.status === 'PENDING' ? 'var(--brand)' : 'var(--text-3)', 
                          fontWeight: 700, 
                          fontSize: '11px',
                          textDecoration: txn.status === 'PENDING' ? 'underline' : 'none'
                        }}>
                          {txn.status === 'PENDING' ? 'Review' : 'View'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {transactions.length > 0 && (
          <div style={{ padding: '12px 16px', background: 'var(--surface-2)', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>
              Page <strong style={{ color: 'var(--text-1)', fontWeight: 700 }}>{page}</strong> · {transactions.length} records shown
            </span>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '6px', cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.4 : 1, color: 'var(--text-3)' }}>
                <ChevronLeft size={14} />
              </button>
              <button onClick={() => setPage(p => p + 1)} disabled={transactions.length < limit} style={{ width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '6px', cursor: transactions.length < limit ? 'not-allowed' : 'pointer', opacity: transactions.length < limit ? 0.4 : 1, color: 'var(--text-3)' }}>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Transactions;
