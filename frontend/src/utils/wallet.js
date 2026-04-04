/**
 * Wallet utility — secp256k1 signing in the browser using elliptic.js
 * Used for DeFi-authentic login (sign nonce with private key)
 */
import { ec as EC } from 'elliptic';
import CryptoJS from 'crypto-js';

const ec = new EC('secp256k1');

export function signNonce(nonce, privateKey) {
  const keyPair = ec.keyFromPrivate(privateKey, 'hex');
  const msgHash = CryptoJS.SHA256(nonce).toString();
  const signature = keyPair.sign(msgHash);
  return signature.toDER('hex');
}

export function getWalletAddress(publicKey) {
  return '0x' + CryptoJS.SHA256(publicKey).toString().slice(-40);
}

export function saveWallet(walletData) {
  localStorage.setItem('arthasetu_wallet', JSON.stringify(walletData));
}

export function loadWallet() {
  try {
    return JSON.parse(localStorage.getItem('arthasetu_wallet'));
  } catch {
    return null;
  }
}

export function formatAddress(addr) {
  if (!addr) return '';
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}
