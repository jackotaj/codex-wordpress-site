// This bridge deliberately captures page context without automating credentials.
// Site-specific selectors remain isolated here and never enter the intelligence layer.
const emitContext = () => {
  const customerId = new URL(location.href).searchParams.get("customerId");
  if (customerId) chrome.runtime.sendMessage({ type: "CUSTOMER_VIEWED", customerId, pageUrl: location.href, capturedAt: new Date().toISOString() });
};

emitContext();
window.addEventListener("popstate", emitContext);
