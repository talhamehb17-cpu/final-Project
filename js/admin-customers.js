// Admin Customers Management JavaScript
const API_BASE = 'https://final-project-production-13f4.up.railway.app/api/admin';

// Check authentication
function checkAuth() {
    const token = localStorage.getItem('nighthowls_admin_token');
    if (!token) {
        window.location.href = 'admin-login.html';
        return false;
    }
    return token;
}

// Get admin info from localStorage
function getAdminInfo() {
    return {
        name: localStorage.getItem('nighthowls_admin_name') || 'Admin',
        email: localStorage.getItem('nighthowls_admin_email') || ''
    };
}

// Make authenticated API request
async function apiRequest(endpoint, options = {}) {
    const token = checkAuth();
    
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers
    };
    
    const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers
    });
    
    if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('nighthowls_admin_token');
        localStorage.removeItem('nighthowls_admin_id');
        localStorage.removeItem('nighthowls_admin_name');
        localStorage.removeItem('nighthowls_admin_email');
        window.location.href = 'admin-login.html';
        throw new Error('Unauthorized');
    }
    
    if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Request failed');
    }
    
    return response.json();
}

// Format currency
function formatCurrency(amount) {
    return `PKR (Rs.) ${Number(amount || 0).toFixed(2)}`;
}

// Format date
function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Global variables
let currentPage = 1;
let totalPages = 1;
let currentSearch = '';

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    // Set admin info
    const adminInfo = getAdminInfo();
    document.getElementById('adminName').textContent = adminInfo.name;
    document.getElementById('adminEmail').textContent = adminInfo.email;
    
    // Load customers
    await loadCustomers();
    
    // Setup event listeners
    setupEventListeners();
    
    // Setup sidebar
    setupSidebar();
    
    // Setup logout
    setupLogout();
});

// Load customers
async function loadCustomers() {
    try {
        const tbody = document.getElementById('customersTable');
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 40px;"><i class="fas fa-spinner fa-spin"></i> Loading customers...</td></tr>';

        const params = new URLSearchParams({
            page: currentPage,
            limit: 20
        });
        
        if (currentSearch) params.append('search', currentSearch);
        
        const data = await apiRequest(`/customers?${params}`);
        
        updateCustomersTable(data.customers);
        updatePagination(data.pagination);
        
    } catch (error) {
        console.error('Error loading customers:', error);
        document.getElementById('customersTable').innerHTML = '<tr><td colspan="5" style="padding: 40px; text-align: center; color: #ef4444;"><i class="fas fa-exclamation-triangle"></i> Failed to load customers</td></tr>';
        showNotification('Failed to load customers: ' + error.message, 'error');
    }
}

// Update customers table
function updateCustomersTable(customers) {
    const tbody = document.getElementById('customersTable');
    
    if (!customers || customers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="loading-row">No customers found</td></tr>';
        return;
    }
    
    tbody.innerHTML = customers.map(customer => `
        <tr>
            <td>
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div class="admin-avatar" style="width: 40px; height: 40px; font-size: 14px;">
                        <i class="fas fa-user"></i>
                    </div>
                    <strong>${customer.name}</strong>
                </div>
            </td>
            <td>${customer.email}</td>
            <td><strong>${customer.orderCount}</strong></td>
            <td><strong>${formatCurrency(customer.totalSpent)}</strong></td>
            <td>${formatDate(customer.createdAt)}</td>
        </tr>
    `).join('');
}

// Update pagination
function updatePagination(pagination) {
    const container = document.getElementById('pagination');
    currentPage = pagination.page;
    totalPages = pagination.pages;
    
    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }
    
    let html = '';
    
    html += `<button ${currentPage === 1 ? 'disabled' : ''} onclick="goToPage(${currentPage - 1})">
        <i class="fas fa-chevron-left"></i>
    </button>`;
    
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
            html += `<button class="${i === currentPage ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
        } else if (i === currentPage - 2 || i === currentPage + 2) {
            html += '<button disabled>...</button>';
        }
    }
    
    html += `<button ${currentPage === totalPages ? 'disabled' : ''} onclick="goToPage(${currentPage + 1})">
        <i class="fas fa-chevron-right"></i>
    </button>`;
    
    container.innerHTML = html;
}

// Go to page
function goToPage(page) {
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    loadCustomers();
}

// Setup event listeners
function setupEventListeners() {
    // Search
    const searchInput = document.getElementById('searchCustomers');
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            currentSearch = e.target.value;
            currentPage = 1;
            loadCustomers();
        }, 300);
    });
}

// Setup sidebar
function setupSidebar() {
    const sidebar = document.getElementById('adminSidebar');
    const sidebarToggle = document.getElementById('sidebarToggle');
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    
    sidebarToggle?.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
    });
    
    mobileMenuToggle?.addEventListener('click', () => {
        sidebar.classList.toggle('active');
    });
    
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 1024) {
            if (!sidebar.contains(e.target) && !mobileMenuToggle.contains(e.target)) {
                sidebar.classList.remove('active');
            }
        }
    });
    
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.dataset.page === 'customers') {
            link.classList.add('active');
        }
    });
}

// Setup logout
function setupLogout() {
    document.getElementById('logoutBtn')?.addEventListener('click', () => {
        if (confirm('Are you sure you want to logout?')) {
            localStorage.removeItem('nighthowls_admin_token');
            localStorage.removeItem('nighthowls_admin_id');
            localStorage.removeItem('nighthowls_admin_name');
            localStorage.removeItem('nighthowls_admin_email');
            window.location.href = 'admin-login.html';
        }
    });
}
