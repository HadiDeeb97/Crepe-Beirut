"""Inline tools/sprite.svg (logo + icons) into the site and admin pages.

Run after changing the sprite:  python3 tools/inject-sprite.py
The pages keep the sprite between <!--SPRITE--> and <!--/SPRITE--> markers.
"""
import pathlib, re

root = pathlib.Path(__file__).resolve().parent.parent
sprite = (root / "tools" / "sprite.svg").read_text().strip()
for page in ["public/index.html", "public/admin/index.html", "public/menu-print/index.html"]:
    p = root / page
    if not p.exists():
        continue
    html = p.read_text()
    block = "<!--SPRITE-->" + sprite + "<!--/SPRITE-->"
    if "<!--/SPRITE-->" in html:
        html = re.sub(r"<!--SPRITE-->.*?<!--/SPRITE-->", lambda m: block, html, flags=re.S)
    else:
        html = html.replace("<!--SPRITE-->", block, 1)
    p.write_text(html)
    print("updated", page)
