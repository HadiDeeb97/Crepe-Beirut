/*
 * Search engines: the page title and description, link previews (WhatsApp, Instagram, Facebook),
 * and structured data that tells Google this is a crêperie in Beirut with this menu, these hours
 * and this phone number. Filled in from the admin's Website text → Search engines and the shop
 * settings. Also builds /robots.txt and /sitemap.xml.
 */
import { DAYS, uiText } from "../public/js/shared.js";

const DAY_URL = { mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday", fri: "Friday", sat: "Saturday", sun: "Sunday" };

/** The website's address: the admin's own domain if set, else the address the visitor used. */
export function siteOrigin(request, texts) {
  const own = String((texts && texts.seoSiteUrl) || "").trim();
  if (/^https:\/\/[a-z0-9.-]+(:\d+)?(\/.*)?$/i.test(own)) return new URL(own).origin;
  return new URL(request.url).origin;
}

export function seoTags(content, origin) {
  const t = content.texts || {}, s = content.settings || {};
  const w = (k) => uiText(t, k);
  const code = String(t.seoGoogleCode || "").trim().replace(/^.*content="([^"]+)".*$/, "$1");
  return {
    title: w("seoTitle"),
    description: w("seoDescription"),
    keywords: w("seoKeywords"),
    url: origin + "/",
    image: origin + "/assets/og-card.jpg",
    area: w("seoArea") || "Beirut",
    googleCode: /^[A-Za-z0-9_-]{10,100}$/.test(code) ? code : "",
    shop: s.shopName || "Crepe Beirut"
  };
}

/** schema.org data for Google: the restaurant, its hours, contact, menu and prices. */
export function structuredData(content, origin) {
  const s = content.settings || {}, tags = seoTags(content, origin);
  const phone = s.whatsappNumber ? "+" + s.whatsappNumber : undefined;
  const prices = [];
  const sections = (content.categories || []).filter((c) => c.visible !== false && (c.items || []).length).map((c) => ({
    "@type": "MenuSection",
    name: c.name,
    description: c.blurb || undefined,
    hasMenuItem: c.items.map((it) => {
      const offers = (it.options && it.options.length ? it.options : [{ label: "", price: it.price }]).map((o) => {
        prices.push(o.price);
        return { "@type": "Offer", name: o.label || undefined, price: o.price, priceCurrency: "LBP", availability: it.available ? "https://schema.org/InStock" : "https://schema.org/OutOfStock" };
      });
      return { "@type": "MenuItem", name: it.name, description: it.desc || undefined, offers: offers.length === 1 ? offers[0] : offers };
    })
  }));
  const hours = DAYS.map((d) => (s.hours || []).find((h) => h.day === d)).filter((h) => h && !h.closed && h.open && h.close)
    .map((h) => ({ "@type": "OpeningHoursSpecification", dayOfWeek: "https://schema.org/" + DAY_URL[h.day], opens: h.open, closes: h.close }));
  const valid = prices.filter((p) => p > 0);
  const fmt = (n) => Math.round(n).toLocaleString("en-US");
  const restaurant = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    "@id": origin + "/#shop",
    name: tags.shop,
    alternateName: ["Crêpe Beirut", "كريب بيروت"],
    description: tags.description,
    url: tags.url,
    image: tags.image,
    logo: origin + (content.media && content.media.icon && content.media.iconFiles && content.media.iconFiles.s512 ? "/api/images/" + content.media.iconFiles.s512 : "/assets/icon-512.png"),
    telephone: phone,
    servesCuisine: ["Crepes", "Desserts", "Pancakes", "Waffles", "Coffee"],
    priceRange: valid.length ? `LBP ${fmt(Math.min(...valid))} – ${fmt(Math.max(...valid))}` : undefined,
    currenciesAccepted: s.showUsd && s.usdRate > 0 ? "LBP, USD" : "LBP",
    address: { "@type": "PostalAddress", streetAddress: s.address || undefined, addressLocality: tags.area, addressCountry: "LB" },
    areaServed: { "@type": "City", name: tags.area },
    hasMap: s.mapsUrl || undefined,
    openingHoursSpecification: hours.length ? hours : undefined,
    sameAs: [s.instagram, s.facebook, s.tiktok].filter(Boolean),
    acceptsReservations: false,
    hasMenu: { "@type": "Menu", name: tags.shop + " menu", url: origin + "/#menu", hasMenuSection: sections },
    potentialAction: s.whatsappNumber ? { "@type": "OrderAction", target: "https://wa.me/" + s.whatsappNumber, deliveryMethod: ["http://purl.org/goodrelations/v1#DeliveryModeOwnFleet", "http://purl.org/goodrelations/v1#DeliveryModePickUp"] } : undefined
  };
  const website = { "@context": "https://schema.org", "@type": "WebSite", "@id": origin + "/#site", name: tags.shop, alternateName: ["Crêpe Beirut", "كريب بيروت"], url: tags.url };
  // "<" is escaped so the JSON can't close the script tag.
  return JSON.stringify([restaurant, website]).replace(/</g, "\\u003c");
}

/** The web app manifest (home screen name and icons), with the admin's icon when there is one. */
export function manifestJson(content) {
  const s = (content && content.settings) || {}, t = (content && content.theme) || {}, m = (content && content.media) || {};
  const f = (m.icon && m.iconFiles) || {};
  const icons = f.s192 && f.s512
    ? [{ src: "/api/images/" + f.s192, sizes: "192x192", type: "image/png" }, { src: "/api/images/" + f.s512, sizes: "512x512", type: "image/png" }]
    : [{ src: "/assets/icon-192.png", sizes: "192x192", type: "image/png" }, { src: "/assets/icon-512.png", sizes: "512x512", type: "image/png" }];
  return JSON.stringify({
    name: s.shopName || "Crepe Beirut", short_name: s.shopName || "Crepe Beirut",
    description: "Crepes, mini pancakes, waffles and desserts in Beirut, Lebanon.",
    start_url: "/", display: "browser", background_color: t.background || "#FFFBF1", theme_color: t.brand || "#633C20", icons
  });
}

export function robotsTxt(origin) {
  return `User-agent: *\nDisallow: /admin/\nDisallow: /api/admin/\nDisallow: /menu-print/\n\nSitemap: ${origin}/sitemap.xml\n`;
}

export function sitemapXml(origin, updatedAt) {
  const day = (updatedAt ? new Date(updatedAt) : new Date()).toISOString().slice(0, 10);
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${origin}/</loc><lastmod>${day}</lastmod><changefreq>daily</changefreq><priority>1.0</priority></url>
  <url><loc>${origin}/menu/menu.pdf</loc><changefreq>weekly</changefreq><priority>0.6</priority></url>
</urlset>
`;
}
