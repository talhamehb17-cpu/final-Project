// Admin Orders Management JavaScript
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

// Global variables
let currentPage = 1;
let totalPages = 1;
let currentSearch = '';
let currentStatus = '';

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    // Set admin info
    const adminInfo = getAdminInfo();
    document.getElementById('adminName').textContent = adminInfo.name;
    document.getElementById('adminEmail').textContent = adminInfo.email;
    
    // Load orders
    await loadOrders();
    
    // Setup event listeners
    setupEventListeners();
    
    // Setup sidebar
    setupSidebar();
    
    // Setup logout
    setupLogout();
});

// Load orders
async function loadOrders() {
    try {
        const tbody = document.getElementById('ordersTable');
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 40px;"><i class="fas fa-spinner fa-spin"></i> Loading orders...</td></tr>';

        const params = new URLSearchParams({
            page: currentPage,
            limit: 20
        });
        
        if (currentSearch) params.append('search', currentSearch);
        if (currentStatus) params.append('status', currentStatus);
        
        const data = await apiRequest(`/orders?${params}`);
        
        updateOrdersTable(data.orders);
        updatePagination(data.pagination);
        
    } catch (error) {
        console.error('Error loading orders:', error);
        document.getElementById('ordersTable').innerHTML = '<tr><td colspan="6" style="padding: 40px; text-align: center; color: #ef4444;"><i class="fas fa-exclamation-triangle"></i> Failed to load orders</td></tr>';
        showNotification('Failed to load orders: ' + error.message, 'error');
    }
}

// Update orders table
function updateOrdersTable(orders) {
    const tbody = document.getElementById('ordersTable');
    
    if (!orders || orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="loading-row">No orders found</td></tr>';
        return;
    }
    
    tbody.innerHTML = orders.map(order => `
        <tr>
            <td><strong>#${order.orderId}</strong></td>
            <td>
                <div>${order.customerName || 'N/A'}</div>
                <div style="font-size: 12px; color: #6b7280;">${order.customerEmail || ''}</div>
            </td>
            <td><strong>${formatCurrency(order.totalAmount)}</strong></td>
            <td><span class="status-badge ${order.status}">${order.status}</span></td>
            <td>${formatDate(order.createdAt)}</td>
            <td>
                <button class="btn-secondary btn-sm" onclick="viewOrder(${order.orderId})">
                    <i class="fas fa-eye"></i>
                </button>
                <select class="form-control" style="width: auto; padding: 4px 8px; font-size: 12px;" 
                        onchange="updateOrderStatus(${order.orderId}, this.value, this)">
                    <option value="">Update Status</option>
                    <option value="pending">Pending</option>
                    <option value="processing">Processing</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                </select>
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
    loadOrders();
}

// Setup event listeners
function setupEventListeners() {
    // Search
    const searchInput = document.getElementById('searchOrders');
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            currentSearch = e.target.value;
            currentPage = 1;
            loadOrders();
        }, 300);
    });
    
    // Status filter
    document.getElementById('statusFilter').addEventListener('change', (e) => {
        currentStatus = e.target.value;
        currentPage = 1;
        loadOrders();
    });
    
    // Modal close
    document.getElementById('closeOrderModal').addEventListener('click', closeOrderModal);
    document.getElementById('closeOrderModalBtn').addEventListener('click', closeOrderModal);
    
    // Close modal on outside click
    document.getElementById('orderModal').addEventListener('click', (e) => {
        if (e.target.id === 'orderModal') {
            closeOrderModal();
        }
    });
}

// View order details
async function viewOrder(orderId) {
    try {
        const data = await apiRequest(`/orders/${orderId}`);
        const order = data.order;
        
        if (!order) {
            alert('Order not found');
            return;
        }
        
        const modalBody = document.getElementById('orderModalBody');
        
        let shippingAddress = order.shippingAddress;
        if (typeof shippingAddress === 'string') {
            try {
                shippingAddress = JSON.parse(shippingAddress);
            } catch (e) {
                shippingAddress = {};
            }
        }
        
        const addressText = typeof shippingAddress === 'object' 
            ? `${shippingAddress.house_number || ''} ${shippingAddress.street || ''}, ${shippingAddress.town || ''}, ${shippingAddress.city || ''}, ${shippingAddress.country || 'Pakistan'}`
            : 'N/A';
        
            const discountPct = order.discountPercentage != null
                ? Number(order.discountPercentage)
                : (Number(order.subtotal) > 0 ? (Number(order.discountTotal) / Number(order.subtotal) * 100) : 0);
            const discountLabel = order.promoCode
                ? `Discount (${order.promoCode} - ${discountPct.toFixed(0)}%)`
                : `Discount (${discountPct.toFixed(0)}%)`;

            modalBody.innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
                <div>
                    <h3 style="margin-bottom: 16px;">Order Information</h3>
                    <div style="display: grid; grid-template-columns: 140px 1fr; gap: 8px; font-size: 14px;">
                        <span style="color: #6b7280;">Order ID:</span>
                        <span><strong>#${order.orderId}</strong></span>
                        
                        <span style="color: #6b7280;">Status:</span>
                        <span><span class="status-badge ${order.status}">${order.status}</span></span>
                        
                        <span style="color: #6b7280;">Date:</span>
                        <span>${formatDateTime(order.createdAt)}</span>
                        
                        <span style="color: #6b7280;">Payment:</span>
                        <span>${order.paymentMethod}</span>
                        
                        <span style="color: #6b7280;">Est. Delivery:</span>
                        <span>${order.estimatedDeliveryDate ? formatDate(order.estimatedDeliveryDate) : 'N/A'}</span>
                    </div>
                </div>
                
                <div>
                    <h3 style="margin-bottom: 16px;">Customer Information</h3>
                    <div style="display: grid; grid-template-columns: 140px 1fr; gap: 8px; font-size: 14px;">
                        <span style="color: #6b7280;">Name:</span>
                        <span><strong>${order.customerName || 'N/A'}</strong></span>
                        
                        <span style="color: #6b7280;">Email:</span>
                        <span>${order.customerEmail || 'N/A'}</span>
                        
                        <span style="color: #6b7280;">Phone:</span>
                        <span>${order.phone || 'N/A'}</span>
                        
                        <span style="color: #6b7280;">Address:</span>
                        <span>${addressText}</span>
                    </div>
                </div>
            </div>
            
            <h3 style="margin: 24px 0 16px;">Order Items</h3>
            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="background: #f9fafb;">
                        <th style="padding: 12px; text-align: left; font-size: 13px; font-weight: 600;">Product</th>
                        <th style="padding: 12px; text-align: left; font-size: 13px; font-weight: 600;">Variant</th>
                        <th style="padding: 12px; text-align: center; font-size: 13px; font-weight: 600;">Qty</th>
                        <th style="padding: 12px; text-align: right; font-size: 13px; font-weight: 600;">Price</th>
                        <th style="padding: 12px; text-align: right; font-weight: 600;">Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${order.items.map(item => `
                        <tr style="border-bottom: 1px solid #e5e7eb;">
                            <td style="padding: 12px;">
                                <div style="display: flex; align-items: center; gap: 12px;">
                                    <img src="${item.image || '/images/logo.png'}" 
                                         style="width: 48px; height: 48px; object-fit: cover; border-radius: 8px;"
                                         onerror="this.src='/images/logo.png'">
                                    <div>
                                        <div style="font-weight: 500;">${item.product_name}</div>
                                    </div>
                                </div>
                            </td>
                            <td style="padding: 12px; font-size: 13px;">
                                ${item.color || item.size ? `
                                    <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                                        ${item.color ? `<span style="background: #e5e7eb; padding: 2px 8px; border-radius: 4px; font-size: 12px;">Color: ${item.color}</span>` : ''}
                                        ${item.size ? `<span style="background: #e5e7eb; padding: 2px 8px; border-radius: 4px; font-size: 12px;">Size: ${item.size}</span>` : ''}
                                    </div>
                                ` : '-'}
                            </td>
                            <td style="padding: 12px; text-align: center;">${item.quantity}</td>
                            <td style="padding: 12px; text-align: right;">${formatCurrency(item.price)}</td>
                            <td style="padding: 12px; text-align: right; font-weight: 600;">${formatCurrency(item.price * item.quantity)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            
            <div style="margin-top: 24px; display: flex; justify-content: flex-end;">
                <div style="width: 300px;">
                    <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                        <span style="color: #6b7280;">Subtotal</span>
                        <span>${formatCurrency(order.subtotal)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                        <span style="color: #6b7280;">${discountLabel}</span>
                        <span style="color: #ef4444;">-${formatCurrency(order.discountTotal)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                        <span style="color: #6b7280;">Shipping</span>
                        <span>${formatCurrency(order.shipping)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                        <span style="color: #6b7280;">Tax</span>
                        <span>${formatCurrency(order.tax)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 12px 0; font-weight: 700; font-size: 18px;">
                        <span>Total</span>
                        <span>${formatCurrency(order.totalAmount)}</span>
                    </div>
                </div>
            </div>
        `;
        
        document.getElementById('orderModal').classList.add('active');
        
    } catch (error) {
        console.error('Error loading order details:', error);
        alert('Failed to load order details');
    }
}

// Close order modal
function closeOrderModal() {
    document.getElementById('orderModal').classList.remove('active');
}

// Update order status
async function updateOrderStatus(orderId, status, selectElement) {
    if (!status) return;

    showConfirmDialog(
        `Update order #${orderId} status to "${status}"?`,
        async () => {
            try {
                await apiRequest(`/orders/${orderId}/status`, {
                    method: 'PUT',
                    body: JSON.stringify({ status })
                });

                showNotification('Order status updated successfully', 'success');
                await loadOrders();

            } catch (error) {
                console.error('Error updating order status:', error);
                showNotification('Failed to update order status: ' + error.message, 'error');
                if (selectElement) selectElement.value = '';
            }
        },
        () => {
            if (selectElement) selectElement.value = '';
        }
    );
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
        if (link.dataset.page === 'orders') {
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
