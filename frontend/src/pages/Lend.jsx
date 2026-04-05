import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getPendingBroadcasts, acceptLoan } from '../api';
import { LoanCard } from '../components/LoanCard';
import { TrendingUp, Search, Loader, AlertCircle, Wallet } from 'lucide-react';

export default function Lend() {
  const { user, refreshUser } = useAuth();
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [funding, setFunding] = useState(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    getPendingBroadcasts()
      .then(res => {
        // Map V2 data format to component expectations
        const mapped = res.data.data.map(l => ({
          ...l,
          loanId: l.id,
          borrowerId: l.borrower_id,
          createdAt: l.requested_at,
          status: l.status.toUpperCase(), // 'requested' -> 'REQUESTED'
          borrowerTier: 'MODERATE', // Mocked mapping
          borrowerScore: 50,        // Mocked mapping
          durationDays: 30          // Term no longer explicitly stored in V2
        }));
        setLoans(mapped);
      })
      .finally(() => setLoading(false));
  }, []);

  const pending = loans.filter(l => {
    if (l.status !== 'REQUESTED') return false;
    if (l.borrowerId === user?.userId) return false;
    if (search && !l.borrowerName?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter === 'prime' && l.borrowerTier !== 'PRIME') return false;
    if (filter === 'trusted' && !['TRUSTED', 'PRIME'].includes(l.borrowerTier)) return false;
    if (filter === 'low-risk' && !['TRUSTED', 'PRIME', 'MODERATE'].includes(l.borrowerTier)) return false;
    return true;
  });

  const handleFund = async (loanId, interestRate) => {
    setFunding(loanId);
    setError('');
    try {
      await acceptLoan(loanId, interestRate);
      const res = await getPendingBroadcasts();
      const mapped = res.data.data.map(l => ({ ...l, loanId: l.id, borrowerId: l.borrower_id, createdAt: l.requested_at, status: l.status.toUpperCase() }));
      setLoans(mapped);
      await refreshUser();
    } catch (err) {
      setError(err.response?.data?.error || 'Allocation error');
    } finally {
      setFunding(null);
    }
  };

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
            <p className="text-slate-500 xl:text-slate-400 ml-[52px] text-sm">Deploy liquidity to trust-verified counterparts.</p>
          </div>
          {user && (
            <div className="bg-white dark:bg-surface-800 border border-slate-200 dark:border-surface-700 px-5 py-2.5 rounded-xl flex items-center gap-3 shadow-fintech-light dark:shadow-none transition-all">
              <Wallet className="w-5 h-5 text-bitcoin-600 dark:text-bitcoin-500" />
              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-0.5">Available Liquidity</span>
                <span className="text-bitcoin-600 dark:text-bitcoin-400 font-bold font-mono tracking-tight text-lg leading-none">₹{(user.balance || 0).toLocaleString('en-IN')}</span>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="flex items-center gap-2 p-4 rounded-lg bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-500 text-sm font-medium shadow-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />{error}
          </div>
        )}

        {/* Filters Panel */}
        <div className="flex flex-col sm:flex-row gap-3 bg-white dark:bg-surface-900 p-2 sm:p-2.5 rounded-2xl border border-slate-200 dark:border-surface-800 shadow-fintech-light dark:shadow-none transition-all">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
            <input
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-surface-950 border border-slate-200 dark:border-surface-800 rounded-xl text-sm text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-bitcoin-500/50 focus:border-bitcoin-500 transition-all font-medium placeholder-slate-400 dark:placeholder-slate-600"
              placeholder="Query counterparty..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0 items-center px-1 snap-x">
            {[
              { id: 'all', label: 'All Segments' },
              { id: 'low-risk', label: 'Low Risk (≥ Mod)' },
              { id: 'trusted', label: 'Trusted (≥ Trusted)' },
              { id: 'prime', label: 'Prime Only' }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`snap-center px-4 py-2.5 rounded-xl text-[11px] uppercase tracking-wider font-bold whitespace-nowrap transition-all shadow-sm ${
                  filter === f.id
                    ? 'bg-bitcoin-500 border border-bitcoin-600 text-white shadow-md dark:shadow-glow-orange dark:border-bitcoin-400'
                    : 'bg-white dark:bg-surface-800 border border-slate-200 dark:border-surface-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-surface-700'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* List UI */}
        {loading ? (
          <div className="flex items-center justify-center py-24 text-slate-500 font-medium font-mono text-sm uppercase tracking-widest">
            <Loader className="w-5 h-5 animate-spin mr-3" /> Fetching order book...
          </div>
        ) : pending.length === 0 ? (
          <div className="bg-white dark:bg-surface-900 border border-slate-200 dark:border-surface-800 rounded-2xl py-24 text-center shadow-fintech-light dark:shadow-none">
            <p className="text-slate-700 dark:text-slate-300 font-bold text-lg mb-2 tracking-tight">No valid allocations found</p>
            <p className="text-slate-500 text-sm">The order book is currently empty for these parameters.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-6">
            {pending.map(loan => (
              <div key={loan.loanId} className={funding === loan.loanId ? 'opacity-50 pointer-events-none filter blur-[1px] transition-all' : ''}>
                <LoanCard
                  loan={loan}
                  currentUserId={user?.userId}
                  onFund={handleFund}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
