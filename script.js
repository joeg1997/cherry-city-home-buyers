/**
 * Cherry City Home Buyers — Lead Capture Configuration
 *
 * Option A (Recommended, Free): Paste a Web3Forms Access Key (https://web3forms.com)
 *   to send submissions directly to your Google Workspace inbox with zero backend.
 * Option B: Paste a Formspree or Google Apps Script Web App URL in CUSTOM_WEBHOOK_URL.
 */
const SITE_CONFIG = {
  web3FormsAccessKey: "", // Paste your free Web3Forms key here once ready
  customWebhookUrl: "",   // Optional: Formspree / Apps Script / CRM webhook URL
  fallbackContactEmail: "" // Optional: e.g. "info@yourdomain.com"
};

document.addEventListener("DOMContentLoaded", () => {
  const yearEl = document.getElementById("year");
  if (yearEl) {
    yearEl.textContent = String(new Date().getFullYear());
  }

  const phoneInput = document.getElementById("phone");
  if (phoneInput) {
    phoneInput.addEventListener("input", (e) => {
      const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
      if (digits.length >= 7) {
        e.target.value = `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
      } else if (digits.length >= 4) {
        e.target.value = `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
      } else if (digits.length > 0) {
        e.target.value = `(${digits}`;
      }
    });
  }

  const form = document.getElementById("leadForm");
  const statusEl = document.getElementById("formStatus");
  const submitBtn = document.getElementById("submitBtn");

  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    statusEl.className = "form-status";
    statusEl.textContent = "";

    const formData = new FormData(form);
    const fullName = (formData.get("full_name") || "").toString().trim();
    const phone = (formData.get("phone") || "").toString().trim();
    const email = (formData.get("email") || "").toString().trim();
    const propertyAddress = (formData.get("property_address") || "").toString().trim();

    if (!fullName || !phone || !email || !propertyAddress) {
      statusEl.classList.add("error");
      statusEl.textContent = "Please complete your name, phone, email, and property address.";
      return;
    }

    const payload = {
      full_name: fullName,
      phone,
      email,
      property_address: propertyAddress,
      situation: (formData.get("situation") || "").toString(),
      timeline: (formData.get("timeline") || "").toString(),
      notes: (formData.get("notes") || "").toString().trim(),
      sms_consent: formData.get("sms_consent") === "yes" ? "Opted In" : "Not Checked",
      submitted_at: new Date().toISOString()
    };

    submitBtn.disabled = true;
    const originalLabel = submitBtn.textContent;
    submitBtn.textContent = "Submitting...";

    try {
      if (SITE_CONFIG.web3FormsAccessKey) {
        const res = await fetch("https://api.web3forms.com/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({
            access_key: SITE_CONFIG.web3FormsAccessKey,
            subject: `New Property Inquiry: ${propertyAddress}`,
            from_name: "Cherry City Home Buyers Website",
            ...payload
          })
        });
        if (!res.ok) throw new Error("Submission failed");
      } else if (SITE_CONFIG.customWebhookUrl) {
        const res = await fetch(SITE_CONFIG.customWebhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error("Webhook submission failed");
      } else if (SITE_CONFIG.fallbackContactEmail) {
        const subject = encodeURIComponent(`Property Inquiry: ${propertyAddress}`);
        const body = encodeURIComponent(
          `Name: ${payload.full_name}\nPhone: ${payload.phone}\nEmail: ${payload.email}\nProperty: ${payload.property_address}\nSituation: ${payload.situation}\nTimeline: ${payload.timeline}\nSMS Consent: ${payload.sms_consent}\nNotes: ${payload.notes}`
        );
        window.location.href = `mailto:${SITE_CONFIG.fallbackContactEmail}?subject=${subject}&body=${body}`;
      }

      statusEl.classList.add("success");
      statusEl.textContent = "Thank you! Your property details have been received—our team will be in touch shortly.";
      form.reset();
    } catch (err) {
      statusEl.classList.add("error");
      statusEl.textContent = "Something went wrong submitting the form. Please try again in a moment.";
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalLabel;
    }
  });
});
