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

## Wire Lead Notifications to Your Google Workspace Email ($0)

1. Go to [web3forms.com](https://web3forms.com) and enter your Google Workspace email to get a free Access Key.
2. Paste that key into `web3FormsAccessKey` at the top of `script.js`, commit, and push—every lead submission will arrive directly in your Workspace inbox.
