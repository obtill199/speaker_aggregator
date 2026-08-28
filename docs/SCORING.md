# Deal scoring

The gauge is an explainable triage tool. A listing without an asking price or
usable sold comparables is labeled **Needs Review** and receives no numeric
score.

For scorable listings:

1. Use the lower quartile of sold prices as conservative resale value.
2. Compute all-in cost as asking price + shipping + round-trip mileage at $0.35
   per mile + detected repair reserves.
3. Subtract an estimated 13% selling fee from conservative resale value.
4. Blend value discount (45%), projected ROI (30%), demand/recency (15%), and
   comp confidence (10%).

| Gauge | Score | Meaning |
|---|---:|---|
| Great Deal | 80–100 | Strong margin with the stated repair reserve |
| Good Deal | 65–79 | Worth contacting after photo/model verification |
| Average | 45–64 | Fairly priced; margin is modest |
| No Deal | 25–44 | Thin economics at the asking price |
| Bad Deal | 0–24 | Likely loss or outsized risk |
| Needs Review | — | Missing price or sold comps |

Confidence is separate from grade. High confidence requires at least five
comparables including four exact-model matches; fewer or weaker matches lower
confidence even when the apparent discount is large.

The risk parser reserves money for untested equipment, foam surrounds, damaged
drivers, channel faults, hum/recapping, cabinet work, and missing trim. A basic
service reserve is added when a listing does not say it was serviced.
