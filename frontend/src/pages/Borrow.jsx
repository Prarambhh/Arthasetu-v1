import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWeb3 } from '../context/Web3Context';
import { loanIdToBytes32, parseAUSD, formatAUSD, formatBytes32 } from '../contracts';
import { syncOnChainLoan } from '../api';
import { TrendingDown, AlertCircle, CheckCircle, Loader, ShieldCheck, Wallet, ExternalLink } from 'lucide-react';

function RangePreview({ label, value, max, color }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
        <span>{label}</span>
        <span className={color}>{value.toLocaleString('en-IN')} Limit Utilized</span>
      </div>
      <div className="h-1.5 bg-slate-200 dark:bg-surface-800 rounded-full overflow-hidden border border-slate-300/50 dark:border-surface-700/50 shadow-inner">
        <div className={`h-full rounded-full transition-all duration-500 ${color.includes('rose') ? 'bg-rose-500' : 'bg-bitcoin-500'}`}
             style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function Borrow() {
  const { user } = useAuth();
  const { account, loansContract, ausdBalance, connectWallet, connecting } = useWeb3();
  const navigate = useNavigate();
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);

  const creditScore = user?.creditScore || 50;
  const maxLoan = creditScore * 100;
  const requestedAmount = Number(amount) || 0;
  const isOverLimit = requestedAmount > maxLoan;
  const isZero = requestedAmount <= 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!account) { setError('Please connect MetaMask first'); return; }
    if (!loansContract) { setError('Contract not connected'); return; }
    
    setLoading(true);
    setError('');
    try {
      // Generate a unique loan ID and convert to bytes32
      const uuid = crypto.randomUUID();
      const loanIdBytes32 = loanIdToBytes32(uuid);
      const amountWei = parseAUSD(requestedAmount);

      // Execute on-chain transaction via MetaMask
      const tx = await loansContract.createLoan(loanIdBytes32, amountWei);
      const receipt = await tx.wait();

      // Sync to backend bridging the on-chain bytes32 ID to off-chain document flow
      try {
        await syncOnChainLoan(uuid, requestedAmount); // Backend expects standard UUID
      } catch (syncErr) {
        alert('Failed to sync loan to backend: ' + (syncErr.response?.data?.error || syncErr.message));
        console.error('Failed to sync loan:', syncErr);
      }

      setSuccess({
        amount: requestedAmount,
        loanId: loanIdBytes32,
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
      });
    } catch (err) {
      console.error('On-chain createLoan failed:', err);
      if (err.code === 'ACTION_REJECTED') {
        setError('Transaction rejected in MetaMask');
      } else {
        setError(err.reason || err.message || 'Transaction failed');
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 pt-20">
        <div className="dashboard-card w-full max-w-md p-8 text-center border-t-4 border-t-emerald-500">
          <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 flex items-center justify-center mx-auto mb-6 shadow-sm dark:shadow-none">
            <CheckCircle className="w-8 h-8 text-emerald-600 dark:text-emerald-500" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2 tracking-tight">On-Chain Loan Created</h2>
          <p className="text-slate-500 mb-6 text-sm">Your request has been recorded on the blockchain and is awaiting funding.</p>
          <div className="bg-slate-50 dark:bg-surface-950 p-5 rounded-xl border border-slate-200 dark:border-surface-800 text-left mb-6 space-y-3 text-sm">
            <div className="flex justify-between items-center"><span className="text-slate-500 font-semibold uppercase tracking-wider text-[11px]">Principal</span><span className="font-bold text-slate-700 dark:text-slate-200">{requestedAmount.toLocaleString('en-IN')} AUSD</span></div>
            <div className="flex justify-between items-center"><span className="text-slate-500 font-semibold uppercase tracking-wider text-[11px]">Status</span><span className="badge-pending">On-Chain: Requested</span></div>
            <div className="flex justify-between items-center"><span className="text-slate-500 font-semibold uppercase tracking-wider text-[11px]">Block #</span><span className="font-mono text-xs text-slate-600 dark:text-slate-300">{success.blockNumber}</span></div>
            <div className="flex flex-col gap-1">
              <span className="text-slate-500 font-semibold uppercase tracking-wider text-[11px]">Loan ID</span>
              <span className="font-mono text-[10px] text-slate-600 dark:text-slate-400 break-all">{success.loanId}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-slate-500 font-semibold uppercase tracking-wider text-[11px]">Tx Hash</span>
              <span className="font-mono text-[10px] text-bitcoin-600 dark:text-bitcoin-400 break-all">{success.txHash}</span>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setSuccess(null)} className="btn-secondary flex-1">Issue Another</button>
            <button onClick={() => navigate('/dashboard')} className="btn-primary flex-1">Overview</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-white dark:bg-surface-900 border border-slate-200 dark:border-surface-800 flex items-center justify-center shadow-sm">
              <TrendingDown className="w-5 h-5 text-slate-600 dark:text-slate-300" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Capital Request</h1>
          </div>
          <p className="text-slate-600 dark:text-slate-400 ml-[52px] text-sm">Initiate an on-chain loan request. Transactions are executed via MetaMask.</p>
        </div>

        {/* MetaMask Connection Guard */}
        {!account && (
          <div className="dashboard-card p-6 mb-6 border-t-4 border-t-bitcoin-500">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-bitcoin-50 dark:bg-bitcoin-500/10 border border-bitcoin-200 dark:border-bitcoin-500/30 flex items-center justify-center">
                <Wallet className="w-6 h-6 text-bitcoin-500" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-slate-800 dark:text-slate-100">Connect MetaMask</h3>
                <p className="text-xs text-slate-500 mt-0.5">Required for on-chain loan creation</p>
              </div>
              <button onClick={connectWallet} disabled={connecting} className="btn-primary py-2.5 px-5 text-sm">
                {connecting ? 'Connecting...' : 'Connect'}
              </button>
            </div>
          </div>
        )}

        {/* Score & limit */}
        <div className="dashboard-card p-6 mb-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="border-r border-slate-200 dark:border-surface-700 pr-6">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5" /> Trust Score</p>
              <p className="text-4xl font-bold text-bitcoin-500 font-mono tracking-tight">{creditScore}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Max Structural Limit</p>
              <p className="text-4xl font-bold text-slate-800 dark:text-slate-200 font-mono tracking-tight">{maxLoan.toLocaleString()} AUSD</p>
            </div>
          </div>
          {account && (
            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-surface-800 flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">On-Chain AUSD Balance</span>
              <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400">{Number(ausdBalance).toLocaleString('en-IN', { maximumFractionDigits: 2 })} AUSD</span>
            </div>
          )}
          {requestedAmount > 0 && (
            <div className="mt-6 pt-5 border-t border-slate-200 dark:border-surface-800">
              <RangePreview
                label="Capital Utilization"
                value={requestedAmount}
                max={maxLoan}
                color={isOverLimit ? 'text-rose-600 dark:text-rose-500' : 'text-emerald-600 dark:text-emerald-500'}
              />
            </div>
          )}
        </div>

        {/* Form */}
        <div className="dashboard-card p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Principal (AUSD)</label>
              <input
                id="borrow-amount"
                className={`input text-lg ${isOverLimit ? 'border-rose-500/50 focus:border-rose-500 focus:ring-rose-500/50' : ''}`}
                type="number"
                min="1"
                max={maxLoan}
                placeholder="e.g. 2000"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                required
              />
              {isOverLimit && (
                <p className="text-[11px] font-bold text-rose-600 dark:text-rose-500 mt-2 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Request exceeds algorithmic limit of {maxLoan.toLocaleString()} AUSD
                </p>
              )}
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-surface-950 border border-slate-200 dark:border-surface-800 space-y-2 text-sm shadow-sm dark:shadow-none">
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-3 flex items-center gap-1.5">
                <ExternalLink className="w-3 h-3" /> On-Chain Transaction Details
              </div>
              <div className="flex justify-between items-center border-b border-slate-200 dark:border-surface-800/50 pb-2">
                <span className="text-slate-600 dark:text-slate-400 font-medium">Contract</span>
                <span className="text-xs font-mono text-slate-500">ArthaSetuLoans</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-200 dark:border-surface-800/50 pb-2">
                <span className="text-slate-600 dark:text-slate-400 font-medium">Function</span>
                <span className="text-xs font-mono text-bitcoin-600 dark:text-bitcoin-400">createLoan(bytes32, uint256)</span>
              </div>
              <div className="flex justify-between items-center pb-1">
                <span className="text-slate-600 dark:text-slate-400 font-medium">Network</span>
                <span className="text-xs font-mono text-slate-500">Hardhat (Chain 31337)</span>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-500 text-sm font-medium">
                <AlertCircle className="w-4 h-4 shrink-0" />{error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || isOverLimit || isZero || !account}
              className="btn-primary w-full flex items-center justify-center gap-2 py-3.5 mt-4 text-base"
            >
              {loading ? <><Loader className="w-5 h-5 animate-spin" /> Confirming on-chain...</> : 'Deploy Contract On-Chain →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
