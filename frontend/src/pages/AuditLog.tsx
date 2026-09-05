import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ShieldCheck, Filter } from 'lucide-react';

interface AuditLogItem {
  id: number; timestamp: string; actor: string; action: string;
  entity: string; entity_id: string;
  previous_state: string | null; new_state: string | null; reason: string | null;
}

const getActionStyle = (action: string): [string, string, string] => {
  if (action.includes('APPROVE') || action.includes('ALLOW') || action.includes('MARK_SAFE'))
    return ['var(--success-bg)', 'var(--success-b)', 'var(--success)'];
  if (action.includes('DECLINE') || action.includes('BLOCK') || action.includes('REJECT'))
    return ['var(--danger-bg)', 'var(--danger-b)', 'var(--danger)'];
  if (action.includes('VERIFY') || action.includes('REVIEW') || action.includes('ESCALATE'))
    return ['var(--warning-bg)', 'var(--warning-b)', 'var(--warning)'];
  if (action.includes('OVERRIDE'))
    return ['var(--info-bg)', 'var(--info-b)', 'var(--info)'];
  return ['var(--surface-3)', 'var(--border)', 'var(--text-3)'];
};

const formatState = (stateStr: string | null) => {
  if (!stateStr) return '—';
  try {
    if (stateStr.startsWith('{')) {
      const parsed = JSON.parse(stateStr);
      if (parsed && typeof parsed === 'object' && parsed.status) {
        return parsed.status;
      }
    }
  } catch (e) {
    // Ignore and fallback
  }
  return stateStr;
};

const AuditLog: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterActor, setFilterActor] = useState('');
  const [filterAction, setFilterAction] = useState('');

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await axios.get('/api/audit');
        setLogs(res.data);
      } catch { /* silent */ }
      finally { setIsLoading(false); }
    };
    fetch();
  }, []);

  // Filter out login/register actions from showing in the audit log
  const displayLogs = logs.filter(l => !l.action.startsWith('USER_'));

  // Exclude system process engines from the "All Users" selection dropdown
  const systemActors = ['ML-ENGINE', 'ROUTING-ENGINE', 'AUTO-CLASSIFIER'];
  const actors = Array.from(new Set(displayLogs.map(l => l.actor).filter(a => !systemActors.includes(a)))).sort();

  const filtered = displayLogs.filter(l => {
    if (filterActor && l.actor !== filterActor) return false;
    if (filterAction && !l.action.includes(filterAction.toUpperCase())) return false;
    return true;
  });

  return (
    <div className="animate-fade-in" style={{ padding: '28px 36px', maxWidth: '1400px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <h1 className="page-title">Audit Log</h1>
        <p style={{ fontSize: '13px', color: 'var(--text-3)', marginTop: '4px' }}>Persistent record of analyst decisions, overrides, and system actions</p>
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
        <Filter size={13} style={{ color: 'var(--text-4)' }} />
        <select
          value={filterActor} onChange={(e) => setFilterActor(e.target.value)}
          style={{ padding: '7px 10px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '12px', color: 'var(--text-1)', outline: 'none' }}
        >
          <option value="">All Users</option>
          {actors.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <select
          value={filterAction} onChange={(e) => setFilterAction(e.target.value)}
          style={{ padding: '7px 10px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '12px', color: 'var(--text-1)', outline: 'none' }}
        >
          <option value="">All Actions</option>
          <option value="APPROVE">Approvals</option>
          <option value="DECLINE">Declines</option>
          <option value="VERIFY">Verifications</option>
          <option value="OVERRIDE">Overrides</option>
          <option value="ESCALATE">Escalations</option>
        </select>
        {(filterActor || filterAction) && (
          <button onClick={() => { setFilterActor(''); setFilterAction(''); }} style={{ padding: '7px 12px', background: 'none', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '12px', fontWeight: 600, color: 'var(--text-3)', cursor: 'pointer' }}>
            Clear filters
          </button>
        )}
        <span style={{ fontSize: '11px', color: 'var(--text-4)', marginLeft: 'auto' }}>{filtered.length} records</span>
      </div>

      {/* Table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        {isLoading ? (
          <div>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', gap: '16px', alignItems: 'center' }}>
                {['140px','100px','160px','120px','80px','120px'].map((w, j) => <div key={j} className="skeleton" style={{ height: '12px', width: w }} />)}
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center' }}>
            <ShieldCheck size={32} style={{ color: 'var(--text-4)', margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-1)', marginBottom: '6px' }}>No audit records found</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-3)' }}>Adjust your filters or check back after analyst actions are performed.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: 'var(--surface-2)' }}>
                  {['Timestamp', 'User', 'Action', 'Transaction', 'Status Change', 'Notes'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, fontSize: '10px', color: 'var(--text-3)', letterSpacing: '0.06em', textTransform: 'uppercase', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((log) => {
                  const [abg, aborder, acolor] = getActionStyle(log.action);
                  return (
                    <tr
                      key={log.id}
                      style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.1s' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-2)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '12px 16px', fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: 'var(--text-3)', whiteSpace: 'nowrap' }}>
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-1)', whiteSpace: 'nowrap' }}>{log.actor}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ background: abg, border: `1px solid ${aborder}`, color: acolor, borderRadius: '4px', fontSize: '9px', fontWeight: 700, padding: '2px 7px', whiteSpace: 'nowrap' }}>
                          {log.action.replace('TRANSACTION_', '')}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', fontWeight: 700, color: 'var(--brand)', whiteSpace: 'nowrap' }}>
                        {log.entity_id}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '11px', whiteSpace: 'nowrap' }}>
                        {log.previous_state && log.new_state ? (
                          <span style={{ color: 'var(--text-3)' }}>
                            <span style={{ color: 'var(--danger)', fontWeight: 600 }}>{formatState(log.previous_state)}</span>
                            {' → '}
                            <span style={{ color: 'var(--success)', fontWeight: 600 }}>{formatState(log.new_state)}</span>
                          </span>
                        ) : <span style={{ color: 'var(--text-4)' }}>—</span>}
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-3)', fontSize: '11px', fontStyle: log.reason ? 'normal' : 'italic', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {log.reason || '—'}
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

export default AuditLog;
