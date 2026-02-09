const API_URL = 'http://localhost:3000/api';

let currentEditId = null;
let allGuests = [];

// Wedding dates configuration - you can modify these
const WEDDING_DATES = [
    '2025-03-10',
    '2025-03-11',
    '2025-03-12',
    '2025-03-13',
    '2025-03-14',
    '2025-03-15'
];

const MEALS = ['breakfast', 'lunch', 'dinner'];

// DOM Elements
const guestForm = document.getElementById('guestForm');
const cancelEditBtn = document.getElementById('cancelEditBtn');
const guestList = document.getElementById('guestList');
const searchGuest = document.getElementById('searchGuest');
const filterDate = document.getElementById('filterDate');
const filterMeal = document.getElementById('filterMeal');
const dateAvailabilityContainer = document.getElementById('dateAvailabilityContainer');

// Summary elements
const totalGuestsEl = document.getElementById('totalGuests');
const receptionCountEl = document.getElementById('receptionCount');
const peakDayGuestsEl = document.getElementById('peakDayGuests');
const peakDayEl = document.getElementById('peakDay');
const mealSummaryBody = document.getElementById('mealSummaryBody');

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    initializePage();
    loadGuests();
    setupEventListeners();
});

// Initialize page elements
function initializePage() {
    // Populate date filter
    WEDDING_DATES.forEach(date => {
        const option = document.createElement('option');
        option.value = date;
        option.textContent = formatDate(date);
        filterDate.appendChild(option);
    });

    // Create date availability form fields
    renderDateAvailabilityForm();
}

// Render date availability checkboxes in form
function renderDateAvailabilityForm() {
    dateAvailabilityContainer.innerHTML = WEDDING_DATES.map(date => `
        <div class="date-card">
            <div class="date-header">
                📅 ${formatDate(date)}
            </div>
            <div class="meal-checkboxes">
                <div class="meal-checkbox">
                    <input type="checkbox" id="date-${date}-breakfast" name="availability" data-date="${date}" data-meal="breakfast">
                    <label for="date-${date}-breakfast">🌅 Breakfast</label>
                </div>
                <div class="meal-checkbox">
                    <input type="checkbox" id="date-${date}-lunch" name="availability" data-date="${date}" data-meal="lunch">
                    <label for="date-${date}-lunch">🍽️ Lunch</label>
                </div>
                <div class="meal-checkbox">
                    <input type="checkbox" id="date-${date}-dinner" name="availability" data-date="${date}" data-meal="dinner">
                    <label for="date-${date}-dinner">🌙 Dinner</label>
                </div>
            </div>
        </div>
    `).join('');
}

// Collapsible section functionality
function toggleSection(header) {
    const content = header.nextElementSibling;
    header.classList.toggle('collapsed');
    content.classList.toggle('collapsed');
}

// Setup event listeners
function setupEventListeners() {
    guestForm.addEventListener('submit', handleFormSubmit);
    cancelEditBtn.addEventListener('click', cancelEdit);
    searchGuest.addEventListener('input', filterGuests);
    filterDate.addEventListener('change', filterGuests);
    filterMeal.addEventListener('change', filterGuests);
}

// Load guests
async function loadGuests() {
    try {
        const response = await fetch(`${API_URL}/guests`);
        allGuests = await response.json();
        
        displayGuests(allGuests);
        updateSummary();
        updateMealSummary();
    } catch (error) {
        console.error('Error loading guests:', error);
        showNotification('Failed to load guests', 'error');
    }
}

// Display guests
function displayGuests(guests) {
    if (guests.length === 0) {
        guestList.innerHTML = `
            <div class="empty-state">
                <h3>👥 No guests yet</h3>
                <p>Start adding your wedding guests to track meal availability!</p>
            </div>
        `;
        return;
    }

    guestList.innerHTML = guests.map(guest => {
        const availability = guest.availability || {};
        const hasAvailability = Object.keys(availability).length > 0;

        return `
            <div class="guest-item">
                <div class="guest-header">
                    <div>
                        <div class="guest-name">${guest.name}</div>
                        ${guest.notes ? `<div class="guest-notes">📝 ${guest.notes}</div>` : ''}
                    </div>
                    <div style="display: flex; gap: 10px; align-items: center;">
                        <span class="guest-count-badge">${guest.count} ${guest.count === 1 ? 'Person' : 'People'}</span>
                        ${guest.receptionCount > 0 ? `<span class="guest-count-badge" style="background: var(--secondary-color);">Reception: ${guest.receptionCount}</span>` : ''}
                    </div>
                </div>

                ${hasAvailability ? `
                    <div class="guest-availability">
                        <div class="availability-title">🍽️ Meal Availability:</div>
                        <div class="availability-grid">
                            ${Object.keys(availability).map(date => {
                                const meals = availability[date];
                                if (meals.length === 0) return '';
                                return `
                                    <div class="availability-item">
                                        <div class="availability-date">${formatDate(date)}</div>
                                        <div class="availability-meals">${meals.map(m => getMealIcon(m)).join(' ')}</div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                ` : ''}

                <div class="guest-actions">
                    <button class="btn btn-edit" onclick="editGuest('${guest.id}')">Edit</button>
                    <button class="btn btn-danger" onclick="deleteGuest('${guest.id}')">Delete</button>
                </div>
            </div>
        `;
    }).join('');
}

// Filter guests
function filterGuests() {
    const searchTerm = searchGuest.value.toLowerCase();
    const selectedDate = filterDate.value;
    const selectedMeal = filterMeal.value;

    let filtered = allGuests.filter(guest => {
        // Search filter
        if (searchTerm && !guest.name.toLowerCase().includes(searchTerm)) {
            return false;
        }

        // Date and meal filter
        if (selectedDate && selectedMeal) {
            const availability = guest.availability || {};
            const meals = availability[selectedDate] || [];
            return meals.includes(selectedMeal);
        } else if (selectedDate) {
            const availability = guest.availability || {};
            return availability[selectedDate] && availability[selectedDate].length > 0;
        }

        return true;
    });

    displayGuests(filtered);
}

// Update summary statistics
function updateSummary() {
    const totalCount = allGuests.reduce((sum, g) => sum + g.count, 0);
    const totalReception = allGuests.reduce((sum, g) => sum + (g.receptionCount || 0), 0);

    // Find peak day
    const dayCounts = {};
    WEDDING_DATES.forEach(date => {
        dayCounts[date] = 0;
    });

    allGuests.forEach(guest => {
        const availability = guest.availability || {};
        Object.keys(availability).forEach(date => {
            if (availability[date].length > 0) {
                dayCounts[date] += guest.count;
            }
        });
    });

    let peakDay = '';
    let peakCount = 0;
    Object.keys(dayCounts).forEach(date => {
        if (dayCounts[date] > peakCount) {
            peakCount = dayCounts[date];
            peakDay = date;
        }
    });

    totalGuestsEl.textContent = totalCount;
    receptionCountEl.textContent = totalReception;
    peakDayGuestsEl.textContent = peakCount;
    peakDayEl.textContent = peakDay ? `on ${formatDate(peakDay)}` : '';
}

// Update meal summary table
function updateMealSummary() {
    const summary = {};

    WEDDING_DATES.forEach(date => {
        summary[date] = {
            breakfast: 0,
            lunch: 0,
            dinner: 0
        };
    });

    allGuests.forEach(guest => {
        const availability = guest.availability || {};
        Object.keys(availability).forEach(date => {
            const meals = availability[date];
            meals.forEach(meal => {
                if (summary[date]) {
                    summary[date][meal] += guest.count;
                }
            });
        });
    });

    let html = '';
    WEDDING_DATES.forEach(date => {
        const data = summary[date];
        const total = data.breakfast + data.lunch + data.dinner;
        html += `
            <tr>
                <td style="font-weight: 600; text-align: left;">${formatDate(date)}</td>
                <td>${data.breakfast}</td>
                <td>${data.lunch}</td>
                <td>${data.dinner}</td>
                <td style="font-weight: 600;">${total}</td>
            </tr>
        `;
    });

    // Add totals row
    const totals = WEDDING_DATES.reduce((acc, date) => {
        acc.breakfast += summary[date].breakfast;
        acc.lunch += summary[date].lunch;
        acc.dinner += summary[date].dinner;
        return acc;
    }, { breakfast: 0, lunch: 0, dinner: 0 });

    html += `
        <tr>
            <td style="font-weight: bold; text-align: left;">TOTAL</td>
            <td style="font-weight: bold;">${totals.breakfast}</td>
            <td style="font-weight: bold;">${totals.lunch}</td>
            <td style="font-weight: bold;">${totals.dinner}</td>
            <td style="font-weight: bold;">${totals.breakfast + totals.lunch + totals.dinner}</td>
        </tr>
    `;

    mealSummaryBody.innerHTML = html;
}

// Handle form submission
async function handleFormSubmit(e) {
    e.preventDefault();

    // Gather availability data
    const availability = {};
    const checkboxes = document.querySelectorAll('input[name="availability"]:checked');
    
    checkboxes.forEach(cb => {
        const date = cb.dataset.date;
        const meal = cb.dataset.meal;
        
        if (!availability[date]) {
            availability[date] = [];
        }
        availability[date].push(meal);
    });

    const guest = {
        name: document.getElementById('guestName').value,
        count: parseInt(document.getElementById('guestCount').value) || 1,
        receptionCount: parseInt(document.getElementById('receptionGuestCount').value) || 0,
        notes: document.getElementById('guestNotes').value,
        availability: availability
    };

    try {
        let response;
        if (currentEditId) {
            // Update existing guest
            response = await fetch(`${API_URL}/guests/${currentEditId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(guest)
            });
            showNotification('Guest updated successfully!', 'success');
        } else {
            // Create new guest
            response = await fetch(`${API_URL}/guests`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(guest)
            });
            showNotification('Guest added successfully!', 'success');
        }

        if (response.ok) {
            guestForm.reset();
            currentEditId = null;
            cancelEditBtn.style.display = 'none';
            await loadGuests();
            
            // Collapse the form section
            const addSection = document.querySelector('.collapsible-section.collapsed');
            if (addSection) {
                const header = addSection.querySelector('.section-header');
                toggleSection(header);
            }
        }
    } catch (error) {
        console.error('Error saving guest:', error);
        showNotification('Failed to save guest', 'error');
    }
}

// Edit guest
async function editGuest(id) {
    try {
        const guest = allGuests.find(g => g.id === id);
        if (!guest) return;

        document.getElementById('guestName').value = guest.name;
        document.getElementById('guestCount').value = guest.count;
        document.getElementById('receptionGuestCount').value = guest.receptionCount || 0;
        document.getElementById('guestNotes').value = guest.notes || '';

        // Clear all checkboxes first
        document.querySelectorAll('input[name="availability"]').forEach(cb => cb.checked = false);

        // Set availability checkboxes
        const availability = guest.availability || {};
        Object.keys(availability).forEach(date => {
            const meals = availability[date];
            meals.forEach(meal => {
                const checkbox = document.getElementById(`date-${date}-${meal}`);
                if (checkbox) {
                    checkbox.checked = true;
                }
            });
        });

        currentEditId = id;
        cancelEditBtn.style.display = 'inline-block';
        document.getElementById('submitBtn').textContent = 'Update Guest';

        // Expand the form section and scroll to it
        const addSection = document.querySelectorAll('.collapsible-section')[1]; // Second section is Add Guest
        const header = addSection.querySelector('.section-header');
        if (header.classList.contains('collapsed')) {
            toggleSection(header);
        }
        addSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (error) {
        console.error('Error loading guest for edit:', error);
        showNotification('Failed to load guest', 'error');
    }
}

// Cancel edit
function cancelEdit() {
    guestForm.reset();
    currentEditId = null;
    cancelEditBtn.style.display = 'none';
    document.getElementById('submitBtn').textContent = 'Add Guest';
    
    // Clear all checkboxes
    document.querySelectorAll('input[name="availability"]').forEach(cb => cb.checked = false);
}

// Delete guest
async function deleteGuest(id) {
    if (!confirm('Are you sure you want to delete this guest?')) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/guests/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            showNotification('Guest deleted successfully!', 'success');
            await loadGuests();
        }
    } catch (error) {
        console.error('Error deleting guest:', error);
        showNotification('Failed to delete guest', 'error');
    }
}

// Utility functions
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
    });
}

function getMealIcon(meal) {
    const icons = {
        breakfast: '🌅',
        lunch: '🍽️',
        dinner: '🌙'
    };
    return icons[meal] || meal;
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
        if (filterSideVal) {
            guests = guests.filter(g => g.side === filterSideVal);
        }
        
        displayGuests(guests);
        updateStatistics(data);
    } catch (error) {
        console.error('Error loading guests:', error);
        displayGuests([]);
    }
}

// Display guests
function displayGuests(guests) {
    if (guests.length === 0) {
        guestsList.innerHTML = `
            <div class="empty-state">
                <h3>👥 No guests yet</h3>
                <p>Start adding your wedding guests!</p>
            </div>
        `;
        return;
    }
    
    // Sort by name
    guests.sort((a, b) => a.name.localeCompare(b.name));
    
    guestsList.innerHTML = guests.map(guest => `
        <div class="expense-item">
            <div class="expense-info">
                <div class="expense-header">
                    <span class="expense-category">${guest.name}</span>
                    ${getStatusBadge(guest.inviteStatus)}
                </div>
                <div class="expense-details">
                    <div><strong>Side:</strong> ${guest.side}</div>
                    <div><strong>Category:</strong> ${guest.category || 'N/A'}</div>
                    <div><strong>Guests:</strong> ${guest.numberOfGuests}</div>
                    ${guest.contactNumber ? `<div><strong>Contact:</strong> ${guest.contactNumber}</div>` : ''}
                    ${guest.notes ? `<div><strong>Notes:</strong> ${guest.notes}</div>` : ''}
                </div>
            </div>
            <div class="expense-actions">
                <button class="btn btn-icon btn-edit" onclick="editGuest('${guest.id}')" title="Edit">✏️</button>
                <button class="btn btn-icon btn-danger" onclick="deleteGuest('${guest.id}')" title="Delete">🗑️</button>
            </div>
        </div>
    `).join('');
}

// Get status badge
function getStatusBadge(status) {
    const badges = {
        'Confirmed': '<span class="paid-badge">✓ Confirmed</span>',
        'Declined': '<span class="unpaid-badge">✗ Declined</span>',
        'Sent': '<span style="background: #f2cc8f; color: #3d405b; padding: 4px 12px; border-radius: 20px; font-size: 0.85rem; font-weight: 600;">📨 Sent</span>',
        'Not Sent': '<span style="background: #e8e8e8; color: #3d405b; padding: 4px 12px; border-radius: 20px; font-size: 0.85rem; font-weight: 600;">⏳ Not Sent</span>'
    };
    return badges[status] || '';
}

// Update statistics
function updateStatistics(guests) {
    const total = guests.length;
    const confirmed = guests.filter(g => g.inviteStatus === 'Confirmed').reduce((sum, g) => sum + g.numberOfGuests, 0);
    const declined = guests.filter(g => g.inviteStatus === 'Declined').length;
    const pending = guests.filter(g => g.inviteStatus === 'Sent' || g.inviteStatus === 'Not Sent').length;
    
    totalInvitedEl.textContent = total;
    totalConfirmedEl.textContent = confirmed;
    totalDeclinedEl.textContent = declined;
    totalPendingEl.textContent = pending;
}

// Handle form submission
async function handleFormSubmit(e) {
    e.preventDefault();
    
    const guest = {
        name: document.getElementById('guestName').value,
        side: document.getElementById('guestSide').value,
        category: document.getElementById('guestCategory').value,
        inviteStatus: document.getElementById('inviteStatus').value,
        numberOfGuests: parseInt(document.getElementById('numberOfGuests').value) || 1,
        contactNumber: document.getElementById('contactNumber').value,
        notes: document.getElementById('notes').value
    };
    
    try {
        let response;
        if (currentEditId) {
            // Update existing guest
            response = await fetch(`${API_URL}/guests/${currentEditId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(guest)
            });
            showNotification('Guest updated successfully!', 'success');
        } else {
            // Create new guest
            response = await fetch(`${API_URL}/guests`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(guest)
            });
            showNotification('Guest added successfully!', 'success');
        }
        
        if (response.ok) {
            guestForm.reset();
            currentEditId = null;
            cancelGuestEditBtn.style.display = 'none';
            
            // Reset submit button text
            const submitBtn = guestForm.querySelector('button[type="submit"]');
            submitBtn.textContent = 'Add Guest';
            
            await loadGuests();
        }
    } catch (error) {
        console.error('Error saving guest:', error);
        showNotification('Failed to save guest', 'error');
    }
}

// Edit guest
async function editGuest(id) {
    try {
        const response = await fetch(`${API_URL}/guests/${id}`);
        const guest = await response.json();
        
        document.getElementById('guestName').value = guest.name;
        document.getElementById('guestSide').value = guest.side;
        document.getElementById('guestCategory').value = guest.category || '';
        document.getElementById('inviteStatus').value = guest.inviteStatus;
        document.getElementById('numberOfGuests').value = guest.numberOfGuests;
        document.getElementById('contactNumber').value = guest.contactNumber || '';
        document.getElementById('notes').value = guest.notes || '';
        
        currentEditId = id;
        cancelGuestEditBtn.style.display = 'inline-block';
        
        // Change submit button text
        const submitBtn = guestForm.querySelector('button[type="submit"]');
        submitBtn.textContent = 'Update Guest';
        
        // Expand the Add Guest section if collapsed
        const addGuestSection = document.querySelector('.collapsible-section:nth-child(1)');
        const sectionHeader = addGuestSection.querySelector('.section-header');
        const sectionContent = addGuestSection.querySelector('.section-content');
        if (sectionContent.classList.contains('collapsed')) {
            sectionHeader.classList.remove('collapsed');
            sectionContent.classList.remove('collapsed');
        }
        
        // Scroll to form
        addGuestSection.scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
        console.error('Error loading guest for edit:', error);
        showNotification('Failed to load guest', 'error');
    }
}

// Cancel edit
function cancelEdit() {
    guestForm.reset();
    currentEditId = null;
    cancelGuestEditBtn.style.display = 'none';
    
    // Reset submit button text
    const submitBtn = guestForm.querySelector('button[type="submit"]');
    submitBtn.textContent = 'Add Guest';
}

// Delete guest
async function deleteGuest(id) {
    if (!confirm('Are you sure you want to delete this guest?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/guests/${id}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            showNotification('Guest deleted successfully!', 'success');
            await loadGuests();
        }
    } catch (error) {
        console.error('Error deleting guest:', error);
        showNotification('Failed to delete guest', 'error');
    }
}

// Show notification
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
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
