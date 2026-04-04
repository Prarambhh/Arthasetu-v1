import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getMyRequests, getContracts, getHealth } from '../api';
import { LoanCard } from '../components/LoanCard';
import { TrustTierBadge } from '../components/TrustTierBadge';
import { formatAddress } from '../utils/wallet';
import { TrendingUp, TrendingDown, Clock, CheckCircle, AlertTriangle, Wallet, ArrowRight, ShieldCheck, FileText, Banknote, Loader } from 'lucide-react';

function Stat({ label, value, sub, color, border, icon: Icon }) {
  return (
    <div className={`dashboard-card p-5 ${border ? border : ''}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-slate-500 dark:text-muted-dark mb-1.5 font-semibold uppercase tracking-wider">{label}</p>
          <p className={`text-3xl font-bold font-mono ${color}`}>{value}</p>
          {sub && <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 font-medium bg-slate-100 dark:bg-surface-800 inline-block px-2 py-0.5 rounded-md">{sub}</p>}
        </div>
        {Icon && (
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-slate-100 dark:bg-surface-950 border border-slate-200 dark:border-surface-800">
            <Icon className={`w-5 h-5 ${color}`} />
          </div>
        )}
      </div>
    </div>
  );
}

function TimelineConnector() {
  return <div className="w-6 h-px bg-slate-300 dark:bg-surface-700 hidden sm:block"></div>;
}

export default function Dashboard() {
  const { user, refreshUser } = useAuth();
  const [loans, setLoans] = useState([]);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getMyRequests(), getContracts(), getHealth(), refreshUser()])
      .then(([reqsRes, contractsRes, healthRes]) => {
        const mappedReqs = reqsRes.data.data.map(l => ({
          ...l,
          loanId: l.id,
          borrowerId: l.borrower_id,
          lenderId: l.lender_id,
          createdAt: l.requested_at,
          status: l.status.toUpperCase(),
          durationDays: 30, // Mock
          borrowerName: l.borrowerName || 'Unknown Counterparty',
          lenderName: l.lenderName,
          borrowerScore: 50,
          borrowerTier: 'MODERATE',
        }));
        
        const mappedContracts = contractsRes.data.data ? contractsRes.data.data.map(c => ({
            ...c,
            loanId: c.loan_id,
            borrowerId: c.borrower_id,
            lenderId: c.lender_id,
            createdAt: c.issued_at,
            status: c.status === 'pending' ? 'ACTIVE' : 'REPAID',
            durationDays: 30,
            borrowerName: c.borrowerName || 'Unknown Counterparty',
            lenderName: c.lenderName,
            borrowerScore: 50,
            borrowerTier: 'MODERATE',
        })) : [];

        // Currently Dashboard mixes all pending and active into 'loans' array
        setLoans([...mappedReqs, ...mappedContracts]);
        setHealth(healthRes.data);
      })
      .finally(() => setLoading(false));
  }, []);

  const myLoans = loans.filter(l => l.borrowerId === user?.userId || l.lenderId === user?.userId);
  const activeLoans = myLoans.filter(l => l.status === 'ACTIVE');
  const pendingLoans = myLoans.filter(l => ['PENDING', 'REQUESTED', 'DOCS_REQUESTED', 'UNDER_REVIEW', 'APPROVED'].includes(l.status));
  const repaidLoans = myLoans.filter(l => l.status === 'REPAID');

  if (loading) return (
    <div className="min-h-screen bg-surface-light_alt dark:bg-surface-dark_alt flex items-center justify-center pt-20">
      <div className="text-slate-500 font-medium tracking-wide flex items-center gap-2">
        <Loader className="w-5 h-5 animate-spin" /> Syncing with Protocol...
      </div>
    </div>
  );

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Welcome header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Portfolio</h1>
            <div className="flex items-center gap-2.5 mt-1.5">
              <p className="text-slate-500 font-mono text-xs font-semibold">{formatAddress(user?.walletAddress)}</p>
              <TrustTierBadge tier={user?.trustTier} score={user?.creditScore} />
            </div>
          </div>
          <div className="flex gap-3">
            <Link to="/borrow" className="btn-secondary py-2 px-5 text-sm flex items-center gap-1.5">
              <TrendingDown className="w-4 h-4" /> Request Capital
            </Link>
            <Link to="/lend" className="btn-primary py-2 px-5 text-sm flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4" /> Deploy Capital
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <Stat label="Total Balance" value={`₹${(user?.balance || 0).toLocaleString('en-IN')}`} color="text-slate-800 dark:text-slate-100" icon={Wallet} />
          <Stat label="Credit Score" value={user?.creditScore ?? 50} sub={`Max Allowance ₹${(user?.creditScore || 50) * 100}`} color="text-bitcoin-500" border="border-bitcoin-500/30" icon={ShieldCheck} />
          <Stat label="Active Contracts" value={activeLoans.length} color="text-amber-500" icon={Clock} />
          <Stat label="Settled Contracts" value={repaidLoans.length} color="text-emerald-500" icon={CheckCircle} />
        </div>

        {/* Chain health */}
        {health && (
          <div className={`dashboard-card px-5 py-3.5 flex items-center gap-3 ${health.chainValid ? 'border-emerald-500/50' : 'border-rose-500/80 bg-rose-50 dark:bg-rose-500/10'}`}>
            {health.chainValid ? (
              <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" />
            )}
            <div>
              <span className={`font-bold text-sm ${health.chainValid ? 'text-emerald-600 dark:text-emerald-500' : 'text-rose-600 dark:text-rose-500'}`}>
                {health.chainValid ? 'System Audit: Cryptographically Verified' : 'System Audit: Compromised State'}
              </span>
              <span className="text-slate-500 text-xs ml-3 font-mono border-l border-slate-300 dark:border-surface-700 pl-3">{health.chainLength} Sequence Blocks</span>
            </div>
            <Link to="/explorer" className="ml-auto text-xs font-semibold text-bitcoin-600 dark:text-bitcoin-400 hover:text-bitcoin-700 dark:hover:text-bitcoin-300 flex items-center gap-1 bg-bitcoin-50 dark:bg-bitcoin-500/10 px-3 py-1.5 rounded-md transition-colors border border-bitcoin-200 dark:border-bitcoin-500/30 shadow-sm dark:shadow-none">
              Inspect Ledger <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Action Flow (Timeline Request from User) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="dashboard-card p-6 border-t-4 border-t-bitcoin-500">
               <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-6 tracking-tight text-lg">Transaction Lifecycle</h3>
               <div className="flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-2">
                  <div className="flex flex-col items-center bg-slate-50 dark:bg-[#12151b] border border-slate-200 dark:border-borderc-dark p-4 rounded-xl flex-1 w-full relative">
                     <FileText className="w-6 h-6 text-slate-400 mb-2" />
                     <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">Phase 1</span>
                     <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 mt-1">Loan Created</span>
                     {pendingLoans.length > 0 && <div className="absolute -top-2 -right-2 bg-bitcoin-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shadow-sm">{pendingLoans.length}</div>}
                  </div>
                  <TimelineConnector />
                  <div className="flex flex-col items-center bg-slate-50 dark:bg-[#12151b] border border-slate-200 dark:border-borderc-dark p-4 rounded-xl flex-1 w-full relative">
                     <Banknote className="w-6 h-6 text-amber-500 mb-2" />
                     <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">Phase 2</span>
                     <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 mt-1">Funded (Active)</span>
                     {activeLoans.length > 0 && <div className="absolute -top-2 -right-2 bg-amber-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shadow-sm">{activeLoans.length}</div>}
                  </div>
                  <TimelineConnector />
                  <div className="flex flex-col items-center bg-slate-50 dark:bg-[#12151b] border border-slate-200 dark:border-borderc-dark p-4 rounded-xl flex-1 w-full relative">
                     <CheckCircle className="w-6 h-6 text-emerald-500 mb-2" />
                     <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">Phase 3</span>
                     <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 mt-1">Repaid</span>
                     {repaidLoans.length > 0 && <div className="absolute -top-2 -right-2 bg-emerald-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shadow-sm">{repaidLoans.length}</div>}
                  </div>
               </div>
            </div>

            {/* My Loans */}
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4 tracking-tight">Active Operations</h2>
              {myLoans.length > 0 ? (
                <div className="grid sm:grid-cols-2 gap-5">
                  {myLoans.map(loan => (
                    <LoanCard key={loan.loanId} loan={loan} currentUserId={user?.userId} />
                  ))}
                </div>
              ) : (
                <div className="dashboard-card py-20 text-center">
                  <p className="text-slate-500 font-medium mb-5">No financial operations registered to this address.</p>
                  <div className="flex gap-4 justify-center">
                    <Link to="/borrow" className="btn-secondary py-2.5 px-6">Request Capital</Link>
                    <Link to="/lend" className="btn-primary py-2.5 px-6">Deploy Capital</Link>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar / Score Diagnostics */}
          <div className="space-y-6">
            <div className="dashboard-card p-6">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-5 tracking-tight border-b border-slate-200 dark:border-surface-800 pb-3">Score Breakdown</h3>
              <div className="space-y-4">
                <div className="bg-slate-50 dark:bg-surface-950 border border-slate-200 dark:border-surface-800 p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <div className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider mb-1">On-Time Settlements</div>
                    <div className="text-xl font-bold text-emerald-600 dark:text-emerald-500">{user?.onTimeRepayments || 0}</div>
                  </div>
                  <div className="text-xs text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-100 dark:bg-emerald-500/20 border border-emerald-200 dark:border-emerald-500/30 px-2 py-1 rounded shadow-sm dark:shadow-none">+{(user?.onTimeRepayments || 0) * 20} pts</div>
                </div>
                <div className="bg-slate-50 dark:bg-surface-950 border border-slate-200 dark:border-surface-800 p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <div className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider mb-1">Default Events</div>
                    <div className="text-xl font-bold text-rose-600 dark:text-rose-500">{user?.missedPayments || 0}</div>
                  </div>
                  <div className="text-xs text-rose-700 dark:text-rose-400 font-bold bg-rose-100 dark:bg-rose-500/20 border border-rose-200 dark:border-rose-500/30 px-2 py-1 rounded shadow-sm dark:shadow-none">-{(user?.missedPayments || 0) * 30} pts</div>
                </div>
                <div className="bg-slate-50 dark:bg-surface-950 border border-slate-200 dark:border-surface-800 p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <div className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider mb-1">Open Contracts</div>
                    <div className="text-xl font-bold text-amber-600 dark:text-amber-500">{user?.activeLoans || 0}</div>
                  </div>
                  <div className="text-xs text-amber-700 dark:text-amber-400 font-bold bg-amber-100 dark:bg-amber-500/20 border border-amber-200 dark:border-amber-500/30 px-2 py-1 rounded shadow-sm dark:shadow-none">-{(user?.activeLoans || 0) * 10} pts</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
