import Alpine from 'https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/+esm';

/* ==========================================================================
   Price list — Alpine.js component
   ========================================================================== */

function todayKey() {
  const now = new Date();
  return toDateKey(now.getFullYear(), now.getMonth(), now.getDate());
}

const productRepository = window.ProductRepository;

Alpine.data('priceList', () => ({
  products: [],
  selectedProductId: null,
  selectedHistory: [],
  search: '',
  sortKey: 'name',
  sortDir: 'asc',
  activeTab: 'details',
  loading: true,
  errorMessage: '',
  productForm: {
    name: '',
    sku: '',
    unit: '',
  },
  purchaseForm: {
    productId: '',
    purchase_date: todayKey(),
    purchase_cost: '',
    selling_price: '',
    comment: '',
  },

  async init() {
    await this.loadProducts();
  },

  get selectedProduct() {
    return this.products.find((product) => product.id === this.selectedProductId) || null;
  },

  get filteredProducts() {
    const q = this.search.trim().toLowerCase();
    const rows = q
      ? this.products.filter((product) => product.name.toLowerCase().includes(q))
      : [...this.products];

    return rows.sort((a, b) => this.compareProducts(a, b));
  },

  get historyRows() {
    return [...this.selectedHistory].sort((a, b) => parseDate(b.purchase_date) - parseDate(a.purchase_date));
  },

  compareProducts(a, b) {
    const direction = this.sortDir === 'asc' ? 1 : -1;
    const left = this.sortValue(a, this.sortKey);
    const right = this.sortValue(b, this.sortKey);

    if (left < right) return -1 * direction;
    if (left > right) return 1 * direction;
    return a.name.localeCompare(b.name, DEFAULT_DATE_LOCALE) * direction;
  },

  sortValue(product, key) {
    if (key === 'current_cost' || key === 'current_price') return Number(product[key]) || 0;
    if (key === 'updated_at') return parseDate(product.updated_at).getTime();
    return String(product[key] || '').toLowerCase();
  },

  sortBy(key) {
    if (this.sortKey === key) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
      return;
    }
    this.sortKey = key;
    this.sortDir = key === 'name' ? 'asc' : 'desc';
  },

  sortMark(key) {
    if (this.sortKey !== key) return '';
    return this.sortDir === 'asc' ? ' ↑' : ' ↓';
  },

  async loadProducts() {
    this.loading = true;
    this.errorMessage = '';
    try {
      this.products = await productRepository.listProducts();
      if (!this.selectedProductId && this.products.length > 0) {
        await this.selectProduct(this.products[0].id, 'details');
      }
    } catch (e) {
      console.warn('Products load failed', e);
      this.errorMessage = 'Не вдалося завантажити товари.';
    } finally {
      this.loading = false;
    }
  },

  openProductDialog() {
    this.productForm = { name: '', sku: '', unit: '' };
    this.$refs.productDialog.showModal();
  },

  async createProduct() {
    const name = this.productForm.name.trim();
    if (!name) return;

    const product = await productRepository.createProduct(this.productForm);
    this.products = [product, ...this.products.filter((item) => item.id !== product.id)];
    this.$refs.productDialog.close();
    await this.selectProduct(product.id, 'details');
  },

  async selectProduct(productId, tab = this.activeTab) {
    this.selectedProductId = productId;
    this.activeTab = tab;
    this.selectedHistory = await productRepository.listHistory(productId);
  },

  openPurchaseDialog(product) {
    this.purchaseForm = {
      productId: product.id,
      purchase_date: todayKey(),
      purchase_cost: product.current_cost || '',
      selling_price: product.current_price || '',
      comment: '',
    };
    this.$refs.purchaseDialog.showModal();
  },

  async addPurchase() {
    const productId = this.purchaseForm.productId;
    if (!productId || !this.purchaseForm.purchase_date) return;

    const result = await productRepository.addPurchase(productId, this.purchaseForm);
    this.products = this.products.map((product) => (
      product.id === productId ? result.product : product
    ));
    this.$refs.purchaseDialog.close();
    await this.selectProduct(productId, 'history');
  },

  formatMoney(value) {
    const number = Number(value) || 0;
    return number.toLocaleString(DEFAULT_DATE_LOCALE, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  },

  formatDate(value) {
    const date = parseDate(value);
    return date.getTime() ? formatDisplayDate(date) : '-';
  },
}));

Alpine.start();
