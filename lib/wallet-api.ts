// lib/wallet-api.ts — thin re-export wrapper
// Implementations live in lib/repositories/wallet.repo.ts.
// This file preserves all existing import paths for backward compat.

export type {
  Wallet,
  Reward,
  RewardPurchase,
  CoinExchange,
  CashWithdrawal,
  WalletTransaction,
  WalletSettings,
  MonthlyPotential,
  AuditLog,
} from './models/wallet.types'

export {
  getWallet,
  updateWalletCoins,
  updateWalletMoney,
  getWalletSettings,
  calculateExchangeRate,
  getRewards,
  addReward,
  updateReward,
  deleteReward,
  purchaseReward,
  getPurchases,
  fulfillPurchase,
  exchangeCoins,
  getExchanges,
  requestWithdrawal,
  approveWithdrawal,
  rejectWithdrawal,
  getWithdrawals,
  getTransactions,
  awardCoinsForGrade,
  awardCoinsForRoom,
  awardCoinsForBehavior,
  awardCoinsForExercise,
  awardCoinsForSport,
  getMonthlyPotential,
  getAuditLog,
  createP2PTransfer,
} from './repositories/wallet.repo'
