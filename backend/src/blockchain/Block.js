const CryptoJS = require('crypto-js');

class Block {
  constructor(index, timestamp, type, data, prevHash = '') {
    this.index = index;
    this.timestamp = timestamp;
    this.type = type;   // LOAN_CREATED | LOAN_FUNDED | LOAN_REPAID | LOAN_DEFAULTED | USER_REGISTERED
    this.data = data;
    this.prevHash = prevHash;
    this.hash = this.computeHash();
  }

  computeHash() {
    return CryptoJS.SHA256(
      this.index +
      this.timestamp +
      this.type +
      JSON.stringify(this.data) +
      this.prevHash
    ).toString();
  }
}

module.exports = Block;
