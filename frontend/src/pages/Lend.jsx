import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWeb3 } from '../context/Web3Context';
import { useOnChainLoans } from '../utils/useContractEvents';
import { formatAUSD, ON_CHAIN_STATUS, formatBytes32, bytes32ToUuid } from '../contracts';
import { acceptLoan, addRequirements } from '../api';
import { TrendingUp, Search, Loader, AlertCircle, Wallet, CheckCircle, ExternalLink, Zap, FileText, ShieldCheck, Plus, X, ArrowRight } from 'lucide-react';

/* ─── Accept Modal ─────────────────────────────────────────────────── */
function AcceptLoanModal({ loan, onClose, onAccepted, currentAccount }) {
  const [interestRate, setInterestRate] = useState('5');
  const [docLabels, setDocLabels] = useState(['Government ID', 'Income Validation']);
  const [newDoc, setNewDoc] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1=set terms, 2=done
  const [error, setError] = useState('');

  const addDocLabel = () => {
    const trimmed = newDoc.trim();
    if (trimmed && !docLabels.includes(trimmed)) {
      setDocLabels([...docLabels, trimmed]);
      setNewDoc('');
    }
  };

  const removeDocLabel = (label) => {
    setDocLabels(docLabels.filter(l => l !== label));
  };

  const handleSubmit = async () => {
    if (docLabels.length === 0) {
      setError('You must request at least one document from the borrower.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const loanUuid = bytes32ToUuid(loan.loanId);

      // 1. Accept the loan off-chain (sets lender + interest rate)
      await acceptLoan(loanUuid, Number(interestRate));

      // 2. Add document requirements  
      const requirements = docLabels.map(label => ({ type: 'document', label }));
      await addRequirements(loanUuid, requirements);

      setStep(2);
      if (onAccepted) onAccepted();
    } catch (err) {
      console.error('Accept failed:', err);
      setError(err.response?.data?.error || err.message || 'Failed to accept loan');
    } finally {
      setLoading(false);
    }
  };

  const navigate = useNavigate();

  if (step === 2) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
        <div className="bg-white dark:bg-surface-900 border border-slate-200 dark:border-surface-700 rounded-2xl w-full max-w-md p-8 text-center shadow-2xl" onClick={e => e.stopPropagation()}>
          <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="w-8 h-8 text-emerald-600 dark:text-emerald-500" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">Loan Accepted</h3>
          <p className="text-sm text-slate-500 mb-1">Documents have been requested from the borrower.</p>
          <p className="text-xs text-slate-400 mb-6">You will be able to fund on-chain once documents are verified and guarantors approve.</p>
          <div className="flex gap-3">
            <button onClick={onClose} className="btn-secondary flex-1">Close</button>
            <button onClick={() => navigate(`/loan/${loan.loanId}`)} className="btn-primary flex-1 flex items-center justify-center gap-1.5">
              View Details <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-surface-900 border border-slate-200 dark:border-surface-700 rounded-2xl w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-surface-700">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-bitcoin-500" /> Accept & Set Terms
              </h3>
              <p className="text-xs text-slate-500 mt-1">Review terms and request documents from the borrower</p>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-surface-800 transition-colors">
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 max-h-[65vh] overflow-y-auto">
          {/* Loan Summary */}
          <div className="bg-slate-50 dark:bg-surface-950 border border-slate-200 dark:border-surface-800 rounded-xl p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Loan Amount</span>
              <span className="text-lg font-bold font-mono text-slate-800 dark:text-slate-100">{formatAUSD(loan.principalAmount)} AUSD</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Borrower</span>
              <span className="font-mono text-xs text-slate-600 dark:text-slate-400">{loan.borrower?.slice(0, 8)}…{loan.borrower?.slice(-6)}</span>
            </div>
          </div>

          {/* Interest Rate */}
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Interest Rate (%)</label>
            <div className="flex gap-2">
              <input
                className="input text-sm flex-1 font-mono"
                type="number"
                min="1"
                max="15"
                step="0.5"
                value={interestRate}
                onChange={e => setInterestRate(e.target.value)}
              />
              <span className="flex items-center text-xs text-slate-500 font-medium bg-slate-100 dark:bg-surface-800 px-3 rounded-lg border border-slate-200 dark:border-surface-700">{Number(interestRate).toFixed(1)}%</span>
            </div>
          </div>

          {/* Document Requirements */}
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2 block flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" /> Required Documents
            </label>
            <div className="space-y-2 mb-3">
              {docLabels.map((label, i) => (
                <div key={i} className="flex items-center justify-between bg-slate-50 dark:bg-surface-950 border border-slate-200 dark:border-surface-800 rounded-lg px-3 py-2">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
                  <button onClick={() => removeDocLabel(label)} className="p-1 rounded hover:bg-slate-200 dark:hover:bg-surface-700 transition-colors">
                    <X className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                </div>
              ))}
              {docLabels.length === 0 && (
                <p className="text-xs text-rose-500 italic">At least one document is required</p>
              )}
            </div>
            <div className="flex gap-2">
              <input
                className="input text-sm flex-1"
                type="text"
                placeholder="Add custom document requirement..."
                value={newDoc}
                onChange={e => setNewDoc(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addDocLabel())}
              />
              <button onClick={addDocLabel} disabled={!newDoc.trim()} className="btn-secondary py-2 px-3 flex items-center gap-1 text-xs disabled:opacity-40">
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-500 text-sm font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />{error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 dark:border-surface-700 flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1" disabled={loading}>Cancel</button>
          <button onClick={handleSubmit} disabled={loading || docLabels.length === 0} className="btn-primary flex-1 flex items-center justify-center gap-2">
            {loading ? <><Loader className="w-4 h-4 animate-spin" /> Processing...</> : <><ShieldCheck className="w-4 h-4" /> Accept & Request Docs</>}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Loan Card ────────────────────────────────────────────────────── */
function OnChainLoanCard({ loan, currentAccount, onAccept }) {
  const navigate = useNavigate();
  const isBorrower = loan.borrower?.toLowerCase() === currentAccount?.toLowerCase();
  const isRequested = loan.status === 0;
  const amount = formatAUSD(loan.principalAmount);

  return (
    <div className="dashboard-card p-5 border border-slate-200 dark:border-surface-700 hover:border-bitcoin-500/50 transition-all group">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="text-[10px] uppercase tracking-widest font-bold text-slate-400 dark:text-slate-500 mb-1">On-Chain Loan</div>
          <div className="text-xl font-bold font-mono text-slate-800 dark:text-slate-100">{amount} AUSD</div>
        </div>
        <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
          isRequested
            ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20'
            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20'
        }`}>
          {ON_CHAIN_STATUS[loan.status]}
        </span>
      </div>

      <div className="space-y-2 text-xs mb-4">
        <div className="flex justify-between items-center">
          <span className="text-slate-500 font-semibold uppercase tracking-wider">Borrower</span>
          <span className="font-mono text-slate-600 dark:text-slate-400">{loan.borrower?.slice(0, 6)}…{loan.borrower?.slice(-4)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-slate-500 font-semibold uppercase tracking-wider">Loan ID</span>
          <span className="font-mono text-[10px] text-slate-500">{formatBytes32(loan.loanId)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-slate-500 font-semibold uppercase tracking-wider">Block</span>
          <span className="font-mono text-slate-500">#{loan.blockNumber}</span>
        </div>
      </div>

      {isRequested && !isBorrower && (
        <div className="border-t border-slate-200 dark:border-surface-700 pt-4 space-y-3">
          <button
            onClick={() => onAccept(loan)}
            className="btn-primary w-full py-2.5 flex items-center justify-center gap-2 text-sm"
          >
            <ShieldCheck className="w-4 h-4" /> Accept & Review
          </button>
        </div>
      )}

      {/* Link to detail for non-requested or own loans */}
      {(!isRequested || isBorrower) && (
        <div className="border-t border-slate-200 dark:border-surface-700 pt-3">
          <button
            onClick={() => navigate(`/loan/${loan.loanId}`)}
            className="text-xs font-bold text-bitcoin-600 dark:text-bitcoin-400 hover:underline flex items-center gap-1"
          >
            View Details <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── Main Lend Page ───────────────────────────────────────────────── */
export default function Lend() {
  const { user } = useAuth();
  const { account, loansContract, ausdContract, ausdBalance, connectWallet, connecting, refreshBalance } = useWeb3();
  const { loans, loading, refresh } = useOnChainLoans();
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [acceptingLoan, setAcceptingLoan] = useState(null);

  // Filter for REQUESTED loans where the user is NOT the borrower
  const pending = loans.filter(l => {
    if (l.status !== 0) return false;
    if (l.borrower?.toLowerCase() === account?.toLowerCase()) return false;
    if (search && !l.borrower?.toLowerCase().includes(search.toLowerCase()) && !l.loanId?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header Block */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-white dark:bg-surface-900 border border-slate-200 dark:border-surface-800 flex items-center justify-center shadow-sm">
                <TrendingUp className="w-5 h-5 text-slate-600 dark:text-slate-300" />
              </div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Market Allocations</h1>
            </div>
            <p className="text-slate-500 xl:text-slate-400 ml-[52px] text-sm">Accept loan requests, verify documents, and deploy capital on-chain.</p>
          </div>
          {account && (
            <div className="bg-white dark:bg-surface-800 border border-slate-200 dark:border-surface-700 px-5 py-2.5 rounded-xl flex items-center gap-3 shadow-fintech-light dark:shadow-none transition-all">
              <Wallet className="w-5 h-5 text-bitcoin-600 dark:text-bitcoin-500" />
              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-0.5">On-Chain AUSD</span>
                <span className="text-bitcoin-600 dark:text-bitcoin-400 font-bold font-mono tracking-tight text-lg leading-none">{Number(ausdBalance).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
              </div>
            </div>
          )}
        </div>

        {/* MetaMask Connection Guard */}
        {!account && (
          <div className="dashboard-card p-6 border-t-4 border-t-bitcoin-500">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-bitcoin-50 dark:bg-bitcoin-500/10 border border-bitcoin-200 dark:border-bitcoin-500/30 flex items-center justify-center">
                <Wallet className="w-6 h-6 text-bitcoin-500" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-slate-800 dark:text-slate-100">Connect MetaMask to Fund Loans</h3>
                <p className="text-xs text-slate-500 mt-0.5">Your AUSD tokens will be atomically transferred to the borrower on-chain</p>
              </div>
              <button onClick={connectWallet} disabled={connecting} className="btn-primary py-2.5 px-5 text-sm">
                {connecting ? 'Connecting...' : 'Connect'}
              </button>
            </div>
          </div>
        )}

        {/* Info Banner */}
        <div className="dashboard-card p-4 border-l-4 border-l-bitcoin-500 bg-bitcoin-50/30 dark:bg-bitcoin-500/5">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-bitcoin-500 mt-0.5 shrink-0" />
            <div>
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">Compliance-First Lending</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                When you accept a loan, you'll specify which documents the borrower must provide. The borrower will also nominate guarantors. 
                You can only fund the loan on-chain after documents are verified, guarantors approve, and you complete the off-chain review.
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-4 rounded-lg bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-500 text-sm font-medium shadow-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />{error}
          </div>
        )}

        {/* Search */}
        <div className="flex flex-col sm:flex-row gap-3 bg-white dark:bg-surface-900 p-2 sm:p-2.5 rounded-2xl border border-slate-200 dark:border-surface-800 shadow-fintech-light dark:shadow-none transition-all">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
            <input
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-surface-950 border border-slate-200 dark:border-surface-800 rounded-xl text-sm text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-bitcoin-500/50 focus:border-bitcoin-500 transition-all font-medium placeholder-slate-400 dark:placeholder-slate-600"
              placeholder="Search by borrower address or loan ID..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 px-3">
            <ExternalLink className="w-4 h-4 text-bitcoin-500" />
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">On-Chain Data</span>
          </div>
        </div>

        {/* List UI */}
        {loading ? (
          <div className="flex items-center justify-center py-24 text-slate-500 font-medium font-mono text-sm uppercase tracking-widest">
            <Loader className="w-5 h-5 animate-spin mr-3" /> Reading on-chain state...
          </div>
        ) : pending.length === 0 ? (
          <div className="bg-white dark:bg-surface-900 border border-slate-200 dark:border-surface-800 rounded-2xl py-24 text-center shadow-fintech-light dark:shadow-none">
            <p className="text-slate-700 dark:text-slate-300 font-bold text-lg mb-2 tracking-tight">No pending loan requests on-chain</p>
            <p className="text-slate-500 text-sm">The on-chain order book is currently empty.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-6">
            {pending.map(loan => (
              <OnChainLoanCard
                key={loan.loanId}
                loan={loan}
                currentAccount={account}
                onAccept={(l) => setAcceptingLoan(l)}
              />
            ))}
          </div>
        )}

        {/* Accept Modal */}
        {acceptingLoan && (
          <AcceptLoanModal
            loan={acceptingLoan}
            currentAccount={account}
            onClose={() => setAcceptingLoan(null)}
            onAccepted={() => refresh()}
          />
        )}
      </div>
    </div>
  );
}
