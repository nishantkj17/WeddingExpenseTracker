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
    // Initialize Materialize components
    initializeMaterialize();
    loadData();
    setupEventListeners();
    initializeCharts();
});

// Initialize Materialize components
function initializeMaterialize() {
    // Initialize collapsibles with accordion behavior (only one open at a time)
    var elems = document.querySelectorAll('.collapsible');
    M.Collapsible.init(elems, {
        accordion: true
    });

    // Initialize tabs
    var tabs = document.querySelectorAll('.tabs');
    M.Tabs.init(tabs);
    
    // Initialize select dropdowns
    // Use native dropdowns on mobile for better touch support
    var selects = document.querySelectorAll('select');
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (!isMobile) {
        M.FormSelect.init(selects);
    } else {
        // For mobile, add class to use native select
        selects.forEach(select => {
            select.classList.add('browser-default');
            select.style.display = 'block';
            select.style.height = '35px';
            select.style.border = '1px solid #9e9e9e';
            select.style.borderRadius = '4px';
            select.style.padding = '0 8px';
        });
    }
    
    // Initialize modals
    var modals = document.querySelectorAll('.modal');
    M.Modal.init(modals);
    
    // Initialize dashboard carousel
    var dashboardCarousel = document.querySelector('#dashboardCarousel');
    M.Carousel.init(dashboardCarousel, {
        fullWidth: true,
        indicators: true,
        duration: 200
    });
    
    // Initialize charts carousel
    var carousels = document.querySelectorAll('.carousel-slider');
    M.Carousel.init(carousels, {
        fullWidth: true,
        indicators: true
    });
    
    // Update labels for pre-filled inputs
    M.updateTextFields();
}

// Collapsible section functionality (not needed with Materialize, but keeping for compatibility)
function toggleSection(header) {
    // Material UI handles this automatically
}

// Chart carousel functionality (Materialize handles this)
let currentChartIndex = 0;
let categoryChartInstance = null;
let journeyChartInstance = null;

function showChart(index) {
    // Materialize carousel handles this
}

function nextChart() {
    // Materialize carousel handles this
}

function previousChart() {
    // Materialize carousel handles this
}

// Setup event listeners
function setupEventListeners() {
    updateBudgetBtn.addEventListener('click', updateBudget);
    saveReceivedBtn.addEventListener('click', saveMoneyReceived);
    expenseForm.addEventListener('submit', handleFormSubmit);
    cancelEditBtn.addEventListener('click', cancelEdit);
    filterCategory.addEventListener('input', filterExpenses);
    document.getElementById('filterPaidBy').addEventListener('change', filterExpenses);
    document.getElementById('filterPendingOnly').addEventListener('change', handlePendingFilter);
    
    // Toggle remaining payment section
    document.getElementById('hasRemaining').addEventListener('change', function(e) {
        const isChecked = e.target.checked;
        document.getElementById('remainingPaymentSection').style.display = isChecked ? 'block' : 'none';
        
        // Update label and show/hide total cost display
        const costLabel = document.getElementById('costLabel');
        const totalCostDisplay = document.getElementById('totalCostDisplay');
        
        if (isChecked) {
            if (costLabel) costLabel.textContent = 'Advance Payment';
            if (totalCostDisplay) {
                totalCostDisplay.style.display = 'block';
                updateTotalCost();
            }
        } else {
            if (costLabel) costLabel.textContent = 'Cost';
            if (totalCostDisplay) totalCostDisplay.style.display = 'none';
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
        
        // Update Material UI labels
        M.updateTextFields();
        
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
        
        // Display Who Paid How Much - Compact version
        whoPaidSection.innerHTML = Object.keys(paidByPerson).length > 0 ? 
            Object.entries(paidByPerson).map(([person, amount]) => `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 5px 0; border-bottom: 1px solid #e0e0e0;">
                    <span style="font-weight: 500; color: #424242; font-size: 0.85rem;">${person}</span>
                    <span style="font-weight: 600; color: #607d8b; font-size: 0.95rem;">${formatCurrency(amount)}</span>
                </div>
            `).join('') : 
            '<div class="center-align grey-text" style="padding: 15px 0;"><i class="material-icons" style="font-size: 1.5rem;">money_off</i><p style="margin: 3px 0; font-size: 0.8rem;">No payments yet</p></div>';
        
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
            remainingCashEl.classList.remove('blue-text', 'green-text', 'grey-text');
            remainingCashEl.classList.add('red-text', 'text-darken-1');
        } else if (remainingCash > 0) {
            remainingCashEl.classList.remove('blue-text', 'red-text', 'grey-text');
            remainingCashEl.classList.add('green-text', 'text-darken-1');
        } else {
            remainingCashEl.classList.remove('red-text', 'green-text');
            remainingCashEl.classList.add('grey-text', 'text-darken-2');
        }
        
        // Section 4: Budget Progress (include remaining amount to be paid later)
        const totalSpent = totalPaidExpenses + totalRemainingPayments;
        const percent = budget > 0 ? Math.min((totalSpent / budget) * 100, 100).toFixed(1) : 0;
        
        progressFill.style.width = `${percent}%`;
        progressText.textContent = `${percent}% of budget spent`;
        
        // Change color if over budget
        if (percent > 100) {
            progressFill.classList.remove('blue-grey');
            progressFill.classList.add('red', 'darken-1');
        } else {
            progressFill.classList.remove('red', 'darken-1');
            progressFill.classList.add('blue-grey', 'darken-1');
        }
        
    } catch (error) {
        console.error('Error loading summary:', error);
    }
}

// Load expenses
async function loadExpenses(searchKeyword = '', paidByFilter = '', pendingOnly = false) {
    try {
        const response = await fetch(`${API_URL}/expenses`);
        const data = await response.json();
        
        let expenses = data.expenses;
        
        // Apply pending filter first if checked
        if (pendingOnly) {
            expenses = expenses.filter(e => !e.fullyPaid);
        }
        
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
        
        // Filter by Paid By (can work together with pending filter)
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
            <div class="card-panel center-align grey lighten-4">
                <i class="material-icons medium grey-text">receipt_long</i>
                <p style="margin: 5px 0;">No expenses yet. Add your first expense!</p>
            </div>
        `;
        return;
    }
    
    // Sort by ID (newest created first) - IDs are timestamps
    expenses.sort((a, b) => b.id.localeCompare(a.id));
    
    expensesList.innerHTML = expenses.map(expense => {
        const payments = expense.payments || [];
        const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
        const remaining = expense.remainingBalance || 0;
        const totalCost = expense.totalCost || 0;
        const paidBy = payments.length > 0 ? payments[0].paidBy : (expense.paidBy || '');
        
        return `
        <div class="card ${expense.fullyPaid ? 'grey lighten-5' : ''}" style="margin: 5px 0;">
            <div class="card-content" style="padding: 8px;">
                <div class="row" style="margin: 0;">
                    <div class="col s7">
                        <div style="font-weight: 500; font-size: 0.95rem; color: #424242;">
                            ${expense.description}
                        </div>
                        <div style="margin-top: 2px;">
                            <span class="chip grey lighten-3 grey-text text-darken-2" style="height: 20px; line-height: 20px; padding: 0 8px; font-size: 0.7rem; margin: 2px;">
                                ${expense.category}
                            </span>
                            ${expense.subCategory ? `<span class="chip grey lighten-4 grey-text text-darken-1" style="height: 20px; line-height: 20px; padding: 0 8px; font-size: 0.7rem; margin: 2px;">${expense.subCategory}</span>` : ''}
                        </div>
                        <div style="font-size: 0.75rem; color: #757575; margin-top: 2px;">
                            <i class="material-icons" style="font-size: 12px; vertical-align: middle;">event</i> ${formatDate(expense.date)}
                            ${paidBy ? `<span class="grey-text" style="margin-left: 5px;">${paidBy}</span>` : ''}
                        </div>
                    </div>
                    <div class="col s5 right-align">
                        <div style="font-weight: 500; font-size: 1.1rem; color: #424242;">${formatCurrency(totalCost)}</div>
                        ${remaining > 0 ? `<div style="font-size: 0.7rem; color: #757575; margin-top: 2px;">
                            Paid: ${formatCurrency(totalPaid)}<br>
                            Rem: <span class="orange-text text-darken-2">${formatCurrency(remaining)}</span>
                        </div>` : ''}
                        <div style="margin-top: 3px;">
                            ${expense.fullyPaid ? '<span class="chip grey lighten-3 grey-text text-darken-3" style="height: 18px; line-height: 18px; padding: 0 6px; font-size: 0.65rem;"><i class="material-icons" style="font-size: 11px;">check</i> Paid</span>' : '<span class="chip blue-grey lighten-4 blue-grey-text text-darken-2" style="height: 18px; line-height: 18px; padding: 0 6px; font-size: 0.65rem;"><i class="material-icons" style="font-size: 11px;">schedule</i> Pending</span>'}
                        </div>
                    </div>
                </div>
                <div class="row" style="margin: 5px 0 0 0;">
                    <div class="col s12" style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            ${!expense.fullyPaid ? `<a href="#" onclick="openPaymentModal('${expense.id}'); return false;" class="btn-small waves-effect waves-light blue-grey lighten-1" style="margin: 0; padding: 0 8px; height: 28px; line-height: 28px;"><i class="material-icons left" style="font-size: 0.9rem; margin-right: 3px;">payment</i><span style="font-size: 0.75rem;">Pay</span></a>` : ''}
                            ${payments.length === 1 && expense.fullyPaid ? `<a href="#" onclick="editPayment('${expense.id}', 0); return false;" class="btn-small waves-effect waves-light blue-grey lighten-1" style="margin: 0 0 0 3px; padding: 0 8px; height: 28px; line-height: 28px;"><i class="material-icons left" style="font-size: 0.9rem; margin-right: 3px;">edit</i><span style="font-size: 0.75rem;">Edit</span></a>` : ''}
                            ${payments.length > 1 || (payments.length === 1 && !expense.fullyPaid) ? `<a href="#" onclick="togglePaymentHistory('${expense.id}'); return false;" class="btn-small waves-effect waves-light grey lighten-1 grey-text text-darken-2" style="margin: 0 0 0 3px; padding: 0 8px; height: 28px; line-height: 28px;"><i class="material-icons left" style="font-size: 0.9rem; margin-right: 3px;">history</i><span style="font-size: 0.75rem;">${payments.length}</span></a>` : ''}
                        </div>
                        <a href="#" onclick="deleteExpense('${expense.id}'); return false;" class="btn-small waves-effect waves-light grey lighten-2 grey-text text-darken-2" style="margin: 0; padding: 0 8px; height: 28px; line-height: 28px;">
                            <i class="material-icons" style="font-size: 0.9rem;">delete</i>
                        </a>
                    </div>
                </div>
                <div id="payment-history-${expense.id}" style="display: none; margin-top: 8px; padding: 8px; background: #fafafa; border-radius: 4px;">
                    <div style="font-weight: 500; font-size: 0.85rem; color: #424242; margin-bottom: 5px;">Payment History</div>
                    ${payments.map((p, index) => `
                        <div style="padding: 5px; border-bottom: 1px solid #e0e0e0; display: flex; justify-content: space-between; align-items: center; font-size: 0.8rem;">
                            <div style="flex: 1;">
                                <strong>${formatDate(p.date)}</strong> • ${formatCurrency(p.amount)} • ${p.paidBy}
                                ${p.notes ? `<div style="font-style: italic; color: #757575; font-size: 0.75rem; margin-top: 2px;">${p.notes}</div>` : ''}
                            </div>
                            <div style="display: flex; gap: 3px;">
                                <a href="#" onclick="editPayment('${expense.id}', ${index}); return false;" class="btn-small waves-effect waves-light blue-grey lighten-1" style="padding: 0 6px; height: 26px; line-height: 26px;">
                                    <i class="material-icons" style="font-size: 0.85rem;">edit</i>
                                </a>
                                <a href="#" onclick="deletePayment('${expense.id}', ${index}); return false;" class="btn-small waves-effect waves-light grey lighten-2 grey-text text-darken-2" style="padding: 0 6px; height: 26px; line-height: 26px;">
                                    <i class="material-icons" style="font-size: 0.85rem;">delete</i>
                                </a>
                            </div>
                        </div>
                    `).join('')}
                </div>
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
            
            // Reset submit button text and icon
            const submitBtn = expenseForm.querySelector('button[type="submit"]');
            submitBtn.innerHTML = '<i class="material-icons left">add</i>Add Expense';
            
            // Reinitialize Material UI components
            M.FormSelect.init(document.querySelectorAll('select'));
            M.updateTextFields();
            
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
    showInfo('Expense Editing Disabled', 'Note: Expense editing is currently disabled with the new payment history system.\n\nTo modify payments:\n- Use the 💰 button to add new payments\n- Delete and recreate the expense if needed');
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
    submitBtn.innerHTML = '<i class="material-icons left">add</i>Add Expense';
    
    // Update Material UI labels
    M.updateTextFields();
    M.FormSelect.init(document.querySelectorAll('select'));
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
    const modalElem = document.getElementById('paymentModal');
    const modal = M.Modal.getInstance(modalElem);
    
    // Fetch fresh expense data from API
    try {
        const response = await fetch(`${API_URL}/expenses/${expenseId}`);
        if (!response.ok) {
            showNotification('Failed to load expense data', 'error');
            return;
        }
        const expense = await response.json();
        
        // Store the expense ID and payment index on the modal
        modalElem.dataset.expenseId = expenseId;
        modalElem.dataset.paymentIndex = paymentIndex !== null ? paymentIndex : '';
        
        // Calculate total paid from payments array
        const payments = expense.payments || [];
        const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
        
        // Populate expense details
        const remaining = (expense.remainingBalance || 0);
        document.getElementById('paymentExpenseDetails').innerHTML = `
            <strong>${expense.description}</strong><br>
            Category: ${expense.category}${expense.subCategory ? ' > ' + expense.subCategory : ''}<br>
            Total Cost: ${formatCurrency(expense.totalCost)}
            ${remaining > 0 ? `<br>Paid: ${formatCurrency(totalPaid)}<br>Remaining: ${formatCurrency(remaining)}` : ''}
        `;
        
        // Update modal title
        document.getElementById('paymentModalTitle').innerHTML = paymentIndex !== null ? '<i class="material-icons">edit</i> Edit Payment' : '<i class="material-icons">payment</i> Add Payment';
        
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
        
        // Reinitialize form select and update labels
        M.FormSelect.init(document.querySelectorAll('#paymentModal select'));
        M.updateTextFields();
        const notesTextarea = document.getElementById('paymentNotes');
        if (notesTextarea) {
            M.textareaAutoResize(notesTextarea);
        }
        
        // Show modal
        modal.open();
    } catch (error) {
        console.error('Error opening payment modal:', error);
        showNotification('Failed to open payment modal', 'error');
    }
}

// Close payment modal
function closePaymentModal() {
    const modalElem = document.getElementById('paymentModal');
    const modal = M.Modal.getInstance(modalElem);
    modal.close();
    modalElem.dataset.expenseId = '';
    modalElem.dataset.paymentIndex = '';
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
            await loadExpenses(); // Reload all expenses to get updated totalCost
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
    showConfirm(
        'Delete Payment',
        'Are you sure you want to delete this payment?',
        async () => {
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
    );
}

async function deleteExpense(id) {
    showConfirm(
        'Delete Expense',
        'Are you sure you want to delete this expense?',
        async () => {
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
    );
}

// Handle pending filter checkbox
function handlePendingFilter() {
    const isPendingChecked = document.getElementById('filterPendingOnly').checked;
    
    if (isPendingChecked) {
        // Only clear search filter when pending is checked
        filterCategory.value = '';
        // Keep the dropdown filter intact so it can be used with pending filter
    }
    
    filterExpenses();
}

// Filter expenses
function filterExpenses() {
    const keyword = filterCategory.value;
    const paidBy = document.getElementById('filterPaidBy').value;
    const pendingOnly = document.getElementById('filterPendingOnly').checked;
    loadExpenses(keyword, paidBy, pendingOnly);
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
    // Use Materialize toast
    const color = type === 'success' ? 'green' : 'red';
    M.toast({
        html: message,
        classes: color,
        displayLength: 3000
    });
}

// Confirmation modal helper
let confirmCallback = null;

function showConfirm(title, message, onConfirm, btnText = 'Delete', btnClass = 'red') {
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmMessage').textContent = message;
    const confirmBtn = document.getElementById('confirmActionBtn');
    confirmBtn.textContent = btnText;
    confirmBtn.className = `modal-close waves-effect waves-${btnClass} btn ${btnClass}`;
    confirmCallback = onConfirm;
    const modal = M.Modal.getInstance(document.getElementById('confirmModal'));
    modal.open();
}

function executeConfirmAction() {
    if (confirmCallback) {
        confirmCallback();
        confirmCallback = null;
    }
}

// Info modal helper
function showInfo(title, message) {
    document.getElementById('infoTitle').textContent = title;
    document.getElementById('infoMessage').textContent = message;
    const modal = M.Modal.getInstance(document.getElementById('infoModal'));
    modal.open();
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
let topExpensesChartInstance;
let paymentStatusChartInstance;

function initializeCharts() {
    const categoryCtx = document.getElementById('categoryChart').getContext('2d');
    const topExpensesCtx = document.getElementById('topExpensesChart').getContext('2d');
    const paymentStatusCtx = document.getElementById('paymentStatusChart').getContext('2d');
    
    // Colorful palette for wedding theme
    const colorPalette = [
        '#FF6B9D', // Pink
        '#C44569', // Deep Rose
        '#A8E6CF', // Mint Green
        '#FFD93D', // Golden Yellow
        '#6BCF7F', // Fresh Green
        '#95E1D3', // Turquoise
        '#F38181', // Coral
        '#AA96DA', // Lavender
        '#FCBAD3', // Light Pink
        '#FEC8D8', // Blush
        '#957DAD', // Purple
        '#D4A5A5', // Dusty Rose
        '#FFAAA5', // Peach
        '#90CCF4', // Sky Blue
        '#FF8A5B'  // Orange
    ];
    
    // 1. Doughnut Chart - Category-wise Spending
    categoryChartInstance = new Chart(categoryCtx, {
        type: 'doughnut',
        data: {
            labels: [],
            datasets: [{
                label: 'Spending',
                data: [],
                backgroundColor: colorPalette,
                borderColor: '#ffffff',
                borderWidth: 2,
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.parsed || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `₹${value.toLocaleString('en-IN')} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
    
    // 2. Horizontal Bar Chart - Top 10 Expenses
    topExpensesChartInstance = new Chart(topExpensesCtx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'Amount',
                data: [],
                backgroundColor: colorPalette,
                borderColor: colorPalette.map(c => c),
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
                            return `₹${context.parsed.x.toLocaleString('en-IN')}`;
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
                        }
                    }
                }
            }
        }
    });
    
    // 3. Stacked Bar Chart - Payment Status by Category
    paymentStatusChartInstance = new Chart(paymentStatusCtx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Paid',
                    data: [],
                    backgroundColor: '#6BCF7F',
                    borderWidth: 1
                },
                {
                    label: 'Unpaid',
                    data: [],
                    backgroundColor: '#F38181',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ₹${context.parsed.y.toLocaleString('en-IN')}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    stacked: true
                },
                y: {
                    stacked: true,
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '₹' + (value/1000).toFixed(0) + 'k';
                        }
                    }
                }
            }
        }
    });
    
    updateCharts();
}

// Update Charts with current data
let allCategoryData = {}; // Store all category data
let previousSelections = []; // Track previous dropdown selections

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
        
        // Store all category data globally
        allCategoryData = categoryData;
        
        // Sort by amount (highest to lowest)
        const sortedEntries = Object.entries(categoryData).sort((a, b) => b[1] - a[1]);
        
        // Update the category filter dropdown
        const filterDropdown = document.getElementById('categoryChartFilter');
        if (filterDropdown) {
            // Store current selections
            const currentSelections = Array.from(filterDropdown.selectedOptions).map(opt => opt.value);
            
            // Clear and repopulate options with "Show All" at top
            filterDropdown.innerHTML = `<option value="SHOW_ALL">Show All</option>` +
                sortedEntries.map(([label]) => 
                    `<option value="${label}">${label}</option>`
                ).join('');
            
            // Restore previous selections if any
            if (currentSelections.length > 0) {
                Array.from(filterDropdown.options).forEach(opt => {
                    if (currentSelections.includes(opt.value)) {
                        opt.selected = true;
                    }
                });
            }
            // Note: By default, nothing is selected
            
            // Re-initialize Material select
            M.FormSelect.init(filterDropdown);
            
            // Add change event listener
            filterDropdown.removeEventListener('change', handleCategoryFilterChange);
            filterDropdown.addEventListener('change', handleCategoryFilterChange);
        }
        
        updateCategoryChart();
        
        // Update Top 10 Expenses Chart
        const sortedExpensesByAmount = [...expenses]
            .sort((a, b) => (b.totalCost || 0) - (a.totalCost || 0))
            .slice(0, 10);
        
        topExpensesChartInstance.data.labels = sortedExpensesByAmount.map(e => 
            e.description.length > 20 ? e.description.substring(0, 20) + '...' : e.description
        );
        topExpensesChartInstance.data.datasets[0].data = sortedExpensesByAmount.map(e => e.totalCost || 0);
        topExpensesChartInstance.update();
        
        // Update Payment Status Chart
        const paymentStatusData = {};
        expenses.forEach(expense => {
            const category = expense.category;
            if (!paymentStatusData[category]) {
                paymentStatusData[category] = { paid: 0, unpaid: 0 };
            }
            
            const totalCost = expense.totalCost || 0;
            const totalPaid = expense.payments ? expense.payments.reduce((sum, p) => sum + (p.amount || 0), 0) : 0;
            const unpaid = Math.max(0, totalCost - totalPaid);
            
            paymentStatusData[category].paid += totalPaid;
            paymentStatusData[category].unpaid += unpaid;
        });
        
        const paymentCategories = Object.keys(paymentStatusData).sort();
        paymentStatusChartInstance.data.labels = paymentCategories;
        paymentStatusChartInstance.data.datasets[0].data = paymentCategories.map(c => paymentStatusData[c].paid);
        paymentStatusChartInstance.data.datasets[1].data = paymentCategories.map(c => paymentStatusData[c].unpaid);
        paymentStatusChartInstance.update();
        
    } catch (error) {
        console.error('Error updating charts:', error);
    }
}

function handleCategoryFilterChange() {
    const filterDropdown = document.getElementById('categoryChartFilter');
    const selectedValues = Array.from(filterDropdown.selectedOptions).map(opt => opt.value);
    
    // If both "Show All" and categories are selected, determine which was just clicked
    if (selectedValues.includes('SHOW_ALL') && selectedValues.length > 1) {
        const showAllWasPreviouslySelected = previousSelections.includes('SHOW_ALL');
        
        if (showAllWasPreviouslySelected) {
            // "Show All" was already checked, user just clicked a category - uncheck "Show All"
            filterDropdown.querySelector('option[value="SHOW_ALL"]').selected = false;
        } else {
            // User just clicked "Show All" - uncheck everything else
            Array.from(filterDropdown.options).forEach(opt => {
                opt.selected = opt.value === 'SHOW_ALL';
            });
        }
        M.FormSelect.init(filterDropdown);
    }
    
    // Update previous selections for next time
    previousSelections = Array.from(filterDropdown.selectedOptions).map(opt => opt.value);
    
    updateCategoryChart();
}

function updateCategoryChart() {
    const filterDropdown = document.getElementById('categoryChartFilter');
    if (!filterDropdown) return;
    
    const selectedValues = Array.from(filterDropdown.selectedOptions).map(opt => opt.value);
    
    // Filter out "SHOW_ALL" from categories
    const selectedCategories = selectedValues.filter(v => v !== 'SHOW_ALL');
    
    // If nothing selected or "Show All" is selected, show all
    if (selectedValues.length === 0 || selectedValues.includes('SHOW_ALL')) {
        const sortedEntries = Object.entries(allCategoryData).sort((a, b) => b[1] - a[1]);
        categoryChartInstance.data.labels = sortedEntries.map(e => e[0]);
        categoryChartInstance.data.datasets[0].data = sortedEntries.map(e => e[1]);
        categoryChartInstance.update();
        return;
    }
    
    // Filter data based on selected categories
    const filteredData = {};
    selectedCategories.forEach(cat => {
        if (allCategoryData[cat]) {
            filteredData[cat] = allCategoryData[cat];
        }
    });
    
    const sortedEntries = Object.entries(filteredData).sort((a, b) => b[1] - a[1]);
    categoryChartInstance.data.labels = sortedEntries.map(e => e[0]);
    categoryChartInstance.data.datasets[0].data = sortedEntries.map(e => e[1]);
    categoryChartInstance.update();
}