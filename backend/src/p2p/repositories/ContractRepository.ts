import { Knex } from 'knex';
import { Contract, ContractStatus } from '../domain/models';

export class ContractRepository {
  constructor(private readonly db: Knex) {}

  async upsert(
    data: {
      loan_id: string;
      borrower_id: string;
      lender_id: string;
      amount: number;
      status: ContractStatus;
    },
    trx: Knex.Transaction
  ): Promise<Contract> {
    const [contract] = await trx('contracts')
      .insert({
        loan_id: data.loan_id,
        borrower_id: data.borrower_id,
        lender_id: data.lender_id,
        amount: data.amount,
        status: data.status,
      })
      .onConflict('loan_id')
      .merge(['status'])
      .returning('*');
    return contract as Contract;
  }

  async findByIdWithAccess(contractId: string, userId: string): Promise<Contract | undefined> {
    return this.db<Contract>('contracts')
      .where({ id: contractId })
      .where(function () {
        this.where('borrower_id', userId).orWhere('lender_id', userId);
      })
      .first();
  }

  /**
   * Access-scoped list with filters, sorting, and enriched party info.
   */
  async findAccessible(
    userId: string,
    opts: { status?: string; sort?: string; order?: 'asc' | 'desc' }
  ) {
    const sort = ['issued_at', 'amount'].includes(opts.sort ?? '') ? opts.sort! : 'issued_at';
    const order = opts.order === 'asc' ? 'asc' : 'desc';

    let query = this.db('contracts')
      .select(
        'contracts.*',
        'borrower.name as borrower_name',
        'lender.name as lender_name',
        'wallet_transactions.id as wallet_transaction_id'
      )
      .join('users as borrower', 'borrower.id', 'contracts.borrower_id')
      .join('users as lender', 'lender.id', 'contracts.lender_id')
      .leftJoin('wallet_transactions', 'wallet_transactions.loan_id', 'contracts.loan_id')
      .where(function () {
        this.where('contracts.borrower_id', userId).orWhere('contracts.lender_id', userId);
      });

    if (opts.status && ['pending', 'settled'].includes(opts.status)) {
      query = query.where('contracts.status', opts.status);
    }

    return query.orderBy(`contracts.${sort}`, order);
  }

  async findFullDetails(contractId: string, userId: string) {
    const contract = await this.findByIdWithAccess(contractId, userId);
    if (!contract) return null;

    const guarantors = await this.db('guarantors')
      .join('users', 'users.id', 'guarantors.user_id')
      .where({ 'guarantors.loan_id': contract.loan_id })
      .select('users.name', 'guarantors.status', 'guarantors.responded_at');

    const documents = await this.db('loan_documents')
      .where({ loan_id: contract.loan_id })
      .select('*');

    const walletTx = await this.db('wallet_transactions')
      .where({ loan_id: contract.loan_id })
      .first();

    return { contract, guarantors, documents, wallet_transaction: walletTx ?? null };
  }

  async settle(loanId: string, trx: Knex.Transaction): Promise<void> {
    await trx('contracts')
      .where({ loan_id: loanId })
      .update({ status: ContractStatus.SETTLED, settled_at: new Date() });
  }
}
