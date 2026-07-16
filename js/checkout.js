// Checkout Page JavaScript (COD and EasyPaisa; login required)
const orderItemsEl = document.getElementById('orderItems');
const subtotalEl = document.querySelector('.subtotal');
const shippingEl = document.querySelector('.shipping');
const taxEl = document.querySelector('.tax');
const totalEl = document.querySelector('.total-amount');
const placeOrderBtn = document.getElementById('placeOrderBtn');
const placeOrderLoading = document.getElementById('placeOrderLoading');
const promoCodeInput = document.getElementById('promoCodeInput');
const applyPromoBtn = document.getElementById('applyPromoBtn');
const promoMessage = document.getElementById('promoMessage');
const discountRow = document.getElementById('discountRow');

const orderSuccessModal = document.getElementById('orderSuccessModal');
const orderIdEl = document.getElementById('orderId');
const orderTotalEl = document.getElementById('orderTotal');
const deliveryDateEl = document.getElementById('deliveryDate');
const promoCodeDetail = document.getElementById('promoCodeDetail');
const appliedPromoCodeEl = document.getElementById('appliedPromoCode');

let cartItems = [];
let paymentScreenshot = null;
let appliedPromoCode = null;
let discountPercentage = 0.03; // Default 3% discount
let currentPlacedOrder = null;

function formatCurrency(amount) {
    return `PKR (Rs.) ${Number(amount || 0).toFixed(2)}`;
}

function renderItems() {
    if (!Array.isArray(cartItems) || cartItems.length === 0) {
        orderItemsEl.innerHTML = `<p>Your cart is empty.</p>`;
        subtotalEl.textContent = formatCurrency(0);
        taxEl.textContent = formatCurrency(0);
        totalEl.textContent = formatCurrency(0);
        return;
    }

    orderItemsEl.innerHTML = cartItems.map(item => `
        <div class="order-item">
            <div class="order-item-info">
                <div class="order-item-title">${item.product_name}</div>
                <div class="order-item-qty">Qty: ${item.quantity}</div>
            </div>
            <div class="order-item-price">${formatCurrency(Number(item.price) * Number(item.quantity))}</div>
        </div>
    `).join('');

    const subtotal = cartItems.reduce((t, i) => t + (Number(i.price) * Number(i.quantity)), 0);
    const discount = subtotal * discountPercentage;
    const shipping = 100; // Fixed shipping fee of Rs. 100
    const total = subtotal - discount + shipping;

    subtotalEl.textContent = formatCurrency(subtotal);
    shippingEl.textContent = formatCurrency(shipping);
    taxEl.textContent = formatCurrency(0); // No tax
    
    // Show discount row
    if (discountRow) {
        discountRow.style.display = 'flex';
        const discountLabel = appliedPromoCode ? `Discount (${appliedPromoCode} - ${(discountPercentage * 100).toFixed(0)}%)` : 'Discount (3%)';
        discountRow.querySelector('span:first-child').textContent = discountLabel;
        discountRow.querySelector('.discount-amount').textContent = `-${formatCurrency(discount)}`;
    }
    
    totalEl.textContent = formatCurrency(total);
}

async function loadCart() {
    if (typeof window.nhRequireLogin === 'function') {
        if (!window.nhRequireLogin()) return;
    } else {
        window.location.href = 'login.html';
        return;
    }

    const data = await window.nhApiRequest('/cart', {}, { auth: true });
    cartItems = data.items || [];
    renderItems();
    if (typeof window.updateCartCount === 'function') window.updateCartCount();
    if (typeof window.updateWishlistCount === 'function') window.updateWishlistCount();
}

// Apply promo code
async function applyPromoCode() {
    const code = promoCodeInput.value.trim().toUpperCase();
    
    if (!code) {
        promoMessage.textContent = 'Please enter a promo code';
        promoMessage.className = 'promo-message error';
        return;
    }
    
    if (!code || code.length < 3) {
        promoMessage.textContent = 'Invalid promo code';
        promoMessage.className = 'promo-message error';
        return;
    }
    
    try {
        applyPromoBtn.disabled = true;
        applyPromoBtn.textContent = 'Validating...';
        
        const response = await fetch(`${window.API_BASE_URL}/promo-codes/validate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code })
        });
        
        const data = await response.json();
        
        if (data.valid) {
            appliedPromoCode = data.promoCode.code;
            discountPercentage = data.promoCode.discountPercentage / 100;
            promoMessage.textContent = `Promo code applied! ${data.promoCode.discountPercentage}% discount`;
            promoMessage.className = 'promo-message success';
            renderItems();
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
    renderItems();
}

function openSuccessModal(orderId, totalAmount, estimatedDeliveryDate, deliveryEtaDays) {
    orderIdEl.textContent = String(orderId);
    orderTotalEl.textContent = formatCurrency(Number(totalAmount).toFixed(2));
    
    // Show promo code if applied
    if (appliedPromoCode && promoCodeDetail && appliedPromoCodeEl) {
        promoCodeDetail.style.display = 'block';
        appliedPromoCodeEl.textContent = `${appliedPromoCode} (${(discountPercentage * 100).toFixed(0)}% discount)`;
    } else if (promoCodeDetail) {
        promoCodeDetail.style.display = 'none';
    }
    
    if (deliveryDateEl) {
        if (estimatedDeliveryDate) {
            const etaText = deliveryEtaDays ? `${deliveryEtaDays} days` : '7 days (1 week)';
            // show a professional label without relying on "EST"
            deliveryDateEl.textContent = `ETA: ${etaText}`;
        } else {
            deliveryDateEl.textContent = 'ETA: 7 days (1 week)';
        }
    }
    
    const downloadInvoiceBtn = document.getElementById('downloadInvoiceBtn');
    if (downloadInvoiceBtn) {
        downloadInvoiceBtn.style.display = 'inline-flex';
    }
    
    orderSuccessModal.classList.add('active');
    orderSuccessModal.style.display = 'block';
}

document.addEventListener('click', (e) => {
    if (!orderSuccessModal) return;
    if (e.target.closest('.modal-close')) {
        orderSuccessModal.classList.remove('active');
        orderSuccessModal.style.display = 'none';
    }
});

applyPromoBtn?.addEventListener('click', applyPromoCode);

// Allow Enter key to apply promo code
promoCodeInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        applyPromoCode();
    }
});

placeOrderBtn?.addEventListener('click', async () => {
    try {
        if (!Array.isArray(cartItems) || cartItems.length === 0) {
            alert('Your cart is empty');
            return;
        }
        const agree = document.getElementById('agreeTerms');
        if (agree && !agree.checked) {
            alert('Please agree to the Terms & Conditions');
            return;
        }

        const first = (document.getElementById('firstName')?.value || '').trim();
        const last = (document.getElementById('lastName')?.value || '').trim();
        const email = (document.getElementById('email')?.value || '').trim();
        const phone = (document.getElementById('phone')?.value || '').trim();

        const city = (document.getElementById('city')?.value || '').trim();
        const town = (document.getElementById('town')?.value || '').trim();
        const street = (document.getElementById('street')?.value || '').trim();
        const houseNumber = (document.getElementById('houseNumber')?.value || '').trim();
        const address2 = (document.getElementById('address2')?.value || '').trim();

        if (!city || !town || !street || !houseNumber) {
            alert('Please fill City, Town, Street, and House/Apartment No.');
            return;
        }
        if (!first || !last || !email || !phone) {
            alert('Please fill your name, email, and phone number.');
            return;
        }

        // Get selected payment method
        const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked')?.value || 'COD';

        // Validate screenshot for EasyPaisa
        if (paymentMethod === 'EasyPaisa' && !paymentScreenshot) {
            alert('Please upload your payment screenshot for EasyPaisa payment.');
            return;
        }

        // Prepare form data for multipart/form-data (for screenshot)
        const formData = new FormData();
        formData.append('customer_name', `${first} ${last}`.trim());
        formData.append('customer_email', email);
        formData.append('phone', phone);
        formData.append('city', city);
        formData.append('town', town);
        formData.append('street', street);
        formData.append('house_number', houseNumber);
        formData.append('address2', address2);
        formData.append('country', 'Pakistan');
        formData.append('order_notes', (document.getElementById('orderNotes')?.value || '').trim());
        formData.append('payment_method', paymentMethod);
        
        if (paymentMethod === 'EasyPaisa' && paymentScreenshot) {
            formData.append('payment_screenshot', paymentScreenshot);
        }
        
        if (appliedPromoCode) {
            formData.append('promo_code', appliedPromoCode);
        }

        placeOrderBtn.disabled = true;
        placeOrderLoading.style.display = 'block';
        placeOrderBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Placing Order...`;

        // Use fetch directly for FormData (multipart/form-data)
        const token = localStorage.getItem('nighthowls_token');
        const response = await fetch('https://final-project-production-13f4.up.railway.app/api/orders', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        // Check if response has content before parsing JSON
        const contentType = response.headers.get('content-type');
        let result;
        if (contentType && contentType.includes('application/json')) {
            result = await response.json();
        } else {
            const text = await response.text();
            result = { message: text || 'Failed to place order' };
        }

        if (!response.ok) {
            throw new Error(result.message || `Failed to place order (Status: ${response.status})`);
        }

        currentPlacedOrder = {
            order_id: result.order_id,
            created_at: new Date().toISOString(),
            customer_name: `${first} ${last}`.trim(),
            customer_email: email,
            phone: phone,
            shipping_address: {
                house_number: houseNumber,
                street: street,
                town: town,
                city: city,
                country: 'Pakistan',
                order_notes: (document.getElementById('orderNotes')?.value || '').trim()
            },
            payment_method: paymentMethod,
            status: 'pending',
            subtotal: cartItems.reduce((t, i) => t + (Number(i.price) * Number(i.quantity)), 0),
            discount_total: cartItems.reduce((t, i) => t + (Number(i.price) * Number(i.quantity)), 0) * discountPercentage,
            shipping: 100,
            tax: 0,
            total_amount: result.total_amount,
            promo_code: appliedPromoCode,
            discount_percentage: discountPercentage * 100,
            items: cartItems.map(i => ({
                product_name: i.product_name,
                quantity: i.quantity,
                price: Number(i.price),
                color: i.color || null,
                size: i.size || null
            }))
        };

        openSuccessModal(result.order_id, result.total_amount, result.estimated_delivery_date, result.delivery_eta_days);
        cartItems = [];
        renderItems();
        if (typeof window.updateCartCount === 'function') window.updateCartCount();
    } catch (err) {
        alert(err.message || 'Failed to place order');
    } finally {
        if (placeOrderBtn) {
            placeOrderBtn.disabled = false;
            placeOrderBtn.innerHTML = `<i class="fas fa-lock"></i> Place Order`;
        }
        if (placeOrderLoading) placeOrderLoading.style.display = 'none';
    }
});

document.addEventListener('DOMContentLoaded', () => {
    loadCart().catch(err => {
        cartItems = [];
        renderItems();
        alert(err.message || 'Failed to load checkout');
    });

    // Payment method change handler
    const paymentMethods = document.querySelectorAll('input[name="paymentMethod"]');
    const codInfo = document.getElementById('codInfo');
    const easypaisaInfo = document.getElementById('easypaisaInfo');
    const screenshotUploadGroup = document.getElementById('screenshotUploadGroup');
    const paymentScreenshotInput = document.getElementById('paymentScreenshot');

    paymentMethods.forEach(method => {
        method.addEventListener('change', (e) => {
            const selectedMethod = e.target.value;
            
            if (selectedMethod === 'COD') {
                codInfo.style.display = 'block';
                easypaisaInfo.style.display = 'none';
                screenshotUploadGroup.style.display = 'none';
                paymentScreenshotInput.removeAttribute('required');
            } else if (selectedMethod === 'EasyPaisa') {
                codInfo.style.display = 'none';
                easypaisaInfo.style.display = 'block';
                screenshotUploadGroup.style.display = 'block';
                paymentScreenshotInput.setAttribute('required', 'true');
            }
        });
    });

    // Screenshot file handler
    paymentScreenshotInput?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            // Validate file type
            if (!file.type.startsWith('image/')) {
                alert('Please upload an image file (JPG, PNG, etc.)');
                e.target.value = '';
                return;
            }
            // Validate file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                alert('File size must be less than 5MB');
                e.target.value = '';
                return;
            }
            paymentScreenshot = file; // Store in global variable
        } else {
            paymentScreenshot = null;
        }
    });

    // Handle Invoice PDF Download
    document.getElementById('downloadInvoiceBtn')?.addEventListener('click', () => {
        if (currentPlacedOrder && window.downloadInvoicePDF) {
            window.downloadInvoicePDF(currentPlacedOrder);
        }
    });
});