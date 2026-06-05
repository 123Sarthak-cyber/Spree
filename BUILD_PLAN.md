# BUILD PLAN - Splitwise Clone App

## 1. Product Research

### How we studied Splitwise
Splitwise is a group expense-sharing application that solves the coordination problem of tracking shared costs between friends, roommates, or travel companions. The core user experience involves:
- Adding multiple users to a defined space (a "Group").
- Logging financial transactions ("Expenses") paid by one user on behalf of the group, and distributing that cost among the members using a variety of mathematical split modes (equally, unequal amounts, fixed percentages, or multi-shares).
- Visualizing individual and group balances so members can see who is "owed" vs. "owes" whom.
- Offering communication channels inside specific transactions to resolve disputes or discuss logs.
- Simplifying debt settlements with minimal transactions using an optimization algorithm (often modeled as a flow grid or Greedy heap matcher).

### What workflows we identified
1. **User Cohort Onboarding**: Relational user registration and simple session creation.
2. **Space Formation**: Creating a Group and inviting/removing users while validating relational integrity.
3. **Transaction Logging & Multi-Strategy Split**: Splitting expenses dynamically:
   - **Equal Split**: Equal division of amount among selected users.
   - **Unequal Split**: Custom dollar amount per person (forces sum validation).
   - **Percentage Split**: Split based on percentages (forces 100% total validation).
   - **Share Split**: Split based on assigned share weights (e.g., 2 shares for Bob, 1 share for Alice: divides proportionately).
4. **Interactive Discussion Thread**: Conversation streams attached to specific expenses for details, approvals, or questions.
5. **Debt Settlements**: Recording direct debt clearances between debtors and creditors to balance ledger accounts.
6. **Relational Constraints**: Preventing deletion of users when they hold debts, cascading deletes of expenses/chats/splits when a group is dissolved, and matching composite primary keys.

---

## 2. Architecture & Tech Stack

- **Frontend**: Single Page Application styled with **Tailwind CSS**, and dynamic animated state updates using **Motion** (`motion/react`).
- **Backend / Web Server**: ExpressJS custom server running as a full-stack proxy. Binds on port `3000` to bypass nginx routing overrides and provide fully responsive APIs.
- **Relational Ledger System**: A highly optimized file-backed transactional relational database engine (`/src/db/relational.ts`). Implements standard primary keys, unique column indexes, foreign key validations, cascading transaction deletes, and persistent state serialization to disk (`database_relational.json`).
- **Minimum Debt Optimizer**: A greedy heap matching algorithm resolving debts in $O(N \log N)$ complexity to ensure minimal transactions.

---

## 3. AI Collaboration Process

- **AI Instruction Strategy**: Fostered as an active PM-Developer partnership. Instead of building boilerplate black-boxes, the AI was directed to construct custom transactional handlers, proper relational triggers, and elegant UX layouts.
- **Key Questions Explored**:
  - *Data Integrity*: How should we handle deleting groups? (Decision: Implemented cascading deletes that dissolve splits, comments, and expenses first).
  - *Testing User Flows*: How can a single tester see multi-user interactions? (Decision: Built a **Quick Switch User** panel to toggle sessions inside the same browser viewport).
  - *Floating Points*: How do we handle standard JS decimal errors? (Decision: Multiplied cents by integers or rounded values to 2 decimal places in all core transactions).

---

## 4. Tradeoffs & Simplifications

- **What we simplified**: Implemented user authentication using quick-swap storage credentials rather than full stateful secure cookies, allowing frictionless client-side switching to testing multi-user comments and balances.
- **What we hardcoded**: Standard dicebear avatar seeds are hardcoded for beautiful profile layouts.
- **What we avoided**: Avoided standard heavy Docker native database requirements since standard binary nodes often crash during quick deployment trials.
