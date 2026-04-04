import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  getLoanDetail, 
  addRequirements, 
  uploadDocument, 
  triggerReview, 
  approveLoan, 
  rejectLoan 
} from '../api';
import { Loader, AlertCircle, CheckCircle, FileText, ShieldCheck, ChevronRight, UploadCloud, Lock } from 'lucide-react';
import { LoanStatusBadge } from '../components/TrustTierBadge';

export default function LoanDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Forms
  const [reqLabel, setReqLabel] = useState('');
  const [reqType, setReqType] = useState('document');
  const [uploadLinks, setUploadLinks] = useState({});
  const [selectedFiles, setSelectedFiles] = useState({});

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const fetchDetail = async () => {
    try {
      setLoading(true);
      const res = await getLoanDetail(id);
      setData(res.data.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch deal room');
    } finally {
      setLoading(false);
    }
  };

  const isLender = user?.userId === data?.loan?.lender_id;
  const isBorrower = user?.userId === data?.loan?.borrower_id;
  // Backend returns lowercase status; normalise here for all comparisons
  const status = data?.loan?.status?.toLowerCase() ?? '';
  const statusUpper = status.toUpperCase();

  const handleAddReq = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await addRequirements(id, [{ type: reqType, label: reqLabel }]);
      setReqLabel('');
      await fetchDetail();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add requirement');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpload = async (reqId) => {
    const link = uploadLinks[reqId];
    if (!link) return;
    setActionLoading(true);
    try {
      await uploadDocument(id, reqId, link);
      await fetchDetail();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to upload document');
    } finally {
      setActionLoading(false);
    }
  };

  const handleTriggerReview = async () => {
    setActionLoading(true);
    try {
      await triggerReview(id);
      await fetchDetail();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to trigger review');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async () => {
    setActionLoading(true);
    try {
      await approveLoan(id);
      await refreshUser();
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Disbursement failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if(!window.confirm("Are you sure you want to reject this request?")) return;
    setActionLoading(true);
    try {
      await rejectLoan(id);
      await fetchDetail();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reject');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen pt-24 flex items-center justify-center">
      <div className="flex items-center gap-2 text-slate-500"><Loader className="w-5 h-5 animate-spin"/> Loading Deal Room...</div>
    </div>
  );

  if (!data) return (
    <div className="min-h-screen pt-24 px-4 max-w-lg mx-auto">
      <div className="dashboard-card p-8 text-center bg-rose-50 border-rose-200">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-4" />
        <p className="text-slate-800 font-bold">{error || 'Deal not found or access denied.'}</p>
        <button onClick={() => navigate('/dashboard')} className="mt-4 text-bitcoin-600 hover:underline text-sm font-bold">Return to Dashboard</button>
      </div>
    </div>
  );

  const { loan, requirements, documents } = data;
  // status is already normalised above

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Deal Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
              <Lock className="w-6 h-6 text-slate-400" /> Secure Deal Room
            </h1>
            <div className="mt-2 flex items-center gap-2">
               <LoanStatusBadge status={statusUpper} />
               {isLender && <span className="text-xs bg-bitcoin-100 text-bitcoin-700 dark:bg-bitcoin-500/10 dark:text-bitcoin-400 px-2 rounded-md font-bold">You are the Lender</span>}
               {isBorrower && <span className="text-xs bg-slate-200 text-slate-700 dark:bg-surface-800 dark:text-slate-300 px-2 rounded-md font-bold">You are the Borrower</span>}
            </div>
          </div>
          <div className="text-right dashboard-card px-5 py-3 border-t-4 border-t-bitcoin-500">
             <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1">Principal Amount</div>
             <div className="text-2xl font-bold font-mono">₹{Number(loan.amount).toLocaleString('en-IN')}</div>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-sm font-medium">
            <AlertCircle className="w-5 h-5 shrink-0" />{error}
          </div>
        )}

        {/* ── BORROWER WAITING FOR REQUIREMENTS (REQUESTED) ── */}
        {isBorrower && status === 'requested' && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-bitcoin-50 dark:bg-bitcoin-500/10 border border-bitcoin-200 dark:border-bitcoin-500/20 text-bitcoin-700 dark:text-bitcoin-400">
            <ShieldCheck className="w-6 h-6 shrink-0" />
            <div>
              <h3 className="font-bold">Application Accepted</h3>
              <p className="text-sm">A lender has locked in your application. Please wait here — they will specify the exact documents or guarantors they require from you. This page will update automatically.</p>
            </div>
          </div>
        )}

        {/* ── LENDER WANTS DOCUMENTS (REQUESTED / DOCS_REQUESTED) ── */}
        {isLender && (status === 'requested' || status === 'docs_requested') && (
          <div className="dashboard-card p-6">
            <h2 className="text-lg font-bold mb-4">Request Evidence</h2>
            <form onSubmit={handleAddReq} className="flex gap-3">
              <select 
                value={reqType} onChange={e=>setReqType(e.target.value)}
                className="input py-2 flex-1 max-w-[150px]"
              >
                <option value="document">Document</option>
                <option value="guarantor">Guarantor</option>
              </select>
              <input 
                className="input py-2 flex-1" 
                placeholder="e.g. Identity Proof URL or User ID" 
                value={reqLabel} onChange={e=>setReqLabel(e.target.value)} required
              />
              <button disabled={actionLoading} type="submit" className="btn-secondary whitespace-nowrap">Add</button>
            </form>

            <div className="mt-6 flex justify-end">
               <button 
                 onClick={handleTriggerReview} 
                 disabled={actionLoading}
                 className="btn-primary"
               >
                 Advance to Review Phase <ChevronRight className="w-4 h-4 ml-1 inline" />
               </button>
            </div>
          </div>
        )}

        {/* ── REQUIREMENTS CHECKLIST ── */}
        <div className="dashboard-card p-6">
           <h3 className="font-bold border-b border-slate-200 dark:border-surface-700 pb-3 mb-4">Due Diligence Checklist</h3>
           
           {requirements.length === 0 ? (
             <p className="text-sm text-slate-500 italic">No requirements specified yet.</p>
           ) : (
             <div className="space-y-4">
               {requirements.map(req => {
                 const doc = documents.find(d => d.requirement_id === req.id);
                 return (
                   <div key={req.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-slate-50 dark:bg-surface-950 rounded-xl border border-slate-200 dark:border-surface-800">
                     <div className="flex items-center gap-3">
                        {req.fulfilled ? <CheckCircle className="w-5 h-5 text-emerald-500" /> : <AlertCircle className="w-5 h-5 text-amber-500" />}
                        <div>
                          <div className="font-semibold text-sm">{req.label}</div>
                          <div className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">{req.type}</div>
                        </div>
                     </div>
                     
                     {/* Actions based on role and fulfillment */}
                     <div className="flex-1 max-w-sm ml-auto">
                       {req.fulfilled && doc ? (
                         <div className="text-sm text-right">
                           <a href={doc.file_reference} target="_blank" rel="noreferrer" className="text-bitcoin-600 hover:underline font-medium break-all">
                             View Evidence
                           </a>
                         </div>
                       ) : isBorrower && status === 'docs_requested' && req.type === 'document' ? (
                         <div className="flex gap-2 relative">
                           <div className="flex-1 relative">
                             <input 
                               type="file"
                               id={`file-${req.id}`}
                               className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                               onChange={(e) => {
                                 const file = e.target.files[0];
                                 if (file) {
                                   setSelectedFiles(prev => ({...prev, [req.id]: file.name}));
                                   const reader = new FileReader();
                                   reader.onloadend = () => {
                                     setUploadLinks(prev => ({...prev, [req.id]: reader.result}));
                                   };
                                   reader.readAsDataURL(file);
                                 }
                               }}
                             />
                             <div className="w-full text-left py-2 px-3 text-xs input flex items-center justify-between border-dashed bg-slate-50 dark:bg-surface-900 border-slate-300 dark:border-surface-700 text-slate-500 truncate">
                               <span className="truncate pr-2">{selectedFiles?.[req.id] || 'Click to select document...'}</span>
                               <FileText className="w-4 h-4 shrink-0 opacity-50" />
                             </div>
                           </div>
                           <button onClick={() => handleUpload(req.id)} disabled={!uploadLinks[req.id] || actionLoading} className={`btn-primary py-2 px-4 text-xs ${!uploadLinks[req.id] ? 'opacity-50 cursor-not-allowed' : ''}`}>
                             <UploadCloud className="w-4 h-4" />
                           </button>
                         </div>
                       ) : (
                         <div className="text-xs text-right text-slate-400 font-medium">Pending</div>
                       )}
                     </div>
                   </div>
                 )
               })}
             </div>
           )}
        </div>

        {/* ── LENDER FINAL REVIEW (UNDER_REVIEW) ── */}
        {isLender && status === 'under_review' && (
          <div className="dashboard-card p-6 border-t-4 border-emerald-500 bg-emerald-50/30 dark:bg-emerald-900/10">
             <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">Ready for Disbursement</h3>
             <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">All preconditions have been met. Executing approval will atomically draw funds from your wallet.</p>
             <div className="flex gap-4">
               <button onClick={handleReject} disabled={actionLoading} className="btn-secondary text-rose-600 border-rose-200 bg-rose-50 hover:bg-rose-100 flex-1">
                 Reject Contract
               </button>
               <button onClick={handleApprove} disabled={actionLoading} className="btn-success flex-1">
                 Approve & Disburse
               </button>
             </div>
          </div>
        )}

      </div>
    </div>
  );
}
