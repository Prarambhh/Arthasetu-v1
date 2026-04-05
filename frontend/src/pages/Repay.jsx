import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { repayLoan, getContracts } from '../api';
import { LoanCard } from '../components/LoanCard';
import { RotateCcw, AlertCircle, CheckCircle, Loader } from 'lucide-react';

export default function Repay() {
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [amount, setAmount] = useState('');
  const navigate = useNavigate();

  const [myActiveLoans, setMyActiveLoans] = useState([]);

  const fetchActiveObligations = async () => {
    try {
      const res = await getContracts(); // from api
      const formattedContracts = res.data.data ? res.data.data.map(c => ({
        ...c,
        loanId: c.loan_id,
        borrowerId: c.borrower_id,
        lenderId: c.lender_id,
        status: c.status === 'pending' ? 'ACTIVE' : 'REPAID',
        outstanding_principal: parseFloat(c.outstanding_principal) || 0,
        borrowerName: c.borrowerName || 'Unknown Counterparty',
        lenderName: c.lenderName
      })) : [];
      setMyActiveLoans(formattedContracts.filter(l => l.borrowerId === user?.userId && l.status === 'ACTIVE'));
    } catch(err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (user?.userId) fetchActiveObligations();
  }, [user?.userId]);

  const handleRepay = async (e) => {
    e.preventDefault();
    if (!selectedLoan) return;

    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      await repayLoan(selectedLoan.loanId, Number(amount));
      setSuccess('Settlement successfully processed. Balance credited to lender.');
      await refreshUser();
      await fetchActiveObligations();
      setSelectedLoan(null);
      setAmount('');
    } catch (err) {
      setError(err.response?.data?.error || 'Settlement execution failed');
    } finally {
      setLoading(false);
    }
  };

  const remainingPrincipal = selectedLoan ? selectedLoan.outstanding_principal : 0;

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-white dark:bg-surface-900 border border-slate-200 dark:border-surface-800 flex items-center justify-center shadow-sm">
              <RotateCcw className="w-5 h-5 text-slate-600 dark:text-slate-300" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Contract Settlement</h1>
          </div>
          <p className="text-slate-600 dark:text-slate-400 ml-[52px] text-sm">Fulfill structural obligations to preserve cryptographic trust and increase limits.</p>
        </div>

        {success && (
          <div className="flex items-center gap-3 p-4 mb-6 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 shadow-sm dark:shadow-none">
            <CheckCircle className="w-6 h-6 text-emerald-600 dark:text-emerald-500" />
            <p className="text-emerald-700 dark:text-emerald-400 font-bold tracking-tight">{success}</p>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 tracking-tight">Active Obligations</h2>
            {myActiveLoans.length > 0 ? (
              <div className="space-y-4">
                {myActiveLoans.map(loan => (
                  <div key={loan.loanId} className={`transition-all duration-300 rounded-2xl ${selectedLoan?.loanId === loan.loanId ? 'ring-2 ring-bitcoin-500 shadow-glow-orange scale-[1.02]' : 'hover:scale-[1.01]'}`}>
                    <LoanCard 
                      loan={loan} 
                      currentUserId={user?.userId} 
                      onRepay={() => {
                        setSelectedLoan(loan);
                        setAmount(loan.outstanding_principal);
                        setError('');
                        setSuccess('');
                      }} 
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="dashboard-card py-16 text-center">
                <p className="text-slate-500 font-medium tracking-tight">No active contracts awaiting settlement.</p>
                <button onClick={() => navigate('/dashboard')} className="mt-4 text-bitcoin-600 dark:text-bitcoin-400 font-bold hover:underline">Return to Dashboard</button>
              </div>
            )}
          </div>

          <div>
            <div className="dashboard-card p-6 sm:p-8 sticky top-24 border-t-4 border-t-emerald-500">
              {selectedLoan ? (
                <>
                  <h3 className="font-bold text-xl text-slate-900 dark:text-slate-100 tracking-tight mb-6">Execute Settlement</h3>
                  <div className="flex justify-between items-end mb-6 bg-slate-50 dark:bg-surface-950 p-4 rounded-xl border border-slate-200 dark:border-surface-800 shadow-inner dark:shadow-none">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold block mb-1">Outstanding Balance</span>
                      <span className="text-2xl font-bold font-mono text-slate-800 dark:text-slate-100">₹{remainingPrincipal.toLocaleString()}</span>
                    </div>
                  </div>

                  <form onSubmit={handleRepay} className="space-y-5">
                    <div>
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Transfer Amount (₹)</label>
                      <input
                        className="input text-lg font-mono font-bold"
                        type="number"
                        min="1"
                        max={remainingPrincipal}
                        value={amount}
                        onChange={e => setAmount(e.target.value)}
                        required
                      />
                      <button 
                        type="button" 
                        onClick={() => setAmount(remainingPrincipal)}
                        className="text-xs text-bitcoin-600 dark:text-bitcoin-400 mt-2 font-bold hover:underline"
                      >
                        Settle Full Balance
                      </button>
                    </div>

                    {error && (
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-500 text-sm font-medium">
                        <AlertCircle className="w-4 h-4 shrink-0" />{error}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={loading || !amount || amount <= 0}
                      className="btn-success w-full py-3.5 flex items-center justify-center gap-2 text-base font-bold shadow-sm"
                    >
                      {loading ? <><Loader className="w-5 h-5 animate-spin" /> Executing...</> : <><CheckCircle className="w-5 h-5" /> Execute Settlement</>}
                    </button>
                  </form>
                </>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-surface-800 flex items-center justify-center mx-auto mb-4 border border-slate-200 dark:border-surface-700">
                    <RotateCcw className="w-6 h-6 text-slate-400" />
                  </div>
                  <p className="text-slate-500 font-medium">Select an active contract from the left to execute a settlement.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
