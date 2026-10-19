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
| **Orders** | The **Unfinished** tab lists customers who put items in the bag and typed their name and phone but never pressed "Send order on WhatsApp" (saved as they type, kept 14 days), with what was in the bag and a WhatsApp button with a ready follow-up message. See today's orders, sales and what's waiting. Accept, complete or cancel an order, message or call the customer, open the address in Maps, add staff notes, and delete an order or clear many at once (completed and cancelled, older than 30 days, or all), with a warning and a spreadsheet download first. New orders appear by themselves (every 20 seconds). Turn on the bell for a chime. |
| **Menu** | Add, rename, reorder or delete sections and items, set prices or sizes, mark items sold out, star house favourites, set choices like Hot / Iced. Add a **photo** to any item, and pick a drawing or upload a photo for each section. |
| **Extras** | Edit toppings with their prices and stock. Each group chooses the menu sections it's **offered on** (e.g. syrups on shakes, spreads on crepes) and how many a customer **can pick**. |
| **Website text** | Every word on the website. The main texts first (announcement bar, headline and introduction, About us with its row of big facts, contact text), then about 95 more in groups (header, buttons, menu, item pop-up, your order, checkout, after sending, hours, footer), with a search box to find any of them. An empty box means the original wording. Also **Search engines**: the Google title and description, search words (English, Arabic, Franco), the area, your own domain and the Google Search Console code. |
| **Theme** | **Website icon** (browser tab, phone home screen, Google): upload a square logo, choose rounded square, circle or no frame, and zoom; the admin makes the 32/180/192/512 px PNGs. Colour sets (Crepe Beirut, Lotus caramel, Pistachio, Strawberry, Blueberry) or your own four colours, headline and text fonts, corner style, pattern (stripes, grid, plain), light or dark default look (light, dark, or match the visitor's device) and whether customers get a sun/moon button to switch, and the home page and About pictures (the home picture can have melting chocolate along the bottom of its frame, with drips that let a drop fall and fade; switch it on or off). A live preview shows the result, and it warns you if text would be hard to read. |
| **Shop settings** | Pause online orders, delivery fee, **prices in US dollars** (switch on, set the exchange rate, choose which currency shows first), WhatsApp number, address and Maps link, opening hours ("Open now" on the site comes from these), social links. |

Photos are shrunk in the browser before upload (up to 1600 px wide for the home page picture),
saved as **WebP** and stored in the same D1 database, so no extra Cloudflare setup is needed. Safari
can't make WebP itself, so the admin carries a WebP encoder (`public/admin/vendor/webp`, libwebp from
Squoosh, Apache-2.0) that loads only when needed. **Shop settings → Photos** converts photos uploaded
before as JPEG or PNG (publish afterwards; the old files are removed).

Customers can tap any dish photo (menu rows, house favourites, the item pop-up) to open it full
screen: swipe or arrows for other dishes, swipe down or Esc to close, double-tap to zoom, and an
"Add to order" button. When you publish, pictures the website no longer uses
(a photo you replaced or removed) are deleted. Uploads from the last 30 minutes are kept until a
later publish, in case they're part of changes still being made.

The website animates gently as you scroll: cards and menu rows float in, section badges spin in like
batter on the plate, a chocolate drizzle draws under headings, and the wooden spreader turns. Visitors
who turn on "reduce motion" on their device see everything still.

Type: the whole site uses two fonts (the headline and text fonts picked in **Theme**), two text
weights (regular and bold), and one size scale (`--fs-2xs` to `--fs-hero` in `site.css`). Headline
fonts that only come in one weight are never faked bold.

Search engines (SEO):

- The page title, description and search words come from **Website text → Search engines**, and
  link previews on WhatsApp, Instagram and Facebook show `public/assets/og-card.jpg`.
- Google gets structured data (schema.org `Restaurant`): the name (also "Crêpe Beirut" and
  "كريب بيروت"), Beirut, Lebanon, the WhatsApp number, opening hours, social links, price range and
  the whole menu with prices in L.L.
- `/robots.txt` and `/sitemap.xml` are made by the Worker (`lib/seo.js`) with the site's address.
- The footer has a short line about the shop, since Google reads what visitors can see.
- The biggest help for "crepes near me" searches is a free **Google Business Profile** (Google
  Maps) pointing to the website, and adding the site in **Google Search Console** (paste its code
  in Website text → Search engines, then submit `/sitemap.xml`).

Speed:

- The home page is filled in on the server (theme, texts, menu data), so the first paint already has
  the right colours and words, and the browser doesn't wait for a second request.
- Fonts are served from the site itself (`public/assets/fonts`), about 57 KB in total.
  Milkshake (headlines) and Sovba (headlines or text) are also hosted there and can be picked in
  **Theme → Fonts**; they are commercial fonts, so the shop needs a web licence for them.
- Each uploaded photo is stored twice: a full copy (shrunk to at most 1000–1600 px, WebP) and a small
  copy (480 px) used for menu thumbnails, badges and cards.
- Images below the first screen load only when you scroll near them. Fonts and images are cached by
  the browser. The page, CSS and JS are checked for a newer copy on every visit (a tiny request), so a
  browser never mixes a new page with old code. After big changes you can also run
  `python3 tools/bump-version.py` to give the CSS/JS files new addresses.

Menu PDF:

- **Arrange the sections** (in the same dialog): *Automatic* groups sections of similar length so
  pages fill neatly; *My order* keeps your order (drag or arrows), three to a row, left to right,
  with an optional *New page* before any section. Any section can be hidden from the PDF. Titles in
  a row always line up. *Preview* shows the result before publishing; publish, then export.
- **Menu → Menu PDF** shows the last exported PDF (with page previews), opens the printable page
  (`/menu-print/`: A3 sheets with the striped awning and CB badge, sections with dotted price
  leaders and an add-ons band, in the theme's colours and two fonts; you can also save it as a PDF
  from the browser), and has an **Export a new PDF** button.
- The export runs on GitHub Actions (`.github/workflows/menu-pdf.yml`): it prints the published menu
  to `public/menu/menu.pdf`, saves page pictures and a copy of the menu in `public/menu/menu.json`, and
  commits them. Cloudflare then redeploys, so the files are plain static files: they cost no Worker
  requests and no database reads. It also runs every night at 00:20 UTC, and only commits when the
  menu changed. You can start it by hand on GitHub too: *Actions → Menu PDF → Run workflow*.
- To use the button in the admin, create a fine-grained GitHub token for this repository with
  **Actions: Read and write** and add it to the Worker as a Secret named `GITHUB_TOKEN`
  (optional: `GITHUB_REPO`, default `HadiDeeb97/crepe-beirut`, and `GITHUB_BRANCH`, default `main`).
- **If the live menu can't load** (for example the database reached its free daily limit), visitors
  who were here before see the menu their phone saved, and new visitors see the menu from the last
  export, with a note and a link to the PDF. Orders still go to WhatsApp (they just aren't saved in
  the admin until the database is back).

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
  menu-print/         printable A3 menu (print.css, print.js), the source of the PDF
  menu/               the last exported menu.pdf, page pictures and menu.json (made by the export)
  assets/             logo files and illustrations
src/worker.js         Worker entry: sends /api/* to the handlers below, everything else to public/
functions/api/        API route handlers (also used directly by Cloudflare Pages)
  content.js          GET  /api/content         live content for the website
  orders.js           POST /api/orders          save an order
  admin/...           sign in/out, publish content, list and update orders
lib/server.js         database, sessions and helpers for the API
lib/page.js           fills the home page with the live theme, texts and search engine tags
lib/seo.js            search engine tags, structured data, robots.txt and sitemap.xml
tools/                icon sprite and the script that inlines it into the pages,
                      bump-version.py, and export-menu-pdf.cjs (the PDF export)
.github/workflows/    menu-pdf.yml, the PDF export on GitHub Actions
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
