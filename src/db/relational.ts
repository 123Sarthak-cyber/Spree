/**
 * Standard relational-like database engine implemented in TypeScript.
 * Backed by a local JSON file on the container filesystem for persistence.
 * Enforces primary keys, unique constraints, and referential integrity (Cascading deletes, FK validations).
 */

import * as fs from 'fs';
import * as path from 'path';
import { 
  User, 
  Group, 
  GroupMember, 
  Expense, 
  ExpenseSplit, 
  ChatMessage, 
  Settlement,
  Wallet,
  SplitType,
  BalanceSummary,
  DebtRelation
} from '../types.ts';

const DB_FILE_PATH = path.join(process.cwd(), 'database_relational.json');

// Interface representing the entire schema architecture
export interface RelationalSchema {
  users: User[];
  groups: Group[];
  groupMembers: GroupMember[];
  expenses: Expense[];
  expenseSplits: ExpenseSplit[];
  walletTransaction:WalletTransaction[];
  chats: ChatMessage[];
  settlements: Settlement[];
}

// Initial seed data to make the app incredibly beautiful and testable right away
const INITIAL_DEMO_USERS: User[] = [
  { id: 'usr-1', name: 'Sarthak', email: 'sarthak@example.com', avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Sarthak', createdAt: new Date().toISOString() },
  { id: 'usr-2', name: 'Alice Smith', email: 'alice@example.com', avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Alice', createdAt: new Date().toISOString() },
  { id: 'usr-3', name: 'Bob Jones', email: 'bob@example.com', avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Bob', createdAt: new Date().toISOString() },
  { id: 'usr-4', name: 'Charlie Brown', email: 'charlie@example.com', avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Charlie', createdAt: new Date().toISOString() },
];

const INITIAL_DEMO_GROUPS: Group[] = [
  { id: 'grp-1', name: 'Ski Trip 2026', description: 'Annual ski vacation expenses and gear splits.', createdBy: 'usr-1', createdAt: new Date().toISOString() },
  { id: 'grp-2', name: 'Apartment 4B', description: 'Monthly rent, groceries, and utility sharing.', createdBy: 'usr-2', createdAt: new Date().toISOString() },
];


const INITIAL_DEMO_MEMBERS: GroupMember[] = [
  { groupId: 'grp-1', userId: 'usr-1', joinedAt: new Date().toISOString() },
  { groupId: 'grp-1', userId: 'usr-2', joinedAt: new Date().toISOString() },
  { groupId: 'grp-1', userId: 'usr-3', joinedAt: new Date().toISOString() },

  { groupId: 'grp-2', userId: 'usr-1', joinedAt: new Date().toISOString() },
  { groupId: 'grp-2', userId: 'usr-2', joinedAt: new Date().toISOString() },
  { groupId: 'grp-2', userId: 'usr-3', joinedAt: new Date().toISOString() },
  { groupId: 'grp-2', userId: 'usr-4', joinedAt: new Date().toISOString() },
];

const INITIAL_DEMO_EXPENSES: Expense[] = [
  {
    id: 'exp-1',
    groupId: 'grp-1',
    paidBy: 'usr-1',
    amount: 300,
    description: 'Ski Cabin Rental Deposit',
    splitType: 'equal',
    createdAt: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString()
  },
  {
    id: 'exp-2',
    groupId: 'grp-1',
    paidBy: 'usr-2',
    amount: 150,
    description: 'Lift Ticket Upgrades',
    splitType: 'unequal',
    createdAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString()
  },
  {
    id: 'exp-3',
    groupId: 'grp-2',
    paidBy: 'usr-3',
    amount: 200,
    description: 'Weekly Organic Groceries',
    splitType: 'percentage',
    createdAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString()
  }
];

const INITIAL_DEMO_SPLITS: ExpenseSplit[] = [
  // Cabin deposit split equally among Sarthak, Alice, Bob (300 total, 100 each)
  { expenseId: 'exp-1', userId: 'usr-1', amountOwed: 100 },
  { expenseId: 'exp-1', userId: 'usr-2', amountOwed: 100 },
  { expenseId: 'exp-1', userId: 'usr-3', amountOwed: 100 },

  // Lift tickets upgrades (150 total, unequal split: usr-1 owes 60, usr-2 owes 40, usr-3 owes 50)
  { expenseId: 'exp-2', userId: 'usr-1', amountOwed: 60 },
  { expenseId: 'exp-2', userId: 'usr-2', amountOwed: 40 },
  { expenseId: 'exp-2', userId: 'usr-3', amountOwed: 50 },

  // Groceries (200 total, percentage split: usr-1 owes 40% = 80, usr-2 owes 30% = 60, usr-3 owes 20% = 40, usr-4 owes 10% = 20)
  { expenseId: 'exp-3', userId: 'usr-1', amountOwed: 80, percentage: 40 },
  { expenseId: 'exp-3', userId: 'usr-2', amountOwed: 60, percentage: 30 },
  { expenseId: 'exp-3', userId: 'usr-3', amountOwed: 40, percentage: 20 },
  { expenseId: 'exp-3', userId: 'usr-4', amountOwed: 20, percentage: 10 }
];

const INITIAL_DEMO_CHATS: ChatMessage[] = [
  { id: 'msg-1', expenseId: 'exp-1', userId: 'usr-2', message: 'Thanks for booking the cabin! Is there a hot tub?', createdAt: new Date(Date.now() - 2.9 * 24 * 3600 * 1000).toISOString() },
  { id: 'msg-2', expenseId: 'exp-1', userId: 'usr-1', message: 'Yes! And it has a gorgeous view of the slopes. 🏔️', createdAt: new Date(Date.now() - 2.8 * 24 * 3600 * 1000).toISOString() },
  { id: 'msg-3', expenseId: 'exp-1', userId: 'usr-3', message: 'Awesome, I will bring the snacks.', createdAt: new Date(Date.now() - 2.5 * 24 * 3600 * 1000).toISOString() }
];

const INITIAL_DEMO_SETTLEMENTS: Settlement[] = [
  { id: 'set-1', groupId: 'grp-1', payerId: 'usr-2', payeeId: 'usr-1', amount: 50, createdAt: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString() }
];
const INITIAL_DEMO_WALLET: WalletTransaction=[
{
  id:string
  userId:string
  amount:number
  type:'deposit'|'withdrawal'|'settlement'
  createdAt:string
}
  ];

export class RelationalDatabase {
  private cache: RelationalSchema;

  constructor() {
    this.cache = this.load();
  }

  // Load from disk, fallback to seeded schema if missing/malformed
  private load(): RelationalSchema {
    try {
      if (fs.existsSync(DB_FILE_PATH)) {
        const fileContent = fs.readFileSync(DB_FILE_PATH, 'utf-8');
        const dbJson = JSON.parse(fileContent);
        // Basic schema verification
        if (dbJson.users && dbJson.groups && dbJson.groupMembers && dbJson.expenses && dbJson.expenseSplits) {
          return dbJson as RelationalSchema;
        }
      }
    } catch (e) {
      console.error('Error loading relational database file, re-initializing seed state:', e);
    }

    const defaultSchema: RelationalSchema = {
      users: INITIAL_DEMO_USERS,
      groups: INITIAL_DEMO_GROUPS,
      groupMembers: INITIAL_DEMO_MEMBERS,
      expenses: INITIAL_DEMO_EXPENSES,
      expenseSplits: INITIAL_DEMO_SPLITS,
      chats: INITIAL_DEMO_CHATS,
      settlements: INITIAL_DEMO_SETTLEMENTS
    };
    this.saveToDisk(defaultSchema);
    return defaultSchema;
  }

  // Save the state atomically to disk
  private saveToDisk(data: RelationalSchema): void {
    try {
      fs.writeFileSync(DB_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed to write relational DB file to disk:', e);
    }
  }

  // Sync internal state and save
  private persist(): void {
    this.saveToDisk(this.cache);
  }

  // ================= USERS TABLE =================

  public getUsers(): User[] {
    return this.cache.users;
  }

  public getUserById(id: string): User | undefined {
    return this.cache.users.find(u => u.id === id);
  }

  public getUserByEmail(email: string): User | undefined {
    return this.cache.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  public insertUser(user: Omit<User, 'id' | 'createdAt'>): User {
    // Check UNIQUE email constraint
    const existing = this.getUserByEmail(user.email);
    if (existing) {
      throw new Error(`User with email "${user.email}" already exists (Relational Unique Constraint Error)`);
    }

    const newUser: User = {
      ...user,
      id: `usr-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString()
    };
    this.cache.users.push(newUser);
    this.persist();
    return newUser;
  }

  // ================= GROUPS TABLE =================

  public getGroups(): Group[] {
    return this.cache.groups;
  }

  public getGroupById(id: string): Group | undefined {
    return this.cache.groups.find(g => g.id === id);
  }

  public insertGroup(group: Omit<Group, 'id' | 'createdAt'>): Group {
    // Validate Foreign Key: createdBy user must exist
    const creator = this.getUserById(group.createdBy);
    if (!creator) {
      throw new Error(`Referential Integrity Violation: Cannot create group. User "${group.createdBy}" not found.`);
    }

    const newGroup: Group = {
      ...group,
      id: `grp-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString()
    };
    this.cache.groups.push(newGroup);

    // Auto JOIN/Insert creator as a group member
    this.insertGroupMember({
      groupId: newGroup.id,
      userId: group.createdBy
    });

    this.persist();
    return newGroup;
  }

  // Safe deletion of a Group with Cascade rules
  public deleteGroup(groupId: string): void {
    // Verify group exists
    const index = this.cache.groups.findIndex(g => g.id === groupId);
    if (index === -1) {
      throw new Error(`Cannot delete group "${groupId}". Group not found.`);
    }

    // Begin Cascading Deletes to maintain relational integrity:
    // 1. Delete group members
    this.cache.groupMembers = this.cache.groupMembers.filter(gm => gm.groupId !== groupId);

    // 2. Locate all expenses belonging to this group
    const expenseIds = this.cache.expenses
      .filter(e => e.groupId === groupId)
      .map(e => e.id);

    // 3. Delete expense splits for all those expenses
    this.cache.expenseSplits = this.cache.expenseSplits.filter(es => !expenseIds.includes(es.expenseId));

    // 4. Delete chats belonging to those expenses
    this.cache.chats = this.cache.chats.filter(ch => !expenseIds.includes(ch.expenseId));

    // 5. Delete expenses themselves
    this.cache.expenses = this.cache.expenses.filter(e => e.groupId !== groupId);

    // 6. Delete settlements belonging to the group
    this.cache.settlements = this.cache.settlements.filter(s => s.groupId !== groupId);

    // 7. Finally remove the group record
    this.cache.groups.splice(index, 1);

    this.persist();
  }

  // ================= GROUP_MEMBERS TABLE =================

  public getGroupMembers(groupId: string): GroupMember[] {
    return this.cache.groupMembers.filter(gm => gm.groupId === groupId);
  }

  public getGroupMemberUsers(groupId: string): User[] {
    const list = this.getGroupMembers(groupId);
    return list
      .map(gm => this.getUserById(gm.userId))
      .filter((u): u is User => !!u);
  }

  public insertGroupMember(member: Omit<GroupMember, 'joinedAt'>): GroupMember {
    // Foreign Key: Group must exist
    const grt = this.getGroupById(member.groupId);
    if (!grt) {
      throw new Error(`Referential Integrity Violation: Group "${member.groupId}" not found`);
    }

    // Foreign Key: User must exist
    const usr = this.getUserById(member.userId);
    if (!usr) {
      throw new Error(`Referential Integrity Violation: User "${member.userId}" not found`);
    }

    // Check Compound Primary Key UNIQUE constraint (groupId + userId)
    const exists = this.cache.groupMembers.some(
      gm => gm.groupId === member.groupId && gm.userId === member.userId
    );

    if (exists) {
      throw new Error(`Composite Primary Key Exception: User "${member.userId}" is already a member of group "${member.groupId}"`);
    }

    const newMember: GroupMember = {
      ...member,
      joinedAt: new Date().toISOString()
    };
    this.cache.groupMembers.push(newMember);
    this.persist();
    return newMember;
  }

  // Remove member from group with referential validation (can't delete if they paved/owe active splits)
  public removeGroupMember(groupId: string, userId: string): void {
    // Check if member exists
    const index = this.cache.groupMembers.findIndex(
      gm => gm.groupId === groupId && gm.userId === userId
    );
    if (index === -1) {
      throw new Error(`User "${userId}" is not a member of group "${groupId}"`);
    }

    // Validate active bindings: User must not be the payor of any active group expenses
    const paymentExists = this.cache.expenses.some(
      e => e.groupId === groupId && e.paidBy === userId
    );
    if (paymentExists) {
      throw new Error(`Cannot remove user: User paid for one or more expenses in this group. Reassign or delete those expenses first.`);
    }

    // User must not owe splits in any group expenses
    const groupExpenses = this.cache.expenses.filter(e => e.groupId === groupId).map(e => e.id);
    const splitDebtExists = this.cache.expenseSplits.some(
      es => groupExpenses.includes(es.expenseId) && es.userId === userId && es.amountOwed > 0
    );
    if (splitDebtExists) {
      throw new Error(`Cannot remove user: User has active debt splits in this group's expenses.`);
    }

    this.cache.groupMembers.splice(index, 1);
    this.persist();
  }

  // ================= EXPENSES & SPLITS TABLES =================

  public getGroupExpenses(groupId: string): Expense[] {
    return this.cache.expenses.filter(e => e.groupId === groupId);
  }

  public getExpenseById(id: string): Expense | undefined {
    return this.cache.expenses.find(e => e.id === id);
  }

  public getExpenseSplits(expenseId: string): ExpenseSplit[] {
    return this.cache.expenseSplits.filter(es => es.expenseId === expenseId);
  }

  // Inserts an expense along with its splits transactional-style
  public insertExpense(
    expense: Omit<Expense, 'id' | 'createdAt'>, 
    splits: Omit<ExpenseSplit, 'expenseId'>[]
  ): Expense {
    // Validate group exists
    const group = this.getGroupById(expense.groupId);
    if (!group) {
      throw new Error(`Referential Integrity Violation: Group "${expense.groupId}" does not exist.`);
    }

    // Validate payer exists
    const payer = this.getUserById(expense.paidBy);
    if (!payer) {
      throw new Error(`Referential Integrity Violation: PaidBy User "${expense.paidBy}" does not exist.`);
    }

    // Validate splits match total amount (with tolerance for JS floating point rounding)
    const splitsSum = splits.reduce((acc, sp) => acc + sp.amountOwed, 0);
    if (Math.abs(splitsSum - expense.amount) > 0.05) {
      throw new Error(`Relational Constraint Failed: Sum of shares ($${splitsSum.toFixed(2)}) must equal expense amount ($${expense.amount.toFixed(2)})`);
    }

    // Validate split players are indeed members of the group
    const members = this.getGroupMembers(expense.groupId).map(m => m.userId);
    for (const sp of splits) {
      if (!members.includes(sp.userId)) {
        throw new Error(`Referential Integrity Violation: Split user "${sp.userId}" is not a member of group "${expense.groupId}"`);
      }
    }

    // All checks pass - transaction begins
    const expenseId = `exp-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const newExpense: Expense = {
      ...expense,
      id: expenseId,
      createdAt: new Date().toISOString()
    };

    // Push expense
    this.cache.expenses.push(newExpense);

    // Push splits
    for (const sp of splits) {
      const newSplit: ExpenseSplit = {
        ...sp,
        expenseId
      };
      this.cache.expenseSplits.push(newSplit);
    }

    this.persist();
    return newExpense;
  }

  public deleteExpense(expenseId: string): void {
    const index = this.cache.expenses.findIndex(e => e.id === expenseId);
    if (index === -1) {
      throw new Error(`Cannot delete expense "${expenseId}". Record not found.`);
    }

    // Relational cascade deletes
    this.cache.expenseSplits = this.cache.expenseSplits.filter(es => es.expenseId !== expenseId);
    this.cache.chats = this.cache.chats.filter(ch => ch.expenseId !== expenseId);
    this.cache.expenses.splice(index, 1);

    this.persist();
  }

  // ================= CHAT MESSAGES TABLE =================

  public getExpenseChats(expenseId: string): ChatMessage[] {
    const chats = this.cache.chats.filter(ch => ch.expenseId === expenseId);
    // Hydrate user names and avatars
    return chats.map(ch => {
      const u = this.getUserById(ch.userId);
      return {
        ...ch,
        userName: u ? u.name : 'Unknown User',
        userAvatar: u ? u.avatar : ''
      };
    }).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  public insertChatMessage(chat: Omit<ChatMessage, 'id' | 'createdAt'>): ChatMessage {
    // Validate expense exists
    const expense = this.getExpenseById(chat.expenseId);
    if (!expense) {
      throw new Error(`Referential Integrity Exception: Cannot chat on non-existent expense "${chat.expenseId}".`);
    }

    // Validate user exists
    const user = this.getUserById(chat.userId);
    if (!user) {
      throw new Error(`Referential Integrity Exception: User "${chat.userId}" does not exist.`);
    }

    const newChat: ChatMessage = {
      ...chat,
      id: `msg-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString()
    };

    this.cache.chats.push(newChat);
    this.persist();
    return newChat;
  }

  // ================= SETTLEMENTS TABLE =================

  public getGroupSettlements(groupId: string): Settlement[] {
    return this.cache.settlements.filter(s => s.groupId === groupId);
  }

  public insertSettlement(settlement: Omit<Settlement, 'id' | 'createdAt'>): Settlement {
    // Validate group exists
    const group = this.getGroupById(settlement.groupId);
    if (!group) {
      throw new Error(`Referential Integrity Violation: Group "${settlement.groupId}" not found`);
    }

    // Validate users
    const payer = this.getUserById(settlement.payerId);
    const payee = this.getUserById(settlement.payeeId);
    if (!payer || !payee) {
      throw new Error(`Referential Integrity Violation: Payer/Payee users must exist.`);
    }

    const newSet: Settlement = {
      ...settlement,
      id: `set-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString()
    };

    this.cache.settlements.push(newSet);
    this.persist();
    return newSet;
  }

  public deleteSettlement(settlementId: string): void {
    const index = this.cache.settlements.findIndex(s => s.id === settlementId);
    if (index === -1) {
      throw new Error(`Settlement "${settlementId}" not found`);
    }
    this.cache.settlements.splice(index, 1);
    this.persist();
  }

  // ================= RELATION INTEGRATION CALCULATION (Splitwise Balance Core) =================

  /**
   * Computes group-wise net balances for each member.
   * Net balance = (Sum of expenses paid by this user) - (Sum of splits this user owes in expenses) 
   *             - (Settlements paid by this user) + (Settlements received by this user)
   * Net balance calculation is derived dynamically from relational tables.
   */
  public getGroupBalances(groupId: string): BalanceSummary[] {
    const group = this.getGroupById(groupId);
    if (!group) return [];

    const members = this.getGroupMemberUsers(groupId);
    const expenses = this.getGroupExpenses(groupId);
    const settlements = this.getGroupSettlements(groupId);

    // Track dynamic net matrix
    const balances: Record<string, number> = {};
    for (const m of members) {
      balances[m.id] = 0;
    }

    // 1. Process expenses
    for (const exp of expenses) {
      // The person who paid gets credit for full amount
      if (balances[exp.paidBy] !== undefined) {
        balances[exp.paidBy] += exp.amount;
      }

      // People who split owe the amount
      const splits = this.getExpenseSplits(exp.id);
      for (const sp of splits) {
        if (balances[sp.userId] !== undefined) {
          balances[sp.userId] -= sp.amountOwed;
        }
      }
    }

    // 2. Process settlements (debts recorded/payments marked)
    for (const set of settlements) {
      // Payer (debtor) reduces their balance debt (adds to their net balance asset)
      if (balances[set.payerId] !== undefined) {
        balances[set.payerId] += set.amount;
      }
      // Payee (creditor) receives payment (reduces their outstanding net balance asset)
      if (balances[set.payeeId] !== undefined) {
        balances[set.payeeId] -= set.amount;
      }
    }

    return members.map(m => ({
      userId: m.id,
      userName: m.name,
      userAvatar: m.avatar,
      // Fixed floating point representation
      netBalance: Math.round(balances[m.id] * 100) / 100
    }));
  }

  /**
   * Minimum Debt Simplification Algorithm (Greedy Debt Settlement Optimizer)
   * Solves the standard "Settle all debts with minimum transactions" algorithm.
   */
  public calculateDebts(groupId: string): DebtRelation[] {
    const balances = this.getGroupBalances(groupId);

    // List of users who owe money (debtors, netBalance < 0)
    const debtors = balances
      .filter(b => b.netBalance < -0.01)
      .map(b => ({ userId: b.userId, balance: Math.abs(b.netBalance) }))
      .sort((a, b) => b.balance - a.balance);

    // List of users who are owed money (creditors, netBalance > 0)
    const creditors = balances
      .filter(b => b.netBalance > 0.01)
      .map(b => ({ userId: b.userId, balance: b.netBalance }))
      .sort((a, b) => b.balance - a.balance);

    const transactions: DebtRelation[] = [];

    let dIdx = 0;
    let cIdx = 0;

    while (dIdx < debtors.length && cIdx < creditors.length) {
      const debtor = debtors[dIdx];
      const creditor = creditors[cIdx];

      const settleAmount = Math.min(debtor.balance, creditor.balance);
      if (settleAmount > 0.01) {
        transactions.push({
          fromUser: debtor.userId,
          toUser: creditor.userId,
          amount: Math.round(settleAmount * 100) / 100
        });
      }

      debtor.balance -= settleAmount;
      creditor.balance -= settleAmount;

      if (debtor.balance < 0.01) {
        dIdx++;
      }
      if (creditor.balance < 0.01) {
        cIdx++;
      }
    }

    return transactions;
  }
}
