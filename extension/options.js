const fields = ["apiBaseUrl", "connectorSecret", "customerIdSelector", "customerNameSelector", "vehicleSelector", "leadSourceSelector", "statusSelector"];

chrome.storage.local.get(fields, (saved) => {
  for (const id of fields) document.getElementById(id).value = saved[id] || "";
});

function originPermission(value) {
  const url = new URL(value);
  return `${url.origin}/*`;
}

document.getElementById("settings").addEventListener("submit", async (event) => {
  event.preventDefault();
  const status = document.getElementById("status");
  status.className = "";
  status.textContent = "Saving…";
  try {
    const values = Object.fromEntries(fields.map((id) => [id, document.getElementById(id).value.trim()]));
    values.apiBaseUrl = values.apiBaseUrl.replace(/\/+$/, "");
    const granted = await chrome.permissions.request({ origins: [originPermission(values.apiBaseUrl)] });
    if (!granted) throw new Error("Sarah needs permission to reach the configured app URL.");
    await chrome.storage.local.set(values);
    const result = await chrome.runtime.sendMessage({ type: "TEST_CONNECTION" });
    if (!result?.ok) throw new Error(result?.error || "Connection test failed.");
    status.className = "success";
    status.textContent = "Saved. Sarah authenticated with the app successfully.";
  } catch (cause) {
    status.className = "error";
    status.textContent = cause instanceof Error ? cause.message : "Settings were not saved.";
  }
});
