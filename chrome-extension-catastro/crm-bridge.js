// Content script que solo se ejecuta en el CRM de TPL (ver manifest.json).
// Recibe los datos capturados desde popup.js vía chrome.runtime.onMessage
// y los reenvía a la página del CRM como un CustomEvent, que
// modules/catastro/index.js escucha para reutilizar su propio flujo de
// revisión y guardado (el mismo que usa el bookmarklet).
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || message.type !== 'TPL_EXTENSION_CATASTRO_DATA') return;
  window.dispatchEvent(new CustomEvent('tpl-extension-catastro-data', { detail: message.payload }));
  sendResponse({ ok: true });
});
