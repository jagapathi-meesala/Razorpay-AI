import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, Eye, EyeOff, AlertCircle, UserPlus, LogIn, CheckCircle, ShieldCheck, Zap, Bot, ArrowRight } from 'lucide-react';
import axios from 'axios';

const Login: React.FC = () => {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loginTab, setLoginTab] = useState<'ANALYST' | 'ADMIN'>('ANALYST');
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [showDemoCreds, setShowDemoCreds] = useState(false);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  const DEMO_ADMIN_EMAIL = import.meta.env.VITE_DEMO_ADMIN_EMAIL || 'admin@riskshield.ai';
  const DEMO_ADMIN_PASSWORD = import.meta.env.VITE_DEMO_ADMIN_PASSWORD || 'password123';

  const handleCopy = (text: string, label: string) => {
    try {
      navigator.clipboard.writeText(text);
      setCopyStatus(label);
      setTimeout(() => setCopyStatus(null), 2000);
    } catch {}
  };

  useEffect(() => {
    if (isAuthenticated) {
      const from = location.state?.from?.pathname || '/';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const cleanUsername = username.trim();
    const cleanPassword = password.trim();
    const cleanEmail = email.trim();

    if (!cleanUsername || !cleanPassword || (isRegister && !cleanEmail)) {
      setError('Please fill in all required fields.');
      return;
    }

    setIsLoading(true);
    try {
      if (isRegister) {
        try {
          await axios.post('/api/auth/register', {
            username: cleanUsername,
            email: cleanEmail,
            password: cleanPassword
          });
          setSuccessMsg('Analyst account created successfully! Logging you in...');
        } catch (regErr: any) {
          const detail = regErr.response?.data?.detail;
          if (detail && typeof detail === 'string') {
            setError(detail);
          } else if (Array.isArray(detail)) {
            setError(detail.map((d: any) => d.msg).join(', '));
          } else {
            setError('Registration failed. The username or email may already be registered.');
          }
          setIsLoading(false);
          return;
        }
      }

      // Determine login endpoint based on active tab
      // Admin Login tab calls /api/auth/admin-login which strictly checks user.role == 'ADMIN' in DB
      const loginEndpoint = (loginTab === 'ADMIN' && !isRegister) 
        ? '/api/auth/admin-login' 
        : '/api/auth/login';

      const res = await axios.post(loginEndpoint, {
        username: cleanUsername,
        password: cleanPassword
      });

      const { access_token, username: uname, role: urole } = res.data;
      login(access_token, uname || cleanUsername, urole);
    } catch (err: any) {
      if (err.response?.status === 403) {
        setError(err.response.data?.detail || 'Admin access required for this account.');
      } else if (err.response?.data?.detail) {
        const detail = err.response.data.detail;
        if (typeof detail === 'string') {
          setError(detail);
        } else if (Array.isArray(detail)) {
          const messages = detail.map((d: any) => d.msg).join(', ');
          setError(messages);
        } else {
          setError(JSON.stringify(detail));
        }
      } else {
        setError(loginTab === 'ADMIN' ? 'Incorrect admin email/username or password.' : 'Incorrect username or password.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="login-container"
      style={{
        minHeight: '100vh',
        width: '100vw',
        display: 'flex',
        flexDirection: 'row',
        background: 'linear-gradient(135deg, #f8fafc 0%, #edf2f7 50%, #e2e8f0 100%)',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        color: '#0f172a',
        position: 'relative',
        overflowX: 'hidden'
      }}
    >
      {/* Light Background Mesh Accents */}
      <div style={{
        position: 'absolute', top: '-15%', right: '-10%', width: '700px', height: '700px',
        background: 'radial-gradient(circle, rgba(59, 130, 246, 0.12) 0%, rgba(255, 255, 255, 0) 70%)',
        filter: 'blur(60px)', pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute', bottom: '-15%', right: '20%', width: '700px', height: '700px',
        background: 'radial-gradient(circle, rgba(99, 102, 241, 0.1) 0%, rgba(255, 255, 255, 0) 70%)',
        filter: 'blur(60px)', pointerEvents: 'none'
      }} />

      {/* LEFT SIDEBAR BRAND PANEL */}
      <div 
        className="left-brand-panel"
        style={{
          width: '400px',
          minWidth: '340px',
          maxWidth: '440px',
          minHeight: '100vh',
          background: 'linear-gradient(160deg, #1e3a8a 0%, #1e1b4b 100%)',
          color: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '52px 40px',
          position: 'relative',
          zIndex: 2,
          boxShadow: '10px 0 30px rgba(0, 0, 0, 0.08)'
        }}
      >
        <div>
          {/* Brand Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '44px' }}>
            <div style={{
              width: '46px', height: '46px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
              borderRadius: '12px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(59, 130, 246, 0.35)'
            }}>
              <Shield size={26} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                RiskShield AI
              </div>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#93c5fd', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: '2px' }}>
                RAZOR PAY ENTERPRISE RISK PLATFORM
              </div>
            </div>
          </div>

          {/* AI Badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            padding: '6px 14px', borderRadius: '20px',
            background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)',
            fontSize: '12px', fontWeight: 600, color: '#e0e7ff', marginBottom: '28px'
          }}>
            <Bot size={15} color="#60a5fa" />
            <span>AI Risk Monitor Operational</span>
          </div>

          <h2 style={{
            fontSize: '32px', fontWeight: 800, color: '#ffffff', lineHeight: 1.25,
            letterSpacing: '-0.03em', marginBottom: '18px'
          }}>
            Intelligent Payment<br />
            <span style={{
              background: 'linear-gradient(135deg, #60a5fa 0%, #a78bfa 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
            }}>Fraud Protection</span>
          </h2>

          <p style={{ fontSize: '14px', color: '#cbd5e1', lineHeight: 1.7, marginBottom: '36px' }}>
            Real-time machine learning risk scoring, automated dispute resolution, and audit log tracking built for modern payment teams.
          </p>
        </div>

        {/* Bullet Points */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
          {[
            { label: '94.97% Classification Accuracy', icon: ShieldCheck },
            { label: 'Real-Time Feature Explainability', icon: Zap },
            { label: 'Automated Chargeback Evidence Pack', icon: CheckCircle }
          ].map((item, idx) => {
            const IconC = item.icon;
            return (
              <div key={idx} style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '13px 16px', background: 'rgba(255, 255, 255, 0.07)',
                border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '12px'
              }}>
                <IconC size={18} color="#60a5fa" />
                <span style={{ fontSize: '13.5px', color: '#f1f5f9', fontWeight: 600 }}>{item.label}</span>
              </div>
            );
          })}
        </div>

        <div style={{ fontSize: '12px', color: '#94a3b8' }}>
          Protected by Enterprise-grade Encryption
        </div>
      </div>

      {/* RIGHT MAIN PANEL */}
      <div 
        className="right-form-panel"
        style={{
          flex: 1,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 24px',
          zIndex: 2,
          overflowY: 'auto'
        }}
      >
        <div style={{
          width: '100%',
          maxWidth: '460px',
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '22px',
          padding: '40px 36px',
          boxShadow: '0 20px 45px -15px rgba(0, 0, 0, 0.08), 0 0 1px rgba(0, 0, 0, 0.1)'
        }}>
          
          {/* SECTION 1: ENTRY OPTIONS (Analyst Login vs Admin Login) */}
          {!isRegister && (
            <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '12px', marginBottom: '28px' }}>
              <button
                type="button"
                onClick={() => { setLoginTab('ANALYST'); setError(null); setSuccessMsg(null); }}
                style={{
                  flex: 1, padding: '10px', borderRadius: '8px', border: 'none',
                  background: loginTab === 'ANALYST' ? '#ffffff' : 'transparent',
                  color: loginTab === 'ANALYST' ? '#2563eb' : '#64748b',
                  fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                  boxShadow: loginTab === 'ANALYST' ? '0 2px 6px rgba(0, 0, 0, 0.06)' : 'none',
                  transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                }}
              >
                <span>Analyst Login</span>
              </button>
              <button
                type="button"
                onClick={() => { setLoginTab('ADMIN'); setError(null); setSuccessMsg(null); }}
                style={{
                  flex: 1, padding: '10px', borderRadius: '8px', border: 'none',
                  background: loginTab === 'ADMIN' ? '#312e81' : 'transparent',
                  color: loginTab === 'ADMIN' ? '#ffffff' : '#64748b',
                  fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                  boxShadow: loginTab === 'ADMIN' ? '0 2px 8px rgba(49, 46, 129, 0.25)' : 'none',
                  transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                }}
              >
                <Shield size={14} color={loginTab === 'ADMIN' ? '#a5b4fc' : '#64748b'} />
                <span>Admin Login</span>
              </button>
            </div>
          )}

          {/* Form Header */}
          <div style={{ marginBottom: '24px' }}>
            <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', marginBottom: '6px' }}>
              {isRegister ? 'Create Analyst Profile' : (loginTab === 'ADMIN' ? 'Administrator Sign In' : 'Risk Analyst Sign In')}
            </h1>
            <p style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.5 }}>
              {isRegister 
                ? 'Fill in your credentials to create a new Risk Analyst profile.' 
                : (loginTab === 'ADMIN' 
                    ? 'Enter your system administrator credentials to access admin configuration.' 
                    : 'Enter your credentials to log in to the risk review console.')}
            </p>
          </div>

          {/* Dedicated Admin Portal Notice Badge */}
          {loginTab === 'ADMIN' && !isRegister && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px',
              background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: '10px',
              fontSize: '12px', color: '#5b21b6', marginBottom: '20px', fontWeight: 600
            }}>
              <Shield size={16} color="#7c3aed" style={{ flexShrink: 0 }} />
              <span>Dedicated Admin Authentication (Server-Verified Role Required)</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', letterSpacing: '0.05em', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>
                {loginTab === 'ADMIN' && !isRegister ? 'Admin Email or Username' : 'Username or Email'}
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => { setUsername(e.target.value); setError(null); }}
                placeholder={isRegister ? "Choose username" : (loginTab === 'ADMIN' ? "admin@riskshield.ai or admin" : "Enter username or email")}
                required
                style={{
                  width: '100%', padding: '12px 14px', background: '#f8fafc',
                  border: '1px solid #cbd5e1', borderRadius: '10px',
                  fontSize: '14px', color: '#0f172a', outline: 'none', transition: 'all 0.15s ease'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = loginTab === 'ADMIN' ? '#4f46e5' : '#2563eb';
                  e.target.style.background = '#ffffff';
                  e.target.style.boxShadow = loginTab === 'ADMIN' ? '0 0 0 3px rgba(79, 70, 229, 0.12)' : '0 0 0 3px rgba(37, 99, 235, 0.12)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#cbd5e1';
                  e.target.style.background = '#f8fafc';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>

            {isRegister && (
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', letterSpacing: '0.05em', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(null); }}
                  placeholder="analyst@riskshield.ai"
                  required
                  style={{
                    width: '100%', padding: '12px 14px', background: '#f8fafc',
                    border: '1px solid #cbd5e1', borderRadius: '10px',
                    fontSize: '14px', color: '#0f172a', outline: 'none', transition: 'all 0.15s ease'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#2563eb';
                    e.target.style.background = '#ffffff';
                    e.target.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.12)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#cbd5e1';
                    e.target.style.background = '#f8fafc';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>
            )}

            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', letterSpacing: '0.05em', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>
                {loginTab === 'ADMIN' && !isRegister ? 'Admin Password' : 'Password'}
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(null); }}
                  placeholder="Enter password"
                  required
                  style={{
                    width: '100%', padding: '12px 42px 12px 14px', background: '#f8fafc',
                    border: '1px solid #cbd5e1', borderRadius: '10px',
                    fontSize: '14px', color: '#0f172a', outline: 'none', transition: 'all 0.15s ease'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = loginTab === 'ADMIN' ? '#4f46e5' : '#2563eb';
                    e.target.style.background = '#ffffff';
                    e.target.style.boxShadow = loginTab === 'ADMIN' ? '0 0 0 3px rgba(79, 70, 229, 0.12)' : '0 0 0 3px rgba(37, 99, 235, 0.12)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#cbd5e1';
                    e.target.style.background = '#f8fafc';
                    e.target.style.boxShadow = 'none';
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {isRegister && (
              <div style={{
                padding: '10px 12px', background: '#eff6ff', border: '1px solid #bfdbfe',
                borderRadius: '8px', fontSize: '12px', color: '#1e40af'
              }}>
                ℹ️ Standard public registration creates a <strong>Risk Analyst (ANALYST)</strong> account. Administrative privileges must be granted by an existing System Administrator.
              </div>
            )}

            {error && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 14px',
                background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px',
                fontSize: '13px', color: '#991b1b'
              }}>
                <AlertCircle size={16} color="#dc2626" style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 14px',
                background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px',
                fontSize: '13px', color: '#166534'
              }}>
                <CheckCircle size={16} color="#16a34a" style={{ flexShrink: 0 }} />
                <span>{successMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: '100%', padding: '14px',
                background: loginTab === 'ADMIN' && !isRegister
                  ? 'linear-gradient(135deg, #3730a3 0%, #1e1b4b 100%)'
                  : 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)',
                color: '#ffffff', border: 'none', borderRadius: '10px',
                fontSize: '14px', fontWeight: 700, cursor: isLoading ? 'not-allowed' : 'pointer',
                boxShadow: loginTab === 'ADMIN' && !isRegister ? '0 4px 14px rgba(55, 48, 163, 0.35)' : '0 4px 14px rgba(37, 99, 235, 0.3)',
                transition: 'all 0.15s ease',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                marginTop: '6px'
              }}
            >
              {isLoading ? (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: 'spin 1s linear infinite' }}>
                    <path d="M21 12a9 9 0 11-6.219-8.56" />
                  </svg>
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  {isRegister ? <UserPlus size={16} /> : (loginTab === 'ADMIN' ? <Shield size={16} /> : <LogIn size={16} />)}
                  <span>
                    {isRegister 
                      ? 'Register Analyst Account' 
                      : (loginTab === 'ADMIN' ? 'Sign In as Administrator' : 'Sign In as Analyst')}
                  </span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* SECTION 2: JUDGE / DEMO ACCESS (Dedicated Demo Admin Account Display) */}
          {loginTab === 'ADMIN' && !isRegister && (
            <div style={{
              marginTop: '22px', paddingTop: '20px', borderTop: '1px solid #e2e8f0',
              display: 'flex', flexDirection: 'column', gap: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Bot size={14} color="#4f46e5" />
                  <span>Judge / Demo Access</span>
                </div>
                <span style={{
                  fontSize: '10px', fontWeight: 700, color: '#15803d', background: '#f0fdf4',
                  padding: '3px 9px', borderRadius: '12px', border: '1px solid #bbf7d0',
                  display: 'flex', alignItems: 'center', gap: '5px'
                }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 6px #22c55e' }} />
                  Verified Demo Account
                </span>
              </div>

              <div style={{
                background: 'linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%)',
                border: '1px solid #c7d2fe', borderRadius: '14px',
                padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px',
                boxShadow: '0 4px 14px rgba(79, 70, 229, 0.06)'
              }}>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#1e1b4b', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Shield size={15} color="#4f46e5" />
                    <span>Demo Administrator Profile</span>
                  </div>
                  <span style={{ fontSize: '10.5px', color: '#6366f1', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>ROLE: ADMIN</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '9px', fontSize: '12.5px', color: '#334155' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ffffff', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e0e7ff' }}>
                    <span><strong>Email:</strong> <code style={{ background: '#eef2ff', padding: '2px 6px', borderRadius: '4px', color: '#1e40af', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>{DEMO_ADMIN_EMAIL}</code></span>
                    <button
                      type="button"
                      onClick={() => handleCopy(DEMO_ADMIN_EMAIL, 'email')}
                      style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '11.5px', fontWeight: 700, cursor: 'pointer' }}
                    >
                      {copyStatus === 'email' ? '✓ Copied' : 'Copy Email'}
                    </button>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ffffff', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e0e7ff' }}>
                    <span>
                      <strong>Password:</strong>{' '}
                      <code style={{ background: '#eef2ff', padding: '2px 6px', borderRadius: '4px', color: '#1e40af', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>
                        {showDemoCreds ? DEMO_ADMIN_PASSWORD : '••••••••••••'}
                      </code>
                    </span>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button
                        type="button"
                        onClick={() => setShowDemoCreds(v => !v)}
                        style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '11.5px', fontWeight: 600, cursor: 'pointer' }}
                      >
                        {showDemoCreds ? 'Hide' : 'Show'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCopy(DEMO_ADMIN_PASSWORD, 'password')}
                        style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '11.5px', fontWeight: 700, cursor: 'pointer' }}
                      >
                        {copyStatus === 'password' ? '✓ Copied' : 'Copy Password'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Master Copy & Autofill Action Row */}
                <div style={{ display: 'flex', gap: '8px', marginTop: '2px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setUsername(DEMO_ADMIN_EMAIL);
                      setPassword(DEMO_ADMIN_PASSWORD);
                    }}
                    style={{
                      flex: 1, padding: '9px', background: '#eef2ff', border: '1px solid #c7d2fe',
                      borderRadius: '8px', fontSize: '12px', fontWeight: 700, color: '#3730a3',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    ⚡ Auto-Fill Form
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCopy(`Email: ${DEMO_ADMIN_EMAIL}\nPassword: ${DEMO_ADMIN_PASSWORD}`, 'all')}
                    style={{
                      flex: 1, padding: '9px', background: '#ffffff', border: '1px solid #cbd5e1',
                      borderRadius: '8px', fontSize: '12px', fontWeight: 700, color: '#1e293b',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.04)', transition: 'all 0.15s ease'
                    }}
                  >
                    {copyStatus === 'all' ? '✓ Copied All' : '📋 Copy Credentials'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Toggle Registration link for Analysts */}
          <div style={{ marginTop: '24px', textAlign: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '18px' }}>
            {isRegister ? (
              <button
                type="button"
                onClick={() => { setIsRegister(false); setError(null); setSuccessMsg(null); }}
                style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
              >
                ← Back to Analyst Sign In
              </button>
            ) : (
              <button
                type="button"
                onClick={() => { setIsRegister(true); setError(null); setSuccessMsg(null); }}
                style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '12.5px', cursor: 'pointer' }}
              >
                Need an analyst account? <span style={{ color: '#2563eb', fontWeight: 600 }}>Create Analyst Profile</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @media (max-width: 768px) {
          .login-container {
            flex-direction: column !important;
            overflow-y: auto !important;
          }
          .left-brand-panel {
            width: 100% !important;
            max-width: 100% !important;
            min-height: auto !important;
            padding: 32px 24px !important;
          }
          .right-form-panel {
            min-height: auto !important;
            padding: 32px 16px !important;
          }
        }
      `}</style>
    </div>
  );
};

export default Login;
