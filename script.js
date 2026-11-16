/**
 * Cherry City Home Buyers — Interactive Address Autocomplete & 6-Step Offer Wizard
 *
 * Lead Delivery Setup ($0):
 * 1. Set customWebhookUrl to your CRM's public HTTPS webhook endpoint:
 *    e.g. "https://<your-crm-domain-or-cloudflare-tunnel>/api/webhooks/website-lead"
 *    (Run `cloudflared tunnel --url http://127.0.0.1:8000` on Windows or host CRM on Render/Railway.)
 * 2. Optional backup: paste a free Web3Forms key (https://web3forms.com) into web3FormsAccessKey
 *    to also send every inquiry directly to your Google Workspace inbox.
 *    Both channels run simultaneously when configured.
 */
const SITE_CONFIG = {
  web3FormsAccessKey: "",
  customWebhookUrl: "",
  fallbackContactEmail: "joe@cherrycityhomebuyersllc.org"
};

document.addEventListener("DOMContentLoaded", () => {
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  // Mobile Menu Toggle
  const mobileBtn = document.getElementById("mobileMenuBtn");
  const mainNav = document.getElementById("mainNav");
  if (mobileBtn && mainNav) {
    mobileBtn.addEventListener("click", () => {
      const isOpen = mainNav.classList.toggle("open");
      mobileBtn.setAttribute("aria-expanded", String(isOpen));
    });
    mainNav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => mainNav.classList.remove("open"));
    });
  }

  // Phone Input Masking
  document.querySelectorAll(".js-phone-mask").forEach((input) => {
    input.addEventListener("input", (e) => {
      const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
      if (digits.length >= 7) {
        e.target.value = `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
      } else if (digits.length >= 4) {
        e.target.value = `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
      } else if (digits.length > 0) {
        e.target.value = `(${digits}`;
      }
    });
  });

  // Capture UTM / Ad Attribution Parameters automatically
  const urlParams = new URLSearchParams(window.location.search);
  const attribution = {
    utm_source: urlParams.get("utm_source") || "",
    utm_medium: urlParams.get("utm_medium") || "",
    utm_campaign: urlParams.get("utm_campaign") || "",
    gclid: urlParams.get("gclid") || ""
  };

  // Optional session override for testing live Cloudflare Quick Tunnels (?crm_webhook=https://...)
  const queryWebhook = (urlParams.get("crm_webhook") || "").trim();
  const activeWebhookUrl =
    /^https:\/\/.+/i.test(queryWebhook) || /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?\//i.test(queryWebhook)
      ? queryWebhook
      : SITE_CONFIG.customWebhookUrl;

  // Live US Street Address Autocomplete (Photon / OpenStreetMap — Free, Zero API Key Required)
  function attachAutocomplete(input) {
    const list = input.parentElement.querySelector(".autocomplete-list");
    if (!list) return;
    let debounceTimer = null;

    input.addEventListener("input", () => {
      const q = input.value.trim();
      clearTimeout(debounceTimer);
      if (q.length < 4) {
        list.hidden = true;
        list.innerHTML = "";
        return;
      }
      debounceTimer = setTimeout(async () => {
        try {
          // Biased toward Oregon (44.9429, -123.0351 = Salem, OR) while supporting all US addresses
          const res = await fetch(
            `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&lat=44.9429&lon=-123.0351&limit=5&lang=en`
          );
          if (!res.ok) return;
          const data = await res.json();
          const features = (data.features || []).filter(
            (f) => f.properties && f.properties.countrycode === "US"
          );
          if (!features.length) {
            list.hidden = true;
            return;
          }
          list.innerHTML = "";
          features.forEach((f) => {
            const p = f.properties;
            const streetPart = [p.housenumber, p.street || p.name].filter(Boolean).join(" ");
            const formatted = [streetPart, p.city, p.state, p.postcode].filter(Boolean).join(", ");
            if (!formatted) return;
            const li = document.createElement("li");
            li.setAttribute("role", "option");
            li.textContent = formatted;
            li.addEventListener("mousedown", (ev) => {
              ev.preventDefault();
              input.value = formatted;
              list.hidden = true;
            });
            list.appendChild(li);
          });
          list.hidden = list.children.length === 0;
        } catch (_) {
          list.hidden = true;
        }
      }, 260);
    });

    input.addEventListener("blur", () => {
      setTimeout(() => {
        list.hidden = true;
      }, 180);
    });
  }

  document.querySelectorAll(".js-address-autocomplete").forEach(attachAutocomplete);

  // Shared Lead Submission Dispatcher (Concurrent CRM Webhook + Email Backup)
  async function submitLeadPayload(payload) {
    const fullPayload = {
      ...payload,
      ...attribution,
      submitted_at: new Date().toISOString()
    };

    const requests = [];

    if (activeWebhookUrl) {
      requests.push(
        fetch(activeWebhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(fullPayload)
        }).then((res) => {
          if (!res.ok) throw new Error(`CRM webhook returned HTTP ${res.status}`);
          return res.json().catch(() => ({}));
        })
      );
    }

    if (SITE_CONFIG.web3FormsAccessKey) {
      requests.push(
        fetch("https://api.web3forms.com/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({
            access_key: SITE_CONFIG.web3FormsAccessKey,
            subject: `New Cash Offer Inquiry: ${fullPayload.property_address}`,
            from_name: "Cherry City Home Buyers Website",
            ...fullPayload
          })
        }).then((res) => {
          if (!res.ok) throw new Error(`Web3Forms returned HTTP ${res.status}`);
          return res.json().catch(() => ({}));
        })
      );
    }

    if (requests.length > 0) {
      const results = await Promise.allSettled(requests);
      const anySucceeded = results.some((r) => r.status === "fulfilled");
      if (!anySucceeded) {
        const firstErr = results.find((r) => r.status === "rejected");
        throw new Error(firstErr?.reason?.message || "Lead delivery failed");
      }
      return;
    }

    if (SITE_CONFIG.fallbackContactEmail) {
      const subject = encodeURIComponent(`Cash Offer Inquiry: ${fullPayload.property_address}`);
      const lines = Object.entries(fullPayload)
        .filter(([, v]) => v)
        .map(([k, v]) => `${k}: ${v}`)
        .join("\n");
      window.location.href = `mailto:${SITE_CONFIG.fallbackContactEmail}?subject=${subject}&body=${encodeURIComponent(lines)}`;
    }
  }

  // =========================================================================
  // 6-STEP MULTI-STEP OFFER WIZARD LOGIC (Homepage)
  // =========================================================================
  const modal = document.getElementById("offerWizardModal");
  if (modal) {
    const backBtn = document.getElementById("wizardBackBtn");
    const closeBtn = document.getElementById("wizardCloseBtn");
    const doneBtn = document.getElementById("wizardDoneBtn");
    const stepLabel = document.getElementById("wizardStepLabel");
    const progressFill = document.getElementById("wizardProgressFill");
    const addrText = document.getElementById("wizardAddressText");
    const confirmAddrText = document.getElementById("confirmAddrText");
    const modalAddressInput = document.getElementById("modalAddressInput");
    const modalAddressContinueBtn = document.getElementById("modalAddressContinueBtn");
    const finalForm = document.getElementById("wizardFinalForm");
    const wizStatus = document.getElementById("wizFormStatus");
    const wizSubmitBtn = document.getElementById("wizSubmitBtn");

    const wizardData = {
      property_address: "",
      property_type: "",
      reason: "",
      timeline: "",
      condition: "",
      listed_with_agent: ""
    };

    let currentStep = 1;

    function renderStep(step) {
      currentStep = step;
      modal.querySelectorAll(".wizard-step").forEach((el) => {
        el.hidden = Number(el.dataset.step) !== step;
      });

      if (step === 0) {
        backBtn.hidden = true;
        stepLabel.textContent = "Property Address";
        progressFill.style.width = "10%";
      } else if (step >= 1 && step <= 6) {
        backBtn.hidden = step === 1;
        stepLabel.textContent = `Step ${step} of 6`;
        progressFill.style.width = `${Math.round((step / 6) * 100)}%`;
      } else {
        backBtn.hidden = true;
        stepLabel.textContent = "Complete";
        progressFill.style.width = "100%";
      }

      addrText.textContent = wizardData.property_address || "Entering property location...";
    }

    function openWizard(addressValue) {
      const cleanAddr = (addressValue || "").trim();
      wizardData.property_address = cleanAddr;
      modal.hidden = false;
      document.body.style.overflow = "hidden";
      if (cleanAddr) {
        renderStep(1);
      } else {
        if (modalAddressInput) modalAddressInput.value = "";
        renderStep(0);
        setTimeout(() => modalAddressInput && modalAddressInput.focus(), 50);
      }
    }

    function closeWizard() {
      modal.hidden = true;
      document.body.style.overflow = "";
    }

    // Trigger from all 3 Homepage Address Forms
    document.querySelectorAll(".js-address-trigger").forEach((formEl) => {
      formEl.addEventListener("submit", (e) => {
        e.preventDefault();
        const input = formEl.querySelector("input[name='property_address']");
        const val = input ? input.value.trim() : "";
        if (!val) {
          input && input.focus();
          return;
        }
        openWizard(val);
      });
    });

    // Trigger from Section CTA Buttons
    document.querySelectorAll(".js-open-modal").forEach((btn) => {
      btn.addEventListener("click", () => openWizard(wizardData.property_address));
    });

    // Trigger from Service Area City Pills
    document.querySelectorAll(".js-city-pick").forEach((pill) => {
      pill.addEventListener("click", () => {
        const city = pill.dataset.city || "";
        openWizard("");
        if (modalAddressInput && city) {
          modalAddressInput.placeholder = `Street address in ${city}...`;
          modalAddressInput.value = `, ${city}`;
          modalAddressInput.setSelectionRange(0, 0);
          modalAddressInput.focus();
        }
      });
    });

    if (modalAddressContinueBtn) {
      modalAddressContinueBtn.addEventListener("click", () => {
        const val = (modalAddressInput.value || "").trim();
        if (!val || val.startsWith(",")) {
          modalAddressInput.focus();
          return;
        }
        wizardData.property_address = val;
        renderStep(1);
      });
    }

    // Choice Cards Auto-Advance (Steps 1 to 5)
    modal.querySelectorAll(".choice-card").forEach((card) => {
      card.addEventListener("click", () => {
        const field = card.dataset.field;
        const value = card.dataset.value;
        if (field) wizardData[field] = value;

        card.parentElement.querySelectorAll(".choice-card").forEach((c) => c.classList.remove("selected"));
        card.classList.add("selected");

        setTimeout(() => {
          renderStep(currentStep + 1);
        }, 140);
      });
    });

    backBtn.addEventListener("click", () => {
      if (currentStep > 1) renderStep(currentStep - 1);
    });

    closeBtn.addEventListener("click", closeWizard);
    if (doneBtn) doneBtn.addEventListener("click", closeWizard);

    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeWizard();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !modal.hidden) closeWizard();
    });

    // Final Step 6 Submission
    if (finalForm) {
      finalForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        wizStatus.className = "form-status";
        wizStatus.textContent = "";

        const fd = new FormData(finalForm);
        const fullName = (fd.get("full_name") || "").toString().trim();
        const email = (fd.get("email") || "").toString().trim();
        const phone = (fd.get("phone") || "").toString().trim();

        if (!fullName || !email || !phone) {
          wizStatus.classList.add("error");
          wizStatus.textContent = "Please enter your full name, email, and phone number.";
          return;
        }

        wizSubmitBtn.disabled = true;
        wizSubmitBtn.textContent = "Submitting...";

        try {
          await submitLeadPayload({
            ...wizardData,
            full_name: fullName,
            email,
            phone,
            sms_consent: fd.get("sms_consent") === "yes" ? "Opted In" : "Not Checked",
            source_form: "6-Step Homepage Wizard"
          });
          if (confirmAddrText) confirmAddrText.textContent = wizardData.property_address || "your property";
          finalForm.reset();
          renderStep(7);
        } catch (_) {
          wizStatus.classList.add("error");
          wizStatus.textContent = "Could not submit right now. Please try again in a moment.";
        } finally {
          wizSubmitBtn.disabled = false;
          wizSubmitBtn.textContent = "GET MY CASH OFFER";
        }
      });
    }
  }

  // =========================================================================
  // STANDALONE /get-offer.html DIRECT FORM
  // =========================================================================
  const directForm = document.getElementById("directOfferForm");
  if (directForm) {
    const dirStatus = document.getElementById("dirFormStatus");
    const dirBtn = document.getElementById("dirSubmitBtn");

    directForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      dirStatus.className = "form-status";
      dirStatus.textContent = "";

      const fd = new FormData(directForm);
      const fullName = (fd.get("full_name") || "").toString().trim();
      const propertyAddress = (fd.get("property_address") || "").toString().trim();
      const phone = (fd.get("phone") || "").toString().trim();
      const email = (fd.get("email") || "").toString().trim();

      if (!fullName || !propertyAddress || !phone || !email) {
        dirStatus.classList.add("error");
        dirStatus.textContent = "Please complete your name, property address, phone, and email.";
        return;
      }

      dirBtn.disabled = true;
      dirBtn.textContent = "Submitting...";

      try {
        await submitLeadPayload({
          full_name: fullName,
          property_address: propertyAddress,
          phone,
          email,
          reason: (fd.get("reason") || "").toString(),
          asking_price: (fd.get("asking_price") || "").toString().trim(),
          sms_consent: fd.get("sms_consent") === "yes" ? "Opted In" : "Not Checked",
          source_form: "Direct Get-Offer Page"
        });
        dirStatus.classList.add("success");
        dirStatus.textContent = "Thank you! Your property details have been received—our team will follow up shortly.";
        directForm.reset();
      } catch (_) {
        dirStatus.classList.add("error");
        dirStatus.textContent = "Something went wrong submitting your request. Please try again.";
      } finally {
        dirBtn.disabled = false;
        dirBtn.textContent = "GET MY CASH OFFER";
      }
    });
  }
});
