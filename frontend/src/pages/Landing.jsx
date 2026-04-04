import { Link } from 'react-router-dom';
import { ArrowRight, Shield, ShieldCheck, Activity, BrainCircuit } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

function FeatureCard({ icon: Icon, title, description }) {
  return (
    <div className="dashboard-card p-6 border-t-2 border-t-bitcoin-500 hover:-translate-y-1 transition-transform duration-300 group">
      <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-surface-900 border border-slate-200 dark:border-surface-800 flex items-center justify-center mb-6 group-hover:bg-bitcoin-50 dark:group-hover:bg-bitcoin-500/10 group-hover:border-bitcoin-200 dark:group-hover:border-bitcoin-500/30 transition-colors shadow-sm dark:shadow-none">
        <Icon className="w-6 h-6 text-slate-500 dark:text-slate-300 group-hover:text-bitcoin-600 dark:group-hover:text-bitcoin-400 transition-colors" />
      </div>
      <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-3 tracking-tight">{title}</h3>
      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium">{description}</p>
    </div>
  );
}

export default function Landing() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen">
      
      {/* Hero Section */}
      <div className="relative pt-32 pb-20 sm:pt-40 sm:pb-24 px-4 overflow-hidden">
        
        {/* Abstract Backgrounds mimicking Bitcoin Orange flows */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-bitcoin-500/5 dark:bg-bitcoin-500/10 rounded-full blur-[100px] pointer-events-none"></div>

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-bitcoin-50 dark:bg-bitcoin-500/10 border border-bitcoin-200 dark:border-bitcoin-500/20 text-bitcoin-600 dark:text-bitcoin-400 text-[11px] font-bold uppercase tracking-widest mb-8 shadow-sm dark:shadow-none">
             <Activity className="w-3.5 h-3.5" /> Protocol v1.0.0 Active
          </div>
          
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold text-slate-900 dark:text-slate-100 tracking-tight leading-[1.1] mb-6 font-heading">
            Decentralized Trust,<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-bitcoin-600 to-amber-400 dark:from-bitcoin-500 dark:to-bitcoin-400">
              Institutional Execution.
            </span>
          </h1>
          
          <p className="text-base sm:text-xl text-slate-600 dark:text-slate-400 mb-10 max-w-2xl mx-auto font-medium leading-relaxed">
            A peer-to-peer lending architecture that algorithmically enforces reputation. 
            Replace banks with unalterable cryptographic behavioral scoring.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {user ? (
              <Link to="/dashboard" className="btn-primary py-3.5 px-8 text-base shadow-fintech-light dark:shadow-glow-orange w-full sm:w-auto flex items-center justify-center gap-2">
                Enter Terminal <ArrowRight className="w-5 h-5" />
              </Link>
            ) : (
              <>
                <Link to="/register" className="btn-primary py-3.5 px-8 text-base shadow-fintech-light dark:shadow-glow-orange w-full sm:w-auto">
                  Provision Identity
                </Link>
                <Link to="/explorer" className="btn-secondary py-3.5 px-8 text-base shadow-sm dark:shadow-none w-full sm:w-auto text-center">
                  Inspect Public Ledger
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Grid of truth */}
      <div className="max-w-7xl mx-auto px-4 pb-32">
        <div className="text-center mb-12">
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-3">Core Infrastructure</h2>
            <div className="w-16 h-1 bg-gradient-to-r from-bitcoin-500 to-amber-300 mx-auto rounded-full"></div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 sm:gap-8">
          <FeatureCard 
            icon={BrainCircuit}
            title="Algorithmic Reputation"
            description="No arbitrary credit scores. Your limit dynamically expands strictly via mathematical deduction based on on-time contract settlements."
          />
          <FeatureCard 
            icon={ShieldCheck}
            title="Sovereign Cryptography"
            description="Your SECP256k1 private key never leaves your local enclave. Authentication relies purely on cryptographic signatures verifying ownership."
          />
          <FeatureCard 
            icon={Shield}
            title="Unalterable Auditing"
            description="The entire ledger is accessible and constantly hashes sequence data. Manipulation is mathematically impossible."
          />
        </div>
      </div>

    </div>
  );
}
