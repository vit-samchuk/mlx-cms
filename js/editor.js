import Alpine from 'https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/+esm';

/* ==========================================================================
   A5 Editor — Alpine.js component
   ========================================================================== */

const A5_STORAGE_KEY = 'a5_saved_sets';

function normalizeSetEntry(entry) {
  return {
    text: typeof entry?.text === 'string' ? entry.text : '',
    bottom: typeof entry?.bottom === 'string' ? entry.bottom : '',
    date: typeof entry?.date === 'string' ? entry.date : '',
  };
}

Alpine.data('a5Editor', () => ({
  // State
  text: 'Нова Пошта\n\nВідправник ПП «Мілекс Л»\n\nОтримувач ....\nПредставник\n...\n\n...\n...\n\nДоставку оплачує ...\nОголошена ... грн\n',
  bottom: '',
  saveName: '',
  saveLabel: 'Створити',
  search: '',
  selectedName: null,
  savedDate: '',
  sets: {},
  confirmMessage: '',
  _confirmCb: null,

  // Lifecycle
  async init() {
    await this.loadSets();
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && !e.altKey && !e.shiftKey && e.code === 'KeyP') {
        e.preventDefault();
        this.preparePrint();
      }
    });
  },

  // Computed
  get filteredSets() {
    const q = this.search.toLowerCase();
    return Object.entries(this.sets)
      .filter(([name, entry]) => {
        if (!q) return true;
        return name.toLowerCase().includes(q) || (entry.date && entry.date.includes(q));
      })
      .map(([name, entry]) => ({ name, ...entry }));
  },

  // Actions
  updateSaveLabel() {
    const name = this.saveName.trim();
    this.saveLabel = !name || !this.sets[name] ? 'Створити' : 'Оновити';
  },

  save() {
    const name = this.saveName.trim();
    if (!name) return;
    const now = formatDisplayDate(new Date());
    this.sets[name] = { text: this.text, bottom: this.bottom, date: now };
    this.persistSets();
    this.selectedName = name;
    this.savedDate = now;
    this.saveName = '';
    this.saveLabel = 'Створити';
  },

  load(name) {
    const entry = this.sets[name];
    if (!entry) return;
    this.text = entry.text;
    this.bottom = entry.bottom;
    this.selectedName = name;
    this.saveName = name;
    this.savedDate = entry.date || '';
    this.saveLabel = 'Оновити';
  },

  confirmDelete(name) {
    this.confirmMessage = `Видалити запис "${name}"?`;
    this._confirmCb = () => this.doDelete(name);
    this.$refs.confirmDialog.showModal();
  },

  confirmCallback() {
    if (this._confirmCb) this._confirmCb();
    this._confirmCb = null;
  },

  async doDelete(name) {
    delete this.sets[name];
    await this.deleteFromDb(name);
    await this.persistSets();
    if (this.selectedName === name) {
      this.selectedName = null;
      this.saveName = '';
      this.text = '';
      this.bottom = '';
      this.savedDate = '';
    }
  },

  exportData() {
    const blob = new Blob([JSON.stringify(this.sets)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'a5_saved_sets.json';
    a.click();
    URL.revokeObjectURL(url);
  },

  importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const imported = parseJsonObject(e.target.result, null);
        if (!imported) throw new Error('Imported file must contain a JSON object');

        let added = 0;
        let skipped = 0;
        Object.entries(imported).forEach(([name, rawEntry]) => {
          const entry = normalizeSetEntry(rawEntry);
          if (!this.sets[name]) {
            // New entry — always add
            this.sets[name] = entry;
            added++;
            return;
          }

          // Conflict — keep the newer version
          const existDate = parseDate(this.sets[name].date);
          const impDate = parseDate(entry.date);
          if (impDate > existDate) {
            this.sets[name] = entry;
            added++;
          } else {
            skipped++;
          }
        });
        await this.persistSets();
        alert(`Імпорт завершено.\nДодано/оновлено: ${added}\nПропущено (наявний запис новіший): ${skipped}`);
      } catch (e) {
        console.warn('Import failed', e);
        alert('Некоректний JSON-файл.');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  },

  async preparePrint() {
    await printRotatedCapture('contentToCapture', 'printContainer');
  },

  // Data layer
  async loadSets() {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabaseClient
          .from('a5_sets')
          .select('*')
          .order('name');
        if (error) throw error;
        this.sets = {};
        (data || []).forEach((row) => {
          this.sets[row.name] = {
            text: row.content,
            bottom: row.bottom_text,
            date: formatDisplayDate(new Date(row.updated_at)),
          };
        });
        return;
      } catch (e) {
        console.warn('Supabase load failed, using localStorage', e);
      }
    }
    this.sets = loadJsonObject(A5_STORAGE_KEY);
  },

  async persistSets() {
    if (isSupabaseConfigured()) {
      try {
        const rows = Object.entries(this.sets).map(([name, entry]) => ({
          name,
          content: entry.text,
          bottom_text: entry.bottom,
        }));
        if (rows.length > 0) {
          const { error } = await supabaseClient
            .from('a5_sets')
            .upsert(rows, { onConflict: 'name' });
          if (error) throw error;
        }
      } catch (e) {
        console.warn('Supabase persist failed, saving locally', e);
      }
    }
    saveJsonObject(A5_STORAGE_KEY, this.sets);
  },

  async deleteFromDb(name) {
    if (isSupabaseConfigured()) {
      try {
        await supabaseClient.from('a5_sets').delete().eq('name', name);
      } catch (e) {
        console.warn('Supabase delete failed', e);
      }
    }
  },
}));

Alpine.start();
