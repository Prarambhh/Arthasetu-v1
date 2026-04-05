import { Knex } from 'knex';
import { Guarantor, GuarantorStatus } from '../domain/models';

export class GuarantorRepository {
  constructor(private readonly db: Knex) {}

  async addGuarantor(data: { loan_id: string; user_id: string }): Promise<Guarantor> {
    const [g] = await this.db<Guarantor>('guarantors').insert(data).returning('*');
    return g;
  }

  async findByLoanAndUser(loanId: string, userId: string): Promise<Guarantor | undefined> {
    return this.db<Guarantor>('guarantors')
      .where({ loan_id: loanId, user_id: userId })
      .first();
  }

  async findAllByLoan(loanId: string): Promise<Guarantor[]> {
    return this.db<Guarantor>('guarantors').where({ loan_id: loanId });
  }

  async updateStatus(
    guarantorId: string,
    status: GuarantorStatus
  ): Promise<void> {
    await this.db<Guarantor>('guarantors')
      .where({ id: guarantorId })
      .update({ status, responded_at: new Date() });
  }

  async fulfillOneRequirement(loanId: string): Promise<void> {
    const unfulfilled = await this.db('loan_requirements')
      .where({ loan_id: loanId, type: 'guarantors', fulfilled: false })
      .first();
      
    if (unfulfilled) {
      await this.db('loan_requirements')
        .where({ id: unfulfilled.id })
        .update({ fulfilled: true });
    }
  }

  /** Returns rejected guarantor display names (joined with users) */
  async getRejectedGuarantorNames(loanId: string): Promise<string[]> {
    const rows = await this.db('guarantors')
      .join('users', 'users.id', 'guarantors.user_id')
      .where({ 'guarantors.loan_id': loanId, 'guarantors.status': GuarantorStatus.REJECTED })
      .select('users.name');
    return rows.map((r: any) => r.name);
  }

  /** True if every guarantor on the loan has status = approved */
  async allApproved(loanId: string): Promise<boolean> {
    const nonApproved = await this.db('guarantors')
      .where({ loan_id: loanId })
      .whereNot({ status: GuarantorStatus.APPROVED })
      .count('id as count')
      .first() as { count: string } | undefined;
    return Number(nonApproved?.count ?? 0) === 0;
  }

  /** True if there are zero guarantor requirements (no guarantors at all) */
  async hasAnyGuarantor(loanId: string): Promise<boolean> {
    const row = await this.db('guarantors')
      .where({ loan_id: loanId })
      .count('id as count')
      .first() as { count: string } | undefined;
    return Number(row?.count ?? 0) > 0;
  }
}
