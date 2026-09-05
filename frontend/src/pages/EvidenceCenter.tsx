import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  ShieldAlert, 
  ArrowLeft, 
  RefreshCw, 
  CheckCircle2, 
  XCircle,
  Send,
  Database,
  ShieldQuestion,
  Sparkles
} from 'lucide-react';

interface EvidenceItem {
  evidence_type: string;
  status: string;
  value: string;
  confidence: number;
  source_record: string;
  created_at: string;
}

interface ChargebackDetail {
  id: string;
  transaction_id: string;
  amount: number;
  reason: string;
  deadline: string;
  status: string;
  evidence_strength: number;
  suggested_action: string;
  created_at: string;
  evidence_summary: string | null;
  evidence_items: EvidenceItem[];
}

const EvidenceCenter: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [data, setData] = useState<ChargebackDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCompiling, setIsCompiling] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notes, setNotes] = useState('');

  const fetchDisputeDetail = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get(`/api/chargebacks/${id}`);
      setData(res.data);
    } catch (err: any) {
      setError("Dispute case not found in registry.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDisputeDetail();
  }, [id]);

  const handleGenerateEvidence = async () => {
    setIsCompiling(true);
    try {
      const res = await axios.post(`/api/chargebacks/${id}/evidence`);
      setData(res.data);
    } catch (err: any) {
      alert("Error compiling evidence pack: " + err.message);
    } finally {
      setIsCompiling(false);
    }
  };

  const handleDecision = async (action: 'RESPOND_TO_CHARGEBACK' | 'ACCEPT_LOSS') => {
    setIsSubmitting(true);
    try {
      const res = await axios.post(`/api/chargebacks/${id}/decision`, {
        action,
        notes: notes || `Dispute action: ${action}`
      });
      setData(res.data);
      setNotes('');
    } catch (err: any) {
      alert("Error submitting dispute action: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 space-y-6 animate-pulse">
        <div className="h-6 bg-slate-200 rounded-lg w-1/4"></div>
        <div className="grid grid-cols-3 gap-6">
          <div className="h-96 bg-white border border-slate-200 rounded-lg col-span-2 shadow-sm"></div>
          <div className="h-96 bg-white border border-slate-200 rounded-lg shadow-sm"></div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center space-y-4 max-w-md mx-auto min-h-[400px] flex flex-col justify-center animate-fade-in">
        <ShieldAlert className="mx-auto text-rose-600" size={44} />
        <h3 className="text-base font-bold text-slate-900">Dispute Case Refused</h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">{error || "No data available."}</p>
        <button 
          onClick={() => navigate('/chargebacks')} 
          className="bg-indigo-650 text-white px-4 py-2 rounded-lg text-xs font-semibold inline-block hover:bg-indigo-750 transition-colors shadow-sm"
        >
          Return to Registry
        </button>
      </div>
    );
  }

  const getStrengthColor = (score: number) => {
    if (score >= 70) return 'text-emerald-700';
    if (score >= 40) return 'text-amber-700';
    return 'text-rose-700';
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto animate-fade-in">
      {/* Breadcrumb */}
      <button 
        onClick={() => navigate('/chargebacks')}
        className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 font-semibold"
      >
        <ArrowLeft size={14} />
        Disputes Registry
      </button>

      {/* Title */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 border-b border-slate-200 pb-5">
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">AI Dispute Evidence Compiler</span>
          <div className="flex items-center gap-3 mt-0.5">
            <h2 className="text-xl font-bold text-slate-900">Dispute Case Audit — {data.id}</h2>
            <span className={`px-2 py-0.5 rounded text-[9px] font-bold border whitespace-nowrap uppercase tracking-wider ${
              data.status === 'RESPONDED' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
              data.status === 'LOST' ? 'bg-rose-50 text-rose-700 border-rose-100' :
              'bg-amber-50 text-amber-705 border-amber-105'
            }`}>{data.status === 'RESPONDED' ? 'RESPONDED' : data.status === 'LOST' ? 'LOSS ACCEPTED' : 'PENDING ACTION'}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate(`/transactions/${data.transaction_id}`)}
            className="bg-white border border-slate-200 text-slate-600 hover:text-slate-800 hover:bg-slate-50 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors shadow-sm"
          >
            Investigate Transaction
          </button>
          {user && user.role !== 'VIEWER' && (
            <button
              disabled={isCompiling}
              onClick={handleGenerateEvidence}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-sm"
            >
              {isCompiling ? (
                <>
                  <RefreshCw className="animate-spin" size={13} />
                  Compiling...
                </>
              ) : (
                <>
                  <Sparkles size={13} />
                  Compile Evidence Pack
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Main grids */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Evidence Checklist items */}
        <div className="lg:col-span-2 space-y-6">
          {/* Summary Box */}
          <div className="glass-panel p-5 space-y-3">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Sparkles size={14} className="text-amber-600" />
              AI Compiled Dispute Summary
            </h3>
            {data.evidence_summary ? (
              <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 border border-slate-200/60 p-4 rounded-lg font-medium">
                {data.evidence_summary}
              </p>
            ) : (
              <div className="p-8 text-center border border-dashed border-slate-200 rounded-lg text-slate-400 text-xs">
                No evidence has been compiled yet. Click **Compile Evidence Pack** above to trigger database registry audits.
              </div>
            )}
          </div>

          {/* Compiled documents checklist */}
          <div className="glass-panel p-6 space-y-4">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Database size={14} className="text-indigo-600" />
              Evidentiary Records Audit
            </h3>
            
            <div className="space-y-3">
              {data.evidence_items.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-xs italic">
                  Evidence package empty. Initiate compiler to retrieve ledger documents.
                </div>
              ) : (
                data.evidence_items.map((item, idx) => (
                  <div key={idx} className="border border-slate-200 bg-slate-50/50 rounded-lg p-4 flex gap-4 items-start shadow-sm">
                    <div className="shrink-0 mt-0.5">
                      {item.status === 'AVAILABLE' ? (
                        <div className="text-emerald-700 bg-emerald-50 p-1 rounded border border-emerald-105">
                          <CheckCircle2 size={15} />
                        </div>
                      ) : (
                        <div className="text-slate-400 bg-slate-100 p-1 rounded border border-slate-200">
                          <XCircle size={15} />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex justify-between items-center">
                        <p className="text-xs font-bold text-slate-800">{item.evidence_type}</p>
                        {item.status === 'AVAILABLE' && (
                          <span className="text-[9px] bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-550 font-bold">
                            Confidence: {item.confidence}%
                          </span>
                        )}
                      </div>
                      <p className={`text-xs ${item.status === 'AVAILABLE' ? 'text-slate-600' : 'text-slate-400 italic'}`}>
                        {item.value}
                      </p>
                      <div className="flex items-center gap-3 pt-1.5 text-[9px] text-slate-400 font-medium">
                        <span>Source: <code className="text-slate-600 font-bold font-mono">{item.source_record}</code></span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right column: Action panel and recommendations */}
        <div className="space-y-6">
          {/* Action Recommendation strength gauge */}
          <div className="glass-panel p-5 flex flex-col justify-between text-center min-h-[220px]">
            <div>
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-4">Evidence strength</h3>
              {data.evidence_strength > 0 ? (
                <div className="space-y-3">
                  <div className="text-3xl font-extrabold text-slate-900">
                    <span className={getStrengthColor(data.evidence_strength)}>{data.evidence_strength}</span>
                    <span className="text-xs font-bold text-slate-400 uppercase"> / 100</span>
                  </div>
                  <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold border ${
                    data.evidence_strength >= 70 ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                    data.evidence_strength >= 40 ? 'bg-amber-50 text-amber-700 border-amber-100' :
                    'bg-rose-50 text-rose-700 border-rose-100'
                  }`}>
                    {data.evidence_strength >= 70 ? 'STRONG MATCH' :
                     data.evidence_strength >= 40 ? 'AVERAGE SIGNALS' : 'WEAK EVIDENCE'}
                  </span>
                </div>
              ) : (
                <div className="py-6 flex flex-col items-center gap-1.5 text-slate-400 text-xs">
                  <ShieldQuestion size={32} />
                  <span>Evidence strength evaluated after pack compilation</span>
                </div>
              )}
            </div>
            
            <div className="border-t border-slate-150 pt-4 mt-4 text-left">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Suggested action</span>
              <p className="text-xs text-slate-800 font-bold mt-1">{data.suggested_action}</p>
            </div>
          </div>

          {/* Action form panel */}
          {user && user.role !== 'VIEWER' && (
            <div className="glass-panel p-6 space-y-4">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Gateway Response Workspace</h3>
              
              {data.status === 'RESPONDED' || data.status === 'LOST' ? (
                <div className="p-5 text-center space-y-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                  {data.status === 'RESPONDED' ? (
                    <CheckCircle2 className="mx-auto text-emerald-600 animate-bounce-short" size={26} />
                  ) : (
                    <XCircle className="mx-auto text-rose-600 animate-bounce-short" size={26} />
                  )}
                  <p className="text-xs font-bold text-slate-800">Dispute Settled</p>
                  <p className="text-[10px] text-slate-450 leading-normal max-w-[200px] mx-auto">
                    This case has been marked as <strong>{data.status === 'RESPONDED' ? 'RESPONDED' : 'LOSS ACCEPTED'}</strong> in the gateway database logs.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Provide response comments or audit comments..."
                    rows={3}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-50 resize-none"
                  />
                  
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      disabled={isSubmitting || data.evidence_items.length === 0}
                      onClick={() => handleDecision('RESPOND_TO_CHARGEBACK')}
                      className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg py-2 text-xs font-bold flex items-center justify-center gap-1 transition-colors shadow-sm"
                    >
                      <Send size={11} />
                      Submit Response
                    </button>
                    <button
                      disabled={isSubmitting}
                      onClick={() => handleDecision('ACCEPT_LOSS')}
                      className="bg-rose-650 hover:bg-rose-750 disabled:opacity-50 text-white rounded-lg py-2 text-xs font-bold flex items-center justify-center gap-1 transition-colors shadow-sm"
                    >
                      <XCircle size={11} />
                      Accept Loss
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EvidenceCenter;
