import { useState } from 'react';
import { Link } from 'react-router-dom';
import { TrustTierBadge, LoanStatusBadge } from './TrustTierBadge';

function formatCurrency(n) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function ProgressBar({ repaid, total, status }) {
  const pct = total > 0 ? Math.min(100, (repaid / total) * 100) : 0;
  const isRepaid = status === 'REPAID';
  const barColor = isRepaid ? 'bg-emerald-500' : 'bg-bitcoin-500';

  return (
    <div className="mt-3">
      <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5 font-medium">
        <span>Repaid {formatCurrency(repaid)}</span>
        <span>{pct.toFixed(0)}%</span>
      </div>
      <div className="h-1.5 bg-slate-200 dark:bg-surface-800 rounded-full overflow-hidden border border-slate-300/50 dark:border-surface-700/50">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function LoanCard({ loan, onFund, onRepay, currentUserId }) {
  const isBorrower = loan.borrowerId === currentUserId;
  const isLender = loan.lenderId === currentUserId;
  const isGuarantor = !isBorrower && !isLender && !!currentUserId && loan.status !== 'REQUESTED';
  const canOpenDealRoom = isBorrower || isLender || isGuarantor;
  const [interestRate, setInterestRate] = useState(10); // Default to 10%

  return (
    <div className="dashboard-card card-hover p-6 flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <LoanStatusBadge status={loan.status} />
            {isBorrower && <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 dark:bg-surface-800 dark:text-slate-300 border border-slate-200 dark:border-surface-600">You Borrowed</span>}
            {isLender && <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-bitcoin-50 text-bitcoin-600 dark:bg-bitcoin-500/10 dark:text-bitcoin-400 border border-bitcoin-200 dark:border-bitcoin-500/20">Your Asset</span>}
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
            {formatCurrency(loan.amount)}
          </div>
        </div>
        <div className="text-right bg-slate-50 dark:bg-surface-dark_alt px-3 py-1.5 rounded-lg border border-slate-200 dark:border-surface-800">
          <div className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider mb-0.5">Term</div>
          <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 font-mono">{loan.durationDays} Days</div>
        </div>
      </div>

      {/* Counterparty info with explicit Risk details */}
      <div className="flex flex-col gap-2 p-3.5 rounded-lg bg-slate-50 dark:bg-[#12151b] border border-slate-200 dark:border-borderc-dark">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-surface-800 flex items-center justify-center text-sm font-bold text-slate-600 dark:text-slate-300">
            {(loan.borrowerName || 'B')[0].toUpperCase()}
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-0.5">{loan.borrowerName || 'Unknown Counterparty'}</div>
            <div className="text-xs text-slate-500 font-mono uppercase tracking-wider">Credit Score: <span className="font-bold text-slate-700 dark:text-slate-300">{loan.borrowerScore || 50}</span></div>
          </div>
          {loan.lenderName && (
            <div className="text-right border-l border-slate-300 dark:border-surface-700 pl-3">
              <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Creditor</div>
              <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">{loan.lenderName}</div>
            </div>
          )}
        </div>
        
        {/* Risk Visualization */}
        <div className="mt-2 pt-2 border-t border-slate-200 dark:border-surface-700">
          <TrustTierBadge tier={loan.borrowerTier || 'MODERATE'} score={loan.borrowerScore} showRecommendation={true} size="sm" />
        </div>
      </div>

      {/* Progress bar for active/repaid */}
      {(loan.status === 'ACTIVE' || loan.status === 'REPAID') && (
        <ProgressBar repaid={loan.repaidAmount || 0} total={loan.amount} status={loan.status} />
      )}

      {/* Dates Grid */}
      <div className="grid grid-cols-2 gap-3 text-xs pt-2 border-t border-slate-200 dark:border-surface-800">
        <div>
          <span className="block text-slate-500 font-medium mb-1 uppercase tracking-wider text-[10px]">Origination</span>
          <span className="font-semibold text-slate-700 dark:text-slate-300">{formatDate(loan.createdAt)}</span>
        </div>
        <div>
          <span className="block text-slate-500 font-medium mb-1 uppercase tracking-wider text-[10px]">Maturity</span>
          <span className={`font-semibold ${loan.status === 'ACTIVE' && new Date(loan.dueAt) < new Date() ? 'text-rose-600 dark:text-rose-500' : 'text-slate-700 dark:text-slate-300'}`}>
            {formatDate(loan.dueAt)}
          </span>
        </div>
      </div>

      {/* Actions */}
      {loan.status === 'REQUESTED' && !isBorrower && onFund && (
        <div className="mt-2 space-y-3">
          <div className="bg-slate-50 dark:bg-surface-900 border border-slate-200 dark:border-surface-800 rounded-lg p-3">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 block">Interest Rate (%)</label>
            <div className="flex items-center gap-2">
              <input 
                type="number" 
                min="1" 
                max="15" 
                value={interestRate} 
                onChange={(e) => setInterestRate(e.target.value)}
                className="flex-1 bg-white dark:bg-surface-950 border border-slate-300 dark:border-surface-700 text-slate-900 dark:text-slate-100 rounded-md px-3 py-1.5 text-sm font-semibold outline-none focus:border-bitcoin-500 transition-all"
              />
              <span className="text-sm font-semibold text-slate-400">% APR</span>
            </div>
          </div>
          <button
            onClick={() => onFund(loan.loanId, interestRate)}
            className="btn-primary w-full border border-bitcoin-600 hover:shadow-glow-orange dark:border-transparent transition-all"
          >
            Accept Application
          </button>
        </div>
      )}
      {loan.status === 'ACTIVE' && isBorrower && onRepay && (
        <button
          onClick={() => onRepay(loan)}
          className="btn-secondary w-full mt-2"
        >
          Make Repayment
        </button>
      )}
      {canOpenDealRoom && (
        <Link 
          to={`/loan/${loan.loanId}`}
          className="btn-secondary w-full mt-2 text-center block"
        >
          Open Deal Room
        </Link>
      )}
    </div>
  );
}
