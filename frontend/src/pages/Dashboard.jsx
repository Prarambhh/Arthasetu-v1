import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWeb3 } from '../context/Web3Context';
import { useOnChainLoans } from '../utils/useContractEvents';
import { formatAUSD, formatBytes32, ON_CHAIN_STATUS } from '../contracts';
import { ethers } from 'ethers';
import { TrendingUp, TrendingDown, Clock, CheckCircle, AlertTriangle, Wallet, ArrowRight, ShieldCheck, FileText, Banknote, Loader, ExternalLink, Zap } from 'lucide-react';

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

function OnChainLoanMiniCard({ loan, currentAccount }) {
  const isBorrower = loan.borrower?.toLowerCase() === currentAccount?.toLowerCase();
  const isLender = loan.lender?.toLowerCase() === currentAccount?.toLowerCase();
  const amount = formatAUSD(loan.principalAmount);
  const statusColor = {
    REQUESTED: 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border-amber-200 dark:border-amber-500/20',
    DISBURSED: 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border-blue-200 dark:border-blue-500/20',
    SETTLED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20',
    REJECTED: 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border-rose-200 dark:border-rose-500/20',
  };

  return (
    <Link to={`/loan/${loan.loanId}`} className="dashboard-card p-4 hover:border-bitcoin-500/40 transition-all group cursor-pointer block">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="text-xl font-bold font-mono text-slate-800 dark:text-slate-100">{amount} <span className="text-sm text-slate-400">AUSD</span></div>
          <div className="flex items-center gap-2 mt-1">
            {isBorrower && <span className="text-[9px] uppercase tracking-widest font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-500/20">Borrower</span>}
            {isLender && <span className="text-[9px] uppercase tracking-widest font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-500/20">Lender</span>}
          </div>
        </div>
        <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${statusColor[loan.statusLabel] || statusColor.REQUESTED}`}>
          {loan.statusLabel}
        </span>
      </div>
      <div className="flex justify-between items-center text-xs">
        <span className="font-mono text-[10px] text-slate-400">{formatBytes32(loan.loanId)}</span>
        <span className="text-slate-400 font-mono text-[10px]">Block #{loan.blockNumber}</span>
      </div>
      <div className="mt-2 pt-2 border-t border-slate-200 dark:border-surface-800 text-[10px] font-bold text-bitcoin-500 group-hover:text-bitcoin-400 flex items-center gap-1 transition-colors">
        View Details <ArrowRight className="w-3 h-3" />
      </div>
    </Link>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { account, ausdBalance, connectWallet, connecting } = useWeb3();
  const { loans, loading, refresh } = useOnChainLoans();

  // Filter loans by current account involvement
  const myLoans = loans.filter(l =>
    l.borrower?.toLowerCase() === account?.toLowerCase() ||
    l.lender?.toLowerCase() === account?.toLowerCase()
  );

  const requestedLoans = myLoans.filter(l => l.status === 0); // REQUESTED
  const activeLoans = myLoans.filter(l => l.status === 4); // DISBURSED
  const settledLoans = myLoans.filter(l => l.status === 5); // SETTLED

  const [activeFilter, setActiveFilter] = useState('all');

  const filteredLoans = myLoans.filter(loan => {
    const isBorrower = loan.borrower?.toLowerCase() === account?.toLowerCase();
    const isLender = loan.lender?.toLowerCase() === account?.toLowerCase();
    if (activeFilter === 'borrowing') return isBorrower;
    if (activeFilter === 'lending') return isLender;
    return true;
  });

  if (loading) return (
    <div className="min-h-screen bg-surface-light_alt dark:bg-surface-dark_alt flex items-center justify-center pt-20">
      <div className="text-slate-500 font-medium tracking-wide flex items-center gap-2">
        <Loader className="w-5 h-5 animate-spin" /> Reading on-chain state...
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
              {account ? (
                <p className="text-slate-500 font-mono text-xs font-semibold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  {account?.slice(0, 6)}…{account?.slice(-4)}
                </p>
              ) : (
                <button onClick={connectWallet} disabled={connecting} className="text-xs font-bold text-bitcoin-500 hover:underline">
                  {connecting ? 'Connecting...' : 'Connect MetaMask →'}
                </button>
              )}
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
          <Stat
            label="AUSD Balance"
            value={account ? `${Number(ausdBalance).toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : '—'}
            sub={account ? 'On-Chain (ERC-20)' : 'Connect MetaMask'}
            color="text-emerald-600 dark:text-emerald-400"
            icon={Wallet}
          />
          <Stat label="Credit Score" value={user?.creditScore ?? 50} sub={`Max Allowance ${(user?.creditScore || 50) * 100} AUSD`} color="text-bitcoin-500" border="border-bitcoin-500/30" icon={ShieldCheck} />
          <Stat label="Active Contracts" value={activeLoans.length} color="text-amber-500" icon={Clock} />
          <Stat label="Settled Contracts" value={settledLoans.length} color="text-emerald-500" icon={CheckCircle} />
        </div>

        {/* On-chain indicator */}
        <div className="dashboard-card px-5 py-3.5 flex items-center gap-3 border-emerald-500/50">
          <ExternalLink className="w-5 h-5 text-bitcoin-500 shrink-0" />
          <div>
            <span className="font-bold text-sm text-emerald-600 dark:text-emerald-500">On-Chain Protocol Active</span>
            <span className="text-slate-500 text-xs ml-3 font-mono border-l border-slate-300 dark:border-surface-700 pl-3">{loans.length} Total Loans on Chain</span>
          </div>
          <Link to="/explorer" className="ml-auto text-xs font-semibold text-bitcoin-600 dark:text-bitcoin-400 hover:text-bitcoin-700 dark:hover:text-bitcoin-300 flex items-center gap-1 bg-bitcoin-50 dark:bg-bitcoin-500/10 px-3 py-1.5 rounded-md transition-colors border border-bitcoin-200 dark:border-bitcoin-500/30 shadow-sm dark:shadow-none">
            Inspect Ledger <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Action Flow */}
          <div className="lg:col-span-2 space-y-6">
            <div className="dashboard-card p-6 border-t-4 border-t-bitcoin-500">
               <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-6 tracking-tight text-lg">Transaction Lifecycle</h3>
               <div className="flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-2">
                  <div className="flex flex-col items-center bg-slate-50 dark:bg-[#12151b] border border-slate-200 dark:border-borderc-dark p-4 rounded-xl flex-1 w-full relative">
                     <FileText className="w-6 h-6 text-slate-400 mb-2" />
                     <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">Phase 1</span>
                     <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 mt-1">Requested</span>
                     {requestedLoans.length > 0 && <div className="absolute -top-2 -right-2 bg-bitcoin-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shadow-sm">{requestedLoans.length}</div>}
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
                     <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 mt-1">Settled</span>
                     {settledLoans.length > 0 && <div className="absolute -top-2 -right-2 bg-emerald-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shadow-sm">{settledLoans.length}</div>}
                  </div>
               </div>
            </div>

            {/* My On-Chain Loans */}
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4">
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
                  <ExternalLink className="w-4 h-4 text-bitcoin-500" /> On-Chain Operations
                </h2>

                <div className="flex bg-slate-100 dark:bg-surface-900 p-1 rounded-lg self-start sm:self-auto overflow-x-auto max-w-full hide-scrollbar">
                  {['all', 'borrowing', 'lending'].map(filter => (
                    <button
                      key={filter}
                      onClick={() => setActiveFilter(filter)}
                      className={`px-4 py-1.5 text-xs font-bold rounded-md capitalize whitespace-nowrap transition-all ${
                        activeFilter === filter
                          ? 'bg-white dark:bg-surface-800 text-slate-900 dark:text-slate-100 shadow-sm'
                          : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                      }`}
                    >
                      {filter === 'lending' ? 'Your Lending' : filter === 'borrowing' ? 'Your Borrowing' : filter}
                    </button>
                  ))}
                </div>
              </div>

              {filteredLoans.length > 0 ? (
                <div className="grid sm:grid-cols-2 gap-5">
                  {filteredLoans.map(loan => (
                    <OnChainLoanMiniCard key={loan.loanId} loan={loan} currentAccount={account} />
                  ))}
                </div>
              ) : (
                <div className="dashboard-card py-20 text-center">
                  <p className="text-slate-500 font-medium mb-5">No on-chain operations found for this address.</p>
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
                    <div className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider mb-1">Settled Contracts</div>
                    <div className="text-xl font-bold text-emerald-600 dark:text-emerald-500">{settledLoans.length}</div>
                  </div>
                  <div className="text-xs text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-100 dark:bg-emerald-500/20 border border-emerald-200 dark:border-emerald-500/30 px-2 py-1 rounded shadow-sm dark:shadow-none">On-Chain ✓</div>
                </div>
                <div className="bg-slate-50 dark:bg-surface-950 border border-slate-200 dark:border-surface-800 p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <div className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider mb-1">Active Contracts</div>
                    <div className="text-xl font-bold text-amber-600 dark:text-amber-500">{activeLoans.length}</div>
                  </div>
                  <div className="text-xs text-amber-700 dark:text-amber-400 font-bold bg-amber-100 dark:bg-amber-500/20 border border-amber-200 dark:border-amber-500/30 px-2 py-1 rounded shadow-sm dark:shadow-none">On-Chain ✓</div>
                </div>
                <div className="bg-slate-50 dark:bg-surface-950 border border-slate-200 dark:border-surface-800 p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <div className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider mb-1">Pending Requests</div>
                    <div className="text-xl font-bold text-blue-600 dark:text-blue-500">{requestedLoans.length}</div>
                  </div>
                  <div className="text-xs text-blue-700 dark:text-blue-400 font-bold bg-blue-100 dark:bg-blue-500/20 border border-blue-200 dark:border-blue-500/30 px-2 py-1 rounded shadow-sm dark:shadow-none">On-Chain ✓</div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="dashboard-card p-6">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-4 tracking-tight border-b border-slate-200 dark:border-surface-800 pb-3">Quick Actions</h3>
              <div className="space-y-3">
                <Link to="/wallet" className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-surface-950 border border-slate-200 dark:border-surface-800 hover:border-bitcoin-500/40 transition-all group">
                  <Wallet className="w-5 h-5 text-bitcoin-500" />
                  <div>
                    <div className="text-sm font-bold text-slate-800 dark:text-slate-100 group-hover:text-bitcoin-500 transition-colors">Claim Test Tokens</div>
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">AUSD Faucet</div>
                  </div>
                </Link>
                <Link to="/explorer" className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-surface-950 border border-slate-200 dark:border-surface-800 hover:border-bitcoin-500/40 transition-all group">
                  <ExternalLink className="w-5 h-5 text-emerald-500" />
                  <div>
                    <div className="text-sm font-bold text-slate-800 dark:text-slate-100 group-hover:text-bitcoin-500 transition-colors">View On-Chain Events</div>
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Contract Explorer</div>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
