const fs = require('fs');
const path = require('path');

// Read the current data
const dataPath = path.join(__dirname, 'data', 'expenses.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

// Migrate each expense
data.expenses = data.expenses.map(expense => {
    if (expense.hasRemaining) {
        // Convert to new payment history structure
        const totalCost = expense.cost + (expense.remainingPayment?.amount || 0);
        const payments = [{
            date: expense.date || new Date().toISOString().split('T')[0],
            amount: expense.cost,
            paidBy: expense.paidBy,
            notes: "Initial advance payment"
        }];
        
        return {
            id: expense.id,
            category: expense.category,
            subCategory: expense.subCategory,
            description: expense.description,
            totalCost: totalCost,
            payments: payments,
            remainingBalance: expense.remainingPayment?.amount || 0,
            date: expense.date,
            fullyPaid: false
        };
    } else {
        // Fully paid expenses - single payment
        return {
            id: expense.id,
            category: expense.category,
            subCategory: expense.subCategory,
            description: expense.description,
            totalCost: expense.cost,
            payments: [{
                date: expense.date || new Date().toISOString().split('T')[0],
                amount: expense.cost,
                paidBy: expense.paidBy,
                notes: "Full payment"
            }],
            remainingBalance: 0,
            date: expense.date,
            fullyPaid: true
        };
    }
});

// Write back to file
fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
console.log('✅ Migration complete! Converted', data.expenses.length, 'expenses to payment history structure.');
