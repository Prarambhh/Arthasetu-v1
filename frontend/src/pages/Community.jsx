import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAllUsers } from '../api';
import { TrustTierBadge } from '../components/TrustTierBadge';
import { Trophy, ChevronRight, Activity, Zap } from 'lucide-react';

export default function Community() {
  const [board, setBoard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllUsers()
      .then(res => setBoard(res.data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-5xl mx-auto space-y-8">
        
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="w-16 h-16 rounded-2xl bg-bitcoin-50 dark:bg-bitcoin-500/10 border border-bitcoin-200 dark:border-bitcoin-500/20 flex items-center justify-center mx-auto mb-6 shadow-sm dark:shadow-none">
            <Trophy className="w-8 h-8 text-bitcoin-600 dark:text-bitcoin-500" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight font-heading mb-3">Institutional Leaderboard</h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
            Actors are ranked cryptographically by algorithmic trust evaluation. Superior settlement behavior enables increased capital boundaries.
          </p>
        </div>

        {loading ? (
          <div className="text-center py-20 text-slate-500 font-mono tracking-widest text-sm uppercase">Loading matrix...</div>
        ) : (
          <div className="dashboard-card overflow-hidden">
            <div className="grid grid-cols-[auto_1fr_auto_auto] gap-4 p-4 border-b border-slate-200 dark:border-surface-800 text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-50 dark:bg-[#12151b]">
              <div className="w-12 text-center text-slate-400">Rank</div>
              <div>Identity</div>
              <div className="hidden sm:block text-right pr-8">Contracts Settled</div>
              <div className="w-32 text-right">Credit Profile</div>
            </div>
            
            <div className="divide-y divide-slate-100 dark:divide-surface-800/50">
              {board.map((user, i) => (
                <Link 
                  to={`/profile/${user.userId}`} 
                  key={user.userId}
                  className="grid grid-cols-[auto_1fr_auto_auto] gap-4 p-4 items-center hover:bg-slate-50 dark:hover:bg-surface-800 transition-colors group cursor-pointer"
                >
                  <div className="w-12 text-center font-bold text-slate-900 dark:text-slate-100">
                    #{i + 1}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-surface-950 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-surface-700">
                      {user.username[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="font-semibold text-sm text-slate-800 dark:text-slate-200 group-hover:text-bitcoin-600 dark:group-hover:text-bitcoin-400 transition-colors">{user.username}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{user.walletAddress.slice(0,10)}...</div>
                      <div
                        className="text-[9px] text-slate-400 font-mono mt-0.5 cursor-pointer hover:text-bitcoin-500 transition-colors flex items-center gap-1"
                        title="Click to copy User ID"
                        onClick={(e) => { e.preventDefault(); navigator.clipboard.writeText(user.userId); }}
                      >
                        ID: {user.userId.slice(0, 16)}… <span className="text-[8px] bg-slate-100 dark:bg-surface-800 px-1 rounded">copy</span>
                      </div>
                    </div>
                  </div>
                  <div className="hidden sm:block text-right pr-8 font-mono font-bold text-slate-700 dark:text-slate-400">
                    {user.onTimeRepayments}
                  </div>
                  <div className="w-32 flex items-center justify-end gap-3">
                    <TrustTierBadge tier={user.trustTier} score={user.creditScore} />
                    <ChevronRight className="w-4 h-4 text-slate-400 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
