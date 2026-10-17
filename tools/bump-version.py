"""Give the site's CSS and JS files new addresses so every browser fetches the new copies.

Browsers keep CSS and JS for a day (see public/_headers), so run this after every change to a
file in public/css, public/js or public/admin:  python3 tools/bump-version.py
"""
import datetime, pathlib, re

root = pathlib.Path(__file__).resolve().parent.parent
v = datetime.datetime.now().strftime("%Y%m%d%H%M")
files = ["public/index.html", "public/js/site.js", "public/admin/index.html", "public/admin/admin.js", "public/menu-print/index.html", "public/menu-print/print.js"]
for f in files:
    p = root / f
    s = re.sub(r"\?v=\d+", "?v=" + v, p.read_text())
    p.write_text(s)
    print("updated", f)
