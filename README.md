# Crepe Beirut website

The Crepe Beirut website and its admin panel.

- **Website** (`/`): introduces the shop and shows the full menu. Customers add items (sizes, Hot/Iced,
  extras, notes), enter their details and press **Send order on WhatsApp**. The order is saved and WhatsApp
  opens with it written out for the shop's number.
- **Admin** (`/admin`): password-protected. Staff see orders as they come in, accept and complete them,
  and edit the menu, prices, extras, website text, opening hours and shop settings. Changes go live when
  you press **Publish changes**.

It runs on **Cloudflare Pages** (free plan is enough): static files in `public/`, a small API in
`functions/`, and a **D1** database for the menu content and orders.

## Set it up on Cloudflare

You need to do this once.

1. **Create the Pages project** (skip if you already have one):
   *Workers & Pages → Create application → Pages → Connect to Git*, pick this repository, then use:
   - Production branch: `main`
   - Framework preset: **None**
   - Build command: *(empty)*
   - Build output directory: **`public`**

   Already created the project with `/` as the output directory? Change it in
   *Settings → Build → Build configuration* to `public`.
2. **Create the database:** *Storage & Databases → D1 → Create database*, name it `crepe-beirut`.
   You don't need to run any SQL. The tables are created automatically.
3. **Connect the database to the site:** in the Pages project, *Settings → Bindings → Add → D1 database*.
   Variable name **`DB`**, database `crepe-beirut`. Add it for Production (and Preview if you use it).
4. **Set the admin password:** *Settings → Variables and Secrets → Add*, type **Secret**, name
   **`ADMIN_PASSWORD`**, and a long password that only staff know. Changing it later signs everyone out.
5. **Redeploy:** *Deployments → … → Retry deployment* on the latest deployment, so the new settings apply.
6. Open `https://<your-site>/admin`, sign in, and publish your first changes.

Until steps 2–5 are done, the website still works from the built-in menu and orders still go to
WhatsApp. They just aren't saved, and `/admin` shows these setup steps.

## Using the admin

| Screen | What you can do |
| --- | --- |
| **Orders** | See today's orders, sales and what's waiting. Accept, complete or cancel an order, message or call the customer, open the address in Maps, and add staff notes. New orders appear by themselves (every 20 seconds). Turn on the bell for a chime. |
| **Menu** | Add, rename, reorder or delete sections and items, set prices or sizes, mark items sold out, star house favourites, choose a section's picture, allow extras, and set choices like Hot / Iced. |
| **Extras** | Edit the toppings customers can add, with their prices and stock. |
| **Website text** | Announcement bar, headline and introduction, About us, contact text. |
| **Shop settings** | Pause online orders, delivery fee, dollar rate, WhatsApp number, address and Maps link, opening hours ("Open now" on the site comes from these), social links. |

How orders work:

- An order is saved when the customer presses **Send order on WhatsApp**. They still have to press
  send inside WhatsApp, so an order marked **New** may not have reached your chat yet. Accept it once you
  see it in WhatsApp (or call the customer).
- Each order gets a number like **CB-1001**, which appears in the WhatsApp message too.
- Prices are checked on the server against the live menu, so the saved total is always correct.
  Sold-out items can't be ordered.

## Project layout

```
public/               the website (served as-is)
  index.html          home page and menu
  css/site.css        site theme (brand palette, stripes and grid patterns)
  js/site.js          menu, cart and checkout
  js/shared.js        pricing, opening hours and validation (used by site, admin and server)
  js/defaults.js      starting menu and texts, used until the first publish
  admin/              admin panel (index.html, admin.css, admin.js)
  assets/             logo files and illustrations
functions/api/        Cloudflare Pages Functions (the API)
  content.js          GET  /api/content         live content for the website
  orders.js           POST /api/orders          save an order
  admin/...           sign in/out, publish content, list and update orders
lib/server.js         database, sessions and helpers for the API
tools/                icon sprite and the script that inlines it into the pages
```

## Work on it locally

```sh
npm install
echo "ADMIN_PASSWORD=choose-a-local-password" > .dev.vars
npm run dev            # http://localhost:8788 and http://localhost:8788/admin
```

`wrangler pages dev` runs the same Functions and a local D1 database, so the admin and orders work
offline too. After editing `tools/sprite.svg`, run `python3 tools/inject-sprite.py`.

## Before going live

- `Hazelnut Frappe` is listed at **50,000 L.L.** on the printed menu, while the other frappes are 350,000.
  It was kept as printed. Fix it in the admin (*Menu → Frappe*) if it's a typo.
- The Instagram link assumes the handle `crepe.beirut`. Check it in *Shop settings*.
- The eight starred house favourites are a first guess. Change them in the admin.
- The illustrations come from the Canva menu design. Check that your Canva licence covers using them
  on a website.
