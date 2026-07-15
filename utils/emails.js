function formatMoney(n) {
  return `PKR (Rs.) ${Number(n || 0).toFixed(2)}`;
}

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function buildItemsTable(items) {
  const rows = (items || []).map((it) => {
    const name = escapeHtml(it.product_name);
    const img = escapeHtml(it.image || '');
    const qty = Number(it.quantity || 0);
    const price = Number(it.unit_price || it.price || 0);
    const old = it.old_price != null ? Number(it.old_price) : null;
    const color = it.color ? escapeHtml(it.color) : '';
    const size = it.size ? escapeHtml(it.size) : '';
    
    // Improved variant display with better styling
    let variantDisplay = '';
    if (color || size) {
      const variantBadges = [];
      if (color) {
        variantBadges.push(`<span style="display:inline-block; padding:4px 10px; background:rgba(255,193,7,0.15); border:1px solid rgba(255,193,7,0.3); border-radius:6px; font-size:13px; font-weight:600; color:#ffc107; margin-right:6px;">Color: ${color}</span>`);
      }
      if (size) {
        variantBadges.push(`<span style="display:inline-block; padding:4px 10px; background:rgba(99,102,241,0.15); border:1px solid rgba(99,102,241,0.3); border-radius:6px; font-size:13px; font-weight:600; color:#818cf8;">Size: ${size}</span>`);
      }
      variantDisplay = `<div style="margin-top:8px; display:flex; flex-wrap:wrap; gap:6px;">${variantBadges.join('')}</div>`;
    }
    
    return `
      <tr>
        <td style="padding:12px 10px; border-bottom:1px solid rgba(255,255,255,0.08);">
          <div style="display:flex; gap:12px; align-items:center;">
            <img src="${img}" alt="${name}" width="56" height="56" style="border-radius:12px; object-fit:cover; border:1px solid rgba(255,255,255,0.18);" />
            <div>
              <div style="font-weight:800; color:#ffffff;">${name}</div>
              <div style="color:rgba(255,255,255,0.75); font-size:12px; margin-top:4px;">Qty: ${qty}</div>
              ${variantDisplay}
            </div>
          </div>
        </td>
        <td style="padding:12px 10px; border-bottom:1px solid rgba(255,255,255,0.08); text-align:right; white-space:nowrap;">
          <div style="font-weight:900; color:#ffffff;">${formatMoney(price)}</div>
          ${old && old > price ? `<div style="color:rgba(255,255,255,0.65); font-size:12px; text-decoration:line-through;">${formatMoney(old)}</div>` : ''}
        </td>
        <td style="padding:12px 10px; border-bottom:1px solid rgba(255,255,255,0.08); text-align:right; font-weight:900; color:#ffffff;">
          ${formatMoney(price * qty)}
        </td>
      </tr>
    `;
  }).join('');

  return `
    <div style="margin-top:18px; border-radius:18px; overflow:hidden; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.12);">
      <table width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
        <thead>
          <tr style="background:rgba(255,255,255,0.06);">
            <th align="left" style="padding:12px 10px; font-size:12px; text-transform:uppercase; letter-spacing:1px; color:rgba(255,255,255,0.75);">Item</th>
            <th align="right" style="padding:12px 10px; font-size:12px; text-transform:uppercase; letter-spacing:1px; color:rgba(255,255,255,0.75);">Unit</th>
            <th align="right" style="padding:12px 10px; font-size:12px; text-transform:uppercase; letter-spacing:1px; color:rgba(255,255,255,0.75);">Total</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
  `;
}

function totalsBox({ subtotal, discountTotal, shipping, tax, total, promoCode, discountPercentage }) {
  const discountPct = discountPercentage != null
    ? Number(discountPercentage)
    : (Number(subtotal) > 0 ? (Number(discountTotal) / Number(subtotal) * 100) : 0);
  const discountLabel = promoCode
    ? `Discount (${escapeHtml(promoCode)} - ${discountPct.toFixed(0)}%)`
    : `Discount (${discountPct.toFixed(0)}%)`;

  return `
    <div style="margin-top:18px; display:flex; justify-content:flex-end;">
      <div style="min-width:280px; border-radius:16px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.12); padding:14px 16px;">
        <div style="display:flex; justify-content:space-between; padding:6px 0; color:rgba(255,255,255,0.85);">
          <span>Subtotal</span><b style="color:#fff;">${formatMoney(subtotal)}</b>
        </div>
        <div style="display:flex; justify-content:space-between; padding:6px 0; color:rgba(255,255,255,0.85);">
          <span>${discountLabel}</span><b style="color:#fff;">-${formatMoney(discountTotal)}</b>
        </div>
        <div style="display:flex; justify-content:space-between; padding:6px 0; color:rgba(255,255,255,0.85);">
          <span>Shipping</span><b style="color:#fff;">${formatMoney(shipping)}</b>
        </div>
        <div style="display:flex; justify-content:space-between; padding:6px 0; color:rgba(255,255,255,0.85);">
          <span>Tax</span><b style="color:#fff;">${formatMoney(tax)}</b>
        </div>
        <div style="display:flex; justify-content:space-between; padding:10px 0; border-top:1px solid rgba(255,255,255,0.12); margin-top:6px; font-size:16px;">
          <span style="font-weight:900; color:#fff;">Total</span><span style="font-weight:900; color:#fff;">${formatMoney(total)}</span>
        </div>
      </div>
    </div>
  `;
}

function orderCustomerEmailHtml({
  brandName,
  customerName,
  orderId,
  createdAt,
  deliveryText,
  deliveryDate,
  items,
  subtotal,
  discountTotal,
  shipping,
  tax,
  total,
  contactEmail,
  contactPhone,
  paymentMethod,
  promoCode,
  discountPercentage,
  status
}) {
  const safeBrand = escapeHtml(brandName || 'Nighthowls');
  const safeName = escapeHtml(customerName || 'Customer');
  const safeDelivery = escapeHtml(deliveryText || 'Your order will be delivered in 7 days (1 week).');
  const dateStr = createdAt ? new Date(createdAt).toLocaleString() : '';
  const deliveryDateStr = deliveryDate ? escapeHtml(new Date(deliveryDate).toLocaleDateString()) : '';
  const safePaymentMethod = escapeHtml(paymentMethod || 'COD');

  // Determine payment display text and icon
  let paymentDisplay = '';
  let paymentBadge = '';
  if (paymentMethod === 'EasyPaisa') {
    paymentDisplay = `<div style="font-weight:900; letter-spacing:0.4px; white-space:nowrap;">EasyPaisa <span style="font-weight:700; opacity:.9;">(Online Payment)</span></div>`;
    paymentBadge = `<div style="margin-top:8px; display:inline-flex; align-items:center; gap:8px; padding:6px 10px; border-radius:999px; border:1px solid rgba(255,255,255,0.12); background:rgba(255,255,255,0.06); font-size:12px; color:rgba(255,255,255,0.9);">
      <span style="width:6px; height:6px; border-radius:999px; background:#22c55e; display:inline-block;"></span>
      Pakistan • Online Payment
    </div>`;
  } else {
    paymentDisplay = `<div style="font-weight:900; letter-spacing:0.4px; white-space:nowrap;">COD <span style="font-weight:700; opacity:.9;">(Cash on Delivery)</span></div>`;
    paymentBadge = `<div style="margin-top:8px; display:inline-flex; align-items:center; gap:8px; padding:6px 10px; border-radius:999px; border:1px solid rgba(255,255,255,0.12); background:rgba(255,255,255,0.06); font-size:12px; color:rgba(255,255,255,0.9);">
      <span style="width:6px; height:6px; border-radius:999px; background:#ffc107; display:inline-block;"></span>
      Pakistan • COD
    </div>`;
  }

  return `
  <div style="background:#0a0a0a; padding:26px; font-family: Arial, Helvetica, sans-serif;">
    <div style="max-width:760px; margin:0 auto; border-radius:22px; overflow:hidden; border:1px solid rgba(255,255,255,0.12);">
      <div style="padding:26px 24px; background: radial-gradient(1200px 500px at 20% 0%, rgba(255, 193, 7, 0.25), rgba(0,0,0,0)), linear-gradient(135deg, #101010, #070707); color:#fff;">
        <div style="display:flex; justify-content:space-between; gap:16px; align-items:flex-start;">
          <div>
            <div style="font-size:12px; letter-spacing:3px; opacity:.85;">${safeBrand.toUpperCase()}</div>
            <div style="font-size:26px; font-weight:900; margin-top:10px;">Thank You for Shopping with Us!</div>
            <div style="margin-top:8px; opacity:.85;">Order #${escapeHtml(orderId)} ${dateStr ? `• ${escapeHtml(dateStr)}` : ''}</div>
            <div style="margin-top:4px; opacity:.85; font-size:13px;">Status: <b style="color:#fff; text-transform:uppercase;">${escapeHtml(status || 'Pending')}</b></div>
            ${deliveryDateStr ? `<div style="margin-top:6px; font-size:13px; opacity:.85;">ETA: <b style="color:#fff;">${deliveryDateStr}</b></div>` : ''}
          </div>
          <div style="padding:10px 12px; border-radius:14px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.12);">
            <div style="font-size:12px; opacity:.8; text-align:right;">Payment</div>
            <div style="display:flex; align-items:center; justify-content:flex-end; gap:8px; margin-top:4px;">
              <span style="display:inline-flex; width:18px; height:18px;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M4.5 7.5h15c.828 0 1.5.672 1.5 1.5v8.25c0 .828-.672 1.5-1.5 1.5h-15c-.828 0-1.5-.672-1.5-1.5V9c0-.828.672-1.5 1.5-1.5Z" stroke="rgba(255,255,255,0.92)" stroke-width="1.6" />
                  <path d="M3 10.5h18" stroke="rgba(255,255,255,0.55)" stroke-width="1.6" />
                  <path d="M7.25 15.25c0-1.657 1.343-3 3-3h3.5c1.657 0 3 1.343 3 3s-1.343 3-3 3h-3.5c-1.657 0-3-1.343-3-3Z" stroke="rgba(255,255,255,0.92)" stroke-width="1.6" />
                  <path d="M12 13.25v3.5" stroke="rgba(255,255,255,0.92)" stroke-width="1.6" stroke-linecap="round"/>
                </svg>
              </span>
              ${paymentDisplay}
            </div>
            ${paymentBadge}
          </div>
        </div>

        <div style="margin-top:18px; padding:16px 16px; border-radius:18px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.12);">
          <div style="font-size:16px; color:#fff;">Hi <b>${safeName}</b>,</div>
          <div style="margin-top:6px; color:rgba(255,255,255,0.82); line-height:1.55;">
            We hope you enjoy your shopping experience! ${safeDelivery}
          </div>
        </div>

        ${buildItemsTable(items)}
        ${totalsBox({ subtotal, discountTotal, shipping, tax, total, promoCode, discountPercentage })}

        <div style="margin-top:18px; padding:16px 16px; border-radius:18px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.12); color:rgba(255,255,255,0.9);">
          <div style="font-weight:900; margin-bottom:6px;">Need help?</div>
          <div style="font-size:13px; line-height:1.55;">
            For any complaints or inquiries, please contact us via email or phone.<br>
            <b>Email:</b> ${escapeHtml(contactEmail || 'support@nighthowls.com')}<br>
            <b>Phone:</b> ${escapeHtml(contactPhone || '+92 000 0000000')}
          </div>
        </div>
      </div>
    </div>
  </div>
  `;
}

function orderOwnerEmailHtml({
  brandName,
  orderId,
  createdAt,
  deliveryDate,
  customerName,
  customerEmail,
  phone,
  fullAddress,
  items,
  subtotal,
  discountTotal,
  shipping,
  tax,
  total,
  contactEmail,
  contactPhone,
  paymentMethod,
  promoCode,
  discountPercentage,
  status
}) {
  const safeBrand = escapeHtml(brandName || 'Nighthowls');
  const dateStr = createdAt ? new Date(createdAt).toLocaleString() : '';
  const deliveryDateStr = deliveryDate ? escapeHtml(new Date(deliveryDate).toLocaleDateString()) : '';
  const safePaymentMethod = escapeHtml(paymentMethod || 'COD');

  return `
  <div style="background:#111; padding:24px; font-family: Arial, Helvetica, sans-serif;">
    <div style="max-width:760px; margin:0 auto; border-radius:18px; overflow:hidden; border:1px solid rgba(255,255,255,0.12);">
      <div style="padding:18px 20px; background:#000; color:#fff;">
        <div style="font-size:12px; letter-spacing:3px; opacity:.85;">${safeBrand.toUpperCase()}</div>
        <div style="font-size:22px; font-weight:900; margin-top:8px;">New Order Received</div>
        <div style="margin-top:6px; opacity:.85;">Order #${escapeHtml(orderId)} ${dateStr ? `• ${escapeHtml(dateStr)}` : ''}</div>
        <div style="margin-top:4px; opacity:.85; font-size:13px;">Status: <b style="color:#fff; text-transform:uppercase;">${escapeHtml(status || 'Pending')}</b></div>
        ${deliveryDateStr ? `<div style="margin-top:6px; opacity:.85; font-size:13px;">ETA: <b style="color:#fff;">${deliveryDateStr}</b></div>` : ''}
      </div>
      <div style="padding:18px 20px; color:#fff;">
        <div style="padding:14px 14px; border-radius:14px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.12);">
          <div style="font-weight:900; margin-bottom:6px;">Customer Details</div>
          <div style="font-size:13px; line-height:1.65; color:rgba(255,255,255,0.85);">
            <b>Name:</b> ${escapeHtml(customerName)}<br>
            <b>Email:</b> ${escapeHtml(customerEmail)}<br>
            <b>Phone:</b> ${escapeHtml(phone)}<br>
            <b>Address:</b> ${escapeHtml(fullAddress)}<br>
            <b>Payment Method:</b> ${safePaymentMethod}
          </div>
        </div>

        ${buildItemsTable(items)}
        ${totalsBox({ subtotal, discountTotal, shipping, tax, total, promoCode, discountPercentage })}

        <div style="margin-top:18px; padding:16px 16px; border-radius:18px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.12); color:rgba(255,255,255,0.9);">
          <div style="font-weight:900; margin-bottom:6px;">Contact Us</div>
          <div style="font-size:13px; line-height:1.55;">
            For any complaints or inquiries, please contact us via email or phone.<br>
            <b>Email:</b> ${escapeHtml(contactEmail || 'support@nighthowls.com')}<br>
            <b>Phone:</b> ${escapeHtml(contactPhone || '+92 000 0000000')}
          </div>
        </div>
      </div>
    </div>
  </div>
  `;
}

module.exports = { orderCustomerEmailHtml, orderOwnerEmailHtml, formatMoney };

