// Bakery Shop JavaScript Application Logic

// Mock Product Dataset
const PRODUCTS = [
  {
    id: 1,
    name: 'Belgian Chocolate Ganache Cake',
    category: 'cakes',
    price: 34.99,
    rating: 4.9,
    reviews: 128,
    image: 'images/artisan_cake.png',
    tag: 'Bestseller',
    badgeClass: 'badge-bestseller',
    desc: 'Rich 70% dark Belgian chocolate layer cake topped with wild berries and edible gold.'
  },
  {
    id: 2,
    name: 'Golden French Croissant & Danish Box',
    category: 'pastries',
    price: 18.50,
    rating: 4.8,
    reviews: 94,
    image: 'images/fresh_pastries.png',
    tag: 'Eggless',
    badgeClass: 'badge-eggless',
    desc: 'Flaky pure butter croissants paired with blueberry and strawberry artisan Danish.'
  },
  {
    id: 3,
    name: 'Signature Floral Custom Celebration Cake',
    category: 'cakes',
    price: 45.00,
    rating: 5.0,
    reviews: 76,
    image: 'images/custom_cake.png',
    tag: 'Chef Special',
    badgeClass: 'badge-bestseller',
    desc: 'Multi-tiered vanilla sponge layered with raspberry compote and hand-piped flowers.'
  },
  {
    id: 4,
    name: 'Artisanal Sourdough & Crusty Loaf',
    category: 'breads',
    price: 8.99,
    rating: 4.7,
    reviews: 110,
    image: 'images/hero.png',
    tag: 'Vegan',
    badgeClass: 'badge-vegan',
    desc: 'Naturally fermented 48-hour sourdough bread baked fresh every morning at dawn.'
  },
  {
    id: 5,
    name: 'Pistachio & Rose Water Macarons (Box of 8)',
    category: 'cookies',
    price: 16.00,
    rating: 4.9,
    reviews: 85,
    image: 'images/fresh_pastries.png',
    tag: 'Eggless',
    badgeClass: 'badge-eggless',
    desc: 'Delicate French almond macaron shells filled with organic pistachio ganache and rose cream.'
  },
  {
    id: 6,
    name: 'Salted Caramel Espresso Cold Brew',
    category: 'beverages',
    price: 6.50,
    rating: 4.8,
    reviews: 62,
    image: 'images/hero.png',
    tag: 'Bestseller',
    badgeClass: 'badge-bestseller',
    desc: 'Single-origin Arabica cold brew infused with homemade salted caramel syrup.'
  }
];

// App State
let state = {
  cart: JSON.parse(localStorage.getItem('ss_bakery_cart')) || [],
  activeCategory: 'all',
  searchQuery: '',
  appliedCoupon: null,
  customCake: {
    size: '1 kg',
    sizePrice: 35,
    flavor: 'Belgian Chocolate',
    flavorPrice: 5,
    frosting: 'Buttercream',
    frostingPrice: 3,
    topping: 'Fresh Berries',
    toppingPrice: 4,
    message: ''
  }
};

// Initialize DOM Events
document.addEventListener('DOMContentLoaded', () => {
  renderProducts();
  setupEventListeners();
  updateCartUI();
  initCustomCakeBuilder();
});

// Setup Event Listeners
function setupEventListeners() {
  // Filter chips
  const chips = document.querySelectorAll('.filter-chips .chip');
  chips.forEach(chip => {
    chip.addEventListener('click', (e) => {
      chips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      state.activeCategory = chip.dataset.category;
      renderProducts();
    });
  });

  // Search input
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value.toLowerCase().trim();
      renderProducts();
    });
  }

  // Cart Drawer open/close
  const cartBtn = document.getElementById('cartBtn');
  const cartCloseBtn = document.getElementById('cartCloseBtn');
  const cartOverlay = document.getElementById('cartOverlay');

  cartBtn?.addEventListener('click', () => toggleCartDrawer(true));
  cartCloseBtn?.addEventListener('click', () => toggleCartDrawer(false));
  cartOverlay?.addEventListener('click', () => toggleCartDrawer(false));

  // Custom Cake Builder Options
  setupOptionGroup('sizeOptions', (val, price) => {
    state.customCake.size = val;
    state.customCake.sizePrice = parseFloat(price);
    updateCakeBuilderUI();
  });

  setupOptionGroup('flavorOptions', (val, price) => {
    state.customCake.flavor = val;
    state.customCake.flavorPrice = parseFloat(price);
    updateCakeBuilderUI();
  });

  setupOptionGroup('frostingOptions', (val, price) => {
    state.customCake.frosting = val;
    state.customCake.frostingPrice = parseFloat(price);
    updateCakeBuilderUI();
  });

  setupOptionGroup('toppingOptions', (val, price) => {
    state.customCake.topping = val;
    state.customCake.toppingPrice = parseFloat(price);
    updateCakeBuilderUI();
  });

  const customMsgInput = document.getElementById('cakeMessageInput');
  if (customMsgInput) {
    customMsgInput.addEventListener('input', (e) => {
      state.customCake.message = e.target.value;
      const msgOverlay = document.getElementById('cakeMsgPreview');
      if (msgOverlay) {
        msgOverlay.textContent = e.target.value ? `"${e.target.value}"` : '"Happy Birthday!"';
      }
    });
  }

  // Add Custom Cake to Cart
  const addCustomCakeBtn = document.getElementById('addCustomCakeBtn');
  addCustomCakeBtn?.addEventListener('click', () => {
    const customCakeItem = {
      id: `custom_${Date.now()}`,
      name: `Custom ${state.customCake.flavor} Cake (${state.customCake.size})`,
      price: calculateCakePrice(),
      image: 'images/custom_cake.png',
      desc: `Frosting: ${state.customCake.frosting}, Topping: ${state.customCake.topping}${state.customCake.message ? `, Note: "${state.customCake.message}"` : ''}`,
      quantity: 1
    };
    addToCart(customCakeItem);
    showToast('Custom Cake added to your cart!');
    toggleCartDrawer(true);
  });

  // Promo Code
  const applyPromoBtn = document.getElementById('applyPromoBtn');
  applyPromoBtn?.addEventListener('click', () => {
    const promoInput = document.getElementById('promoCodeInput');
    const code = promoInput.value.toUpperCase().trim();
    if (code === 'SWEET20') {
      state.appliedCoupon = { code: 'SWEET20', discount: 0.20 };
      showToast('🎉 Coupon SWEET20 applied! 20% OFF');
      updateCartUI();
    } else {
      showToast('❌ Invalid Promo Code. Try SWEET20!');
    }
  });

  // Checkout Button
  const checkoutBtn = document.getElementById('checkoutBtn');
  checkoutBtn?.addEventListener('click', () => {
    if (state.cart.length === 0) {
      showToast('Your cart is empty!');
      return;
    }
    toggleCartDrawer(false);
    openCheckoutModal();
  });

  const modalCloseBtn = document.getElementById('modalCloseBtn');
  modalCloseBtn?.addEventListener('click', () => {
    const checkoutModal = document.getElementById('checkoutModal');
    checkoutModal.classList.remove('active');
    state.cart = [];
    saveCart();
    updateCartUI();
  });
}

// Option Helper
function setupOptionGroup(groupId, callback) {
  const container = document.getElementById(groupId);
  if (!container) return;
  const btns = container.querySelectorAll('.option-btn');
  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      btns.forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      callback(btn.dataset.value, btn.dataset.price);
    });
  });
}

// Render Products Grid
function renderProducts() {
  const grid = document.getElementById('productGrid');
  if (!grid) return;

  const filtered = PRODUCTS.filter(p => {
    const matchesCategory = state.activeCategory === 'all' || p.category === state.activeCategory;
    const matchesSearch = p.name.toLowerCase().includes(state.searchQuery) || p.desc.toLowerCase().includes(state.searchQuery);
    return matchesCategory && matchesSearch;
  });

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 4rem 1rem;">
        <i class="ri-search-line" style="font-size: 3rem; color: var(--border-color);"></i>
        <h3 style="margin-top: 1rem; color: var(--color-mocha);">No bakery items found</h3>
        <p style="color: var(--text-muted);">Try searching for something else like "croissant" or "cake"</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = filtered.map(p => `
    <div class="product-card">
      <div class="product-img-wrapper">
        <img src="${p.image}" alt="${p.name}" loading="lazy">
        <span class="badge-tag ${p.badgeClass}">${p.tag}</span>
        <button class="btn-wishlist" onclick="toggleWishlist(this)" title="Save to wishlist">
          <i class="ri-heart-line"></i>
        </button>
      </div>
      <div class="product-content">
        <div class="product-rating">
          <i class="ri-star-fill"></i>
          <strong>${p.rating}</strong>
          <span>(${p.reviews} reviews)</span>
        </div>
        <h3 class="product-title">${p.name}</h3>
        <p class="product-desc">${p.desc}</p>
        <div class="product-footer">
          <div class="product-price">$${p.price.toFixed(2)}</div>
          <button class="btn-add-cart" onclick="handleAddCatalogItem(${p.id})">
            <i class="ri-shopping-bag-line"></i> Add
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

// Wishlist Handler
window.toggleWishlist = function(btn) {
  const icon = btn.querySelector('i');
  if (icon.classList.contains('ri-heart-line')) {
    icon.className = 'ri-heart-fill';
    btn.style.color = '#EC4899';
    showToast('Saved to wishlist!');
  } else {
    icon.className = 'ri-heart-line';
    btn.style.color = 'var(--text-muted)';
  }
};

// Add Catalog Item
window.handleAddCatalogItem = function(id) {
  const product = PRODUCTS.find(p => p.id === id);
  if (!product) return;

  const existing = state.cart.find(item => item.id === product.id);
  if (existing) {
    existing.quantity += 1;
  } else {
    state.cart.push({ ...product, quantity: 1 });
  }

  saveCart();
  updateCartUI();
  showToast(`Added "${product.name}" to cart!`);
};

// Custom Cake Builder Calculations
function calculateCakePrice() {
  return (
    state.customCake.sizePrice +
    state.customCake.flavorPrice +
    state.customCake.frostingPrice +
    state.customCake.toppingPrice
  );
}

function updateCakeBuilderUI() {
  const totalPriceElem = document.getElementById('cakeTotalPrice');
  const sizeSummary = document.getElementById('summarySize');
  const flavorSummary = document.getElementById('summaryFlavor');
  const frostingSummary = document.getElementById('summaryFrosting');
  const toppingSummary = document.getElementById('summaryTopping');

  const total = calculateCakePrice();
  if (totalPriceElem) totalPriceElem.textContent = `$${total.toFixed(2)}`;
  if (sizeSummary) sizeSummary.textContent = state.customCake.size;
  if (flavorSummary) flavorSummary.textContent = state.customCake.flavor;
  if (frostingSummary) frostingSummary.textContent = state.customCake.frosting;
  if (toppingSummary) toppingSummary.textContent = state.customCake.topping;
}

function initCustomCakeBuilder() {
  updateCakeBuilderUI();
}

// Cart UI & Logic
function toggleCartDrawer(open) {
  const drawer = document.getElementById('cartDrawer');
  const overlay = document.getElementById('cartOverlay');
  if (open) {
    drawer?.classList.add('active');
    overlay?.classList.add('active');
  } else {
    drawer?.classList.remove('active');
    overlay?.classList.remove('active');
  }
}

function addToCart(item) {
  const existing = state.cart.find(i => i.id === item.id);
  if (existing) {
    existing.quantity += item.quantity;
  } else {
    state.cart.push(item);
  }
  saveCart();
  updateCartUI();
}

function saveCart() {
  localStorage.setItem('ss_bakery_cart', JSON.stringify(state.cart));
}

function updateCartUI() {
  const cartBadge = document.getElementById('cartCountBadge');
  const mobileCartBadge = document.getElementById('mobileCartCount');
  const cartBody = document.getElementById('cartBody');
  const subtotalElem = document.getElementById('cartSubtotal');
  const discountElem = document.getElementById('cartDiscount');
  const totalElem = document.getElementById('cartGrandTotal');

  const totalCount = state.cart.reduce((sum, item) => sum + item.quantity, 0);
  if (cartBadge) cartBadge.textContent = totalCount;
  if (mobileCartBadge) mobileCartBadge.textContent = totalCount;

  if (!cartBody) return;

  if (state.cart.length === 0) {
    cartBody.innerHTML = `
      <div class="cart-empty">
        <i class="ri-shopping-basket-line"></i>
        <h4>Your cart is empty</h4>
        <p style="font-size: 0.85rem; margin-top: 0.5rem;">Explore our fresh bakery items and add delicious treats!</p>
      </div>
    `;
    if (subtotalElem) subtotalElem.textContent = '$0.00';
    if (discountElem) discountElem.textContent = '$0.00';
    if (totalElem) totalElem.textContent = '$0.00';
    return;
  }

  cartBody.innerHTML = state.cart.map(item => `
    <div class="cart-item">
      <img src="${item.image}" alt="${item.name}" class="cart-item-img">
      <div class="cart-item-info">
        <div class="cart-item-title">${item.name}</div>
        <div class="cart-item-price">$${(item.price * item.quantity).toFixed(2)}</div>
        <div class="cart-item-qty">
          <button class="btn-qty" onclick="changeQty('${item.id}', -1)">-</button>
          <span>${item.quantity}</span>
          <button class="btn-qty" onclick="changeQty('${item.id}', 1)">+</button>
          <button style="margin-left: auto; color: #EF4444; font-size: 0.85rem;" onclick="removeCartItem('${item.id}')">
            <i class="ri-delete-bin-line"></i>
          </button>
        </div>
      </div>
    </div>
  `).join('');

  const subtotal = state.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discount = state.appliedCoupon ? subtotal * state.appliedCoupon.discount : 0;
  const grandTotal = subtotal - discount;

  if (subtotalElem) subtotalElem.textContent = `$${subtotal.toFixed(2)}`;
  if (discountElem) discountElem.textContent = `-$${discount.toFixed(2)}`;
  if (totalElem) totalElem.textContent = `$${grandTotal.toFixed(2)}`;
}

window.changeQty = function(id, delta) {
  const item = state.cart.find(i => i.id === id);
  if (!item) return;
  item.quantity += delta;
  if (item.quantity <= 0) {
    state.cart = state.cart.filter(i => i.id !== id);
  }
  saveCart();
  updateCartUI();
};

window.removeCartItem = function(id) {
  state.cart = state.cart.filter(i => i.id !== id);
  saveCart();
  updateCartUI();
  showToast('Item removed from cart');
};

function openCheckoutModal() {
  const checkoutModal = document.getElementById('checkoutModal');
  const receiptBody = document.getElementById('receiptBody');

  const subtotal = state.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discount = state.appliedCoupon ? subtotal * state.appliedCoupon.discount : 0;
  const grandTotal = subtotal - discount;

  if (receiptBody) {
    receiptBody.innerHTML = `
      <div style="background: var(--bg-primary); padding: 1rem; border-radius: var(--radius-sm); font-size: 0.9rem; text-align: left; margin: 1rem 0;">
        <div style="font-weight: 700; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem; margin-bottom: 0.5rem;">
          Order #${Math.floor(100000 + Math.random() * 900000)}
        </div>
        ${state.cart.map(i => `<div style="display:flex; justify-between; margin-bottom: 0.3rem;"><span>${i.quantity}x ${i.name}</span><strong>$${(i.price * i.quantity).toFixed(2)}</strong></div>`).join('')}
        <div style="border-top: 1px dashed var(--border-color); margin-top: 0.5rem; padding-top: 0.5rem; display: flex; justify-content: space-between; font-weight: 800;">
          <span>Total Paid:</span>
          <span style="color: var(--color-caramel);">$${grandTotal.toFixed(2)}</span>
        </div>
      </div>
    `;
  }

  checkoutModal?.classList.add('active');
}

// Toast System
function showToast(message) {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<i class="ri-checkbox-circle-fill"></i> ${message}`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}
