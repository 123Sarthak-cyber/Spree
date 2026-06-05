/**
 * Full-stack Express server with Vite middleware integration.
 * Acts as the centralized REST API backend proxy, serving the relational database.
 */

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { RelationalDatabase } from './src/db/relational.ts';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Initialize relational database
  const db = new RelationalDatabase();

  app.use(express.json());

  // ================= API ENDPOINTS =================

  // --- HEALTH CHECK ---
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', database: 'relational_json_file' });
  });

  // --- USERS API ---
  app.get('/api/users', (req, res) => {
    try {
      const users = db.getUsers();
      res.json(users);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/users', (req, res) => {
    try {
      const { name, email, avatar } = req.body;
      if (!name || !email) {
        return res.status(400).json({ error: 'Name and Email are required (Relational Constraint)' });
      }
      const defaultAvatar = avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name)}`;
      const newUser = db.insertUser({ name, email, avatar: defaultAvatar });
      res.status(201).json(newUser);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  // --- GROUPS API ---
  app.get('/api/groups', (req, res) => {
    try {
      const groups = db.getGroups();
      // Hydrate with creator details and current member count
      const hydrated = groups.map(g => {
        const creator = db.getUserById(g.createdBy);
        const members = db.getGroupMemberUsers(g.id);
        return {
          ...g,
          createdByDetails: creator,
          members
        };
      });
      res.json(hydrated);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/groups', (req, res) => {
    try {
      const { name, description, createdBy } = req.body;
      if (!name || !createdBy) {
        return res.status(400).json({ error: 'Group Name and Creator ID are required (Relational Constraint)' });
      }
      const newGroup = db.insertGroup({
        name,
        description: description || '',
        createdBy
      });
      res.status(201).json(newGroup);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.delete('/api/groups/:id', (req, res) => {
    try {
      const { id } = req.params;
      db.deleteGroup(id);
      res.json({ success: true, message: `Group "${id}" and all of its split records, chats, and expenses were cascade deleted.` });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  // --- GROUP MEMBERS API ---
  app.get('/api/groups/:id/members', (req, res) => {
    try {
      const { id } = req.params;
      const members = db.getGroupMemberUsers(id);
      res.json(members);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.post('/api/groups/:id/members', (req, res) => {
    try {
      const { id } = req.params;
      const { userId } = req.body;
      if (!userId) {
        return res.status(400).json({ error: 'User ID is required to join group.' });
      }
      const newMember = db.insertGroupMember({ groupId: id, userId });
      res.status(201).json(newMember);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.delete('/api/groups/:id/members/:userId', (req, res) => {
    try {
      const { id, userId } = req.params;
      db.removeGroupMember(id, userId);
      res.json({ success: true, message: `User "${userId}" was removed from group "${id}".` });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  // --- EXPENSES API ---
  app.get('/api/groups/:id/expenses', (req, res) => {
    try {
      const { id } = req.params;
      const expenses = db.getGroupExpenses(id);
      // Hydrate payer name and splits
      const hydrated = expenses.map(exp => {
        const payer = db.getUserById(exp.paidBy);
        const splits = db.getExpenseSplits(exp.id).map(sp => {
          const u = db.getUserById(sp.userId);
          return {
            ...sp,
            userName: u ? u.name : 'Unknown User',
            userAvatar: u ? u.avatar : ''
          };
        });

        return {
          ...exp,
          payerName: payer ? payer.name : 'Unknown User',
          payerAvatar: payer ? payer.avatar : '',
          splits
        };
      });
      res.json(hydrated);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.post('/api/expenses', (req, res) => {
    try {
      const { groupId, paidBy, amount, description, splitType, splits } = req.body;
      if (!groupId || !paidBy || amount === undefined || !description || !splitType || !splits) {
        return res.status(400).json({ error: 'Missing required fields for inserting expense' });
      }

      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        return res.status(400).json({ error: 'Amount must be a positive number' });
      }

      const parsedSplits = splits.map((s: any) => ({
        userId: s.userId,
        amountOwed: parseFloat(s.amountOwed),
        percentage: s.percentage ? parseFloat(s.percentage) : undefined,
        shareCount: s.shareCount ? parseFloat(s.shareCount) : undefined
      }));

      const newExpense = db.insertExpense({
        groupId,
        paidBy,
        amount: numAmount,
        description,
        splitType
      }, parsedSplits);

      res.status(201).json(newExpense);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.delete('/api/expenses/:id', (req, res) => {
    try {
      const { id } = req.params;
      db.deleteExpense(id);
      res.json({ success: true, message: 'Expense deleted and splits and chats were actioned with cascades.' });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  // --- EXPENSE CHATS API ---
  app.get('/api/expenses/:id/chats', (req, res) => {
    try {
      const { id } = req.params;
      const chats = db.getExpenseChats(id);
      res.json(chats);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.post('/api/chats', (req, res) => {
    try {
      const { expenseId, userId, message } = req.body;
      if (!expenseId || !userId || !message) {
        return res.status(400).json({ error: 'expenseId, userId, and message are required' });
      }
      const newChat = db.insertChatMessage({ expenseId, userId, message });
      res.status(201).json(newChat);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  // --- SETTLEMENTS API ---
  app.get('/api/groups/:id/settlements', (req, res) => {
    try {
      const { id } = req.params;
      const list = db.getGroupSettlements(id);
      // Hydrate payer and payee details
      const hydrated = list.map(s => {
        const p1 = db.getUserById(s.payerId);
        const p2 = db.getUserById(s.payeeId);
        return {
          ...s,
          payerName: p1 ? p1.name : 'Unknown User',
          payeeName: p2 ? p2.name : 'Unknown User'
        };
      });
      res.json(hydrated);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.post('/api/settlements', (req, res) => {
    try {
      const { groupId, payerId, payeeId, amount } = req.body;
      if (!groupId || !payerId || !payeeId || amount === undefined) {
        return res.status(400).json({ error: 'Missing required fields for recording payment' });
      }
      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        return res.status(400).json({ error: 'Settlement amount must be greater than 0' });
      }

      const newSet = db.insertSettlement({
        groupId,
        payerId,
        payeeId,
        amount: numAmount
      });
      res.status(201).json(newSet);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.delete('/api/settlements/:id', (req, res) => {
    try {
      const { id } = req.params;
      db.deleteSettlement(id);
      res.json({ success: true });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  // --- BALANCES & DEBTS CALCULATORS ---
  app.get('/api/groups/:id/balances', (req, res) => {
    try {
      const { id } = req.params;
      const balances = db.getGroupBalances(id);
      res.json(balances);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.get('/api/groups/:id/debts', (req, res) => {
    try {
      const { id } = req.params;
      const debts = db.calculateDebts(id);
      // Hydrate with name and avatar details
      const hydrated = debts.map(d => {
        const from = db.getUserById(d.fromUser);
        const to = db.getUserById(d.toUser);
        return {
          ...d,
          fromName: from ? from.name : 'Unknown',
          fromAvatar: from ? from.avatar : '',
          toName: to ? to.name : 'Unknown',
          toAvatar: to ? to.avatar : ''
        };
      });
      res.json(hydrated);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  // ================= VITE OR STATIC SERVING =================

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
