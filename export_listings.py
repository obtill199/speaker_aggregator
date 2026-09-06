"""Export ai-marketplace-monitor listing details for The Sound Room bridge."""

import json
import os
import re
from pathlib import Path

from diskcache import Cache


def optional_number(value):
    try:
        return float(value) if value not in (None, "") else None
    except (TypeError, ValueError):
        return None

c = Cache(str(Path.home() / ".ai-marketplace-monitor"))
out, seen = [], set()
for key in list(c):
    if not (isinstance(key, tuple) and key and key[0] == "listing-details"):
        continue
    val = c.get(key)
    if not isinstance(val, dict):
        continue
    url = str(val.get("post_url") or (key[1] if len(key) > 1 else "")).split("?")[0]
    if not url or url in seen:
        continue
    seen.add(url)
    m = re.search(r"/item/(\d+)", url)
    sid = m.group(1) if m else ""
    if not url.startswith("http"):
        if not sid:
            continue
        url = "https://www.facebook.com/marketplace/item/" + sid
    if not sid:
        sid = url
    raw = str(val.get("price") or "")
    cleaned = re.sub(r"[^\d.]", "", raw)
    try:
        cents = int(round(float(cleaned) * 100)) if cleaned else None
    except ValueError:
        cents = None
    title = (val.get("title") or val.get("name") or "").strip()
    if not title:
        continue
    img = val.get("image") or None
    if img and not str(img).startswith("http"):
        img = None
    latitude = optional_number(val.get("latitude") or val.get("lat"))
    longitude = optional_number(
        val.get("longitude") or val.get("lng") or val.get("lon")
    )
    out.append({
        "source": "facebook",
        "sourceListingId": sid,
        "url": url,
        "title": title,
        "description": val.get("description") or "",
        "priceCents": cents,
        "location": val.get("location") or None,
        "latitude": latitude,
        "longitude": longitude,
        "condition": val.get("condition") or "Used",
        "imageUrl": img,
    })

configured_path = os.environ.get("FACEBOOK_IMPORT_PATH")
path = Path(configured_path).expanduser() if configured_path else Path.home() / ".sound-room" / "listings.json"
path.parent.mkdir(parents=True, exist_ok=True)
path.write_text(json.dumps(out, indent=2))
print(f"Exported {len(out)} listings to {path}")
