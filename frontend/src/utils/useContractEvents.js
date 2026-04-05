import { useState, useEffect, useCallback } from 'react';
import { useWeb3 } from '../context/Web3Context';
import { ON_CHAIN_STATUS } from '../contracts';

/**
 * Custom hook to query and cache on-chain events from the ArthaSetuLoans contract.
 * Returns typed, parsed event arrays for each event type.
 */
export function useContractEvents() {
  const { loansContract, ausdContract, provider, account } = useWeb3();

  const [loanEvents, setLoanEvents] = useState([]);
  const [fundEvents, setFundEvents] = useState([]);
  const [repayEvents, setRepayEvents] = useState([]);
  const [guarantorEvents, setGuarantorEvents] = useState([]);
  const [transferEvents, setTransferEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchEvents = useCallback(async () => {
    if (!loansContract || !provider) return;
    setLoading(true);
    try {
      const [created, funded, repaid, guarantors] = await Promise.all([
        loansContract.queryFilter(loansContract.filters.LoanCreated()),
        loansContract.queryFilter(loansContract.filters.LoanFunded()),
        loansContract.queryFilter(loansContract.filters.LoanRepaid()),
        loansContract.queryFilter(loansContract.filters.GuarantorApproved()),
      ]);

      const mapEvent = (e, type) => ({
        type,
        txHash: e.transactionHash,
        blockNumber: e.blockNumber,
        args: e.args,
        loanId: e.args[0],
        address: e.args[1],
        amount: e.args[2],
      });

      setLoanEvents(created.map(e => mapEvent(e, 'LoanCreated')));
      setFundEvents(funded.map(e => mapEvent(e, 'LoanFunded')));
      setRepayEvents(repaid.map(e => mapEvent(e, 'LoanRepaid')));
      setGuarantorEvents(guarantors.map(e => mapEvent(e, 'GuarantorApproved')));

      // ERC-20 transfers involving the current account
      if (ausdContract && account) {
        const [sent, received] = await Promise.all([
          ausdContract.queryFilter(ausdContract.filters.Transfer(account, null)),
          ausdContract.queryFilter(ausdContract.filters.Transfer(null, account)),
        ]);
        const allTransfers = [...sent, ...received]
          .sort((a, b) => b.blockNumber - a.blockNumber)
          .map(e => ({
            txHash: e.transactionHash,
            blockNumber: e.blockNumber,
            from: e.args[0],
            to: e.args[1],
            amount: e.args[2],
            isOutgoing: e.args[0]?.toLowerCase() === account?.toLowerCase(),
          }));
        setTransferEvents(allTransfers);
      }
    } catch (err) {
      console.error('Error fetching on-chain events:', err);
    } finally {
      setLoading(false);
    }
  }, [loansContract, ausdContract, provider, account]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  return {
    loanEvents,
    fundEvents,
    repayEvents,
    guarantorEvents,
    transferEvents,
    loading,
    refresh: fetchEvents,
  };
}

/**
 * Hook to fetch all on-chain loans by querying LoanCreated events
 * and then reading the current state from the contract.
 */
export function useOnChainLoans() {
  const { loansContract, provider } = useWeb3();
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLoans = useCallback(async () => {
    if (!loansContract || !provider) { setLoading(false); return; }
    setLoading(true);
    try {
      const events = await loansContract.queryFilter(loansContract.filters.LoanCreated());
      const loanPromises = events.map(async (e) => {
        const loanId = e.args[0];
        const data = await loansContract.loans(loanId);
        return {
          loanId,
          borrower: data.borrower,
          lender: data.lender,
          principalAmount: data.principalAmount,
          interestRateBps: data.interestRateBps,
          outstandingPrincipal: data.outstandingPrincipal,
          disbursedAt: Number(data.disbursedAt),
          lastPaymentAt: Number(data.lastPaymentAt),
          status: Number(data.status),
          statusLabel: ON_CHAIN_STATUS[Number(data.status)] || 'UNKNOWN',
          txHash: e.transactionHash,
          blockNumber: e.blockNumber,
        };
      });
      const results = await Promise.all(loanPromises);
      setLoans(results);
    } catch (err) {
      console.error('Error fetching on-chain loans:', err);
    } finally {
      setLoading(false);
    }
  }, [loansContract, provider]);

  useEffect(() => {
    fetchLoans();
  }, [fetchLoans]);

  return { loans, loading, refresh: fetchLoans };
}
