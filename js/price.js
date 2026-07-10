import Alpine from 'https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/+esm';

/* ==========================================================================
   Price list — Alpine.js component
   ========================================================================== */

function todayKey() {
  const now = new Date();
  return toDateKey(now.getFullYear(), now.getMonth(), now.getDate());
}

function splitCsvLine(line, delimiter = ',') {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  result.push(current.trim());
  return result;
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
  },
  importForm: {
    rawText: '',
    delimiter: ';',
    mode: 'nameSku',
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
    this.productForm = { name: '', sku: '' };
    this.$refs.productDialog.showModal();
  },

  openImportDialog() {
    this.importForm = {
      rawText: '',
      delimiter: ';',
      mode: 'nameSku',
    };
    this.$refs.importDialog.showModal();
  },

  async processImport() {
    this.errorMessage = '';
    const rawText = String(this.importForm.rawText || '').trim();
    if (!rawText) {
      this.errorMessage = 'Будь ласка, вставте дані для імпорту.';
      return;
    }

    const delimiter = String(this.importForm.delimiter || ';') || ';';
    const mode = this.importForm.mode;
    const lines = rawText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const parsedRows = lines.map((line) => {
      const columns = mode === 'csv'
        ? splitCsvLine(line, delimiter)
        : line.split(delimiter).map((value) => value.trim());

      const row = { name: '', sku: '' };
      if (mode === 'skuName') {
        row.sku = columns[0] || '';
        row.name = columns[1] || '';
      } else {
        row.name = columns[0] || '';
        row.sku = columns[1] || '';
      }

      return row;
    }).filter((item) => item.name);

    if (parsedRows.length === 0) {
      this.errorMessage = 'Не знайдено жодного валідного товару для імпорту.';
      return;
    }

    this.loading = true;
    try {
      const importedProducts = [];
      for (const row of parsedRows) {
        const created = await productRepository.createProduct(row);
        importedProducts.push(created);
      }
      this.products = [...importedProducts, ...this.products.filter((item) => !importedProducts.some((newItem) => newItem.id === item.id))];
      if (importedProducts.length > 0) {
        await this.selectProduct(importedProducts[0].id, 'details');
      }
      this.$refs.importDialog.close();
    } catch (e) {
      console.warn('Import failed', e);
      this.errorMessage = 'Помилка імпорту товарів. Спробуйте ще раз.';
    } finally {
      this.loading = false;
    }
  },

  async createProduct() {
    const name = this.productForm.name.trim();
    if (!name) return;

    const product = await productRepository.createProduct(this.productForm);
    this.products = [product, ...this.products.filter((item) => item.id !== product.id)];
    this.$refs.productDialog.close();
    await this.selectProduct(product.id, 'details');
  },

  async deleteProduct(productId) {
    if (!productId) return;

    const confirmed = window.confirm('Впевнені, що хочете видалити цей товар та всю історію?');
    if (!confirmed) return;

    this.loading = true;
    this.errorMessage = '';

    try {
      await productRepository.deleteProduct(productId);
      this.products = this.products.filter((product) => product.id !== productId);

      if (this.selectedProductId === productId) {
        this.selectedProductId = this.products.length > 0 ? this.products[0].id : null;
        this.selectedHistory = this.selectedProductId
          ? await productRepository.listHistory(this.selectedProductId)
          : [];
      }
    } catch (e) {
      console.warn('Product delete failed', e);
      this.errorMessage = 'Не вдалося видалити товар. Спробуйте ще раз.';
    } finally {
      this.loading = false;
    }
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
