import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { WalletRepository } from '../repositories/WalletRepository';

export class WalletController {
  constructor(private readonly walletRepo: WalletRepository) {}

  /** GET /wallets/me — authenticated user's wallet + recent transactions */
  getMyWallet = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { wallet, transactions } = await this.walletRepo.getWalletWithTransactions(req.userId!);
      if (!wallet) {
        res.status(404).json({ error: 'Wallet not found for this user' });
        return;
      }
      res.json({ data: { wallet, transactions } });
    } catch (err) { next(err); }
  };
}
