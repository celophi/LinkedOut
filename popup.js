document.addEventListener('DOMContentLoaded', () => {
  const checkbox = document.getElementById('toggle');

  // Initialize state from storage (default true)
  chrome.storage.local.get({ enabled: true }, (items) => {
    checkbox.checked = !!items.enabled;
  });

  // Update storage when toggled
  checkbox.addEventListener('change', () => {
    const enabled = checkbox.checked;
    chrome.storage.local.set({ enabled }, () => {
      // notify all LinkedIn tabs about the change
      chrome.tabs.query({ url: '*://*.linkedin.com/*' }, (tabs) => {
        tabs.forEach(tab => {
          chrome.tabs.sendMessage(tab.id, { type: 'enabled-changed', enabled })
            .catch(() => {}); // ignore errors for tabs without content script
        });
      });
    });
  });
});
