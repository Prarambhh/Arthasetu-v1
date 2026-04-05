import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getMyWallet } from '../api';
import { formatAddress } from '../utils/wallet';
import { Wallet as WalletIcon, ArrowDownRight, ArrowUpRight, Clock, AlertCircle } from 'lucide-react';

export default function Wallet() {
  const { user } = useAuth();
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getMyWallet()
      .then(res => {
        setWallet(res.data.data.wallet);
        setTransactions(res.data.data.transactions || []);
      })
      .catch(err => setError(err.response?.data?.error || 'Failed to load ledger'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="min-h-screen pt-24 px-4 flex items-center justify-center">
      <div className="flex items-center gap-2 text-slate-500 font-medium">Loading internal ledger...</div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen pt-24 px-4 flex items-center justify-center">
      <div className="dashboard-card p-8 text-center max-w-md w-full border-rose-200 bg-rose-50 dark:bg-rose-900/10 dark:border-rose-500/20">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">Ledger Error</h2>
        <p className="text-slate-500 mt-2">{error}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-3">
            <WalletIcon className="w-8 h-8 text-bitcoin-500" /> Internal Ledger
          </h1>
          <p className="text-slate-500 mt-2 font-medium">Immutable transaction history for cryptographic identity <span className="font-mono text-xs">{formatAddress(user?.walletAddress)}</span></p>
        </div>

        {/* Balance Card */}
        <div className="dashboard-card overflow-hidden">
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 dark:from-surface-900 dark:to-surface-950 p-8 text-white relative">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <WalletIcon className="w-32 h-32" />
            </div>
            <div className="relative z-10">
              <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-2">Available Balance</h2>
              <div className="text-5xl font-extrabold font-mono tracking-tight text-emerald-400">
                ₹{Number(wallet?.balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <div className="mt-6 inline-flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-lg text-sm font-medium backdrop-blur-md">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Instant Settlement Active
              </div>
            </div>
          </div>
        </div>

        {/* Transactions */}
        <div className="dashboard-card p-0 overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-200 dark:border-surface-800 bg-slate-50 dark:bg-surface-900/50">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg">Transaction History</h3>
          </div>
          
          <div className="divide-y divide-slate-100 dark:divide-surface-800">
            {transactions.length === 0 ? (
              <div className="p-10 text-center text-slate-500 font-medium">
                No transactions recorded in the standard ledger.
              </div>
            ) : (
              transactions.map((tx) => {
                const isDebit = tx.debit_wallet_id === wallet.id;
                const Icon = isDebit ? ArrowUpRight : ArrowDownRight;
                
                return (
                  <div key={tx.id} className="p-5 sm:px-6 hover:bg-slate-50 dark:hover:bg-surface-900/30 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        isDebit 
                          ? 'bg-rose-100 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400' 
                          : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
                      }`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 dark:text-slate-100 text-[15px]">
                          {isDebit ? 'Capital Sent' : 'Capital Received'}
                        </div>
                        <div className="text-xs text-slate-500 mt-1 flex items-center gap-1 font-medium">
                          <Clock className="w-3 h-3" />
                          {new Date(tx.created_at).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right sm:ml-auto pl-14 sm:pl-0">
                      <div className={`text-lg font-bold font-mono tracking-tight ${
                        isDebit ? 'text-slate-900 dark:text-slate-100' : 'text-emerald-600 dark:text-emerald-400'
                      }`}>
                        {isDebit ? '-' : '+'}₹{Number(tx.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                      <div className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mt-1">
                        Loan Ref: {tx.loan_id.substring(0, 8)}...
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
