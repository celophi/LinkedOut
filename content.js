// content.js
(function(){
  'use strict';

  // CSS class used in LinkedIn sample indicating suggestion label
  const SUGGESTED_CLASS = 'update-components-header__text-view';

  // Attempts to find the nearest top-level post container for a matched node.
  function findPostContainer(node) {
    let el = node;
    // Walk up to a reasonable depth looking for the feed-shared-update-v2 container
    for (let i = 0; i < 12 && el; i++) {
      if (el.classList && (
        el.classList.contains('feed-shared-update-v2') ||
        el.classList.contains('relative') ||
        el.classList.contains('update-components-header') ||
        el.getAttribute && el.getAttribute('data-id')
      )) {
        // Prefer the larger wrapper if present
        // Walk further up to the main post wrapper
        let candidate = el.closest('.feed-shared-update-v2') || el.closest('[data-id]') || el;
        return candidate;
      }
      el = el.parentElement;
    }
    // fallback: the nearest article or div containing the node
    return node.closest('article') || node.closest('div') || node;
  }

  function removeNode(postRoot) {
    if (!postRoot) return;
    // Avoid trying to remove same node multiple times
    if (postRoot.dataset.__suggestedRemoved) return;
    postRoot.dataset.__suggestedRemoved = '1';
    try {
      postRoot.remove();
    } catch (e) {
      // fallback: hide if remove fails
      postRoot.style.display = 'none';
    }
  }

  function processNode(node) {
    if (!node) return;
    // Ignore text nodes
    if (node.nodeType === Node.TEXT_NODE) return;
    const spans = [];
    // If node is an Element (or has classList), check it directly
    if (node.nodeType === Node.ELEMENT_NODE && node.classList && node.classList.contains(SUGGESTED_CLASS)) {
      spans.push(node);
    }
    // If node supports querySelectorAll (Element, Document, DocumentFragment), use it
    if (typeof node.querySelectorAll === 'function') {
      try {
        spans.push(...Array.from(node.querySelectorAll('.' + SUGGESTED_CLASS)));
      } catch (e) {
        // ignore malformed selectors or other issues
      }
    }

    for (const span of spans) {
      const text = span.textContent && span.textContent.trim();
      if (!text) continue;
      if (/^Suggested$/i.test(text)) {
        const post = findPostContainer(span);
        if (post) removeNode(post);
      }
    }
  }

  // Initial scan
  function scanAll() {
    try {
      const elements = document.querySelectorAll('.' + SUGGESTED_CLASS);
      elements.forEach(el => processNode(el));
    } catch (e) {
      // ignore
    }
  }

  // Wrapper to only run behavior when enabled
  let enabled = true;

  function startBehavior() {
    scanAll();
    observer.observe(document.documentElement || document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  function stopBehavior() {
    try { observer.disconnect(); } catch (e) {}
  }

  // Observe mutations to catch infinite-scroll content
  const observer = new MutationObserver(mutations => {
    for (const m of mutations) {
      if (m.type === 'childList') {
        m.addedNodes.forEach(node => processNode(node));
      } else if (m.type === 'characterData') {
        processNode(m.target.parentElement || m.target);
      }
    }
  });

  function start() {
    // read setting from storage (if available). default = true
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get({ enabled: true }, (items) => {
        enabled = items.enabled !== false;
        if (enabled) startBehavior();
      });
    } else {
      // no storage API available - default enabled
      enabled = true;
      startBehavior();
    }
  }

  // Try to start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }

  // Listen for toggle messages from popup
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((msg, sender, sendResp) => {
      if (msg && msg.type === 'enabled-changed') {
        enabled = !!msg.enabled;
        stopBehavior(); // always stop first
        if (enabled) {
          startBehavior(); // re-scan and observe if enabled
        }
      }
    });
  }

})();
