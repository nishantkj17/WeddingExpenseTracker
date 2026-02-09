const API_URL = 'http://localhost:3000/api';

let currentEditId = null;

// Category to SubCategory mapping
const categorySubCategories = {
    'Jewellery': ['Gold', 'Silver', 'Platinum', 'Diamond', 'Kundan', 'Polki', 'Other'],
    'Venue': ['Indoor', 'Outdoor', 'Garden', 'Banquet Hall', 'Hotel', 'Beach', 'Other'],
    'Catering': ['Breakfast', 'Lunch', 'Dinner', 'Snacks', 'Desserts', 'Beverages', 'Other'],
    'Photography': ['Pre-Wedding', 'Wedding Day', 'Reception', 'Candid', 'Traditional', 'Other'],
    'Videography': ['Pre-Wedding', 'Wedding Day', 'Reception', 'Cinematic', 'Traditional', 'Other'],
    'Flowers & Decorations': ['Stage', 'Entrance', 'Hall', 'Tables', 'Car', 'Mandap', 'Other'],
    'Music & Entertainment': ['DJ', 'Band', 'Singer', 'Dancers', 'MC', 'Sound System', 'Other'],
    'Wedding Dress': ['Bridal Lehenga', 'Bridal Saree', 'Gown', 'Accessories', 'Alterations', 'Other'],
    'Suit/Tuxedo': ['Sherwani', 'Suit', 'Indo-Western', 'Accessories', 'Alterations', 'Other'],
    'Rings': ['Engagement Ring', 'Wedding Band', 'Engraving', 'Other'],
    'Invitations': ['Physical Cards', 'Digital Invites', 'Envelopes', 'Printing', 'Other'],
    'Wedding Cake': ['Main Cake', 'Dessert Table', 'Cupcakes', 'Other'],
    'Transportation': ['Bridal Car', 'Guest Transport', 'Valet Service', 'Other'],
    'Accommodation': ['Guest Rooms', 'Bridal Suite', 'Groom Suite', 'Other'],
    'Favors & Gifts': ['Guest Favors', 'Return Gifts', 'Welcome Kits', 'Other']
};

// DOM Elements
const budgetInput = document.getElementById('budgetInput');
const updateBudgetBtn = document.getElementById('updateBudgetBtn');
const expenseForm = document.getElementById('expenseForm');
const cancelEditBtn = document.getElementById('cancelEditBtn');
const expensesList = document.getElementById('expensesList');
const filterCategory = document.getElementById('filterCategory');
const saveReceivedBtn = document.getElementById('saveReceivedBtn');

// Summary elements
const whoPaidSection = document.getElementById('whoPaidSection');
const ranjanaReceivedInput = document.getElementById('ranjanaReceived');
const mummyReceivedInput = document.getElementById('mummyReceived');
const chotiReceivedInput = document.getElementById('chotiReceived');
const remainingCashEl = document.getElementById('remainingCash');
const toBePaidLaterEl = document.getElementById('toBePaidLater');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    setupEventListeners();
    initializeCharts();
});

// Collapsible section functionality
function toggleSection(header) {
    const content = header.nextElementSibling;
    header.classList.toggle('collapsed');
    content.classList.toggle('collapsed');
}

// Chart carousel functionality
let currentChartIndex = 0;
let categoryChartInstance = null;
let journeyChartInstance = null;

function showChart(index) {
    const charts = document.querySelectorAll('.chart-container');
    const dots = document.querySelectorAll('.dot');
    
    charts.forEach((chart, i) => {
        chart.classList.toggle('active', i === index);
    });
    
    dots.forEach((dot, i) => {
        dot.classList.toggle('active', i === index);
    });
    
    currentChartIndex = index;
}

function nextChart() {
    currentChartIndex = (currentChartIndex + 1) % 2;
    showChart(currentChartIndex);
}

function previousChart() {
    currentChartIndex = (currentChartIndex - 1 + 2) % 2;
    showChart(currentChartIndex);
}

// Setup event listeners
function setupEventListeners() {
    updateBudgetBtn.addEventListener('click', updateBudget);
    saveReceivedBtn.addEventListener('click', saveMoneyReceived);
    expenseForm.addEventListener('submit', handleFormSubmit);
    cancelEditBtn.addEventListener('click', cancelEdit);
    filterCategory.addEventListener('input', filterExpenses);
    
    // Toggle remaining payment section
    document.getElementById('hasRemaining').addEventListener('change', function(e) {
        document.getElementById('remainingPaymentSection').style.display = e.target.checked ? 'block' : 'none';
    });
    
    // Update subcategory options when category changes
    document.getElementById('category').addEventListener('input', updateSubCategories);
}

// Update subcategory datalist based on selected category
function updateSubCategories() {
    const category = document.getElementById('category').value;
    const subCategoryList = document.getElementById('subCategoryList');
    const subCategoryInput = document.getElementById('subCategory');
    
    // Clear existing options
    subCategoryList.innerHTML = '';
    
    // If category has predefined subcategories, populate them
    if (categorySubCategories[category]) {
        categorySubCategories[category].forEach(subCat => {
            const option = document.createElement('option');
            option.value = subCat;
            subCategoryList.appendChild(option);
        });
        subCategoryInput.placeholder = 'Select or type sub category';
    } else {
        subCategoryInput.placeholder = 'Type sub category (optional)';
    }
}

// Load all data
async function loadData() {
    try {
        const response = await fetch(`${API_URL}/expenses`);
        const data = await response.json();
        
        budgetInput.value = data.budget;
        
        // Load money received values if they exist
        if (data.moneyReceived) {
            ranjanaReceivedInput.value = data.moneyReceived.ranjana || '';
            mummyReceivedInput.value = data.moneyReceived.mummy || '';
            chotiReceivedInput.value = data.moneyReceived.choti || '';
        }
        
        await loadSummary();
        await loadExpenses();
    } catch (error) {
        console.error('Error loading data:', error);
        showNotification('Failed to load data', 'error');
    }
}

// Load summary statistics
async function loadSummary() {
    try {
        const response = await fetch(`${API_URL}/expenses`);
        const data = await response.json();
        
        const expenses = data.expenses || [];
        const budget = data.budget || 0;
        const moneyReceived = data.moneyReceived || { ranjana: 0, mummy: 0, choti: 0 };
        
        // Section 1: Calculate Who Paid How Much (from expense data)
        const paidByPerson = {};
        expenses.forEach(expense => {
            const payer = expense.paidBy;
            if (!paidByPerson[payer]) {
                paidByPerson[payer] = 0;
            }
            // Only count the paid amount (cost - remaining)
            const paidAmount = expense.cost - (expense.remainingPayment?.amount || 0);
            paidByPerson[payer] += paidAmount;
        });
        
        // Display Who Paid How Much
        whoPaidSection.innerHTML = Object.keys(paidByPerson).length > 0 ? 
            Object.entries(paidByPerson).map(([person, amount]) => `
                <div class="summary-card">
                    <h3>${person}</h3>
                    <p class="amount">${formatCurrency(amount)}</p>
                </div>
            `).join('') : 
            '<div class="summary-card"><h3>No Payments Yet</h3><p class="amount">₹0.00</p></div>';
        
        // Section 2: Total Money Received (already in form inputs)
        const totalReceived = 
            (parseFloat(moneyReceived.ranjana) || 0) + 
            (parseFloat(moneyReceived.mummy) || 0) + 
            (parseFloat(moneyReceived.choti) || 0);
        
        // Section 3: Calculate Balances
        const totalPaidExpenses = expenses.reduce((sum, exp) => {
            const paidAmount = exp.cost - (exp.remainingPayment?.amount || 0);
            return sum + paidAmount;
        }, 0);
        
        const totalRemainingPayments = expenses.reduce((sum, exp) => {
            return sum + (exp.remainingPayment?.amount || 0);
        }, 0);
        
        const remainingCash = totalReceived - totalPaidExpenses;
        
        remainingCashEl.textContent = formatCurrency(remainingCash);
        toBePaidLaterEl.textContent = formatCurrency(totalRemainingPayments);
        
        // Color coding for remaining cash
        if (remainingCash < 0) {
            remainingCashEl.style.color = 'var(--danger-color)';
        } else if (remainingCash > 0) {
            remainingCashEl.style.color = 'var(--success-color)';
        } else {
            remainingCashEl.style.color = 'var(--text-dark)';
        }
        
        // Section 4: Budget Progress (include remaining amount to be paid later)
        const totalSpent = totalPaidExpenses + totalRemainingPayments;
        const percent = budget > 0 ? Math.min((totalSpent / budget) * 100, 100).toFixed(1) : 0;
        
        progressFill.style.width = `${percent}%`;
        progressText.textContent = `${percent}% of budget spent`;
        
        // Change color if over budget
        if (percent > 100) {
            progressFill.style.background = 'linear-gradient(90deg, #e07a5f 0%, #d62828 100%)';
        } else {
            progressFill.style.background = 'linear-gradient(90deg, var(--primary-color) 0%, var(--secondary-color) 100%)';
        }
        
    } catch (error) {
        console.error('Error loading summary:', error);
    }
}

// Load expenses
async function loadExpenses(filterCat = '') {
    try {
        const response = await fetch(`${API_URL}/expenses`);
        const data = await response.json();
        
        let expenses = data.expenses;
        
        // Filter by category if specified
        if (filterCat) {
            expenses = expenses.filter(e => e.category === filterCat);
        }
        
        displayExpenses(expenses);
    } catch (error) {
        console.error('Error loading expenses:', error);
    }
}

// Display expenses
function displayExpenses(expenses) {
    if (expenses.length === 0) {
        expensesList.innerHTML = `
            <div class="empty-state">
                <h3>💐 No expenses yet</h3>
                <p>Start adding your wedding expenses to track your budget!</p>
            </div>
        `;
        return;
    }
    
    // Sort by date (newest first)
    expenses.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    expensesList.innerHTML = expenses.map(expense => `
        <div class="expense-item ${expense.paid && !expense.hasRemaining ? 'paid' : ''}" style="margin-bottom: 6px; padding: 8px;">
            <div style="display: grid; grid-template-columns: auto 1fr auto auto; gap: 8px; align-items: center; font-size: 0.85rem;">
                <div style="min-width: 80px;">
                    <div style="font-weight: 600; color: var(--primary-color); font-size: 0.8rem;">${expense.category}</div>
                    ${expense.subCategory ? `<div style="font-size: 0.7rem; color: var(--text-light);">${expense.subCategory}</div>` : ''}
                    ${expense.paid && !expense.hasRemaining ? '<div style="font-size: 0.65rem; padding: 1px 4px; background: var(--success-color); color: white; border-radius: 8px; display: inline-block; margin-top: 2px;">✓</div>' : ''}
                    ${expense.hasRemaining ? '<div style="font-size: 0.65rem; padding: 1px 4px; background: var(--warning-color); color: var(--text-dark); border-radius: 8px; display: inline-block; margin-top: 2px;">⏳</div>' : ''}
                </div>
                <div style="min-width: 0;">
                    <div style="font-size: 0.85rem; color: var(--text-dark); font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${expense.description}</div>
                    <div style="font-size: 0.7rem; color: var(--text-light);">${expense.paidBy} • ${formatDate(expense.date)}</div>
                    ${expense.hasRemaining && expense.remainingPayment ? `<div style="font-size: 0.7rem; color: var(--secondary-color);">Bal: ${formatCurrency(expense.remainingPayment.amount)}</div>` : ''}
                </div>
                <div style="font-size: 0.9rem; font-weight: 700; color: var(--primary-color); white-space: nowrap;">
                    ${formatCurrency(expense.cost)}
                </div>
                <div style="display: flex; gap: 3px;">
                    <button class="btn btn-icon btn-edit" onclick="editExpense('${expense.id}')" title="Edit" style="padding: 4px 6px; font-size: 0.85rem;">✏️</button>
                    <button class="btn btn-icon btn-danger" onclick="deleteExpense('${expense.id}')" title="Delete" style="padding: 4px 6px; font-size: 0.85rem;">🗑️</button>
                </div>
            </div>
        </div>
    `).join('');
}

// Toggle sub-payments visibility
function toggleSubPayments(parentId) {
    const subPaymentsDiv = document.getElementById(`sub-${parentId}`);
    const toggleBtn = document.querySelector(`[data-expense-id="${parentId}"] .expand-toggle`);
    
    if (subPaymentsDiv.style.display === 'none') {
        subPaymentsDiv.style.display = 'block';
        toggleBtn.textContent = '➖';
    } else {
        subPaymentsDiv.style.display = 'none';
        toggleBtn.textContent = '➕';
    }
}

// Update budget
async function updateBudget() {
    const budget = parseFloat(budgetInput.value) || 0;
    
    try {
        const response = await fetch(`${API_URL}/budget`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ budget })
        });
        
        if (response.ok) {
            showNotification('Budget updated successfully!', 'success');
            await loadSummary();
        }
    } catch (error) {
        console.error('Error updating budget:', error);
        showNotification('Failed to update budget', 'error');
    }
}

// Save money received
async function saveMoneyReceived() {
    const moneyReceived = {
        ranjana: parseFloat(ranjanaReceivedInput.value) || 0,
        mummy: parseFloat(mummyReceivedInput.value) || 0,
        choti: parseFloat(chotiReceivedInput.value) || 0
    };
    
    try {
        const response = await fetch(`${API_URL}/money-received`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ moneyReceived })
        });
        
        if (response.ok) {
            showNotification('Money received updated successfully!', 'success');
            await loadSummary();
        }
    } catch (error) {
        console.error('Error updating money received:', error);
        showNotification('Failed to update money received', 'error');
    }
}

// Handle form submission
async function handleFormSubmit(e) {
    e.preventDefault();
    
    const hasRemaining = document.getElementById('hasRemaining').checked;
    const expenseDateValue = document.getElementById('expenseDate').value;
    
    const expense = {
        category: document.getElementById('category').value,
        subCategory: document.getElementById('subCategory').value,
        paidBy: document.getElementById('paidBy').value,
        description: document.getElementById('description').value,
        cost: parseFloat(document.getElementById('cost').value) || 0,
        paid: !hasRemaining,
        hasRemaining: hasRemaining,
        date: expenseDateValue || new Date().toISOString().split('T')[0]
    };
    
    // Add remaining payment details if applicable
    if (hasRemaining && !currentEditId) {
        expense.remainingPayment = {
            amount: parseFloat(document.getElementById('remainingAmount').value) || 0,
            date: document.getElementById('remainingDate').value,
            notes: document.getElementById('remainingNotes').value
        };
    }
    
    try {
        let response;
        if (currentEditId) {
            // Update existing expense
            response = await fetch(`${API_URL}/expenses/${currentEditId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(expense)
            });
            showNotification('Expense updated successfully!', 'success');
        } else {
            // Create new expense
            response = await fetch(`${API_URL}/expenses`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(expense)
            });
            showNotification('Expense added successfully!', 'success');
        }
        
        if (response.ok) {
            expenseForm.reset();
            document.getElementById('remainingPaymentSection').style.display = 'none';
            currentEditId = null;
            cancelEditBtn.style.display = 'none';
            
            // Reset submit button text to "Add Expense"
            const submitBtn = expenseForm.querySelector('button[type="submit"]');
            submitBtn.textContent = 'Add Expense';
            
            await loadSummary();
            await loadExpenses();
            updateCharts();
        }
    } catch (error) {
        console.error('Error saving expense:', error);
        showNotification('Failed to save expense', 'error');
    }
}

// Edit expense
async function editExpense(id) {
    try {
        const response = await fetch(`${API_URL}/expenses/${id}`);
        const expense = await response.json();
        
        document.getElementById('category').value = expense.category;
        document.getElementById('expenseDate').value = expense.date || '';
        document.getElementById('paidBy').value = expense.paidBy;
        document.getElementById('description').value = expense.description;
        document.getElementById('cost').value = expense.cost;
        document.getElementById('hasRemaining').checked = expense.hasRemaining;
        
        // Update subcategories and set value
        updateSubCategories();
        document.getElementById('subCategory').value = expense.subCategory || '';
        
        // Toggle remaining payment section if needed
        document.getElementById('remainingPaymentSection').style.display = expense.hasRemaining ? 'block' : 'none';
        
        currentEditId = id;
        cancelEditBtn.style.display = 'inline-block';
        
        // Change submit button text to "Update Expense"
        const submitBtn = expenseForm.querySelector('button[type="submit"]');
        submitBtn.textContent = 'Update Expense';
        
        // Expand the Add New Expense section if collapsed
        const addExpenseSection = document.querySelector('.collapsible-section:nth-child(2)');
        const sectionHeader = addExpenseSection.querySelector('.section-header');
        const sectionContent = addExpenseSection.querySelector('.section-content');
        if (sectionContent.classList.contains('collapsed')) {
            sectionHeader.classList.remove('collapsed');
            sectionContent.classList.remove('collapsed');
        }
        
        // Scroll to form
        addExpenseSection.scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
        console.error('Error loading expense for edit:', error);
        showNotification('Failed to load expense', 'error');
    }
}

// Cancel edit
function cancelEdit() {
    expenseForm.reset();
    document.getElementById('remainingPaymentSection').style.display = 'none';
    currentEditId = null;
    cancelEditBtn.style.display = 'none';
    
    // Reset submit button text to "Add Expense"
    const submitBtn = expenseForm.querySelector('button[type="submit"]');
    submitBtn.textContent = 'Add Expense';
}

// Delete expense
async function deleteExpense(id) {
    if (!confirm('Are you sure you want to delete this expense?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/expenses/${id}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            showNotification('Expense deleted successfully!', 'success');
            await loadSummary();
            await loadExpenses();
            updateCharts();
        }
    } catch (error) {
        console.error('Error deleting expense:', error);
        showNotification('Failed to delete expense', 'error');
    }
}

// Filter expenses
function filterExpenses() {
    const category = filterCategory.value;
    loadExpenses(category);
}

// Utility functions
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR'
    }).format(amount);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function showNotification(message, type = 'success') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 25px;
        background: ${type === 'success' ? '#6b9080' : '#e07a5f'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        z-index: 1000;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(400px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(400px); opacity: 0; }
    }
`;
document.head.appendChild(style);
// Initialize Charts
function initializeCharts() {
    const categoryCtx = document.getElementById('categoryChart').getContext('2d');
    const journeyCtx = document.getElementById('journeyChart').getContext('2d');
    
    categoryChartInstance = new Chart(categoryCtx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'Spending',
                data: [],
                backgroundColor: 'rgba(212, 165, 165, 0.8)',
                borderColor: '#d4a5a5',
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.parsed.x || 0;
                            return `₹${value.toLocaleString('en-IN', {maximumFractionDigits: 0})}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '₹' + (value/1000).toFixed(0) + 'k';
                        },
                        font: { size: 10 }
                    }
                },
                y: {
                    ticks: {
                        font: { size: 11 },
                        autoSkip: false
                    }
                }
            }
        }
    });
    
    journeyChartInstance = new Chart(journeyCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Cumulative Spending',
                data: [],
                borderColor: '#d4a5a5',
                backgroundColor: 'rgba(212, 165, 165, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `Total: ₹${context.parsed.y.toFixed(2)}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '₹' + value.toFixed(0);
                        }
                    }
                }
            }
        }
    });
    
    updateCharts();
}

// Update Charts with current data
async function updateCharts() {
    try {
        const response = await fetch(`${API_URL}/expenses`);
        const data = await response.json();
        const expenses = data.expenses || [];
        
        if (expenses.length === 0) return;
        
        // Update Category Pie Chart
        const categoryData = {};
        expenses.forEach(expense => {
            const key = expense.subCategory ? 
                `${expense.category} - ${expense.subCategory}` : 
                expense.category;
            categoryData[key] = (categoryData[key] || 0) + expense.cost;
        });
        
        // Sort by amount (highest to lowest)
        const sortedEntries = Object.entries(categoryData).sort((a, b) => b[1] - a[1]);
        
        categoryChartInstance.data.labels = sortedEntries.map(e => e[0]);
        categoryChartInstance.data.datasets[0].data = sortedEntries.map(e => e[1]);
        categoryChartInstance.update();
        
        // Update Journey Line Chart
        const sortedExpenses = [...expenses].sort((a, b) => 
            new Date(a.date) - new Date(b.date)
        );
        
        let cumulativeAmount = 0;
        const journeyData = sortedExpenses.map(expense => {
            cumulativeAmount += expense.cost;
            return {
                date: new Date(expense.date).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric' 
                }),
                amount: cumulativeAmount
            };
        });
        
        journeyChartInstance.data.labels = journeyData.map(d => d.date);
        journeyChartInstance.data.datasets[0].data = journeyData.map(d => d.amount);
        journeyChartInstance.update();
        
    } catch (error) {
        console.error('Error updating charts:', error);
    }
}