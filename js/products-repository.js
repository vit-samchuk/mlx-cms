/* ==========================================================================
   Product repository — Supabase with localStorage fallback
   ========================================================================== */

const PRODUCTS_STORAGE_KEY = 'price_products';
const PRODUCT_HISTORY_STORAGE_KEY = 'price_product_history';

function createId() {
  if (window.crypto && typeof window.crypto.randomUUID === 'function') {
    return window.crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeProduct(row) {
  return {
    id: row.id,
    name: typeof row.name === 'string' ? row.name : '',
    sku: typeof row.sku === 'string' ? row.sku : '',
    unit: typeof row.unit === 'string' ? row.unit : '',
    current_cost: normalizeNumber(row.current_cost),
    current_price: normalizeNumber(row.current_price),
    created_at: row.created_at || '',
    updated_at: row.updated_at || '',
  };
}

function normalizeHistory(row) {
  return {
    id: row.id,
    product_id: row.product_id,
    purchase_date: row.purchase_date || '',
    purchase_cost: normalizeNumber(row.purchase_cost),
    selling_price: normalizeNumber(row.selling_price),
    comment: typeof row.comment === 'string' ? row.comment : '',
    created_at: row.created_at || '',
  };
}

function sortByUpdated(products) {
  return [...products].sort((a, b) => parseDate(b.updated_at) - parseDate(a.updated_at));
}

window.ProductRepository = {
  async listProducts() {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabaseClient
          .from('products')
          .select('*')
          .order('updated_at', { ascending: false });
        if (error) throw error;
        return (data || []).map(normalizeProduct);
      } catch (e) {
        console.warn('Supabase products load failed, using localStorage', e);
      }
    }

    return sortByUpdated(Object.values(loadJsonObject(PRODUCTS_STORAGE_KEY)));
  },

  async createProduct(input) {
    const now = new Date().toISOString();
    const product = normalizeProduct({
      id: createId(),
      name: normalizeText(input.name),
      sku: normalizeText(input.sku) || null,
      unit: normalizeText(input.unit) || null,
      current_cost: 0,
      current_price: 0,
      created_at: now,
      updated_at: now,
    });

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabaseClient
          .from('products')
          .insert({
            name: product.name,
            sku: product.sku || null,
            unit: product.unit || null,
            current_cost: product.current_cost,
            current_price: product.current_price,
          })
          .select()
          .single();
        if (error) throw error;
        return normalizeProduct(data);
      } catch (e) {
        console.warn('Supabase product create failed, saving locally', e);
      }
    }

    const products = loadJsonObject(PRODUCTS_STORAGE_KEY);
    products[product.id] = product;
    saveJsonObject(PRODUCTS_STORAGE_KEY, products);
    return product;
  },

  async listHistory(productId) {
    if (!productId) return [];

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabaseClient
          .from('product_cost_history')
          .select('*')
          .eq('product_id', productId)
          .order('purchase_date', { ascending: false })
          .order('created_at', { ascending: false });
        if (error) throw error;
        return (data || []).map(normalizeHistory);
      } catch (e) {
        console.warn('Supabase product history load failed, using localStorage', e);
      }
    }

    return Object.values(loadJsonObject(PRODUCT_HISTORY_STORAGE_KEY))
      .filter((entry) => entry.product_id === productId)
      .map(normalizeHistory)
      .sort((a, b) => parseDate(b.purchase_date) - parseDate(a.purchase_date));
  },

  async addPurchase(productId, input) {
    const now = new Date().toISOString();
    const purchase = normalizeHistory({
      id: createId(),
      product_id: productId,
      purchase_date: input.purchase_date,
      purchase_cost: input.purchase_cost,
      selling_price: input.selling_price,
      comment: normalizeText(input.comment),
      created_at: now,
    });

    if (isSupabaseConfigured()) {
      let remoteHistoryCreated = false;
      try {
        const { error: historyError } = await supabaseClient
          .from('product_cost_history')
          .insert({
            product_id: productId,
            purchase_date: purchase.purchase_date,
            purchase_cost: purchase.purchase_cost,
            selling_price: purchase.selling_price,
            comment: purchase.comment || null,
          });
        if (historyError) throw historyError;
        remoteHistoryCreated = true;

        const { data, error: productError } = await supabaseClient
          .from('products')
          .update({
            current_cost: purchase.purchase_cost,
            current_price: purchase.selling_price,
            updated_at: now,
          })
          .eq('id', productId)
          .select()
          .single();
        if (productError) throw productError;
        return { product: normalizeProduct(data), purchase };
      } catch (e) {
        if (remoteHistoryCreated) throw e;
        console.warn('Supabase purchase save failed, saving locally', e);
      }
    }

    const products = loadJsonObject(PRODUCTS_STORAGE_KEY);
    if (!products[productId]) {
      throw new Error('Product is unavailable in localStorage fallback.');
    }

    const history = loadJsonObject(PRODUCT_HISTORY_STORAGE_KEY);
    history[purchase.id] = purchase;
    saveJsonObject(PRODUCT_HISTORY_STORAGE_KEY, history);

    const product = normalizeProduct({
      ...products[productId],
      current_cost: purchase.purchase_cost,
      current_price: purchase.selling_price,
      updated_at: now,
    });
    products[productId] = product;
    saveJsonObject(PRODUCTS_STORAGE_KEY, products);

    return { product, purchase };
  },
};
