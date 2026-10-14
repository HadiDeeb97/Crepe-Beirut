# Crepe Beirut website

The Crepe Beirut website and its admin panel.

- **Website** (`/`): introduces the shop and shows the full menu. Customers add items (sizes, Hot/Iced,
  extras, notes), enter their details and press **Send order on WhatsApp**. The order is saved and WhatsApp
  opens with it written out for the shop's number.
- **Admin** (`/admin`): password-protected. Staff see orders as they come in, accept and complete them,
  and edit the menu, prices, extras, website text, opening hours and shop settings. Changes go live when
  you press **Publish changes**.

It runs on Cloudflare (the free plan is enough): static files in `public/`, a small API, and a **D1**
database for the menu content and orders. It works as a **Cloudflare Worker** (`wrangler.jsonc`,
`src/worker.js`) or as a **Cloudflare Pages** project (`functions/`). Use one of the two.

## Set it up as a Cloudflare Worker

1. **Create the Worker from GitHub:** *Workers & Pages → Create application → Import a repository*,
   pick this repository. Leave the build command empty and keep the deploy command as
   `npx wrangler deploy`.
   - The Worker must be named **`crepe-beirut`**, the same as `name` in `wrangler.jsonc`. If yours has a
     different name, change `name` in `wrangler.jsonc` to match it.
2. **Deploy.** Every push to `main` deploys. On the first deploy, Wrangler creates the D1 database
   `crepe-beirut` and connects it as `CREPE_DB`. You don't need to run any SQL; the tables create themselves.
   Don't add the database binding by hand, because deploys use `wrangler.jsonc`.
3. **Set the admin password:** *Workers & Pages → crepe-beirut → Settings → Variables and Secrets → Add*,
   type **Secret**, name **`ADMIN_PASSWORD`**, a long password only staff know, then **Deploy**.
   Use type *Secret*, not *Text*: secrets are kept across deploys. Changing it signs everyone out.
4. Open `https://crepe-beirut.<your-account>.workers.dev/admin`, sign in, and publish your first changes.

## Or set it up as Cloudflare Pages

1. *Workers & Pages → Create application → "Looking to deploy Pages? Get started" → Import an existing
   Git repository*, pick this repository. Framework preset **None**, build command empty, build output
   directory **`public`**.
2. Create a D1 database (*Storage & Databases → D1*), then in the Pages project add it under
   *Settings → Bindings → D1 database* with the variable name **`DB`**.
3. Add the secret **`ADMIN_PASSWORD`** under *Settings → Variables and Secrets*, then retry the latest
   deployment.

Until the database and password are set, the website still works from the built-in menu and orders
still go to WhatsApp. They just aren't saved, and `/admin` shows what's missing.

## Using the admin

| Screen | What you can do |
| --- | --- |
| **Orders** | See today's orders, sales and what's waiting. Accept, complete or cancel an order, message or call the customer, open the address in Maps, and add staff notes. New orders appear by themselves (every 20 seconds). Turn on the bell for a chime. |
| **Menu** | Add, rename, reorder or delete sections and items, set prices or sizes, mark items sold out, star house favourites, set choices like Hot / Iced. Add a **photo** to any item, and pick a drawing or upload a photo for each section. |
| **Extras** | Edit toppings with their prices and stock. Each group chooses the menu sections it's **offered on** (e.g. syrups on shakes, spreads on crepes) and how many a customer **can pick**. |
| **Website text** | Announcement bar, headline and introduction, About us, contact text. |
| **Theme** | Colour sets (Crepe Beirut, Lotus caramel, Pistachio, Strawberry, Blueberry) or your own four colours, headline and text fonts, corner style, pattern (stripes, grid, plain), light or dark default look (light, dark, or match the visitor's device) and whether customers get a sun/moon button to switch, and the home page and About pictures. A live preview shows the result, and it warns you if text would be hard to read. |
| **Shop settings** | Pause online orders, delivery fee, **prices in US dollars** (switch on, set the exchange rate, choose which currency shows first), WhatsApp number, address and Maps link, opening hours ("Open now" on the site comes from these), social links. |

Photos are shrunk in the browser before upload (up to 1600 px wide for the home page picture) and
stored in the same D1 database, so no extra Cloudflare setup is needed. When you publish, pictures the website no longer uses
(a photo you replaced or removed) are deleted. Uploads from the last 30 minutes are kept until a
later publish, in case they're part of changes still being made.

The website animates gently as you scroll: cards and menu rows float in, section badges spin in like
batter on the plate, a chocolate drizzle draws under headings, and the wooden spreader turns. Visitors
who turn on "reduce motion" on their device see everything still.

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
src/worker.js         Worker entry: sends /api/* to the handlers below, everything else to public/
functions/api/        API route handlers (also used directly by Cloudflare Pages)
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
npm run dev            # http://localhost:8787 and http://localhost:8787/admin
```

`wrangler dev` runs the Worker with a local D1 database, so the admin and orders work
offline too. After editing `tools/sprite.svg`, run `python3 tools/inject-sprite.py`.

## Before going live

- `Hazelnut Frappe` is listed at **50,000 L.L.** on the printed menu, while the other frappes are 350,000.
  It was kept as printed. Fix it in the admin (*Menu → Frappe*) if it's a typo.
- The Instagram link assumes the handle `crepe.beirut`. Check it in *Shop settings*.
- The eight starred house favourites are a first guess. Change them in the admin.
- The illustrations come from the Canva menu design. Check that your Canva licence covers using them
  on a website.
