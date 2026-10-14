"""Give the site's CSS and JS files new addresses so every browser fetches the new copies.

The files are served with "Cache-Control: no-cache" (browsers check for a newer copy on every
visit), so this is only a belt-and-braces step after a big change:  python3 tools/bump-version.py
"""
import datetime, pathlib, re

root = pathlib.Path(__file__).resolve().parent.parent
v = datetime.datetime.now().strftime("%Y%m%d%H%M")
files = ["public/index.html", "public/js/site.js", "public/admin/index.html", "public/admin/admin.js"]
for f in files:
    p = root / f
    s = re.sub(r"\?v=\d+", "?v=" + v, p.read_text())
    p.write_text(s)
    print("updated", f)
