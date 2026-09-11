// ---------------------------------------------------------------------------
// Mandi admin dashboard — vanilla JS
// ---------------------------------------------------------------------------

const state = {
  token: localStorage.getItem("mandi_token") || null,
  user: JSON.parse(localStorage.getItem("mandi_user") || "null"),
  tab: "products",
  products: [],
  orders: [],
  editingProduct: null, // product object or null (null = "add new" form is blank)
  loginError: "",
};

const fmt = (n) => `Rs ${Number(n).toLocaleString("en-PK")}`;

async function api(path, { method = "GET", body } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (state.token) headers.Authorization = "Bearer " + state.token;
  const res = await fetch("/api" + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong.");
  return data;
}

function persist() {
  if (state.token) localStorage.setItem("mandi_token", state.token);
  if (state.user) localStorage.setItem("mandi_user", JSON.stringify(state.user));
}

async function loadAll() {
  state.products = await api("/products");
  state.orders = await api("/orders");
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------
function renderAccount() {
  const el = document.getElementById("adminAccount");
  if (state.user) {
    el.innerHTML = `<span style="font-size:13px;opacity:.85">${state.user.name}</span>
      <button class="pill-btn" style="margin-left:10px" data-action="logout">Log out</button>
      <a href="/" class="pill-btn" style="margin-left:6px;text-decoration:none">Storefront</a>`;
  } else {
    el.innerHTML = "";
  }
}

function renderLoginGate() {
  return `
    <div class="login-gate">
      <h2 class="serif">Admin login</h2>
      ${state.loginError ? `<div class="banner-msg banner-error">${state.loginError}</div>` : ""}
      <div class="form-col">
        <input id="loginEmail" type="email" placeholder="Email" class="input-plain" value="admin@mandi.pk" />
        <input id="loginPassword" type="password" placeholder="Password" class="input-plain" />
        <button class="btn btn-accent" data-action="doLogin">Log in</button>
      </div>
      <p style="font-size:12px;color:var(--muted);margin-top:14px">Default seed account: admin@mandi.pk / admin123 — change this after first login.</p>
    </div>
  `;
}

function renderProductForm() {
  const p = state.editingProduct;
  return `
    <div class="admin-form">
      <h3>${p ? "Edit product" : "Add a product"}</h3>
      <div class="field-grid">
        <div class="field"><span>Name</span><input id="pf_name" value="${p ? p.name : ""}" /></div>
        <div class="field"><span>Category</span>
          <select id="pf_category">
            ${["Electronics", "Fashion", "Home", "Beauty", "Books"]
              .map((c) => `<option value="${c}" ${p && p.category === c ? "selected" : ""}>${c}</option>`)
              .join("")}
          </select>
        </div>
        <div class="field"><span>Price (Rs)</span><input id="pf_price" type="number" value="${p ? p.price : ""}" /></div>
        <div class="field"><span>Stock</span><input id="pf_stock" type="number" value="${p ? p.stock : 50}" /></div>
        <div class="field full"><span>Image URL</span><input id="pf_image" value="${p ? p.image_url || "" : ""}" placeholder="https://... (leave blank for a placeholder photo)" /></div>
        <div class="field full"><span>Description</span><input id="pf_description" value="${p ? p.description || "" : ""}" /></div>
      </div>
      <div style="margin-top:12px;display:flex;gap:8px">
        <button class="btn btn-accent" data-action="saveProduct" data-id="${p ? p.id : ""}">${p ? "Save changes" : "Add product"}</button>
        ${p ? `<button class="btn-outline" data-action="cancelEdit">Cancel</button>` : ""}
      </div>
    </div>
  `;
}

function renderProductsTab() {
  return `
    ${renderProductForm()}
    <table class="admin-table">
      <thead><tr><th></th><th>Name</th><th>Category</th><th>Price</th><th>Stock</th><th></th></tr></thead>
      <tbody>
        ${state.products
          .map(
            (p) => `
          <tr>
            <td><img src="${p.image_url || "https://picsum.photos/seed/" + p.id + "/80/80"}" /></td>
            <td>${p.name}</td>
            <td>${p.category}</td>
            <td>${fmt(p.price)}</td>
            <td>${p.stock}</td>
            <td style="white-space:nowrap">
              <button class="small-btn" data-action="editProduct" data-id="${p.id}">Edit</button>
              <button class="small-btn" data-action="deleteProduct" data-id="${p.id}">Delete</button>
            </td>
          </tr>
        `
          )
          .join("")}
      </tbody>
    </table>
  `;
}

const ORDER_STATUSES = ["pending_payment", "paid", "processing", "shipped", "delivered", "cancelled"];

function renderOrdersTab() {
  if (state.orders.length === 0) {
    return `<div class="empty-state"><p class="serif">No orders yet.</p></div>`;
  }
  return `
    <table class="admin-table">
      <thead><tr><th>Order</th><th>Customer</th><th>Items</th><th>Total</th><th>Payment</th><th>Status</th></tr></thead>
      <tbody>
        ${state.orders
          .map(
            (o) => `
          <tr>
            <td><b>${o.order_code}</b><br><span style="color:var(--muted)">${new Date(o.created_at).toLocaleDateString()}</span></td>
            <td>${o.shipping_name}<br><span style="color:var(--muted)">${o.shipping_phone}</span><br><span style="color:var(--muted)">${o.shipping_address}, ${o.shipping_city}</span></td>
            <td>${o.items.map((it) => `${it.product_name} × ${it.qty}`).join("<br>")}</td>
            <td>${fmt(o.total)}</td>
            <td>${o.payment_method}${o.payment_reference ? `<br><span style="color:var(--muted)">ref: ${o.payment_reference}</span>` : ""}</td>
            <td>
              <select class="status-select" data-action="updateStatus" data-id="${o.id}">
                ${ORDER_STATUSES.map((s) => `<option value="${s}" ${s === o.status ? "selected" : ""}>${s.replace("_", " ")}</option>`).join("")}
              </select>
            </td>
          </tr>
        `
          )
          .join("")}
      </tbody>
    </table>
  `;
}

function render() {
  renderAccount();
  const root = document.getElementById("admin-app");

  if (!state.user || state.user.role !== "admin") {
    root.innerHTML = renderLoginGate();
    return;
  }

  root.innerHTML = `
    <div class="admin-tabs">
      <button class="admin-tab ${state.tab === "products" ? "active" : ""}" data-action="setTab" data-value="products">Products</button>
      <button class="admin-tab ${state.tab === "orders" ? "active" : ""}" data-action="setTab" data-value="orders">Orders</button>
    </div>
    ${state.tab === "products" ? renderProductsTab() : renderOrdersTab()}
  `;
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------
async function doLogin() {
  state.loginError = "";
  try {
    const data = await api("/auth/login", {
      method: "POST",
      body: {
        email: document.getElementById("loginEmail").value,
        password: document.getElementById("loginPassword").value,
      },
    });
    if (data.user.role !== "admin") {
      state.loginError = "This account is not an admin account.";
      render();
      return;
    }
    state.token = data.token;
    state.user = data.user;
    persist();
    await loadAll();
    render();
  } catch (err) {
    state.loginError = err.message;
    render();
  }
}

function logout() {
  state.token = null;
  state.user = null;
  localStorage.removeItem("mandi_token");
  localStorage.removeItem("mandi_user");
  render();
}

async function saveProduct(id) {
  const body = {
    name: document.getElementById("pf_name").value,
    category: document.getElementById("pf_category").value,
    price: Number(document.getElementById("pf_price").value),
    stock: Number(document.getElementById("pf_stock").value),
    image_url: document.getElementById("pf_image").value,
    description: document.getElementById("pf_description").value,
  };
  try {
    if (id) await api(`/products/${id}`, { method: "PUT", body });
    else await api("/products", { method: "POST", body });
    state.editingProduct = null;
    state.products = await api("/products");
    render();
  } catch (err) {
    alert(err.message);
  }
}

async function deleteProduct(id) {
  if (!confirm("Delete this product? This cannot be undone.")) return;
  await api(`/products/${id}`, { method: "DELETE" });
  state.products = await api("/products");
  render();
}

async function updateStatus(id, status) {
  await api(`/orders/${id}/status`, { method: "PUT", body: { status } });
  state.orders = await api("/orders");
  render();
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------
document.addEventListener("click", (e) => {
  const el = e.target.closest("[data-action]");
  if (!el) return;
  const action = el.dataset.action;
  const id = el.dataset.id ? Number(el.dataset.id) : null;

  if (action === "doLogin") doLogin();
  else if (action === "logout") logout();
  else if (action === "setTab") {
    state.tab = el.dataset.value;
    state.editingProduct = null;
    render();
  } else if (action === "editProduct") {
    state.editingProduct = state.products.find((p) => p.id === id);
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  } else if (action === "cancelEdit") {
    state.editingProduct = null;
    render();
  } else if (action === "saveProduct") {
    saveProduct(id || null);
  } else if (action === "deleteProduct") {
    deleteProduct(id);
  }
});

document.addEventListener("change", (e) => {
  if (e.target.dataset.action === "updateStatus") {
    updateStatus(Number(e.target.dataset.id), e.target.value);
  }
});

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
(async function init() {
  if (state.user && state.user.role === "admin") {
    try {
      await loadAll();
    } catch {
      state.token = null;
      state.user = null;
    }
  }
  render();
})();
