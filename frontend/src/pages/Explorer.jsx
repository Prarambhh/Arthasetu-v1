import { useEffect, useState } from 'react';
import { getChain } from '../api';
import { BlockCard } from '../components/BlockCard';
import { ChainVerifier } from '../components/ChainVerifier';
import { Blocks, Activity, Hash, Layers } from 'lucide-react';

export default function Explorer() {
  const [chain, setChain] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');

  useEffect(() => {
    getChain()
      .then(res => setChain(res.data.reverse()))
      .finally(() => setLoading(false));
  }, []);

  const filteredChain = chain.filter(b => filter === 'ALL' || b.type === filter);

  const stats = {
    total: chain.length,
    users: chain.filter(b => b.type === 'USER_REGISTERED').length,
    loans: chain.filter(b => b.type === 'LOAN_CREATED').length,
    funded: chain.filter(b => b.type === 'LOAN_FUNDED').length,
    repaid: chain.filter(b => b.type === 'LOAN_REPAID').length,
  };

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-surface-800 pb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-bitcoin-500 text-white flex items-center justify-center shadow-md dark:shadow-glow-orange">
                <Blocks className="w-5 h-5" />
              </div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight font-heading">Ledger Explorer</h1>
            </div>
            <p className="text-slate-600 dark:text-slate-400 ml-[52px] text-sm">Real-time unalterable record of all system events.</p>
          </div>
          <div className="flex items-center gap-3 bg-white dark:bg-surface-900 px-4 py-2 rounded-xl border border-slate-200 dark:border-surface-800 shadow-sm dark:shadow-none">
             <Activity className="w-4 h-4 text-emerald-500 animate-pulse" />
             <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">Network Operational</span>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 items-start">
          
          {/* Controls Sidebar */}
          <div className="space-y-6 lg:sticky lg:top-24">
            <ChainVerifier />

            <div className="dashboard-card p-5">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4 border-b border-slate-200 dark:border-surface-800 pb-3"><Layers className="w-4 h-4 text-bitcoin-500" /> Event Matrix</h3>
              <div className="space-y-2">
                {[
                  { id: 'ALL', label: 'All Operations', count: stats.total },
                  { id: 'USER_REGISTERED', label: 'Identities Provisioned', count: stats.users },
                  { id: 'LOAN_CREATED', label: 'Capital Requests', count: stats.loans },
                  { id: 'LOAN_FUNDED', label: 'Market Allocations', count: stats.funded },
                  { id: 'LOAN_REPAID', label: 'Contract Settlements', count: stats.repaid },
                ].map(f => (
                  <button
                    key={f.id}
                    onClick={() => setFilter(f.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      filter === f.id 
                      ? 'bg-bitcoin-50 dark:bg-bitcoin-500/20 text-bitcoin-700 dark:text-bitcoin-400 border border-bitcoin-200 dark:border-bitcoin-500/30 font-bold' 
                      : 'bg-slate-50 dark:bg-surface-950 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-surface-800 hover:border-slate-300 dark:hover:border-surface-600'
                    }`}
                  >
                    {f.label}
                    <span className={`px-2 rounded-md font-mono text-[10px] ${
                      filter === f.id ? 'bg-bitcoin-200 dark:bg-bitcoin-500/30' : 'bg-slate-200 dark:bg-surface-800'
                    }`}>{f.count}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Block Stream */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-2 mb-4 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest text-xs ml-2">
              <Hash className="w-4 h-4" /> Validated Blocks ({filteredChain.length})
            </div>
            {loading ? (
              <div className="text-center py-20 text-slate-500 font-mono text-sm tracking-widest uppercase">
                Synchronizing Ledger...
              </div>
            ) : filteredChain.length === 0 ? (
              <div className="text-center py-20 text-slate-500 dashboard-card">
                No blocks match the specific criteria.
              </div>
            ) : (
              <div className="space-y-4 max-w-full overflow-hidden">
                {filteredChain.map((block, i) => (
                  <div key={block.index} className="transition-all duration-300 hover:translate-x-1">
                    <BlockCard block={block} isLatest={i === 0 && filter === 'ALL'} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
