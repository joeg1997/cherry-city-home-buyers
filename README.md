# Cherry City Home Buyers — Official Website

Static landing page, About Us overview, real estate property inquiry form, and carrier-compliant Privacy/Terms pages for **Cherry City Home Buyers**.

## Connect Your Squarespace Domain

1. In GitHub: **Settings → Pages → Custom domain**, enter your Squarespace domain (e.g., `www.yourdomain.com`) and click **Save**.
2. In [Squarespace Domains](https://account.squarespace.com/domains) → **DNS → DNS Settings**:
   - Remove any default Squarespace parking `A` or `CNAME` records.
   - Add a `CNAME` record:
     - **Host:** `www`
     - **Data:** `joeg1997.github.io`
   - Add four `A` records (`Host: @`):
     - `185.199.108.153`
     - `185.199.109.153`
     - `185.199.110.153`
     - `185.199.111.153`
3. Once DNS propagates, return to GitHub **Settings → Pages** and check **Enforce HTTPS**.

## Lead Notifications (Google Sheets + Google Workspace Email + Web3Forms Backup)

Every website inquiry from `index.html` (6-Step Offer Wizard) and `get-offer.html` dispatches concurrently via `SITE_CONFIG` in `script.js`:

1. **Primary ($0, ~45,000/mo capacity):** `SITE_CONFIG.googleScriptUrl` logs every lead row directly into the **Cherry City Website Leads** Google Sheet and sends an instant notification email via Google Workspace to `joe@cherrycityhomebuyersllc.org` (with `Reply-To` set to the seller's email).
2. **Redundant Backup ($0, 250/mo capacity):** `SITE_CONFIG.web3FormsAccessKey` sends a parallel backup notification via [Web3Forms](https://web3forms.com).
3. **Optional Direct CRM Webhook:** Set `SITE_CONFIG.customWebhookUrl` to `https://<your-crm-host>/api/webhooks/website-lead` to also push leads live into **Cherry City CRM**.
