import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, X, Send, Search, ShieldCheck, Zap, BarChart3, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

interface Message {
  sender: 'user' | 'assistant';
  text: string;
}

const quickPresets = [
  { label: "⚡ High risk transactions", query: "Show me high risk transactions above 5000" },
  { label: "📊 Model performance", query: "What is the current model accuracy and F1 score?" },
  { label: "🛡️ Recent chargebacks", query: "List recent chargeback cases" },
];

const AIRobotAssistant: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [bubbleVisible, setBubbleVisible] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const displayName = user?.username
    ? user.username.charAt(0).toUpperCase() + user.username.slice(1)
    : 'User';

  useEffect(() => {
    if (user?.username) {
      setMessages([{
        sender: 'assistant',
        text: `Hello **${displayName}**! 👋 I'm **Sentinel AI**, your real-time risk assistant.\n\nAsk me anything about transactions, risk scores, chargeback disputes, or model performance.`
      }]);
    }
  }, [user?.username]);

  // Hide bubble when panel is open
  useEffect(() => {
    if (isOpen) setBubbleVisible(false);
  }, [isOpen]);

  // Show bubble again 3s after panel closes
  useEffect(() => {
    if (!isOpen) {
      const t = setTimeout(() => setBubbleVisible(true), 2800);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  if (!user) return null;

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim()) return;
    const userText = textToSend.trim();
    setMessages(prev => [...prev, { sender: 'user', text: userText }]);
    setQuery('');
    setIsLoading(true);
    try {
      const response = await axios.post('/api/copilot/query', { query: userText });
      setMessages(prev => [...prev, { sender: 'assistant', text: response.data.response }]);
    } catch {
      setMessages(prev => [...prev, {
        sender: 'assistant',
        text: 'I encountered an error querying the risk database. Please check connection.'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0)  scale(1);    }
        }
        @keyframes spinAI { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes bubblePop {
          0%   { opacity: 0; transform: translateY(10px) scale(0.85); }
          70%  { transform: translateY(-3px) scale(1.02); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-6px); }
        }
        @keyframes pulse-ring {
          0%   { box-shadow: 0 0 0 0   rgba(37,99,235,0.55); }
          70%  { box-shadow: 0 0 0 12px rgba(37,99,235,0);   }
          100% { box-shadow: 0 0 0 0   rgba(37,99,235,0);    }
        }
        .ai-bot-btn { animation: float 3.2s ease-in-out infinite; }
        .ai-bot-btn:hover { animation: none !important; transform: scale(1.10); }
        .ai-speech-bubble { animation: bubblePop 0.45s cubic-bezier(0.16,1,0.3,1) forwards; }
      `}</style>

      <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999, fontFamily: "'Inter', sans-serif", display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>

        {/* ── Expanded Chat Panel ── */}
        {isOpen && (
          <div style={{
            width: '380px', height: '540px', background: '#ffffff',
            border: '1px solid #cbd5e1', borderRadius: '20px',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25), 0 0 20px rgba(37,99,235,0.12)',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
            marginBottom: '16px', animation: 'slideUp 0.28s cubic-bezier(0.16,1,0.3,1)'
          }}>
            {/* Header */}
            <div style={{
              background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
              padding: '16px 18px', color: '#ffffff',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '38px', height: '38px', borderRadius: '12px',
                  background: 'rgba(255,255,255,0.2)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.15)'
                }}>
                  <Bot size={22} color="#fff" />
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 800, letterSpacing: '-0.01em' }}>Sentinel AI</div>
                  <div style={{ fontSize: '11px', opacity: 0.9, display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 6px #4ade80', display: 'inline-block' }} />
                    Hello {displayName} 👋
                  </div>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer', padding: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={18} />
              </button>
            </div>

            {/* Quick Nav */}
            <div style={{ display: 'flex', gap: '6px', padding: '10px 14px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <button onClick={() => { navigate('/predict'); setIsOpen(false); }} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', padding: '7px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '11px', fontWeight: 600, color: '#1e293b', cursor: 'pointer', transition: 'background 0.15s' }}>
                <Zap size={12} color="#2563eb" /> Analyze Risk
              </button>
              <button onClick={() => { navigate('/chargebacks'); setIsOpen(false); }} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', padding: '7px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '11px', fontWeight: 600, color: '#1e293b', cursor: 'pointer', transition: 'background 0.15s' }}>
                <ShieldCheck size={12} color="#16a34a" /> Alerts
              </button>
              <button onClick={() => { navigate('/model-performance'); setIsOpen(false); }} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', padding: '7px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '11px', fontWeight: 600, color: '#1e293b', cursor: 'pointer', transition: 'background 0.15s' }}>
                <BarChart3 size={12} color="#4f46e5" /> Metrics
              </button>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px', background: '#ffffff' }}>
              {messages.map((msg, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start' }}>
                  <div style={{
                    maxWidth: '85%', padding: '10px 14px',
                    borderRadius: msg.sender === 'user' ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                    background: msg.sender === 'user' ? 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' : '#f1f5f9',
                    color: msg.sender === 'user' ? '#ffffff' : '#0f172a',
                    fontSize: '12px', lineHeight: 1.5,
                    border: msg.sender === 'user' ? 'none' : '1px solid #e2e8f0'
                  }}>
                    {msg.text.replace(/\*\*/g, '')}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#64748b' }}>
                  <RefreshCw size={14} style={{ animation: 'spinAI 1s linear infinite' }} />
                  <span>Querying risk engine...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Presets */}
            <div style={{ padding: '8px 12px', display: 'flex', gap: '6px', overflowX: 'auto', background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
              {quickPresets.map((p, i) => (
                <button key={i} onClick={() => handleSend(p.query)} style={{ whiteSpace: 'nowrap', padding: '5px 10px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '14px', fontSize: '10px', fontWeight: 600, color: '#334155', cursor: 'pointer' }}>
                  {p.label}
                </button>
              ))}
            </div>

            {/* Input */}
            <div style={{ padding: '12px', borderTop: '1px solid #e2e8f0', background: '#ffffff', display: 'flex', gap: '8px' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                <input
                  type="text" value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend(query)}
                  placeholder="Ask AI about risk, transactions..."
                  style={{ width: '100%', padding: '9px 10px 9px 32px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '10px', fontSize: '12px', color: '#0f172a', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <button onClick={() => handleSend(query)} style={{ padding: '9px 14px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Send size={14} />
              </button>
            </div>
          </div>
        )}

        {/* ── Floating Speech Bubble ── */}
        {!isOpen && bubbleVisible && (
          <div
            className="ai-speech-bubble"
            style={{
              marginBottom: '10px',
              background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
              color: '#ffffff',
              padding: '10px 16px',
              borderRadius: '16px 16px 4px 16px',
              fontSize: '12px',
              fontWeight: 600,
              lineHeight: 1.4,
              boxShadow: '0 8px 24px rgba(37,99,235,0.35)',
              maxWidth: '200px',
              textAlign: 'left',
              position: 'relative',
              cursor: 'pointer',
            }}
            onClick={() => setIsOpen(true)}
          >
            <span style={{ opacity: 0.75, fontSize: '10px', display: 'block', marginBottom: '2px' }}>Sentinel AI</span>
            Hello {displayName}! 👋<br />
            <span style={{ fontWeight: 400, opacity: 0.9, fontSize: '11px' }}>Tap to ask about risks</span>
            {/* Bubble tail */}
            <div style={{
              position: 'absolute',
              bottom: '-8px',
              right: '20px',
              width: 0, height: 0,
              borderLeft: '8px solid transparent',
              borderRight: '0px solid transparent',
              borderTop: '8px solid #3b82f6',
            }} />
          </div>
        )}

        {/* ── Floating Robot Button ── */}
        <button
          className="ai-bot-btn"
          onClick={() => { setIsOpen(v => !v); setBubbleVisible(false); }}
          style={{
            width: '60px', height: '60px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)',
            color: '#ffffff', border: '3px solid #ffffff',
            boxShadow: '0 10px 30px rgba(37,99,235,0.45)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'transform 0.2s cubic-bezier(0.175,0.885,0.32,1.275), box-shadow 0.2s',
            animation: 'float 3.2s ease-in-out infinite, pulse-ring 2.5s ease-out infinite',
          }}
        >
          <Bot size={30} color="#ffffff" />
        </button>
      </div>
    </>
  );
};

export default AIRobotAssistant;
