// --- API КОНФИГУРАЦИЯ ---
const API_URL = 'http://localhost:3000';
// --- ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ---
let products = [];
let cart = [];
const CART_KEY = "sib_health_cart";
const CERTIFICATE_AMOUNT_KEY = "sib_health_certificate_amount";
// --- СЕЛЕКТОРЫ ---
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
const orderSuccessEl = document.getElementById("orderSuccess");
const feedbackFormEl = document.getElementById("feedbackForm");
const feedbackSuccessEl = document.getElementById("feedbackSuccess");
const promosGridEl = document.querySelector(".promos__grid");
const certificatesCardsEl = document.querySelector(".certificates__cards");
const giftCardsEl = document.querySelector(".gift-cards");

// --- ЗАГРУЗКА ТОВАРОВ С СЕРВЕРА ---
async function loadProducts() {
    try {
        const response = await fetch(`${API_URL}/products`);
        if (!response.ok) throw new Error('Ошибка загрузки товаров');
        products = await response.json();
        
        const isCatalogPage = window.location.pathname.includes("catalog.html");
        const productsToShow = isCatalogPage ? products : products.filter(p => p.isPopular);
        
        renderProducts(productsToShow);
        
        if (isCatalogPage) highlightProductFromUrl();
    } catch (error) {
        console.error('Ошибка:', error);
        if (productListEl) {
            productListEl.innerHTML = '<p style="color: red; text-align: center; padding: 20px;">❌ Ошибка загрузки товаров. Убедитесь, что JSON Server запущен: <strong>json-server --watch db.json --port 3000</strong></p>';
        }
    }
}

// --- ОТПРАВКА ЗАКАЗА НА СЕРВЕР ---
async function submitOrder(orderData) {
    const response = await fetch(`${API_URL}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
    });
    if (!response.ok) throw new Error('Ошибка отправки заказа');
    return await response.json();
}

// --- ОТПРАВКА СООБЩЕНИЯ НА СЕРВЕР ---
async function submitFeedback(feedbackData) {
    const response = await fetch(`${API_URL}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(feedbackData)
    });
    if (!response.ok) throw new Error('Ошибка отправки сообщения');
    return await response.json();
}

// --- КОРЗИНА ---
function loadCart() {
    try {
        const stored = localStorage.getItem(CART_KEY);
        if (stored) cart = JSON.parse(stored);
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

    const immunityItem = cart.find((item) => item.id === 1);
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
        cartItemsEl.innerHTML = cart.map(item => `
            <div class="cart-item">
                <div class="cart-item__title">${item.name}</div>
                <div class="cart-item__price">${item.price.toLocaleString("ru-RU")} ₽</div>
                <div class="cart-item__qty">
                    <button class="cart-item__btn" data-cart-dec="${item.id}">−</button>
                    <span>${item.quantity}</span>
                    <button class="cart-item__btn" data-cart-inc="${item.id}">+</button>
                </div>
                <button class="cart-item__remove" data-cart-remove="${item.id}">удалить</button>
            </div>
        `).join("");
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

// --- КАТАЛОГ И ФИЛЬТРЫ ---
function renderProducts(list) {
    if (!productListEl) return;
    if (!list.length) {
        productListEl.innerHTML = "<p>Товары по заданным условиям не найдены.</p>";
        return;
    }
    productListEl.innerHTML = list.map((p) => {
        const categoryLabel =
            p.category === "vitamins" ? "Витамины и БАДы" :
            p.category === "tea" ? "Фиточаи" : "Косметика";

        const badge = p.promoLabel ? `<span class="product-card__badge product-card__badge--promo">${p.promoLabel}</span>` :
                     p.isNew ? `<span class="product-card__badge">Новинка</span>` : "";

        return `
            <article class="product-card" data-product-id="${p.id}" data-category="${p.category}">
                <img src="${p.image}" alt="${p.name}" class="product-card__image" loading="lazy" onerror="this.src='https://placehold.co/200x170?text=Нет+фото'">
                ${badge}
                <div class="product-card__category">${categoryLabel}</div>
                <h3 class="product-card__title">${p.name}</h3>
                <p class="product-card__desc">${p.description}</p>
                <div class="product-card__meta">
                    <div>
                        <div class="product-card__price">${p.price.toLocaleString("ru-RU")} ₽</div>
                        <div class="product-card__volume">${p.volume}</div>
                        <div class="product-card__stock">${p.stock}</div>
                    </div>
                    <button class="btn btn--secondary product-card__btn" data-add-to-cart="${p.id}">В корзину</button>
                </div>
            </article>
        `;
    }).join("");
}

function applyFilters() {
    if (!searchInputEl || !categoryFilterEl) return;
    const searchValue = searchInputEl.value.trim().toLowerCase();
    const categoryValue = categoryFilterEl.value;
    const filtered = products.filter((p) => {
        const matchesCategory = categoryValue === "all" || p.category === categoryValue;
        const matchesSearch = p.name.toLowerCase().includes(searchValue);
        return matchesCategory && matchesSearch;
    });
    renderProducts(filtered);
}

function scrollToSection(id) {
    const section = document.getElementById(id);
    if (section) section.scrollIntoView({ behavior: "smooth" });
}

// --- ОБРАБОТКА ФОРМ ---
async function handleFeedbackSubmit(event) {
    event.preventDefault();
    if (!feedbackFormEl || !feedbackSuccessEl) return;
    const formData = new FormData(feedbackFormEl);
    const feedbackData = {
        name: formData.get('name'),
        email: formData.get('email'),
        message: formData.get('message'),
        date: new Date().toISOString()
    };
    try {
        await submitFeedback(feedbackData);
        feedbackSuccessEl.hidden = false;
        setTimeout(() => feedbackSuccessEl.hidden = true, 4000);
        feedbackFormEl.reset();
    } catch { alert('❌ Ошибка отправки. Запустите JSON Server.'); }
}

async function handleOrderSubmit(event) {
    event.preventDefault();
    if (!cart.length) return alert("Корзина пуста.");
    if (!orderSuccessEl || !orderFormEl) return;
    
    const formData = new FormData(orderFormEl);
    const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    let discount = 0;

    const immunityItem = cart.find((item) => item.id === 1);
    if (immunityItem) discount += Math.round(immunityItem.price * immunityItem.quantity * 0.15);
    
    const teaPromoSum = cart.filter((item) => item.category === "tea" && item.promoLabel)
                            .reduce((sum, item) => sum + item.price * item.quantity, 0);
    if (teaPromoSum > 0) discount += Math.round(teaPromoSum * 0.1);

    const orderData = {
        fullname: formData.get('fullname'),
        phone: formData.get('phone'),
        delivery: formData.get('delivery'),
        items: cart.map(item => ({ id: item.id, name: item.name, price: item.price, quantity: item.quantity, category: item.category })),
        subtotal, discount, total: Math.max(subtotal - discount, 0),
        date: new Date().toISOString()
    };

    try {
        await submitOrder(orderData);
        orderSuccessEl.hidden = false;
        setTimeout(() => orderSuccessEl.hidden = true, 5000);
        cart = []; saveCart(); renderCart(); orderFormEl.reset();
    } catch { alert('❌ Ошибка оформления. Запустите JSON Server.'); }
}

// --- СЕРТИФИКАТЫ И АКЦИИ ---
function handleGiftCardClick(event) {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const card = target.closest(".gift-card");
    if (!card) return;
    const amount = card.getAttribute("data-amount");
    document.querySelectorAll(".gift-card--selected").forEach(el => el.classList.remove("gift-card--selected"));
    card.classList.add("gift-card--selected");
    if (amount) sessionStorage.setItem(CERTIFICATE_AMOUNT_KEY, amount);
    window.location.href = "index.html#contacts";
}

function handleCertificateRedirect() {
    const savedAmount = sessionStorage.getItem(CERTIFICATE_AMOUNT_KEY);
    if (savedAmount && feedbackFormEl) {
        const messageField = feedbackFormEl.querySelector('textarea[name="message"]');
        if (messageField) {
            const amountText = savedAmount !== "custom" ? `Номинал: ${savedAmount} ₽.` : "Номинал: индивидуальная сумма. ";
            messageField.value = "Здравствуйте! Интересует приобретение подарочного сертификата на продукцию «Сибирское здоровье». " + amountText + " Пожалуйста, уточните доступные номиналы и способы оплаты.";
            setTimeout(() => { messageField.scrollIntoView({ behavior: "smooth", block: "center" }); messageField.focus(); }, 100);
        }
        sessionStorage.removeItem(CERTIFICATE_AMOUNT_KEY);
    }
}

function handlePromoClick(event) {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const card = target.closest(".promo-card");
    if (!card) return;
    const promoType = card.getAttribute("data-promo");
    if (promoType === "immunity") window.location.href = "catalog.html?highlight=1";
    else if (promoType === "tea") window.location.href = "catalog.html?highlight=2,4";
    else if (promoType === "gift") window.location.href = "index.html#contacts";
}

function handleCertificateClick(type) {
    if (!feedbackFormEl) return scrollToSection("contacts");
    const messageField = feedbackFormEl.querySelector('textarea[name="message"]');
    if (!messageField) return scrollToSection("contacts");
    
    let text = "Здравствуйте! Прошу выслать сертификаты на продукцию «Сибирское здоровье». ";
    if (type === "gost") text = "Здравствуйте! Прошу выслать копии деклараций о соответствии и сертификатов (ГОСТ, ТР ТС) на основные позиции каталога. ";
    else if (type === "lab") text = "Здравствуйте! Интересуют результаты лабораторных испытаний по безопасности и содержанию активных веществ для представленной продукции. ";
    else if (type === "client") text = "Здравствуйте! Хотел(а) бы получить копии сертификатов и деклараций на конкретные товары. Пожалуйста, свяжитесь со мной для уточнения перечня. ";

    messageField.value = text;
    scrollToSection("contacts");
    messageField.focus();
}

// --- ПОДСВЕТКА ТОВАРОВ ---
function highlightProductFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const highlightParam = urlParams.get("highlight");
    if (!highlightParam || !productListEl) return;

    document.querySelectorAll(".product-card--highlighted").forEach(el => el.classList.remove("product-card--highlighted"));
    const productIds = highlightParam.split(",").map(id => Number(id.trim()));

    productIds.forEach(id => {
        const card = productListEl.querySelector(`[data-product-id="${id}"]`);
        if (card) card.classList.add("product-card--highlighted");
    });

    const first = productListEl.querySelector(".product-card--highlighted");
    if (first) setTimeout(() => first.scrollIntoView({ behavior: "smooth", block: "center" }), 300);
    setTimeout(() => document.querySelectorAll(".product-card--highlighted").forEach(el => el.classList.remove("product-card--highlighted")), 5000);
}

// --- ИНИЦИАЛИЗАЦИЯ СОБЫТИЙ ---
function initEvents() {
    if (searchInputEl) searchInputEl.addEventListener("input", applyFilters);
    if (categoryFilterEl) categoryFilterEl.addEventListener("change", applyFilters);
    
    if (productListEl) {
        productListEl.addEventListener("click", (e) => {
            const t = e.target;
            if (!(t instanceof HTMLElement)) return;
            const addId = t.getAttribute("data-add-to-cart");
            if (addId) addToCart(Number(addId));
        });
    }

    if (cartButtonEl) cartButtonEl.addEventListener("click", openCart);
    if (cartCloseEl) cartCloseEl.addEventListener("click", closeCart);
    if (cartOverlayEl) cartOverlayEl.addEventListener("click", closeCart);
    
    if (cartItemsEl) {
        cartItemsEl.addEventListener("click", (e) => {
            const t = e.target;
            if (!(t instanceof HTMLElement)) return;
            const incId = t.getAttribute("data-cart-inc");
            const decId = t.getAttribute("data-cart-dec");
            const removeId = t.getAttribute("data-cart-remove");
            if (incId) changeCartQty(Number(incId), 1);
            else if (decId) changeCartQty(Number(decId), -1);
            else if (removeId) removeFromCart(Number(removeId));
        });
    }

    if (feedbackFormEl) feedbackFormEl.addEventListener("submit", handleFeedbackSubmit);
    if (orderFormEl) orderFormEl.addEventListener("submit", handleOrderSubmit);
    if (promosGridEl) promosGridEl.addEventListener("click", handlePromoClick);
    if (certificatesCardsEl) certificatesCardsEl.addEventListener("click", (e) => {
        const t = e.target;
        if (!(t instanceof HTMLElement)) return;
        const card = t.closest(".certificate-card");
        if (card) handleCertificateClick(card.getAttribute("data-certificate") || "");
    });
    if (giftCardsEl) giftCardsEl.addEventListener("click", handleGiftCardClick);
}

document.addEventListener("DOMContentLoaded", () => {
    loadCart();
    renderCart();
    initEvents();
    handleCertificateRedirect();
    loadProducts();
});
