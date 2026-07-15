const root = document.getElementById('ordersRoot');
const CANCEL_WINDOW_DAYS = 3;
let loadedOrders = [];

function money(n) {
  return `PKR (Rs.) ${Number(n || 0).toFixed(2)}`;
}

function canCancelOrder(o) {
  const status = String(o.status || '').toLowerCase();
  if (status === 'delivered' || status === 'cancelled') return false;
  const createdAt = o.created_at ? new Date(o.created_at).getTime() : NaN;
  if (!Number.isFinite(createdAt)) return false;
  const deadline = createdAt + CANCEL_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  return Date.now() <= deadline;
}

function cancelDeadlineText(o) {
  const deadline = o.cancel_deadline ? new Date(o.cancel_deadline) : null;
  if (deadline && !Number.isNaN(deadline.getTime())) return deadline.toLocaleString();
  const createdAt = o.created_at ? new Date(o.created_at).getTime() : NaN;
  if (!Number.isFinite(createdAt)) return '';
  return new Date(createdAt + CANCEL_WINDOW_DAYS * 24 * 60 * 60 * 1000).toLocaleString();
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

function render(orders) {
  if (!Array.isArray(orders) || orders.length === 0) {
    root.innerHTML = `
      <div class="empty-orders">
        <h3>No orders yet</h3>
        <p>When you place an order, it will show up here.</p>
        <a href="product.html" class="btn-primary">Browse Products</a>
      </div>
    `;
    return;
  }

  root.innerHTML = orders.map(o => {
    const date = o.created_at ? new Date(o.created_at).toLocaleString() : '';
    const delivery = o.estimated_delivery_date ? new Date(o.estimated_delivery_date).toLocaleDateString() : '';
    const status = String(o.status || 'processing').toLowerCase();
    const statusLabel = status === 'pending' ? 'Pending'
      : status === 'processing' ? 'Processing'
      : status === 'shipped' ? 'Shipped'
      : status === 'delivered' ? 'Delivered'
      : status === 'cancelled' ? 'Cancelled'
      : String(o.status || '').replace(/^./, (c) => c.toUpperCase());
    const statusClass = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'].includes(status) ? status : 'processing';
    const allowCancel = (typeof o.can_cancel === 'boolean') ? o.can_cancel : canCancelOrder(o);
    const deadlineText = cancelDeadlineText(o);
    let shipping = o.shipping_address;
    try {
      if (typeof shipping === 'string') shipping = JSON.parse(shipping);
    } catch (_) {}
    const addressLine = shipping && typeof shipping === 'object'
      ? `${shipping.house_number || ''} ${shipping.street || ''}, ${shipping.town || ''}, ${shipping.city || ''}, ${shipping.country || 'Pakistan'}`.replace(/\s+/g, ' ').replace(/,\s*,/g, ',').trim()
      : '';
    const itemsHtml = (o.items || []).map(it => {
      const parts = [];
      if (it.color) parts.push(`Color: ${it.color}`);
      if (it.size) parts.push(`Size: ${it.size}`);
      const variantText = parts.length ? ` • ${parts.join(' • ')}` : '';
      return `
      <div class="order-item-row">
        <img src="${it.image || 'images/logo.png'}" alt="${it.product_name || ''}">
        <div>
          <div class="order-item-name">${it.product_name || 'Item'}</div>
          <div class="order-item-sub">Qty: ${it.quantity} • Unit: ${money(it.unit_price || it.price)}${variantText}</div>
        </div>
        <div class="order-item-total">${money(Number(it.unit_price || it.price) * Number(it.quantity || 0))}</div>
      </div>
    `;
    }).join('');

        const discountPct = o.discount_percentage != null 
          ? Number(o.discount_percentage) 
          : (Number(o.subtotal) > 0 ? (Number(o.discount_total) / Number(o.subtotal) * 100) : 0);
        const discountLabel = o.promo_code
          ? `Discount (${o.promo_code} - ${discountPct.toFixed(0)}%)`
          : `Discount (${discountPct.toFixed(0)}%)`;

        return `
          <div class="order-card">
            <div class="order-head">
              <div>
                <h3>Order #${o.order_id}</h3>
                <div class="order-meta-row">
                  <span class="status-chip ${statusClass}">${statusLabel}</span>
                  <span class="order-meta">${date} • ${o.payment_method}</span>
                  ${delivery ? `<span class="delivery-pill">${status === 'delivered' ? 'Delivered on' : 'ETA'}: ${delivery}</span>` : ''}
                </div>
                ${o.phone ? `<div class="order-meta">Phone: ${o.phone}</div>` : ''}
                ${addressLine ? `<div class="order-meta">Address: ${addressLine}</div>` : ''}
                <div class="order-actions">
                  <button
                    type="button"
                    class="btn-secondary order-cancel-btn"
                    data-cancel-order-id="${o.order_id}"
                    ${allowCancel ? '' : 'disabled'}
                    title="${allowCancel ? 'Cancel this order' : (deadlineText ? `Cancel available until ${deadlineText}` : 'Cancel unavailable')}"
                  >
                    Cancel Order
                  </button>
                  <button
                    type="button"
                    class="btn-primary download-invoice-btn"
                    data-invoice-order-id="${o.order_id}"
                    title="Download professional PDF invoice"
                  >
                    <i class="fas fa-file-pdf"></i> Download Invoice
                  </button>
                  ${!allowCancel && deadlineText && status !== 'delivered' && status !== 'cancelled'
                    ? `<span class="cancel-note">Cancel available until ${deadlineText}</span>`
                    : ''
                  }
                </div>
              </div>
              <div style="font-weight:900;">${money(o.total_amount)}</div>
            </div>
            <div class="order-body">
              <div class="order-items">${itemsHtml}</div>
              <div class="order-totals">
                <div class="totals-box">
                  <div class="totals-row"><span>Subtotal</span><b>${money(o.subtotal)}</b></div>
                  <div class="totals-row"><span>${discountLabel}</span><b>-${money(o.discount_total)}</b></div>
              <div class="totals-row"><span>Shipping</span><b>${money(o.shipping)}</b></div>
              <div class="totals-row"><span>Tax</span><b>${money(o.tax)}</b></div>
              <div class="totals-row total"><span>Total</span><span>${money(o.total_amount)}</span></div>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

async function load() {
  await waitForApiReady();
  if (!window.nhRequireLogin()) return;

  const data = await window.nhApiRequest('/orders', {}, { auth: true });
  loadedOrders = data.orders || [];
  render(loadedOrders);
  if (typeof window.updateCartCount === 'function') window.updateCartCount();
  if (typeof window.updateWishlistCount === 'function') window.updateWishlistCount();
}

root?.addEventListener('click', async (e) => {
  const invoiceBtn = e.target?.closest?.('[data-invoice-order-id]');
  if (invoiceBtn) {
    const orderId = invoiceBtn.getAttribute('data-invoice-order-id');
    const order = loadedOrders.find(o => String(o.order_id) === String(orderId));
    if (order && window.downloadInvoicePDF) {
      window.downloadInvoicePDF(order);
    }
    return;
  }

  const btn = e.target?.closest?.('[data-cancel-order-id]');
  if (!btn) return;
  const orderId = btn.getAttribute('data-cancel-order-id');
  if (!orderId) return;

  const ok = confirm('Cancel this order? You can only cancel within 3 days of placing it.');
  if (!ok) return;

  try {
    btn.disabled = true;
    btn.textContent = 'Cancelling...';
    await window.nhApiRequest(`/orders/${encodeURIComponent(orderId)}/cancel`, { method: 'POST' }, { auth: true });
    await load();
  } catch (err) {
    alert(err.message || 'Failed to cancel order');
    btn.disabled = false;
    btn.textContent = 'Cancel Order';
  }
});

document.addEventListener('DOMContentLoaded', () => {
  load().catch(err => {
    root.innerHTML = `<div class="empty-orders"><h3>Failed to load orders</h3><p>${err.message || ''}</p></div>`;
  });
});

