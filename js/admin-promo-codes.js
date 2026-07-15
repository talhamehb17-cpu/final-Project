// Admin Promo Codes Management

// Use localhost for local development, fallback to IP if needed
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:5000/api'
  : `http://${window.location.hostname}:5000/api`;

// DOM Elements
const promoCodesTableBody = document.getElementById('promoCodesTableBody');
const pagination = document.getElementById('pagination');
const addPromoBtn = document.getElementById('addPromoBtn');
const promoModal = document.getElementById('promoModal');
const promoForm = document.getElementById('promoForm');
const modalTitle = document.getElementById('modalTitle');
const closeModal = document.getElementById('closeModal');
const cancelBtn = document.getElementById('cancelBtn');
const deleteModal = document.getElementById('deleteModal');
const closeDeleteModal = document.getElementById('closeDeleteModal');
const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
const statusFilter = document.getElementById('statusFilter');
const searchInput = document.getElementById('searchInput');

let currentPromoCodeId = null;
let currentPage = 1;
const limit = 20;

// Get auth token
function getAuthToken() {
    return localStorage.getItem('nighthowls_admin_token');
}

// Check if admin is logged in
function isAdminLoggedIn() {
    return Boolean(getAuthToken());
}

// Redirect to login if not authenticated
function requireAdminAuth() {
    if (!isAdminLoggedIn()) {
        window.location.href = 'admin-login.html';
        return false;
    }
    return true;
}

// API request helper
async function apiRequest(path, options = {}) {
    const token = getAuthToken();
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };
    
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers
    });
    
    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(data.message || 'Request failed');
    }
    
    return data;
}

// Load promo codes
async function loadPromoCodes(page = 1) {
    try {
        const status = statusFilter.value;
        const search = searchInput.value;
        
        let url = `/promo-codes?page=${page}&limit=${limit}`;
        if (status) url += `&status=${status}`;
        if (search) url += `&search=${encodeURIComponent(search)}`;
        
        const data = await apiRequest(url);
        
        renderPromoCodes(data.promoCodes);
        renderPagination(data.pagination);
        currentPage = page;
    } catch (error) {
        console.error('Error loading promo codes:', error);
        promoCodesTableBody.innerHTML = `
            <tr>
                <td colspan="7" class="no-data">
                    <div style="padding: 20px; text-align: center; color: #dc3545;">
                        <i class="fas fa-exclamation-triangle" style="font-size: 24px; margin-bottom: 10px;"></i>
                        <p style="margin: 0;">Failed to load promo codes</p>
                        <p style="margin: 5px 0 0 0; font-size: 12px; color: #666;">${error.message}</p>
                        <p style="margin: 10px 0 0 0; font-size: 12px; color: #666;">
                            API URL: ${API_BASE_URL}
                        </p>
                        <p style="margin: 5px 0 0 0; font-size: 12px; color: #666;">
                            Make sure the server is running on port 5000
                        </p>
                        <p style="margin: 10px 0 0 0; font-size: 12px; color: #666;">
                            If the promo_codes table doesn't exist, run: <code>node setup-promo-codes.js</code>
                        </p>
                    </div>
                </td>
            </tr>
        `;
    }
}

// Render promo codes table
function renderPromoCodes(promoCodes) {
    if (!promoCodes || promoCodes.length === 0) {
        promoCodesTableBody.innerHTML = `
            <tr>
                <td colspan="7" class="no-data">No promo codes found</td>
            </tr>
        `;
        return;
    }
    
    promoCodesTableBody.innerHTML = promoCodes.map(promo => {
        const isExpired = new Date(promo.expiryDate) < new Date();
        const isActive = promo.isActive && !isExpired;
        
        return `
            <tr>
                <td><strong>${promo.code}</strong></td>
                <td>${promo.discountPercentage}%</td>
                <td>${new Date(promo.expiryDate).toLocaleDateString()}</td>
                <td>
                    <span class="status-badge ${isActive ? 'active' : 'inactive'}">
                        ${isActive ? 'Active' : (isExpired ? 'Expired' : 'Inactive')}
                    </span>
                </td>
                <td>${promo.createdBy || 'Admin'}</td>
                <td>${new Date(promo.createdAt).toLocaleDateString()}</td>
                <td class="actions">
                    <button class="btn-icon btn-edit" onclick="editPromoCode(${promo.id})" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon btn-toggle" onclick="togglePromoCode(${promo.id})" title="${isActive ? 'Deactivate' : 'Activate'}">
                        <i class="fas fa-${isActive ? 'toggle-on' : 'toggle-off'}"></i>
                    </button>
                    <button class="btn-icon btn-delete" onclick="deletePromoCode(${promo.id})" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// Render pagination
function renderPagination(pagination) {
    const { page, pages, total } = pagination;
    
    if (pages <= 1) {
        pagination.innerHTML = '';
        return;
    }
    
    let html = `
        <button class="pagination-btn" ${page === 1 ? 'disabled' : ''} onclick="loadPromoCodes(${page - 1})">
            <i class="fas fa-chevron-left"></i>
        </button>
    `;
    
    for (let i = 1; i <= pages; i++) {
        html += `
            <button class="pagination-btn ${i === page ? 'active' : ''}" onclick="loadPromoCodes(${i})">
                ${i}
            </button>
        `;
    }
    
    html += `
        <button class="pagination-btn" ${page === pages ? 'disabled' : ''} onclick="loadPromoCodes(${page + 1})">
            <i class="fas fa-chevron-right"></i>
        </button>
    `;
    
    html += `<span class="pagination-info">Showing ${total} codes</span>`;
    
    pagination.innerHTML = html;
}

// Open modal for adding
function openAddModal() {
    currentPromoCodeId = null;
    modalTitle.textContent = 'Add Promo Code';
    promoForm.reset();
    document.getElementById('isActive').checked = true;
    
    // Set minimum date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    document.getElementById('expiryDate').min = tomorrow.toISOString().split('T')[0];
    
    promoModal.classList.add('active');
}

// Open modal for editing
async function editPromoCode(id) {
    try {
        const data = await apiRequest(`/promo-codes/${id}`);
        const promo = data.promoCode;
        
        currentPromoCodeId = id;
        modalTitle.textContent = 'Edit Promo Code';
        
        document.getElementById('promoCode').value = promo.code;
        document.getElementById('discountPercentage').value = promo.discountPercentage;
        document.getElementById('expiryDate').value = new Date(promo.expiryDate).toISOString().split('T')[0];
        document.getElementById('isActive').checked = promo.isActive;
        
        promoModal.classList.add('active');
    } catch (error) {
        console.error('Error loading promo code:', error);
        alert('Failed to load promo code');
    }
}

// Close modal
function closeModalHandler() {
    promoModal.classList.remove('active');
    currentPromoCodeId = null;
    promoForm.reset();
}

// Save promo code
async function savePromoCode(e) {
    e.preventDefault();
    
    const formData = new FormData(promoForm);
    const promoData = {
        code: formData.get('code'),
        discountPercentage: parseFloat(formData.get('discountPercentage')),
        expiryDate: formData.get('expiryDate'),
        isActive: formData.get('isActive') === 'on'
    };
    
    try {
        const saveBtn = document.getElementById('saveBtn');
        const originalText = saveBtn.textContent;
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';
        
        if (currentPromoCodeId) {
            await apiRequest(`/promo-codes/${currentPromoCodeId}`, {
                method: 'PUT',
                body: JSON.stringify(promoData)
            });
        } else {
            await apiRequest('/promo-codes', {
                method: 'POST',
                body: JSON.stringify(promoData)
            });
        }
        
        closeModalHandler();
        loadPromoCodes(currentPage);
        alert(currentPromoCodeId ? 'Promo code updated successfully' : 'Promo code created successfully');
    } catch (error) {
        console.error('Error saving promo code:', error);
        alert(error.message || 'Failed to save promo code');
    } finally {
        const saveBtn = document.getElementById('saveBtn');
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save';
    }
}

// Toggle promo code status
async function togglePromoCode(id) {
    try {
        await apiRequest(`/promo-codes/${id}/toggle`, {
            method: 'PATCH'
        });
        loadPromoCodes(currentPage);
    } catch (error) {
        console.error('Error toggling promo code:', error);
        alert('Failed to toggle promo code status');
    }
}

// Delete promo code
let deletePromoCodeId = null;

function deletePromoCode(id) {
    deletePromoCodeId = id;
    deleteModal.classList.add('active');
}

function closeDeleteModalHandler() {
    deleteModal.classList.remove('active');
    deletePromoCodeId = null;
}

async function confirmDelete() {
    if (!deletePromoCodeId) return;
    
    try {
        await apiRequest(`/promo-codes/${deletePromoCodeId}`, {
            method: 'DELETE'
        });
        closeDeleteModalHandler();
        loadPromoCodes(currentPage);
        alert('Promo code deleted successfully');
    } catch (error) {
        console.error('Error deleting promo code:', error);
        alert('Failed to delete promo code');
    }
}

// Event listeners
addPromoBtn.addEventListener('click', openAddModal);
closeModal.addEventListener('click', closeModalHandler);
cancelBtn.addEventListener('click', closeModalHandler);
closeDeleteModal.addEventListener('click', closeDeleteModalHandler);
cancelDeleteBtn.addEventListener('click', closeDeleteModalHandler);
confirmDeleteBtn.addEventListener('click', confirmDelete);
promoForm.addEventListener('submit', savePromoCode);
statusFilter.addEventListener('change', () => loadPromoCodes(1));
searchInput.addEventListener('input', debounce(() => loadPromoCodes(1), 500));

// Debounce helper
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Initialize
if (requireAdminAuth()) {
    loadPromoCodes();
}
