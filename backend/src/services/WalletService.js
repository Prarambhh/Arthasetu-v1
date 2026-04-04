const EC = require('elliptic').ec;
const CryptoJS = require('crypto-js');

const ec = new EC('secp256k1');

/**
 * Generate a new secp256k1 keypair.
 * Returns { privateKey, publicKey, walletAddress }
 * walletAddress = last 20 bytes of SHA256(publicKey) — Ethereum-inspired
 */
function generateWallet() {
  const keyPair = ec.genKeyPair();
  const privateKey = keyPair.getPrivate('hex');
  const publicKey = keyPair.getPublic('hex');
  const walletAddress = '0x' + CryptoJS.SHA256(publicKey).toString().slice(-40);
  return { privateKey, publicKey, walletAddress };
}

/**
 * Sign a message (e.g., nonce) with a private key.
 * Returns DER-encoded signature as hex string.
 */
function signMessage(message, privateKey) {
  const keyPair = ec.keyFromPrivate(privateKey, 'hex');
  const msgHash = CryptoJS.SHA256(message).toString();
  const signature = keyPair.sign(msgHash);
  return signature.toDER('hex');
}

/**
 * Verify a signature against a public key and message.
 */
function verifySignature(message, signatureHex, publicKey) {
  try {
    const keyPair = ec.keyFromPublic(publicKey, 'hex');
    const msgHash = CryptoJS.SHA256(message).toString();
    return keyPair.verify(msgHash, signatureHex);
  } catch (e) {
    return false;
  }
}

module.exports = { generateWallet, signMessage, verifySignature };
