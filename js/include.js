// Simple client-side include loader
// Usage: <include src="/partials/nav.html"></include>
document.addEventListener('DOMContentLoaded', () => {
  const includes = Array.from(document.querySelectorAll('include[src]'));
  includes.forEach(async (placeholder) => {
    const src = placeholder.getAttribute('src');
    if (!src) return;

    try {
      const res = await fetch(src, { cache: 'no-cache' });
      if (!res.ok) throw new Error(`Include fetch failed: ${res.status}`);
      const html = await res.text();

      const wrapper = document.createElement('div');
      wrapper.innerHTML = html;

      const parent = placeholder.parentNode;
      if (!parent) {
        console.warn('Include: placeholder has no parent, skipping', placeholder);
        return;
      }

      // Insert all children before placeholder and track inserted nodes
      const insertedNodes = [];
      while (wrapper.firstChild) {
        const node = wrapper.firstChild;
        parent.insertBefore(node, placeholder);
        insertedNodes.push(node);
      }

      // Execute any scripts that came with the inserted fragment (only those nodes)
      insertedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          if (node.tagName === 'SCRIPT') {
            const oldScript = node;
            const script = document.createElement('script');
            if (oldScript.src) script.src = oldScript.src;
            script.async = false;
            script.textContent = oldScript.textContent;
            oldScript.parentNode.replaceChild(script, oldScript);
          }

          const scripts = node.querySelectorAll('script');
          scripts.forEach((oldScript) => {
            const script = document.createElement('script');
            if (oldScript.src) script.src = oldScript.src;
            script.async = false;
            script.textContent = oldScript.textContent;
            oldScript.parentNode.replaceChild(script, oldScript);
          });
        }
      });

      // Initialize Alpine on the newly inserted nodes, if Alpine is present
      if (window.Alpine && typeof window.Alpine.initTree === 'function') {
        const appNavs = [];
        insertedNodes.forEach((node) => {
          if (node.nodeType !== Node.ELEMENT_NODE) return;
          if (node.classList && node.classList.contains('app-nav')) appNavs.push(node);
          appNavs.push(...Array.from(node.querySelectorAll('.app-nav')));
        });
        appNavs.forEach((el) => window.Alpine.initTree(el));
      }

      // Finally remove the placeholder
      placeholder.remove();
    } catch (e) {
      console.error('Include error:', e);
    }
  });
});
