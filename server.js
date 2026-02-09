const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'data', 'expenses.json');

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
        const newExpense = {
            id: Date.now().toString(),
            category: req.body.category,
            subCategory: req.body.subCategory || '',
            paidBy: req.body.paidBy,
            description: req.body.description,
            cost: parseFloat(req.body.cost) || 0,
            paid: req.body.paid || false,
            hasRemaining: req.body.hasRemaining || false,
            date: req.body.date || new Date().toISOString().split('T')[0]
        };
        
        // Store remaining payment details if provided
        if (req.body.hasRemaining && req.body.remainingPayment) {
            newExpense.remainingPayment = {
                amount: parseFloat(req.body.remainingPayment.amount) || 0,
                date: req.body.remainingPayment.date || '',
                notes: req.body.remainingPayment.notes || ''
            };
        }
        
        data.expenses.push(newExpense);
        
        await writeData(data);
        res.status(201).json(newExpense);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create expense' });
    }
});

// Update an expense
app.put('/api/expenses/:id', async (req, res) => {
    try {
        const data = await readData();
        const index = data.expenses.findIndex(e => e.id === req.params.id);
        if (index !== -1) {
            data.expenses[index] = {
                ...data.expenses[index],
                category: req.body.category,
                subCategory: req.body.subCategory || '',
                paidBy: req.body.paidBy,
                description: req.body.description,
                cost: parseFloat(req.body.cost) || 0,
                paid: req.body.paid,
                hasRemaining: req.body.hasRemaining,
                date: data.expenses[index].date,
                parentId: data.expenses[index].parentId || null
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

// Start server
app.listen(PORT, async () => {
    await initDataFile();
    console.log(`Wedding Expense Tracker server running on http://localhost:${PORT}`);
});
