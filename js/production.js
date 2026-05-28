import Alpine from 'https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/+esm';

/* ==========================================================================
   Production Tracker — Alpine.js component
   ========================================================================== */

Alpine.data('productionTracker', () => ({
  // Constants
  products: ['Вільха 10', 'Вільха 8', 'Вільха-дуб 10', 'Вільха-Дуб 8'],

  // State
  data: {},
  selectedMonthKey: '',
  isPieces: false,
  monthOptions: [],
  unfilledDays: [],
  tableRows: [],
  totals: {},
  showSummary: false,
  printTitle: '',
  canEdit: true,
  confirmMessage: '',
  _confirmCb: null,

  // Computed
  get currentMonthKey() {
    const now = new Date();
    return `${now.getFullYear()}-${now.getMonth()}`;
  },

  // Lifecycle
  async init() {
    await this.loadData();
    this.buildMonthOptions();
    this.selectedMonthKey = this.currentMonthKey;
    this.onMonthChange();
  },

  // Data layer
  async loadData() {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabaseClient
          .from('production_days')
          .select('*')
          .order('date');
        if (error) throw error;
        this.data = {};
        (data || []).forEach((row) => {
          this.data[row.date] = {
            products: row.products || {},
            dayOff: row.day_off || false,
          };
        });
        return;
      } catch (e) {
        console.warn('Supabase load failed, using localStorage', e);
      }
    }
    const raw = localStorage.getItem('production_data');
    this.data = raw ? JSON.parse(raw) : {};
  },

  persistData() {
    localStorage.setItem('production_data', JSON.stringify(this.data));
  },

  async upsertDay(dateKey, entry) {
    if (!isSupabaseConfigured()) return;
    try {
      await supabaseClient.from('production_days').upsert(
        { date: dateKey, products: entry.products || {}, day_off: entry.dayOff || false },
        { onConflict: 'date' },
      );
    } catch (e) {
      console.warn('Supabase upsert failed', e);
    }
  },

  async deleteDayFromDb(dateKey) {
    if (!isSupabaseConfigured()) return;
    try {
      await supabaseClient.from('production_days').delete().eq('date', dateKey);
    } catch (e) {
      console.warn('Supabase delete failed', e);
    }
  },

  // Helpers
  formatValue(val) {
    const v = val || 0;
    return this.isPieces ? `${v},00` : `${v * 18},00`;
  },

  // Month selector
  buildMonthOptions() {
    const now = new Date();
    const opts = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      opts.push({
        value: `${d.getFullYear()}-${d.getMonth()}`,
        label: d.toLocaleDateString('uk-UA', { year: 'numeric', month: 'long' }),
      });
    }
    this.monthOptions = opts;
  },

  onMonthChange() {
    const { year, month } = parseMonthKey(this.selectedMonthKey);
    const d = new Date(year, month);
    const title = `Тріска за ${d.toLocaleDateString('uk-UA', { year: 'numeric', month: 'long' })}`;
    this.printTitle = title.charAt(0).toUpperCase() + title.slice(1);
    this.renderTable(year, month);
    this.renderUnfilledDays(year, month);
  },

  onUnitChange() {
    const { year, month } = parseMonthKey(this.selectedMonthKey);
    this.renderTable(year, month);
  },

  // Unfilled days
  renderUnfilledDays(year, month) {
    const today = new Date();
    const todayKey = toDateKey(today.getFullYear(), today.getMonth(), today.getDate());
    const daysInMonth = getDaysInMonth(year, month);

    if (this.selectedMonthKey === this.currentMonthKey) {
      this.canEdit = true;
    } else {
      const lastDay = new Date(year, month + 1, 0);
      const daysDiff = Math.floor((today - lastDay) / (1000 * 60 * 60 * 24));
      this.canEdit = daysDiff < 3;
    }

    if (!this.canEdit) {
      this.unfilledDays = [];
      return;
    }

    const unfilled = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = toDateKey(year, month, day);
      if (dateKey >= todayKey) continue;
      if (this.data[dateKey]) continue;

      const date = new Date(year, month, day);
      const inputs = {};
      this.products.forEach((p) => {
        inputs[p] = 0;
      });
      unfilled.push({ dateKey, label: date.toLocaleDateString('uk-UA'), inputs });
    }

    this.unfilledDays = unfilled;
  },

  saveDay(day, afterSave = null) {
    const allEmpty = this.products.every((p) => !day.inputs[p] || day.inputs[p] === 0);
    const done = () => {
      this.doSaveDay(day);
      if (afterSave) afterSave();
    };
    if (allEmpty) {
      this.confirmMessage = 'Всі поля порожні. Зберегти нульове виготовлення за цей день?';
      this._confirmCb = done;
      this.$refs.confirmDialog.showModal();
    } else {
      done();
    }
  },

  saveDayAndFocusNext(event, day) {
    this.saveDay(day, () => {
      setTimeout(() => this.focusFirstUnfilledInput(), 1000);
    });
  },

  focusFirstUnfilledInput() {
    const firstEntry = document.querySelector('.editor-panel .day-entry');
    if (!firstEntry) return;
    const input = firstEntry.querySelector('input[type="number"]');
    if (input) {
      input.focus();
      input.select();
    }
  },

  doSaveDay(day) {
    const entry = { products: {}, dayOff: false };
    this.products.forEach((p) => {
      entry.products[p] = parseInt(day.inputs[p]) || 0;
    });
    this.data[day.dateKey] = entry;
    this.upsertDay(day.dateKey, entry);
    this.persistData();
    const { year, month } = parseMonthKey(this.selectedMonthKey);
    this.renderUnfilledDays(year, month);
    this.renderTable(year, month);
  },

  markDayOff(day) {
    const entry = { dayOff: true };
    this.data[day.dateKey] = entry;
    this.upsertDay(day.dateKey, entry);
    this.persistData();
    const { year, month } = parseMonthKey(this.selectedMonthKey);
    this.renderUnfilledDays(year, month);
    this.renderTable(year, month);
  },

  deleteDay(dateKey) {
    this.confirmMessage = 'Видалити дані за цей день?';
    this._confirmCb = () => this.doDeleteDay(dateKey);
    this.$refs.confirmDialog.showModal();
  },

  doDeleteDay(dateKey) {
    delete this.data[dateKey];
    this.deleteDayFromDb(dateKey);
    this.persistData();
    const { year, month } = parseMonthKey(this.selectedMonthKey);
    this.renderUnfilledDays(year, month);
    this.renderTable(year, month);
  },

  confirmCallback() {
    if (this._confirmCb) this._confirmCb();
    this._confirmCb = null;
  },

  // Production table
  renderTable(year, month) {
    const daysInMonth = getDaysInMonth(year, month);
    const rows = [];
    const totals = {};
    this.products.forEach((p) => {
      totals[p] = 0;
    });

    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = toDateKey(year, month, day);
      const entry = this.data[dateKey];
      const date = new Date(year, month, day);
      const values = {};
      let isDayOff = false;
      let hasData = false;

      if (entry) {
        hasData = true;
        if (entry.dayOff) {
          isDayOff = true;
        } else {
          this.products.forEach((p) => {
            const v = (entry.products && entry.products[p]) || 0;
            values[p] = v;
            totals[p] += v;
          });
        }
      }

      rows.push({
        dateKey,
        dateLabel: date.toLocaleDateString('uk-UA', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        }),
        isDayOff,
        hasData,
        values,
      });
    }

    this.tableRows = rows;
    this.totals = totals;

    const now = new Date();
    this.showSummary =
      year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth());
  },
}));

Alpine.start();
