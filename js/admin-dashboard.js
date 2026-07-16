// Admin Dashboard JavaScript
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

// Format datetime
function formatDateTime(dateString) {
    return new Date(dateString).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', async () => {
    // Set admin info
    const adminInfo = getAdminInfo();
    document.getElementById('adminName').textContent = adminInfo.name;
    document.getElementById('adminEmail').textContent = adminInfo.email;
    
    // Load dashboard stats
    await loadDashboardStats();
    
    // Setup sidebar toggle
    setupSidebar();
    
    // Setup logout
    setupLogout();
});

// Load dashboard statistics
async function loadDashboardStats() {
    try {
        const data = await apiRequest('/stats');
        
        // Update stats cards
        document.getElementById('totalOrders').textContent = data.totalOrders.toLocaleString();
        document.getElementById('totalRevenue').textContent = formatCurrency(data.totalRevenue);
        document.getElementById('totalCustomers').textContent = data.totalCustomers.toLocaleString();
        document.getElementById('totalProducts').textContent = data.totalProducts.toLocaleString();
        
        // Update status cards
        document.getElementById('pendingOrders').textContent = data.orderStatuses.pending.toLocaleString();
        document.getElementById('processingOrders').textContent = data.orderStatuses.processing.toLocaleString();
        document.getElementById('deliveredOrders').textContent = data.orderStatuses.delivered.toLocaleString();
        document.getElementById('cancelledOrders').textContent = data.orderStatuses.cancelled.toLocaleString();
        
        // Update low stock alert
        const lowStockMessage = document.getElementById('lowStockMessage');
        if (data.lowStockCount > 0) {
            lowStockMessage.textContent = `${data.lowStockCount} products have low stock (less than 10 units)`;
        } else {
            lowStockMessage.textContent = 'All products have sufficient stock';
        }
        
        // Update recent orders table
        updateRecentOrdersTable(data.recentOrders);
        
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
        showNotification('Failed to load dashboard statistics: ' + error.message, 'error');
        // Set default values
        document.getElementById('totalOrders').textContent = '0';
        document.getElementById('totalRevenue').textContent = 'PKR (Rs.) 0.00';
        document.getElementById('totalCustomers').textContent = '0';
        document.getElementById('totalProducts').textContent = '0';
    }
}

// Update recent orders table
function updateRecentOrdersTable(orders) {
    const tbody = document.getElementById('recentOrdersTable');
    
    if (!orders || orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="loading-row">No recent orders</td></tr>';
        return;
    }
    
    tbody.innerHTML = orders.map(order => `
        <tr>
            <td><strong>#${order.orderId}</strong></td>
            <td>${order.customerName || 'N/A'}</td>
            <td>${formatCurrency(order.totalAmount)}</td>
            <td><span class="status-badge ${order.status}">${order.status}</span></td>
            <td>${formatDate(order.createdAt)}</td>
        </tr>
    `).join('');
}

// Setup sidebar
function setupSidebar() {
    const sidebar = document.getElementById('adminSidebar');
    const sidebarToggle = document.getElementById('sidebarToggle');
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    
    // Desktop sidebar toggle
    sidebarToggle?.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
    });
    
    // Mobile menu toggle
    mobileMenuToggle?.addEventListener('click', () => {
        sidebar.classList.toggle('active');
    });
    
    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 1024) {
            if (!sidebar.contains(e.target) && !mobileMenuToggle.contains(e.target)) {
                sidebar.classList.remove('active');
            }
        }
    });
    
    // Set active nav link
    const currentPage = window.location.pathname.split('/').pop().replace('.html', '') || 'dashboard';
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.dataset.page === currentPage) {
            link.classList.add('active');
        }
    });
}

// Setup logout
function setupLogout() {
    const logoutBtn = document.getElementById('logoutBtn');
    
    logoutBtn?.addEventListener('click', () => {
        if (confirm('Are you sure you want to logout?')) {
            localStorage.removeItem('nighthowls_admin_token');
            localStorage.removeItem('nighthowls_admin_id');
            localStorage.removeItem('nighthowls_admin_name');
            localStorage.removeItem('nighthowls_admin_email');
            window.location.href = 'admin-login.html';
        }
    });
}

// Show error message
function showError(message) {
    // You could implement a toast notification here
    console.error(message);
}
