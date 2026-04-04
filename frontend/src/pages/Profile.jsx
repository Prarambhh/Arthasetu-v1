import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getUserProfile, getNonce, login } from '../api';
import { signNonce, saveWallet } from '../utils/wallet';
import { useAuth } from '../context/AuthContext';
import { TrustTierBadge } from '../components/TrustTierBadge';
import { formatAddress } from '../utils/wallet';
import { ShieldCheck, UserCheck, Activity, Copy, CheckCircle, ArrowLeft, KeySquare } from 'lucide-react';

function CreditScoreRing({ score, tier }) {
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  
  const getColor = () => {
    if (tier === 'PRIME' || tier === 'TRUSTED') return '#10B981'; // emerald-500
    if (tier === 'MODERATE') return '#F59E0B'; // amber-500
    return '#E11D48'; // rose-600
  };

  return (
    <div className="relative w-48 h-48 flex items-center justify-center">
      {/* Glow effect matching Bitcoin theme or risk theme */}
      <div className="absolute inset-0 rounded-full blur-[30px] opacity-20 transition-all duration-1000 dark:opacity-30" style={{ backgroundColor: getColor() }}></div>
      <svg className="w-full h-full transform -rotate-90 relative z-10 drop-shadow-md">
        <circle
          cx="96" cy="96" r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="12"
          className="text-slate-200 dark:text-surface-800"
        />
        <circle
          cx="96" cy="96" r={radius}
          fill="none"
          stroke={getColor()}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out drop-shadow-sm"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center z-20">
        <span className="text-4xl font-bold text-slate-800 dark:text-slate-100 font-mono tracking-tighter">{score}</span>
        <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-1">Score Matrix</span>
      </div>
    </div>
  );
}

export default function Profile() {
  const { id } = useParams();
  const { user: currentUser, loginUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pastedKey, setPastedKey] = useState('');
  const [authError, setAuthError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    getUserProfile(id)
      .then(res => setProfile(res.data))
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, [id]);

  const handleImpersonate = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      const nonceRes = await getNonce(profile.walletAddress);
      const sig = signNonce(nonceRes.data.nonce, pastedKey);
      const res = await login(profile.walletAddress, sig);
      
      saveWallet({
        walletAddress: profile.walletAddress,
        privateKey: pastedKey
      });
      
      loginUser(res.data, res.data.token);
      alert('Sovereign Control Established.');
    } catch (err) {
      setAuthError('Cryptographic failure. Verify private key.');
    }
  };

  const copyAddress = () => {
    navigator.clipboard.writeText(profile.walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return null;

  if (!profile) return (
    <div className="min-h-screen pt-24 px-4 flex items-center justify-center">
      <div className="dashboard-card p-10 text-center max-w-md w-full">
        <UserCheck className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 tracking-tight">Identity Unresolved</h2>
        <p className="text-slate-500 text-sm mt-2">The system cannot locate this cryptographic profile.</p>
        <Link to="/community" className="btn-secondary mt-6 inline-flex px-6 py-2.5">Return to Directory</Link>
      </div>
    </div>
  );

  const isMe = currentUser?.userId === profile.userId;
  const isDemo = true; // In this system, all accounts can technically be assumed if the key is known

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        
        <Link to={-1} className="inline-flex items-center text-sm font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Return
        </Link>

        {/* Identity Head */}
        <div className="dashboard-card overflow-hidden">
          <div className="h-28 bg-gradient-to-r from-bitcoin-500 to-amber-400 opacity-90 dark:opacity-20 flex items-center px-8 relative">
             <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIi8+PC9zdmc+')] [mask-image:linear-gradient(to_bottom,white,transparent)]"></div>
          </div>
          <div className="px-5 sm:px-8 pb-8 relative -mt-12 sm:-mt-16 flex flex-col sm:flex-row gap-5 items-center sm:items-end sm:justify-between">
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5">
              <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl bg-white dark:bg-surface-900 border-4 border-slate-50 dark:border-surface-dark_alt flex items-center justify-center text-4xl sm:text-5xl font-bold text-slate-700 dark:text-slate-300 shadow-fintech-lg-light dark:shadow-glow-orange relative z-10">
                {profile.username[0].toUpperCase()}
              </div>
              <div className="text-center sm:text-left mb-2">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center justify-center sm:justify-start gap-2">
                  {profile.username}
                  {isMe && <span className="text-[10px] bg-bitcoin-500 text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-widest align-middle">You</span>}
                </h1>
                <button 
                  onClick={copyAddress}
                  className="flex items-center justify-center sm:justify-start gap-1.5 text-sm font-mono text-slate-500 hover:text-bitcoin-600 dark:hover:text-bitcoin-400 transition-colors mt-1 hover:bg-slate-100 dark:hover:bg-surface-800 px-2 py-1 -ml-2 rounded-lg group"
                >
                  {formatAddress(profile.walletAddress)}
                  {copied ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100" />}
                </button>
              </div>
            </div>
            
            <div className="mb-2">
              <TrustTierBadge tier={profile.trustTier} score={profile.creditScore} size="lg" showRecommendation={true} />
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Main Stats panel */}
          <div className="md:col-span-2 dashboard-card p-6 sm:p-8">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 border-b border-slate-200 dark:border-surface-800 pb-3 mb-6 tracking-tight flex items-center gap-2">
              <Activity className="w-5 h-5 text-bitcoin-500" /> Risk Diagnostics Matrix
            </h2>
            
            <div className="flex flex-col sm:flex-row items-center gap-8 lg:gap-12 pl-0 sm:pl-4">
              <CreditScoreRing score={profile.creditScore} tier={profile.trustTier} />
              
              <div className="flex-1 w-full space-y-4">
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-[#12151b] border border-slate-200 dark:border-surface-800 shadow-sm dark:shadow-none transition-colors hover:border-emerald-300 dark:hover:border-emerald-500/30">
                  <span className="text-xs uppercase font-bold tracking-wider text-slate-500">On-Time Settlements</span>
                  <span className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-500 px-2 bg-emerald-100 dark:bg-emerald-500/10 rounded">{profile.onTimeRepayments}</span>
                </div>
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-[#12151b] border border-slate-200 dark:border-surface-800 shadow-sm dark:shadow-none transition-colors hover:border-amber-300 dark:hover:border-amber-500/30">
                  <span className="text-xs uppercase font-bold tracking-wider text-slate-500">Open Contracts</span>
                  <span className="text-lg font-bold font-mono text-amber-600 dark:text-amber-500 px-2 bg-amber-100 dark:bg-amber-500/10 rounded">{profile.activeLoans}</span>
                </div>
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-[#12151b] border border-slate-200 dark:border-surface-800 shadow-sm dark:shadow-none transition-colors hover:border-rose-300 dark:hover:border-rose-500/30">
                  <span className="text-xs uppercase font-bold tracking-wider text-slate-500">Default Events</span>
                  <span className="text-lg font-bold font-mono text-rose-600 dark:text-rose-500 px-2 bg-rose-100 dark:bg-rose-500/10 rounded">{profile.missedPayments}</span>
                </div>
                <div className="flex justify-between items-center px-1 mt-6 text-[10px] text-slate-400 font-semibold uppercase tracking-widest border-t border-slate-200 dark:border-surface-800/50 pt-3">
                  <span>Profile Originated</span>
                  <span>{new Date(profile.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action sidebar */}
          <div className="space-y-6">
            {!isMe && isDemo && (
              <div className="dashboard-card p-6 border-t-2 border-t-bitcoin-500">
                <div className="flex items-center gap-2 mb-2 text-slate-800 dark:text-slate-100 font-bold tracking-tight">
                  <KeySquare className="w-5 h-5 text-bitcoin-500" /> Administrative Override
                </div>
                <p className="text-xs text-slate-500 mb-4 leading-relaxed font-medium">As a demonstration system, you may provide the private key to authenticate as this identity.</p>
                
                <form onSubmit={handleImpersonate}>
                  <input
                    type="password"
                    placeholder="Enter Private Key"
                    className="input text-sm py-2 mb-3"
                    value={pastedKey}
                    onChange={e => setPastedKey(e.target.value)}
                    required
                  />
                  {authError && <p className="text-rose-500 text-xs font-bold mb-3">{authError}</p>}
                  <button type="submit" className="btn-secondary w-full py-2 flex items-center justify-center gap-2 text-sm shadow-sm dark:shadow-none">
                    <ShieldCheck className="w-4 h-4" /> Authenticate Identity
                  </button>
                </form>
              </div>
            )}
            
            {/* Summary card */}
            <div className="dashboard-card p-6">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-4 tracking-tight flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-bitcoin-500" /> Identity Assessment
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                {profile.trustTier === 'PRIME' && "This identity demonstrates exceptional institutional execution with zero margin of error."}
                {profile.trustTier === 'TRUSTED' && "Demonstrates reliable capital deployment and settlement history."}
                {profile.trustTier === 'MODERATE' && "Algorithmic safety net required. Monitor settlement execution."}
                {profile.trustTier === 'HIGH_RISK' && "Warning: Extensive structural failure in settlement procedures. Capital flight risk."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
