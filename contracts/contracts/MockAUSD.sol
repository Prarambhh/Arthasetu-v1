// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MockAUSD is ERC20, Ownable {
    constructor() ERC20("ArthaStable", "AUSD") Ownable(msg.sender) {
        // Mint initial supply to deployer
        _mint(msg.sender, 1_000_000 * 10 ** decimals());
    }

    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }
    
    // Faucet for testing
    function faucet() public {
        _mint(msg.sender, 10_000 * 10 ** decimals());
    }
}
