# AI_CONTEXT.md

## 1. Product Understanding & Scope
The application is a full-stack Splitwise Clone. It allows users to onboard, create group spaces, invite/remove members, log transactions with multiple split strategies (equal, unequal, percentage, share), chat in real-time-like threads under each expense, see live group-wise balance summaries, calculate simplified settlements, and record payments.

- **Completed Scope**:
  - Full-featured **Relational-integrity database layer** in `src/db/relational.ts` with atomic transaction saves.
  - **Login module**: Register any user, choose users, and a "Quick Session Simulator" enabling developers to switch between users in 1-click in the iframe.
  - **Group Management**: Create groups, view member roster, add/invite users, remove users safely.
  - **Expense Engine**: Complete split-splitting with 4 mathematical modes (equally, unequally, percentage, share counts) with real-time feedback and constraint checks.
  - **Expense Chat Threads**: Standard discussion message stream for each logged expense.
  - **Debt Simplification Engine**: Real Greedy-flow debt settling computations.
  - **Debt Settlements**: Post standard settlements to clear general balances.

---

## 2. Engineering Decisions & Tech Stack

- **Relational DB Architecture**: Engineered a TypeScript relational database container with schemas, primary key verification, foreign keys, and cascading deletion filters, storing state in `database_relational.json`.
- **Express Backend Server**: Built in `server.ts` to expose strict REST APIs, handling:
  - User registration & fetch
  - Group creation, deleting, member join/leave
  - Expenses & split creation
  - Chat thread operations
  - Settlement logs
  - Real-time polling API for chats
- **React Frontend SPA**: Styled with **Tailwind CSS** and powered by **Motion** animations (`motion/react`). Includes icons from `lucide-react`.

---

## 3. Database Schema

The database consists of the following relational tables, mimicking a traditional SQLite/PostgreSQL system:

```ts
// Users Table
User {
  id: string (PK)
  name: string
  email: string (Unique)
  avatar: string
  createdAt: string
}

// Groups Table
Group {
  id: string (PK)
  name: string
  description: string
  createdBy: string (FK -> Users.id)
  createdAt: string
}

// Group Members Table (Composite PK: [groupId, userId])
GroupMember {
  groupId: string (FK -> Groups.id, Cascade)
  userId: string (FK -> Users.id, Restrict)
  joinedAt: string
}

// Expenses Table
Expense {
  id: string (PK)
  groupId: string (FK -> Groups.id, Cascade)
  paidBy: string (FK -> Users.id, Restrict)
  amount: number
  description: string
  splitType: 'equal' | 'unequal' | 'percentage' | 'share'
  createdAt: string
}

// Expense Splits Table (Composite PK: [expenseId, userId])
ExpenseSplit {
  expenseId: string (FK -> Expenses.id, Cascade)
  userId: string (FK -> Users.id, Cascade)
  amountOwed: number
  percentage?: number
  shareCount?: number
}

// Chats Table
ChatMessage {
  id: string (PK)
  expenseId: string (FK -> Expenses.id, Cascade)
  userId: string (FK -> Users.id, Cascade)
  message: string
  createdAt: string
}

// Settlements Table
Settlement {
  id: string (PK)
  groupId: string (FK -> Groups.id, Cascade)
  payerId: string (FK -> Users.id, Restrict)
  payeeId: string (FK -> Users.id, Restrict)
  amount: number
  createdAt: string
}
```

---

## 4. API Design

Exposed at `/api/*` on port `3000`:
- `GET /api/users` - Fetch all relational users.
- `POST /api/users` - Register a new user with unique email check.
- `GET /api/groups` - Get all groups.
- `POST /api/groups` - Create a group.
- `DELETE /api/groups/:id` - Dissolve a group and trigger cascading deletes.
- `GET /api/groups/:id/members` - Fetch members.
- `POST /api/groups/:id/members` - Invite a user to a group.
- `DELETE /api/groups/:id/members/:userId` - Remove a user from a group.
- `GET /api/groups/:id/expenses` - Get group expenses with splits.
- `POST /api/expenses` - Insert an expense and corresponding splits transaction.
- `DELETE /api/expenses/:id` - Delete an expense and cascade splits/chats.
- `GET /api/expenses/:id/chats` - Load chats.
- `POST /api/chats` - Comment on an expense.
- `GET /api/groups/:id/settlements` - Load settlements.
- `POST /api/settlements` - Append a settlement entry.
- `GET /api/groups/:id/balances` - Fetch calculated balances.
- `GET /api/groups/:id/debts` - Get simplified transaction settlements.

---

## 5. Front-End Organization

The single page layout utilizes a fluid, highly responsive layout with high-impact color coding representing "Owed / Owes" state elements.
- **Header**: Session Switcher panel allowing developers to toggle between virtual test accounts instantly.
- **Group Dashboard**: Sidebar with list of groups & details, and creating new ones.
- **Expenses & Settlements Feed**: Center track depicting previous expenses, and splitting.
- **Transaction Details Side Modal**: Includes full breakdown of splits (who owes what) + active live discussion.
