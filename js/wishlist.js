// Wishlist Page JavaScript (SQL-backed; login required)
const wishlistGrid = document.getElementById('wishlistItems');
const clearWishlistBtn = document.getElementById('clearWishlist');
const emptyWishlistMsg = document.getElementById('emptyWishlist');
const wishlistActions = document.getElementById('wishlistActions');
const moveAllToCartBtn = document.getElementById('moveAllToCart');
const wishlistCountElement = document.getElementById('wishlistCount');

let wishlist = [];

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

async function refreshWishlist() {
    const data = await window.nhApiRequest('/wishlist', {}, { auth: true });
    wishlist = data.products || [];
    displayWishlistItems();
    updateWishlistCountUI();
    if (typeof window.updateCartCount === 'function') window.updateCartCount();
    if (typeof window.updateWishlistCount === 'function') window.updateWishlistCount();
}

// Update wishlist count (page UI only)
function updateWishlistCountUI() {
    const count = wishlist.length;
    wishlistCountElement.textContent = count;
    
    // Update navbar counts
    document.querySelectorAll('.wishlist-count, .wishlist-count-mobile').forEach(el => {
        el.textContent = count;
    });
    
    // Show/hide empty message
    if (count === 0) {
        emptyWishlistMsg.style.display = 'block';
        wishlistActions.style.display = 'none';
    } else {
        emptyWishlistMsg.style.display = 'none';
        wishlistActions.style.display = 'block';
    }
}

// Note: do not declare global updateWishlistCount here (main.js owns it)

// Display wishlist items
function displayWishlistItems() {
    wishlistGrid.innerHTML = '';
    
    wishlist.forEach((item, index) => {
        const wishlistItem = document.createElement('div');
        wishlistItem.className = 'wishlist-item';
        wishlistItem.innerHTML = `
            <div class="wishlist-image">
                <img src="${item.image || 'images/logo.png'}" alt="${item.product_name}">
                <button class="remove-wishlist" data-index="${index}">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="wishlist-info">
                <h3 class="wishlist-title">${item.product_name}</h3>
                <div class="wishlist-price">${formatCurrency(Number(item.price).toFixed(2))}</div>
                <div class="wishlist-item-actions">
                    <button class="move-to-cart" data-index="${index}">
                        <i class="fas fa-shopping-cart"></i> Add to Cart
                    </button>
                    <a href="product-details.html?id=${item.id}" class="view-details">View Details</a>
                </div>
            </div>
        `;
        
        wishlistGrid.appendChild(wishlistItem);
    });
    
    // Add event listeners
    addWishlistEventListeners();
}

// Add event listeners to wishlist items
function addWishlistEventListeners() {
    // Remove from wishlist buttons
    document.querySelectorAll('.remove-wishlist').forEach(button => {
        button.addEventListener('click', async (e) => {
            const index = parseInt(button.getAttribute('data-index'));
            const item = wishlist[index];
            try {
                await window.nhRemoveFromWishlist(item.id);
            } catch (err) {
                showNotification(err.message || 'Failed to remove');
                return;
            }
            await refreshWishlist();
            if (typeof window.updateWishlistCount === 'function') window.updateWishlistCount();
            showNotification('Removed from wishlist');
        });
    });
    
    // Move to cart buttons
    document.querySelectorAll('.move-to-cart').forEach(button => {
        button.addEventListener('click', async (e) => {
            const index = parseInt(button.getAttribute('data-index'));
            const item = wishlist[index];

            try {
                await window.nhApiRequest('/cart', { method: 'POST', body: JSON.stringify({ product_id: item.id, quantity: 1 }) }, { auth: true });
                await window.nhRemoveFromWishlist(item.id);
            } catch (err) {
                showNotification(err.message || 'Failed to add to cart');
                return;
            }
            
            // Update displays
            await refreshWishlist();
            if (typeof window.updateCartCount === 'function') window.updateCartCount();
            if (typeof window.updateWishlistCount === 'function') window.updateWishlistCount();
            
            showNotification('Added to cart');
        });
    });
}

// Clear wishlist
clearWishlistBtn.addEventListener('click', async () => {
    if (wishlist.length > 0) {
        if (confirm('Are you sure you want to clear your wishlist?')) {
            try {
                await Promise.all(wishlist.map(item => window.nhRemoveFromWishlist(item.id)));
            } catch (err) {
                showNotification(err.message || 'Failed to clear wishlist');
                return;
            }
            await refreshWishlist();
            if (typeof window.updateWishlistCount === 'function') window.updateWishlistCount();
            showNotification('Wishlist cleared');
        }
    }
});

// Move all to cart
moveAllToCartBtn.addEventListener('click', async () => {
    if (wishlist.length > 0) {
        try {
            for (const item of wishlist) {
                await window.nhApiRequest('/cart', { method: 'POST', body: JSON.stringify({ product_id: item.id, quantity: 1 }) }, { auth: true });
            }
            await Promise.all(wishlist.map(item => window.nhRemoveFromWishlist(item.id)));
        } catch (err) {
            showNotification(err.message || 'Failed to move all');
            return;
        }
        
        // Update displays
        await refreshWishlist();
        if (typeof window.updateCartCount === 'function') window.updateCartCount();
        if (typeof window.updateWishlistCount === 'function') window.updateWishlistCount();
        
        showNotification('All items moved to cart');
    }
});

async function loadWishlist() {
    await refreshWishlist();
}

document.addEventListener('DOMContentLoaded', () => {
    waitForApiReady()
        .then(() => {
            if (!window.nhRequireLogin()) return;
            return loadWishlist();
        })
        .catch(err => {
            wishlist = [];
            displayWishlistItems();
            updateWishlistCountUI();
            showNotification(err.message || 'Failed to load wishlist');
        });
});