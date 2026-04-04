import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { createLoan } from '../api';
import { TrendingDown, AlertCircle, CheckCircle, Loader, ShieldCheck } from 'lucide-react';

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
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [amount, setAmount] = useState('');
  const [duration, setDuration] = useState(30);
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
    setLoading(true);
    setError('');
    try {
      const res = await createLoan(requestedAmount, duration);
      setSuccess(res.data.loan);
      await refreshUser();
    } catch (err) {
      setError(err.response?.data?.error || 'Execution failed');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 pt-20">
        <div className="dashboard-card w-full max-w-md p-8 text-center border-t-4 border-t-bitcoin-500">
          <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 flex items-center justify-center mx-auto mb-6 shadow-sm dark:shadow-none">
            <CheckCircle className="w-8 h-8 text-emerald-600 dark:text-emerald-500" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2 tracking-tight">Contract Originated</h2>
          <p className="text-slate-500 mb-6 text-sm">Your request is queued on the ledger and awaiting funding allocation.</p>
          <div className="bg-slate-50 dark:bg-surface-950 p-5 rounded-xl border border-slate-200 dark:border-surface-800 text-left mb-6 space-y-3 text-sm">
            <div className="flex justify-between items-center"><span className="text-slate-500 font-semibold uppercase tracking-wider text-[11px]">Principal</span><span className="font-bold text-slate-700 dark:text-slate-200">₹{success.amount.toLocaleString()}</span></div>
            <div className="flex justify-between items-center"><span className="text-slate-500 font-semibold uppercase tracking-wider text-[11px]">Term</span><span className="font-bold text-slate-700 dark:text-slate-200">{success.durationDays} days</span></div>
            <div className="flex justify-between items-center"><span className="text-slate-500 font-semibold uppercase tracking-wider text-[11px]">Status</span><span className="badge-pending">Open</span></div>
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
          <p className="text-slate-600 dark:text-slate-400 ml-[52px] text-sm">Initiate an open market request bound by your reputation constraints.</p>
        </div>

        {/* Score & limit */}
        <div className="dashboard-card p-6 mb-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="border-r border-slate-200 dark:border-surface-700 pr-6">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5" /> Trust Score</p>
              <p className="text-4xl font-bold text-bitcoin-500 font-mono tracking-tight">{creditScore}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Max Structural Limit</p>
              <p className="text-4xl font-bold text-slate-800 dark:text-slate-200 font-mono tracking-tight">₹{maxLoan.toLocaleString()}</p>
            </div>
          </div>
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
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Principal (₹)</label>
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
                  Request exceeds algorithmic limit of ₹{maxLoan.toLocaleString()}
                </p>
              )}
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex justify-between">
                <span>Contract Term</span>
                <span className="text-slate-800 dark:text-slate-200 font-mono text-sm">{duration} Days</span>
              </label>
              <input
                id="borrow-duration"
                type="range"
                min="7"
                max="90"
                step="7"
                value={duration}
                onChange={e => setDuration(Number(e.target.value))}
                className="w-full accent-bitcoin-500 mt-2"
              />
              <div className="flex justify-between text-[11px] text-slate-500 font-medium mt-1 uppercase tracking-wider">
                <span>7 Days</span>
                <span>90 Days</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-surface-950 border border-slate-200 dark:border-surface-800 space-y-2 text-sm shadow-sm dark:shadow-none">
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-3">Diagnostic Impact Simulation</div>
              <div className="flex justify-between items-center border-b border-slate-200 dark:border-surface-800/50 pb-2">
                <span className="text-slate-600 dark:text-slate-400 font-medium">Settlement on maturity</span>
                <span className="text-emerald-600 dark:text-emerald-500 font-bold">+20 pts</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-200 dark:border-surface-800/50 pb-2">
                <span className="text-slate-600 dark:text-slate-400 font-medium">Failure to settle (Default)</span>
                <span className="text-rose-600 dark:text-rose-500 font-bold">−30 pts</span>
              </div>
              <div className="flex justify-between items-center pb-1">
                <span className="text-slate-600 dark:text-slate-400 font-medium">Open contract penalty</span>
                <span className="text-amber-600 dark:text-amber-500 font-bold">−10 pts</span>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-500 text-sm font-medium">
                <AlertCircle className="w-4 h-4 shrink-0" />{error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || isOverLimit || isZero}
              className="btn-primary w-full flex items-center justify-center gap-2 py-3.5 mt-4 text-base"
            >
              {loading ? <><Loader className="w-5 h-5 animate-spin" /> Simulating...</> : 'Deploy Contract →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
