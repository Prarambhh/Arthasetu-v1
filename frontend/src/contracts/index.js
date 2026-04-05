import { ethers } from 'ethers';

// ── ABI extracts for the two deployed contracts ─────────────────────────────

export const AUSD_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function faucet()",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function name() view returns (string)",
  "function totalSupply() view returns (uint256)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event Approval(address indexed owner, address indexed spender, uint256 value)"
];

export const LOANS_ABI = [
  "function createLoan(bytes32 _id, uint256 _amount)",
  "function fundAndDisburse(bytes32 _id, uint256 _interestRateBps)",
  "function approveGuarantor(bytes32 _id)",
  "function repayLoan(bytes32 _id, uint256 _amount)",
  "function calculateAccruedInterest(bytes32 _id) view returns (uint256)",
  "function loans(bytes32) view returns (bytes32 id, address borrower, address lender, uint256 principalAmount, uint256 interestRateBps, uint256 outstandingPrincipal, uint256 disbursedAt, uint256 lastPaymentAt, uint8 status)",
  "function guarantorApprovals(bytes32, address) view returns (bool)",
  "event LoanCreated(bytes32 indexed id, address indexed borrower, uint256 amount)",
  "event LoanFunded(bytes32 indexed id, address indexed lender, uint256 interestRateBps)",
  "event LoanDisbursed(bytes32 indexed id, address indexed borrower, uint256 amount)",
  "event LoanRepaid(bytes32 indexed id, address indexed borrower, uint256 amount)",
  "event GuarantorApproved(bytes32 indexed id, address indexed guarantor)"
];

// ── Deployed Addresses ──────────────────────────────────────────────────────

export const AUSD_ADDRESS   = import.meta.env.VITE_AUSD_ADDRESS   || "0x5FbDB2315678afecb367f032d93F642f64180aa3";
export const PROTOCOL_ADDRESS = import.meta.env.VITE_PROTOCOL_ADDRESS || "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
export const CHAIN_ID = Number(import.meta.env.VITE_CHAIN_ID || 31337);

// ── On-chain status enum (matches Solidity) ─────────────────────────────────

export const ON_CHAIN_STATUS = {
  0: 'REQUESTED',
  1: 'DOCS_REQUESTED',
  2: 'UNDER_REVIEW',
  3: 'APPROVED',
  4: 'DISBURSED',
  5: 'SETTLED',
  6: 'REJECTED',
};

export const STATUS_TO_INT = Object.fromEntries(
  Object.entries(ON_CHAIN_STATUS).map(([k, v]) => [v, Number(k)])
);

// ── Utility Functions ───────────────────────────────────────────────────────

/**
 * Convert a UUID or arbitrary string to a deterministic bytes32 for on-chain use.
 * Uses keccak256 hashing to produce a proper 32-byte value.
 */
export function loanIdToBytes32(uuid) {
  return '0x' + uuid.replace(/-/g, '').padEnd(64, '0');
}

export function bytes32ToUuid(b32) {
  const hex = b32.slice(2, 34);
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20,32)}`;
}

/**
 * Alias: Convert a UUID string back to the deterministic bytes32 used on-chain.
 * Inverse of bytes32ToUuid.
 */
export function uuidToBytes32(uuid) {
  return loanIdToBytes32(uuid);
}

/**
 * Truncate a bytes32 for display (e.g. "0xabcd…1234")
 */
export function formatBytes32(b32) {
  if (!b32) return '—';
  return `${b32.slice(0, 10)}…${b32.slice(-8)}`;
}

/**
 * Format a wei/token amount to human-readable AUSD string.
 * Default 18 decimals (ERC-20 standard).
 */
export function formatAUSD(weiAmount, decimals = 18) {
  if (!weiAmount) return '0.00';
  return Number(ethers.formatUnits(weiAmount, decimals)).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Parse a human-readable amount to wei.
 */
export function parseAUSD(amount, decimals = 18) {
  return ethers.parseUnits(String(amount), decimals);
}
