# Facebook Marketplace sidecar

Facebook collection is intentionally isolated from the web app. The referenced
[`ai-marketplace-monitor`](https://github.com/BoPeng/ai-marketplace-monitor)
project is AGPL-3.0 software and its own documentation warns that unauthorized
automated collection may violate Meta's terms. Use it only with an account and
workflow you are authorized to automate; do not attempt to evade challenges or
account controls.

1. Install the upstream project in its own Python environment and install its
   Playwright browser dependencies.
2. Copy `config.example.toml` outside this repository, add credentials through
   `FACEBOOK_USERNAME` and `FACEBOOK_PASSWORD`, and run the monitor on a trusted
   workstation or VPS. The upstream tool handles discovery and notification.
3. Export discovered public listing fields in the shape shown by
   `import.example.json`. Include coordinates so the app can enforce the
   250-mile radius rather than trusting a city label.
4. Publish the export from that trusted machine:

   ```bash
   FACEBOOK_IMPORT_PATH=/secure/path/listings.json \
   SOUND_ROOM_INGEST_URL=https://the-sound-room.obtill199.chatgpt.site/api/ingest \
   INGEST_KEY='your-local-bridge-key' \
   npm run collect
   ```

   The same command also refreshes Reverb and estate-sale data. Run it every
   six hours with the workstation's scheduler only after confirming the
   upstream monitor is permitted and stable for the account.

The bridge normalizes spelling aliases, removes unrelated audio gear, applies
the Udall radius, deduplicates cross-posts, and submits the result through the
same authenticated ingest endpoint as eBay. It does not store Facebook login
credentials in The Sound Room or in GitHub Actions.
