import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { AUSD_ABI, LOANS_ABI, AUSD_ADDRESS, PROTOCOL_ADDRESS, CHAIN_ID } from '../contracts';

const Web3Context = createContext(null);

export function Web3Provider({ children }) {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [ausdContract, setAusdContract] = useState(null);
  const [loansContract, setLoansContract] = useState(null);
  const [ausdBalance, setAusdBalance] = useState('0');
  const [chainError, setChainError] = useState('');
  const [connecting, setConnecting] = useState(false);

  const setupContracts = useCallback((signer) => {
    const ausd = new ethers.Contract(AUSD_ADDRESS, AUSD_ABI, signer);
    const loans = new ethers.Contract(PROTOCOL_ADDRESS, LOANS_ABI, signer);
    setAusdContract(ausd);
    setLoansContract(loans);
    return { ausd, loans };
  }, []);

  const refreshBalance = useCallback(async (ausd, addr) => {
    try {
      const bal = await ausd.balanceOf(addr);
      const decimals = await ausd.decimals();
      setAusdBalance(ethers.formatUnits(bal, decimals));
    } catch (e) {
      console.error('Balance refresh failed', e);
    }
  }, []);

  const connectWallet = useCallback(async () => {
    if (!window.ethereum) {
      setChainError('MetaMask is not installed. Please install it at metamask.io');
      return;
    }
    setConnecting(true);
    setChainError('');
    try {
      // Request account access
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const addr = accounts[0];

      // Check network
      const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' });
      const currentChainId = parseInt(chainIdHex, 16);
      if (currentChainId !== CHAIN_ID) {
        // Try to switch to the local Hardhat network
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: `0x${CHAIN_ID.toString(16)}` }],
          });
        } catch (switchError) {
          // If chain doesn't exist, add it
          if (switchError.code === 4902) {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: `0x${CHAIN_ID.toString(16)}`,
                chainName: 'Hardhat Local',
                nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
                rpcUrls: ['http://127.0.0.1:8545'],
              }],
            });
          } else {
            throw switchError;
          }
        }
      }

      const ethersProvider = new ethers.BrowserProvider(window.ethereum);
      const ethersSigner = await ethersProvider.getSigner();
      setProvider(ethersProvider);
      setSigner(ethersSigner);
      setAccount(addr);

      const { ausd } = setupContracts(ethersSigner);
      await refreshBalance(ausd, addr);

    } catch (err) {
      setChainError(err.message || 'Failed to connect wallet');
    } finally {
      setConnecting(false);
    }
  }, [setupContracts, refreshBalance]);

  const disconnectWallet = useCallback(() => {
    setAccount(null);
    setSigner(null);
    setProvider(null);
    setAusdContract(null);
    setLoansContract(null);
    setAusdBalance('0');
  }, []);

  // Auto-reconnect on load if MetaMask already connected
  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.request({ method: 'eth_accounts' }).then(accounts => {
        if (accounts.length > 0) connectWallet();
      });

      const handleAccountChange = (accounts) => {
        if (accounts.length === 0) disconnectWallet();
        else connectWallet();
      };
      const handleChainChange = () => window.location.reload();

      window.ethereum.on('accountsChanged', handleAccountChange);
      window.ethereum.on('chainChanged', handleChainChange);
      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountChange);
        window.ethereum.removeListener('chainChanged', handleChainChange);
      };
    }
  }, [connectWallet, disconnectWallet]);

  const claimFaucet = useCallback(async () => {
    if (!ausdContract || !account) return;
    const tx = await ausdContract.faucet();
    await tx.wait();
    await refreshBalance(ausdContract, account);
  }, [ausdContract, account, refreshBalance]);

  // Helper to approve AUSD spend and then execute a tx
  const withApproval = useCallback(async (amount, txFn) => {
    const decimals = await ausdContract.decimals();
    const amountWei = ethers.parseUnits(String(amount), decimals);
    const allowance = await ausdContract.allowance(account, PROTOCOL_ADDRESS);
    if (allowance < amountWei) {
      const approveTx = await ausdContract.approve(PROTOCOL_ADDRESS, amountWei);
      await approveTx.wait();
    }
    return txFn(amountWei);
  }, [ausdContract, account]);

  return (
    <Web3Context.Provider value={{
      account,
      provider,
      signer,
      ausdContract,
      loansContract,
      ausdBalance,
      chainError,
      connecting,
      connectWallet,
      disconnectWallet,
      claimFaucet,
      withApproval,
      refreshBalance: () => ausdContract && account ? refreshBalance(ausdContract, account) : Promise.resolve(),
    }}>
      {children}
    </Web3Context.Provider>
  );
}

export function useWeb3() {
  const ctx = useContext(Web3Context);
  if (!ctx) throw new Error('useWeb3 must be used inside Web3Provider');
  return ctx;
}
