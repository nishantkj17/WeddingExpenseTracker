const API_URL_GUESTS = '/api';

let currentGuestEditId = null;

// DOM Elements
const guestForm = document.getElementById('guestForm');
const cancelGuestEditBtn = document.getElementById('cancelGuestEditBtn');
const guestsList = document.getElementById('guestsList');
const searchGuest = document.getElementById('searchGuest');

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    // Initialize Materialize components
    initializeGuestMaterialize();
    loadGuestData();
    setupGuestEventListeners();
});

// Initialize Materialize components
function initializeGuestMaterialize() {
    // Initialize collapsibles
    var elems = document.querySelectorAll('.collapsible');
    M.Collapsible.init(elems, {
        accordion: false
    });
    
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
    
    // Update labels for pre-filled inputs
    M.updateTextFields();
}

// Collapsible section functionality (Materialize handles this)
function toggleSection(header) {
    // Material UI handles this automatically
}

// Setup event listeners
function setupGuestEventListeners() {
    guestForm.addEventListener('submit', handleGuestFormSubmit);
    cancelGuestEditBtn.addEventListener('click', cancelGuestEdit);
    searchGuest.addEventListener('input', handleGuestSearch);
}

// Handle search
function handleGuestSearch() {
    const searchTerm = searchGuest.value.toLowerCase();
    loadGuestData(searchTerm);
}

// Load guests
async function loadGuestData(searchTerm = '') {
    try {
        const response = await fetch(`${API_URL_GUESTS}/guests`);
        let guests = await response.json();
        
        // Filter by search term
        if (searchTerm) {
            guests = guests.filter(guest => 
                guest.name.toLowerCase().includes(searchTerm) ||
                (guest.room && guest.room.toLowerCase().includes(searchTerm))
            );
        }
        
        renderGuestList(guests);
    } catch (error) {
        console.error('Error loading guests:', error);
        renderGuestList([]);
    }
}

// Display guests
function renderGuestList(guests) {
    if (guests.length === 0) {
        guestsList.innerHTML = `
            <div class="card-panel center-align grey lighten-4">
                <i class="material-icons large grey-text text-darken-1">people</i>
                <h5>No guests yet</h5>
                <p>Start adding your wedding guests!</p>
            </div>
        `;
        return;
    }
    
    // Sort by name
    guests.sort((a, b) => a.name.localeCompare(b.name));
    
    guestsList.innerHTML = guests.map(guest => `
        <div class="card hoverable" style="margin-bottom: 8px;">
            <div class="card-content" style="padding: 8px;">
                <div class="row" style="margin-bottom: 3px;">
                    <div class="col s8">
                        <span style="font-weight: 500; font-size: 0.95rem;">
                            <i class="material-icons tiny grey-text text-darken-1">person</i>
                            ${guest.name}
                        </span>
                    </div>
                    <div class="col s4 right-align">
                        <span style="color: grey; font-size: 0.85rem;">
                            <i class="material-icons tiny">hotel</i>
                            ${guest.room || 'N/A'}
                        </span>
                    </div>
                </div>
                <div class="row" style="margin: 0;">
                    <div class="col s12" style="display: flex; justify-content: flex-end; gap: 5px;">
                        <a href="#" onclick="editGuest('${guest.id}'); return false;" class="btn-small waves-effect waves-light blue-grey darken-1" style="margin: 0; padding: 0 6px; height: 24px; line-height: 24px;">
                            <i class="material-icons left" style="font-size: 0.85rem; margin-right: 2px;">edit</i>
                            <span style="font-size: 0.7rem;">Edit</span>
                        </a>
                        <a href="#" onclick="deleteGuest('${guest.id}'); return false;" class="btn-small waves-effect waves-light grey lighten-2 grey-text text-darken-2" style="margin: 0; padding: 0 6px; height: 24px; line-height: 24px;">
                            <i class="material-icons" style="font-size: 0.85rem;">delete</i>
                        </a>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

// Handle form submission
async function handleGuestFormSubmit(e) {
    e.preventDefault();
    
    const guest = {
        name: document.getElementById('guestName').value,
        room: document.getElementById('roomStay').value || ''
    };
    
    try {
        let response;
        if (currentGuestEditId) {
            // Update existing guest
            response = await fetch(`${API_URL_GUESTS}/guests/${currentGuestEditId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(guest)
            });
            showGuestNotification('Guest updated successfully!', 'success');
        } else {
            // Create new guest
            response = await fetch(`${API_URL_GUESTS}/guests`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(guest)
            });
            showGuestNotification('Guest added successfully!', 'success');
        }
        
        if (response.ok) {
            guestForm.reset();
            currentGuestEditId = null;
            cancelGuestEditBtn.style.display = 'none';
            
            // Reset submit button text and icon
            const submitBtn = guestForm.querySelector('button[type="submit"]');
                submitBtn.innerHTML = '<i class="material-icons left">add</i>Add';
                const actionsRow = guestForm.querySelector('.guest-actions-row');
                if (actionsRow) actionsRow.classList.remove('editing');
            
            // Reinitialize Material UI components
            M.updateTextFields();
            
            await loadGuestData();
        }
    } catch (error) {
        console.error('Error saving guest:', error);
        showGuestNotification('Failed to save guest', 'error');
    }
}

// Edit guest
async function editGuest(id) {
    try {
        const response = await fetch(`${API_URL_GUESTS}/guests/${id}`);
        const guest = await response.json();
        
        document.getElementById('guestName').value = guest.name;
        document.getElementById('roomStay').value = guest.room || '';
        
        // Update Material UI labels
        M.updateTextFields();
        
        currentGuestEditId = id;
        cancelGuestEditBtn.style.display = 'inline-block';
        
        // Change submit button text
        const submitBtn = guestForm.querySelector('button[type="submit"]');
        submitBtn.innerHTML = '<i class="material-icons">save</i>';
            const actionsRow = guestForm.querySelector('.guest-actions-row');
            if (actionsRow) actionsRow.classList.add('editing');
        
        cancelGuestEditBtn.innerHTML = '<i class="material-icons">cancel</i>';
        
        // Scroll to form
        guestForm.scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
        console.error('Error loading guest for edit:', error);
        showGuestNotification('Failed to load guest', 'error');
    }
}

// Cancel edit
function cancelGuestEdit() {
    guestForm.reset();
    currentGuestEditId = null;
    cancelGuestEditBtn.style.display = 'none';
    
    // Reset submit button text
    const submitBtn = guestForm.querySelector('button[type="submit"]');
    submitBtn.innerHTML = '<i class="material-icons left">add</i>Add';
    const actionsRow = guestForm.querySelector('.guest-actions-row');
    if (actionsRow) actionsRow.classList.remove('editing');
    cancelGuestEditBtn.innerHTML = '<i class="material-icons left">cancel</i>Cancel';
    
    cancelGuestEditBtn.innerHTML = '<i class="material-icons left">cancel</i>Cancel';
    
    // Update Material UI labels
    M.updateTextFields();
}

// Show notification
function showGuestNotification(message, type = 'success') {
    // Use Materialize toast
    const color = type === 'success' ? 'green' : 'red';
    M.toast({
        html: message,
        classes: color,
        displayLength: 3000
    });
}

// Confirmation modal helper
let confirmGuestCallback = null;

function showGuestConfirm(title, message, onConfirm, btnText = 'Delete', btnClass = 'red') {
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmMessage').textContent = message;
    const confirmBtn = document.getElementById('confirmActionBtn');
    confirmBtn.textContent = btnText;
    confirmBtn.className = `modal-close waves-effect waves-${btnClass} btn ${btnClass}`;
    confirmBtn.onclick = executeGuestConfirmAction;
    confirmGuestCallback = onConfirm;
    const modal = M.Modal.getInstance(document.getElementById('confirmModal'));
    modal.open();
}

function executeGuestConfirmAction() {
    if (confirmGuestCallback) {
        confirmGuestCallback();
        confirmGuestCallback = null;
    }
}

// Delete guest
async function deleteGuest(id) {
    showGuestConfirm(
        'Delete Guest',
        'Are you sure you want to delete this guest?',
        async () => {
            try {
                const response = await fetch(`${API_URL_GUESTS}/guests/${id}`, {
                    method: 'DELETE'
                });
                
                if (response.ok) {
                    showGuestNotification('Guest deleted successfully!', 'success');
                    await loadGuestData();
                }
            } catch (error) {
                console.error('Error deleting guest:', error);
                showGuestNotification('Failed to delete guest', 'error');
            }
        }
    );
}

// Add CSS animations
const guestStyle = document.createElement('style');
guestStyle.textContent = `
    @keyframes slideIn {
        from { transform: translateX(400px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(400px); opacity: 0; }
    }
`;
document.head.appendChild(guestStyle);
