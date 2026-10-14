/*
 * Default site content: the menu, extras, texts and shop settings from the printed menu.
 * The live site uses what is saved in the admin panel; this file is only the starting point
 * (and the fallback if the database is not connected).
 */
export const DEFAULT_CONTENT = {
  "version": 1,
  "settings": {
    "shopName": "Crepe Beirut",
    "whatsappNumber": "96181908914",
    "whatsappDisplay": "81 908 914",
    "address": "",
    "mapsUrl": "",
    "instagram": "https://www.instagram.com/crepe.beirut/",
    "facebook": "",
    "tiktok": "",
    "deliveryFee": 0,
    "usdRate": 0,
    "showUsd": false,
    "defaultCurrency": "lbp",
    "orderingOpen": true,
    "pausedMessage": "Online orders are paused right now. Message us on WhatsApp and we will help.",
    "timezone": "Asia/Beirut",
    "hours": [
      {
        "day": "mon",
        "open": "",
        "close": "",
        "closed": false
      },
      {
        "day": "tue",
        "open": "",
        "close": "",
        "closed": false
      },
      {
        "day": "wed",
        "open": "",
        "close": "",
        "closed": false
      },
      {
        "day": "thu",
        "open": "",
        "close": "",
        "closed": false
      },
      {
        "day": "fri",
        "open": "",
        "close": "",
        "closed": false
      },
      {
        "day": "sat",
        "open": "",
        "close": "",
        "closed": false
      },
      {
        "day": "sun",
        "open": "",
        "close": "",
        "closed": false
      }
    ]
  },
  "texts": {
    "announcement": "",
    "heroEyebrow": "Crepes · Mini pancakes · Waffles · Cups",
    "heroTitle": "The sweet side of Beirut.",
    "heroText": "Warm crepes spread with Nutella, Lotus and pistachio, mini pancakes by the box, waffles, iced cups, shakes and coffee. Build your order here and send it straight to us on WhatsApp.",
    "aboutTitle": "A crêperie with a sweet tooth.",
    "aboutText": "Crepe Beirut makes crepes the classic way: thin batter poured on a hot plate, spread flat with the wooden rake and folded around your filling. Choose a simple Nutella or Lotus, or go big with Dubai, Pistachio and Triple Chocolate, then pile on extras.\n\nNot in a crepe mood? Order mini pancakes by the box of 12 or 25, waffles, cheesecake and tiramisu, or something cold: iced cups, shakes, frappes, smoothies, matcha and mojitos.",
    "contactTitle": "Order, ask, or say hi.",
    "contactText": "Orders, opening hours and delivery questions all go to our WhatsApp."
  },
  "facts": [
    { "kind": "items", "value": "", "label": "things on the menu" },
    { "kind": "extras", "value": "", "label": "extras to pile on" },
    { "kind": "text", "value": "12 / 25", "label": "mini pancakes a box" }
  ],
  "theme": {
    "preset": "original",
    "brand": "#633C20",
    "accent": "#BDD9EE",
    "soft": "#FCF0CA",
    "background": "#FFFBF1",
    "displayFont": "Fraunces",
    "bodyFont": "Figtree",
    "corners": "soft",
    "pattern": "stripes",
    "mode": "light",
    "allowToggle": true
  },
  "media": {
    "hero": "",
    "heroDrawings": true,
    "about": ""
  },
  "categories": [
    {
      "id": "crepes",
      "name": "Crepes",
      "img": "crepe",
      "blurb": "Folded to order on the hot plate.",
      "extras": true,
      "choice": null,
      "visible": true,
      "items": [
        {
          "id": "crepes/nutella-crepe",
          "name": "Nutella Crepe",
          "desc": "",
          "price": 350000,
          "options": [],
          "available": true,
          "featured": true
        },
        {
          "id": "crepes/white-crepe",
          "name": "White Crepe",
          "desc": "",
          "price": 350000,
          "options": [],
          "available": true,
          "featured": false
        },
        {
          "id": "crepes/lotus-crepe",
          "name": "Lotus Crepe",
          "desc": "",
          "price": 350000,
          "options": [],
          "available": true,
          "featured": false
        },
        {
          "id": "crepes/kinder-crepe",
          "name": "Kinder Crepe",
          "desc": "",
          "price": null,
          "options": [
            {
              "label": "6 fingers",
              "price": 450000
            },
            {
              "label": "8 fingers",
              "price": 500000
            }
          ],
          "available": true,
          "featured": false
        },
        {
          "id": "crepes/dark-crepe",
          "name": "Dark Crepe",
          "desc": "",
          "price": 350000,
          "options": [],
          "available": true,
          "featured": false
        },
        {
          "id": "crepes/pistachio-crepe",
          "name": "Pistachio Crepe",
          "desc": "",
          "price": 500000,
          "options": [],
          "available": true,
          "featured": true
        },
        {
          "id": "crepes/dubai-crepe",
          "name": "Dubai Crepe",
          "desc": "",
          "price": 600000,
          "options": [],
          "available": true,
          "featured": true
        },
        {
          "id": "crepes/belgian-crepe",
          "name": "Belgian Crepe",
          "desc": "",
          "price": 550000,
          "options": [],
          "available": true,
          "featured": false
        },
        {
          "id": "crepes/bueno-crepe",
          "name": "Bueno Crepe",
          "desc": "",
          "price": 450000,
          "options": [],
          "available": true,
          "featured": false
        },
        {
          "id": "crepes/triple-choc-crepe",
          "name": "Triple Choc. Crepe",
          "desc": "",
          "price": 550000,
          "options": [],
          "available": true,
          "featured": false
        },
        {
          "id": "crepes/trio-crepe",
          "name": "Trio Crepe",
          "desc": "",
          "price": 500000,
          "options": [],
          "available": true,
          "featured": false
        },
        {
          "id": "crepes/cinnamon-crepe",
          "name": "Cinnamon Crepe",
          "desc": "",
          "price": 550000,
          "options": [],
          "available": true,
          "featured": false
        },
        {
          "id": "crepes/oreo-crepe",
          "name": "Oreo Crepe",
          "desc": "",
          "price": 550000,
          "options": [],
          "available": true,
          "featured": false
        },
        {
          "id": "crepes/brownies-crepe",
          "name": "Brownies Crepe",
          "desc": "",
          "price": 550000,
          "options": [],
          "available": true,
          "featured": false
        }
      ]
    },
    {
      "id": "mini-pancakes",
      "name": "Mini Pancakes",
      "img": "pancakes",
      "blurb": "By the box: 12 or 25 pieces.",
      "extras": true,
      "choice": null,
      "visible": true,
      "items": [
        {
          "id": "mini-pancakes/mini-pancakes-white",
          "name": "Mini Pancakes White",
          "desc": "",
          "price": null,
          "options": [
            {
              "label": "12 pcs",
              "price": 300000
            },
            {
              "label": "25 pcs",
              "price": 500000
            }
          ],
          "available": true,
          "featured": false
        },
        {
          "id": "mini-pancakes/mini-pancakes-lotus",
          "name": "Mini Pancakes Lotus",
          "desc": "",
          "price": null,
          "options": [
            {
              "label": "12 pcs",
              "price": 300000
            },
            {
              "label": "25 pcs",
              "price": 500000
            }
          ],
          "available": true,
          "featured": false
        },
        {
          "id": "mini-pancakes/mini-pancakes-nutella",
          "name": "Mini Pancakes Nutella",
          "desc": "",
          "price": null,
          "options": [
            {
              "label": "12 pcs",
              "price": 350000
            },
            {
              "label": "25 pcs",
              "price": 550000
            }
          ],
          "available": true,
          "featured": true
        },
        {
          "id": "mini-pancakes/mini-pancakes-pistachio",
          "name": "Mini Pancakes Pistachio",
          "desc": "",
          "price": null,
          "options": [
            {
              "label": "12 pcs",
              "price": 400000
            },
            {
              "label": "25 pcs",
              "price": 600000
            }
          ],
          "available": true,
          "featured": false
        },
        {
          "id": "mini-pancakes/mini-pancakes-belgian-and-white",
          "name": "Mini Pancakes Belgian & White",
          "desc": "",
          "price": null,
          "options": [
            {
              "label": "12 pcs",
              "price": 350000
            },
            {
              "label": "25 pcs",
              "price": 550000
            }
          ],
          "available": true,
          "featured": false
        },
        {
          "id": "mini-pancakes/mini-pancakes-special",
          "name": "Mini Pancakes Special",
          "desc": "",
          "price": null,
          "options": [
            {
              "label": "12 pcs",
              "price": 450000
            },
            {
              "label": "25 pcs",
              "price": 650000
            }
          ],
          "available": true,
          "featured": false
        },
        {
          "id": "mini-pancakes/mix-4-flavors",
          "name": "Mix 4 Flavors",
          "desc": "",
          "price": null,
          "options": [
            {
              "label": "12 pcs",
              "price": 350000
            }
          ],
          "available": true,
          "featured": false
        },
        {
          "id": "mini-pancakes/mix-5-flavors",
          "name": "Mix 5 Flavors",
          "desc": "",
          "price": null,
          "options": [
            {
              "label": "25 pcs",
              "price": 550000
            }
          ],
          "available": true,
          "featured": false
        },
        {
          "id": "mini-pancakes/mix-5-flavors-fruits",
          "name": "Mix 5 Flavors + Fruits",
          "desc": "",
          "price": null,
          "options": [
            {
              "label": "25 pcs",
              "price": 650000
            }
          ],
          "available": true,
          "featured": false
        }
      ]
    },
    {
      "id": "waffles",
      "name": "Waffles",
      "img": "waffle",
      "blurb": "",
      "extras": true,
      "choice": null,
      "visible": true,
      "items": [
        {
          "id": "waffles/white-waffle",
          "name": "White Waffle",
          "desc": "",
          "price": 300000,
          "options": [],
          "available": true,
          "featured": false
        },
        {
          "id": "waffles/lotus-waffle",
          "name": "Lotus Waffle",
          "desc": "",
          "price": 350000,
          "options": [],
          "available": true,
          "featured": true
        },
        {
          "id": "waffles/nutella-waffle",
          "name": "Nutella Waffle",
          "desc": "",
          "price": 350000,
          "options": [],
          "available": true,
          "featured": false
        },
        {
          "id": "waffles/belgian-and-white-waffle",
          "name": "Belgian & White Waffle",
          "desc": "",
          "price": 350000,
          "options": [],
          "available": true,
          "featured": false
        },
        {
          "id": "waffles/pistachio-waffle",
          "name": "Pistachio Waffle",
          "desc": "",
          "price": 400000,
          "options": [],
          "available": true,
          "featured": false
        },
        {
          "id": "waffles/special-waffle",
          "name": "Special Waffle",
          "desc": "",
          "price": 450000,
          "options": [],
          "available": true,
          "featured": false
        }
      ]
    },
    {
      "id": "specials",
      "name": "Specials",
      "img": "spreader",
      "blurb": "",
      "extras": true,
      "choice": null,
      "visible": true,
      "items": [
        {
          "id": "specials/fettuccine",
          "name": "Fettuccine",
          "desc": "",
          "price": 550000,
          "options": [],
          "available": true,
          "featured": false
        },
        {
          "id": "specials/banana-roll",
          "name": "Banana Roll",
          "desc": "",
          "price": 500000,
          "options": [],
          "available": true,
          "featured": false
        },
        {
          "id": "specials/brownies-roll",
          "name": "Brownies Roll",
          "desc": "",
          "price": 500000,
          "options": [],
          "available": true,
          "featured": false
        },
        {
          "id": "specials/belgian-roll",
          "name": "Belgian Roll",
          "desc": "",
          "price": 500000,
          "options": [],
          "available": true,
          "featured": false
        },
        {
          "id": "specials/pancakes",
          "name": "Pancakes",
          "desc": "",
          "price": 500000,
          "options": [],
          "available": true,
          "featured": false
        },
        {
          "id": "specials/crazy-pancakes",
          "name": "Crazy Pancakes",
          "desc": "",
          "price": 550000,
          "options": [],
          "available": true,
          "featured": false
        }
      ]
    },
    {
      "id": "cups",
      "name": "Cups",
      "img": "iced-cup",
      "blurb": "",
      "extras": false,
      "choice": null,
      "visible": true,
      "items": [
        {
          "id": "cups/dubai-cup",
          "name": "Dubai Cup",
          "desc": "",
          "price": 600000,
          "options": [],
          "available": true,
          "featured": false
        },
        {
          "id": "cups/brownies-cup",
          "name": "Brownies Cup",
          "desc": "",
          "price": 400000,
          "options": [],
          "available": true,
          "featured": false
        },
        {
          "id": "cups/lotus-cup",
          "name": "Lotus Cup",
          "desc": "",
          "price": 400000,
          "options": [],
          "available": true,
          "featured": false
        },
        {
          "id": "cups/oreo-cup",
          "name": "Oreo Cup",
          "desc": "",
          "price": 400000,
          "options": [],
          "available": true,
          "featured": false
        },
        {
          "id": "cups/red-cup",
          "name": "Red Cup",
          "desc": "",
          "price": 400000,
          "options": [],
          "available": true,
          "featured": false
        },
        {
          "id": "cups/lotus-brownies",
          "name": "Lotus Brownies",
          "desc": "",
          "price": 400000,
          "options": [],
          "available": true,
          "featured": false
        },
        {
          "id": "cups/strawberry-cup",
          "name": "Strawberry Cup",
          "desc": "",
          "price": 350000,
          "options": [],
          "available": true,
          "featured": false
        }
      ]
    },
    {
      "id": "iced-cups",
      "name": "Iced Cups",
      "img": "iced-cup",
      "blurb": "",
      "extras": false,
      "choice": null,
      "visible": true,
      "items": [
        {
          "id": "iced-cups/iced-brownies-cup",
          "name": "Iced Brownies Cup",
          "desc": "",
          "price": 400000,
          "options": [],
          "available": true,
          "featured": false
        },
        {
          "id": "iced-cups/iced-lotus-cup",
          "name": "Iced Lotus Cup",
          "desc": "",
          "price": 400000,
          "options": [],
          "available": true,
          "featured": false
        },
        {
          "id": "iced-cups/iced-crunchy-cup",
          "name": "Iced Crunchy Cup",
          "desc": "",
          "price": 400000,
          "options": [],
          "available": true,
          "featured": false
        },
        {
          "id": "iced-cups/ghazle-cup",
          "name": "Ghazle Cup",
          "desc": "",
          "price": 400000,
          "options": [],
          "available": true,
          "featured": false
        },
        {
          "id": "iced-cups/chocola-mou",
          "name": "Chocola Mou",
          "desc": "",
          "price": 500000,
          "options": [],
          "available": true,
          "featured": false
        },
        {
          "id": "iced-cups/kinder-mou",
          "name": "Kinder Mou",
          "desc": "",
          "price": 550000,
          "options": [],
          "available": true,
          "featured": false
        },
        {
          "id": "iced-cups/sweet-box",
          "name": "Sweet Box",
          "desc": "",
          "price": 600000,
          "options": [],
          "available": true,
          "featured": false
        }
      ]
    },
    {
      "id": "cheesecake",
      "name": "Cheesecake",
      "img": "badge",
      "blurb": "",
      "extras": false,
      "choice": null,
      "visible": true,
      "items": [
        {
          "id": "cheesecake/plain-cheesecake",
          "name": "Plain Cheesecake",
          "desc": "",
          "price": 225000,
          "options": [],
          "available": true,
          "featured": false
        },
        {
          "id": "cheesecake/nutella-cheesecake",
          "name": "Nutella Cheesecake",
          "desc": "",
          "price": 300000,
          "options": [],
          "available": true,
          "featured": false
        },
        {
          "id": "cheesecake/lotus-cheesecake",
          "name": "Lotus Cheesecake",
          "desc": "",
          "price": 300000,
          "options": [],
          "available": true,
          "featured": false
        },
        {
          "id": "cheesecake/kinder-cheesecake",
          "name": "Kinder Cheesecake",
          "desc": "",
          "price": 315000,
          "options": [],
          "available": true,
          "featured": false
        },
        {
          "id": "cheesecake/bueno-cheesecake",
          "name": "Bueno Cheesecake",
          "desc": "",
          "price": 325000,
          "options": [],
          "available": true,
          "featured": false
        },
        {
          "id": "cheesecake/oreo-cheesecake",
          "name": "Oreo Cheesecake",
          "desc": "",
          "price": 325000,
          "options": [],
          "available": true,
          "featured": false
        },
        {
          "id": "cheesecake/strawberry-cheesecake",
          "name": "Strawberry Cheesecake",
          "desc": "",
          "price": 300000,
          "options": [],
          "available": true,
          "featured": false
        },
        {
          "id": "cheesecake/mango-cheesecake",
          "name": "Mango Cheesecake",
          "desc": "",
          "price": 300000,
          "options": [],
          "available": true,
          "featured": false
        },
        {
          "id": "cheesecake/blueberry-cheesecake",
          "name": "Blueberry Cheesecake",
          "desc": "",
          "price": 300000,
          "options": [],
          "available": true,
          "featured": false
        },
        {
          "id": "cheesecake/san-sebastian",
          "name": "San Sebastian",
          "desc": "",
          "price": 300000,
          "options": [],
          "available": true,
          "featured": false
        }
      ]
    },
    {
      "id": "tiramisu",
      "name": "Tiramisu",
      "img": "tiramisu",
      "blurb": "",
      "extras": false,
      "choice": null,
      "visible": true,
      "items": [
        {
          "id": "tiramisu/classic-tiramisu",
          "name": "Classic Tiramisu",
          "desc": "",
          "price": 500000,
          "options": [],
          "available": true,
          "featured": false
        },
        {
          "id": "tiramisu/lotus-tiramisu",
          "name": "Lotus Tiramisu",
          "desc": "",
          "price": 500000,
          "options": [],
          "available": true,
          "featured": true
        },
        {
          "id": "tiramisu/oreo-tiramisu",
          "name": "Oreo Tiramisu",
          "desc": "",
          "price": 500000,
          "options": [],
          "available": true,
          "featured": false
        },
        {
          "id": "tiramisu/kinder-tiramisu",
          "name": "Kinder Tiramisu",
          "desc": "",
          "price": 500000,
          "options": [],
          "available": true,
          "featured": false
        },
        {
          "id": "tiramisu/zamel-tiramisu",
          "name": "Zamel Tiramisu",
          "desc": "",
          "price": 500000,
          "options": [],
          "available": true,
          "featured": false
        }
      ]
    },
    {
      "id": "cakes",
      "name": "Cakes",
      "img": "badge",
      "blurb": "",
      "extras": false,
      "choice": null,
      "visible": true,
      "items": [
        {
          "id": "cakes/lazy-cake",
          "name": "Lazy Cake",
          "desc": "",
          "price": 225000,
          "options": [],
          "available": true,
          "featured": false
        },
        {
          "id": "cakes/fudge-cake",
          "name": "Fudge Cake",
          "desc": "",
          "price": 225000,
          "options": [],
          "available": true,
          "featured": false
        },
        {
          "id": "cakes/fudge-nutella-cake",
          "name": "Fudge Nutella Cake",
          "desc": "",
          "price": 225000,
          "options": [],
          "available": true,
          "featured": false
        },
        {
          "id": "cakes/cinnamon-tart",
          "name": "Cinnamon Tart",
          "desc": "",
          "price": 200000,
          "options": [],
          "available": true,
          "featured": false
        },
        {
          "id": "cakes/fondant-ice-cream",
          "name": "Fondant + Ice Cream",
          "desc": "",
          "price": 450000,
          "options": [],
          "available": true,
          "featured": false
        }
      ]
    },
    {
      "id": "shakes",
      "name": "Shakes",
      "img": "shake",
      "blurb": "",
      "extras": false,
      "choice": null,
      "visible": true,
      "items": [
        {
          "id": "shakes/nutella-shake",
          "name": "Nutella Shake",
          "desc": "",
          "price": 400000,
          "options": [],
          "available": true,
          "featured": false
        },
        {
          "id": "shakes/strawberry-shake",
          "name": "Strawberry Shake",
          "desc": "",
          "price": 350000,
          "options": [],
          "available": true,
          "featured": false
        },
        {
          "id": "shakes/caramel-shake",
          "name": "Caramel Shake",
          "desc": "",
          "price": 350000,
          "options": [],
          "available": true,
          "featured": false
        },
        {
          "id": "shakes/kinder-shake",
          "name": "Kinder Shake",
          "desc": "",
          "price": 400000,
          "options": [],
          "available": true,
          "featured": false
        },
        {
          "id": "shakes/oreo-shake",
          "name": "Oreo Shake",
          "desc": "",
          "price": 400000,
          "options": [],
          "available": true,
          "featured": false
        },
        {
          "id": "shakes/brownies-shake",
          "name": "Brownies Shake",
          "desc": "",
          "price": 400000,
          "options": [],
          "available": true,
          "featured": false
        },
        {
          "id": "shakes/snickers-shake",
          "name": "Snickers Shake",
          "desc": "",
          "price": 400000,
          "options": [],
          "available": true,
          "featured": false
        },
        {
          "id": "shakes/lotus-shake",
          "name": "Lotus Shake",
          "desc": "",
          "price": 400000,
          "options": [],
          "available": true,
          "featured": false
        },
        {
          "id": "shakes/bueno-shake",
          "name": "Bueno Shake",
          "desc": "",
          "price": 400000,
          "options": [],
          "available": true,
          "featured": false
        },
        {
          "id": "shakes/pistachio-shake",
          "name": "Pistachio Shake",
          "desc": "",
          "price": 450000,
          "options": [],
          "available": true,
          "featured": true
        }
      ]
    },
    {
      "id": "frappe",
      "name": "Frappe",
      "img": "latte",
      "blurb": "",
      "extras": false,
      "choice": null,
      "visible": true,
      "items": [
        {
          "id": "frappe/classic-frappe",
          "name": "Classic Frappe",
          "desc": "",
          "price": 350000,
          "options": [],
          "available": true,
          "featured": false
        },
        {
          "id": "frappe/coffee-frappe",
          "name": "Coffee Frappe",
          "desc": "",
          "price": 400000,
          "options": [],
          "available": true,
          "featured": false
        },
        {
          "id": "frappe/caramel-frappe",
          "name": "Caramel Frappe",
          "desc": "",
          "price": 350000,
          "options": [],
          "available": true,
          "featured": false
        },
        {
          "id": "frappe/mocha-frappe",
          "name": "Mocha Frappe",
          "desc": "",
          "price": 350000,
          "options": [],
          "available": true,
          "featured": false
        },
        {
          "id": "frappe/vanilla-frappe",
          "name": "Vanilla Frappe",
          "desc": "",
          "price": 350000,
          "options": [],
          "available": true,
          "featured": false
        },
        {
          "id": "frappe/hazelnut-frappe",
          "name": "Hazelnut Frappe",
          "desc": "",
          "price": 50000,
          "options": [],
          "available": true,
          "featured": false
        },
        {
          "id": "frappe/toffee-frappe",
          "name": "Toffee Frappe",
          "desc": "",
          "price": 350000,
          "options": [],
          "available": true,
          "featured": false
        },
        {
          "id": "frappe/vanilla-sugar-free-frappe",
          "name": "Vanilla Sugar Free Frappe",
          "desc": "",
          "price": 350000,
          "options": [],
          "available": true,
          "featured": false
        },
        {
          "id": "frappe/caramel-sugar-free-frappe",
          "name": "Caramel Sugar Free Frappe",
          "desc": "",
          "price": 350000,
          "options": [],
          "available": true,
          "featured": false
        }
      ]
    },
    {
      "id": "smoothies",
      "name": "Smoothies",
      "img": "smoothies",
      "blurb": "",
      "extras": false,
      "choice": null,
      "visible": true,
      "items": [
        {
          "id": "smoothies/mango-smoothie",
          "name": "Mango Smoothie",
          "desc": "",
          "price": 350000,
          "options": [],
          "available": true,
          "featured": false
        },
        {
          "id": "smoothies/strawberry-smoothie",
          "name": "Strawberry Smoothie",
          "desc": "",
          "price": 350000,
          "options": [],
          "available": true,
          "featured": false
        },
        {
          "id": "smoothies/peach-smoothie",
          "name": "Peach Smoothie",
          "desc": "",
          "price": 350000,
          "options": [],
          "available": true,
          "featured": false
        },
        {
          "id": "smoothies/fruits-smoothie",
          "name": "Fruits Smoothie",
          "desc": "",
          "price": 350000,
          "options": [],
          "available": true,
          "featured": false
        },
        {
          "id": "smoothies/passion-smoothie",
          "name": "Passion Smoothie",
          "desc": "",
          "price": 350000,
          "options": [],
          "available": true,
          "featured": false
        },
        {
          "id": "smoothies/blueberry-smoothie",
          "name": "Blueberry Smoothie",
          "desc": "",
          "price": 350000,
          "options": [],
          "available": true,
          "featured": false
        },
        {
          "id": "smoothies/tropical-smoothie",
          "name": "Tropical Smoothie",
          "desc": "",
          "price": 350000,
          "options": [],
          "available": true,
          "featured": false
        }
      ]
    },
    {
      "id": "matcha",
      "name": "Matcha",
      "img": "leaf",
      "blurb": "",
      "extras": false,
      "choice": null,
      "visible": true,
      "items": [
        {
          "id": "matcha/classic-matcha",
          "name": "Classic Matcha",
          "desc": "",
          "price": 350000,
          "options": [],
          "available": true,
          "featured": false
        },
        {
          "id": "matcha/caramel-matcha",
          "name": "Caramel Matcha",
          "desc": "",
          "price": 350000,
          "options": [],
          "available": true,
          "featured": false
        },
        {
          "id": "matcha/vanilla-matcha",
          "name": "Vanilla Matcha",
          "desc": "",
          "price": 350000,
          "options": [],
          "available": true,
          "featured": false
        },
        {
          "id": "matcha/hazelnut-matcha",
          "name": "Hazelnut Matcha",
          "desc": "",
          "price": 350000,
          "options": [],
          "available": true,
          "featured": false
        },
        {
          "id": "matcha/strawberry-matcha",
          "name": "Strawberry Matcha",
          "desc": "",
          "price": 350000,
          "options": [],
          "available": true,
          "featured": false
        },
        {
          "id": "matcha/blueberry-matcha",
          "name": "Blueberry Matcha",
          "desc": "",
          "price": 350000,
          "options": [],
          "available": true,
          "featured": false
        },
        {
          "id": "matcha/mango-matcha",
          "name": "Mango Matcha",
          "desc": "",
          "price": 350000,
          "options": [],
          "available": true,
          "featured": false
        },
        {
          "id": "matcha/vanilla-sugar-free-matcha",
          "name": "Vanilla Sugar Free Matcha",
          "desc": "",
          "price": 350000,
          "options": [],
          "available": true,
          "featured": false
        },
        {
          "id": "matcha/caramel-sugar-free-matcha",
          "name": "Caramel Sugar Free Matcha",
          "desc": "",
          "price": 350000,
          "options": [],
          "available": true,
          "featured": false
        }
      ]
    },
    {
      "id": "latte",
      "name": "Latte",
      "img": "latte",
      "blurb": "Served hot or iced.",
      "extras": false,
      "choice": {
        "label": "Serve it",
        "values": [
          "Hot",
          "Iced"
        ]
      },
      "visible": true,
      "items": [
        {
          "id": "latte/classic-latte",
          "name": "Classic Latte",
          "desc": "",
          "price": 350000,
          "options": [],
          "available": true,
          "featured": false
        },
        {
          "id": "latte/spanish-latte",
          "name": "Spanish Latte",
          "desc": "",
          "price": 350000,
          "options": [],
          "available": true,
          "featured": true
        },
        {
          "id": "latte/caramel-latte",
          "name": "Caramel Latte",
          "desc": "",
          "price": 350000,
          "options": [],
          "available": true,
          "featured": false
        },
        {
          "id": "latte/vanilla-latte",
          "name": "Vanilla Latte",
          "desc": "",
          "price": 350000,
          "options": [],
          "available": true,
          "featured": false
        },
        {
          "id": "latte/hazelnut-latte",
          "name": "Hazelnut Latte",
          "desc": "",
          "price": 350000,
          "options": [],
          "available": true,
          "featured": false
        },
        {
          "id": "latte/toffee-latte",
          "name": "Toffee Latte",
          "desc": "",
          "price": 350000,
          "options": [],
          "available": true,
          "featured": false
        },
        {
          "id": "latte/oreo-latte",
          "name": "Oreo Latte",
          "desc": "",
          "price": 400000,
          "options": [],
          "available": true,
          "featured": false
        },
        {
          "id": "latte/lotus-latte",
          "name": "Lotus Latte",
          "desc": "",
          "price": 400000,
          "options": [],
          "available": true,
          "featured": false
        },
        {
          "id": "latte/nutella-latte",
          "name": "Nutella Latte",
          "desc": "",
          "price": 400000,
          "options": [],
          "available": true,
          "featured": false
        },
        {
          "id": "latte/vanilla-sugar-free-latte",
          "name": "Vanilla Sugar Free Latte",
          "desc": "",
          "price": 350000,
          "options": [],
          "available": true,
          "featured": false
        },
        {
          "id": "latte/caramel-sugar-free-latte",
          "name": "Caramel Sugar Free Latte",
          "desc": "",
          "price": 350000,
          "options": [],
          "available": true,
          "featured": false
        }
      ]
    },
    {
      "id": "macchiato",
      "name": "Macchiato",
      "img": "latte",
      "blurb": "",
      "extras": false,
      "choice": null,
      "visible": true,
      "items": [
        {
          "id": "macchiato/caramel-macchiato",
          "name": "Caramel Macchiato",
          "desc": "",
          "price": 375000,
          "options": [],
          "available": true,
          "featured": false
        },
        {
          "id": "macchiato/mocha-macchiato",
          "name": "Mocha Macchiato",
          "desc": "",
          "price": 375000,
          "options": [],
          "available": true,
          "featured": false
        }
      ]
    },
    {
      "id": "mojito",
      "name": "Mojito",
      "img": "mojito",
      "blurb": "",
      "extras": false,
      "choice": null,
      "visible": true,
      "items": [
        {
          "id": "mojito/classic-mojito",
          "name": "Classic Mojito",
          "desc": "",
          "price": 350000,
          "options": [],
          "available": true,
          "featured": false
        },
        {
          "id": "mojito/strawberry-mojito",
          "name": "Strawberry Mojito",
          "desc": "",
          "price": 350000,
          "options": [],
          "available": true,
          "featured": false
        },
        {
          "id": "mojito/passion-mojito",
          "name": "Passion Mojito",
          "desc": "",
          "price": 350000,
          "options": [],
          "available": true,
          "featured": false
        },
        {
          "id": "mojito/peach-mojito",
          "name": "Peach Mojito",
          "desc": "",
          "price": 350000,
          "options": [],
          "available": true,
          "featured": false
        },
        {
          "id": "mojito/mango-mojito",
          "name": "Mango Mojito",
          "desc": "",
          "price": 350000,
          "options": [],
          "available": true,
          "featured": false
        },
        {
          "id": "mojito/tropical-mojito",
          "name": "Tropical Mojito",
          "desc": "",
          "price": 350000,
          "options": [],
          "available": true,
          "featured": false
        },
        {
          "id": "mojito/blueberry-mojito",
          "name": "Blueberry Mojito",
          "desc": "",
          "price": 350000,
          "options": [],
          "available": true,
          "featured": false
        },
        {
          "id": "mojito/blue-curacao-mojito",
          "name": "Blue Curacao Mojito",
          "desc": "",
          "price": 350000,
          "options": [],
          "available": true,
          "featured": false
        },
        {
          "id": "mojito/power-mojito",
          "name": "Power Mojito",
          "desc": "",
          "price": 350000,
          "options": [],
          "available": true,
          "featured": false
        }
      ]
    },
    {
      "id": "iced-tea",
      "name": "Iced Tea",
      "img": "badge",
      "blurb": "",
      "extras": false,
      "choice": null,
      "visible": true,
      "items": [
        {
          "id": "iced-tea/iced-tea-peach",
          "name": "Iced Tea Peach",
          "desc": "",
          "price": 200000,
          "options": [],
          "available": true,
          "featured": false
        },
        {
          "id": "iced-tea/iced-tea-mango",
          "name": "Iced Tea Mango",
          "desc": "",
          "price": 200000,
          "options": [],
          "available": true,
          "featured": false
        },
        {
          "id": "iced-tea/iced-tea-raspberry",
          "name": "Iced Tea Raspberry",
          "desc": "",
          "price": 200000,
          "options": [],
          "available": true,
          "featured": false
        }
      ]
    },
    {
      "id": "beverages",
      "name": "Beverages",
      "img": "badge",
      "blurb": "",
      "extras": false,
      "choice": null,
      "visible": true,
      "items": [
        {
          "id": "beverages/water",
          "name": "Water",
          "desc": "",
          "price": 30000,
          "options": [],
          "available": true,
          "featured": false
        },
        {
          "id": "beverages/pepsi",
          "name": "Pepsi",
          "desc": "",
          "price": 80000,
          "options": [],
          "available": true,
          "featured": false
        },
        {
          "id": "beverages/miranda",
          "name": "Miranda",
          "desc": "",
          "price": 80000,
          "options": [],
          "available": true,
          "featured": false
        },
        {
          "id": "beverages/7up",
          "name": "7UP",
          "desc": "",
          "price": 80000,
          "options": [],
          "available": true,
          "featured": false
        },
        {
          "id": "beverages/lipton-ice-tea",
          "name": "Lipton Ice Tea",
          "desc": "",
          "price": 80000,
          "options": [],
          "available": true,
          "featured": false
        },
        {
          "id": "beverages/milkshake",
          "name": "Milkshake",
          "desc": "",
          "price": 70000,
          "options": [],
          "available": true,
          "featured": false
        },
        {
          "id": "beverages/makkaw-juice",
          "name": "Makkaw Juice",
          "desc": "",
          "price": 70000,
          "options": [],
          "available": true,
          "featured": false
        },
        {
          "id": "beverages/rim-sparkling-water",
          "name": "Rim Sparkling Water",
          "desc": "",
          "price": 70000,
          "options": [],
          "available": true,
          "featured": false
        },
        {
          "id": "beverages/dark-blue",
          "name": "Dark Blue",
          "desc": "",
          "price": 80000,
          "options": [],
          "available": true,
          "featured": false
        }
      ]
    }
  ],
  "extras": [
    {
      "id": "spreads",
      "name": "Spreads",
      "sections": [
        "crepes",
        "mini-pancakes",
        "waffles",
        "specials"
      ],
      "max": 0,
      "items": [
        {
          "id": "nutella",
          "name": "Nutella",
          "price": 100000,
          "available": true
        },
        {
          "id": "lotus",
          "name": "Lotus",
          "price": 100000,
          "available": true
        },
        {
          "id": "kinder",
          "name": "Kinder",
          "price": 120000,
          "available": true
        },
        {
          "id": "white",
          "name": "White",
          "price": 100000,
          "available": true
        },
        {
          "id": "dark",
          "name": "Dark",
          "price": 100000,
          "available": true
        },
        {
          "id": "belgian-chocolate",
          "name": "Belgian Chocolate",
          "price": 150000,
          "available": true
        },
        {
          "id": "pistachio",
          "name": "Pistachio",
          "price": 150000,
          "available": true
        },
        {
          "id": "peanut-butter",
          "name": "Peanut Butter",
          "price": 100000,
          "available": true
        }
      ]
    },
    {
      "id": "crunch-and-candy",
      "name": "Crunch & candy",
      "sections": [
        "crepes",
        "mini-pancakes",
        "waffles",
        "specials"
      ],
      "max": 0,
      "items": [
        {
          "id": "oreo",
          "name": "Oreo",
          "price": 60000,
          "available": true
        },
        {
          "id": "brownies",
          "name": "Brownies",
          "price": 60000,
          "available": true
        },
        {
          "id": "lotus-biscuits",
          "name": "Lotus Biscuits",
          "price": 50000,
          "available": true
        },
        {
          "id": "hersheys",
          "name": "Hersheys",
          "price": 120000,
          "available": true
        },
        {
          "id": "snickers",
          "name": "Snickers",
          "price": 90000,
          "available": true
        },
        {
          "id": "galaxy",
          "name": "Galaxy",
          "price": 100000,
          "available": true
        },
        {
          "id": "kinder-bueno",
          "name": "Kinder Bueno",
          "price": 135000,
          "available": true
        },
        {
          "id": "digestive",
          "name": "Digestive",
          "price": 90000,
          "available": true
        },
        {
          "id": "nuts",
          "name": "Nuts",
          "price": 90000,
          "available": true
        },
        {
          "id": "fustuq-halabi",
          "name": "Fustuq Halabi",
          "price": 100000,
          "available": true
        },
        {
          "id": "marshmallow",
          "name": "Marshmallow",
          "price": 100000,
          "available": true
        },
        {
          "id": "smarties",
          "name": "Smarties",
          "price": 70000,
          "available": true
        },
        {
          "id": "gelleys",
          "name": "Gelleys",
          "price": 70000,
          "available": true
        },
        {
          "id": "flakes",
          "name": "Flakes",
          "price": 50000,
          "available": true
        }
      ]
    },
    {
      "id": "fruit",
      "name": "Fruit",
      "sections": [
        "crepes",
        "mini-pancakes",
        "waffles",
        "specials"
      ],
      "max": 0,
      "items": [
        {
          "id": "strawberry",
          "name": "Strawberry",
          "price": 100000,
          "available": true
        },
        {
          "id": "banana",
          "name": "Banana",
          "price": 50000,
          "available": true
        },
        {
          "id": "ananas",
          "name": "Ananas",
          "price": 90000,
          "available": true
        }
      ]
    },
    {
      "id": "ice-cream-and-syrups",
      "name": "Ice cream & syrups",
      "sections": [
        "crepes",
        "mini-pancakes",
        "waffles",
        "specials"
      ],
      "max": 0,
      "items": [
        {
          "id": "scoop-vanilla",
          "name": "Scoop Vanilla",
          "price": 90000,
          "available": true
        },
        {
          "id": "scoop-chocolate",
          "name": "Scoop Chocolate",
          "price": 90000,
          "available": true
        },
        {
          "id": "dark-syrup",
          "name": "Dark Syrup",
          "price": 20000,
          "available": true
        },
        {
          "id": "strawberry-syrup",
          "name": "Strawberry Syrup",
          "price": 20000,
          "available": true
        },
        {
          "id": "caramel-syrup",
          "name": "Caramel Syrup",
          "price": 20000,
          "available": true
        }
      ]
    }
  ]
};
