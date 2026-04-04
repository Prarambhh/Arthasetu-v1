export function TrustTierBadge({ tier, score, size = 'md', showRecommendation = false }) {
  const config = {
    HIGH_RISK:  { 
      label: 'High Risk', 
      recommendation: 'Not Recommended',
      color: 'text-rose-700 bg-rose-100 border-rose-200 dark:text-rose-400 dark:bg-rose-500/10 dark:border-rose-500/20' 
    },
    MODERATE:   { 
      label: 'Moderate',  
      recommendation: 'Evaluate Carefully',
      color: 'text-amber-700 bg-amber-100 border-amber-200 dark:text-amber-400 dark:bg-amber-500/10 dark:border-amber-500/20' 
    },
    TRUSTED:    { 
      label: 'Trusted',   
      recommendation: 'Safe to fund',
      color: 'text-bitcoin-600 bg-bitcoin-50 border-bitcoin-200 dark:text-bitcoin-400 dark:bg-bitcoin-500/10 dark:border-bitcoin-500/30' 
    },
    PRIME:      { 
      label: 'Prime',     
      recommendation: 'Highly Recommended',
      color: 'text-emerald-700 bg-emerald-100 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-500/10 dark:border-emerald-500/20' 
    },
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-[11px]',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm',
  };

  const { label, recommendation, color } = config[tier] || config['MODERATE'];

  return (
    <div className={`inline-flex items-center gap-1.5 rounded-md font-semibold border ${color} ${sizes[size]}`}>
      <span className="inline-block w-1.5 h-1.5 rounded-full bg-current opacity-70" />
      <span>{label}</span>
      {score !== undefined && <span className="opacity-60 ml-0.5 font-mono">({score})</span>}
      {showRecommendation && (
        <>
          <span className="opacity-30 mx-0.5">|</span>
          <span>{recommendation}</span>
        </>
      )}
    </div>
  );
}

export function LoanStatusBadge({ status }) {
  const map = {
    PENDING:   'badge-pending',
    ACTIVE:    'badge-active',
    REPAID:    'badge-repaid',
    DEFAULTED: 'badge-defaulted',
  };
  return (
    <span className={map[status] || 'badge-pending'}>
      {status}
    </span>
  );
}
