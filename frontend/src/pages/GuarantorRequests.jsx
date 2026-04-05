import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWeb3 } from '../context/Web3Context';
import { useOnChainLoans } from '../utils/useContractEvents';
import { formatAUSD, formatBytes32, bytes32ToUuid, loanIdToBytes32 } from '../contracts';
import { getMyGuarantorRecord, approveGuarantor, rejectGuarantor, getLoanDetail } from '../api';
import { Users, CheckCircle, XCircle, Clock, Loader, AlertCircle, ShieldCheck, ArrowRight, FileText } from 'lucide-react';

function GuarantorRequestCard({ loanId, onAction }) {
  const [guarantor, setGuarantor] = useState(null);
  const [loanInfo, setLoanInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetch = async () => {
      try {
        const uuid = bytes32ToUuid(loanId);
        const [gResp, lResp] = await Promise.all([
          getMyGuarantorRecord(uuid),
          getLoanDetail(uuid),
        ]);
        setGuarantor(gResp.data?.data);
        setLoanInfo(lResp.data?.data);
      } catch (e) {
        // Not a guarantor on this loan, skip
        setGuarantor(null);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [loanId]);

  if (loading) return (
    <div className="dashboard-card p-5 animate-pulse">
      <div className="h-4 bg-slate-200 dark:bg-surface-800 rounded w-1/3 mb-3" />
      <div className="h-3 bg-slate-200 dark:bg-surface-800 rounded w-2/3" />
    </div>
  );

  if (!guarantor) return null;

  const handleApprove = async () => {
    setActionLoading(true);
    setError('');
    try {
      await approveGuarantor(bytes32ToUuid(loanId));
      setGuarantor({ ...guarantor, status: 'approved' });
      if (onAction) onAction();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    setActionLoading(true);
    setError('');
    try {
      await rejectGuarantor(bytes32ToUuid(loanId));
      setGuarantor({ ...guarantor, status: 'rejected' });
      if (onAction) onAction();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const isPending = guarantor.status === 'pending';
  const loan = loanInfo?.loan;

  return (
    <div className={`dashboard-card p-5 border transition-all ${
      isPending ? 'border-violet-200 dark:border-violet-500/20 hover:border-violet-400 dark:hover:border-violet-500/40' :
      guarantor.status === 'approved' ? 'border-emerald-200 dark:border-emerald-500/20' :
      'border-rose-200 dark:border-rose-500/20'
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-1">Guarantor Request</div>
          <div className="text-lg font-bold font-mono text-slate-800 dark:text-slate-100">
            {loan ? `${Number(loan.amount).toLocaleString('en-IN')} AUSD` : formatBytes32(loanId)}
          </div>
        </div>
        <div>
          {guarantor.status === 'approved' && (
            <span className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 flex items-center gap-1">
              <CheckCircle className="w-3 h-3" /> Approved
            </span>
          )}
          {guarantor.status === 'rejected' && (
            <span className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20 flex items-center gap-1">
              <XCircle className="w-3 h-3" /> Rejected
            </span>
          )}
          {isPending && (
            <span className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 flex items-center gap-1">
              <Clock className="w-3 h-3 animate-pulse" /> Pending
            </span>
          )}
        </div>
      </div>

      {/* Loan Info */}
      {loan && (
        <div className="space-y-2 text-xs mb-4">
          <div className="flex justify-between items-center">
            <span className="text-slate-500 font-semibold uppercase tracking-wider">Off-Chain Status</span>
            <span className="font-medium text-slate-600 dark:text-slate-400 capitalize">{loan.status?.replace(/_/g, ' ')}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500 font-semibold uppercase tracking-wider">Documents</span>
            <span className="font-medium text-slate-600 dark:text-slate-400">
              {loanInfo?.requirements?.filter(r => r.type === 'document' && r.fulfilled).length || 0} / {loanInfo?.requirements?.filter(r => r.type === 'document').length || 0} Fulfilled
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500 font-semibold uppercase tracking-wider">Loan ID</span>
            <span className="font-mono text-[10px] text-slate-500">{formatBytes32(loanId)}</span>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 text-xs font-medium mb-3">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />{error}
        </div>
      )}

      {/* Actions */}
      {isPending && (
        <div className="flex gap-3 border-t border-slate-200 dark:border-surface-700 pt-4">
          <button
            onClick={handleApprove}
            disabled={actionLoading}
            className="btn-primary flex-1 py-2 flex items-center justify-center gap-1.5 text-sm"
          >
            {actionLoading ? <Loader className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            Approve
          </button>
          <button
            onClick={handleReject}
            disabled={actionLoading}
            className="flex-1 py-2 px-4 rounded-xl font-bold text-sm bg-rose-500 text-white hover:bg-rose-600 transition-colors flex items-center justify-center gap-1.5"
          >
            {actionLoading ? <Loader className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
            Reject
          </button>
        </div>
      )}

      {/* View Detail Link */}
      <div className={`${isPending ? 'mt-3' : 'border-t border-slate-200 dark:border-surface-700 pt-3'}`}>
        <Link
          to={`/loan/${loanId}`}
          className="text-xs font-bold text-bitcoin-600 dark:text-bitcoin-400 hover:underline flex items-center gap-1"
        >
          View Full Loan Details <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}

export default function GuarantorRequests() {
  const { user } = useAuth();
  const { account } = useWeb3();
  const { loans, loading } = useOnChainLoans();
  const [filter, setFilter] = useState('all');

  // We'll check each on-chain loan to see if the user is a guarantor
  // This is done per-card async, so we just render all loans here
  const allLoanIds = loans.map(l => l.loanId);

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-4xl mx-auto space-y-8">

        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-white dark:bg-surface-900 border border-slate-200 dark:border-surface-800 flex items-center justify-center shadow-sm">
              <Users className="w-5 h-5 text-violet-500" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Guarantor Requests</h1>
          </div>
          <p className="text-slate-500 ml-[52px] text-sm">Review loans where you've been nominated as a guarantor. Approve or reject to help borrowers proceed.</p>
        </div>

        {/* Info Banner */}
        <div className="dashboard-card p-4 border-l-4 border-l-violet-500 bg-violet-50/30 dark:bg-violet-500/5">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-violet-500 mt-0.5 shrink-0" />
            <div>
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">How Guarantor Approval Works</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                When a borrower nominates you as a guarantor, you'll see their loan here. By approving, you vouch for the borrower's creditworthiness.
                The lender cannot proceed with funding until all guarantors have approved.
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-24 text-slate-500 font-medium font-mono text-sm uppercase tracking-widest">
            <Loader className="w-5 h-5 animate-spin mr-3" /> Scanning on-chain loans...
          </div>
        ) : allLoanIds.length === 0 ? (
          <div className="bg-white dark:bg-surface-900 border border-slate-200 dark:border-surface-800 rounded-2xl py-24 text-center">
            <Users className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <p className="text-slate-700 dark:text-slate-300 font-bold text-lg mb-2">No loans on-chain yet</p>
            <p className="text-slate-500 text-sm">Guarantor requests will appear here when you're nominated.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-5">
            {allLoanIds.map(loanId => (
              <GuarantorRequestCard
                key={loanId}
                loanId={loanId}
                onAction={() => {}}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
