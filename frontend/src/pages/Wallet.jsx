import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useWeb3 } from '../context/Web3Context';
import { useContractEvents } from '../utils/useContractEvents';
import { formatAUSD, formatBytes32 } from '../contracts';
import { ethers } from 'ethers';
import { Wallet as WalletIcon, ArrowDownRight, ArrowUpRight, Clock, AlertCircle, Zap, Droplets, ExternalLink, Loader, CheckCircle, Copy } from 'lucide-react';

export default function Wallet() {
  const { user } = useAuth();
  const { account, ausdBalance, ausdContract, connectWallet, connecting, claimFaucet, refreshBalance } = useWeb3();
  const { transferEvents, loading: eventsLoading, refresh } = useContractEvents();
  const [faucetLoading, setFaucetLoading] = useState(false);
  const [faucetSuccess, setFaucetSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleFaucet = async () => {
    setFaucetLoading(true);
    setFaucetSuccess(false);
    try {
      await claimFaucet();
      setFaucetSuccess(true);
      await refresh();
      setTimeout(() => setFaucetSuccess(false), 5000);
    } catch (err) {
      console.error('Faucet claim failed:', err);
    } finally {
      setFaucetLoading(false);
    }
  };

  const copyAddress = () => {
    if (account) {
      navigator.clipboard.writeText(account);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!account) {
    return (
      <div className="min-h-screen pt-24 px-4 flex items-center justify-center">
        <div className="dashboard-card p-10 text-center max-w-md w-full border-t-4 border-t-bitcoin-500">
          <div className="w-16 h-16 rounded-full bg-bitcoin-50 dark:bg-bitcoin-500/10 border border-bitcoin-200 dark:border-bitcoin-500/30 flex items-center justify-center mx-auto mb-6">
            <WalletIcon className="w-8 h-8 text-bitcoin-500" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-2">Connect MetaMask</h2>
          <p className="text-slate-500 mb-6 text-sm">Connect your MetaMask wallet to view your on-chain AUSD balance and transaction history.</p>
          <button onClick={connectWallet} disabled={connecting} className="btn-primary w-full py-3 text-base">
            {connecting ? 'Connecting...' : 'Connect MetaMask Wallet'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-4xl mx-auto space-y-8">

        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-3">
            <WalletIcon className="w-8 h-8 text-bitcoin-500" /> On-Chain Wallet
          </h1>
          <p className="text-slate-500 mt-2 font-medium flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-500/20">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Connected</span>
            </span>
            <button onClick={copyAddress} className="font-mono text-xs text-slate-500 hover:text-bitcoin-500 transition-colors cursor-pointer flex items-center gap-1">
              {account?.slice(0, 6)}…{account?.slice(-4)}
              {copied ? <CheckCircle className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
            </button>
          </p>
        </div>

        {/* Balance Card */}
        <div className="dashboard-card overflow-hidden">
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 dark:from-surface-900 dark:to-surface-950 p-8 text-white relative">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <WalletIcon className="w-32 h-32" />
            </div>
            <div className="relative z-10">
              <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-2">AUSD On-Chain Balance</h2>
              <div className="text-5xl font-extrabold font-mono tracking-tight text-emerald-400">
                {Number(ausdBalance).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-slate-500 mt-2 font-mono">ArthaStable (ERC-20) on Hardhat Chain 31337</p>
              <div className="mt-6 flex items-center gap-3">
                <div className="inline-flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-lg text-sm font-medium backdrop-blur-md">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  Live On-Chain Balance
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Faucet section */}
        <div className="dashboard-card p-6 border-t-4 border-t-blue-500">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 flex items-center justify-center">
                <Droplets className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 dark:text-slate-100">Test Token Faucet</h3>
                <p className="text-xs text-slate-500 mt-0.5">Claim 10,000 AUSD test tokens per request</p>
              </div>
            </div>
            <button
              onClick={handleFaucet}
              disabled={faucetLoading}
              className="btn-primary py-2.5 px-6 text-sm flex items-center gap-2"
            >
              {faucetLoading ? <><Loader className="w-4 h-4 animate-spin" /> Claiming...</> : <><Zap className="w-4 h-4" /> Claim Tokens</>}
            </button>
          </div>
          {faucetSuccess && (
            <div className="mt-4 flex items-center gap-2 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm font-medium animate-fade-in">
              <CheckCircle className="w-4 h-4" /> 10,000 AUSD claimed successfully!
            </div>
          )}
        </div>

        {/* Transactions */}
        <div className="dashboard-card p-0 overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-200 dark:border-surface-800 bg-slate-50 dark:bg-surface-900/50 flex items-center justify-between">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg flex items-center gap-2">
              <ExternalLink className="w-4 h-4 text-bitcoin-500" /> On-Chain Transfer History
            </h3>
            <button onClick={refresh} className="text-xs text-bitcoin-600 dark:text-bitcoin-400 font-bold hover:underline">Refresh</button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-surface-800">
            {eventsLoading ? (
              <div className="p-10 text-center text-slate-500 font-medium flex items-center justify-center gap-2">
                <Loader className="w-4 h-4 animate-spin" /> Loading on-chain events...
              </div>
            ) : transferEvents.length === 0 ? (
              <div className="p-10 text-center text-slate-500 font-medium">
                No on-chain transfers recorded for this address.
              </div>
            ) : (
              transferEvents.slice(0, 50).map((tx, i) => {
                const Icon = tx.isOutgoing ? ArrowUpRight : ArrowDownRight;
                const amountFormatted = formatAUSD(tx.amount);

                return (
                  <div key={`${tx.txHash}-${i}`} className="p-5 sm:px-6 hover:bg-slate-50 dark:hover:bg-surface-900/30 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        tx.isOutgoing
                          ? 'bg-rose-100 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400'
                          : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
                      }`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 dark:text-slate-100 text-[15px]">
                          {tx.isOutgoing ? 'AUSD Sent' : 'AUSD Received'}
                        </div>
                        <div className="text-xs text-slate-500 mt-1 flex items-center gap-1 font-medium">
                          <span className="font-mono text-[10px]">Block #{tx.blockNumber}</span>
                        </div>
                        <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                          {tx.isOutgoing ? `To: ${tx.to?.slice(0, 8)}…${tx.to?.slice(-6)}` : `From: ${tx.from?.slice(0, 8)}…${tx.from?.slice(-6)}`}
                        </div>
                      </div>
                    </div>

                    <div className="text-right sm:ml-auto pl-14 sm:pl-0">
                      <div className={`text-lg font-bold font-mono tracking-tight ${
                        tx.isOutgoing ? 'text-slate-900 dark:text-slate-100' : 'text-emerald-600 dark:text-emerald-400'
                      }`}>
                        {tx.isOutgoing ? '-' : '+'}{amountFormatted} AUSD
                      </div>
                      <div className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mt-1 font-mono">
                        Tx: {tx.txHash?.substring(0, 12)}...
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
