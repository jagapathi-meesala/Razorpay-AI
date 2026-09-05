import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Bell, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

interface AlertItem {
  type: 'transaction' | 'chargeback';
  id: string;
  title: string;
  message: string;
  timestamp: string;
  severity: string;
}

const Header: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const res = await axios.get('/api/dashboard/alerts');
        setAlerts(res.data.alerts || []);
      } catch { /* silent */ }
    };
    fetchAlerts();
    const iv = setInterval(fetchAlerts, 30000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        (document.getElementById('global-search') as HTMLInputElement)?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleSearch = async (q: string) => {
    setSearchQuery(q);
    if (q.length < 2) { setSearchResults([]); setShowSuggestions(false); return; }
    try {
      const res = await axios.get('/api/transactions', { params: { search: q, limit: 5 } });
      setSearchResults(res.data || []);
      setShowSuggestions(true);
    } catch { setSearchResults([]); }
  };

  const handleSelect = (id: string) => {
    setShowSuggestions(false);
    setSearchQuery('');
    navigate(`/transactions/${id}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (searchResults.length > 0) {
        handleSelect(searchResults[0].id);
      } else if (searchQuery.trim()) {
        const raw = searchQuery.trim().toUpperCase();
        const targetId = raw.startsWith('TXN-') ? raw : `TXN-${raw}`;
        handleSelect(targetId);
      }
    }
  };

  const highAlerts = alerts.filter(a => a.severity === 'HIGH' || a.severity === 'high');

  return (
    <header style={{
      height: '56px',
      background: 'var(--surface)',
      borderBottom: '1px solid var(--border)',
      display: 'flex', alignItems: 'center',
      padding: '0 24px', gap: '16px', position: 'sticky', top: 0, zIndex: 10,
      boxShadow: 'var(--shadow-xs)'
    }}>

      {/* Search */}
      <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
        <Search size={13} style={{
          position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)',
          color: 'var(--text-4)', pointerEvents: 'none'
        }} />
        <input
          id="global-search"
          type="text"
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          placeholder="Search transactions... (Ctrl K)"
          style={{
            width: '100%',
            padding: '7px 10px 7px 30px',
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            fontSize: '12px',
            color: 'var(--text-1)',
            outline: 'none',
            transition: 'border-color 0.15s, box-shadow 0.15s'
          }}
          onFocus={(e) => {
            e.target.style.borderColor = 'var(--brand)';
            e.target.style.boxShadow = '0 0 0 3px rgba(55,48,163,0.08)';
          }}
          onBlurCapture={(e) => {
            e.target.style.borderColor = 'var(--border)';
            e.target.style.boxShadow = 'none';
          }}
        />
        {showSuggestions && searchResults.length > 0 && (
          <div style={{
            position: 'absolute', top: '100%', left: 0, right: 0,
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: '8px', marginTop: '4px', boxShadow: 'var(--shadow-md)',
            zIndex: 50, overflow: 'hidden'
          }}>
            {searchResults.map((txn) => (
              <button
                key={txn.id}
                onMouseDown={() => handleSelect(txn.id)}
                style={{
                  width: '100%', textAlign: 'left', padding: '10px 14px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  borderBottom: '1px solid var(--border)', background: 'none',
                  cursor: 'pointer', transition: 'background 0.1s'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-2)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
              >
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-1)' }}>{txn.id}</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-3)' }}>{txn.customer_name} · ₹{txn.amount?.toLocaleString()}</div>
                </div>
                <span style={{
                  fontSize: '9px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px',
                  background: txn.risk_level === 'HIGH RISK' ? 'var(--danger-bg)' : txn.risk_level === 'MEDIUM RISK' ? 'var(--warning-bg)' : 'var(--success-bg)',
                  color: txn.risk_level === 'HIGH RISK' ? 'var(--danger)' : txn.risk_level === 'MEDIUM RISK' ? 'var(--warning)' : 'var(--success)',
                  border: `1px solid ${txn.risk_level === 'HIGH RISK' ? 'var(--danger-b)' : txn.risk_level === 'MEDIUM RISK' ? 'var(--warning-b)' : 'var(--success-b)'}`,
                }}>
                  {txn.risk_score}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div style={{ flex: 1 }} />

      {/* Notifications */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setShowNotifications(v => !v)}
          style={{
            position: 'relative', width: '36px', height: '36px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: '8px', border: '1px solid var(--border)',
            background: 'var(--surface-2)', cursor: 'pointer',
            color: 'var(--text-3)', transition: 'background 0.15s'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-3)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--surface-2)')}
        >
          <Bell size={15} />
          {highAlerts.length > 0 && (
            <span style={{
              position: 'absolute', top: '6px', right: '6px',
              width: '6px', height: '6px', borderRadius: '50%',
              background: 'var(--danger)', border: '1.5px solid var(--surface)'
            }} />
          )}
        </button>

        {showNotifications && (
          <div style={{
            position: 'absolute', top: '44px', right: 0,
            width: '340px', background: 'var(--surface)',
            border: '1px solid var(--border)', borderRadius: '10px',
            boxShadow: 'var(--shadow-lg)', zIndex: 50, overflow: 'hidden'
          }} className="animate-slide-down">
            <div style={{
              padding: '12px 16px', borderBottom: '1px solid var(--border)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-1)' }}>Alerts</span>
              <button onClick={() => setShowNotifications(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: '2px' }}>
                <X size={14} />
              </button>
            </div>
            {alerts.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-4)', fontSize: '12px' }}>
                No active alerts
              </div>
            ) : (
              <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
                {alerts.slice(0, 8).map((alert, i) => (
                  <div
                    key={i}
                    onClick={() => { navigate(`/transactions/${alert.id}`); setShowNotifications(false); }}
                    style={{
                      padding: '12px 16px', borderBottom: '1px solid var(--border)',
                      cursor: 'pointer', transition: 'background 0.1s'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-2)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                      <div>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-1)' }}>{alert.title}</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-3)', marginTop: '2px' }}>{alert.message}</div>
                      </div>
                      <span style={{
                        fontSize: '8px', fontWeight: 700, padding: '2px 6px',
                        borderRadius: '4px', flexShrink: 0,
                        background: alert.severity === 'HIGH' || alert.severity === 'high' ? 'var(--danger-bg)' : 'var(--warning-bg)',
                        color: alert.severity === 'HIGH' || alert.severity === 'high' ? 'var(--danger)' : 'var(--warning)',
                        border: `1px solid ${alert.severity === 'HIGH' || alert.severity === 'high' ? 'var(--danger-b)' : 'var(--warning-b)'}`,
                        textTransform: 'uppercase', letterSpacing: '0.04em'
                      }}>
                        {alert.severity}
                      </span>
                    </div>
                    <div style={{ fontSize: '9px', color: 'var(--text-4)', marginTop: '4px' }}>
                      {new Date(alert.timestamp).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* User chip */}
      {user && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '6px 10px', background: 'var(--surface-2)',
          border: '1px solid var(--border)', borderRadius: '8px'
        }}>
          <div style={{
            width: '24px', height: '24px', borderRadius: '6px',
            background: 'var(--brand-light)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', color: 'var(--brand)'
          }}>
            <span style={{ fontSize: '10px', fontWeight: 800 }}>
              {user.username.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-1)', lineHeight: 1.2 }}>{user.username}</div>
            <div style={{ fontSize: '8px', fontWeight: 600, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{user.role}</div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
