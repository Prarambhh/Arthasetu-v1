import { Knex } from 'knex';
import { Wallet, WalletTransaction } from '../domain/models';

export class WalletRepository {
  constructor(private readonly db: Knex) {}

  async findByUserId(userId: string, trx?: Knex.Transaction): Promise<Wallet | undefined> {
    return (trx || this.db)<Wallet>('wallets').where({ user_id: userId }).first();
  }

  async findByIdForUpdate(walletId: string, trx: Knex.Transaction): Promise<Wallet | undefined> {
    return trx<Wallet>('wallets').where({ id: walletId }).forUpdate().first();
  }

  async updateBalance(walletId: string, newBalance: number, trx: Knex.Transaction): Promise<void> {
    await trx<Wallet>('wallets')
      .where({ id: walletId })
      .update({ balance: newBalance, updated_at: new Date() });
  }

  async insertTransaction(
    data: {
      loan_id: string;
      debit_wallet_id: string;
      credit_wallet_id: string;
      amount: number;
    },
    trx: Knex.Transaction
  ): Promise<WalletTransaction> {
    const [tx] = await trx<WalletTransaction>('wallet_transactions').insert(data).returning('*');
    return tx;
  }

  async findTransactionByLoanId(
    loanId: string,
    trx?: Knex.Transaction
  ): Promise<WalletTransaction | undefined> {
    return (trx || this.db)<WalletTransaction>('wallet_transactions')
      .where({ loan_id: loanId })
      .first();
  }

  /** Returns wallet + recent transactions for a user */
  async getWalletWithTransactions(userId: string): Promise<{
    wallet: Wallet | undefined;
    transactions: WalletTransaction[];
  }> {
    const wallet = await this.db<Wallet>('wallets').where({ user_id: userId }).first();
    if (!wallet) return { wallet: undefined, transactions: [] };

    const transactions = await this.db<WalletTransaction>('wallet_transactions')
      .where('debit_wallet_id', wallet.id)
      .orWhere('credit_wallet_id', wallet.id)
      .orderBy('created_at', 'desc')
      .limit(50);

    return { wallet, transactions };
  }
}
