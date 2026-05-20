// ============================================================
// === ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ==================================
// ============================================================
let products = [];
let cart = [];
const CART_KEY = "sib_health_cart";
const CERTIFICATE_AMOUNT_KEY = "sib_health_certificate_amount";

// === СЕЛЕКТОРЫ ==============================================
const productListEl = document.getElementById("productList");
const searchInputEl = document.getElementById("searchInput");
const categoryFilterEl = document.getElementById("categoryFilter");
const cartButtonEl = document.getElementById("cartButton");
const cartCountEl = document.getElementById("cartCount");
const cartPanelEl = document.getElementById("cartPanel");
const cartOverlayEl = document.getElementById("cartOverlay");
const cartCloseEl = document.getElementById("cartClose");
const cartItemsEl = document.getElementById("cartItems");
const cartSubtotalEl = document.getElementById("cartSubtotal");
const cartTotalEl = document.getElementById("cartTotal");
const cartDiscountEl = document.getElementById("cartDiscount");
const cartDiscountRowEl = document.getElementById("cartDiscountRow");
const orderFormEl = document.getElementById("orderForm");
const feedbackFormEl = document.getElementById("feedbackForm");
const promosGridEl = document.querySelector(".promos__grid");
const certificatesCardsEl = document.querySelector(".certificates__cards");
const giftCardsEl = document.querySelector(".gift-cards");

// ============================================================
// === ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ================================
// ============================================================

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, function(m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    if (m === '"') return '&quot;';
    return m;
  });
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function scrollToSection(id) {
  const section = document.getElementById(id);
  if (section) section.scrollIntoView({ behavior: "smooth" });
}

function showToast(message, type = 'error', duration = 5000) {
  const oldToasts = document.querySelectorAll('.toast-notification');
  oldToasts.forEach(toast => toast.remove());
  
  const toast = document.createElement('div');
  toast.className = `toast-notification toast-notification--${type}`;
  
  let icon = '';
  if (type === 'success') icon = '✅';
  if (type === 'info') icon = 'ℹ️';
  if (type === 'error') icon = '❌';
  
  toast.innerHTML = `<div class="toast-notification__icon">${icon}</div><div class="toast-notification__text">${escapeHtml(message)}</div><button class="toast-notification__close" aria-label="Закрыть">×</button>`;
  document.body.appendChild(toast);
  
  const closeBtn = toast.querySelector('.toast-notification__close');
  closeBtn.addEventListener('click', () => {
    toast.classList.add('toast-notification--hide');
    setTimeout(() => toast.remove(), 300);
  });
  
  setTimeout(() => {
    if (toast && toast.parentNode) {
      toast.classList.add('toast-notification--hide');
      setTimeout(() => toast.remove(), 300);
    }
  }, duration);
}

// ============================================================
// === ЗАГРУЗКА ТОВАРОВ =======================================
// ============================================================

function loadProducts() {
  // Используем глобальные данные из data.js
  if (typeof productsData !== 'undefined') {
    products = productsData;
  } else {
    console.error('productsData не загружен! Убедитесь, что подключен data.js');
    products = [];
  }
  
  const isCatalogPage = window.location.pathname.includes("catalog.html");
  const productsToShow = isCatalogPage ? products : products.filter(p => p.isPopular);
  
  renderProducts(productsToShow);
  if (isCatalogPage) highlightProductFromUrl();
}

function renderProducts(list) {
  if (!productListEl) return;
  
  if (!list.length) {
    productListEl.innerHTML = "<p>Товары по заданным условиям не найдены.</p>";
    const emptyState = document.getElementById("emptyState");
    if (emptyState) emptyState.hidden = false;
    return;
  }
  
  const emptyState = document.getElementById("emptyState");
  if (emptyState) emptyState.hidden = true;
  
  productListEl.innerHTML = list.map((p) => {
    const categoryLabel = p.category === "vitamins" ? "Витамины и БАДы" : p.category === "tea" ? "Фиточаи" : "Косметика";
    const badge = p.promoLabel ? `<span class="product-card__badge product-card__badge--promo">${escapeHtml(p.promoLabel)}</span>` : p.isNew ? `<span class="product-card__badge">Новинка</span>` : "";
    
    return `
      <article class="product-card" data-product-id="${p.id}" data-category="${p.category}">
          <img src="${p.image}" alt="${escapeHtml(p.name)}" class="product-card__image" loading="lazy" onerror="this.src='https://placehold.co/200x170?text=Нет+фото'">
          ${badge}
          <div class="product-card__category">${categoryLabel}</div>
          <h3 class="product-card__title">${escapeHtml(p.name)}</h3>
          <p class="product-card__desc">${escapeHtml(p.description)}</p>
          <div class="product-card__meta">
              <div>
                  <div class="product-card__price">${p.price.toLocaleString("ru-RU")} ₽</div>
                  <div class="product-card__volume">${escapeHtml(p.volume)}</div>
                  <div class="product-card__stock">${escapeHtml(p.stock)}</div>
              </div>
              <button class="btn btn--secondary product-card__btn" data-add-to-cart="${p.id}">В корзину</button>
          </div>
      </article>
    `;
  }).join("");
}

function applyFilters() {
  if (!productListEl) return;
  
  const searchValue = searchInputEl ? searchInputEl.value.trim().toLowerCase() : "";
  const categoryValue = categoryFilterEl ? categoryFilterEl.value : "all";
  const sortValue = document.getElementById("sortSelect")?.value || "default";
  
  let filtered = products.filter((p) => {
    const matchesCategory = categoryValue === "all" || p.category === categoryValue;
    const matchesSearch = p.name.toLowerCase().includes(searchValue);
    return matchesCategory && matchesSearch;
  });
  
  if (sortValue === "price-asc") filtered.sort((a, b) => a.price - b.price);
  else if (sortValue === "price-desc") filtered.sort((a, b) => b.price - a.price);
  else if (sortValue === "name-asc") filtered.sort((a, b) => a.name.localeCompare(b.name));
  
  renderProducts(filtered);
  
  const emptyState = document.getElementById("emptyState");
  if (emptyState) emptyState.hidden = filtered.length > 0;
}

// ============================================================
// === КОРЗИНА ================================================
// ============================================================

function loadCart() {
  try {
    const stored = localStorage.getItem(CART_KEY);
    if (stored) cart = JSON.parse(stored);
    else cart = [];
  } catch { cart = []; }
}

function saveCart() {
  try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch {}
}

function updateCartCount() {
  if (!cartCountEl) return;
  cartCountEl.textContent = String(cart.reduce((sum, item) => sum + item.quantity, 0));
}

function updateCartTotal() {
  if (!cartSubtotalEl || !cartTotalEl) return;
  
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  let discount = 0;
  
  const immunityItem = cart.find((item) => String(item.id) === "1");
  if (immunityItem) {
    discount += Math.round(immunityItem.price * immunityItem.quantity * 0.15);
  }
  
  const teaPromoSum = cart
    .filter((item) => item.category === "tea" && item.promoLabel)
    .reduce((sum, item) => sum + item.price * item.quantity, 0);
  if (teaPromoSum > 0) discount += Math.round(teaPromoSum * 0.1);
  
  const total = Math.max(subtotal - discount, 0);
  
  cartSubtotalEl.textContent = `${subtotal.toLocaleString("ru-RU")} ₽`;
  cartTotalEl.textContent = `${total.toLocaleString("ru-RU")} ₽`;
  
  if (cartDiscountEl && cartDiscountRowEl) {
    if (discount > 0) {
      cartDiscountEl.textContent = `‑${discount.toLocaleString("ru-RU")} ₽`;
      cartDiscountRowEl.hidden = false;
    } else {
      cartDiscountRowEl.hidden = true;
    }
  }
}

function renderCart() {
  if (!cartItemsEl) return;
  
  if (!cart.length) {
    cartItemsEl.innerHTML = "<p>Ваша корзина пуста. Добавьте товары из каталога.</p>";
  } else {
    cartItemsEl.innerHTML = cart.map(item => 
      `<div class="cart-item">
          <div class="cart-item__title">${escapeHtml(item.name)}</div>
          <div class="cart-item__price">${item.price.toLocaleString("ru-RU")} ₽</div>
          <div class="cart-item__qty">
              <button type="button" class="cart-item__btn" data-cart-dec="${item.id}">−</button>
              <span>${item.quantity}</span>
              <button type="button" class="cart-item__btn" data-cart-inc="${item.id}">+</button>
          </div>
          <button type="button" class="cart-item__remove" data-cart-remove="${item.id}">удалить</button>
      </div>`
    ).join("");
  }
  
  updateCartCount();
  updateCartTotal();
}

function addToCart(productId) {
  const product = products.find((p) => String(p.id) === String(productId));
  if (!product) {
    console.error('Товар не найден! ID:', productId);
    return;
  }
  
  const existing = cart.find((item) => String(item.id) === String(productId));
  if (existing) existing.quantity += 1;
  else cart.push({ ...product, quantity: 1 });
  
  saveCart();
  renderCart();
  showToast("Товар добавлен в корзину", "success", 2000);
  
  if (cartButtonEl) {
    cartButtonEl.style.transform = 'scale(1.05)';
    setTimeout(() => { if(cartButtonEl) cartButtonEl.style.transform = ''; }, 200);
  }
}

function changeCartQty(productId, delta) {
  const index = cart.findIndex((item) => String(item.id) === String(productId));
  if (index === -1) return;
  
  cart[index].quantity += delta;
  if (cart[index].quantity <= 0) cart.splice(index, 1);
  
  saveCart();
  renderCart();
}

function removeFromCart(productId) {
  cart = cart.filter((item) => String(item.id) !== String(productId));
  saveCart();
  renderCart();
}

function openCart() {
  if (cartPanelEl) {
    cartPanelEl.classList.add("cart--open");
    cartPanelEl.setAttribute("aria-hidden", "false");
  }
}

function closeCart() {
  if (cartPanelEl) {
    cartPanelEl.classList.remove("cart--open");
    cartPanelEl.setAttribute("aria-hidden", "true");
  }
}

// ============================================================
// === ОБРАБОТКА ФОРМ =========================================
// ============================================================

function handleFeedbackSubmit(event) {
  event.preventDefault();
  event.stopPropagation();
  
  if (!feedbackFormEl) return;
  
  const formData = new FormData(feedbackFormEl);
  const name = formData.get('name')?.trim() || '';
  const email = formData.get('email')?.trim() || '';
  const message = formData.get('message')?.trim() || '';
  
  if (name.length < 2) {
    showToast("Введите корректное имя", "error");
    return;
  }
  
  if (!isValidEmail(email)) {
    showToast("Введите корректный email с символом @", "error");
    return;
  }
  
  if (message.length < 5) {
    showToast("Сообщение слишком короткое", "error");
    return;
  }
  
  // Сохраняем сообщение в localStorage
  const feedbackData = { name, email, message };
  if (typeof saveFeedback !== 'undefined') {
    saveFeedback(feedbackData);
  } else {
    // Резервное сохранение
    let existing = JSON.parse(localStorage.getItem('sib_health_feedback') || '[]');
    existing.push({ ...feedbackData, id: Date.now().toString(), date: new Date().toISOString() });
    localStorage.setItem('sib_health_feedback', JSON.stringify(existing));
  }
  
  showToast("Сообщение успешно отправлено! Мы свяжемся с вами.", "success", 6000);
  feedbackFormEl.reset();
}

function handleOrderSubmit(event) {
  event.preventDefault();
  event.stopPropagation();
  
  if (!cart.length) {
    showToast("Корзина пуста. Добавьте товары.", "error");
    return;
  }
  
  if (!orderFormEl) return;
  
  const formData = new FormData(orderFormEl);
  const fullname = formData.get('name')?.trim() || '';
  const phone = formData.get('phone')?.trim() || '';
  const delivery = formData.get('delivery');
  
  if (fullname.length < 2) {
    showToast("Введите имя и фамилию", "error");
    return;
  }
  
  const cleanPhone = phone.replace(/\D/g, '');
  if (cleanPhone.length !== 11 || !(cleanPhone.startsWith('7') || cleanPhone.startsWith('8'))) {
    showToast("Введите корректный номер телефона в формате +79991234567", "error");
    return;
  }
  
  if (!delivery) {
    showToast("Выберите способ доставки", "error");
    return;
  }
  
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  let discount = 0;
  
  const immunityItem = cart.find((item) => String(item.id) === "1");
  if (immunityItem) {
    discount += Math.round(immunityItem.price * immunityItem.quantity * 0.15);
  }
  
  const teaPromoSum = cart
    .filter((item) => item.category === "tea" && item.promoLabel)
    .reduce((sum, item) => sum + item.price * item.quantity, 0);
  if (teaPromoSum > 0) discount += Math.round(teaPromoSum * 0.1);
  
  const orderData = {
    fullname, phone, delivery,
    items: cart.map(item => ({
      id: item.id, name: item.name, price: item.price,
      quantity: item.quantity, category: item.category
    })),
    subtotal, discount, total: Math.max(subtotal - discount, 0)
  };
  
  // Сохраняем заказ в localStorage
  if (typeof saveOrder !== 'undefined') {
    saveOrder(orderData);
  } else {
    let existing = JSON.parse(localStorage.getItem('sib_health_orders') || '[]');
    existing.push({ ...orderData, id: Date.now().toString(), date: new Date().toISOString() });
    localStorage.setItem('sib_health_orders', JSON.stringify(existing));
  }
  
  showToast("Заказ успешно оформлен! Спасибо за покупку!", "success", 6000);
  
  cart = [];
  saveCart();
  renderCart();
  orderFormEl.reset();
  setTimeout(() => closeCart(), 2000);
}

// ============================================================
// === СЕРТИФИКАТЫ И АКЦИИ ====================================
// ============================================================

function handleGiftCardClick(event) {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  
  const card = target.closest(".gift-card");
  if (!card) return;
  
  const amount = card.getAttribute("data-amount");
  
  document.querySelectorAll(".gift-card--selected").forEach(el => el.classList.remove("gift-card--selected"));
  card.classList.add("gift-card--selected");
  
  if (amount) sessionStorage.setItem(CERTIFICATE_AMOUNT_KEY, amount);
  
  const amountDisplay = amount === "custom" ? "индивидуальный" : amount + " ₽";
  showToast(`Выбран номинал: ${amountDisplay}`, "info", 3000);
  
  const form = document.getElementById("feedbackForm");
  if (form) {
    const messageField = form.querySelector('textarea[name="message"]');
    if (messageField) {
      const amountText = amount !== "custom" ? `Номинал: ${amount} ₽.` : "Номинал: индивидуальная сумма. ";
      messageField.value = `Здравствуйте! Интересует приобретение подарочного сертификата на продукцию «Сибирское здоровье». ${amountText} Пожалуйста, уточните доступные номиналы и способы оплаты.`;
    }
  }
  
  const feedbackSection = document.getElementById("feedback");
  if (feedbackSection) {
    feedbackSection.scrollIntoView({ behavior: "smooth" });
    setTimeout(() => {
      const messageField = document.getElementById("feedbackForm")?.querySelector('textarea[name="message"]');
      if (messageField) messageField.focus();
    }, 500);
  }
}

function handleCertificateRedirect() {
  const savedAmount = sessionStorage.getItem(CERTIFICATE_AMOUNT_KEY);
  if (!savedAmount) return;
  
  const form = document.getElementById("feedbackForm");
  if (!form) return;
  
  const messageField = form.querySelector('textarea[name="message"]');
  if (!messageField) return;
  
  const amountText = savedAmount !== "custom" ? `Номинал: ${savedAmount} ₽.` : "Номинал: индивидуальная сумма. ";
  messageField.value = `Здравствуйте! Интересует приобретение подарочного сертификата на продукцию «Сибирское здоровье». ${amountText} Пожалуйста, уточните доступные номиналы и способы оплаты.`;
  
  setTimeout(() => {
    messageField.scrollIntoView({ behavior: "smooth", block: "center" });
    messageField.focus();
  }, 300);
  
  sessionStorage.removeItem(CERTIFICATE_AMOUNT_KEY);
}

function handlePromoClick(event) {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  
  const card = target.closest(".promo-card");
  if (!card) return;
  
  const promoType = card.getAttribute("data-promo");
  if (promoType === "immunity") window.location.href = "catalog.html?highlight=1";
  else if (promoType === "tea") window.location.href = "catalog.html?highlight=2,4";
  else if (promoType === "gift") window.location.href = "certificates.html";
}

function handleCertificateClick(type) {
  if (!feedbackFormEl) return scrollToSection("feedback");
  
  const messageField = feedbackFormEl.querySelector('textarea[name="message"]');
  if (!messageField) return scrollToSection("feedback");
  
  let text = "Здравствуйте! Прошу выслать сертификаты на продукцию «Сибирское здоровье». ";
  if (type === "gost") text = "Здравствуйте! Прошу выслать копии деклараций о соответствии и сертификатов (ГОСТ, ТР ТС) на основные позиции каталога. ";
  else if (type === "lab") text = "Здравствуйте! Интересуют результаты лабораторных испытаний по безопасности и содержанию активных веществ для представленной продукции. ";
  else if (type === "client") text = "Здравствуйте! Хотел(а) бы получить копии сертификатов и деклараций на конкретные товары. Пожалуйста, свяжитесь со мной для уточнения перечня. ";
  
  messageField.value = text;
  scrollToSection("feedback");
  messageField.focus();
}

function highlightProductFromUrl() {
  const urlParams = new URLSearchParams(window.location.search);
  const highlightParam = urlParams.get("highlight");
  if (!highlightParam || !productListEl) return;
  
  document.querySelectorAll(".product-card--highlighted").forEach(el => el.classList.remove("product-card--highlighted"));
  
  const productIds = highlightParam.split(",").map(id => String(id.trim()));
  productIds.forEach(id => {
    const card = productListEl.querySelector(`[data-product-id="${id}"]`);
    if (card) card.classList.add("product-card--highlighted");
  });
  
  const first = productListEl.querySelector(".product-card--highlighted");
  if (first) setTimeout(() => first.scrollIntoView({ behavior: "smooth", block: "center" }), 300);
  setTimeout(() => document.querySelectorAll(".product-card--highlighted").forEach(el => el.classList.remove("product-card--highlighted")), 5000);
}

// ============================================================
// === ИНИЦИАЛИЗАЦИЯ СОБЫТИЙ ==================================
// ============================================================

function initEvents() {
  if (searchInputEl) searchInputEl.addEventListener("input", applyFilters);
  if (categoryFilterEl) categoryFilterEl.addEventListener("change", applyFilters);
  
  const sortSelect = document.getElementById("sortSelect");
  if (sortSelect) sortSelect.addEventListener("change", applyFilters);
  
  const resetBtn = document.getElementById("resetFiltersBtn");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      if (searchInputEl) searchInputEl.value = "";
      if (categoryFilterEl) categoryFilterEl.value = "all";
      if (sortSelect) sortSelect.value = "default";
      applyFilters();
    });
  }
  
  if (productListEl) {
    productListEl.addEventListener("click", (e) => {
      const t = e.target;
      if (!(t instanceof HTMLElement)) return;
      const addId = t.getAttribute("data-add-to-cart");
      if (addId) addToCart(addId);
    });
  }
  
  if (cartButtonEl) cartButtonEl.addEventListener("click", openCart);
  if (cartCloseEl) cartCloseEl.addEventListener("click", closeCart);
  if (cartOverlayEl) cartOverlayEl.addEventListener("click", closeCart);
  
  if (cartItemsEl) {
    cartItemsEl.addEventListener("click", (e) => {
      const t = e.target;
      if (!(t instanceof HTMLElement)) return;
      const incBtn = t.closest('[data-cart-inc]');
      const decBtn = t.closest('[data-cart-dec]');
      const removeBtn = t.closest('[data-cart-remove]');
      if (incBtn) changeCartQty(incBtn.getAttribute('data-cart-inc'), 1);
      else if (decBtn) changeCartQty(decBtn.getAttribute('data-cart-dec'), -1);
      else if (removeBtn) removeFromCart(removeBtn.getAttribute('data-cart-remove'));
    });
  }
  
  if (feedbackFormEl) feedbackFormEl.addEventListener("submit", handleFeedbackSubmit);
  if (orderFormEl) orderFormEl.addEventListener("submit", handleOrderSubmit);
  if (promosGridEl) promosGridEl.addEventListener("click", handlePromoClick);
  
  if (certificatesCardsEl) {
    certificatesCardsEl.addEventListener("click", (e) => {
      const t = e.target;
      if (!(t instanceof HTMLElement)) return;
      const card = t.closest(".certificate-card");
      if (card) handleCertificateClick(card.getAttribute("data-certificate") || "");
    });
  }
  
  if (giftCardsEl) giftCardsEl.addEventListener("click", handleGiftCardClick);
}

// ============================================================
// === ЗАПУСК ПРИ ЗАГРУЗКЕ СТРАНИЦЫ ===========================
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
  loadCart();
  renderCart();
  initEvents();
  handleCertificateRedirect();
  loadProducts();
});