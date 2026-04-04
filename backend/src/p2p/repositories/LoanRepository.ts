import { Knex } from 'knex';
import { Loan, LoanStatus } from '../domain/models';

export class LoanRepository {
  constructor(private readonly db: Knex) {}

  async findById(loanId: string, trx?: Knex.Transaction): Promise<Loan | undefined> {
    return (trx || this.db)<Loan>('loans').where({ id: loanId }).first();
  }

  async create(data: {
    borrower_id: string;
    lender_id: string;
    amount: number;
  }): Promise<Loan> {
    const [loan] = await this.db<Loan>('loans').insert(data).returning('*');
    return loan;
  }

  async updateStatus(
    loanId: string,
    status: LoanStatus,
    trx?: Knex.Transaction
  ): Promise<void> {
    await (trx || this.db)<Loan>('loans')
      .where({ id: loanId })
      .update({ status, updated_at: new Date() });
  }

  /** Returns all loans where user is borrower, lender, or guarantor */
  async findAccessible(userId: string): Promise<Loan[]> {
    return this.db<Loan>('loans')
      .leftJoin('guarantors', 'guarantors.loan_id', 'loans.id')
      .where('loans.borrower_id', userId)
      .orWhere('loans.lender_id', userId)
      .orWhere('guarantors.user_id', userId)
      .distinct('loans.*')
      .select('loans.*');
  }

  /** Returns all loans that are requested and have no lender yet (broadcasts) */
  async findPendingBroadcasts(): Promise<any[]> {
    return this.db('loans')
      .join('users', 'loans.borrower_id', 'users.id')
      .where({ 'loans.status': LoanStatus.REQUESTED })
      .whereNull('loans.lender_id')
      .select('loans.*', 'users.name as borrowerName')
      .orderBy('loans.requested_at', 'desc');
  }

  async addRequirement(data: {
    loan_id: string;
    type: string;
    label: string;
  }) {
    const [req] = await this.db('loan_requirements').insert(data).returning('*');
    return req;
  }

  async getRequirements(loanId: string) {
    return this.db('loan_requirements').where({ loan_id: loanId });
  }

  async markRequirementFulfilled(requirementId: string, trx?: Knex.Transaction) {
    await (trx || this.db)('loan_requirements')
      .where({ id: requirementId })
      .update({ fulfilled: true });
  }

  async addDocument(data: {
    loan_id: string;
    requirement_id: string;
    uploaded_by: string;
    file_reference: string;
  }) {
    const [doc] = await this.db('loan_documents').insert(data).returning('*');
    return doc;
  }

  async getDocuments(loanId: string) {
    return this.db('loan_documents').where({ loan_id: loanId });
  }

  /** Checks whether all document-type requirements are fulfilled */
  async checkAllDocumentsFulfilled(loanId: string): Promise<boolean> {
    const pending = await this.db('loan_requirements')
      .where({ loan_id: loanId, type: 'document', fulfilled: false })
      .count('id as count')
      .first();
    return Number(pending?.count ?? 0) === 0;
  }
}
