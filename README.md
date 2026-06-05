# Spreetail splits - Splitwise Clone App

A complete, feature-rich, reverse-engineered **Splitwise Clone** full-stack web application designed for group expense splitting, built with a robust relational data model, transaction settlement minimizer, and real-time expense details discussion.

Awarded as a highly polished engineering evaluation submission for Spreetail's developer cohort.

---

## 🚀 Key Features Built to Spec

1. **Login & Session Management**:
   - Multi-user authentication registry with unique constraints checks.
   - **Quick Session Switcher (Dev Sandbox)**: A dashboard header allowing developers to instantly cycle between active user sessions (`Sarthak`, `Alice`, `Bob`, `Charlie`) in the iframe and observe group ledger effects inside a single viewport!

2. **Group Spaces & Roster Management**:
   - Core creation engine of groups with custom names/descriptions.
   - Roster manager enabling inviting users and safe user kicks.
   - **Formidable Relational Integrity Checks**: Prevents removing users if they have pending debt items or have paid for group bills.

3. **Multi-Strategy Split Transaction Engine**:
   - Supports 4 mathematically rigorous invoice distribution formats:
     - **Equal division**: Divides cost exactly, automatically leveling out mathematical floor-rounding cents.
     - **Unequal division**: Allows naming custom dollar values per friend (validates that sum of shares matches total invoice exactly).
     - **Percentage splits**: Allows splitting using percentages (validates that percentage totals equal 100%).
     - **Share divisions**: Allocates shares dynamically according to weights (e.g. 2 shares to Alice, 1 share to Bob).

4. **Dynamic Balancing & Greedy Debt Settlement Optimizer**:
   - Dynamic query calculation computing each person's net group status.
   - Implements Splitwise’s core **Greedy Debt Simplification algorithm** in $O(N \log N)$ complexity, resolving compound cashflows into the absolute minimum number of settlement paths.
   - **1-Click Quick-Settle buttons**: Allows clicking directly next to optimized suggestions to record settlement payments immediately.

5. **Live Conversation Discussion Stream**:
   - Polling SSE emulation under each expense details panel to query messages and chat in real-time.

---

## 🛠️ Technological Architecture

- **Front-End SPA**: Styled with beautiful, desktop-precise, high-contrast **Tailwind CSS Grid utilities**, using paired **Inter** headings and **JetBrains Mono** data cards. Micro-interactions and sliding inputs are polished with **Vite**-compiled modules.
- **Back-End Server**: Run using an **Express** web server in NodeJS. Handles API routing, server-sent queries, static routing, and server-side operations on port `3000`.
- **Relational Ledger System**: A custom-designed file-backed transaction engine (`src/db/relational.ts`) validating standard entity relations: primary keys, field validations, foreign keys, and complete cascading deletes (deleting a group cleans expenses, splits, chats, and settlements gracefully).

---

## 💻 Setup & Local Development Instructions

The application compiles seamlessly with Node workspace loaders.

### 1. Installation

Install all required NPM packages:
```bash
npm install
```

### 2. Launch Development Terminal

Run the full-stack server locally (runs on port `3050` or binds proxying routes to `3000` automatically):
```bash
npm run dev
```

### 3. Production Build Compilation

Compile the Vite application assets and bundle the complete backend server into an optimized, self-contained CommonJS target using `esbuild`:
```bash
npm run build
```

---

## 🤖 AI Collaboration Log & Systems Used

The application was built as a collaborative process between an Advanced AI developer agent and the Product Manager. 

- **Primary AI systems utilized**: Google DeepMind's agentic AI coding workspace powered by Gemini models and standard development system tools.
- **Prompting Philosophy**: Explicit "build-plan-first" coordination. We structured the target database schema, primary/foreign key connections, and cascading deletes BEFORE implementing any lines of application code, ensuring zero logic-drift.
