import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Receipt,
  ShieldAlert,
  BarChart3,
  Cpu,
  History,
  LogOut,
  Shield,
  UserCheck,
  Settings,
  Activity
} from 'lucide-react';

const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();

  const groups = [
    {
      label: 'Operations',
      items: [
        { name: 'Dashboard',     path: '/',             icon: LayoutDashboard, end: true },
        { name: 'Transactions',  path: '/transactions', icon: Receipt },
        { name: 'Risk Alerts',   path: '/chargebacks',  icon: ShieldAlert },
      ],
    },
    {
      label: 'Intelligence',
      items: [
        { name: 'Risk Analysis',      path: '/predict',           icon: Cpu },
        { name: 'Model Performance',  path: '/model-performance', icon: Activity },
        { name: 'Analytics',          path: '/analytics',         icon: BarChart3 },
        { name: 'Audit Log',          path: '/audit-log',         icon: History },
      ],
    },
    {
      label: 'System',
      items: [
        { name: 'Settings', path: '/settings', icon: Settings },
      ],
    },
  ];

  return (
    <aside
      style={{
        width: '244px',
        background: 'var(--surface)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        position: 'sticky',
        top: 0,
        flexShrink: 0,
        zIndex: 20,
      }}
    >
      {/* Brand */}
      <div style={{ padding: '18px 16px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '8px',
            background: 'var(--brand)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', color: '#fff', flexShrink: 0
          }}>
            <Shield size={16} />
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-1)', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
              RAZOR PAY
            </div>
            <div style={{ fontSize: '9px', fontWeight: 600, color: 'var(--text-4)', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: '1px' }}>
              Risk Intelligence
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '14px 10px' }}>
        {groups.map((group) => (
          <div key={group.label} style={{ marginBottom: '20px' }}>
            <div style={{
              fontSize: '10px', fontWeight: 700, color: 'var(--text-4)',
              letterSpacing: '0.08em', textTransform: 'uppercase',
              padding: '0 10px', marginBottom: '6px'
            }}>
              {group.label}
            </div>
            {group.items.map((item) => (
              <NavLink
                key={item.name}
                to={item.path}
                end={(item as any).end}
                style={{ textDecoration: 'none' }}
              >
                {({ isActive }) => (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '9px 12px', borderRadius: '7px', marginBottom: '2px',
                    fontSize: '13px', fontWeight: isActive ? 600 : 500,
                    color: isActive ? 'var(--brand)' : 'var(--text-3)',
                    background: isActive ? 'var(--brand-light)' : 'transparent',
                    borderLeft: isActive ? '2.5px solid var(--brand)' : '2.5px solid transparent',
                    transition: 'all 0.15s ease',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      (e.currentTarget as HTMLDivElement).style.background = 'var(--surface-2)';
                      (e.currentTarget as HTMLDivElement).style.color = 'var(--text-1)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      (e.currentTarget as HTMLDivElement).style.background = 'transparent';
                      (e.currentTarget as HTMLDivElement).style.color = 'var(--text-3)';
                    }
                  }}
                  >
                    <item.icon size={16} style={{ flexShrink: 0, opacity: isActive ? 1 : 0.7 }} />
                    {item.name}
                  </div>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* User */}
      <div style={{ padding: '8px', borderTop: '1px solid var(--border)' }}>
        {user && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '8px 10px', background: 'var(--surface-2)',
            border: '1px solid var(--border)', borderRadius: '6px',
            marginBottom: '6px'
          }}>
            <div style={{
              width: '28px', height: '28px', borderRadius: '6px',
              background: 'var(--brand-light)', display: 'flex',
              alignItems: 'center', justifyContent: 'center', color: 'var(--brand)', flexShrink: 0
            }}>
              <UserCheck size={13} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.username}
              </div>
              <div style={{
                display: 'inline-block', marginTop: '2px', padding: '1px 6px', borderRadius: '4px',
                fontSize: '9px', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase',
                background: user.role === 'ADMIN' ? '#f3e8ff' : user.role === 'ANALYST' ? '#dbeafe' : '#f1f5f9',
                color: user.role === 'ADMIN' ? '#6b21a8' : user.role === 'ANALYST' ? '#1e40af' : '#475569',
                border: `1px solid ${user.role === 'ADMIN' ? '#e9d5ff' : user.role === 'ANALYST' ? '#bfdbfe' : '#e2e8f0'}`
              }}>
                {user.role}
              </div>
            </div>
          </div>
        )}
        <button
          onClick={logout}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: '6px', padding: '7px', borderRadius: '6px', fontSize: '11px', fontWeight: 600,
            color: 'var(--danger)', background: 'transparent',
            border: '1px solid var(--danger-b)', cursor: 'pointer',
            transition: 'background 0.15s'
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--danger-bg)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
        >
          <LogOut size={12} />
          Sign Out
        </button>
      </div>

      <style>{`
        @keyframes ping {
          75%, 100% { transform: scale(2); opacity: 0; }
        }
      `}</style>
    </aside>
  );
};

export default Sidebar;
