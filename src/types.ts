/**
 * Types and schema interfaces for the Splitwise Clone Application.
 */

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  createdAt: string;
}

export interface Group {
  id: string;
  name: string;
  description: string;
  createdBy: string; // User ID
  createdAt: string;
}

export interface GroupMember {
  groupId: string;
  userId: string;
  joinedAt: string;
}

export type SplitType = 'equal' | 'unequal' | 'percentage' | 'share';

export interface Expense {
  id: string;
  groupId: string;
  paidBy: string; // User ID
  amount: number;
  description: string;
  splitType: SplitType;
  createdAt: string;
}

export interface ExpenseSplit {
  expenseId: string;
  userId: string;
  amountOwed: number; // The amount this user owes
  percentage?: number; // Optional percentage (used for percentage split)
  shareCount?: number; // Optional share count (used for share split)
}

export interface ChatMessage {
  id: string;
  expenseId: string;
  userId: string;
  message: string;
  createdAt: string;
  userName?: string; // Hydrated field
  userAvatar?: string; // Hydrated field
}

export interface Settlement {
  id: string;
  groupId: string;
  payerId: string; // User ID (debtor)
  payeeId: string; // User ID (creditor)
  amount: number;
  createdAt: string;
}

// Derived UI state interfaces
export interface DebtRelation {
  fromUser: string; // User ID
  toUser: string; // User ID
  amount: number;
}

export interface BalanceSummary {
  userId: string;
  userName: string;
  userAvatar: string;
  netBalance: number; // Positive means they are owed, negative means they owe
}

export interface GroupWithMembers extends Group {
  members: User[];
  createdByDetails?: User;
}

export interface ExpenseWithSplits extends Expense {
  payerName: string;
  payerAvatar: string;
  splits: (ExpenseSplit & {
    userName: string;
    userAvatar: string;
  })[];
}
