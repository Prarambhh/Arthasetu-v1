import { GuarantorRepository } from '../repositories/GuarantorRepository';
import { GuarantorStatus } from '../domain/models';
import { PreconditionNotMetError } from '../domain/errors';

export class GuarantorService {
  constructor(private readonly guarantorRepo: GuarantorRepository) {}

  async addGuarantor(loanId: string, userId: string) {
    // Idempotent — check if already exists
    const existing = await this.guarantorRepo.findByLoanAndUser(loanId, userId);
    if (existing) return existing;
    return this.guarantorRepo.addGuarantor({ loan_id: loanId, user_id: userId });
  }

  async getMyRecord(loanId: string, userId: string) {
    const guarantor = await this.guarantorRepo.findByLoanAndUser(loanId, userId);
    if (!guarantor) throw new Error('You are not a guarantor on this loan');
    return guarantor;
  }

  async approve(loanId: string, userId: string) {
    const guarantor = await this.guarantorRepo.findByLoanAndUser(loanId, userId);
    if (!guarantor) throw new Error('You are not a guarantor on this loan');

    if (guarantor.status !== GuarantorStatus.PENDING) {
      throw new PreconditionNotMetError(
        `Guarantor response is already final (status: ${guarantor.status})`
      );
    }

    await this.guarantorRepo.updateStatus(guarantor.id, GuarantorStatus.APPROVED);
    
    // Also mark one unfulfilled 'guarantors' requirement as fulfilled for UI display
    await this.guarantorRepo.fulfillOneRequirement(loanId);

    return { ...guarantor, status: GuarantorStatus.APPROVED };
  }

  async reject(loanId: string, userId: string) {
    const guarantor = await this.guarantorRepo.findByLoanAndUser(loanId, userId);
    if (!guarantor) throw new Error('You are not a guarantor on this loan');

    if (guarantor.status !== GuarantorStatus.PENDING) {
      throw new PreconditionNotMetError(
        `Guarantor response is already final (status: ${guarantor.status})`
      );
    }

    await this.guarantorRepo.updateStatus(guarantor.id, GuarantorStatus.REJECTED);
    return { ...guarantor, status: GuarantorStatus.REJECTED };
  }

  async listForLoan(loanId: string) {
    return this.guarantorRepo.findAllByLoan(loanId);
  }
}
