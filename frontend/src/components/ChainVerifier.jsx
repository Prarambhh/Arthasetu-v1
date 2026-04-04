import { Shield, CheckCircle, XCircle, Loader } from 'lucide-react';
import { useState } from 'react';
import { verifyChain } from '../api';

export function ChainVerifier({ onVerified }) {
  const [status, setStatus] = useState('idle'); // idle | loading | valid | invalid
  const [result, setResult] = useState(null);

  const handleVerify = async () => {
    setStatus('loading');
    try {
      const res = await verifyChain();
      setResult(res.data);
      setStatus(res.data.valid ? 'valid' : 'invalid');
      onVerified?.(res.data);
    } catch {
      setStatus('invalid');
    }
  };

  return (
    <div className="dashboard-card p-5 flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-surface-800 border border-slate-200 dark:border-surface-700 flex items-center justify-center shadow-sm">
          <Shield className="w-5 h-5 text-slate-500 dark:text-slate-300" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-800 dark:text-slate-100">Ledger Verification</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Cryptographically recomputes all block hashes</p>
        </div>
      </div>

      <button
        onClick={handleVerify}
        disabled={status === 'loading'}
        className="btn-secondary w-full flex items-center justify-center gap-2"
      >
        {status === 'loading' ? (
          <><Loader className="w-4 h-4 animate-spin" /> Auditing Ledger...</>
        ) : (
          <><Shield className="w-4 h-4" /> Run Integrity Audit</>
        )}
      </button>

      {status === 'valid' && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-emerald-50 border border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/20 animate-fade-in shadow-sm">
          <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-emerald-700 dark:text-emerald-500 font-bold text-sm">Integrity Verified: Chain Valid</p>
            <p className="text-emerald-600/80 dark:text-emerald-500/70 text-xs mt-0.5 font-medium">
              Sequence valid across {result?.length} blocks. No tampering detected.
            </p>
          </div>
        </div>
      )}

      {status === 'invalid' && result && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-rose-50 border border-rose-200 dark:bg-rose-500/10 dark:border-rose-500/20 shadow-sm">
          <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-rose-700 dark:text-rose-500 font-bold text-sm">Integrity Compromised: Tampered Block</p>
            {result.issues?.map((issue, i) => (
              <p key={i} className="text-rose-600/90 dark:text-rose-500/80 text-xs mt-1 bg-rose-100 dark:bg-rose-950 px-2 py-1 rounded inline-block font-mono">
                Block #{issue.blockIndex}: {issue.reason}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
