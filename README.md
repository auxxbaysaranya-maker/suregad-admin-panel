# SureGad Hub — admin panels

The seller, inspection-partner and super-admin panels for SureGad, in one app. The buyer marketplace lives in a separate repository.

## How access works

- **One sign-in** (`/login`) for everyone. The account's roles decide which panel opens:
  - `super_admin` → **Super admin** (`/admin`): overview, listing review, approvals, configuration
  - `business_seller` → **Seller** (`/seller`): dashboard, add listing with photos, orders, storefront
  - `service_partner` → **Partner** (`/partner`): inspection jobs, job checklist and evidence, earnings
- Accounts with several roles get a panel switcher in the sidebar. Each panel route checks the role; anyone else is sent to their own panel or to sign-in.
- **Sign-up** (`/signup`) exists for sellers and partners only. There is no admin sign-up; admin access is granted by the SureGad team.
- New showrooms and partners stay pending until a super admin approves them under **Approvals**.

## Run locally

```bash
npm install
cp .env.example .env
npm run dev        # http://localhost:5174
```

Vite proxies `/api` and `/media` to the API at `http://localhost:4000`. The marketplace is expected on `http://localhost:5173` for "View on marketplace" and chat links.

## Build

```bash
npm run build      # type-check + production build into dist/
```

## Configuration

| Variable | Purpose |
| --- | --- |
| `VITE_API_URL` | Origin of the SureGad API. Empty means same origin (the dev proxy). |
| `VITE_BASE_PATH` | Path the site is served from. `/` locally; the Pages workflow sets `/<repo-name>/`. |
| `VITE_MARKETPLACE_URL` | The buyer marketplace, for "View on marketplace" and buyer-chat links. |

## GitHub Pages

`.github/workflows/deploy-pages.yml` builds and publishes on every push to `main`, using `https://suregad-backend.onrender.com` as the API unless the `VITE_API_URL` repository variable says otherwise.

One-time setup: **Settings → Pages → Build and deployment → Source: GitHub Actions**.

The panel is served at `https://<user>.github.io/<repo-name>/`. Because the marketplace is on the same `github.io` origin, a seller signed in here is also signed in when they open their buyer chats in the marketplace.
