// Admin Inventory Management JavaScript
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

// Global variables
let currentPage = 1;
let totalPages = 1;
let lowStockOnly = false;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    // Set admin info
    const adminInfo = getAdminInfo();
    document.getElementById('adminName').textContent = adminInfo.name;
    document.getElementById('adminEmail').textContent = adminInfo.email;
    
    // Check URL params for low stock filter
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('lowStock') === 'true') {
        lowStockOnly = true;
        document.getElementById('lowStockFilter').checked = true;
    }
    
    // Load inventory
    await loadInventory();
    
    // Setup event listeners
    setupEventListeners();
    
    // Setup sidebar
    setupSidebar();
    
    // Setup logout
    setupLogout();
});

// Load inventory
async function loadInventory() {
    try {
        const tbody = document.getElementById('inventoryTable');
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 40px;"><i class="fas fa-spinner fa-spin"></i> Loading inventory...</td></tr>';

        const params = new URLSearchParams({
            page: currentPage,
            limit: 20,
            lowStock: lowStockOnly
        });
        
        const data = await apiRequest(`/inventory?${params}`);
        
        updateInventoryTable(data.products);
        updatePagination(data.pagination);
        
    } catch (error) {
        console.error('Error loading inventory:', error);
        document.getElementById('inventoryTable').innerHTML = '<tr><td colspan="6" style="padding: 40px; text-align: center; color: #ef4444;"><i class="fas fa-exclamation-triangle"></i> Failed to load inventory</td></tr>';
        showNotification('Failed to load inventory: ' + error.message, 'error');
    }
}

// Update inventory table
function updateInventoryTable(products) {
    const tbody = document.getElementById('inventoryTable');
    
    if (!products || products.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="loading-row">No products found</td></tr>';
        return;
    }
    
    tbody.innerHTML = products.map(product => `
        <tr>
            <td>
                <img src="${product.image || '/images/logo.png'}" alt="${product.productName}" 
                     style="width: 50px; height: 50px; object-fit: cover; border-radius: 8px;"
                     onerror="this.src='/images/logo.png'">
            </td>
            <td><strong>${product.productName}</strong></td>
            <td><span class="status-badge" style="background: #e5e7eb; color: #374151;">${product.category}</span></td>
            <td><strong>${formatCurrency(product.price)}</strong></td>
            <td>
                <span style="color: ${product.stock < 10 ? '#ef4444' : '#10b981'}; font-weight: 600; font-size: 16px;">
                    ${product.stock}
                </span>
            </td>
            <td>
                ${product.stock === 0 
                    ? '<span class="status-badge cancelled">Out of Stock</span>' 
                    : product.stock < 10 
                        ? '<span class="status-badge pending">Low Stock</span>' 
                        : '<span class="status-badge delivered">In Stock</span>'}
            </td>
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
    loadInventory();
}

// Setup event listeners
function setupEventListeners() {
    // Low stock filter
    document.getElementById('lowStockFilter').addEventListener('change', (e) => {
        lowStockOnly = e.target.checked;
        currentPage = 1;
        loadInventory();
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
        if (link.dataset.page === 'inventory') {
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
