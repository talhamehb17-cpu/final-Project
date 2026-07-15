// Admin Analytics JavaScript
const API_BASE = 'http://localhost:5000/api/admin';

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

// Get month name
function getMonthName(month) {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                    'July', 'August', 'September', 'October', 'November', 'December'];
    return months[month - 1];
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    // Set admin info
    const adminInfo = getAdminInfo();
    document.getElementById('adminName').textContent = adminInfo.name;
    document.getElementById('adminEmail').textContent = adminInfo.email;
    
    // Load analytics
    await loadAnalytics();
    
    // Setup sidebar
    setupSidebar();
    
    // Setup logout
    setupLogout();
});

// Load analytics
async function loadAnalytics() {
    try {
        const tables = [
            document.getElementById('salesTable'),
            document.getElementById('bestSellersTable'),
            document.getElementById('customerGrowthTable'),
            document.getElementById('categoryRevenueTable')
        ];

        tables.forEach(table => {
            if (table) {
                table.innerHTML = '<tr><td colspan="3" style="text-align: center; padding: 40px;"><i class="fas fa-spinner fa-spin"></i> Loading...</td></tr>';
            }
        });

        const data = await apiRequest('/analytics');
        
        updateSalesTable(data.salesData);
        updateBestSellersTable(data.bestSellers);
        updateCustomerGrowthTable(data.customerGrowth);
        updateCategoryRevenueTable(data.categoryRevenue);
        
    } catch (error) {
        console.error('Error loading analytics:', error);
        const tables = [
            document.getElementById('salesTable'),
            document.getElementById('bestSellersTable'),
            document.getElementById('customerGrowthTable'),
            document.getElementById('categoryRevenueTable')
        ];
        tables.forEach(table => {
            if (table) {
                table.innerHTML = '<tr><td colspan="3" style="padding: 40px; text-align: center; color: #ef4444;"><i class="fas fa-exclamation-triangle"></i> Failed to load</td></tr>';
            }
        });
        showNotification('Failed to load analytics: ' + error.message, 'error');
    }
}

// Update sales table
function updateSalesTable(salesData) {
    const tbody = document.getElementById('salesTable');
    
    if (!salesData || salesData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="loading-row">No sales data available</td></tr>';
        return;
    }
    
    tbody.innerHTML = salesData.map(row => `
        <tr>
            <td>${formatDate(row.date)}</td>
            <td><strong>${row.orders}</strong></td>
            <td><strong>${formatCurrency(row.revenue)}</strong></td>
        </tr>
    `).join('');
}

// Update best sellers table
function updateBestSellersTable(bestSellers) {
    const tbody = document.getElementById('bestSellersTable');
    
    if (!bestSellers || bestSellers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="loading-row">No sales data available</td></tr>';
        return;
    }
    
    tbody.innerHTML = bestSellers.map((item, index) => `
        <tr>
            <td>
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div style="width: 32px; height: 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                                border-radius: 50%; display: flex; align-items: center; justify-content: center; 
                                color: white; font-weight: 700; font-size: 14px;">
                        ${index + 1}
                    </div>
                    <strong>${item.productName}</strong>
                </div>
            </td>
            <td><strong>${item.totalSold}</strong></td>
            <td><strong>${formatCurrency(item.totalRevenue)}</strong></td>
        </tr>
    `).join('');
}

// Update customer growth table
function updateCustomerGrowthTable(customerGrowth) {
    const tbody = document.getElementById('customerGrowthTable');
    
    if (!customerGrowth || customerGrowth.length === 0) {
        tbody.innerHTML = '<tr><td colspan="2" class="loading-row">No customer growth data available</td></tr>';
        return;
    }
    
    tbody.innerHTML = customerGrowth.map(row => `
        <tr>
            <td>${getMonthName(row.month)} ${row.year}</td>
            <td><strong>${row.count}</strong></td>
        </tr>
    `).join('');
}

// Update category revenue table
function updateCategoryRevenueTable(categoryRevenue) {
    const tbody = document.getElementById('categoryRevenueTable');
    
    if (!categoryRevenue || categoryRevenue.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="loading-row">No category revenue data available</td></tr>';
        return;
    }
    
    const totalRevenue = categoryRevenue.reduce((sum, item) => sum + item.revenue, 0);
    
    tbody.innerHTML = categoryRevenue.map(item => {
        const percentage = totalRevenue > 0 ? ((item.revenue / totalRevenue) * 100).toFixed(1) : 0;
        return `
            <tr>
                <td><strong>${item.category}</strong></td>
                <td><strong>${formatCurrency(item.revenue)}</strong></td>
                <td>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <div style="flex: 1; height: 8px; background: #e5e7eb; border-radius: 4px; overflow: hidden;">
                            <div style="width: ${percentage}%; height: 100%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);"></div>
                        </div>
                        <span style="font-weight: 600; min-width: 50px;">${percentage}%</span>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
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
        if (link.dataset.page === 'analytics') {
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
