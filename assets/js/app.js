/* PharmaManager demo app - client-only (localStorage) */
(function () {
  // Storage keys
  const KEYS = {
    inventaire: 'pm_inventaire',
    commandes: 'pm_commandes',
    recus: 'pm_recus',
    factures: 'pm_factures',
    settings: 'pm_settings',
  };

  // Helpers
  const qs = (sel, el = document) => el.querySelector(sel);
  const qsa = (sel, el = document) => Array.from(el.querySelectorAll(sel));
  const on = (sel, evt, handler) => {
    const el = qs(sel);
    if (el) el.addEventListener(evt, handler);
  };

  const getData = (key) => JSON.parse(localStorage.getItem(key) || '[]');
  const setData = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const getSettings = () => {
    const s = JSON.parse(localStorage.getItem(KEYS.settings) || '{}');
    return { stockThreshold: 10, expiryMonths: 1, ...s };
  };
  const setSettings = (partial) => {
    const s = getSettings();
    localStorage.setItem(KEYS.settings, JSON.stringify({ ...s, ...partial }));
  };

  const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  const pushData = (key, item) => {
    const d = getData(key);
    d.push({ id: uid(), ...item });
    setData(key, d);
  };
  const updateData = (key, id, updater) => {
    const d = getData(key);
    const i = d.findIndex((x) => x.id === id);
    if (i >= 0) {
      d[i] = typeof updater === 'function' ? { ...d[i], ...updater(d[i]) } : { ...d[i], ...updater };
      setData(key, d);
      return true;
    }
    return false;
  };
  const deleteData = (key, id) => setData(key, getData(key).filter((x) => x.id !== id));
  const clearAll = () => {
    Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
  };

  const toISODate = (val) => {
    if (!val) return '';
    const d = new Date(val);
    if (isNaN(d)) return '';
    return d.toISOString().slice(0, 10);
  };
  const inRange = (dateStr, from, to) => {
    if (!dateStr) return false;
    const d = toISODate(dateStr);
    const df = from ? toISODate(from) : null;
    const dt = to ? toISODate(to) : null;
    if (df && d < df) return false;
    if (dt && d > dt) return false;
    return true;
  };

  const diffInMonths = (dateStr) => {
    if (!dateStr) return Infinity;
    const today = new Date();
    const d = new Date(dateStr);
    return (d.getFullYear() - today.getFullYear()) * 12 + (d.getMonth() - today.getMonth());
  };

  // Toast
  let toast;
  function showToast(msg, ok = true) {
    const el = qs('#liveToast');
    if (!el) return alert(msg);
    qs('#toastMsg').textContent = msg;
    el.classList.remove('text-bg-success', 'text-bg-danger');
    el.classList.add(ok ? 'text-bg-success' : 'text-bg-danger');
    toast = toast || new bootstrap.Toast(el);
    toast.show();
  }

  // Sections navigation
  const sections = {
    dashboard: qs('#section-dashboard'),
    inventaire: qs('#section-inventaire'),
    commandes: qs('#section-commandes'),
    recus: qs('#section-recus'),
    factures: qs('#section-factures'),
    rapports: qs('#section-rapports'),
  };
  function showSection(name) {
    Object.values(sections).forEach((el) => el.classList.add('d-none'));
    sections[name]?.classList.remove('d-none');
    qsa('.nav-link').forEach((a) => a.classList.remove('active'));
    qsa(`[data-section="${name}"]`).forEach((a) => a.classList.add('active'));
    if (name === 'dashboard') updateStats();
  }

  // Stats
  function updateStats() {
    qs('#statInventaire').textContent = getData(KEYS.inventaire).length;
    qs('#statCommandes').textContent = getData(KEYS.commandes).length;
    qs('#statRecus').textContent = getData(KEYS.recus).length;
    qs('#statFactures').textContent = getData(KEYS.factures).length;
  }

  // Renderers
  function renderInventaire(filter = {}) {
    const tbody = qs('#tblInventaire tbody');
    tbody.innerHTML = '';
    const { stockThreshold, expiryMonths } = getSettings();
    // mirror settings in UI if present
    const thInput = qs('#stockThreshold');
    const exInput = qs('#expiryMonths');
    if (thInput && !thInput.value) thInput.value = stockThreshold;
    if (exInput && !exInput.value) exInput.value = expiryMonths;

    const data = getData(KEYS.inventaire).filter((r) =>
      !filter.from && !filter.to ? true : inRange(r.date, filter.from, filter.to)
    );

    let low = 0, soon = 0, expired = 0;

    for (const r of data) {
      const expMonths = diffInMonths(r.dateExpiration);
      const isExpired = r.dateExpiration && new Date(r.dateExpiration) < new Date();
      const isSoon = !isExpired && expMonths >= 0 && expMonths <= Number(expiryMonths || 0);
      const isLow = Number(r.quantite) <= Number(stockThreshold || 0);
      if (isExpired) expired++; else if (isSoon) soon++;
      if (isLow) low++;

      const badges = [];
      if (isLow) badges.push('<span class="badge text-bg-warning me-1"><i class="bi bi-arrow-down-circle"></i> Stock bas</span>');
      if (isSoon) badges.push('<span class="badge text-bg-info me-1"><i class="bi bi-hourglass-split"></i> Exp. proche</span>');
      if (isExpired) badges.push('<span class="badge text-bg-danger me-1"><i class="bi bi-exclamation-octagon"></i> Expiré</span>');

      const tr = document.createElement('tr');
      if (isExpired) tr.classList.add('table-danger');
      else if (isSoon || isLow) tr.classList.add('table-warning');
      tr.innerHTML = `
        <td>${toISODate(r.date)}</td>
        <td>${escapeHtml(r.inventaireNum)}</td>
        <td>${escapeHtml(r.code)}</td>
        <td>${escapeHtml(r.produit)}</td>
        <td class="text-end">${Number(r.quantite)}</td>
        <td class="text-end">${Number(r.quantiteComparee)}</td>
        <td>${toISODate(r.dateExpiration)}</td>
        <td>${badges.join(' ')}</td>
        <td class="text-center">
          <button class="btn btn-sm btn-outline-primary me-1 btn-action" data-action="edit" data-id="${r.id}"><i class="bi bi-pencil"></i></button>
          <button class="btn btn-sm btn-outline-danger me-1 btn-action" data-action="print" data-id="${r.id}"><i class="bi bi-filetype-pdf"></i></button>
          <button class="btn btn-sm btn-outline-secondary btn-action" data-action="delete" data-id="${r.id}"><i class="bi bi-trash"></i></button>
        </td>`;
      tbody.appendChild(tr);
    }

    const alertBox = qs('#invAlerts');
    if (alertBox) {
      if (data.length === 0) alertBox.innerHTML = '';
      else alertBox.innerHTML = `
        <div class="alert alert-info d-flex align-items-center gap-3" role="alert">
          <div><i class="bi bi-bell"></i></div>
          <div>
            <div><strong>Alertes inventaire:</strong> Stock bas: <span class="badge text-bg-warning">${low}</span> | Exp. proche: <span class="badge text-bg-info">${soon}</span> | Expiré: <span class="badge text-bg-danger">${expired}</span></div>
            <div class="small text-muted">Seuil: ${stockThreshold} | Exp. dans ${expiryMonths} mois</div>
          </div>
        </div>`;
    }
  }

  function renderSimpleTable(key, tableSel, filter = {}) {
    const tbody = qs(`${tableSel} tbody`);
    tbody.innerHTML = '';
    const data = getData(key).filter((r) =>
      !filter.from && !filter.to ? true : inRange(r.date, filter.from, filter.to)
    );
    for (const r of data) {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${toISODate(r.date)}</td>
        <td>${escapeHtml(r.numero)}</td>
        <td>${escapeHtml(r.code)}</td>
        <td>${escapeHtml(r.produit)}</td>
        <td class="text-end">${Number(r.quantite)}</td>
        <td class="text-center">
          <button class="btn btn-sm btn-outline-primary me-1 btn-action" data-table="${tableSel}" data-action="edit" data-id="${r.id}"><i class="bi bi-pencil"></i></button>
          <button class="btn btn-sm btn-outline-danger me-1 btn-action" data-table="${tableSel}" data-action="print" data-id="${r.id}"><i class="bi bi-filetype-pdf"></i></button>
          <button class="btn btn-sm btn-outline-secondary btn-action" data-table="${tableSel}" data-action="delete" data-id="${r.id}"><i class="bi bi-trash"></i></button>
        </td>`;
      tbody.appendChild(tr);
    }
  }

  function escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Forms submit handlers (create or update)
  on('#formInventaire', 'submit', (e) => {
    e.preventDefault();
    const f = e.target;
    const editId = f.editId?.value;
    const rec = {
      inventaireNum: f.inventaireNum.value.trim(),
      code: f.code.value.trim(),
      produit: f.produit.value.trim(),
      quantite: Number(f.quantite.value || 0),
      quantiteComparee: Number(f.quantiteComparee.value || 0),
      dateExpiration: f.dateExpiration.value,
      date: f.date.value,
      updatedAt: new Date().toISOString(),
    };
    if (editId) {
      updateData(KEYS.inventaire, editId, rec);
      showToast("Article d'inventaire mis à jour.");
    } else {
      pushData(KEYS.inventaire, { ...rec, createdAt: new Date().toISOString() });
      showToast("Article d'inventaire ajouté.");
    }
    f.reset();
    renderInventaire({ from: qs('#invFrom').value, to: qs('#invTo').value });
    updateStats();
  });

  on('#formCommandes', 'submit', (e) => {
    e.preventDefault();
    const f = e.target;
    const editId = f.editId?.value;
    const rec = {
      numero: f.numero.value.trim(),
      date: f.date.value,
      code: f.code.value.trim(),
      produit: f.produit.value.trim(),
      quantite: Number(f.quantite.value || 0),
      updatedAt: new Date().toISOString(),
    };
    if (editId) {
      updateData(KEYS.commandes, editId, rec);
      showToast('Commande mise à jour.');
    } else {
      pushData(KEYS.commandes, { ...rec, createdAt: new Date().toISOString() });
      showToast('Commande ajoutée.');
    }
    f.reset();
    renderSimpleTable(KEYS.commandes, '#tblCommandes', { from: qs('#cmdFrom').value, to: qs('#cmdTo').value });
    updateStats();
  });

  on('#formRecus', 'submit', (e) => {
    e.preventDefault();
    const f = e.target;
    const editId = f.editId?.value;
    const rec = {
      numero: f.numero.value.trim(),
      date: f.date.value,
      code: f.code.value.trim(),
      produit: f.produit.value.trim(),
      quantite: Number(f.quantite.value || 0),
      updatedAt: new Date().toISOString(),
    };
    if (editId) {
      updateData(KEYS.recus, editId, rec);
      showToast('Reçu mis à jour.');
    } else {
      pushData(KEYS.recus, { ...rec, createdAt: new Date().toISOString() });
      showToast('Reçu ajouté.');
    }
    f.reset();
    renderSimpleTable(KEYS.recus, '#tblRecus', { from: qs('#recFrom').value, to: qs('#recTo').value });
    updateStats();
  });

  on('#formFactures', 'submit', (e) => {
    e.preventDefault();
    const f = e.target;
    const editId = f.editId?.value;
    const rec = {
      numero: f.numero.value.trim(),
      date: f.date.value,
      code: f.code.value.trim(),
      produit: f.produit.value.trim(),
      quantite: Number(f.quantite.value || 0),
      updatedAt: new Date().toISOString(),
    };
    if (editId) {
      updateData(KEYS.factures, editId, rec);
      showToast('Facture mise à jour.');
    } else {
      pushData(KEYS.factures, { ...rec, createdAt: new Date().toISOString() });
      showToast('Facture ajoutée.');
    }
    f.reset();
    renderSimpleTable(KEYS.factures, '#tblFactures', { from: qs('#facFrom').value, to: qs('#facTo').value });
    updateStats();
  });

  // Filters + Print buttons
  on('#btnInvFilter', 'click', (e) => {
    e.preventDefault();
    renderInventaire({ from: qs('#invFrom').value, to: qs('#invTo').value });
  });
  on('#btnInvPrint', 'click', (e) => {
    e.preventDefault();
    printTable('#tblInventaire', 'Inventaire');
  });
  on('#btnInvPrintList', 'click', (e) => {
    e.preventDefault();
    printTable('#tblInventaire', 'Inventaire (filtré)');
  });
  on('#btnInvApplySettings', 'click', (e) => {
    e.preventDefault();
    const stockThreshold = Number(qs('#stockThreshold')?.value || 0);
    const expiryMonths = Number(qs('#expiryMonths')?.value || 0);
    setSettings({ stockThreshold, expiryMonths });
    renderInventaire({ from: qs('#invFrom').value, to: qs('#invTo').value });
    showToast('Paramètres d\'alertes appliqués.');
  });

  on('#btnCmdFilter', 'click', (e) => {
    e.preventDefault();
    renderSimpleTable(KEYS.commandes, '#tblCommandes', { from: qs('#cmdFrom').value, to: qs('#cmdTo').value });
  });
  on('#btnCmdPrint', 'click', (e) => {
    e.preventDefault();
    printTable('#tblCommandes', 'Commandes');
  });
  on('#btnCmdPrintList', 'click', (e) => {
    e.preventDefault();
    printTable('#tblCommandes', 'Commandes (filtré)');
  });

  on('#btnRecFilter', 'click', (e) => {
    e.preventDefault();
    renderSimpleTable(KEYS.recus, '#tblRecus', { from: qs('#recFrom').value, to: qs('#recTo').value });
  });
  on('#btnRecPrint', 'click', (e) => {
    e.preventDefault();
    printTable('#tblRecus', 'Reçus');
  });
  on('#btnRecPrintList', 'click', (e) => {
    e.preventDefault();
    printTable('#tblRecus', 'Reçus (filtré)');
  });

  on('#btnFacFilter', 'click', (e) => {
    e.preventDefault();
    renderSimpleTable(KEYS.factures, '#tblFactures', { from: qs('#facFrom').value, to: qs('#facTo').value });
  });
  on('#btnFacPrint', 'click', (e) => {
    e.preventDefault();
    printTable('#tblFactures', 'Factures');
  });
  on('#btnFacPrintList', 'click', (e) => {
    e.preventDefault();
    printTable('#tblFactures', 'Factures (filtré)');
  });

  // Rapports
  on('#btnRapFilter', 'click', (e) => {
    e.preventDefault();
    renderRapports();
  });
  on('#btnRapPrint', 'click', (e) => {
    e.preventDefault();
    printTable('#tblRapports', 'Rapport');
  });
  on('#btnRapPrintList', 'click', (e) => {
    e.preventDefault();
    printTable('#tblRapports', 'Rapport (filtré)');
  });

  function renderRapports() {
    const type = qs('#rapportType').value;
    const from = qs('#rapFrom').value;
    const to = qs('#rapTo').value;
    const thead = qs('#tblRapports thead');
    const tbody = qs('#tblRapports tbody');
    const tfoot = qs('#tblRapports tfoot');
    tbody.innerHTML = '';
    tfoot.innerHTML = '';

    if (type === 'inventaire') {
      thead.innerHTML = `<tr><th>Date</th><th>N° inventaire</th><th>Code</th><th>Produit</th><th>Qté</th><th>Qté comparée</th><th>Exp.</th></tr>`;
      const data = getData(KEYS.inventaire).filter((r) => inRange(r.date, from, to));
      let totalQ = 0, totalQC = 0;
      for (const r of data) {
        totalQ += Number(r.quantite);
        totalQC += Number(r.quantiteComparee);
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${toISODate(r.date)}</td>
          <td>${escapeHtml(r.inventaireNum)}</td>
          <td>${escapeHtml(r.code)}</td>
          <td>${escapeHtml(r.produit)}</td>
          <td class="text-end">${Number(r.quantite)}</td>
          <td class="text-end">${Number(r.quantiteComparee)}</td>
          <td>${toISODate(r.dateExpiration)}</td>`;
        tbody.appendChild(tr);
      }
      tfoot.innerHTML = `<tr class="fw-bold"><td colspan="4" class="text-end">Totaux</td><td class="text-end">${totalQ}</td><td class="text-end">${totalQC}</td><td></td></tr>`;
    } else {
      thead.innerHTML = `<tr><th>Date</th><th>N°</th><th>Code</th><th>Produit</th><th>Qté</th></tr>`;
      const key = type === 'commandes' ? KEYS.commandes : type === 'recus' ? KEYS.recus : KEYS.factures;
      const data = getData(key).filter((r) => inRange(r.date, from, to));
      let totalQ = 0;
      for (const r of data) {
        totalQ += Number(r.quantite);
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${toISODate(r.date)}</td>
          <td>${escapeHtml(r.numero)}</td>
          <td>${escapeHtml(r.code)}</td>
          <td>${escapeHtml(r.produit)}</td>
          <td class="text-end">${Number(r.quantite)}</td>`;
        tbody.appendChild(tr);
      }
      tfoot.innerHTML = `<tr class="fw-bold"><td colspan="4" class="text-end">Total quantité</td><td class="text-end">${totalQ}</td></tr>`;
    }
  }

  // Delegated actions for tables
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-action');
    if (!btn) return;
    const action = btn.getAttribute('data-action');
    const id = btn.getAttribute('data-id');
    const tableSel = btn.getAttribute('data-table');

    if (qs('#section-inventaire') && btn.closest('#tblInventaire')) {
      if (action === 'edit') return editInventaire(id);
      if (action === 'print') return printRecord('inventaire', id, 'Fiche inventaire');
      if (action === 'delete') {
        if (confirm('Supprimer cet élément ?')) {
          deleteData(KEYS.inventaire, id);
          renderInventaire({ from: qs('#invFrom').value, to: qs('#invTo').value });
          updateStats();
          showToast('Élément supprimé.');
        }
      }
    }

    const map = {
      '#tblCommandes': { key: KEYS.commandes, form: '#formCommandes', section: 'commandes', title: 'Commande' },
      '#tblRecus': { key: KEYS.recus, form: '#formRecus', section: 'recus', title: 'Reçu' },
      '#tblFactures': { key: KEYS.factures, form: '#formFactures', section: 'factures', title: 'Facture' },
    };
    const info = Object.entries(map).find(([sel]) => btn.closest(sel));
    if (!info) return;
    const [, cfg] = info;
    if (action === 'edit') return editSimple(cfg.key, cfg.form, cfg.section, id);
    if (action === 'print') return printRecord(cfg.key, id, cfg.title);
    if (action === 'delete') {
      if (confirm('Supprimer cet élément ?')) {
        deleteData(cfg.key, id);
        if (cfg.key === KEYS.commandes) renderSimpleTable(KEYS.commandes, '#tblCommandes', { from: qs('#cmdFrom').value, to: qs('#cmdTo').value });
        if (cfg.key === KEYS.recus) renderSimpleTable(KEYS.recus, '#tblRecus', { from: qs('#recFrom').value, to: qs('#recTo').value });
        if (cfg.key === KEYS.factures) renderSimpleTable(KEYS.factures, '#tblFactures', { from: qs('#facFrom').value, to: qs('#facTo').value });
        updateStats();
        showToast('Élément supprimé.');
      }
    }
  });

  function editInventaire(id) {
    const rec = getData(KEYS.inventaire).find((x) => x.id === id);
    if (!rec) return;
    showSection('inventaire');
    const f = qs('#formInventaire');
    f.editId.value = id;
    f.inventaireNum.value = rec.inventaireNum || '';
    f.code.value = rec.code || '';
    f.produit.value = rec.produit || '';
    f.quantite.value = rec.quantite ?? '';
    f.quantiteComparee.value = rec.quantiteComparee ?? '';
    f.dateExpiration.value = toISODate(rec.dateExpiration);
    f.date.value = toISODate(rec.date);
    f.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function editSimple(key, formSel, section, id) {
    const rec = getData(key).find((x) => x.id === id);
    if (!rec) return;
    showSection(section);
    const f = qs(formSel);
    f.editId.value = id;
    f.numero.value = rec.numero || '';
    f.code.value = rec.code || '';
    f.produit.value = rec.produit || '';
    f.quantite.value = rec.quantite ?? '';
    f.date.value = toISODate(rec.date);
    f.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function printRecord(keyOrName, id, title) {
    let rec, fields = [];
    if (keyOrName === 'inventaire') {
      rec = getData(KEYS.inventaire).find((x) => x.id === id);
      if (!rec) return;
      fields = [
        ['Date', toISODate(rec.date)],
        ['N° inventaire', rec.inventaireNum],
        ['Code', rec.code],
        ['Produit', rec.produit],
        ['Quantité', rec.quantite],
        ['Quantité comparée', rec.quantiteComparee],
        ['Expiration', toISODate(rec.dateExpiration)],
      ];
    } else {
      let key = keyOrName;
      if (typeof keyOrName !== 'string') key = '';
      rec = getData(key).find((x) => x.id === id);
      if (!rec) return;
      fields = [
        ['Date', toISODate(rec.date)],
        ['N°', rec.numero],
        ['Code', rec.code],
        ['Produit', rec.produit],
        ['Quantité', rec.quantite],
      ];
    }
    const w = window.open('', '_blank');
    const style = `body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell; padding:20px;} h2{margin-top:0} table{width:100%; border-collapse:collapse} td{padding:6px 8px; border:1px solid #ddd}`;
    const rows = fields.map(([k, v]) => `<tr><td><strong>${k}</strong></td><td>${escapeHtml(v)}</td></tr>`).join('');
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>${style}</style></head><body><h2>${escapeHtml(title)}</h2><table>${rows}</table><script>window.onload=()=>{window.print(); setTimeout(()=>window.close(), 200);};</script></body></html>`);
    w.document.close();
  }

  function printTable(tableSel, title) {
    const table = qs(tableSel);
    if (!table) return;
    const clone = table.cloneNode(true);
    // remove Actions column only if header contains it
    const headerCells = clone.tHead ? Array.from(clone.tHead.rows[0].cells) : [];
    const lastHeader = headerCells[headerCells.length - 1];
    const hasActions = lastHeader && /actions/i.test(lastHeader.textContent || '');
    if (hasActions) {
      const lastIdx = headerCells.length - 1;
      Array.from(clone.rows).forEach((tr) => tr.cells[lastIdx] && tr.deleteCell(lastIdx));
    }
    const style = `body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell; padding:20px;} h2{margin-top:0} table{width:100%; border-collapse:collapse} th,td{padding:6px 8px; border:1px solid #ddd; text-align:left} th{text-align:left}`;
    const w = window.open('', '_blank');
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>${style}</style></head><body><h2>${escapeHtml(title)}</h2>${clone.outerHTML}<script>window.onload=()=>{window.print(); setTimeout(()=>window.close(), 200);};</script></body></html>`);
    w.document.close();
  }

  // Navbar and dashboard navigation
  qsa('[data-section]').forEach((el) => {
    el.addEventListener('click', (e) => {
      const name = e.currentTarget.getAttribute('data-section');
      if (name) {
        e.preventDefault();
        showSection(name);
      }
    });
  });

  // Top toolbar add buttons scroll to forms
  on('#btnInvAddTop', 'click', (e) => { e.preventDefault(); showSection('inventaire'); qs('#formInventaire')?.scrollIntoView({ behavior:'smooth'}); });
  on('#btnCmdAddTop', 'click', (e) => { e.preventDefault(); showSection('commandes'); qs('#formCommandes')?.scrollIntoView({ behavior:'smooth'}); });
  on('#btnRecAddTop', 'click', (e) => { e.preventDefault(); showSection('recus'); qs('#formRecus')?.scrollIntoView({ behavior:'smooth'}); });
  on('#btnFacAddTop', 'click', (e) => { e.preventDefault(); showSection('factures'); qs('#formFactures')?.scrollIntoView({ behavior:'smooth'}); });

  // Demo data
  on('#btnLoadDemo', 'click', () => {
    seedDemoData();
    renderAll();
    showToast('Données de démonstration chargées.');
  });

  // Clear all
  on('#btnClearAll', 'click', () => {
    if (confirm('Voulez-vous vraiment effacer toutes les données ?')) {
      clearAll();
      renderAll();
      showToast('Données réinitialisées.');
    }
  });

  function daysAgo(n) {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString().slice(0, 10);
  }

  function seedDemoData() {
    // avoid duplicating
    if (getData(KEYS.inventaire).length + getData(KEYS.commandes).length + getData(KEYS.recus).length + getData(KEYS.factures).length > 0) return;

    const inv = [
      { inventaireNum: 'INV-001', code: 'P-001', produit: 'Paracetamol 500mg', quantite: 5, quantiteComparee: 5, dateExpiration: daysAgo(10), date: daysAgo(30) }, // low and soon
      { inventaireNum: 'INV-002', code: 'P-002', produit: 'Ibuprofène 400mg', quantite: 80, quantiteComparee: 80, dateExpiration: daysAgo(-20), date: daysAgo(20) }, // future
      { inventaireNum: 'INV-003', code: 'P-003', produit: 'Amoxicilline 1g', quantite: 60, quantiteComparee: 58, dateExpiration: daysAgo(365), date: daysAgo(10) }, // expired
    ];
    setData(KEYS.inventaire, inv.map((x) => ({ id: uid(), ...x, createdAt: new Date().toISOString() })));

    const makeSimple = (prefix) => [
      { numero: `${prefix}-1001`, date: daysAgo(25), code: 'P-001', produit: 'Paracetamol 500mg', quantite: 20 },
      { numero: `${prefix}-1002`, date: daysAgo(15), code: 'P-002', produit: 'Ibuprofène 400mg', quantite: 10 },
      { numero: `${prefix}-1003`, date: daysAgo(5), code: 'P-003', produit: 'Amoxicilline 1g', quantite: 5 },
    ].map((x) => ({ id: uid(), ...x, createdAt: new Date().toISOString() }));
    setData(KEYS.commandes, makeSimple('CMD'));
    setData(KEYS.recus, makeSimple('REC'));
    setData(KEYS.factures, makeSimple('FAC'));
  }

  function renderAll() {
    updateStats();
    renderInventaire({ from: qs('#invFrom').value, to: qs('#invTo').value });
    renderSimpleTable(KEYS.commandes, '#tblCommandes', { from: qs('#cmdFrom').value, to: qs('#cmdTo').value });
    renderSimpleTable(KEYS.recus, '#tblRecus', { from: qs('#recFrom').value, to: qs('#recTo').value });
    renderSimpleTable(KEYS.factures, '#tblFactures', { from: qs('#facFrom').value, to: qs('#facTo').value });
  }

  // Initial
  showSection('dashboard');
  renderAll();
})();
