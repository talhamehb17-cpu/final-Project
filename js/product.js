// Products Page JavaScript (SQL-backed via backend API)
const productsGrid = document.querySelector('.products-grid');
const searchInput = document.getElementById('searchInput');
const categoryFilters = document.querySelectorAll('.filter-options input[type="checkbox"]');
const priceSlider = document.getElementById('priceSlider');
const sortSelect = document.getElementById('sortSelect');
const applyFiltersBtn = document.getElementById('applyFilters');
const resetFiltersBtn = document.getElementById('resetFilters');

let products = [];
let filteredProducts = [];
let wishlistIds = new Set();
const DEFAULT_MAX_PRICE = 1000;

function normalizeCategory(value) {
    return String(value || '').trim().toLowerCase();
}

function colorToCss(color) {
    const c = String(color || '').trim().toLowerCase();
    if (!c) return '#999';
    if (c.startsWith('#') || c.startsWith('rgb(') || c.startsWith('hsl(')) return c;
    const map = {
        black: '#111111',
        white: '#ffffff',
        gray: '#808080',
        grey: '#808080',
        silver: '#c0c0c0',
        gold: '#d4af37',
        brown: '#6b4423',
        beige: '#f5f5dc',
        navy: '#001f3f',
        blue: '#1e3a8a',
        red: '#c62828',
        green: '#2e7d32',
        pink: '#ec407a',
        purple: '#6a1b9a',
        yellow: '#f9a825',
        orange: '#ef6c00'
    };
    return map[c] || '#999';
}

function mapProduct(p) {
    const images = Array.isArray(p.images)
        ? p.images.filter(Boolean).slice(0, 3)
        : (p.image ? [p.image] : []);
    const colors = Array.isArray(p.colors)
        ? p.colors.filter(Boolean)
        : [];
    return {
        id: p.id,
        name: p.product_name,
        price: Number(p.price),
        oldPrice: p.old_price == null ? null : Number(p.old_price),
        category: normalizeCategory(p.category),
        image: (images[0] || p.image || 'images/logo.png'),
        images,
        colors,
        description: p.description || '',
        sizes: p.sizes || '',
        stock: typeof p.stock === 'number' ? p.stock : Number(p.stock || 0)
    };
}

async function loadWishlistIdsIfLoggedIn() {
    try {
        if (typeof window.nhApiRequest !== 'function') return;
        const token = localStorage.getItem('nighthowls_token');
        if (!token) return;
        const data = await window.nhApiRequest('/wishlist', {}, { auth: true });
        wishlistIds = new Set((data.products || []).map(p => p.id));
        if (typeof window.updateWishlistCount === 'function') window.updateWishlistCount();
    } catch {
        wishlistIds = new Set();
    }
}

function syncPriceRangeFromProducts() {
    if (!priceSlider) return;

    const highestPrice = products.reduce((max, product) => {
        const price = Number(product.price);
        return Number.isFinite(price) ? Math.max(max, price) : max;
    }, 0);

    const nextMax = Math.max(DEFAULT_MAX_PRICE, Math.ceil(highestPrice / 100) * 100 || DEFAULT_MAX_PRICE);
    const previousValue = Number(priceSlider.value);

    priceSlider.min = '0';
    priceSlider.max = String(nextMax);
    priceSlider.value = String(
        Number.isFinite(previousValue) && previousValue <= nextMax ? previousValue : nextMax
    );

    const maxLabel = document.querySelector('.price-values span:last-child');
    if (maxLabel) maxLabel.textContent = `PKR (Rs.) ${priceSlider.value}`;
}

function applyCategoryFromUrl() {
    const category = normalizeCategory(new URLSearchParams(window.location.search).get('category'));
    if (!category) return;

    categoryFilters.forEach((checkbox) => {
        checkbox.checked = normalizeCategory(checkbox.value) === category;
    });
}

async function loadProducts() {
    const data = await window.nhApiRequest('/products');
    products = (data.products || []).map(mapProduct);
    syncPriceRangeFromProducts();
    // Remove automatic filter application - show all products by default
    displayProducts(products);
}

// Display Products
function displayProducts(productsToDisplay) {
    productsGrid.innerHTML = '';
    
    if (productsToDisplay.length === 0) {
        productsGrid.innerHTML = `
            <div class="no-products">
                <h3>No products found</h3>
                <p>Try adjusting your search or filters</p>
            </div>
        `;
        return;
    }
    
    productsToDisplay.forEach(product => {
        const isInWishlist = wishlistIds.has(product.id);
        const inStock = Number(product.stock || 0) > 0;
        const hasDiscount = product.oldPrice != null && product.oldPrice > product.price;
        const discountPct = hasDiscount ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100) : 0;
        
        const productCard = document.createElement('div');
        productCard.className = 'product-card';
        productCard.dataset.productId = String(product.id);
        const imgs = (product.images && product.images.length ? product.images : [product.image]).slice(0, 3);
        const dots = imgs.length > 1
            ? `<div class="pm-dots" aria-label="Product images">
                 ${imgs.map((_, idx) => `<button type="button" class="pm-dot ${idx === 0 ? 'active' : ''}" data-idx="${idx}" aria-label="Image ${idx + 1}"></button>`).join('')}
               </div>`
            : '';
        productCard.innerHTML = `
            <div class="product-image">
                <div class="product-badges">
                    <span class="badge badge-category">${product.category}</span>
                    <span class="badge ${inStock ? 'badge-stock' : 'badge-oos'}">${inStock ? 'In Stock' : 'Out of Stock'}</span>
                    ${hasDiscount ? `<span class="badge badge-discount">-${discountPct}%</span>` : ''}
                </div>
                <a href="product-details.html?id=${product.id}">
                    <div class="product-media" data-images="${encodeURIComponent(JSON.stringify(imgs))}">
                        ${imgs.map((src, idx) => `<img src="${src}" alt="${product.name}" loading="lazy" class="pm-img ${idx === 0 ? 'active' : ''}" data-idx="${idx}" onerror="this.src='data:image/svg+xml;charset=UTF-8,<svg xmlns=\\\"http://www.w3.org/2000/svg\\\" width=\\\"200\\\" height=\\\"200\\\"><rect width=\\\"100%\\\" height=\\\"100%\\\" fill=\\\"%23f5f5f5\\\"/><text x=\\\"50%\\\" y=\\\"50%\\\" font-family=\\\"Arial\\\" font-size=\\\"14\\\" fill=\\\"%23666\\\" text-anchor=\\\"middle\\\" dy=\\\".3em\\\">${product.name}</text></svg>'">`).join('')}
                        ${dots}
                    </div>
                </a>
            </div>
            <div class="product-info">
                <div class="product-topline">
                    <h3 class="product-title"><a href="product-details.html?id=${product.id}">${product.name}</a></h3>
                    <div class="product-price">
                        <span class="price-pill">PKR (Rs.) ${Number(product.price).toFixed(2)}</span>
                        ${hasDiscount ? `<span class="old-price">PKR (Rs.) ${Number(product.oldPrice).toFixed(2)}</span>` : ''}
                    </div>
                </div>
                <div class="product-subtitle">${product.category}</div>
                ${product.colors && product.colors.length ? `<div class="product-colors" aria-label="Available colors">
                    ${product.colors.slice(0, 6).map((c, idx) => `
                        <button
                            type="button"
                            class="color-swatch ${idx === 0 ? 'active' : ''}"
                            data-color="${c}"
                            aria-label="Color option"
                            style="--swatch:${colorToCss(c)}"
                        ></button>
                    `).join('')}
                </div>` : ''}
                <div class="product-actions">
                    <button class="wishlist-btn ${isInWishlist ? 'active' : ''}" data-id="${product.id}">
                        <i class="${isInWishlist ? 'fas' : 'far'} fa-heart"></i>
                    </button>
                    <button class="add-to-cart" data-id="${product.id}" ${inStock ? '' : 'disabled'}>${inStock ? 'Add to Cart' : 'Out of Stock'}</button>
                </div>
            </div>
        `;
        
        productsGrid.appendChild(productCard);
    });
    
    // Add event listeners to newly created buttons
    addProductEventListeners();
}

function setActiveCardImage(mediaEl, idx) {
    const imgs = mediaEl.querySelectorAll('.pm-img');
    const dots = mediaEl.querySelectorAll('.pm-dot');
    imgs.forEach(img => img.classList.toggle('active', String(img.getAttribute('data-idx')) === String(idx)));
    dots.forEach(dot => dot.classList.toggle('active', String(dot.getAttribute('data-idx')) === String(idx)));
}

productsGrid?.addEventListener('click', (e) => {
    const dot = e.target?.closest?.('.pm-dot');
    if (!dot) return;
    e.preventDefault();
    const media = dot.closest('.product-media');
    if (!media) return;
    const idx = dot.getAttribute('data-idx');
    setActiveCardImage(media, idx);
});

productsGrid?.addEventListener('click', (e) => {
    const swatch = e.target?.closest?.('.color-swatch');
    if (!swatch) return;
    e.preventDefault();
    const wrap = swatch.closest('.product-colors');
    if (!wrap) return;
    wrap.querySelectorAll('.color-swatch').forEach(b => b.classList.remove('active'));
    swatch.classList.add('active');
});

productsGrid?.addEventListener('click', (e) => {
    const interactive = e.target?.closest?.(
        '.wishlist-btn, .add-to-cart, .pm-dot, .color-swatch'
    );
    if (interactive) {
        return;
    }
    const card = e.target?.closest?.('.product-card');
    if (!card) return;
    const id = card.dataset.productId;
    if (!id) return;
    window.location.href = `product-details.html?id=${encodeURIComponent(id)}`;
});

// Filter Products — always runs against the full in-memory `products` array
function filterProducts() {
    const searchTerm = (searchInput?.value || '').trim().toLowerCase();
    const selectedCategories = Array.from(categoryFilters)
        .filter(checkbox => checkbox.checked)
        .map(checkbox => normalizeCategory(checkbox.value));
    
    const maxPrice = Number(priceSlider?.value);
    const sortOption = sortSelect?.value || 'default';
    
    let result = products.filter(product => {
        const productName = String(product.name || '').toLowerCase();
        const productCategory = normalizeCategory(product.category);
        const productDescription = String(product.description || '').toLowerCase();
        const productPrice = Number(product.price);

        // Search filter
        const matchesSearch = !searchTerm ||
            productName.includes(searchTerm) ||
            productCategory.includes(searchTerm) ||
            productDescription.includes(searchTerm);
        
        // Category filter
        const matchesCategory = selectedCategories.length === 0 ||
            selectedCategories.includes(productCategory);
        
        // Price filter
        const matchesPrice = Number.isFinite(productPrice) &&
            Number.isFinite(maxPrice) &&
            productPrice <= maxPrice;
        
        return matchesSearch && matchesCategory && matchesPrice;
    });
    
    // Sort products
    result.sort((a, b) => {
        switch (sortOption) {
            case 'price-low':
                return a.price - b.price;
            case 'price-high':
                return b.price - a.price;
            case 'name':
                return a.name.localeCompare(b.name);
            default:
                return 0;
        }
    });
    
    filteredProducts = result;
    displayProducts(result);
}

// Add event listeners to product buttons
function addProductEventListeners() {
    // Wishlist buttons
    document.querySelectorAll('.wishlist-btn').forEach(button => {
        button.addEventListener('click', async (e) => {
            const productId = parseInt(button.getAttribute('data-id'));
            const product = products.find(p => p.id === productId);
            
            const isInWishlist = wishlistIds.has(productId);
            try {
                if (isInWishlist) {
                    await window.nhRemoveFromWishlist(productId);
                    wishlistIds.delete(productId);
                    button.classList.remove('active');
                    button.innerHTML = '<i class="far fa-heart"></i>';
                    showNotification('Removed from wishlist');
                } else {
                    await window.nhAddToWishlist(productId);
                    wishlistIds.add(productId);
                    button.classList.add('active');
                    button.innerHTML = '<i class="fas fa-heart"></i>';
                    showNotification('Added to wishlist');
                }
                if (typeof window.updateWishlistCount === 'function') window.updateWishlistCount();
            } catch (err) {
                showNotification(err.message || 'Wishlist action failed');
            }
        });
    });
    
    // Add to cart buttons
    document.querySelectorAll('.add-to-cart').forEach(button => {
        button.addEventListener('click', (e) => {
            const productId = parseInt(button.getAttribute('data-id'));
            const product = products.find(p => p.id === productId);
            
            // Add to cart
            if (typeof addToCart === 'function') {
                addToCart(product);
            }
        });
    });
}

// Event Listeners
searchInput?.addEventListener('input', filterProducts);
categoryFilters.forEach((checkbox) => checkbox.addEventListener('change', filterProducts));
sortSelect?.addEventListener('change', filterProducts);
applyFiltersBtn?.addEventListener('click', filterProducts);
resetFiltersBtn.addEventListener('click', () => {
    searchInput.value = '';
    categoryFilters.forEach(checkbox => checkbox.checked = false);
    priceSlider.value = priceSlider.max || String(DEFAULT_MAX_PRICE);
    sortSelect.value = 'default';
    document.querySelector('.price-values span:last-child').textContent = `PKR (Rs.) ${priceSlider.value}`;
    filterProducts();
});

priceSlider.addEventListener('input', () => {
    document.querySelector('.price-values span:last-child').textContent = `PKR (Rs.) ${priceSlider.value}`;
});

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    loadWishlistIdsIfLoggedIn().finally(() => {
        loadProducts().catch(err => {
            productsGrid.innerHTML = `<div class="no-products"><h3>Failed to load products</h3><p>${err.message || ''}</p></div>`;
        });
    });
});