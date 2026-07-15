// Admin Products Management JavaScript
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

// Global variables
let currentPage = 1;
let totalPages = 1;
let currentSearch = '';
let currentCategory = '';
let editingProductId = null;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    // Set admin info
    const adminInfo = getAdminInfo();
    document.getElementById('adminName').textContent = adminInfo.name;
    document.getElementById('adminEmail').textContent = adminInfo.email;
    
    // Load products
    await loadProducts();
    
    // Setup event listeners
    setupEventListeners();
    
    // Setup sidebar
    setupSidebar();
    
    // Setup logout
    setupLogout();
});

// Load products
async function loadProducts() {
    try {
        const tbody = document.getElementById('productsTable');
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 40px;"><i class="fas fa-spinner fa-spin"></i> Loading products...</td></tr>';

        const params = new URLSearchParams({
            page: currentPage,
            limit: 20
        });
        
        if (currentSearch) params.append('search', currentSearch);
        if (currentCategory) params.append('category', currentCategory);
        
        const data = await apiRequest(`/products?${params}`);
        
        updateProductsTable(data.products);
        updatePagination(data.pagination);
        
    } catch (error) {
        console.error('Error loading products:', error);
        document.getElementById('productsTable').innerHTML = '<tr><td colspan="6" style="padding: 40px; text-align: center; color: #ef4444;"><i class="fas fa-exclamation-triangle"></i> Failed to load products</td></tr>';
        showNotification('Failed to load products: ' + error.message, 'error');
    }
}

// Update products table
function updateProductsTable(products) {
    const tbody = document.getElementById('productsTable');
    
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
            <td>
                <strong>${product.productName}</strong>
                ${product.oldPrice ? `<br><span style="color: #ef4444; text-decoration: line-through; font-size: 12px;">${formatCurrency(product.oldPrice)}</span>` : ''}
            </td>
            <td><span class="status-badge" style="background: #e5e7eb; color: #374151;">${product.category}</span></td>
            <td><strong>${formatCurrency(product.price)}</strong></td>
            <td>
                <span style="color: ${product.stock < 10 ? '#ef4444' : '#10b981'}; font-weight: 600;">
                    ${product.stock}
                </span>
                ${product.stock < 10 ? '<i class="fas fa-exclamation-triangle" style="color: #f59e0b; margin-left: 4px;"></i>' : ''}
            </td>
            <td>
                <button class="btn-secondary btn-sm" onclick="editProduct(${product.id})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-danger btn-sm" onclick="deleteProduct(${product.id})">
                    <i class="fas fa-trash"></i>
                </button>
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
    
    // Previous button
    html += `<button ${currentPage === 1 ? 'disabled' : ''} onclick="goToPage(${currentPage - 1})">
        <i class="fas fa-chevron-left"></i>
    </button>`;
    
    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
            html += `<button class="${i === currentPage ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
        } else if (i === currentPage - 2 || i === currentPage + 2) {
            html += '<button disabled>...</button>';
        }
    }
    
    // Next button
    html += `<button ${currentPage === totalPages ? 'disabled' : ''} onclick="goToPage(${currentPage + 1})">
        <i class="fas fa-chevron-right"></i>
    </button>`;
    
    container.innerHTML = html;
}

// Go to page
function goToPage(page) {
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    loadProducts();
}

// Setup event listeners
function setupEventListeners() {
    // Search
    const searchInput = document.getElementById('searchProducts');
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            currentSearch = e.target.value;
            currentPage = 1;
            loadProducts();
        }, 300);
    });
    
    // Category filter
    document.getElementById('categoryFilter').addEventListener('change', (e) => {
        currentCategory = e.target.value;
        currentPage = 1;
        loadProducts();
    });
    
    // Add product button
    document.getElementById('addProductBtn').addEventListener('click', () => {
        openModal();
    });
    
    // Modal close
    document.getElementById('closeModal').addEventListener('click', closeModal);
    document.getElementById('cancelBtn').addEventListener('click', closeModal);
    
    // Save product
    document.getElementById('saveProductBtn').addEventListener('click', saveProduct);
    
    // Close modal on outside click
    document.getElementById('productModal').addEventListener('click', (e) => {
        if (e.target.id === 'productModal') {
            closeModal();
        }
    });
}

// Open modal
function openModal(product = null) {
    const modal = document.getElementById('productModal');
    const title = document.getElementById('modalTitle');
    const form = document.getElementById('productForm');
    
    if (product) {
        title.textContent = 'Edit Product';
        editingProductId = product.id;
        document.getElementById('productName').value = product.productName;
        document.getElementById('productCategory').value = product.category;
        document.getElementById('productPrice').value = product.price;
        document.getElementById('productOldPrice').value = product.oldPrice || '';
        document.getElementById('productImage').value = product.image || '';
        document.getElementById('productImages').value = Array.isArray(product.images) ? product.images.join(', ') : '';
        document.getElementById('productDescription').value = product.description || '';
        document.getElementById('productSizes').value = product.sizes || '';
        document.getElementById('productColors').value = Array.isArray(product.colors) ? product.colors.join(', ') : '';
        document.getElementById('productStock').value = product.stock;
    } else {
        title.textContent = 'Add Product';
        editingProductId = null;
        form.reset();
    }
    
    modal.classList.add('active');
}

// Close modal
function closeModal() {
    document.getElementById('productModal').classList.remove('active');
    editingProductId = null;
}

// Edit product
function editProduct(id) {
    // Load product details first using correct endpoint
    apiRequest(`/products/${id}`)
        .then(data => {
            if (data.product) {
                openModal(data.product);
            }
        })
        .catch(error => {
            console.error('Error loading product:', error);
            showNotification('Failed to load product details: ' + error.message, 'error');
        });
}

// Delete product
function deleteProduct(id) {
    showConfirmDialog(
        'Are you sure you want to delete this product? This action cannot be undone.',
        async () => {
            try {
                await apiRequest(`/products/${id}`, { method: 'DELETE' });
                showNotification('Product deleted successfully', 'success');
                loadProducts();
            } catch (error) {
                console.error('Error deleting product:', error);
                showNotification('Failed to delete product: ' + error.message, 'error');
            }
        }
    );
}

// Save product
async function saveProduct() {
    const form = document.getElementById('productForm');
    
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const productData = {
        product_name: document.getElementById('productName').value.trim(),
        category: document.getElementById('productCategory').value,
        price: parseFloat(document.getElementById('productPrice').value),
        old_price: document.getElementById('productOldPrice').value ? parseFloat(document.getElementById('productOldPrice').value) : null,
        image: document.getElementById('productImage').value?.trim() || null,
        images: document.getElementById('productImages').value.split(',').map(s => s.trim()).filter(Boolean),
        description: document.getElementById('productDescription').value?.trim() || null,
        sizes: document.getElementById('productSizes').value?.trim() || null,
        colors: document.getElementById('productColors').value.split(',').map(s => s.trim()).filter(Boolean),
        stock: parseInt(document.getElementById('productStock').value) || 0
    };

    // Validation
    if (!productData.product_name) {
        showNotification('Product name is required', 'error');
        return;
    }
    if (productData.price <= 0) {
        showNotification('Price must be greater than 0', 'error');
        return;
    }

    try {
        const saveBtn = document.getElementById('saveProductBtn');
        setButtonLoading(saveBtn, true);

        if (editingProductId) {
            await apiRequest(`/products/${editingProductId}`, {
                method: 'PUT',
                body: JSON.stringify(productData)
            });
            showNotification('Product updated successfully', 'success');
        } else {
            await apiRequest('/products', {
                method: 'POST',
                body: JSON.stringify(productData)
            });
            showNotification('Product created successfully', 'success');
        }

        closeModal();
        await loadProducts();

    } catch (error) {
        console.error('Error saving product:', error);
        showNotification('Failed to save product: ' + error.message, 'error');
    } finally {
        const saveBtn = document.getElementById('saveProductBtn');
        setButtonLoading(saveBtn, false);
    }
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
        if (link.dataset.page === 'products') {
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
