const SETTINGS_KEYS = ["apiBaseUrl", "connectorSecret"];

function storageGet(keys) {
  return new Promise((resolve) => chrome.storage.local.get(keys, resolve));
}

function storageSet(value) {
  return new Promise((resolve) => chrome.storage.local.set(value, resolve));
}

async function settings() {
  const value = await storageGet(SETTINGS_KEYS);
  return {
    apiBaseUrl: String(value.apiBaseUrl || "").replace(/\/+$/, ""),
    connectorSecret: String(value.connectorSecret || ""),
  };
}

async function apiRequest(path, init = {}) {
  const configuration = await settings();
  if (!configuration.apiBaseUrl || !configuration.connectorSecret) {
    throw new Error("Open the Sarah extension settings and configure the app URL and connector secret.");
  }
  const response = await fetch(`${configuration.apiBaseUrl}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      "x-connector-secret": configuration.connectorSecret,
      ...(init.headers || {}),
    },
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || `Sarah returned HTTP ${response.status}.`);
  return result;
}

async function loadActions(customerId) {
  return apiRequest(`/api/actions?customerId=${encodeURIComponent(customerId)}`);
}

async function captureContext(message, tabId) {
  const captured = { ...message.context, tabId, receivedAt: new Date().toISOString() };
  await storageSet({ lastCustomerContext: captured });
  if (!captured.customerId || !captured.firstName || !captured.lastName) {
    const error = "Customer ID and full name were not identified. Configure the field selectors in Sarah extension settings.";
    await storageSet({ lastConnectorStatus: { ok: false, error, at: new Date().toISOString() } });
    return { ok: false, error, actions: [] };
  }

  const event = {
    eventId: captured.eventId,
    occurredAt: captured.capturedAt,
    source: "VINSOLUTIONS_BROWSER",
    customer: {
      externalId: captured.customerId,
      firstName: captured.firstName,
      lastName: captured.lastName,
    },
    dashboard: {
      ...(captured.vehicle ? { vehicle: captured.vehicle } : {}),
      ...(captured.leadSource ? { leadSource: captured.leadSource } : {}),
      ...(captured.status ? { status: captured.status } : {}),
      vinSolutionsUrl: captured.pageUrl,
    },
    event: {
      type: "CUSTOMER_VIEWED",
      title: "Customer record viewed",
      detail: "Customer record opened in VinSolutions.",
      channel: "CRM",
      timestamp: captured.capturedAt,
    },
  };

  await apiRequest("/api/events", { method: "POST", body: JSON.stringify(event) });
  const actions = await loadActions(captured.customerId);
  await storageSet({ lastConnectorStatus: { ok: true, at: new Date().toISOString(), customerId: captured.customerId } });
  return { ok: true, actions: actions.actions || [], mode: actions.mode };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const run = async () => {
    if (message.type === "SARAH_CONTEXT") return captureContext(message, sender.tab?.id);
    if (message.type === "GET_PENDING_ACTIONS") return loadActions(message.customerId);
    if (message.type === "COMPLETE_ACTION") {
      return apiRequest(`/api/actions/${encodeURIComponent(message.actionId)}/complete`, {
        method: "POST",
        body: JSON.stringify({ outcome: message.outcome, ...(message.failureReason ? { failureReason: message.failureReason } : {}) }),
      });
    }
    if (message.type === "TEST_CONNECTION") {
      await loadActions("configuration-test");
      return { ok: true };
    }
    throw new Error("Unsupported Sarah connector message.");
  };

  run().then(sendResponse).catch(async (cause) => {
    const error = cause instanceof Error ? cause.message : "Sarah connector request failed.";
    await storageSet({ lastConnectorStatus: { ok: false, error, at: new Date().toISOString() } });
    sendResponse({ ok: false, error, actions: [] });
  });
  return true;
});

chrome.action.onClicked.addListener(() => chrome.runtime.openOptionsPage());
