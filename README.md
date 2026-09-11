# Mandi — full-stack shopping app prototype

A working online store: product catalog, cart, login/signup, checkout with
JazzCash / Easypaisa / SadaPay / card payment, order history, and an admin
dashboard to add/edit products and manage orders. Node.js + Express +
SQLite backend, vanilla JS frontend (no build step).

## 1. Run it locally

You need [Node.js](https://nodejs.org) 18 or newer installed.

```bash
cd mandi-app
npm install
npm start
```

Then open **http://localhost:4000** in your browser.

- Storefront: `http://localhost:4000`
- Admin dashboard: `http://localhost:4000/admin`
- Default admin login: **admin@mandi.pk / admin123** — change this password
  after your first login (there's no "change password" UI yet — see
  Extend section below, or update it directly in the database for now).

The database is a single file at `data/mandi.sqlite`, created automatically
on first run with the product catalog already seeded. Delete that file if
you ever want to start completely fresh.

## 2. How payments work in this prototype

- **Card**: simulated. It "processes" for a moment and marks the order as
  `paid` instantly. No real card network is contacted — this is a stand-in
  until you connect a real payment gateway (see below).
- **JazzCash / Easypaisa / SadaPay**: these show your number,
  **0328-6815131**, and ask the customer to send the total there manually,
  then type in the transaction ID they received. The order is created with
  status `pending_payment`. You then check your wallet app, confirm the
  money arrived, and mark the order `paid` (or further along) from the
  admin dashboard's Orders tab.

This manual-transfer flow is how most small sellers in Pakistan take
JazzCash/Easypaisa/SadaPay payments today, since automatic verification
needs a **merchant account and API credentials** from each provider (I
don't have — and can't fabricate — those on your behalf). Once you register
as a merchant with any of them, you'd swap the manual step for a real API
call in `routes/orders.js`.

## 3. Product images

Products ship with placeholder photography (via picsum.photos) so the
store isn't empty on first run. To use your real product photos: open the
admin dashboard → Products → Edit a product → paste a real image URL into
the **Image URL** field (upload the photo somewhere like Cloudinary,
Imgur, or your own hosting first, then paste the link here). A direct
file-upload button is a natural next step — see below.

## 4. Put it online

This prototype is self-contained (Node + SQLite), so it deploys easily to
any Node host:

1. Push this folder to a GitHub repo.
2. Create a new service on **Render** or **Railway**, point it at the repo.
3. Build command: `npm install`. Start command: `npm start`.
4. Set environment variables `JWT_SECRET` (any long random string) and
   optionally `PORT`.

One caveat: on most free hosting tiers the filesystem resets on redeploy,
which would wipe the SQLite file. For anything beyond a demo, move to a
hosted database (see below) before relying on it for real orders.

## 5. What I'd extend next

1. **Real payment gateway API** — once you have JazzCash/Easypaisa/SadaPay
   merchant credentials, replace the manual-reference flow in
   `routes/orders.js` with their actual verification API so orders confirm
   automatically instead of waiting on you to check manually.
2. **Real product photo uploads** — add an upload endpoint (e.g. using
   `multer` + a storage bucket) so the admin form takes a file directly
   instead of a pasted URL.
3. **Move off SQLite for production** — SQLite is great for a prototype,
   but for a live store with concurrent orders, migrate to hosted Postgres
   (e.g. via Supabase or Railway) — the `better-sqlite3` calls in `db.js`
   and the `routes/*.js` files are the only places that would need to
   change.

## Project structure

```
mandi-app/
  server.js            Express entrypoint
  db.js                 SQLite schema + seed data
  middleware/auth.js    JWT auth + admin check
  routes/
    auth.js              register / login
    products.js          product CRUD (admin-only writes)
    orders.js             checkout, order history, admin order management
  public/
    index.html / js/app.js     storefront
    admin.html / js/admin.js   admin dashboard
    css/style.css                shared styling
```
