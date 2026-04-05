// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title ArthaSetuLoans
 * @dev Decentralized Lending Protocol managing loan state and funds
 */
contract ArthaSetuLoans {
    using SafeERC20 for IERC20;

    IERC20 public immutable paymentToken;

    enum LoanStatus { REQUESTED, DOCS_REQUESTED, UNDER_REVIEW, APPROVED, DISBURSED, SETTLED, REJECTED }

    struct Loan {
        bytes32 id; // Off-chain UUID mapped to bytes32
        address borrower;
        address lender;
        uint256 principalAmount;
        uint256 interestRateBps; // Base points (1% = 100 bps)
        uint256 outstandingPrincipal;
        uint256 disbursedAt; // Timestamp when funds left lender
        uint256 lastPaymentAt;
        LoanStatus status;
    }

    mapping(bytes32 => Loan) public loans;
    mapping(bytes32 => mapping(address => bool)) public guarantorApprovals;

    event LoanCreated(bytes32 indexed id, address indexed borrower, uint256 amount);
    event LoanFunded(bytes32 indexed id, address indexed lender, uint256 interestRateBps);
    event GuarantorApproved(bytes32 indexed id, address indexed guarantor);
    event LoanDisbursed(bytes32 indexed id, address indexed borrower, uint256 amount);
    event LoanRepaid(bytes32 indexed id, address indexed borrower, uint256 amount);

    constructor(address _paymentToken) {
        paymentToken = IERC20(_paymentToken);
    }

    function createLoan(bytes32 _id, uint256 _amount) external {
        require(loans[_id].borrower == address(0), "Loan already exists");
        require(_amount > 0, "Amount must be > 0");

        loans[_id] = Loan({
            id: _id,
            borrower: msg.sender,
            lender: address(0),
            principalAmount: _amount,
            interestRateBps: 0,
            outstandingPrincipal: _amount,
            disbursedAt: 0,
            lastPaymentAt: 0,
            status: LoanStatus.REQUESTED
        });

        emit LoanCreated(_id, msg.sender, _amount);
    }

    function approveGuarantor(bytes32 _id) external {
        require(loans[_id].borrower != address(0), "Loan not found");
        guarantorApprovals[_id][msg.sender] = true;
        emit GuarantorApproved(_id, msg.sender);
    }

    function fundAndDisburse(bytes32 _id, uint256 _interestRateBps) external {
        Loan storage loan = loans[_id];
        require(loan.borrower != address(0), "Loan not found");
        require(loan.status == LoanStatus.REQUESTED || loan.status == LoanStatus.UNDER_REVIEW, "Invalid state");
        
        // In a true decentralized model without relying heavily on centralized requirements checks,
        // the lender must manually pull the trigger to fund and disburse.
        // For atomic transactions, they transfer funds directly to the borrower here.
        
        loan.lender = msg.sender;
        loan.interestRateBps = _interestRateBps;
        loan.status = LoanStatus.DISBURSED;
        loan.disbursedAt = block.timestamp;
        loan.lastPaymentAt = block.timestamp;

        // Transfer funds from Lender to Borrower natively inside the EVM
        paymentToken.safeTransferFrom(msg.sender, loan.borrower, loan.principalAmount);

        emit LoanFunded(_id, msg.sender, _interestRateBps);
        emit LoanDisbursed(_id, loan.borrower, loan.principalAmount);
    }

    function calculateAccruedInterest(bytes32 _id) public view returns (uint256) {
        Loan storage loan = loans[_id];
        if (loan.status != LoanStatus.DISBURSED) return 0;
        
        uint256 timeElapsed = block.timestamp - loan.lastPaymentAt;
        uint256 daysElapsed = timeElapsed / 1 days;

        // Rate is in BPS (1/100th of 1 percent). Example: 500 bps = 5%.
        // Formula: Principal * (RateBps / 10000) * (days / 365)
        uint256 annualInterest = (loan.outstandingPrincipal * loan.interestRateBps) / 10000;
        return (annualInterest * daysElapsed) / 365;
    }

    function repayLoan(bytes32 _id, uint256 _amount) external {
        Loan storage loan = loans[_id];
        require(loan.status == LoanStatus.DISBURSED, "Not disbursed");
        require(_amount > 0, "Amount must be > 0");

        uint256 accruedInterest = calculateAccruedInterest(_id);
        uint256 remainingAmount = _amount;

        // 1. Pay interest first
        if (remainingAmount >= accruedInterest) {
            remainingAmount -= accruedInterest;
            accruedInterest = 0;
        } else {
            accruedInterest -= remainingAmount;
            remainingAmount = 0;
        }

        // 2. Pay principal
        if (remainingAmount > 0) {
            if (remainingAmount >= loan.outstandingPrincipal) {
                remainingAmount -= loan.outstandingPrincipal;
                loan.outstandingPrincipal = 0;
                loan.status = LoanStatus.SETTLED;
            } else {
                loan.outstandingPrincipal -= remainingAmount;
            }
        }

        loan.lastPaymentAt = block.timestamp; // Refresh accrual tracker

        // Transfer actual payment from Payer to Lender
        // Note: the payer doesn't strictly have to be the borrower in decentralized systems
        paymentToken.safeTransferFrom(msg.sender, loan.lender, _amount);

        emit LoanRepaid(_id, msg.sender, _amount);
    }
}
