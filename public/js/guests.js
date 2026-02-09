const API_URL = '/api';

let currentEditId = null;

// DOM Elements
const guestForm = document.getElementById('guestForm');
const cancelGuestEditBtn = document.getElementById('cancelGuestEditBtn');
const guestsList = document.getElementById('guestsList');

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    loadGuests();
    setupEventListeners();
});

// Collapsible section functionality
function toggleSection(header) {
    const content = header.nextElementSibling;
    header.classList.toggle('collapsed');
    content.classList.toggle('collapsed');
}

// Setup event listeners
function setupEventListeners() {
    guestForm.addEventListener('submit', handleFormSubmit);
    cancelGuestEditBtn.addEventListener('click', cancelEdit);
}

// Load guests
async function loadGuests() {
    try {
        const response = await fetch(`${API_URL}/guests`);
        const guests = await response.json();
        
        displayGuests(guests);
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
        <div class="expense-item" style="margin-bottom: 8px; padding: 10px;">
            <div style="display: grid; grid-template-columns: 1fr 1fr auto; gap: 10px; align-items: center;">
                <div style="font-size: 0.9rem; font-weight: 600; color: var(--text-dark);">
                    ${guest.name}
                </div>
                <div style="font-size: 0.85rem; color: var(--secondary-color);">
                    ${guest.room || '-'}
                </div>
                <div class="expense-actions" style="display: flex; gap: 5px;">
                    <button class="btn btn-icon btn-edit" onclick="editGuest('${guest.id}')" title="Edit" style="padding: 6px 10px; font-size: 1rem;">✏️</button>
                    <button class="btn btn-icon btn-danger" onclick="deleteGuest('${guest.id}')" title="Delete" style="padding: 6px 10px; font-size: 1rem;">🗑️</button>
                </div>
            </div>
        </div>
    `).join('');
}

// Handle form submission
async function handleFormSubmit(e) {
    e.preventDefault();
    
    const guest = {
        name: document.getElementById('guestName').value,
        room: document.getElementById('roomStay').value || ''
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
        document.getElementById('roomStay').value = guest.room || '';
        
        currentEditId = id;
        cancelGuestEditBtn.style.display = 'inline-block';
        
        // Change submit button text
        const submitBtn = guestForm.querySelector('button[type="submit"]');
        submitBtn.textContent = 'Update Guest';
        
        // Scroll to form
        guestForm.scrollIntoView({ behavior: 'smooth' });
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
