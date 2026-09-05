import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { MessageSquare, X, Send, Bot, RefreshCw, Sparkles } from 'lucide-react';

interface Message {
  sender: 'user' | 'assistant';
  text: string;
}

interface CopilotProps {
  transactionContextId?: string | null;
}

const Copilot: React.FC<CopilotProps> = ({ transactionContextId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { 
      sender: 'assistant', 
      text: "Hello! I am **RiskShield Copilot** 🤖.\n\nI have direct access to your merchant ledger, risk rules, and ML model performance metrics. You can ask me to:\n\n- Analyze a specific transaction (e.g. **\"Explain risk triggers for TXN-90001\"**)\n- Review chargeback evidence for a dispute (e.g. **\"What is the status of CASE-10001?\"**)\n- Summarize your operational costs and target thresholds\n\nHow can I help you protect your revenue today?" 
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const presetQueries = [
    { label: "🔍 Why is TXN-90001 risky?", query: "Why was TXN-90001 flagged?" },
    { label: "📑 Check CASE-10001 evidence", query: "What evidence is available for CASE-10001?" },
    { label: "💡 How to optimize thresholds?", query: "How do I optimize the risk thresholds using operational costs?" },
    { label: "📊 Show high-risk transactions", query: "Show me high-risk transactions above ₹5,000" }
  ];

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim()) return;
    
    setMessages(prev => [...prev, { sender: 'user', text: textToSend }]);
    setQuery('');
    setIsLoading(true);

    try {
      const response = await axios.post('/api/copilot/query', {
        query: textToSend,
        transaction_context_id: transactionContextId || null
      });

      setMessages(prev => [...prev, { sender: 'assistant', text: response.data.response }]);
    } catch (err: any) {
      setMessages(prev => [...prev, { 
        sender: 'assistant', 
        text: "Error: I encountered a connection issue querying the database." 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Basic formatter for simple markdown elements in Copilot responses
  const renderFormattedText = (text: string) => {
    return text.split('\n').map((line, idx) => {
      let formattedLine = line;
      
      // Headers
      if (formattedLine.startsWith('### ')) {
        return <h4 key={idx} className="text-sm font-bold text-slate-200 mt-2 mb-1">{formattedLine.replace('### ', '')}</h4>;
      }
      
      // Bold text mapping
      const boldRegex = /\*\*(.*?)\*\*/g;
      const parts = [];
      let lastIndex = 0;
      let match;
      
      while ((match = boldRegex.exec(formattedLine)) !== null) {
        if (match.index > lastIndex) {
          parts.push(formattedLine.substring(lastIndex, match.index));
        }
        parts.push(<strong key={match.index} className="text-brand-400 font-semibold">{match[1]}</strong>);
        lastIndex = boldRegex.lastIndex;
      }
      
      if (lastIndex < formattedLine.length) {
        parts.push(formattedLine.substring(lastIndex));
      }
      
      const lineContent = parts.length > 0 ? parts : formattedLine;
      
      if (line.startsWith('- ')) {
        return <li key={idx} className="ml-4 list-disc text-xs text-slate-300 mt-0.5">{lineContent.toString().substring(2)}</li>;
      }
      
      return <p key={idx} className="text-xs text-slate-300 mb-1 leading-relaxed">{lineContent}</p>;
    });
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Floating Chat Window */}
      {isOpen && (
        <div className="w-96 h-[520px] glass-panel rounded-2xl shadow-2xl flex flex-col mb-4 border border-slate-800 overflow-hidden animate-in slide-in-from-bottom-5 duration-200 copilot-window">
          {/* Header */}
          <div className="copilot-header border-b border-slate-800 p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-brand-600/20 text-brand-400 rounded-lg">
                <Sparkles size={16} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white copilot-title">RiskShield Copilot</h3>
                <span className="text-[10px] text-green-400 flex items-center gap-1 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-ping"></span>
                  Safe Ledger Mode
                </span>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors copilot-close"
            >
              <X size={16} />
            </button>
          </div>

          {/* Messages Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 copilot-body">
            {messages.map((msg, index) => (
              <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl p-3 flex gap-2.5 ${
                  msg.sender === 'user' 
                    ? 'bg-brand-600 text-white rounded-tr-none copilot-bubble-user' 
                    : 'bg-slate-900 border border-slate-800 text-slate-300 rounded-tl-none copilot-bubble-assistant'
                }`}>
                  {msg.sender === 'assistant' && (
                    <Bot size={16} className="text-brand-400 mt-0.5 shrink-0" />
                  )}
                  <div className="text-xs break-words whitespace-pre-wrap">
                    {msg.sender === 'user' ? msg.text : renderFormattedText(msg.text)}
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start animate-pulse">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl rounded-tl-none p-3 flex items-center gap-2 text-xs text-slate-400 copilot-bubble-assistant">
                  <RefreshCw size={12} className="animate-spin text-brand-400" />
                  Analyzing risk ledger...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Preset Buttons */}
          <div className="p-3 flex flex-wrap gap-1.5 max-h-28 overflow-y-auto border-t border-slate-800/80 copilot-presets-container">
            {presetQueries.map((preset, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(preset.query)}
                className="text-[10px] bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white px-2.5 py-1.5 rounded-full transition-colors border border-slate-800 font-medium copilot-preset-btn"
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Input Footer */}
          <div className="p-3 border-t border-slate-800 flex gap-2 copilot-footer">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend(query)}
              placeholder="Ask about a transaction or dispute..."
              className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500 placeholder-slate-500 copilot-input"
            />
            <button
              onClick={() => handleSend(query)}
              className="bg-brand-600 hover:bg-brand-700 text-white p-2 rounded-lg transition-colors copilot-send-btn"
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Persistent Speech Bubble Badge - Always Visible when Closed */}
      {!isOpen && (
        <div 
          onClick={() => setIsOpen(true)}
          className="mb-2 bg-slate-900 text-white text-xs font-bold px-4 py-2.5 rounded-2xl border border-brand-500/50 shadow-2xl cursor-pointer flex items-center gap-2.5 hover:scale-105 active:scale-95 transition-all duration-200 z-50"
          style={{ boxShadow: '0 10px 25px -5px rgba(99, 102, 241, 0.4)' }}
        >
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
          <span>🤖 RiskShield AI Copilot</span>
          <span className="text-[9px] bg-brand-500/40 text-brand-200 px-1.5 py-0.5 rounded font-mono font-bold tracking-wider">ONLINE</span>
        </div>
      )}

      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 brand-gradient rounded-full shadow-2xl flex items-center justify-center text-white hover:scale-105 active:scale-95 transition-all duration-150 border border-brand-500/20 z-50"
      >
        {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
      </button>
    </div>
  );
};

export default Copilot;

