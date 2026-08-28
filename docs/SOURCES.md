# Source matrix

| Source | State | Collection path | Notes |
|---|---|---|---|
| eBay | Ready after credentials | Official OAuth + Browse API, plus sold-comparable lookup | Local-pickup query centered on ZIP 67146 with a 250-mile radius |
| Facebook Marketplace | Opt-in sidecar | `ai-marketplace-monitor` + authorized JSON bridge | Runs separately; no credentials stored in the app |
| Reverb | Compliance gate | Adapter disabled by default | Enable only after API access and automated-use permission are confirmed |
| Estate sales | Assisted import | Same JSON bridge | Add public listing fields and coordinates from local sale discoveries |
| US Audio Mart / other sellers | Assisted import | Same JSON bridge | Normalization, geofence, and dedupe still apply |

The JSON bridge accepts the raw-listing shape shown in
`collectors/facebook/import.example.json`. The `source` field may be
`facebook`, `estatesales`, `usaudiomart`, or `manual`. Coordinates are strongly
recommended: without them, a marketplace's own radius filter or human review
must establish that the item is local.

No collector attempts to bypass a login challenge, rate limit, robot control,
or marketplace access policy.

The eBay sold-comparable lookup adapts the completed-items approach documented
by `YosefHayim/ebay-mcp`; the application does not embed or run that MCP server.
Playwright MCP can support an independently authorized browser sidecar or test
workflow, but it does not grant accounts, cookies, permissions, or API access.
