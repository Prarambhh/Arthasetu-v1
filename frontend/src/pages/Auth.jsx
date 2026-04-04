import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { register, getNonce, login } from '../api';
import { signNonce, saveWallet } from '../utils/wallet';
import { Zap, Copy, CheckCircle, AlertCircle, Eye, EyeOff, Loader, KeySquare, ShieldCheck } from 'lucide-react';

// ─── Register ────────────────────────────────────────────────────────────────
export function Register() {
  const [username, setUsername] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const navigate = useNavigate();
  const { loginUser } = useAuth();

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await register(username);
      const data = res.data;
      setResult(data);
      saveWallet({ walletAddress: data.walletAddress, privateKey: data.privateKey, publicKey: data.publicKey });
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const copyKey = () => {
    navigator.clipboard.writeText(result.privateKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleContinue = async () => {
    if (!result) return;
    try {
      const nonceRes = await getNonce(result.walletAddress);
      const sig = signNonce(nonceRes.data.nonce, result.privateKey);
      const loginRes = await login(result.walletAddress, sig);
      saveWallet({ walletAddress: result.walletAddress, privateKey: result.privateKey, publicKey: result.publicKey });
      loginUser(loginRes.data, loginRes.data.token);
      navigate('/dashboard');
    } catch (err) {
      setError('Auto-login failed. Use Login page with your wallet address.');
    }
  };

  if (result) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 pt-20">
        <div className="dashboard-card w-full max-w-lg p-8 border-t-4 border-t-bitcoin-500">
          <div className="flex items-center gap-3 mb-6 border-b border-slate-200 dark:border-surface-800 pb-4">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 flex items-center justify-center shadow-sm dark:shadow-none">
              <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-500" />
            </div>
            <div>
              <h2 className="font-bold text-slate-800 dark:text-slate-100 text-lg tracking-tight font-heading">Identity Provisioned</h2>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">Save Private Key securely</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-[11px] text-slate-500 uppercase font-bold tracking-wider mb-1.5 block">Record Name</label>
              <div className="input border-none font-semibold text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-surface-950 shadow-inner dark:shadow-none">{result.username}</div>
            </div>
            <div>
              <label className="text-[11px] text-slate-500 uppercase font-bold tracking-wider mb-1.5 block">Public Wallet Address</label>
              <div className="hash-display text-[11px] bg-slate-50 dark:bg-surface-950 text-slate-700 dark:text-slate-400 border-none shadow-inner dark:shadow-none py-3">{result.walletAddress}</div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] text-slate-500 uppercase font-bold tracking-wider block">Private Key <span className="text-rose-600 dark:text-rose-500 ml-1">(Highly Confidential)</span></label>
                <div className="flex gap-3">
                  <button onClick={() => setShowKey(!showKey)} className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1 transition-colors">
                    {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                  <button onClick={copyKey} className="text-[11px] text-bitcoin-600 dark:text-bitcoin-500 font-bold uppercase tracking-wider hover:text-bitcoin-700 dark:hover:text-bitcoin-400 flex items-center gap-1 transition-colors">
                    {copied ? <CheckCircle className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>
              <div className="font-mono text-[11px] sm:text-xs bg-slate-50 dark:bg-surface-950 px-3 py-3 rounded-lg border-none shadow-inner dark:shadow-none text-rose-600 dark:text-rose-400 break-all">
                {showKey ? result.privateKey : '•'.repeat(64)}
              </div>
            </div>

            <div className="p-4 rounded-lg bg-bitcoin-50 border border-bitcoin-200 dark:bg-bitcoin-500/10 dark:border-bitcoin-500/20 text-xs text-bitcoin-700 dark:text-bitcoin-400 font-medium leading-relaxed shadow-sm dark:shadow-none">
              In a production DeFi environment, this key exists strictly on your hardware enclave. ArthaSetu does not store your private keys.
            </div>
          </div>

          <button onClick={handleContinue} className="btn-primary w-full mt-8 py-3.5 flex justify-center items-center gap-2">
            Securely Enter Terminal <KeySquare className="w-4 h-4"/>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 pt-20">
      <div className="dashboard-card w-full max-w-md p-8 border-t-4 border-t-bitcoin-500">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-lg bg-white dark:bg-surface-900 border border-slate-200 dark:border-surface-800 flex items-center justify-center shadow-sm">
            <KeySquare className="w-6 h-6 text-slate-500 dark:text-slate-300" />
          </div>
          <div>
            <h1 className="font-bold text-slate-900 dark:text-slate-100 text-2xl tracking-tight font-heading">Generate Identity</h1>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mt-1">Local ECDSA Cryptography</p>
          </div>
        </div>

        <form onSubmit={handleRegister} className="space-y-6">
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">System Username</label>
            <input
              id="reg-username"
              className="input text-lg font-semibold"
              placeholder="e.g. participant_alpha"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              minLength={3}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-500 text-sm font-medium shadow-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-primary py-3.5 w-full flex items-center justify-center gap-2 text-base">
            {loading ? <><Loader className="w-5 h-5 animate-spin" /> Initializing...</> : 'Provision Wallet →'}
          </button>
        </form>

        <p className="text-center text-sm font-semibold text-slate-500 mt-6 pt-6 border-t border-slate-200 dark:border-surface-800">
          Existing participant?{' '}
          <Link to="/login" className="text-bitcoin-600 dark:text-bitcoin-500 hover:underline transition-colors ml-1">Authenticate session</Link>
        </p>
      </div>
    </div>
  );
}

// ─── Login ────────────────────────────────────────────────────────────────────
export function Login() {
  const [walletAddress, setWalletAddress] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showKey, setShowKey] = useState(false);
  const { loginUser } = useAuth();
  const navigate = useNavigate();

  const fillFromStorage = () => {
    const w = JSON.parse(localStorage.getItem('arthasetu_wallet') || 'null');
    if (w) {
      setWalletAddress(w.walletAddress || '');
      setPrivateKey(w.privateKey || '');
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const nonceRes = await getNonce(walletAddress.trim());
      const sig = signNonce(nonceRes.data.nonce, privateKey.trim());
      const res = await login(walletAddress.trim(), sig);
      saveWallet({ walletAddress: walletAddress.trim(), privateKey: privateKey.trim() });
      loginUser(res.data, res.data.token);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Authentication denied — Verify credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 pt-20">
      <div className="dashboard-card w-full max-w-md p-8 border-t-4 border-t-bitcoin-500">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-lg bg-white dark:bg-surface-900 border border-slate-200 dark:border-surface-800 flex items-center justify-center shadow-sm">
            <ShieldCheck className="w-6 h-6 text-slate-500 dark:text-slate-300" />
          </div>
          <div>
            <h1 className="font-bold text-slate-900 dark:text-slate-100 text-2xl tracking-tight font-heading">System Access</h1>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mt-1">Cryptographic Verification</p>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] text-slate-500 uppercase tracking-widest font-bold block">Public Identity</label>
              <button type="button" onClick={fillFromStorage} className="text-[10px] uppercase font-bold text-bitcoin-600 dark:text-bitcoin-500 hover:text-bitcoin-700 dark:hover:text-bitcoin-400 tracking-wider">
                Load Cached Token
              </button>
            </div>
            <input
              id="login-wallet"
              className="input font-mono text-sm bg-slate-50 dark:bg-surface-950"
              placeholder="0x..."
              value={walletAddress}
              onChange={e => setWalletAddress(e.target.value)}
              required
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] text-slate-500 uppercase tracking-widest font-bold block">Private Key</label>
              <button type="button" onClick={() => setShowKey(!showKey)} className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 tracking-wider flex items-center gap-1 transition-colors">
                {showKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                {showKey ? 'Hide' : 'Reveal'}
              </button>
            </div>
            <input
              id="login-pk"
              className="input font-mono text-sm bg-slate-50 dark:bg-surface-950"
              type={showKey ? 'text' : 'password'}
              placeholder="Your secp256k1 private key"
              value={privateKey}
              onChange={e => setPrivateKey(e.target.value)}
              required
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-500 text-sm font-medium shadow-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-primary py-3.5 w-full flex items-center justify-center gap-2 text-base">
            {loading ? <><Loader className="w-5 h-5 animate-spin" /> Verifying Challenge...</> : 'Authenticate & Connect →'}
          </button>
        </form>

        <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 dark:bg-surface-950 dark:border-surface-800 mt-6 text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed shadow-inner dark:shadow-none">
          Your key remains purely local to sign a one-time challenge nonce validating wallet ownership.
        </div>

        <p className="text-center text-sm font-semibold text-slate-500 mt-6 pt-6 border-t border-slate-200 dark:border-surface-800">
          No identity found?{' '}
          <Link to="/register" className="text-bitcoin-600 dark:text-bitcoin-500 hover:underline transition-colors ml-1">Provision wallet</Link>
        </p>
      </div>
    </div>
  );
}
