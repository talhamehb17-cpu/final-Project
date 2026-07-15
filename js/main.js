// Main JavaScript for Nighthowls E-commerce Website

// Cache DOM selectors for performance
const DOM = {
    hamburger: document.getElementById('hamburger'),
    mobileMenu: document.getElementById('mobileMenu'),
    reviewForm: document.getElementById('reviewForm'),
    reviewStars: document.querySelectorAll('.stars i'),
    reviewRatingInput: document.getElementById('reviewRating'),
    carouselTrack: document.getElementById('carouselTrack'),
    prevBtn: document.getElementById('prevBtn'),
    nextBtn: document.getElementById('nextBtn'),
    contactForm: document.getElementById('contactForm'),
    cartCount: document.querySelector('.cart-count'),
    userIconWrapper: document.querySelector('.user-icon-wrapper'),
    userDropdown: document.querySelector('.user-dropdown'),
    mobileMenuList: document.querySelector('#mobileMenu ul')
};

// Initialize cart count from localStorage (guest fallback only)
let guestCart = JSON.parse(localStorage.getItem('nighthowls_cart')) || [];
updateCartCount();

// ===== API CONFIG =====
const API_BASE_URL = 'http://localhost:5000/api';
window.API_BASE_URL = API_BASE_URL;
function getAuthToken() {
    return localStorage.getItem('nighthowls_token');
}
function isLoggedIn() {
    return Boolean(getAuthToken());
}
function requireLoginOrRedirect() {
    if (isLoggedIn()) return true;
    window.location.href = 'login.html';
    return false;
}

async function apiRequest(path, options = {}, { auth = false } = {}) {
    const headers = { ...(options.headers || {}) };
    if (!headers['Content-Type'] && options.body) headers['Content-Type'] = 'application/json';
    if (auth) {
        const token = getAuthToken();
        if (!token) throw new Error('Not logged in');
        headers.Authorization = `Bearer ${token}`;
    }
    const res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        const msg = data?.message || 'Request failed';
        if (auth && res.status === 401) {
            // Token missing/expired/invalid: clear stale auth and send to login
            localStorage.removeItem('nighthowls_user');
            localStorage.removeItem('nighthowls_token');
            if (typeof window.updateNavbarUser === 'function') window.updateNavbarUser();
            window.location.href = 'login.html';
        }
        throw new Error(msg);
    }
    return data;
}

// ===== USER LOGIN STATE HANDLING =====
function updateNavbarUser() {
    const user = JSON.parse(localStorage.getItem('nighthowls_user'));
    const token = localStorage.getItem('nighthowls_token');

    if (!DOM.userDropdown || !DOM.mobileMenuList) return;

    // Consider logged in only if BOTH user + token exist
    if (user && user.name && token) {
        // Desktop navbar
        DOM.userDropdown.innerHTML = `
            <span class="user-name">Hi, ${user.name}</span>
            <a href="orders.html" id="viewOrdersLink">View Orders</a>
            <a href="#" id="logoutBtn">Logout</a>
        `;

        // Mobile menu
        const mobileUserItems = DOM.mobileMenuList.querySelectorAll('li');
        mobileUserItems.forEach(li => {
            const a = li.querySelector('a');
            if (a && (a.textContent.trim() === 'Login' || a.textContent.trim() === 'Sign Up')) {
                li.style.display = 'none';
            }
        });

        // Add Logout for mobile menu
        if (!document.getElementById('mobileLogout')) {
            // Add View Orders for mobile menu
            if (!document.getElementById('mobileViewOrders')) {
                const ordersLi = document.createElement('li');
                ordersLi.id = 'mobileViewOrders';
                ordersLi.innerHTML = `<a href="orders.html">View Orders</a>`;
                DOM.mobileMenuList.appendChild(ordersLi);
            }

            const li = document.createElement('li');
            li.id = 'mobileLogout';
            li.innerHTML = `<a href="#">Logout</a>`;
            DOM.mobileMenuList.appendChild(li);

            li.querySelector('a').addEventListener('click', () => {
                logoutUser();
            });
        }

        document.getElementById('logoutBtn').addEventListener('click', logoutUser);

    } else {
        // No user logged in
        if (user && !token) {
            // stale UI state: user present but token missing
            localStorage.removeItem('nighthowls_user');
        }
        DOM.userDropdown.innerHTML = `
            <a href="login.html" class="login-btn">Login</a>
            <a href="login.html?action=signup" class="signup-btn">Sign Up</a>
        `;
        const mobileLogoutLi = document.getElementById('mobileLogout');
        if (mobileLogoutLi) mobileLogoutLi.remove();
        const mobileViewOrders = document.getElementById('mobileViewOrders');
        if (mobileViewOrders) mobileViewOrders.remove();
        DOM.mobileMenuList.querySelectorAll('li').forEach(li => {
            const a = li.querySelector('a');
            if (a && (a.textContent.trim() === 'Login' || a.textContent.trim() === 'Sign Up')) {
                li.style.display = 'block';
            }
        });
    }
}
// allow other scripts to refresh navbar after login
window.updateNavbarUser = updateNavbarUser;

function logoutUser() {
    localStorage.removeItem('nighthowls_user');
    localStorage.removeItem('nighthowls_token');
    updateNavbarUser();
}

// Call on page load
updateNavbarUser();

// ===== MOBILE MENU TOGGLE =====
DOM.hamburger?.addEventListener('click', () => {
    if (!DOM.mobileMenu) return;
    DOM.mobileMenu.classList.toggle('active');
    DOM.hamburger.classList.toggle('active');

    const spans = DOM.hamburger.querySelectorAll('span');
    if (DOM.hamburger.classList.contains('active')) {
        spans[0].style.transform = 'rotate(45deg) translate(5px, 5px)';
        spans[1].style.opacity = '0';
        spans[2].style.transform = 'rotate(-45deg) translate(7px, -6px)';
    } else {
        spans[0].style.transform = 'none';
        spans[1].style.opacity = '1';
        spans[2].style.transform = 'none';
    }
});

// Close mobile menu when clicking outside
document.addEventListener('click', (e) => {
    if (!DOM.hamburger || !DOM.mobileMenu) return;
    if (!DOM.hamburger.contains(e.target) && !DOM.mobileMenu.contains(e.target)) {
        DOM.mobileMenu.classList.remove('active');
        DOM.hamburger.classList.remove('active');
        const spans = DOM.hamburger.querySelectorAll('span');
        spans[0].style.transform = 'none';
        spans[1].style.opacity = '1';
        spans[2].style.transform = 'none';
    }
});

// ===== STAR RATING & REVIEW FORM =====
if (DOM.reviewStars.length && DOM.reviewRatingInput) {
DOM.reviewStars.forEach(star => {
    star.addEventListener('click', () => {
        const rating = parseInt(star.getAttribute('data-rating'));
        DOM.reviewRatingInput.value = rating;

        DOM.reviewStars.forEach((s, index) => {
            if (index < rating) {
                s.classList.remove('far');
                s.classList.add('fas', 'active');
            } else {
                s.classList.remove('fas', 'active');
                s.classList.add('far');
            }
        });
    });

    star.addEventListener('mouseover', () => {
        const rating = parseInt(star.getAttribute('data-rating'));
        DOM.reviewStars.forEach((s, index) => {
            if (index < rating) {
                s.classList.remove('far');
                s.classList.add('fas');
            }
        });
    });

    star.addEventListener('mouseout', () => {
        const currentRating = parseInt(DOM.reviewRatingInput.value);
        DOM.reviewStars.forEach((s, index) => {
            if (index < currentRating) {
                s.classList.remove('far');
                s.classList.add('fas', 'active');
            } else {
                s.classList.remove('fas', 'active');
                s.classList.add('far');
            }
        });
    });
});
}

// ===== REVIEWS DATA =====
let reviews = [];
let currentSlide = 0;

async function fetchReviews() {
    try {
        const res = await fetch(`${API_BASE_URL}/reviews`);
        const data = await res.json();
        if (res.ok && Array.isArray(data.reviews)) {
            reviews = data.reviews;
        } else {
            reviews = [];
        }
        updateCarousel();
    } catch (e) {
        // Keep UI usable even if backend is down
        reviews = [];
        updateCarousel();
    }
}

DOM.reviewForm?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const text = document.getElementById('reviewText').value;
    const rating = parseInt(DOM.reviewRatingInput.value);

    if (text) {
        try {
            if (typeof window.nhRequireLogin === 'function') {
                if (!window.nhRequireLogin()) return;
            } else {
                window.location.href = 'login.html';
                return;
            }

            await window.nhApiRequest(
                '/reviews',
                { method: 'POST', body: JSON.stringify({ text, rating }) },
                { auth: true }
            );
            await fetchReviews();

            DOM.reviewForm.reset();
            DOM.reviewRatingInput.value = 5;
            DOM.reviewStars.forEach((s, index) => {
                if (index < 5) {
                    s.classList.remove('far');
                    s.classList.add('fas', 'active');
                } else {
                    s.classList.remove('fas', 'active');
                    s.classList.add('far');
                }
            });

            alert('Thank you for your review!');
        } catch (err) {
            alert(err.message || 'Failed to submit review');
        }
    }
});

// ===== CAROUSEL LOGIC =====
function updateCarousel() {
    if (!DOM.carouselTrack) return;
    DOM.carouselTrack.innerHTML = '';

    reviews.forEach(review => {
        let starsHTML = '';
        for (let i = 1; i <= 5; i++) {
            starsHTML += i <= review.rating ? '<i class="fas fa-star"></i>' : '<i class="far fa-star"></i>';
        }

        const reviewCard = document.createElement('div');
        reviewCard.className = 'review-card';
        reviewCard.innerHTML = `
            <div class="review-header">
                <div class="reviewer-name">${review.name}</div>
                <div class="review-date">${review.date}</div>
            </div>
            <div class="review-rating">${starsHTML}</div>
            <div class="review-text">${review.text}</div>
        `;
        DOM.carouselTrack.appendChild(reviewCard);
    });

    currentSlide = 0;
    updateCarouselPosition();
    updateCarouselDots();
}

function updateCarouselPosition() {
    if (!DOM.carouselTrack.children[0]) return;
    const slideWidth = DOM.carouselTrack.children[0].offsetWidth;
    DOM.carouselTrack.style.transform = `translateX(-${currentSlide * slideWidth}px)`;
}

function updateCarouselDots() {
    const dotsContainer = document.getElementById('carouselDots');
    if (!dotsContainer || reviews.length === 0) return;
    
    dotsContainer.innerHTML = reviews.map((_, i) =>
        `<button type="button" class="carousel-dot ${i === currentSlide ? 'active' : ''}" data-slide="${i}" aria-label="Go to review ${i + 1}"></button>`
    ).join('');

    dotsContainer.querySelectorAll('.carousel-dot').forEach(dot => {
        dot.addEventListener('click', () => {
            const slideIndex = parseInt(dot.getAttribute('data-slide'));
            currentSlide = slideIndex;
            updateCarouselPosition();
            updateCarouselDots();
        });
    });
}

DOM.prevBtn?.addEventListener('click', () => {
    if (currentSlide > 0) currentSlide--;
    updateCarouselPosition();
    updateCarouselDots();
});

DOM.nextBtn?.addEventListener('click', () => {
    if (currentSlide < reviews.length - 1) currentSlide++;
    updateCarouselPosition();
    updateCarouselDots();
});

// ===== CONTACT FORM =====
DOM.contactForm?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('contactName').value;
    const email = document.getElementById('contactEmail').value;
    const message = document.getElementById('contactMessage').value;
    const submitBtn = DOM.contactForm.querySelector('button[type="submit"]');

    if (name && email && message) {
        // Add loading state
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.classList.add('btn-loading');
        submitBtn.innerHTML = '<span class="spinner"></span>Sending...';

        try {
            const res = await fetch(`${API_BASE_URL}/contact`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, message })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.message || 'Failed to send message');
            DOM.contactForm.reset();
            showToast('Thank you for your message! We will get back to you soon.', 'success');
        } catch (err) {
            showToast(err.message || 'Failed to send message', 'error');
        } finally {
            // Remove loading state
            submitBtn.disabled = false;
            submitBtn.classList.remove('btn-loading');
            submitBtn.textContent = originalText;
        }
    }
});

// ===== CART LOGIC =====
function updateCartCount() {
    if (isLoggedIn()) {
        apiRequest('/cart', {}, { auth: true })
            .then(({ items }) => {
                const totalItems = Array.isArray(items)
                    ? items.reduce((t, i) => t + Number(i.quantity || 0), 0)
                    : 0;
                if (DOM.cartCount) DOM.cartCount.textContent = totalItems;
                document.querySelectorAll('.cart-count').forEach(el => (el.textContent = totalItems));
            })
            .catch(() => {
                if (DOM.cartCount) DOM.cartCount.textContent = '0';
                document.querySelectorAll('.cart-count').forEach(el => (el.textContent = '0'));
            });
        return;
    }

    const totalItems = guestCart.reduce((total, item) => total + item.quantity, 0);
    if (DOM.cartCount) DOM.cartCount.textContent = totalItems;
    document.querySelectorAll('.cart-count').forEach(el => (el.textContent = totalItems));
}

function addToCart(product) {
    if (!requireLoginOrRedirect()) return;

    const payload = {
        product_id: product.id,
        quantity: product.quantity || 1
    };
    if (product.size) payload.size = product.size;
    if (product.color) payload.color = product.color;

    apiRequest(
        '/cart',
        { method: 'POST', body: JSON.stringify(payload) },
        { auth: true }
    )
        .then(() => {
            updateCartCount();
            showNotification('Product added to cart!');
        })
        .catch(err => showNotification(err.message || 'Failed to add to cart'));
}

async function addToWishlist(productId) {
    if (!requireLoginOrRedirect()) return;
    await apiRequest('/wishlist', { method: 'POST', body: JSON.stringify({ product_id: productId }) }, { auth: true });
}

async function removeFromWishlist(productId) {
    if (!requireLoginOrRedirect()) return;
    await apiRequest(`/wishlist/${productId}`, { method: 'DELETE' }, { auth: true });
}

function updateWishlistCount() {
    if (isLoggedIn()) {
        apiRequest('/wishlist', {}, { auth: true })
            .then(({ products }) => {
                const count = Array.isArray(products) ? products.length : 0;
                document.querySelectorAll('.wishlist-count, .wishlist-count-mobile').forEach(el => (el.textContent = count));
            })
            .catch(() => {
                document.querySelectorAll('.wishlist-count, .wishlist-count-mobile').forEach(el => (el.textContent = '0'));
            });
        return;
    }
    const wishlist = JSON.parse(localStorage.getItem('nighthowls_wishlist')) || [];
    const count = wishlist.length;
    document.querySelectorAll('.wishlist-count, .wishlist-count-mobile').forEach(el => (el.textContent = count));
}

// expose for other scripts
window.updateCartCount = updateCartCount;
window.updateWishlistCount = updateWishlistCount;
window.addToCart = addToCart;
window.nhApiRequest = apiRequest;
window.nhRequireLogin = requireLoginOrRedirect;
window.nhAddToWishlist = addToWishlist;
window.nhRemoveFromWishlist = removeFromWishlist;

// ===== NOTIFICATIONS =====
function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background-color: var(--primary-black);
        color: var(--primary-white);
        padding: 15px 25px;
        border-radius: 5px;
        z-index: 10000;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        transform: translateX(150%);
        transition: transform 0.3s ease;
    `;
    document.body.appendChild(notification);
    setTimeout(() => { notification.style.transform = 'translateX(0)'; }, 10);
    setTimeout(() => {
        notification.style.transform = 'translateX(150%)';
        setTimeout(() => { document.body.removeChild(notification); }, 300);
    }, 3000);
}

// ===== TOAST NOTIFICATIONS =====
function showToast(message, type = 'success') {
    // Create toast container if it doesn't exist
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icon = type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle';
    
    toast.innerHTML = `
        <i class="fas ${icon} toast-icon"></i>
        <span class="toast-message">${message}</span>
        <button class="toast-close" aria-label="Close">&times;</button>
    `;

    container.appendChild(toast);

    // Close button functionality
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => removeToast(toast));

    // Auto remove after 4 seconds
    setTimeout(() => removeToast(toast), 4000);
}

function removeToast(toast) {
    if (!toast || toast.classList.contains('slide-out')) return;
    toast.classList.add('slide-out');
    setTimeout(() => {
        if (toast.parentElement) {
            toast.parentElement.removeChild(toast);
        }
    }, 300);
}

// ===== NEWSLETTER =====
document.querySelector('.newsletter-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const emailInput = e.target.querySelector('input[type="email"]');
    if (emailInput.value) {
        alert('Thank you for subscribing to our newsletter!');
        emailInput.value = '';
    }
});

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
    fetchReviews();
    updateWishlistCount();
    updateCartCount();

    // ===== SCROLL ANIMATIONS =====
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, observerOptions);

    // Observe category cards
    document.querySelectorAll('.category-card').forEach(card => {
        observer.observe(card);
    });

    // Observe highlight items
    document.querySelectorAll('.highlight-item').forEach(item => {
        observer.observe(item);
    });

    // Observe section headers
    document.querySelectorAll('.section-header').forEach(header => {
        observer.observe(header);
    });

    // Observe review cards
    document.querySelectorAll('.review-card').forEach(card => {
        observer.observe(card);
    });

    // Observe product cards
    document.querySelectorAll('.product-card').forEach(card => {
        observer.observe(card);
    });

    // ===== HERO SLIDER (main.html) =====
    const slidesRoot = document.getElementById('heroSlides');
    const dotsRoot = document.getElementById('heroDots');
    const prev = document.getElementById('heroPrev');
    const next = document.getElementById('heroNext');
    const slides = slidesRoot ? Array.from(slidesRoot.querySelectorAll('.hero-slide')) : [];
    if (slidesRoot && dotsRoot && slides.length > 1) {
        let idx = 0;
        let timer = null;

        dotsRoot.innerHTML = slides.map((_, i) =>
            `<button type="button" class="hero-dot ${i === 0 ? 'active' : ''}" data-idx="${i}" aria-label="Go to slide ${i + 1}"></button>`
        ).join('');

        const dots = Array.from(dotsRoot.querySelectorAll('.hero-dot'));

        function setActive(nextIdx) {
            idx = (nextIdx + slides.length) % slides.length;
            slides.forEach((s, i) => s.classList.toggle('active', i === idx));
            dots.forEach((d, i) => d.classList.toggle('active', i === idx));
        }

        function start() {
            stop();
            timer = setInterval(() => setActive(idx + 1), 4500);
        }

        function stop() {
            if (timer) clearInterval(timer);
            timer = null;
        }

        dotsRoot.addEventListener('click', (e) => {
            const btn = e.target.closest('.hero-dot');
            if (!btn) return;
            const i = Number(btn.getAttribute('data-idx'));
            if (!Number.isFinite(i)) return;
            setActive(i);
            start();
        });

        prev?.addEventListener('click', () => {
            setActive(idx - 1);
            start();
        });
        next?.addEventListener('click', () => {
            setActive(idx + 1);
            start();
        });

        slidesRoot.addEventListener('mouseenter', stop);
        slidesRoot.addEventListener('mouseleave', start);

        start();
    }
});
