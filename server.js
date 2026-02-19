const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'expenses.json');
const PERSONAL_FILE = path.join(__dirname, 'data', 'personal_expense.json');
const WALLET_FILE = path.join(__dirname, 'data', 'personal_wallet.json');

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Initialize data file if it doesn't exist
async function initDataFile() {
    try {
        await fs.access(DATA_FILE);
    } catch {
        const initialData = {
            budget: 50000,
            expenses: [],
            guests: [],
            moneyReceived: {
                ranjana: 0,
                mummy: 0,
                choti: 0
            }
        };
        await fs.writeFile(DATA_FILE, JSON.stringify(initialData, null, 2));
        console.log('Created initial data file');
    }
}

// Helper function to read data
async function readData() {
    try {
        const data = await fs.readFile(DATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading data:', error);
        return { budget: 0, expenses: [] };
    }
}

// Helper functions for personal expenses
async function readPersonalData() {
    try {
        const data = await fs.readFile(PERSONAL_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading personal expense data:', error);
        return [];
    }
}

async function writePersonalData(arr) {
    try {
        await fs.writeFile(PERSONAL_FILE, JSON.stringify(arr, null, 2));
    } catch (error) {
        console.error('Error writing personal expense data:', error);
        throw error;
    }
}

// Helper functions for wallet (personal wallet size)
async function readWalletData() {
    try {
        const data = await fs.readFile(WALLET_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return { amount: 0 };
    }
}

async function writeWalletData(obj) {
    try {
        await fs.writeFile(WALLET_FILE, JSON.stringify(obj, null, 2));
    } catch (error) {
        console.error('Error writing wallet data:', error);
        throw error;
    }
}

// Helper function to write data
async function writeData(data) {
    try {
        await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error writing data:', error);
        throw error;
    }
}

// API Routes

// Get all expenses and budget
app.get('/api/expenses', async (req, res) => {
    try {
        const data = await readData();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to retrieve expenses' });
    }
});

// Get a single expense by ID
app.get('/api/expenses/:id', async (req, res) => {
    try {
        const data = await readData();
        const expense = data.expenses.find(e => e.id === req.params.id);
        if (expense) {
            res.json(expense);
        } else {
            res.status(404).json({ error: 'Expense not found' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to retrieve expense' });
    }
});

// Create a new expense
app.post('/api/expenses', async (req, res) => {
    try {
        const data = await readData();
        
        const hasRemaining = req.body.hasRemaining || false;
        const advancePayment = parseFloat(req.body.cost) || 0;
        const remainingAmount = hasRemaining && req.body.remainingPayment ? parseFloat(req.body.remainingPayment.amount) || 0 : 0;
        const totalCost = advancePayment + remainingAmount;
        const paidBy = req.body.paidBy;
        
        // Create initial payment array
        const payments = [{
            date: req.body.date || new Date().toISOString().split('T')[0],
            amount: advancePayment,
            paidBy: paidBy,
            notes: hasRemaining ? 'Initial advance payment' : 'Full payment'
        }];
        
        const newExpense = {
            id: Date.now().toString(),
            category: req.body.category,
            subCategory: req.body.subCategory || '',
            description: req.body.description,
            totalCost: totalCost,
            payments: payments,
            remainingBalance: remainingAmount,
            fullyPaid: remainingAmount <= 0,
            date: req.body.date || new Date().toISOString().split('T')[0]
        };
        
        data.expenses.push(newExpense);
        
        await writeData(data);
        res.status(201).json(newExpense);
    } catch (error) {
        console.error('Error creating expense:', error);
        res.status(500).json({ error: 'Failed to create expense', message: error.message });
    }
});

// Update an expense
app.put('/api/expenses/:id', async (req, res) => {
    try {
        const data = await readData();
        const index = data.expenses.findIndex(e => e.id === req.params.id);
        if (index !== -1) {
            const updates = {};
            if (req.body.category !== undefined) updates.category = req.body.category;
            if (req.body.subCategory !== undefined) updates.subCategory = req.body.subCategory;
            if (req.body.description !== undefined) updates.description = req.body.description;
            data.expenses[index] = {
                ...data.expenses[index],
                ...updates
            };
            await writeData(data);
            res.json(data.expenses[index]);
        } else {
            res.status(404).json({ error: 'Expense not found' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to update expense' });
    }
});

// Add a payment to an existing expense
app.post('/api/expenses/:id/payment', async (req, res) => {
    try {
        const data = await readData();
        const expense = data.expenses.find(e => e.id === req.params.id);
        
        if (!expense) {
            return res.status(404).json({ error: 'Expense not found' });
        }
        
        // Initialize payments array if it doesn't exist
        if (!expense.payments) {
            expense.payments = [];
        }
        
        // Add new payment
        const newPayment = {
            date: req.body.date || new Date().toISOString().split('T')[0],
            amount: parseFloat(req.body.amount) || 0,
            paidBy: req.body.paidBy,
            notes: req.body.notes || ''
        };
        
        expense.payments.push(newPayment);
        
        // Recalculate remaining balance
        const totalPaid = expense.payments.reduce((sum, p) => sum + p.amount, 0);
        expense.remainingBalance = expense.totalCost - totalPaid;
        expense.fullyPaid = expense.remainingBalance <= 0;
        
        await writeData(data);
        res.json(expense);
    } catch (error) {
        console.error('Error adding payment:', error);
        res.status(500).json({ error: 'Failed to add payment', message: error.message });
    }
});

// Update a payment in an existing expense
app.put('/api/expenses/:id/payment/:paymentIndex', async (req, res) => {
    try {
        const data = await readData();
        const expense = data.expenses.find(e => e.id === req.params.id);
        
        if (!expense) {
            return res.status(404).json({ error: 'Expense not found' });
        }
        
        const paymentIndex = parseInt(req.params.paymentIndex);
        if (!expense.payments || paymentIndex < 0 || paymentIndex >= expense.payments.length) {
            return res.status(404).json({ error: 'Payment not found' });
        }
        
        // Update payment
        expense.payments[paymentIndex] = {
            date: req.body.date || expense.payments[paymentIndex].date,
            amount: parseFloat(req.body.amount) || expense.payments[paymentIndex].amount,
            paidBy: req.body.paidBy || expense.payments[paymentIndex].paidBy,
            notes: req.body.notes !== undefined ? req.body.notes : expense.payments[paymentIndex].notes
        };
        
        // If there's only one payment, update totalCost to match the payment amount
        if (expense.payments.length === 1) {
            expense.totalCost = expense.payments[0].amount;
            expense.remainingBalance = 0;
            expense.fullyPaid = true;
        } else {
            // Recalculate remaining balance for multiple payments
            const totalPaid = expense.payments.reduce((sum, p) => sum + p.amount, 0);
            expense.remainingBalance = expense.totalCost - totalPaid;
            expense.fullyPaid = expense.remainingBalance <= 0;
        }
        
        await writeData(data);
        res.json(expense);
    } catch (error) {
        console.error('Error updating payment:', error);
        res.status(500).json({ error: 'Failed to update payment', message: error.message });
    }
});

// Delete a payment from an existing expense
app.delete('/api/expenses/:id/payment/:paymentIndex', async (req, res) => {
    try {
        const data = await readData();
        const expense = data.expenses.find(e => e.id === req.params.id);
        
        if (!expense) {
            return res.status(404).json({ error: 'Expense not found' });
        }
        
        const paymentIndex = parseInt(req.params.paymentIndex);
        if (!expense.payments || paymentIndex < 0 || paymentIndex >= expense.payments.length) {
            return res.status(404).json({ error: 'Payment not found' });
        }
        
        // Remove payment
        expense.payments.splice(paymentIndex, 1);
        
        // Recalculate remaining balance
        const totalPaid = expense.payments.reduce((sum, p) => sum + p.amount, 0);
        expense.remainingBalance = expense.totalCost - totalPaid;
        expense.fullyPaid = expense.remainingBalance <= 0;
        
        await writeData(data);
        res.json(expense);
    } catch (error) {
        console.error('Error deleting payment:', error);
        res.status(500).json({ error: 'Failed to delete payment', message: error.message });
    }
});

// Delete an expense
app.delete('/api/expenses/:id', async (req, res) => {
    try {
        const data = await readData();
        const index = data.expenses.findIndex(e => e.id === req.params.id);
        if (index !== -1) {
            // Also delete any sub-payments if this is a parent expense
            const expenseId = req.params.id;
            data.expenses = data.expenses.filter(e => e.id !== expenseId && e.parentId !== expenseId);
            
            await writeData(data);
            res.json({ message: 'Expense deleted successfully' });
        } else {
            res.status(404).json({ error: 'Expense not found' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete expense' });
    }
});

// Update budget
app.put('/api/budget', async (req, res) => {
    try {
        const data = await readData();
        data.budget = parseFloat(req.body.budget) || 0;
        await writeData(data);
        res.json({ budget: data.budget });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update budget' });
    }
});

// Update money received
app.put('/api/money-received', async (req, res) => {
    try {
        const data = await readData();
        data.moneyReceived = {
            ranjana: parseFloat(req.body.moneyReceived.ranjana) || 0,
            mummy: parseFloat(req.body.moneyReceived.mummy) || 0,
            choti: parseFloat(req.body.moneyReceived.choti) || 0
        };
        await writeData(data);
        res.json({ moneyReceived: data.moneyReceived });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update money received' });
    }
});

// Get summary statistics
app.get('/api/summary', async (req, res) => {
    try {
        const data = await readData();
        const totalCost = data.expenses.reduce((sum, e) => sum + e.cost, 0);
        const totalPaid = data.expenses.filter(e => e.paid && !e.hasRemaining).reduce((sum, e) => sum + e.cost, 0);
        const totalRemaining = data.expenses.filter(e => e.hasRemaining).reduce((sum, e) => sum + e.cost, 0);
        const remaining = data.budget - totalCost;
        
        res.json({
            budget: data.budget,
            totalCost,
            totalPaid,
            totalRemaining,
            remaining,
            percentSpent: data.budget > 0 ? ((totalCost / data.budget) * 100).toFixed(2) : 0
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to get summary' });
    }
});

// ===== PERSONAL EXPENSES =====

// Get all personal expenses
app.get('/api/personal-expenses', async (req, res) => {
    try {
        const items = await readPersonalData();
        res.json(items);
    } catch (error) {
        res.status(500).json({ error: 'Failed to retrieve personal expenses' });
    }
});

// Create a personal expense
app.post('/api/personal-expenses', async (req, res) => {
    try {
        const items = await readPersonalData();
        const newItem = {
            id: Date.now().toString(),
            date: req.body.date || new Date().toISOString().split('T')[0],
            description: req.body.description || '',
            amount: parseFloat(req.body.amount) || 0
        };
        items.push(newItem);
        await writePersonalData(items);
        res.status(201).json(newItem);
    } catch (error) {
        console.error('Error creating personal expense:', error);
        res.status(500).json({ error: 'Failed to create personal expense' });
    }
});

// Delete a personal expense
app.delete('/api/personal-expenses/:id', async (req, res) => {
    try {
        const items = await readPersonalData();
        const filtered = items.filter(i => i.id !== req.params.id);
        if (filtered.length === items.length) {
            return res.status(404).json({ error: 'Item not found' });
        }
        await writePersonalData(filtered);
        res.json({ message: 'Deleted' });
    } catch (error) {
        console.error('Error deleting personal expense:', error);
        res.status(500).json({ error: 'Failed to delete personal expense' });
    }
});

// Update a personal expense
app.put('/api/personal-expenses/:id', async (req, res) => {
    try {
        const items = await readPersonalData();
        const index = items.findIndex(i => i.id === req.params.id);
        if (index === -1) {
            return res.status(404).json({ error: 'Item not found' });
        }

        const updated = {
            ...items[index],
            date: req.body.date || items[index].date,
            description: req.body.description !== undefined ? req.body.description : items[index].description,
            amount: req.body.amount !== undefined ? parseFloat(req.body.amount) || 0 : items[index].amount
        };

        items[index] = updated;
        await writePersonalData(items);
        res.json(updated);
    } catch (error) {
        console.error('Error updating personal expense:', error);
        res.status(500).json({ error: 'Failed to update personal expense' });
    }
});

// ===== PERSONAL WALLET =====
// Get personal wallet (amount)
app.get('/api/personal-wallet', async (req, res) => {
    try {
        const wallet = await readWalletData();
        res.json(wallet);
    } catch (error) {
        res.status(500).json({ error: 'Failed to retrieve wallet' });
    }
});

// Update personal wallet amount
app.put('/api/personal-wallet', async (req, res) => {
    try {
        const amount = parseFloat(req.body.amount) || 0;
        const obj = { amount };
        await writeWalletData(obj);
        res.json(obj);
    } catch (error) {
        console.error('Error updating wallet:', error);
        res.status(500).json({ error: 'Failed to update wallet' });
    }
});

// ===== GUEST LIST ENDPOINTS =====

// Get all guests
app.get('/api/guests', async (req, res) => {
    try {
        const data = await readData();
        res.json(data.guests || []);
    } catch (error) {
        res.status(500).json({ error: 'Failed to retrieve guests' });
    }
});

// Get a single guest by ID
app.get('/api/guests/:id', async (req, res) => {
    try {
        const data = await readData();
        const guest = (data.guests || []).find(g => g.id === req.params.id);
        if (guest) {
            res.json(guest);
        } else {
            res.status(404).json({ error: 'Guest not found' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to retrieve guest' });
    }
});

// Create a new guest
app.post('/api/guests', async (req, res) => {
    try {
        const data = await readData();
        if (!data.guests) {
            data.guests = [];
        }
        
        const newGuest = {
            id: Date.now().toString(),
            name: req.body.name,
            room: req.body.room || ''
        };
        
        data.guests.push(newGuest);
        await writeData(data);
        res.status(201).json(newGuest);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create guest' });
    }
});

// Update a guest
app.put('/api/guests/:id', async (req, res) => {
    try {
        const data = await readData();
        if (!data.guests) {
            data.guests = [];
        }
        
        const index = data.guests.findIndex(g => g.id === req.params.id);
        if (index !== -1) {
            data.guests[index] = {
                ...data.guests[index],
                name: req.body.name,
                room: req.body.room || ''
            };
            await writeData(data);
            res.json(data.guests[index]);
        } else {
            res.status(404).json({ error: 'Guest not found' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to update guest' });
    }
});

// Delete a guest
app.delete('/api/guests/:id', async (req, res) => {
    try {
        const data = await readData();
        if (!data.guests) {
            data.guests = [];
        }
        
        data.guests = data.guests.filter(g => g.id !== req.params.id);
        await writeData(data);
        res.json({ message: 'Guest deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete guest' });
    }
});

// Export full data
app.get('/api/data/export', async (req, res) => {
    try {
        const data = await readData();
        res.setHeader('Content-Disposition', 'attachment; filename="expenses-backup.json"');
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify(data, null, 2));
    } catch (error) {
        res.status(500).json({ error: 'Failed to export data' });
    }
});

// Import full data (overwrites everything)
app.post('/api/data/import', async (req, res) => {
    try {
        const incoming = req.body;
        if (!incoming || !Array.isArray(incoming.expenses)) {
            return res.status(400).json({ error: 'Invalid data format' });
        }
        await writeData(incoming);
        res.json({ message: 'Data imported successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to import data' });
    }
});

// Clean all data
app.post('/api/data/clean', async (req, res) => {
    try {
        const emptyData = {
            budget: 0,
            expenses: [],
            guests: [],
            moneyReceived: { ranjana: 0, mummy: 0, choti: 0 }
        };
        await writeData(emptyData);
        res.json({ message: 'Data cleaned successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to clean data' });
    }
});

// Start server
app.listen(PORT, async () => {
    await initDataFile();
    console.log(`Wedding Expense Tracker server running on http://localhost:${PORT}`);
});
