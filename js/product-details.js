const detailsEl = document.getElementById('productDetails');
const breadcrumbName = document.getElementById('breadcrumbName');

function getProductId() {
  const params = new URLSearchParams(window.location.search);
  return Number(params.get('id'));
}

function parseSizes(sizes) {
  if (!sizes) return [];
  if (Array.isArray(sizes)) return sizes;
  if (typeof sizes === 'string') {
    // allow comma-separated or JSON string
    try {
      const parsed = JSON.parse(sizes);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
    return sizes.split(',').map(s => s.trim()).filter(Boolean);
  }
  return [];
}

function parseStringArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.filter(Boolean);
    } catch {}
    return value.split(',').map(s => s.trim()).filter(Boolean);
  }
  return [];
}

function isCssColorToken(v) {
  const s = String(v || '').trim();
  return s.startsWith('#') || s.startsWith('rgb(') || s.startsWith('hsl(');
}

function colorToCss(color) {
  const c = String(color || '').trim().toLowerCase();
  if (!c) return '#999';
  if (isCssColorToken(c)) return c;
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

async function loadProduct() {
  const id = getProductId();
  if (!Number.isFinite(id)) {
    detailsEl.innerHTML = `<div class="pd-card"><div class="pd-info"><h2 class="pd-title">Invalid product</h2></div></div>`;
    return;
  }

  try {
    let data;
    if (typeof window.nhApiRequest === 'function') {
      data = await window.nhApiRequest(`/products/${id}`);
    } else {
      // Fallback if global helper is not ready for some reason
      const res = await fetch(`http://localhost:5000/api/products/${id}`);
      data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || 'Failed to load product');
      }
    }
    const p = data.product;
    const images = parseStringArray(p.images || []).slice(0, 3);
    const colors = parseStringArray(p.colors || []);
    const product = {
      id: p.id,
      name: p.product_name,
      price: Number(p.price),
      oldPrice: p.old_price == null ? null : Number(p.old_price),
      category: p.category,
      image: images[0] || p.image || 'images/logo.png',
      images: images.length ? images : (p.image ? [p.image] : []),
      colors,
      description: p.description || '',
      sizes: parseSizes(p.sizes),
      stock: typeof p.stock === 'number' ? p.stock : Number(p.stock || 0)
    };

    breadcrumbName.textContent = product.name;

    const inStock = product.stock > 0;
    const stockText = inStock ? `In stock (${product.stock})` : 'Out of stock';
    const hasDiscount = product.oldPrice != null && product.oldPrice > product.price;

    const sizesHtml = product.sizes.length
      ? `<div class="pd-sizes" id="pdSizes">${product.sizes.map(s => `<button type="button" class="pd-size" data-size="${s}">${s}</button>`).join('')}</div>`
      : '';

    const galleryHtml = (() => {
      const imgs = (product.images && product.images.length ? product.images : [product.image]).slice(0, 3);
      if (imgs.length <= 1) {
        return `<img src="${product.image}" alt="${product.name}" loading="lazy">`;
      }
      return `
        <div class="pd-gallery">
          <img class="pd-main-img" id="pdMainImg" src="${imgs[0]}" alt="${product.name}" loading="lazy">
          <div class="pd-thumbs" id="pdThumbs">
            ${imgs.map((src, idx) => `
              <button type="button" class="pd-thumb ${idx === 0 ? 'active' : ''}" data-src="${src}">
                <img src="${src}" alt="${product.name} image ${idx + 1}" loading="lazy">
              </button>
            `).join('')}
          </div>
        </div>
      `;
    })();

    const colorsHtml = product.colors.length
      ? `
        <div class="pd-colors">
          <div class="pd-label">Colors</div>
          <div class="pd-color-list" id="pdColors">
            ${product.colors.map((c) => `
              <button
                type="button"
                class="pd-color"
                data-color="${c}"
                aria-label="Color option"
                style="--swatch:${colorToCss(c)}"
              >
                <span class="pd-swatch" aria-hidden="true"></span>
              </button>
            `).join('')}
          </div>
        </div>
      `
      : '';

    detailsEl.innerHTML = `
      <div class="pd-card pd-image">
        ${galleryHtml}
      </div>
      <div class="pd-card pd-info">
        <h1 class="pd-title">${product.name}</h1>
        <div class="pd-meta">
          <div class="pd-price">
            PKR (Rs.) ${product.price.toFixed(2)}
            ${hasDiscount ? `<span class="pd-old-price">PKR (Rs.) ${product.oldPrice.toFixed(2)}</span>` : ''}
          </div>
          <div class="pd-stock">${stockText}</div>
        </div>
        <div class="pd-desc">${product.description || 'No description available.'}</div>
        ${colorsHtml}
        ${sizesHtml}
        <div class="pd-actions">
          <button class="btn-primary" id="addToCartBtn" ${inStock ? '' : 'disabled'}>
            <i class="fas fa-shopping-cart"></i> Add to Cart
          </button>
          <button class="btn-secondary" id="addToWishlistBtn">
            <i class="fas fa-heart"></i> Add to Wishlist
          </button>
        </div>
      </div>
    `;

    let selectedSize = null;
    let selectedColor = null;
    const sizesWrap = document.getElementById('pdSizes');
    if (sizesWrap) {
      sizesWrap.addEventListener('click', (e) => {
        const btn = e.target.closest('.pd-size');
        if (!btn) return;
        sizesWrap.querySelectorAll('.pd-size').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedSize = btn.getAttribute('data-size');
      });
    }

    const thumbs = document.getElementById('pdThumbs');
    const mainImg = document.getElementById('pdMainImg');
    if (thumbs && mainImg) {
      thumbs.addEventListener('click', (e) => {
        const btn = e.target.closest('.pd-thumb');
        if (!btn) return;
        const src = btn.getAttribute('data-src');
        if (!src) return;
        thumbs.querySelectorAll('.pd-thumb').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        mainImg.classList.add('fade-out');
        const swap = () => {
          mainImg.removeEventListener('transitionend', swap);
          mainImg.setAttribute('src', src);
          requestAnimationFrame(() => mainImg.classList.remove('fade-out'));
        };
        mainImg.addEventListener('transitionend', swap);
      });
    }

    const colorsWrap = document.getElementById('pdColors');
    if (colorsWrap) {
      colorsWrap.addEventListener('click', (e) => {
        const btn = e.target.closest('.pd-color');
        if (!btn) return;
        colorsWrap.querySelectorAll('.pd-color').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedColor = btn.getAttribute('data-color');
      });
    }

    document.getElementById('addToCartBtn')?.addEventListener('click', () => {
      // Keep backend compatibility: pass only id/quantity (extra fields ignored in some setups)
      window.addToCart({ id: product.id, quantity: 1, size: selectedSize, color: selectedColor });
    });

    document.getElementById('addToWishlistBtn')?.addEventListener('click', async () => {
      try {
        await window.nhAddToWishlist(product.id);
        if (typeof window.updateWishlistCount === 'function') window.updateWishlistCount();
        if (typeof window.showNotification === 'function') window.showNotification('Added to wishlist!');
        else alert('Added to wishlist!');
      } catch (err) {
        if (typeof window.showNotification === 'function') window.showNotification(err.message || 'Wishlist failed');
        else alert(err.message || 'Wishlist failed');
      }
    });
  } catch (err) {
    detailsEl.innerHTML = `<div class="pd-card"><div class="pd-info"><h2 class="pd-title">Failed to load product</h2><p>${err.message || ''}</p></div></div>`;
  }
}

document.addEventListener('DOMContentLoaded', loadProduct);

