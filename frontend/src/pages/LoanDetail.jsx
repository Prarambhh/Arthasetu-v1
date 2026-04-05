import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWeb3 } from '../context/Web3Context';
import { useOnChainLoans } from '../utils/useContractEvents';
import { formatAUSD, formatBytes32, ON_CHAIN_STATUS, PROTOCOL_ADDRESS, parseAUSD, bytes32ToUuid } from '../contracts';
import { getLoanDetail, uploadDocument, hybridApprove, triggerReview, addBorrowerGuarantor, approveGuarantor as apiApproveGuarantor, rejectGuarantor as apiRejectGuarantor, getAllUsers } from '../api';
import { ethers } from 'ethers';
import { Loader, AlertCircle, CheckCircle, ShieldCheck, Lock, ExternalLink, Wallet, Zap, Eye, Upload, UserPlus, Users, X, ArrowRight, Clock, XCircle, FileText } from 'lucide-react';

function StatusBadge({ status }) {
  const label = ON_CHAIN_STATUS[status] || 'UNKNOWN';
  const colors = {
    0: 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border-amber-200 dark:border-amber-500/20',
    1: 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border-blue-200 dark:border-blue-500/20',
    2: 'bg-violet-100 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400 border-violet-200 dark:border-violet-500/20',
    3: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20',
    4: 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border-blue-200 dark:border-blue-500/20',
    5: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20',
    6: 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border-rose-200 dark:border-rose-500/20',
  };
  return (
    <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${colors[status] || colors[0]}`}>
      {label}
    </span>
  );
}

function OffChainStatusBadge({ status }) {
  const colors = {
    requested: 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
    docs_requested: 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',
    under_review: 'bg-violet-100 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400',
    approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
    disbursed: 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',
    settled: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
    rejected: 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400',
  };
  return (
    <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${colors[status] || colors.requested}`}>
      Off-Chain: {status?.replace(/_/g, ' ')}
    </span>
  );
}

/* ─── Status Progress Bar ─────────────────────────────────────────── */
function StatusProgress({ offchainStatus }) {
  const steps = ['requested', 'docs_requested', 'under_review', 'approved', 'disbursed', 'settled'];
  const labels = ['Requested', 'Docs Requested', 'Under Review', 'Approved', 'Disbursed', 'Settled'];
  const currentIdx = steps.indexOf(offchainStatus);

  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-2">
      {steps.map((step, i) => {
        const isActive = i === currentIdx;
        const isDone = i < currentIdx;
        return (
          <div key={step} className="flex items-center gap-1 shrink-0">
            <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
              isActive ? 'bg-bitcoin-500 text-white shadow-sm' :
              isDone ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' :
              'bg-slate-100 text-slate-400 dark:bg-surface-800 dark:text-slate-600'
            }`}>
              {isDone && <CheckCircle className="w-3 h-3" />}
              {isActive && <div className="w-2 h-2 rounded-full bg-white animate-pulse" />}
              {labels[i]}
            </div>
            {i < steps.length - 1 && <div className="w-3 h-px bg-slate-300 dark:bg-surface-700" />}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Main Component ──────────────────────────────────────────────── */
export default function LoanDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { account, loansContract, ausdContract, ausdBalance, refreshBalance } = useWeb3();

  const [loan, setLoan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [offchainError, setOffchainError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState(null);
  const [repayAmount, setRepayAmount] = useState('');
  const [offchainDetails, setOffchainDetails] = useState(null);
  const [docFileParams, setDocFileParams] = useState({});
  const [guarantorInput, setGuarantorInput] = useState('');
  const [guarantorLoading, setGuarantorLoading] = useState(false);

  const fetchLoan = useCallback(async () => {
    if (!loansContract || !id) { setLoading(false); return; }
    setLoading(true);

    const standardUuid = bytes32ToUuid(id);

    try {
      const resp = await getLoanDetail(standardUuid);
      setOffchainDetails(resp.data?.data);
      setOffchainError('');
    } catch (e) {
      console.warn("Could not fetch offchain details for loan:", e);
      setOffchainError(e.response?.data?.error || e.message || 'Cannot load documents');
    }

    try {
      const data = await loansContract.loans(id);
      if (data.borrower === ethers.ZeroAddress) {
        setError('Loan not found on-chain');
        setLoan(null);
      } else {
        setLoan({
          loanId: id,
          borrower: data.borrower,
          lender: data.lender,
          principalAmount: data.principalAmount,
          interestRateBps: Number(data.interestRateBps),
          outstandingPrincipal: data.outstandingPrincipal,
          disbursedAt: Number(data.disbursedAt),
          lastPaymentAt: Number(data.lastPaymentAt),
          status: Number(data.status),
          statusLabel: ON_CHAIN_STATUS[Number(data.status)],
        });
      }
    } catch (err) {
      setError(err.message || 'Failed to load on-chain loan');
    } finally {
      setLoading(false);
    }
  }, [loansContract, id]);

  useEffect(() => { fetchLoan(); }, [fetchLoan]);

  const isBorrower = loan?.borrower?.toLowerCase() === account?.toLowerCase();
  const isLender = loan?.lender?.toLowerCase() === account?.toLowerCase();
  const isRequested = loan?.status === 0;
  const isDisbursed = loan?.status === 4;
  const isSettled = loan?.status === 5;

  const offchainStatus = offchainDetails?.loan?.status;
  const guarantors = offchainDetails?.guarantors || [];
  const requirements = offchainDetails?.requirements || [];
  const documents = offchainDetails?.documents || [];

  const allDocsFulfilled = requirements.filter(r => r.type === 'document').every(r => r.fulfilled);
  const allGuarantorsApproved = guarantors.length > 0 ? guarantors.every(g => g.status === 'approved') : true;
  const hasRejectedGuarantor = guarantors.some(g => g.status === 'rejected');

  // Check if current user is a guarantor on this loan
  const myGuarantor = guarantors.find(g => {
    // Match by user_id from guarantor records
    return g.user_id === user?.userId;
  });
  const isGuarantor = !!myGuarantor;

  const handleFundAndDisburse = async (rateBps) => {
    if (!loansContract || !ausdContract || !account) return;
    setActionLoading(true);
    setError('');
    try {
      const allowance = await ausdContract.allowance(account, PROTOCOL_ADDRESS);
      if (allowance < loan.principalAmount) {
        const approveTx = await ausdContract.approve(PROTOCOL_ADDRESS, loan.principalAmount);
        await approveTx.wait();
      }
      const tx = await loansContract.fundAndDisburse(id, rateBps);
      const receipt = await tx.wait();
      setActionSuccess({ type: 'funded', txHash: receipt.hash, blockNumber: receipt.blockNumber });
      await refreshBalance();
      await fetchLoan();
    } catch (err) {
      if (err.code === 'ACTION_REJECTED') setError('Transaction rejected');
      else setError(err.reason || err.message || 'Transaction failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRepay = async () => {
    if (!loansContract || !ausdContract || !account || !repayAmount) return;
    setActionLoading(true);
    setError('');
    try {
      const amountWei = parseAUSD(repayAmount);
      const allowance = await ausdContract.allowance(account, PROTOCOL_ADDRESS);
      if (allowance < amountWei) {
        const approveTx = await ausdContract.approve(PROTOCOL_ADDRESS, amountWei);
        await approveTx.wait();
      }
      const tx = await loansContract.repayLoan(id, amountWei);
      const receipt = await tx.wait();
      setActionSuccess({ type: 'repaid', txHash: receipt.hash, blockNumber: receipt.blockNumber });
      await refreshBalance();
      await fetchLoan();
      setRepayAmount('');
    } catch (err) {
      if (err.code === 'ACTION_REJECTED') setError('Transaction rejected');
      else setError(err.reason || err.message || 'Repayment failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUploadDocument = async (reqId) => {
    const fileUrl = docFileParams[reqId];
    if (!fileUrl) return;
    setActionLoading(true);
    const standardUuid = bytes32ToUuid(id);
    try {
      await uploadDocument(standardUuid, reqId, fileUrl);
      await fetchLoan();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddGuarantor = async () => {
    if (!guarantorInput.trim()) return;
    setGuarantorLoading(true);
    const standardUuid = bytes32ToUuid(id);
    try {
      await addBorrowerGuarantor(standardUuid, guarantorInput.trim());
      setGuarantorInput('');
      await fetchLoan();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setGuarantorLoading(false);
    }
  };

  const handleGuarantorApprove = async () => {
    setActionLoading(true);
    const standardUuid = bytes32ToUuid(id);
    try {
      await apiApproveGuarantor(standardUuid);
      await fetchLoan();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleGuarantorReject = async () => {
    setActionLoading(true);
    const standardUuid = bytes32ToUuid(id);
    try {
      await apiRejectGuarantor(standardUuid);
      await fetchLoan();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleTriggerReview = async () => {
    setActionLoading(true);
    const standardUuid = bytes32ToUuid(id);
    try {
      await triggerReview(standardUuid);
      await fetchLoan();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleHybridApprove = async () => {
    setActionLoading(true);
    const standardUuid = bytes32ToUuid(id);
    try {
      await hybridApprove(standardUuid, loan.interestRateBps || 500);
      await fetchLoan();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen pt-24 flex items-center justify-center">
      <div className="flex items-center gap-2 text-slate-500"><Loader className="w-5 h-5 animate-spin" /> Loading on-chain state...</div>
    </div>
  );

  if (!loan) return (
    <div className="min-h-screen pt-24 px-4 max-w-lg mx-auto">
      <div className="dashboard-card p-8 text-center bg-rose-50 border-rose-200 dark:bg-rose-500/10 dark:border-rose-500/20">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-4" />
        <p className="text-slate-800 dark:text-slate-200 font-bold">{error || 'Loan not found on-chain.'}</p>
        <button onClick={() => navigate('/dashboard')} className="mt-4 text-bitcoin-600 hover:underline text-sm font-bold">Return to Dashboard</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
              <Lock className="w-6 h-6 text-slate-400" /> Loan Inspector
            </h1>
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <StatusBadge status={loan.status} />
              {offchainStatus && <OffChainStatusBadge status={offchainStatus} />}
              {isBorrower && <span className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 px-2 rounded-md font-bold border border-blue-200 dark:border-blue-500/20">You are Borrower</span>}
              {isLender && <span className="text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 px-2 rounded-md font-bold border border-emerald-200 dark:border-emerald-500/20">You are Lender</span>}
              {isGuarantor && <span className="text-xs bg-violet-100 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400 px-2 rounded-md font-bold border border-violet-200 dark:border-violet-500/20">You are Guarantor</span>}
            </div>
          </div>
          <div className="text-right dashboard-card px-5 py-3 border-t-4 border-t-bitcoin-500">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1">Principal Amount</div>
            <div className="text-2xl font-bold font-mono">{formatAUSD(loan.principalAmount)} AUSD</div>
          </div>
        </div>

        {/* Status Progress */}
        {offchainStatus && (
          <div className="dashboard-card p-4">
            <StatusProgress offchainStatus={offchainStatus} />
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 p-4 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-500 text-sm font-medium">
            <AlertCircle className="w-5 h-5 shrink-0" />{error}
          </div>
        )}

        {actionSuccess && (
          <div className="flex items-start gap-3 p-5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 animate-fade-in">
            <CheckCircle className="w-6 h-6 text-emerald-600 dark:text-emerald-500 mt-0.5" />
            <div>
              <h3 className="font-bold text-emerald-700 dark:text-emerald-400">
                {actionSuccess.type === 'funded' ? 'Loan Funded & Disbursed!' : 'Repayment Confirmed!'}
              </h3>
              <p className="text-sm text-emerald-600/80 mt-1">Block #{actionSuccess.blockNumber}</p>
              <p className="text-[10px] font-mono text-emerald-600/60 mt-1 break-all">Tx: {actionSuccess.txHash}</p>
            </div>
          </div>
        )}

        {/* On-Chain Loan Details */}
        <div className="dashboard-card p-6">
          <h3 className="font-bold border-b border-slate-200 dark:border-surface-700 pb-3 mb-4 flex items-center gap-2">
            <Eye className="w-4 h-4 text-bitcoin-500" /> Contract State
          </h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="bg-slate-50 dark:bg-surface-950 border border-slate-200 dark:border-surface-800 p-4 rounded-xl">
              <div className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-1">Borrower</div>
              <div className="font-mono text-xs text-slate-700 dark:text-slate-300 break-all">{loan.borrower}</div>
            </div>
            <div className="bg-slate-50 dark:bg-surface-950 border border-slate-200 dark:border-surface-800 p-4 rounded-xl">
              <div className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-1">Lender</div>
              <div className="font-mono text-xs text-slate-700 dark:text-slate-300 break-all">{loan.lender === ethers.ZeroAddress ? 'Not yet funded' : loan.lender}</div>
            </div>
            <div className="bg-slate-50 dark:bg-surface-950 border border-slate-200 dark:border-surface-800 p-4 rounded-xl">
              <div className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-1">Outstanding Principal</div>
              <div className="font-mono text-lg font-bold text-rose-600 dark:text-rose-400">{formatAUSD(loan.outstandingPrincipal)} AUSD</div>
            </div>
            <div className="bg-slate-50 dark:bg-surface-950 border border-slate-200 dark:border-surface-800 p-4 rounded-xl">
              <div className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-1">Interest Rate</div>
              <div className="font-mono text-lg font-bold text-slate-800 dark:text-slate-200">{loan.interestRateBps} BPS <span className="text-sm text-slate-500">({(loan.interestRateBps / 100).toFixed(1)}%)</span></div>
            </div>
            <div className="bg-slate-50 dark:bg-surface-950 border border-slate-200 dark:border-surface-800 p-4 rounded-xl">
              <div className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-1">Disbursed At</div>
              <div className="font-mono text-xs text-slate-700 dark:text-slate-300">{loan.disbursedAt ? new Date(loan.disbursedAt * 1000).toLocaleString() : '—'}</div>
            </div>
            <div className="bg-slate-50 dark:bg-surface-950 border border-slate-200 dark:border-surface-800 p-4 rounded-xl">
              <div className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-1">Loan ID</div>
              <div className="font-mono text-[10px] text-slate-500 break-all">{loan.loanId}</div>
            </div>
          </div>
        </div>

        {offchainError && (
          <div className="dashboard-card p-6 bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20 text-amber-700 dark:text-amber-500">
            <h3 className="font-bold flex items-center gap-2"><AlertCircle className="w-5 h-5"/> Legacy Loan Detected</h3>
            <p className="text-sm mt-2">The document vault could not be found for this loan (Error: {offchainError}). This typically happens because this loan was created BEFORE the database patch. <strong>You must go to the Borrow page and issue a NEW capital request.</strong></p>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            GUARANTOR SECTION — Borrower adds, Guarantors approve/reject
            ═══════════════════════════════════════════════════════════════ */}
        <div className="dashboard-card p-6">
          <h3 className="font-bold border-b border-slate-200 dark:border-surface-700 pb-3 mb-4 flex items-center gap-2">
            <Users className="w-4 h-4 text-bitcoin-500" /> Guarantors
          </h3>

          {/* Guarantor List */}
          {guarantors.length > 0 ? (
            <div className="space-y-3 mb-4">
              {guarantors.map(g => (
                <div key={g.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-surface-800 bg-slate-50 dark:bg-surface-950">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/20 flex items-center justify-center">
                      <Users className="w-4 h-4 text-violet-500" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-800 dark:text-slate-200">{g.user_name || 'Unknown User'}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{g.user_id?.slice(0, 8)}…</div>
                    </div>
                  </div>
                  <div>
                    {g.status === 'approved' && (
                      <span className="text-xs font-bold text-emerald-600 bg-emerald-100 dark:bg-emerald-500/10 px-2.5 py-1 rounded-md flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Approved
                      </span>
                    )}
                    {g.status === 'rejected' && (
                      <span className="text-xs font-bold text-rose-600 bg-rose-100 dark:bg-rose-500/10 px-2.5 py-1 rounded-md flex items-center gap-1">
                        <XCircle className="w-3 h-3" /> Rejected
                      </span>
                    )}
                    {g.status === 'pending' && (
                      <span className="text-xs font-bold text-amber-600 bg-amber-100 dark:bg-amber-500/10 px-2.5 py-1 rounded-md flex items-center gap-1">
                        <Clock className="w-3 h-3 animate-pulse" /> Pending
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-slate-400 mb-4 italic">No guarantors nominated yet.</div>
          )}

          {/* Borrower: Add Guarantor */}
          {isBorrower && (offchainStatus === 'requested' || offchainStatus === 'docs_requested') && (
            <div className="border border-dashed border-slate-300 dark:border-surface-700 rounded-xl p-4 bg-slate-50/50 dark:bg-surface-950/50">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2 block flex items-center gap-1.5">
                <UserPlus className="w-3.5 h-3.5" /> Nominate a Guarantor
              </label>
              <p className="text-xs text-slate-400 mb-3">Enter a username or user ID to nominate as your guarantor.</p>
              <div className="flex gap-2">
                <input
                  className="input text-sm flex-1"
                  type="text"
                  placeholder="Enter username or user ID..."
                  value={guarantorInput}
                  onChange={e => setGuarantorInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddGuarantor()}
                />
                <button
                  onClick={handleAddGuarantor}
                  disabled={guarantorLoading || !guarantorInput.trim()}
                  className="btn-primary py-2 px-4 flex items-center gap-1.5 text-xs"
                >
                  {guarantorLoading ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                  Add
                </button>
              </div>
            </div>
          )}

          {/* Guarantor: Approve/Reject action */}
          {isGuarantor && myGuarantor?.status === 'pending' && (
            <div className="mt-4 p-4 border border-violet-200 bg-violet-50 dark:bg-violet-500/10 dark:border-violet-500/20 rounded-xl">
              <h4 className="font-bold text-violet-700 dark:text-violet-400 mb-2">You've been nominated as a Guarantor</h4>
              <p className="text-xs text-violet-600/80 dark:text-violet-500/80 mb-3">
                The borrower has requested you to guarantee this loan. Please review the loan details and decide.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleGuarantorApprove}
                  disabled={actionLoading}
                  className="btn-primary flex-1 py-2 flex items-center justify-center gap-1.5 text-sm"
                >
                  <CheckCircle className="w-4 h-4" /> Approve
                </button>
                <button
                  onClick={handleGuarantorReject}
                  disabled={actionLoading}
                  className="flex-1 py-2 px-4 rounded-xl font-bold text-sm bg-rose-500 text-white hover:bg-rose-600 transition-colors flex items-center justify-center gap-1.5"
                >
                  <XCircle className="w-4 h-4" /> Reject
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            DOCUMENTS SECTION — Borrower uploads, both can view
            ═══════════════════════════════════════════════════════════════ */}
        {requirements.filter(r => r.type === 'document').length > 0 && (
          <div className="dashboard-card p-6">
            <h3 className="font-bold border-b border-slate-200 dark:border-surface-700 pb-3 mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-bitcoin-500" /> Required Documents
            </h3>
            <div className="space-y-4">
              {requirements.filter(r => r.type === 'document').map(req => {
                const doc = documents?.find(d => d.requirement_id === req.id);
                return (
                  <div key={req.id} className="p-4 rounded-xl border border-slate-200 dark:border-surface-800 bg-slate-50 dark:bg-surface-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-bold text-slate-800 dark:text-slate-200">{req.label}</div>
                      <div className="text-xs text-slate-500">Required by Lender</div>
                    </div>
                    <div>
                      {req.fulfilled ? (
                        <div className="flex items-center gap-4">
                          <span className="text-xs font-bold text-emerald-600 bg-emerald-100 dark:bg-emerald-500/10 px-2 py-1 rounded-md flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> FULFILLED
                          </span>
                          {doc?.file_reference && (
                            <a href={doc.file_reference} target="_blank" rel="noreferrer" className="text-bitcoin-500 hover:text-bitcoin-600 flex items-center gap-1 text-xs font-semibold">
                              <Eye className="w-3 h-3" /> View Doc
                            </a>
                          )}
                        </div>
                      ) : isBorrower ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="file"
                            className="input text-xs w-56"
                            onChange={(e) => setDocFileParams({...docFileParams, [req.id]: e.target.files[0]})}
                          />
                          <button
                            onClick={() => handleUploadDocument(req.id)}
                            disabled={actionLoading || !docFileParams[req.id]}
                            className="btn-primary py-1.5 px-3 text-xs flex items-center gap-1"
                          >
                            <Upload className="w-3 h-3" /> Submit
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-xs font-bold text-amber-600 bg-amber-100 dark:bg-amber-500/10 px-2 py-1 rounded-md flex items-center gap-1">
                            <Loader className="w-3 h-3 animate-spin" /> PENDING UPLOAD
                          </span>
                          <span className="text-[10px] text-slate-400">Only the borrower can upload.</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            LENDER ACTIONS — Review → Approve Off-Chain → Fund On-Chain
            ═══════════════════════════════════════════════════════════════ */}
        {!isBorrower && !isGuarantor && offchainStatus === 'docs_requested' && allDocsFulfilled && allGuarantorsApproved && !hasRejectedGuarantor && (
          <div className="dashboard-card p-6 border-t-4 border-t-violet-500">
            <h3 className="font-bold text-lg mb-2 flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-violet-500" /> Ready for Review</h3>
            <p className="text-sm text-slate-500 mb-4">All documents have been uploaded and all guarantors have approved. You can now move this loan to review.</p>
            <button
              onClick={handleTriggerReview}
              disabled={actionLoading}
              className="btn-primary w-full py-2.5 flex items-center justify-center gap-2"
            >
              {actionLoading ? <Loader className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              Move to Review
            </button>
          </div>
        )}

        {!isBorrower && offchainStatus === 'under_review' && (
          <div className="dashboard-card p-6 border-t-4 border-t-bitcoin-500">
            <h3 className="font-bold text-lg mb-2 flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-bitcoin-500" /> Compliance Verification</h3>
            <p className="text-sm text-slate-500 mb-4">Review all documents and guarantor approvals above. Once satisfied, approve the loan off-chain to enable on-chain funding.</p>
            <button
              onClick={handleHybridApprove}
              disabled={actionLoading}
              className="btn-primary w-full py-2.5 flex items-center justify-center gap-2"
            >
              {actionLoading ? <Loader className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              Verify & Approve Off-Chain
            </button>
          </div>
        )}

        {/* Fund On-Chain — Only after off-chain approval */}
        {isRequested && !isBorrower && offchainStatus === 'approved' && (
          <div className="dashboard-card p-6 border-t-4 border-t-emerald-500">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Zap className="w-5 h-5 text-emerald-500" /> Fund On-Chain</h3>
            <p className="text-sm text-slate-500 mb-4">Off-chain verification complete. You can now deploy capital on-chain via smart contract.</p>
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Interest Rate (BPS)</label>
                <input
                  className="input text-sm font-mono"
                  type="number"
                  defaultValue={loan.interestRateBps || 500}
                  min="0"
                  max="5000"
                  id="interest-rate-input"
                />
              </div>
              <button
                onClick={() => handleFundAndDisburse(Number(document.getElementById('interest-rate-input').value))}
                disabled={actionLoading}
                className="btn-primary py-2.5 px-6 flex items-center gap-2"
              >
                {actionLoading ? <Loader className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                Fund & Disburse
              </button>
            </div>
          </div>
        )}

        {/* Repay */}
        {isDisbursed && isBorrower && (
          <div className="dashboard-card p-6 border-t-4 border-t-emerald-500">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><CheckCircle className="w-5 h-5 text-emerald-500" /> Repay On-Chain</h3>
            <div className="flex justify-between items-center mb-4 text-xs">
              <span className="text-slate-500 font-semibold uppercase tracking-wider">Your AUSD Balance</span>
              <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400">{Number(ausdBalance).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Repayment Amount (AUSD)</label>
                <input
                  className="input text-sm font-mono"
                  type="number"
                  min="0.01"
                  step="any"
                  value={repayAmount}
                  onChange={e => setRepayAmount(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setRepayAmount(ethers.formatUnits(loan.outstandingPrincipal, 18))}
                  className="text-xs text-bitcoin-600 dark:text-bitcoin-400 mt-1 font-bold hover:underline"
                >
                  Pay Full Outstanding ({formatAUSD(loan.outstandingPrincipal)})
                </button>
              </div>
              <button
                onClick={handleRepay}
                disabled={actionLoading || !repayAmount || Number(repayAmount) <= 0}
                className="btn-success py-2.5 px-6 flex items-center gap-2"
              >
                {actionLoading ? <Loader className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Repay
              </button>
            </div>
          </div>
        )}

        {/* Settled */}
        {isSettled && (
          <div className="dashboard-card p-6 border-l-4 border-l-emerald-500 bg-emerald-50/30 dark:bg-emerald-900/10">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-emerald-500" />
              <div>
                <h3 className="font-bold text-emerald-700 dark:text-emerald-400">Loan Fully Settled</h3>
                <p className="text-sm text-emerald-600/80 dark:text-emerald-500/70 mt-0.5">This loan has been completely repaid on-chain.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
