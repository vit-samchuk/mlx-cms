// Alpine-only navigation data provider
// Usage in HTML:
// <script defer src="js/components/nav-alpine.js"></script>
// <nav x-data="navComponent()">
//   <span class="nav-brand" x-text="brand"></span>
//   <template x-for="l in links" :key="l.href">
//     <a :href="l.href" :aria-current="isCurrent(l.href) ? 'page' : null" x-text="l.label"></a>
//   </template>
// </nav>

window.navComponent = function () {
  return {
    brand: 'Milex',
    links: [
      { href: 'index.html', label: 'Нова пошта' },
      { href: 'production.html', label: 'Виробництво' },
      { href: 'price.html', label: 'Прайс' },
    ],
    isCurrent(href) {
      const current = (location.pathname || '').split('/').pop() || 'index.html';
      return current === href || (current === '' && href === 'index.html');
    },
  };
};
