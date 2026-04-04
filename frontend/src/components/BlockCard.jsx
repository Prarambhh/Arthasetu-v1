import { Hash, Clock, ChevronDown, ChevronUp, UserCheck, FilePlus, Coins, CheckCircle, XCircle, Zap } from 'lucide-react';
import { useState } from 'react';

const TYPE_CONFIG = {
  GENESIS: { 
    icon: Zap,
    color: 'text-purple-600 bg-purple-50 border-purple-200 dark:text-purple-400 dark:bg-purple-500/10 dark:border-purple-500/20' 
  },
  USER_REGISTERED: { 
    icon: UserCheck,
    color: 'text-teal-600 bg-teal-50 border-teal-200 dark:text-teal-400 dark:bg-teal-500/10 dark:border-teal-500/20' 
  },
  LOAN_CREATED: { 
    icon: FilePlus,
    color: 'text-bitcoin-600 bg-bitcoin-50 border-bitcoin-200 dark:text-bitcoin-400 dark:bg-bitcoin-500/10 dark:border-bitcoin-500/20' 
  },
  LOAN_FUNDED: { 
    icon: Coins,
    color: 'text-amber-600 bg-amber-50 border-amber-200 dark:text-amber-500 dark:bg-amber-500/10 dark:border-amber-500/20' 
  },
  LOAN_REPAID: { 
    icon: CheckCircle,
    color: 'text-emerald-600 bg-emerald-50 border-emerald-200 dark:text-emerald-500 dark:bg-emerald-500/10 dark:border-emerald-500/20' 
  },
  LOAN_DEFAULTED: { 
    icon: XCircle,
    color: 'text-rose-600 bg-rose-50 border-rose-200 dark:text-rose-500 dark:bg-rose-500/10 dark:border-rose-500/20' 
  },
};

function shortHash(hash) {
  if (!hash) return '';
  return `${hash.slice(0, 8)}...${hash.slice(-8)}`;
}

function formatTime(ts) {
  return new Date(ts).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

export function BlockCard({ block, isLatest }) {
  const [expanded, setExpanded] = useState(false);
  const typeConfig = TYPE_CONFIG[block.type] || { icon: Hash, color: 'text-slate-500 bg-slate-100 border-slate-200 dark:text-slate-400 dark:bg-surface-800 dark:border-surface-700' };
  const TypeIcon = typeConfig.icon;

  return (
    <div className={`dashboard-card p-4 transition-all duration-300 ${isLatest ? 'border-bitcoin-500 ring-1 ring-bitcoin-500/20 dark:bg-[#12151b]' : ''}`}>
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-slate-500 text-xs font-mono font-medium">#{block.index}</span>
          {isLatest && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-bitcoin-500 text-white font-bold tracking-wider">LATEST</span>
          )}
          <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-md border flex items-center gap-1.5 ${typeConfig.color}`}>
            <TypeIcon className="w-3 h-3" />
            {block.type.replace('_', ' ')}
          </span>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors p-1"
        >
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Hash chain */}
      <div className="space-y-1.5 text-xs font-mono bg-slate-50 md:bg-white dark:bg-surface-950 p-3 rounded-lg border border-slate-200 dark:border-surface-800">
        <div className="flex items-center gap-3">
          <span className="text-slate-500 w-12 shrink-0 font-sans text-[11px] uppercase tracking-wider font-semibold">Hash</span>
          <span className="text-bitcoin-600 dark:text-bitcoin-400 truncate">{shortHash(block.hash)}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-slate-500 w-12 shrink-0 font-sans text-[11px] uppercase tracking-wider font-semibold">Prev</span>
          <span className="text-slate-400 dark:text-slate-500 truncate">{shortHash(block.prevHash)}</span>
        </div>
      </div>

      <div className="flex items-center gap-1.5 mt-3 text-xs text-slate-500 dark:text-slate-400 font-medium">
        <Clock className="w-3.5 h-3.5" />
        {formatTime(block.timestamp)}
      </div>

      {/* Expanded data */}
      {expanded && (
        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-surface-700/50">
          <p className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold mb-2">Transaction Payload</p>
          <pre className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-surface-950 rounded-lg p-3 border border-slate-200 dark:border-surface-800 overflow-auto max-h-48 leading-relaxed">
            {JSON.stringify(block.data, null, 2)}
          </pre>
          <div className="mt-3">
            <p className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold mb-2">SHA-256 Output</p>
            <div className="hash-display text-[10px] sm:text-xs">{block.hash}</div>
          </div>
        </div>
      )}
    </div>
  );
}
