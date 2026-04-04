import { LoanStatus } from './models';
import { InvalidStateTransitionError, PreconditionNotMetError } from './errors';

/**
 * Defines the only legal state transitions.
 * This is the single authority for all loan status changes.
 */
const VALID_TRANSITIONS: Readonly<Record<LoanStatus, LoanStatus[]>> = {
  [LoanStatus.REQUESTED]:     [LoanStatus.DOCS_REQUESTED],
  [LoanStatus.DOCS_REQUESTED]:[LoanStatus.UNDER_REVIEW],
  [LoanStatus.UNDER_REVIEW]:  [LoanStatus.APPROVED, LoanStatus.REJECTED],
  [LoanStatus.APPROVED]:      [LoanStatus.DISBURSED],
  [LoanStatus.DISBURSED]:     [LoanStatus.SETTLED],
  [LoanStatus.SETTLED]:       [],
  [LoanStatus.REJECTED]:      [],
};

export interface ReviewPrecondition {
  allDocumentsFulfilled: boolean;
  allGuarantorsApproved: boolean;
  rejectedGuarantorNames: string[];
}

export class LoanStateMachine {
  /**
   * Asserts a transition is legal. Throws InvalidStateTransitionError if not.
   */
  static assertTransition(currentStatus: LoanStatus, targetStatus: LoanStatus): void {
    const allowed = VALID_TRANSITIONS[currentStatus];
    if (!allowed.includes(targetStatus)) {
      throw new InvalidStateTransitionError(currentStatus, targetStatus);
    }
  }

  /**
   * Returns the next status or throws. Use for simple forward transitions.
   */
  static transition(currentStatus: LoanStatus, targetStatus: LoanStatus): LoanStatus {
    LoanStateMachine.assertTransition(currentStatus, targetStatus);
    return targetStatus;
  }

  /**
   * Gated transition to UNDER_REVIEW — validates preconditions.
   */
  static transitionToUnderReview(
    currentStatus: LoanStatus,
    precondition: ReviewPrecondition
  ): LoanStatus {
    LoanStateMachine.assertTransition(currentStatus, LoanStatus.UNDER_REVIEW);

    if (precondition.rejectedGuarantorNames.length > 0) {
      throw new PreconditionNotMetError(
        `Cannot move to review: the following guarantors have rejected their association: ${precondition.rejectedGuarantorNames.join(', ')}`
      );
    }

    if (!precondition.allDocumentsFulfilled) {
      throw new PreconditionNotMetError(
        'Cannot move to review: not all required documents have been uploaded'
      );
    }

    if (!precondition.allGuarantorsApproved) {
      throw new PreconditionNotMetError(
        'Cannot move to review: not all guarantors have approved their association'
      );
    }

    return LoanStatus.UNDER_REVIEW;
  }
}
