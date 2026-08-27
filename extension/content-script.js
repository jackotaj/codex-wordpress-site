// Sarah never enters credentials, edits CRM fields, or clicks VinSolutions' Send button.
// Configurable selectors are used only when a dealership administrator has verified them.
(() => {
  const PANEL_ID = "sarah-connector-panel";
  let captureTimer;
  let lastFingerprint = "";

  function storageGet(keys) {
    return new Promise((resolve) => chrome.storage.local.get(keys, resolve));
  }

  function send(message) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) resolve({ ok: false, error: chrome.runtime.lastError.message, actions: [] });
        else resolve(response || { ok: false, error: "No response from Sarah connector.", actions: [] });
      });
    });
  }

  function field(selector) {
    if (!selector) return "";
    try {
      const element = document.querySelector(selector);
      if (!element) return "";
      return String(element.value || element.getAttribute("data-value") || element.textContent || "").trim();
    } catch {
      return "";
    }
  }

  function customerIdFromUrl() {
    const parameters = new URL(location.href).searchParams;
    for (const key of ["customerId", "CustomerId", "contactId", "ContactId"]) {
      const value = parameters.get(key)?.trim();
      if (value) return value;
    }
    return "";
  }

  function splitName(fullName) {
    const parts = fullName.split(/\s+/).filter(Boolean);
    if (parts.length < 2) return { firstName: "", lastName: "" };
    return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
  }

  function eventId(customerId) {
    const minute = Math.floor(Date.now() / 60000);
    return `vinsolutions-view:${customerId}:${location.pathname}:${minute}`;
  }

  async function context() {
    const configuration = await storageGet([
      "customerIdSelector",
      "customerNameSelector",
      "vehicleSelector",
      "leadSourceSelector",
      "statusSelector",
    ]);
    const customerId = field(configuration.customerIdSelector || "[data-customer-id]") || customerIdFromUrl();
    const fullName = field(configuration.customerNameSelector || "[data-customer-name]");
    const { firstName, lastName } = splitName(fullName);
    return {
      customerId,
      firstName,
      lastName,
      vehicle: field(configuration.vehicleSelector),
      leadSource: field(configuration.leadSourceSelector),
      status: field(configuration.statusSelector),
      pageUrl: location.href,
      capturedAt: new Date().toISOString(),
      eventId: eventId(customerId || "unknown"),
    };
  }

  function removePanel() {
    document.getElementById(PANEL_ID)?.remove();
  }

  function renderActions(actions, customerId) {
    removePanel();
    if (!actions?.length) return;
    const host = document.createElement("aside");
    host.id = PANEL_ID;
    host.style.cssText = "position:fixed;right:18px;bottom:18px;z-index:2147483647";
    const shadow = host.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = `*{box-sizing:border-box}section{width:350px;padding:16px;border:1px solid #cdded8;border-radius:14px;background:#fff;color:#16362e;box-shadow:0 20px 55px rgba(9,43,35,.24);font:13px/1.4 system-ui,sans-serif}header{display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:12px}header strong{font-size:15px}header span{color:#537068}article{padding:12px;border-radius:10px;background:#eff8f4}article>span{font-size:10px;font-weight:800;letter-spacing:.12em;color:#27836b}p{white-space:pre-wrap;margin:8px 0 12px;color:#263d37}footer{display:flex;gap:8px}button{height:34px;padding:0 12px;border:1px solid #bfd4cd;border-radius:8px;background:#fff;color:#173b31;font:inherit;font-weight:750;cursor:pointer}button.primary{border-color:#173b31;background:#173b31;color:#fff}button:disabled{opacity:.5;cursor:not-allowed}.message{margin:8px 0 0;color:#9b3a2b;font-weight:700}`;
    const section = document.createElement("section");
    const heading = document.createElement("header");
    heading.innerHTML = `<strong>Sarah approved draft</strong><span>${actions.length} pending</span>`;
    const article = document.createElement("article");
    const channel = document.createElement("span");
    channel.textContent = `${actions[0].channel} · approved by ${actions[0].approvedBy}`;
    const body = document.createElement("p");
    body.textContent = actions[0].body;
    const footer = document.createElement("footer");
    const copy = document.createElement("button");
    copy.className = "primary";
    copy.textContent = "Copy draft";
    const complete = document.createElement("button");
    complete.textContent = "Mark sent";
    complete.disabled = true;
    const message = document.createElement("div");
    message.className = "message";
    copy.addEventListener("click", async () => {
      await navigator.clipboard.writeText(actions[0].body);
      copy.textContent = "Copied";
      complete.disabled = false;
    });
    complete.addEventListener("click", async () => {
      if (!window.confirm("Confirm that you sent this draft in VinSolutions.")) return;
      complete.disabled = true;
      complete.textContent = "Recording…";
      const result = await send({ type: "COMPLETE_ACTION", actionId: actions[0].actionId, outcome: "SENT" });
      if (result?.status === "SENT") {
        const next = await send({ type: "GET_PENDING_ACTIONS", customerId });
        renderActions(next.actions || [], customerId);
      } else {
        message.textContent = result?.error || "Sarah could not record the send.";
        complete.disabled = false;
        complete.textContent = "Mark sent";
      }
    });
    footer.append(copy, complete);
    article.append(channel, body, footer, message);
    section.append(heading, article);
    shadow.append(style, section);
    document.documentElement.append(host);
  }

  async function capture() {
    const current = await context();
    const fingerprint = [current.eventId, current.firstName, current.lastName, current.vehicle, current.status].join("|");
    if (fingerprint === lastFingerprint) return;
    lastFingerprint = fingerprint;
    const result = await send({ type: "SARAH_CONTEXT", context: current });
    if (result?.ok) renderActions(result.actions || [], current.customerId);
  }

  function scheduleCapture() {
    clearTimeout(captureTimer);
    captureTimer = setTimeout(capture, 500);
  }

  for (const method of ["pushState", "replaceState"]) {
    const original = history[method];
    history[method] = function (...args) {
      const result = original.apply(this, args);
      scheduleCapture();
      return result;
    };
  }
  window.addEventListener("popstate", scheduleCapture);
  new MutationObserver(scheduleCapture).observe(document.documentElement, { childList: true, subtree: true });
  scheduleCapture();
})();
