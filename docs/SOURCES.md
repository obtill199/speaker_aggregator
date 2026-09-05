# Source matrix

| Source | State | Collection path | Notes |
|---|---|---|---|
| eBay | Ready after credentials | Official OAuth + Browse API | Local-pickup query centered on ZIP 67146 with a 250-mile radius |
| Facebook Marketplace | Opt-in sidecar | `ai-marketplace-monitor` + authorized JSON bridge | Runs separately; no credentials stored in the app |
| Reverb | Live | Public Reverb listings endpoint; optional personal token | Eight focused vintage searches per six-hour run |
| US Audio Mart / other sellers | Assisted import | Same JSON bridge | Normalization, geofence, and dedupe still apply |

EstateSales.net was removed as a source. Whole-house sale leads were too noisy for FIL and are no longer collected or shown.

The JSON bridge accepts the raw-listing shape shown in
`collectors/facebook/import.example.json`. The `source` field may be
`facebook`, `usaudiomart`, or `manual`. Coordinates are strongly
recommended: without them, a marketplace's own radius filter or human review
must establish that the item is local.

Facebook is not collected from the hosted GitHub runner. Meta's generally
available APIs do not provide ordinary Marketplace access, so the supported
path is a user-authorized local `ai-marketplace-monitor` session followed by
the JSON bridge. No collector attempts to bypass a login challenge, rate
limit, robot control, or marketplace access policy.
