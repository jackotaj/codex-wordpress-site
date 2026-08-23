chrome.runtime.onMessage.addListener((message, sender) => {
  if (message.type !== "CUSTOMER_VIEWED") return;
  chrome.storage.local.set({ lastCustomerContext: { ...message, tabId: sender.tab?.id } });
});
