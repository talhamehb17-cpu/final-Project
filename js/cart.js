// Cart Page JavaScript (SQL-backed; login required)
const cartItemsContainer = document.getElementById('cartItems');
const clearCartBtn = document.getElementById('clearCart');
const subtotalElement = document.querySelector('.subtotal');
const shippingElement = document.querySelector('.shipping');
const taxElement = document.querySelector('.tax');
const totalElement = document.querySelector('.total-amount');
const promoCodeInput = document.getElementById('promoCodeInput');
const applyPromoBtn = document.getElementById('applyPromoBtn');
const promoMessage = document.getElementById('promoMessage');
const discountRow = document.getElementById('discountRow');

let cartItems = [];
let appliedPromoCode = null;
let discountPercentage = 0.03; // Default 3% discount

function formatCurrency(amount) {
    return `PKR (Rs.) ${Number(amount || 0).toFixed(2)}`;
}

function waitForApiReady(timeoutMs = 6000) {
    return new Promise((resolve, reject) => {
        const start = Date.now();
        const tick = () => {
            if (typeof window.nhApiRequest === 'function' && typeof window.nhRequireLogin === 'function') return resolve();
            if (Date.now() - start > timeoutMs) return reject(new Error('App scripts not loaded. Please hard refresh.'));
            setTimeout(tick, 50);
        };
        tick();
    });
}

async function refreshCart() {
    const data = await window.nhApiRequest('/cart', {}, { auth: true });
    cartItems = data.items || [];
    displayCartItems();
    updateTotals();
    if (typeof window.updateCartCount === 'function') window.updateCartCount();
    if (typeof window.updateWishlistCount === 'function') window.updateWishlistCount();
}

// Calculate and update totals
function updateTotals() {
    const subtotal = cartItems.reduce((total, item) => total + (Number(item.price) * Number(item.quantity)), 0);
    const discount = subtotal * discountPercentage;
    const shipping = 100; // Fixed shipping fee of Rs. 100
    const tax = 0; // No tax
    const total = subtotal - discount + shipping;

    subtotalElement.textContent = formatCurrency(subtotal);
    shippingElement.textContent = formatCurrency(shipping);
    taxElement.textContent = formatCurrency(tax);
    totalElement.textContent = formatCurrency(total);

    // Update discount element if it exists
    const discountElement = document.querySelector('.discount-amount');
    if (discountElement && discountRow) {
        discountRow.style.display = 'flex';
        const discountLabel = appliedPromoCode ? `Discount (${appliedPromoCode} - ${(discountPercentage * 100).toFixed(0)}%)` : 'Discount (3%)';
        discountRow.querySelector('span:first-child').textContent = discountLabel;
        discountElement.textContent = `-${formatCurrency(discount)}`;
    }
}

// Display cart items
function displayCartItems() {
    if (cartItems.length === 0) {
        cartItemsContainer.innerHTML = `
            <div class="empty-cart">
                <i class="fas fa-shopping-cart"></i>
                <h3>Your cart is empty</h3>
                <p>Add some products to your cart to see them here</p>
                <a href="product.html" class="btn-primary">Browse Products</a>
            </div>
        `;
        return;
    }
    
    cartItemsContainer.innerHTML = '';
    
    cartItems.forEach((item, index) => {
        const itemTotal = Number(item.price) * Number(item.quantity);
        const cartItem = document.createElement('div');
        cartItem.className = 'cart-item';

        const parts = [];
        if (item.size) parts.push(`Size: ${item.size}`);
        if (item.color) parts.push(`Color: ${item.color}`);
        const variantLine = parts.length ? `<div class="cart-item-variant">${parts.join(', ')}</div>` : '';

        cartItem.innerHTML = `
            <div class="cart-item-image">
                <img src="${item.image || 'images/logo.png'}" alt="${item.product_name}">
            </div>
            <div class="cart-item-details">
                <h3 class="cart-item-title">${item.product_name}</h3>
                ${variantLine}
                <div class="cart-item-price">${formatCurrency(Number(item.price).toFixed(2))}</div>
                <div class="cart-item-actions">
                    <div class="quantity-controls">
                        <button class="quantity-btn decrease" data-index="${index}">-</button>
                        <input type="number" class="quantity-input" value="${item.quantity}" min="1" data-index="${index}">
                        <button class="quantity-btn increase" data-index="${index}">+</button>
                    </div>
                    <button class="remove-item" data-index="${index}">
                        <i class="fas fa-trash"></i> Remove
                    </button>
                </div>
            </div>
            <div class="cart-item-total">${formatCurrency(itemTotal)}</div>
        `;
        
        cartItemsContainer.appendChild(cartItem);
    });
    
    // Update cart header with item count
    document.querySelector('.cart-header h2').textContent = `Items (${cartItems.length})`;
    
    // Add event listeners
    addCartEventListeners();
}

// Add event listeners to cart items
function addCartEventListeners() {
    // Decrease quantity buttons
    document.querySelectorAll('.decrease').forEach(button => {
        button.addEventListener('click', async (e) => {
            const index = parseInt(button.getAttribute('data-index'));
            if (cartItems[index].quantity > 1) {
                const nextQty = cartItems[index].quantity - 1;
                await window.nhApiRequest(`/cart/${cartItems[index].id}`, { method: 'PATCH', body: JSON.stringify({ quantity: nextQty }) }, { auth: true });
                await refreshCart();
            }
        });
    });
    
    // Increase quantity buttons
    document.querySelectorAll('.increase').forEach(button => {
        button.addEventListener('click', async (e) => {
            const index = parseInt(button.getAttribute('data-index'));
            const nextQty = cartItems[index].quantity + 1;
            await window.nhApiRequest(`/cart/${cartItems[index].id}`, { method: 'PATCH', body: JSON.stringify({ quantity: nextQty }) }, { auth: true });
            await refreshCart();
        });
    });
    
    // Quantity input changes
    document.querySelectorAll('.quantity-input').forEach(input => {
        input.addEventListener('change', async (e) => {
            const index = parseInt(input.getAttribute('data-index'));
            const newQuantity = parseInt(input.value);
            
            if (newQuantity >= 1) {
                await window.nhApiRequest(`/cart/${cartItems[index].id}`, { method: 'PATCH', body: JSON.stringify({ quantity: newQuantity }) }, { auth: true });
                await refreshCart();
            }
        });
    });
    
    // Remove item buttons
    document.querySelectorAll('.remove-item').forEach(button => {
        button.addEventListener('click', async (e) => {
            const index = parseInt(button.getAttribute('data-index'));
            const item = cartItems[index];
            await window.nhApiRequest(`/cart/${item.id}`, { method: 'DELETE' }, { auth: true });
            await refreshCart();
            showNotification('Item removed from cart');
        });
    });
}

// Clear cart
clearCartBtn.addEventListener('click', async () => {
    if (cartItems.length > 0) {
        if (confirm('Are you sure you want to clear your cart?')) {
            await window.nhApiRequest('/cart', { method: 'DELETE' }, { auth: true });
            await refreshCart();
            showNotification('Cart cleared');
        }
    }
});

// Apply promo code
async function applyPromoCode() {
    const code = promoCodeInput.value.trim().toUpperCase();
    
    if (!code) {
        promoMessage.textContent = 'Please enter a promo code';
        promoMessage.className = 'promo-message error';
        return;
    }
    
    if (code.length < 3) {
        promoMessage.textContent = 'Invalid promo code';
        promoMessage.className = 'promo-message error';
        return;
    }
    
    try {
        applyPromoBtn.disabled = true;
        applyPromoBtn.textContent = 'Validating...';
        
 const response = await fetch('https://final-project-production-13f4.up.railway.app/api/promo-codes/validate', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({ code })
});
        
        const data = await response.json();
        
        if (data.valid) {
            appliedPromoCode = data.promoCode.code;
            discountPercentage = data.promoCode.discountPercentage / 100;
            promoMessage.textContent = `Promo code applied! ${data.promoCode.discountPercentage}% discount`;
            promoMessage.className = 'promo-message success';
            updateTotals();
        } else {
            promoMessage.textContent = data.message || 'Invalid or expired promo code';
            promoMessage.className = 'promo-message error';
        }
    } catch (error) {
        console.error('Error validating promo code:', error);
        promoMessage.textContent = 'Error validating promo code';
        promoMessage.className = 'promo-message error';
    } finally {
        applyPromoBtn.disabled = false;
        applyPromoBtn.textContent = 'Apply';
    }
}

// Remove promo code
function removePromoCode() {
    appliedPromoCode = null;
    discountPercentage = 0.03; // Reset to default 3%
    promoCodeInput.value = '';
    promoMessage.textContent = '';
    promoMessage.className = 'promo-message';
    updateTotals();
}

applyPromoBtn?.addEventListener('click', applyPromoCode);

// Allow Enter key to apply promo code
promoCodeInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        applyPromoCode();
    }
});

// Initialize cart page
document.addEventListener('DOMContentLoaded', () => {
    waitForApiReady()
        .then(() => {
            if (!window.nhRequireLogin()) return;
            return refreshCart();
        })
        .catch(err => {
            cartItems = [];
            displayCartItems();
            updateTotals();
            showNotification(err.message || 'Failed to load cart');
        });
});