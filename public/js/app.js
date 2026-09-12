// ---------------------------------------------------------------------------
// Mandi storefront — vanilla JS, talks to the Express API under /api
// ---------------------------------------------------------------------------

const ICON = {
  x: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  plus: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  minus: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  star: `<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26"/></svg>`,
  starOutline: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26"/></svg>`,
  chevronLeft: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>`,
  cart: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 2-1.58l1.65-7.42H5.12"/></svg>`,
  trash: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`,
  mapPin: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`,
  card: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>`,
  check: `<svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#2f6f5e" stroke-width="1.6"><circle cx="12" cy="12" r="10"/><polyline points="8 12.5 11 15.5 16 9"/></svg>`,
};

const CATEGORIES = ["All", "Electronics", "Fashion", "Home", "Beauty", "Books"];
const PAY_METHODS = [
  { id: "card", label: "Debit / Credit Card", note: "Instant demo payment" },
  { id: "jazzcash", label: "JazzCash", note: "Manual transfer" },
  { id: "easypaisa", label: "Easypaisa", note: "Manual transfer" },
  { id: "sadapay", label: "SadaPay", note: "Manual transfer" },
];
const WALLET_NUMBER = "0328-6815131";

function readStoredJson(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    localStorage.removeItem(key);
    return fallback;
  }
}

const state = {
  view: "home",
  products: [],
  category: "All",
  query: "",
  selectedProduct: null,
  cart: readStoredJson("mandi_cart", []),
  cartOpen: false,
  token: localStorage.getItem("mandi_token") || null,
  user: readStoredJson("mandi_user", null),
  authModal: null, // 'login' | 'register' | null
  authError: "",
  order: null,
  myOrders: [],
  shipping: { name: "", phone: "", address: "", city: "" },
  paymentMethod: "card",
  paymentRef: "",
  card: { name: "", number: "", expiry: "", cvv: "" },
  formErrors: {},
  isProcessing: false,
};

function persist() {
  localStorage.setItem("mandi_cart", JSON.stringify(state.cart));
  if (state.token) localStorage.setItem("mandi_token", state.token);
  else localStorage.removeItem("mandi_token");
  if (state.user) localStorage.setItem("mandi_user", JSON.stringify(state.user));
  else localStorage.removeItem("mandi_user");
}

function setPath(obj, path, value) {
  const parts = path.split(".");
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) cur = cur[parts[i]];
  cur[parts[parts.length - 1]] = value;
}

async function api(path, { method = "GET", body, auth = false } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth && state.token) headers.Authorization = "Bearer " + state.token;
  const res = await fetch("/api" + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong.");
  return data;
}

const fmt = (n) => `Rs ${Number(n).toLocaleString("en-PK")}`;
const img = (url, fallbackSeed, size = 500) => url || `https://picsum.photos/seed/${fallbackSeed}/${size}/${size}`;

function stars(rating) {
  let out = "";
  for (let i = 1; i <= 5; i++) out += i <= Math.round(rating) ? ICON.star : ICON.starOutline;
  return `<span class="stars" style="color:${"#E08D3C"}">${out}</span>`;
}

function cartCount() {
  return state.cart.reduce((s, c) => s + c.qty, 0);
}
function cartLines() {
  return state.cart
    .map((c) => ({ ...c, product: state.products.find((p) => p.id === c.id) }))
    .filter((c) => c.product);
}
function cartTotal() {
  return cartLines().reduce((s, c) => s + c.product.price * c.qty, 0);
}
function shippingFee() {
  const t = cartTotal();
  return t === 0 || t > 5000 ? 0 : 250;
}

// ---------------------------------------------------------------------------
// Data loading
// ---------------------------------------------------------------------------
async function loadProducts() {
  state.products = await api("/products");
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------
function addToCart(id, qty = 1) {
  const existing = state.cart.find((c) => c.id === id);
  if (existing) existing.qty += qty;
  else state.cart.push({ id, qty });
  persist();
  state.cartOpen = true;
  render();
}
function updateQty(id, delta) {
  const line = state.cart.find((c) => c.id === id);
  if (!line) return;
  line.qty += delta;
  state.cart = state.cart.filter((c) => c.qty > 0);
  persist();
  render();
}
function removeLine(id) {
  state.cart = state.cart.filter((c) => c.id !== id);
  persist();
  render();
}
function openProduct(id) {
  state.selectedProduct = state.products.find((p) => p.id === id);
  state.view = "product";
  state.cartOpen = false;
  window.scrollTo({ top: 0 });
  render();
}
function goHome() {
  state.view = "home";
  state.selectedProduct = null;
  render();
}
function goCheckout() {
  if (!state.user) {
    state.authModal = "login";
    state.authError = "Log in to continue to checkout.";
    render();
    return;
  }
  state.cartOpen = false;
  state.view = "checkout";
  state.formErrors = {};
  window.scrollTo({ top: 0 });
  render();
}
async function goMyOrders() {
  if (!state.user) {
    state.authModal = "login";
    render();
    return;
  }
  state.myOrders = await api("/orders/mine", { auth: true });
  state.view = "orders";
  window.scrollTo({ top: 0 });
  render();
}
function logout() {
  state.token = null;
  state.user = null;
  persist();
  goHome();
}

function formatCardNumber(v) {
  return v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
}
function formatExpiry(v) {
  const d = v.replace(/\D/g, "").slice(0, 4);
  return d.length <= 2 ? d : d.slice(0, 2) + "/" + d.slice(2);
}

async function placeOrder() {
  const errors = {};
  const s = state.shipping;
  if (!s.name.trim()) errors.name = "Enter your full name.";
  if (!/^[0-9+ -]{7,15}$/.test(s.phone.trim())) errors.phone = "Enter a valid phone number.";
  if (!s.address.trim()) errors.address = "Enter a delivery address.";
  if (!s.city.trim()) errors.city = "Enter your city.";

  if (state.paymentMethod === "card") {
    const c = state.card;
    if (!c.name.trim()) errors.cardName = "Enter the name on the card.";
    if (c.number.replace(/\D/g, "").length !== 16) errors.cardNumber = "Card number must be 16 digits.";
    if (!/^\d{2}\/\d{2}$/.test(c.expiry)) errors.expiry = "Use MM/YY format.";
    if (!/^\d{3,4}$/.test(c.cvv)) errors.cvv = "Enter a valid CVV.";
  } else {
    if (!state.paymentRef.trim()) errors.paymentRef = "Enter the transaction ID from your payment app.";
  }

  state.formErrors = errors;
  if (Object.keys(errors).length > 0) {
    render();
    return;
  }

  state.isProcessing = true;
  render();

  try {
    // Card payments simulate a short processing delay (no real card is charged).
    if (state.paymentMethod === "card") await new Promise((r) => setTimeout(r, 1200));

    const order = await api("/orders", {
      method: "POST",
      auth: true,
      body: {
        items: state.cart,
        shipping: state.shipping,
        payment_method: state.paymentMethod,
        payment_reference: ["card", "cod"].includes(state.paymentMethod)
  ? null
  : state.paymentRef.trim()
      },
    });

    state.order = order;
    state.cart = [];
    persist();
    state.view = "confirmation";
    state.isProcessing = false;
    window.scrollTo({ top: 0 });
    render();
  } catch (err) {
    state.isProcessing = false;
    state.formErrors = { general: err.message };
    render();
  }
}

async function handleAuth(mode) {
  const emailEl = document.getElementById("authEmail");
  const passEl = document.getElementById("authPassword");
  const nameEl = document.getElementById("authName");
  state.authError = "";
  try {
    let data;
    if (mode === "register") {
      data = await api("/auth/register", {
        method: "POST",
        body: { name: nameEl.value, email: emailEl.value, password: passEl.value },
      });
    } else {
      data = await api("/auth/login", {
        method: "POST",
        body: { email: emailEl.value, password: passEl.value },
      });
    }
    state.token = data.token;
    state.user = data.user;
    state.authModal = null;
    persist();
    render();
  } catch (err) {
    state.authError = err.message;
    render();
  }
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------
function updateHeaderChrome() {
  document.getElementById("accountLabel").textContent = state.user ? state.user.name.split(" ")[0] : "Log in";
  const badge = document.getElementById("cartBadge");
  const count = cartCount();
  badge.style.display = count > 0 ? "inline-flex" : "none";
  badge.textContent = count;
}

function filteredProducts() {
  return state.products.filter((p) => {
    const matchCat = state.category === "All" || p.category === state.category;
    const matchQuery = p.name.toLowerCase().includes(state.query.toLowerCase());
    return matchCat && matchQuery;
  });
}

function renderHome() {
  const products = filteredProducts();
  return `
    <div class="fade-in">
      <div class="hero">
        <div class="hero-inner">
          <h1 class="serif">Sab kuch, ek jagah.</h1>
          <p>Fresh finds daily, delivered across Pakistan. Free delivery on orders over Rs 5,000.</p>
        </div>
      </div>
      <div class="wrap">
        <div class="cat-row">
          ${CATEGORIES.map(
            (c) => `<button class="cat-pill ${c === state.category ? "active" : ""}" data-action="setCategory" data-value="${c}">${c}</button>`
          ).join("")}
        </div>
        ${
          products.length === 0
            ? `<div class="empty-state"><p class="serif">Nothing here yet.</p><p>Try a different search term or category.</p></div>`
            : `<div class="grid">${products.map(renderCard).join("")}</div>`
        }
      </div>
    </div>
  `;
}

function renderCard(p) {
  return `
    <div class="card">
      <button data-action="openProduct" data-id="${p.id}" style="border:none;background:none;padding:0;display:block;width:100%">
        <img src="${img(p.image_url, p.id)}" alt="${p.name}" />
      </button>
      <div class="card-body">
        <div class="card-title" data-action="openProduct" data-id="${p.id}">${p.name}</div>
        <div class="rating">${stars(p.rating)} <span>(${p.reviews})</span></div>
        <div class="price serif">${fmt(p.price)}</div>
        <button class="btn btn-accent btn-block" style="margin-top:8px" data-action="addToCart" data-id="${p.id}">Add to basket</button>
      </div>
    </div>
  `;
}

function renderProduct() {
  const p = state.selectedProduct;
  if (!p) return "";
  return `
    <div class="detail-wrap fade-in">
      <button class="back-link" data-action="goHome">${ICON.chevronLeft} Back to browsing</button>
      <div class="detail-grid">
        <div class="detail-img"><img src="${img(p.image_url, p.id, 800)}" alt="${p.name}" /></div>
        <div>
          <div class="kicker">${p.category}</div>
          <h1 class="detail-title serif">${p.name}</h1>
          <div class="rating">${stars(p.rating)} <span>${p.rating} · ${p.reviews} reviews</span></div>
          <div class="detail-price serif">${fmt(p.price)}</div>
          <p class="detail-desc">${p.description || "A everyday favourite, chosen for quality and value. Ships within 2–4 business days with easy 7-day returns."}</p>
          <div class="btn-row">
            <button class="btn-outline" data-action="addToCart" data-id="${p.id}">Add to basket</button>
            <button class="btn-accent" style="padding:9px 20px;border-radius:999px;border:none" data-action="buyNow" data-id="${p.id}">Buy now</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderCheckout() {
  const lines = cartLines();
  if (lines.length === 0) {
    return `<div class="wrap"><button class="back-link" data-action="goHome" style="margin-top:16px">${ICON.chevronLeft} Continue browsing</button>
      <div class="empty-state"><p class="serif">Your basket is empty.</p><p>Add something you like before checking out.</p></div></div>`;
  }
  const err = state.formErrors;
  const s = state.shipping;
  const c = state.card;
const isWallet = state.paymentMethod !== "card" && state.paymentMethod !== "cod";

  return `
    <div class="wrap fade-in" style="padding-top:16px;padding-bottom:60px">
      <button class="back-link" data-action="goHome">${ICON.chevronLeft} Continue browsing</button>
      <div class="checkout-grid">
        <div>
          <section style="margin-bottom:28px">
            <h2 class="section-title serif">${ICON.mapPin} Delivery address</h2>
            <div class="field-grid">
              <div class="field"><span>Full name</span><input data-bind="shipping.name" value="${s.name}" />${err.name ? `<span class="field-error">${err.name}</span>` : ""}</div>
              <div class="field"><span>Phone number</span><input data-bind="shipping.phone" value="${s.phone}" placeholder="03xx-xxxxxxx" />${err.phone ? `<span class="field-error">${err.phone}</span>` : ""}</div>
              <div class="field full"><span>Address</span><input data-bind="shipping.address" value="${s.address}" placeholder="House, street, area" />${err.address ? `<span class="field-error">${err.address}</span>` : ""}</div>
              <div class="field"><span>City</span><input data-bind="shipping.city" value="${s.city}" />${err.city ? `<span class="field-error">${err.city}</span>` : ""}</div>
            </div>
          </section>

          <section>
            <h2 class="section-title serif">${ICON.card} Payment</h2>
            <div class="pay-methods">
              ${PAY_METHODS.map(
                (m) => `<button class="pay-method ${state.paymentMethod === m.id ? "active" : ""}" data-action="setPayMethod" data-value="${m.id}">
                  <strong>${m.label}</strong><span style="color:var(--muted)">${m.note}</span>
                </button>`
              ).join("")}
            </div>

            ${
              isWallet
                ? `
              <div class="wallet-box">
                Send <b>${fmt(cartTotal() + shippingFee())}</b> via <b>${PAY_METHODS.find((m) => m.id === state.paymentMethod).label}</b> to <b>${WALLET_NUMBER}</b>,
                then enter the transaction ID below. Your order will show as <b>pending verification</b> until we confirm the payment.
              </div>
              <div class="field full">
                <span>Transaction ID</span>
                <input data-bind="paymentRef" value="${state.paymentRef}" placeholder="e.g. 1234567890" />
                ${err.paymentRef ? `<span class="field-error">${err.paymentRef}</span>` : ""}
              </div>
            `
                : `
              <div class="field-grid">
                <div class="field full"><span>Name on card</span><input data-bind="card.name" value="${c.name}" />${err.cardName ? `<span class="field-error">${err.cardName}</span>` : ""}</div>
                <div class="field full"><span>Card number</span><input data-bind="card.number" data-format="card" value="${c.number}" placeholder="1234 5678 9012 3456" inputmode="numeric" />${err.cardNumber ? `<span class="field-error">${err.cardNumber}</span>` : ""}</div>
                <div class="field"><span>Expiry (MM/YY)</span><input data-bind="card.expiry" data-format="expiry" value="${c.expiry}" placeholder="09/28" inputmode="numeric" />${err.expiry ? `<span class="field-error">${err.expiry}</span>` : ""}</div>
                <div class="field"><span>CVV</span><input data-bind="card.cvv" data-format="cvv" value="${c.cvv}" placeholder="123" inputmode="numeric" />${err.cvv ? `<span class="field-error">${err.cvv}</span>` : ""}</div>
              </div>
              <p style="font-size:12px;color:var(--faint);margin-top:8px">This is a simulated payment for the prototype — no real card is charged.</p>
            `
            }
            ${err.general ? `<div class="banner-msg banner-error" style="margin-top:10px">${err.general}</div>` : ""}
          </section>
        </div>

        <aside class="summary-card">
          <h3 class="serif" style="margin:0 0 12px">Order summary</h3>
          <div class="summary-lines">
            ${lines.map((l) => `<div class="summary-line"><span class="line-clamp-2" style="max-width:70%">${l.product.name} × ${l.qty}</span><span>${fmt(l.product.price * l.qty)}</span></div>`).join("")}
          </div>
          <div class="row-between"><span>Subtotal</span><span>${fmt(cartTotal())}</span></div>
          <div class="row-between"><span>Delivery</span><span>${shippingFee() === 0 ? "Free" : fmt(shippingFee())}</span></div>
          <div class="row-total"><span>Total</span><span>${fmt(cartTotal() + shippingFee())}</span></div>
          <button class="btn btn-accent btn-block" data-action="placeOrder" ${state.isProcessing ? "disabled" : ""}>
            ${state.isProcessing ? "Processing…" : `Pay ${fmt(cartTotal() + shippingFee())}`}
          </button>
        </aside>
      </div>
    </div>
  `;
}

function renderConfirmation() {
  const o = state.order;
  if (!o) return "";
  const walletNote =
    o.payment_method !== "card"
      ? `<p>We'll confirm your ${o.payment_method} payment against transaction ID <b>${o.payment_reference}</b> shortly.</p>`
      : "";
  return `
    <div class="confirm-wrap fade-in">
      ${ICON.check}
      <h1 class="serif">Order placed.</h1>
      <p>Order <b>${o.order_code}</b> is ${o.status === "paid" ? "confirmed" : "recorded and pending payment verification"}. Updates go to ${o.shipping_phone}.</p>
      ${walletNote}
      <div class="receipt">
        ${o.items.map((it) => `<div class="summary-line"><span>${it.product_name} × ${it.qty}</span><span>${fmt(it.price * it.qty)}</span></div>`).join("")}
        <div class="row-total" style="margin-top:6px"><span>Total</span><span>${fmt(o.total)}</span></div>
      </div>
      <button class="btn-dark" data-action="goHome">Continue shopping</button>
    </div>
  `;
}

function renderOrders() {
  if (state.myOrders.length === 0) {
    return `<div class="wrap"><div class="empty-state"><p class="serif">No orders yet.</p><p>Your placed orders will show up here.</p></div></div>`;
  }
  return `
    <div class="wrap fade-in" style="padding-top:20px;padding-bottom:60px">
      <h1 class="serif" style="margin-bottom:16px">My orders</h1>
      ${state.myOrders
        .map(
          (o) => `
        <div class="order-card">
          <div class="order-head">
            <b>${o.order_code}</b>
            <span class="status-tag status-${o.status}">${o.status.replace("_", " ")}</span>
          </div>
          <div style="font-size:13px;color:var(--muted);margin-bottom:6px">${o.payment_method.toUpperCase()} · ${new Date(o.created_at).toLocaleDateString()}</div>
          ${o.items.map((it) => `<div class="summary-line"><span>${it.product_name} × ${it.qty}</span><span>${fmt(it.price * it.qty)}</span></div>`).join("")}
          <div class="row-total" style="margin-top:6px"><span>Total</span><span>${fmt(o.total)}</span></div>
        </div>
      `
        )
        .join("")}
    </div>
  `;
}

function renderCartDrawer() {
  const lines = cartLines();
  return `
    <div class="overlay" data-action="closeCart">
      <div class="drawer">
        <div class="drawer-head">
          <h2 class="serif" style="margin:0">Your basket</h2>
          <button data-action="closeCart" style="background:none;border:none;color:var(--muted)">${ICON.x}</button>
        </div>
        <div class="drawer-body">
          ${
            lines.length === 0
              ? `<p style="text-align:center;color:var(--muted);margin-top:30px">Your basket is empty — add something you like.</p>`
              : lines
                  .map(
                    (l) => `
              <div class="line">
                <img src="${img(l.product.image_url, l.product.id, 120)}" />
                <div class="line-info">
                  <div class="line-name line-clamp-2">${l.product.name}</div>
                  <div class="line-price serif">${fmt(l.product.price)}</div>
                  <div class="qty-row">
                    <button class="qty-btn" data-action="updateQty" data-id="${l.id}" data-delta="-1">${ICON.minus}</button>
                    <span>${l.qty}</span>
                    <button class="qty-btn" data-action="updateQty" data-id="${l.id}" data-delta="1">${ICON.plus}</button>
                    <button class="remove-btn" data-action="removeLine" data-id="${l.id}">${ICON.trash}</button>
                  </div>
                </div>
              </div>
            `
                  )
                  .join("")
          }
        </div>
        ${
          lines.length > 0
            ? `
          <div class="drawer-foot">
            <div class="row-between"><span>Subtotal</span><span>${fmt(cartTotal())}</span></div>
            <div class="row-total"><span>Total</span><span>${fmt(cartTotal() + shippingFee())}</span></div>
            <button class="btn btn-accent btn-block" data-action="goCheckout">Proceed to checkout</button>
          </div>
        `
            : ""
        }
      </div>
    </div>
  `;
}

function renderAuthModal() {
  const mode = state.authModal;
  if (!mode) return "";

  return `
    <div class="modal-backdrop">
      <div class="modal">
        <button class="close-x" data-action="closeAuth">${ICON.x}</button>

        <h2 class="serif">${mode === "login" ? "Log in" : "Create your account"}</h2>

        ${state.authError ? `<div class="banner-msg banner-error">${state.authError}</div>` : ""}

        <div class="form-col">
          ${mode === "register" ? `<input id="authName" placeholder="Full name" class="input-plain" />` : ""}
          <input id="authEmail" type="email" placeholder="Email" class="input-plain" />
          <input id="authPassword" type="password" placeholder="Password" class="input-plain" />

          <button class="btn btn-accent" data-action="submitAuth" data-mode="${mode}">
            ${mode === "login" ? "Log in" : "Create account"}
          </button>
        </div>

        <div class="modal-switch">
          ${
            mode === "login"
              ? `New to Mandi? <button data-action="switchAuth" data-value="register">Create an account</button>`
              : `Already have an account? <button data-action="switchAuth" data-value="login">Log in</button>`
          }
        </div>
      </div>
    </div>
  `;
}

function render() {
  let view = "";
  if (state.view === "home") view = renderHome();
  else if (state.view === "product") view = renderProduct();
  else if (state.view === "checkout") view = renderCheckout();
  else if (state.view === "confirmation") view = renderConfirmation();
  else if (state.view === "orders") view = renderOrders();

  document.getElementById("app").innerHTML = view;
  document.getElementById("modalRoot").innerHTML =
    (state.cartOpen ? renderCartDrawer() : "") + (state.authModal ? renderAuthModal() : "");
  updateHeaderChrome();
}

// ---------------------------------------------------------------------------
// Event delegation
// ---------------------------------------------------------------------------
document.addEventListener("click", (e) => {
  const el = e.target.closest("[data-action]");
  if (el) {
    const action = el.dataset.action;
    const id = el.dataset.id ? Number(el.dataset.id) : null;

    if (action === "setCategory") {
      state.category = el.dataset.value;
      render();
    } else if (action === "openProduct") {
      openProduct(id);
    } else if (action === "addToCart") {
      addToCart(id);
    } else if (action === "buyNow") {
      addToCart(id);
      goCheckout();
    } else if (action === "goHome") {
      goHome();
    } else if (action === "updateQty") {
      updateQty(id, Number(el.dataset.delta));
    } else if (action === "removeLine") {
      removeLine(id);
    } else if (action === "goCheckout") {
      goCheckout();
    } else if (action === "setPayMethod") {
      state.paymentMethod = el.dataset.value;
      state.formErrors = {};
      render();
    } else if (action === "placeOrder") {
      placeOrder();
    } else if (action === "closeCart") {
      state.cartOpen = false;
      render();
    } else if (action === "closeAuth") {
      state.authModal = null;
      state.authError = "";
      render();
} else if (action === "switchAuth") {
  state.authModal = el.dataset.value;
  state.authError = "";
  render();
} else if (action === "submitAuth") {
  handleAuth(el.dataset.mode);
}
return;
  }
  if (e.target.id === "cartBtn" || e.target.closest("#cartBtn")) {
    state.cartOpen = !state.cartOpen;
    render();
  }
  if (e.target.id === "logoBtn") goHome();
  if (e.target.id === "accountBtn" || e.target.closest("#accountBtn")) {
    if (state.user) {
      const choice = prompt(`Logged in as ${state.user.name}.\nType "orders" to view your orders, "admin" for the admin dashboard, or "logout" to log out.`);
      if (choice === "orders") goMyOrders();
      else if (choice === "logout") logout();
      else if (choice === "admin" && state.user.role === "admin") window.location.href = "/admin";
    } else {
      state.authModal = "login";
      state.authError = "";
      render();
    }
  }
});

document.addEventListener("input", (e) => {
  if (e.target.id === "searchInput") {
    state.query = e.target.value;
    render(); // safe: the search input lives in the header, outside #app, so it keeps focus
    return;
  }
  const bind = e.target.dataset.bind;
  if (!bind) return;
  let value = e.target.value;
  if (e.target.dataset.format === "card") value = formatCardNumber(value);
  if (e.target.dataset.format === "expiry") value = formatExpiry(value);
  if (e.target.dataset.format === "cvv") value = value.replace(/\D/g, "").slice(0, 4);
  e.target.value = value;
  setPath(state, bind, value);
});

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
(async function init() {
  try {
    await loadProducts();
  } catch (err) {
    document.getElementById("app").innerHTML = `<div class="wrap" style="padding:60px 16px;text-align:center;color:var(--muted)">Could not reach the server. Is it running?</div>`;
    return;
  }
  render();
})();
