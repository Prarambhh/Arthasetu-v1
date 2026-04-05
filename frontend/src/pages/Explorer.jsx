import { useState } from 'react';
import { useWeb3 } from '../context/Web3Context';
import { useContractEvents, useOnChainLoans } from '../utils/useContractEvents';
import { formatAUSD, formatBytes32, ON_CHAIN_STATUS, PROTOCOL_ADDRESS, AUSD_ADDRESS } from '../contracts';
import { ethers } from 'ethers';
import { Blocks, ExternalLink, Loader, Search, Eye, Zap, ArrowRight, CheckCircle, Wallet, RefreshCw, Copy } from 'lucide-react';

function EventRow({ event, type }) {
  const [expanded, setExpanded] = useState(false);
  const typeColors = {
    LoanCreated: 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border-blue-200 dark:border-blue-500/20',
    LoanFunded: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20',
    LoanRepaid: 'bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400 border-purple-200 dark:border-purple-500/20',
    GuarantorApproved: 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border-amber-200 dark:border-amber-500/20',
  };

  const typeIcons = {
    LoanCreated: '📝',
    LoanFunded: '💰',
    LoanRepaid: '✅',
    GuarantorApproved: '🛡️',
  };

  return (
    <div className="border-b border-slate-100 dark:border-surface-800 last:border-b-0">
      <div
        onClick={() => setExpanded(!expanded)}
        className="p-4 sm:px-6 hover:bg-slate-50 dark:hover:bg-surface-900/30 transition-colors cursor-pointer flex items-center gap-4"
      >
        <div className="text-2xl w-10 text-center shrink-0">{typeIcons[type]}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${typeColors[type]}`}>
              {type}
            </span>
            <span className="text-[10px] font-mono text-slate-400">Block #{event.blockNumber}</span>
          </div>
          <div className="text-xs font-mono text-slate-500 mt-1 truncate">
            Loan: {formatBytes32(event.loanId)}
          </div>
        </div>
        <div className="text-right shrink-0">
          {event.amount && (
            <div className="text-sm font-bold font-mono text-slate-800 dark:text-slate-100">
              {type === 'LoanFunded' ? `${Number(event.amount).toLocaleString()} BPS` : formatAUSD(event.amount)}
            </div>
          )}
          <div className="text-[10px] font-mono text-slate-400">{event.address?.slice(0, 8)}…</div>
        </div>
        <Eye className={`w-4 h-4 shrink-0 ${expanded ? 'text-bitcoin-500' : 'text-slate-300 dark:text-slate-600'} transition-colors`} />
      </div>
      {expanded && (
        <div className="px-6 pb-4 pt-0 animate-fade-in">
          <div className="bg-slate-50 dark:bg-surface-950 rounded-xl border border-slate-200 dark:border-surface-800 p-4 space-y-2 text-xs">
            <div className="flex justify-between"><span className="text-slate-500 font-semibold">Transaction Hash</span><span className="font-mono text-bitcoin-600 dark:text-bitcoin-400 break-all text-right max-w-[300px]">{event.txHash}</span></div>
            <div className="flex justify-between"><span className="text-slate-500 font-semibold">Loan ID (bytes32)</span><span className="font-mono text-slate-600 dark:text-slate-400 break-all text-right max-w-[300px]">{event.loanId}</span></div>
            <div className="flex justify-between"><span className="text-slate-500 font-semibold">Address</span><span className="font-mono text-slate-600 dark:text-slate-400">{event.address}</span></div>
            <div className="flex justify-between"><span className="text-slate-500 font-semibold">Block Number</span><span className="font-mono text-slate-600 dark:text-slate-400">{event.blockNumber}</span></div>
            {event.amount && <div className="flex justify-between"><span className="text-slate-500 font-semibold">Value (raw)</span><span className="font-mono text-slate-600 dark:text-slate-400">{event.amount?.toString()}</span></div>}
          </div>
        </div>
      )}
    </div>
  );
}

function OnChainLoanInspector({ loan }) {
  const [expanded, setExpanded] = useState(false);
  const statusColor = {
    REQUESTED: 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
    DISBURSED: 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',
    SETTLED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
    REJECTED: 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400',
  };

  return (
    <div className="border-b border-slate-100 dark:border-surface-800">
      <div onClick={() => setExpanded(!expanded)} className="p-4 sm:px-6 cursor-pointer hover:bg-slate-50 dark:hover:bg-surface-900/30 transition-colors flex items-center gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${statusColor[loan.statusLabel] || ''}`}>{loan.statusLabel}</span>
            <span className="text-sm font-bold font-mono text-slate-800 dark:text-slate-100">{formatAUSD(loan.principalAmount)} AUSD</span>
          </div>
          <span className="text-[10px] font-mono text-slate-400 mt-1 block">{formatBytes32(loan.loanId)}</span>
        </div>
        <Eye className={`w-4 h-4 ${expanded ? 'text-bitcoin-500' : 'text-slate-300 dark:text-slate-600'}`} />
      </div>
      {expanded && (
        <div className="px-6 pb-4 animate-fade-in">
          <div className="bg-slate-50 dark:bg-surface-950 rounded-xl border border-slate-200 dark:border-surface-800 p-4 space-y-2 text-xs">
            <div className="flex justify-between"><span className="text-slate-500 font-semibold">Borrower</span><span className="font-mono text-slate-600 dark:text-slate-400">{loan.borrower}</span></div>
            <div className="flex justify-between"><span className="text-slate-500 font-semibold">Lender</span><span className="font-mono text-slate-600 dark:text-slate-400">{loan.lender === ethers.ZeroAddress ? '—' : loan.lender}</span></div>
            <div className="flex justify-between"><span className="text-slate-500 font-semibold">Principal</span><span className="font-mono">{formatAUSD(loan.principalAmount)} AUSD</span></div>
            <div className="flex justify-between"><span className="text-slate-500 font-semibold">Outstanding</span><span className="font-mono text-rose-600 dark:text-rose-400">{formatAUSD(loan.outstandingPrincipal)} AUSD</span></div>
            <div className="flex justify-between"><span className="text-slate-500 font-semibold">Interest Rate</span><span className="font-mono">{Number(loan.interestRateBps)} BPS ({(Number(loan.interestRateBps) / 100).toFixed(1)}%)</span></div>
            <div className="flex justify-between"><span className="text-slate-500 font-semibold">Disbursed At</span><span className="font-mono">{loan.disbursedAt ? new Date(loan.disbursedAt * 1000).toLocaleString() : '—'}</span></div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Explorer() {
  const { account, provider } = useWeb3();
  const { loanEvents, fundEvents, repayEvents, guarantorEvents, loading: eventsLoading, refresh } = useContractEvents();
  const { loans, loading: loansLoading } = useOnChainLoans();
  const [tab, setTab] = useState('events');
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const allEvents = [
    ...loanEvents.map(e => ({ ...e, _type: 'LoanCreated' })),
    ...fundEvents.map(e => ({ ...e, _type: 'LoanFunded' })),
    ...repayEvents.map(e => ({ ...e, _type: 'LoanRepaid' })),
    ...guarantorEvents.map(e => ({ ...e, _type: 'GuarantorApproved' })),
  ].sort((a, b) => b.blockNumber - a.blockNumber);

  const filteredEvents = allEvents.filter(e => {
    if (filter !== 'all' && e._type !== filter) return false;
    if (search && !e.txHash?.toLowerCase().includes(search.toLowerCase()) && !e.loanId?.toLowerCase().includes(search.toLowerCase()) && !e.address?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const loading = eventsLoading || loansLoading;

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-white dark:bg-surface-900 border border-slate-200 dark:border-surface-800 flex items-center justify-center shadow-sm">
                <Blocks className="w-5 h-5 text-slate-600 dark:text-slate-300" />
              </div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">On-Chain Explorer</h1>
            </div>
            <p className="text-slate-500 ml-[52px] text-sm">Inspect smart contract events and loan state directly from the blockchain.</p>
          </div>
          <button onClick={refresh} className="btn-secondary py-2 px-4 text-sm flex items-center gap-1.5" disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>

        {/* Contract Address Cards */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="dashboard-card p-4 flex items-center gap-3">
            <Zap className="w-5 h-5 text-bitcoin-500 shrink-0" />
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-0.5">Lending Protocol</div>
              <div className="text-xs font-mono text-slate-600 dark:text-slate-400 truncate">{PROTOCOL_ADDRESS}</div>
            </div>
          </div>
          <div className="dashboard-card p-4 flex items-center gap-3">
            <Wallet className="w-5 h-5 text-emerald-500 shrink-0" />
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-0.5">AUSD Token</div>
              <div className="text-xs font-mono text-slate-600 dark:text-slate-400 truncate">{AUSD_ADDRESS}</div>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-100 dark:bg-surface-900 p-1 rounded-xl">
          {[
            { id: 'events', label: 'Contract Events', count: allEvents.length },
            { id: 'loans', label: 'Loan State', count: loans.length },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                tab === t.id ? 'bg-white dark:bg-surface-800 text-slate-900 dark:text-slate-100 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              {t.label}
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${tab === t.id ? 'bg-bitcoin-500 text-white' : 'bg-slate-200 dark:bg-surface-700 text-slate-500'}`}>{t.count}</span>
            </button>
          ))}
        </div>

        {/* Events Tab */}
        {tab === 'events' && (
          <>
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 bg-white dark:bg-surface-900 p-2.5 rounded-2xl border border-slate-200 dark:border-surface-800">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-surface-950 border border-slate-200 dark:border-surface-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-bitcoin-500/50 font-medium placeholder-slate-400"
                  placeholder="Search by tx hash, loan ID, or address..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0 items-center">
                {['all', 'LoanCreated', 'LoanFunded', 'LoanRepaid', 'GuarantorApproved'].map(f => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-3 py-2 rounded-lg text-[10px] uppercase tracking-wider font-bold whitespace-nowrap transition-all ${
                      filter === f
                        ? 'bg-bitcoin-500 text-white border border-bitcoin-600 shadow-sm'
                        : 'bg-white dark:bg-surface-800 border border-slate-200 dark:border-surface-700 text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {f === 'all' ? 'All' : f.replace('Loan', '').replace('Guarantor', 'Guar. ')}
                  </button>
                ))}
              </div>
            </div>

            <div className="dashboard-card p-0 overflow-hidden">
              {loading ? (
                <div className="p-16 text-center text-slate-500 flex items-center justify-center gap-2"><Loader className="w-5 h-5 animate-spin" /> Reading contract events...</div>
              ) : filteredEvents.length === 0 ? (
                <div className="p-16 text-center text-slate-500">No events found.</div>
              ) : (
                filteredEvents.map((event, i) => (
                  <EventRow key={`${event.txHash}-${i}`} event={event} type={event._type} />
                ))
              )}
            </div>
          </>
        )}

        {/* Loans Tab */}
        {tab === 'loans' && (
          <div className="dashboard-card p-0 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-surface-800 bg-slate-50 dark:bg-surface-900/50 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 dark:text-slate-100">On-Chain Loan State (Active Contract Storage)</h3>
              <span className="text-xs text-slate-400 font-mono">{loans.length} loans</span>
            </div>
            {loading ? (
              <div className="p-16 text-center text-slate-500 flex items-center justify-center gap-2"><Loader className="w-5 h-5 animate-spin" /> Reading loan state...</div>
            ) : loans.length === 0 ? (
              <div className="p-16 text-center text-slate-500">No loans on chain yet.</div>
            ) : (
              loans.map(loan => <OnChainLoanInspector key={loan.loanId} loan={loan} />)
            )}
          </div>
        )}
      </div>
    </div>
  );
}
