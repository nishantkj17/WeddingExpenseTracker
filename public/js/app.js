const API_URL = '/api';

let currentEditId = null;
let allExpenses = [];

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
    const isCurrentlyCollapsed = header.classList.contains('collapsed');
    
    // If opening this section, close all other sections first
    if (isCurrentlyCollapsed) {
        const allHeaders = document.querySelectorAll('.section-header');
        allHeaders.forEach(h => {
            if (h !== header) {
                h.classList.add('collapsed');
                h.nextElementSibling.classList.add('collapsed');
            }
        });
    }
    
    // Toggle current section
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
    document.getElementById('filterPaidBy').addEventListener('input', filterExpenses);
    
    // Toggle remaining payment section
    document.getElementById('hasRemaining').addEventListener('change', function(e) {
        const isChecked = e.target.checked;
        document.getElementById('remainingPaymentSection').style.display = isChecked ? 'block' : 'none';
        
        // Update label and show/hide total cost display
        const costLabel = document.getElementById('costLabel');
        const totalCostDisplay = document.getElementById('totalCostDisplay');
        
        if (isChecked) {
            costLabel.textContent = 'Advance Payment';
            totalCostDisplay.style.display = 'block';
            updateTotalCost();
        } else {
            costLabel.textContent = 'Cost';
            totalCostDisplay.style.display = 'none';
        }
    });
    
    // Update total cost when advance or remaining amounts change
    document.getElementById('cost').addEventListener('input', updateTotalCost);
    document.getElementById('remainingAmount').addEventListener('input', updateTotalCost);
    
    // Update subcategory options when category changes
    document.getElementById('category').addEventListener('input', updateSubCategories);
    
    // Fix dropdown usability - clear field on click to show all options (only for text inputs with datalist)
    const dropdownInputs = ['category', 'subCategory'];
    dropdownInputs.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('click', function() {
                this.value = '';
                this.focus();
            });
        }
    });
}

// Update total cost display
function updateTotalCost() {
    const hasRemaining = document.getElementById('hasRemaining').checked;
    if (hasRemaining) {
        const advance = parseFloat(document.getElementById('cost').value) || 0;
        const remaining = parseFloat(document.getElementById('remainingAmount').value) || 0;
        const total = advance + remaining;
        document.getElementById('totalCost').value = formatCurrency(total);
    }
}

// Populate dropdowns from actual expense data
function populateDropdowns() {
    const categories = [...new Set(allExpenses.map(e => e.category).filter(c => c))];
    const subCategories = [...new Set(allExpenses.map(e => e.subCategory).filter(c => c))];
    
    // Populate category dropdown
    const categoryList = document.getElementById('categoryList');
    categoryList.innerHTML = '';
    categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        categoryList.appendChild(option);
    });
    
    // Populate subcategory dropdown
    const subCategoryList = document.getElementById('subCategoryList');
    subCategoryList.innerHTML = '';
    subCategories.forEach(subCat => {
        const option = document.createElement('option');
        option.value = subCat;
        subCategoryList.appendChild(option);
    });
    
    // Note: Paid By dropdowns are now hardcoded with Ranjana, Mummy, Choti in HTML
}

// Update subcategory datalist based on selected category
function updateSubCategories() {
    const category = document.getElementById('category').value;
    const subCategoryList = document.getElementById('subCategoryList');
    const subCategoryInput = document.getElementById('subCategory');
    
    // Filter subcategories by selected category from actual data
    const relevantSubCategories = [...new Set(
        allExpenses
            .filter(e => e.category === category && e.subCategory)
            .map(e => e.subCategory)
    )];
    
    // Clear existing options
    subCategoryList.innerHTML = '';
    
    // Populate with relevant subcategories
    if (relevantSubCategories.length > 0) {
        relevantSubCategories.forEach(subCat => {
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
        
        allExpenses = data.expenses || [];
        budgetInput.value = data.budget;
        
        // Populate dropdowns from actual data
        populateDropdowns();
        
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
            // Sum all payments made for this expense
            const payments = expense.payments || [];
            payments.forEach(payment => {
                const payer = payment.paidBy;
                if (!paidByPerson[payer]) {
                    paidByPerson[payer] = 0;
                }
                paidByPerson[payer] += payment.amount;
            });
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
            const payments = exp.payments || [];
            const totalPaid = payments.reduce((pSum, p) => pSum + p.amount, 0);
            return sum + totalPaid;
        }, 0);
        
        const totalRemainingPayments = expenses.reduce((sum, exp) => {
            return sum + (exp.remainingBalance || 0);
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
async function loadExpenses(searchKeyword = '', paidByFilter = '') {
    try {
        const response = await fetch(`${API_URL}/expenses`);
        const data = await response.json();
        
        let expenses = data.expenses;
        
        // Filter by keyword search across all fields
        if (searchKeyword) {
            const keyword = searchKeyword.toLowerCase();
            expenses = expenses.filter(e => {
                const hasPaymentByKeyword = e.payments && e.payments.some(p => 
                    p.paidBy && p.paidBy.toLowerCase().includes(keyword)
                );
                return (
                    (e.category && e.category.toLowerCase().includes(keyword)) ||
                    (e.subCategory && e.subCategory.toLowerCase().includes(keyword)) ||
                    (e.description && e.description.toLowerCase().includes(keyword)) ||
                    hasPaymentByKeyword ||
                    (e.totalCost && e.totalCost.toString().includes(keyword))
                );
            });
        }
        
        // Filter by Paid By
        if (paidByFilter) {
            const paidBy = paidByFilter.toLowerCase();
            expenses = expenses.filter(e => 
                e.payments && e.payments.some(p => p.paidBy && p.paidBy.toLowerCase().includes(paidBy))
            );
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
    
    expensesList.innerHTML = expenses.map(expense => {
        const payments = expense.payments || [];
        const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
        const remaining = expense.remainingBalance || 0;
        const totalCost = expense.totalCost || 0;
        
        return `
        <div class="expense-item ${expense.fullyPaid ? 'paid' : ''}" style="margin-bottom: 4px; padding: 6px 8px; background: white; border-radius: 6px; box-shadow: 0 1px 2px rgba(0,0,0,0.08);">
            <div style="display: flex; justify-content: space-between; align-items: start; gap: 6px;">
                <div style="flex: 1; min-width: 0;">
                    <div style="display: flex; align-items: center; gap: 4px; margin-bottom: 2px;">
                        <span style="font-weight: 600; color: var(--primary-color); font-size: 0.75rem;">${expense.category}</span>
                        ${expense.subCategory ? `<span style="font-size: 0.65rem; color: var(--text-light);">• ${expense.subCategory}</span>` : ''}
                        ${expense.fullyPaid ? '<span style="font-size: 0.6rem; padding: 1px 3px; background: var(--success-color); color: white; border-radius: 4px;">✓</span>' : '<span style="font-size: 0.6rem; padding: 1px 3px; background: var(--warning-color); color: var(--text-dark); border-radius: 4px;">⏳</span>'}
                    </div>
                    <div style="font-size: 0.8rem; color: var(--text-dark); font-weight: 500; margin-bottom: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${expense.description}</div>
                    <div style="display: flex; flex-wrap: wrap; gap: 6px; font-size: 0.65rem; color: var(--text-light);">
                        <span>Total: ${formatCurrency(totalCost)}</span>
                        <span>•</span>
                        <span style="color: var(--success-color);">Paid: ${formatCurrency(totalPaid)}</span>
                        ${remaining > 0 ? `<span>•</span><span style="color: var(--secondary-color);">Rem: ${formatCurrency(remaining)}</span>` : ''}
                        <span>•</span>
                        <span>${formatDate(expense.date)}</span>
                    </div>
                </div>
                <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 2px;">
                    <div style="display: flex; flex-direction: column; gap: 3px;">
                        ${!expense.fullyPaid ? `<button class="btn btn-icon" onclick="openPaymentModal('${expense.id}')" title="Add Payment" style="padding: 4px 6px; font-size: 0.85rem; background: var(--success-color); color: white; min-width: 28px; height: 28px;">💰</button>` : ''}
                        ${payments.length === 1 && expense.fullyPaid ? `<button class="btn btn-icon" onclick="editPayment('${expense.id}', 0)" title="Edit Payment" style="padding: 4px 6px; font-size: 0.85rem; background: var(--primary-color); color: white; min-width: 28px; height: 28px;">✏️</button>` : ''}
                        <button class="btn btn-icon btn-danger" onclick="deleteExpense('${expense.id}')" title="Delete" style="padding: 4px 6px; font-size: 0.85rem; min-width: 28px; height: 28px;">🗑️</button>
                    </div>
                    ${payments.length > 1 || (payments.length === 1 && !expense.fullyPaid) ? `<a href="#" onclick="togglePaymentHistory('${expense.id}'); return false;" style="font-size: 0.6rem; color: var(--primary-color); text-decoration: none; white-space: nowrap;">▶ ${payments.length}p</a>` : ''}
                </div>
            </div>
            <div id="payment-history-${expense.id}" style="display: none; margin-top: 4px; padding: 4px 6px; background: var(--light-bg); border-radius: 4px; font-size: 0.65rem;">
                ${payments.map((p, index) => `
                    <div style="padding: 2px 0; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center;">
                        <div style="flex: 1;">
                            ${formatDate(p.date)} • ${formatCurrency(p.amount)} • ${p.paidBy}
                            ${p.notes ? `<div style="font-style: italic; color: var(--text-light); font-size: 0.6rem;">${p.notes}</div>` : ''}
                        </div>
                        <div style="display: flex; gap: 2px;">
                            <button class="btn btn-icon" onclick="editPayment('${expense.id}', ${index})" title="Edit Payment" style="padding: 2px 4px; font-size: 0.6rem; min-width: 20px; height: 20px; background: var(--primary-color); color: white;">✏️</button>
                            <button class="btn btn-icon" onclick="deletePayment('${expense.id}', ${index})" title="Delete Payment" style="padding: 2px 4px; font-size: 0.6rem; min-width: 20px; height: 20px; background: var(--danger-color); color: white;">🗑️</button>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
        `;
    }).join('');
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
    alert('Note: Expense editing is currently disabled with the new payment history system.\n\nTo modify payments:\n- Use the 💰 button to add new payments\n- Delete and recreate the expense if needed');
    return;
    
    // Edit functionality disabled - use payment modal for adding payments
    // Delete and recreate expense if major changes are needed
}

// Cancel edit
function cancelEdit() {
    expenseForm.reset();
    document.getElementById('remainingPaymentSection').style.display = 'none';
    currentEditId = null;
    cancelEditBtn.style.display = 'none';
    
    // Reset labels and total cost display
    document.getElementById('costLabel').textContent = 'Cost';
    document.getElementById('totalCostDisplay').style.display = 'none';
    
    // Reset submit button text to "Add Expense"
    const submitBtn = expenseForm.querySelector('button[type="submit"]');
    submitBtn.textContent = 'Add Expense';
}

// Delete expense
// Toggle payment history display
function togglePaymentHistory(expenseId) {
    const historyDiv = document.getElementById(`payment-history-${expenseId}`);
    if (historyDiv) {
        const isCurrentlyHidden = historyDiv.style.display === 'none' || historyDiv.style.display === '';
        historyDiv.style.display = isCurrentlyHidden ? 'block' : 'none';
        
        const link = historyDiv.previousElementSibling;
        if (link && link.tagName === 'A') {
            // Extract payment count from current text (e.g., "▶ 2p" -> "2")
            const match = link.textContent.match(/(\d+)p/);
            if (match) {
                const count = match[1];
                link.textContent = isCurrentlyHidden ? `▼ ${count}p` : `▶ ${count}p`;
            }
        }
    }
}

// Open payment modal
async function openPaymentModal(expenseId, paymentIndex = null) {
    const modal = document.getElementById('paymentModal');
    
    // Fetch fresh expense data from API
    try {
        const response = await fetch(`${API_URL}/expenses/${expenseId}`);
        if (!response.ok) {
            showNotification('Failed to load expense data', 'error');
            return;
        }
        const expense = await response.json();
        
        // Store the expense ID and payment index on the modal
        modal.dataset.expenseId = expenseId;
        modal.dataset.paymentIndex = paymentIndex !== null ? paymentIndex : '';
        
        // Calculate total paid from payments array
        const payments = expense.payments || [];
        const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
        
        // Populate expense details
        document.getElementById('paymentExpenseDetails').innerHTML = `
            <strong>${expense.description}</strong><br>
            Category: ${expense.category}${expense.subCategory ? ' > ' + expense.subCategory : ''}<br>
            Total Cost: ${formatCurrency(expense.totalCost)}<br>
            Paid: ${formatCurrency(totalPaid)}<br>
            Remaining: ${formatCurrency(expense.remainingBalance || 0)}
        `;
        
        // Update modal title
        document.getElementById('paymentModalTitle').textContent = paymentIndex !== null ? '✏️ Edit Payment' : '💰 Add Payment';
        
        // If editing, populate with existing payment data
        if (paymentIndex !== null && payments[paymentIndex]) {
            const payment = payments[paymentIndex];
            document.getElementById('paymentDate').value = payment.date;
            document.getElementById('paymentAmount').value = payment.amount;
            document.getElementById('paymentPaidBy').value = payment.paidBy;
            document.getElementById('paymentNotes').value = payment.notes || '';
        } else {
            // Set default values for new payment
            document.getElementById('paymentDate').valueAsDate = new Date();
            document.getElementById('paymentAmount').value = '';
            document.getElementById('paymentPaidBy').value = '';
            document.getElementById('paymentNotes').value = '';
        }
        
        // Show modal
        modal.style.display = 'flex';
    } catch (error) {
        console.error('Error opening payment modal:', error);
        showNotification('Failed to open payment modal', 'error');
    }
}

// Close payment modal
function closePaymentModal() {
    const modal = document.getElementById('paymentModal');
    modal.style.display = 'none';
    modal.dataset.expenseId = '';
    modal.dataset.paymentIndex = '';
}

// Submit payment
async function submitPayment(event) {
    event.preventDefault();
    
    const modal = document.getElementById('paymentModal');
    const expenseId = modal.dataset.expenseId;
    const paymentIndex = modal.dataset.paymentIndex;
    
    if (!expenseId) return;
    
    const paymentData = {
        date: document.getElementById('paymentDate').value,
        amount: parseFloat(document.getElementById('paymentAmount').value),
        paidBy: document.getElementById('paymentPaidBy').value || 'Unknown',
        notes: document.getElementById('paymentNotes').value || ''
    };
    
    if (!paymentData.amount || paymentData.amount <= 0) {
        showNotification('Please enter a valid payment amount', 'error');
        return;
    }
    
    try {
        let response;
        const isEditing = paymentIndex !== '' && paymentIndex !== null;
        
        if (isEditing) {
            // Update existing payment
            response = await fetch(`${API_URL}/expenses/${expenseId}/payment/${paymentIndex}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(paymentData)
            });
        } else {
            // Add new payment
            response = await fetch(`${API_URL}/expenses/${expenseId}/payment`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(paymentData)
            });
        }
        
        if (response.ok) {
            showNotification(isEditing ? 'Payment updated successfully!' : 'Payment added successfully!', 'success');
            closePaymentModal();
            await loadSummary();
            filterExpenses();
            updateCharts();
        } else {
            const error = await response.json();
            showNotification(error.message || `Failed to ${isEditing ? 'update' : 'add'} payment`, 'error');
        }
    } catch (error) {
        console.error('Error saving payment:', error);
        showNotification('Error saving payment', 'error');
    }
}

// Edit payment
function editPayment(expenseId, paymentIndex) {
    openPaymentModal(expenseId, paymentIndex);
}

// Delete payment
async function deletePayment(expenseId, paymentIndex) {
    if (!confirm('Are you sure you want to delete this payment?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/expenses/${expenseId}/payment/${paymentIndex}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            showNotification('Payment deleted successfully!', 'success');
            await loadSummary();
            filterExpenses();
            updateCharts();
        } else {
            const error = await response.json();
            showNotification(error.message || 'Failed to delete payment', 'error');
        }
    } catch (error) {
        console.error('Error deleting payment:', error);
        showNotification('Failed to delete payment', 'error');
    }
}

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
            filterExpenses();
            updateCharts();
        }
    } catch (error) {
        console.error('Error deleting expense:', error);
        showNotification('Failed to delete expense', 'error');
    }
}

// Filter expenses
function filterExpenses() {
    const keyword = filterCategory.value;
    const paidBy = document.getElementById('filterPaidBy').value;
    loadExpenses(keyword, paidBy);
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
            const totalCost = expense.totalCost || 0;
            categoryData[key] = (categoryData[key] || 0) + totalCost;
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
            const totalCost = expense.totalCost || 0;
            cumulativeAmount += totalCost;
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