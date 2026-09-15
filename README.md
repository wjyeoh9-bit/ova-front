# OVA validation storefront

A mobile-first, original OVA storefront. React 19 + TypeScript, with a Vite build for Cloudflare Pages and a Vinext build for the private Sites review link.

## Included

- `/`: homepage
- `/product`: RM89 wearable; Black, Silver and Invisible; quantities 1–10 per expression
- `/cart`: persistent localStorage cart, editing, removal, line totals and subtotal
- `/checkout`: development disclosure, no payment fields, email and optional WhatsApp signup
- `/first-batch`: confirmation shown only after a successful signup in the current browser session
- Durable D1 first-batch signup records, email deduplication, consent text version, selected items, MYR total and campaign attribution
- Anonymous PostHog funnel events, ready to enable with your project token

The storefront uses product-focused wording before checkout. Development and availability disclosures appear on the checkout-intent page. Each expression has its own product render based on the supplied design concept. The selected colour appears in the product gallery and cart. A product-details image is available in the gallery, with its concept/testing footer removed. No reviews, certifications, filtration percentages or medical claims are used. No payment integration exists. No launch date or guaranteed reservation is promised. Signup confirmation is displayed on the website; this project does not send email or WhatsApp messages automatically.

## Deploy to your Cloudflare Pages account

1. Put this project in a Git repository connected to Cloudflare Pages. Use Node 22.13 or newer and the pnpm version in `package.json`. Keep `pnpm-lock.yaml`.
2. Create a Cloudflare D1 database named `ova-first-batch`.
3. Apply the SQL in `drizzle/0000_remarkable_nick_fury.sql` to that database, using the Cloudflare D1 console or:

   ```sh
   pnpm exec wrangler d1 execute ova-first-batch --remote --file=drizzle/0000_remarkable_nick_fury.sql
   ```

4. Create the Pages project with these settings:

   | Setting | Value |
   | --- | --- |
   | Framework | Vite |
   | Build command | `pnpm run build:pages` |
   | Build output directory | `pages-dist` |
   | Root directory | repository root |
   | Node version | 22.13 or newer |

5. In the Pages project’s Settings → Bindings, add a D1 binding named **DB** and select `ova-first-batch`. Configure the production and preview environments that you intend to use. Redeploy after adding the binding.
6. The root `functions/api/` directory supplies `/api/signup` and `/api/events` automatically. Use Git integration or Wrangler deployment; do not use a dashboard drag-and-drop upload of just the static folder, which would omit the Functions.
7. To deploy with Wrangler after building, run `pnpm exec wrangler pages deploy pages-dist` from the repository root and select the existing Pages project.
8. Test one signup using your own email, then remove that test record from D1 before starting your validation campaign. Confirm that direct links to `/product`, `/cart`, `/checkout` and `/first-batch` load on your Pages URL. The Vite build uses Pages’ default SPA fallback; do not add a top-level `404.html`.

The same UI and server handlers are shared by both builds. The managed Sites review deployment uses Vinext on Cloudflare Workers; your Cloudflare Pages deployment uses React/Vite plus Pages Functions.

## Enable PostHog

Set these runtime variables in your Pages Functions environment, then redeploy:

```text
POSTHOG_KEY=your_PostHog_project_token
POSTHOG_HOST=https://us.i.posthog.com
```

Use `https://eu.i.posthog.com` for an EU project. This integration supports the US and EU Cloud ingestion hosts. Use the **project token**, not a personal API key. For the Sites deployment, set the same names in the Site’s environment settings. Without a token, `/api/events` returns an explicit disabled response and the storefront/signup still works. No placeholder key sends data anywhere.

`lib/analytics.ts` emits explicit, anonymous events to a same-origin server endpoint. The server allowlists event names and properties and forwards them using PostHog’s capture API. There is no PostHog SDK, autocapture, session replay, or automatic person identification. Email and WhatsApp are never analytics properties. Do Not Track disables client analytics. UTM values are captured per browser session; use campaign labels, not personal data, in your links.

| Event | When |
| --- | --- |
| `page_viewed` | A route is entered |
| `product_viewed` | Product page is entered |
| `variant_selected` | A visitor chooses an expression |
| `product_added_to_cart` | Items are added, with actual added quantity |
| `cart_viewed` | Cart is entered |
| `cart_quantity_changed` | A cart quantity changes |
| `product_removed_from_cart` | An expression is removed |
| `checkout_started` | Checkout is clicked from a nonempty cart |
| `checkout_intent_viewed` | The development disclosure is shown |
| `first_batch_form_started` | First interaction with the signup form |
| `first_batch_signup_submitted` | Valid form is submitted |
| `first_batch_signup_completed` | Server confirms a newly stored email |
| `first_batch_signup_failed` | Signup request fails |

Create a PostHog funnel:

`product_viewed → product_added_to_cart → checkout_started → first_batch_signup_completed`

Use unique visitors, a 7-day conversion window, and breakdowns by `utm_campaign`, `utm_content` and `variant` where the event has a variant. Multi-variant carts use `items`. Compare the checkout-to-signup drop-off separately: the disclosure changes the visitor’s decision. These are expressions of purchase intent, not sales. Do not send a `purchase` event.

Events include anonymous visitor ID, currency MYR, fixed unit price 89, relevant quantities, cart value and selected items. Browser localStorage stores the cart and random visitor ID. sessionStorage stores campaign attribution and the current-session confirmation flag. Corrupt cart data is sanitized; unavailable storage shows a notice and keeps the active tab usable. Analytics is best-effort and may be affected by browser settings or network failures; D1 signup records are the source of truth for leads.

## Read your signups

Use the Cloudflare D1 console (or Site database controls for the private review deployment):

```sql
SELECT email, whatsapp, items, total_myr, attribution, created_at
FROM first_batch_signups
ORDER BY created_at DESC;
```

The public site exposes no read/list endpoint for personal signup data. Duplicate email submission returns a success screen without creating another lead or overwriting the original contact record. Rate limiting allows 10 requests per hour per daily hashed platform IP. The honeypot and server validation reject malformed submissions. If DB is unavailable, the form preserves the entered details and shows an error instead of confirming a signup.

Contact updates and opt-outs need to be managed by the owner when sending first-batch messages. The form explains the intended use of the contact details; no unrelated marketing subscription is added.

## Local work

```sh
pnpm install --frozen-lockfile
pnpm run build:pages
pnpm exec wrangler pages dev pages-dist --d1 DB=ova-first-batch
```

Configure a local D1 database and apply the included migration for local signup testing. For analytics, copy `.env.example` to the environment mechanism for your runtime (`.dev.vars` for Wrangler locally). Never commit credentials. The Sites/Vinext scripts remain available as `pnpm run build` and `pnpm run dev`.

A feature-detected read-only WebMCP tool, `read_ova_cart`, exposes the visible bag state to compatible browsers. Unsupported browsers ignore it.

## Reference documentation

- Cloudflare Pages Functions bindings: https://developers.cloudflare.com/pages/functions/bindings/
- Cloudflare Pages build settings: https://developers.cloudflare.com/pages/configuration/build-configuration/
- PostHog capture API: https://posthog.com/docs/api/capture

## Build verification

Both production builds and the TypeScript check passed. Request-handler checks covered cart totals, duplicate signups, invalid inputs, database failure, rate limiting, and exclusion of contact details from analytics. Browser visual testing and live WebMCP validation were not available in this build workflow.
