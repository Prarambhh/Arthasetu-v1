import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWeb3 } from '../context/Web3Context';
import { useOnChainLoans } from '../utils/useContractEvents';
import { formatAUSD, parseAUSD, ON_CHAIN_STATUS, formatBytes32, PROTOCOL_ADDRESS } from '../contracts';
import { ethers } from 'ethers';
import { RotateCcw, AlertCircle, CheckCircle, Loader, Wallet, ExternalLink } from 'lucide-react';

function RepayLoanCard({ loan, selected, onSelect, currentAccount }) {
  const amount = formatAUSD(loan.principalAmount);
  const outstanding = formatAUSD(loan.outstandingPrincipal);
  const isSelected = selected?.loanId === loan.loanId;

  return (
    <div
      onClick={() => onSelect(loan)}
      className={`dashboard-card p-5 cursor-pointer transition-all duration-300 ${
        isSelected ? 'ring-2 ring-bitcoin-500 shadow-glow-orange scale-[1.02] border-bitcoin-500/50' : 'hover:scale-[1.01] hover:border-bitcoin-500/30'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-1">Active Loan</div>
          <div className="text-lg font-bold font-mono text-slate-800 dark:text-slate-100">{amount} AUSD</div>
        </div>
        <span className="px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20">
          {ON_CHAIN_STATUS[loan.status]}
        </span>
      </div>

      <div className="space-y-2 text-xs">
        <div className="flex justify-between">
          <span className="text-slate-500 font-semibold uppercase tracking-wider">Outstanding</span>
          <span className="font-bold font-mono text-rose-600 dark:text-rose-400">{outstanding} AUSD</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500 font-semibold uppercase tracking-wider">Lender</span>
          <span className="font-mono text-slate-600 dark:text-slate-400">{loan.lender?.slice(0, 6)}…{loan.lender?.slice(-4)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500 font-semibold uppercase tracking-wider">Loan ID</span>
          <span className="font-mono text-[10px] text-slate-500">{formatBytes32(loan.loanId)}</span>
        </div>
      </div>
    </div>
  );
}

export default function Repay() {
  const { user } = useAuth();
  const { account, loansContract, ausdContract, ausdBalance, connectWallet, connecting, refreshBalance } = useWeb3();
  const { loans, loading: loansLoading, refresh } = useOnChainLoans();
  const navigate = useNavigate();

  const [selectedLoan, setSelectedLoan] = useState(null);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);

  // Filter for DISBURSED loans where the current account is the borrower
  const myActiveLoans = loans.filter(l =>
    l.status === 4 && // DISBURSED
    l.borrower?.toLowerCase() === account?.toLowerCase()
  );

  const handleSelectLoan = (loan) => {
    setSelectedLoan(loan);
    const outstandingFormatted = ethers.formatUnits(loan.outstandingPrincipal, 18);
    setAmount(outstandingFormatted);
    setError('');
    setSuccess(null);
  };

  const handleRepay = useCallback(async (e) => {
    e.preventDefault();
    if (!selectedLoan || !account || !loansContract || !ausdContract) return;

    setLoading(true);
    setError('');
    setSuccess(null);

    try {
      const amountWei = parseAUSD(amount);

      // 1. Approve ERC-20 spending
      const allowance = await ausdContract.allowance(account, PROTOCOL_ADDRESS);
      if (allowance < amountWei) {
        const approveTx = await ausdContract.approve(PROTOCOL_ADDRESS, amountWei);
        await approveTx.wait();
      }

      // 2. Execute repayment on-chain
      const tx = await loansContract.repayLoan(selectedLoan.loanId, amountWei);
      const receipt = await tx.wait();

      setSuccess({
        amount: amount,
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        loanId: selectedLoan.loanId,
      });

      // Refresh
      await refreshBalance();
      await refresh();
      setSelectedLoan(null);
      setAmount('');
    } catch (err) {
      console.error('On-chain repay failed:', err);
      if (err.code === 'ACTION_REJECTED') {
        setError('Transaction rejected in MetaMask');
      } else {
        setError(err.reason || err.message || 'Repayment failed');
      }
    } finally {
      setLoading(false);
    }
  }, [selectedLoan, account, loansContract, ausdContract, amount, refreshBalance, refresh]);

  const outstandingDisplay = selectedLoan
    ? Number(ethers.formatUnits(selectedLoan.outstandingPrincipal, 18))
    : 0;

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-white dark:bg-surface-900 border border-slate-200 dark:border-surface-800 flex items-center justify-center shadow-sm">
              <RotateCcw className="w-5 h-5 text-slate-600 dark:text-slate-300" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">On-Chain Settlement</h1>
          </div>
          <p className="text-slate-600 dark:text-slate-400 ml-[52px] text-sm">Repay outstanding loans directly on-chain via smart contract.</p>
        </div>

        {/* MetaMask Guard */}
        {!account && (
          <div className="dashboard-card p-6 mb-6 border-t-4 border-t-bitcoin-500">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-bitcoin-50 dark:bg-bitcoin-500/10 border border-bitcoin-200 dark:border-bitcoin-500/30 flex items-center justify-center">
                <Wallet className="w-6 h-6 text-bitcoin-500" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-slate-800 dark:text-slate-100">Connect MetaMask</h3>
                <p className="text-xs text-slate-500 mt-0.5">Required for on-chain loan repayment</p>
              </div>
              <button onClick={connectWallet} disabled={connecting} className="btn-primary py-2.5 px-5 text-sm">
                {connecting ? 'Connecting...' : 'Connect'}
              </button>
            </div>
          </div>
        )}

        {/* Success Banner */}
        {success && (
          <div className="flex items-start gap-3 p-5 mb-6 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 shadow-sm animate-fade-in">
            <CheckCircle className="w-6 h-6 text-emerald-600 dark:text-emerald-500 mt-0.5" />
            <div>
              <h3 className="font-bold text-emerald-700 dark:text-emerald-400">On-Chain Settlement Complete!</h3>
              <p className="text-sm text-emerald-600/80 dark:text-emerald-500/70 mt-1">{success.amount} AUSD transferred to lender at block #{success.blockNumber}</p>
              <p className="text-[10px] font-mono text-emerald-600/60 dark:text-emerald-500/50 mt-1 break-all">Tx: {success.txHash}</p>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 tracking-tight flex items-center gap-2">
              <ExternalLink className="w-4 h-4 text-bitcoin-500" /> Active On-Chain Obligations
            </h2>
            {loansLoading ? (
              <div className="flex items-center gap-2 py-10 justify-center text-slate-500"><Loader className="w-4 h-4 animate-spin" /> Reading chain...</div>
            ) : myActiveLoans.length > 0 ? (
              <div className="space-y-4">
                {myActiveLoans.map(loan => (
                  <RepayLoanCard
                    key={loan.loanId}
                    loan={loan}
                    selected={selectedLoan}
                    onSelect={handleSelectLoan}
                    currentAccount={account}
                  />
                ))}
              </div>
            ) : (
              <div className="dashboard-card py-16 text-center">
                <p className="text-slate-500 font-medium tracking-tight">No active on-chain contracts awaiting settlement.</p>
                <button onClick={() => navigate('/dashboard')} className="mt-4 text-bitcoin-600 dark:text-bitcoin-400 font-bold hover:underline">Return to Dashboard</button>
              </div>
            )}
          </div>

          <div>
            <div className="dashboard-card p-6 sm:p-8 sticky top-24 border-t-4 border-t-emerald-500">
              {selectedLoan ? (
                <>
                  <h3 className="font-bold text-xl text-slate-900 dark:text-slate-100 tracking-tight mb-6">Execute On-Chain Settlement</h3>
                  <div className="flex justify-between items-end mb-6 bg-slate-50 dark:bg-surface-950 p-4 rounded-xl border border-slate-200 dark:border-surface-800 shadow-inner dark:shadow-none">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold block mb-1">Outstanding Balance</span>
                      <span className="text-2xl font-bold font-mono text-slate-800 dark:text-slate-100">{outstandingDisplay.toLocaleString('en-IN', { maximumFractionDigits: 2 })} AUSD</span>
                    </div>
                  </div>

                  {account && (
                    <div className="flex justify-between items-center mb-5 text-xs">
                      <span className="text-slate-500 font-semibold uppercase tracking-wider">Your AUSD Balance</span>
                      <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400">{Number(ausdBalance).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                    </div>
                  )}

                  <form onSubmit={handleRepay} className="space-y-5">
                    <div>
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Repayment Amount (AUSD)</label>
                      <input
                        className="input text-lg font-mono font-bold"
                        type="number"
                        min="0.01"
                        step="any"
                        value={amount}
                        onChange={e => setAmount(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setAmount(ethers.formatUnits(selectedLoan.outstandingPrincipal, 18))}
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

                    <div className="p-3 rounded-lg bg-slate-50 dark:bg-surface-950 border border-slate-200 dark:border-surface-800 text-xs space-y-1.5">
                      <div className="flex justify-between"><span className="text-slate-500">Contract</span><span className="font-mono text-slate-600 dark:text-slate-400">repayLoan()</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Token</span><span className="font-mono text-slate-600 dark:text-slate-400">AUSD (ERC-20)</span></div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading || !amount || Number(amount) <= 0 || !account}
                      className="btn-success w-full py-3.5 flex items-center justify-center gap-2 text-base font-bold shadow-sm"
                    >
                      {loading ? <><Loader className="w-5 h-5 animate-spin" /> Confirming on-chain...</> : <><CheckCircle className="w-5 h-5" /> Execute On-Chain Settlement</>}
                    </button>
                  </form>
                </>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-surface-800 flex items-center justify-center mx-auto mb-4 border border-slate-200 dark:border-surface-700">
                    <RotateCcw className="w-6 h-6 text-slate-400" />
                  </div>
                  <p className="text-slate-500 font-medium">Select an on-chain loan from the left to execute settlement.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
