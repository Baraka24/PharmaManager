/* PharmaManager demo app - client-only (localStorage) */
(function () {
  // Storage keys
  const KEYS = {
    inventaire: 'pm_inventaire',
    commandes: 'pm_commandes',
    recus: 'pm_recus',
    factures: 'pm_factures',
  };

  // Helpers
  const qs = (sel, el = document) => el.querySelector(sel);
  const qsa = (sel, el = document) => Array.from(el.querySelectorAll(sel));

  const getData = (key) => JSON.parse(localStorage.getItem(key) || '[]');
  const setData = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const pushData = (key, item) => {
    const d = getData(key);
    d.push(item);
    setData(key, d);
  };
  const clearAll = () => {
    Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
  };

  const toISODate = (val) => {
    if (!val) return '';
    // ensure yyyy-mm-dd
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

  // Toast
  let toast;
  function showToast(msg, ok = true) {
    const el = qs('#liveToast');
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
    const data = getData(KEYS.inventaire).filter((r) =>
      !filter.from && !filter.to ? true : inRange(r.date, filter.from, filter.to)
    );
    for (const r of data) {
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
        <td class="text-end">${Number(r.quantite)}</td>`;
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

  // CSV export
  function tableToCsv(table) {
    const rows = qsa('tr', table).map((tr) =>
      qsa('th,td', tr)
        .map((cell) => {
          let txt = cell.innerText.replaceAll('"', '""');
          if (txt.search(/[",\n]/) >= 0) txt = '"' + txt + '"';
          return txt;
        })
        .join(',')
    );
    return rows.join('\n');
  }
  function download(filename, text) {
    const blob = new Blob([text], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // Forms submit handlers
  qs('#formInventaire').addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.target;
    const rec = {
      inventaireNum: f.inventaireNum.value.trim(),
      code: f.code.value.trim(),
      produit: f.produit.value.trim(),
      quantite: Number(f.quantite.value || 0),
      quantiteComparee: Number(f.quantiteComparee.value || 0),
      dateExpiration: f.dateExpiration.value,
      date: f.date.value,
      createdAt: new Date().toISOString(),
    };
    pushData(KEYS.inventaire, rec);
    f.reset();
    renderInventaire({ from: qs('#invFrom').value, to: qs('#invTo').value });
    updateStats();
    showToast('Article d\'inventaire ajouté.');
  });

  qs('#formCommandes').addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.target;
    const rec = {
      numero: f.numero.value.trim(),
      date: f.date.value,
      code: f.code.value.trim(),
      produit: f.produit.value.trim(),
      quantite: Number(f.quantite.value || 0),
      createdAt: new Date().toISOString(),
    };
    pushData(KEYS.commandes, rec);
    f.reset();
    renderSimpleTable(KEYS.commandes, '#tblCommandes', { from: qs('#cmdFrom').value, to: qs('#cmdTo').value });
    updateStats();
    showToast('Commande ajoutée.');
  });

  qs('#formRecus').addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.target;
    const rec = {
      numero: f.numero.value.trim(),
      date: f.date.value,
      code: f.code.value.trim(),
      produit: f.produit.value.trim(),
      quantite: Number(f.quantite.value || 0),
      createdAt: new Date().toISOString(),
    };
    pushData(KEYS.recus, rec);
    f.reset();
    renderSimpleTable(KEYS.recus, '#tblRecus', { from: qs('#recFrom').value, to: qs('#recTo').value });
    updateStats();
    showToast('Reçu ajouté.');
  });

  qs('#formFactures').addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.target;
    const rec = {
      numero: f.numero.value.trim(),
      date: f.date.value,
      code: f.code.value.trim(),
      produit: f.produit.value.trim(),
      quantite: Number(f.quantite.value || 0),
      createdAt: new Date().toISOString(),
    };
    pushData(KEYS.factures, rec);
    f.reset();
    renderSimpleTable(KEYS.factures, '#tblFactures', { from: qs('#facFrom').value, to: qs('#facTo').value });
    updateStats();
    showToast('Facture ajoutée.');
  });

  // Filters and CSV buttons
  qs('#btnInvFilter').addEventListener('click', (e) => {
    e.preventDefault();
    renderInventaire({ from: qs('#invFrom').value, to: qs('#invTo').value });
  });
  qs('#btnInvCsv').addEventListener('click', (e) => {
    e.preventDefault();
    const csv = tableToCsv(qs('#tblInventaire'));
    download(`inventaire_${Date.now()}.csv`, csv);
  });

  qs('#btnCmdFilter').addEventListener('click', (e) => {
    e.preventDefault();
    renderSimpleTable(KEYS.commandes, '#tblCommandes', { from: qs('#cmdFrom').value, to: qs('#cmdTo').value });
  });
  qs('#btnCmdCsv').addEventListener('click', (e) => {
    e.preventDefault();
    const csv = tableToCsv(qs('#tblCommandes'));
    download(`commandes_${Date.now()}.csv`, csv);
  });

  qs('#btnRecFilter').addEventListener('click', (e) => {
    e.preventDefault();
    renderSimpleTable(KEYS.recus, '#tblRecus', { from: qs('#recFrom').value, to: qs('#recTo').value });
  });
  qs('#btnRecCsv').addEventListener('click', (e) => {
    e.preventDefault();
    const csv = tableToCsv(qs('#tblRecus'));
    download(`recus_${Date.now()}.csv`, csv);
  });

  qs('#btnFacFilter').addEventListener('click', (e) => {
    e.preventDefault();
    renderSimpleTable(KEYS.factures, '#tblFactures', { from: qs('#facFrom').value, to: qs('#facTo').value });
  });
  qs('#btnFacCsv').addEventListener('click', (e) => {
    e.preventDefault();
    const csv = tableToCsv(qs('#tblFactures'));
    download(`factures_${Date.now()}.csv`, csv);
  });

  // Rapports
  qs('#btnRapFilter').addEventListener('click', (e) => {
    e.preventDefault();
    renderRapports();
  });
  qs('#btnRapCsv').addEventListener('click', (e) => {
    e.preventDefault();
    const csv = tableToCsv(qs('#tblRapports'));
    download(`rapport_${qs('#rapportType').value}_${Date.now()}.csv`, csv);
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

  // Navbar handlers
  qsa('[data-section]').forEach((el) => {
    el.addEventListener('click', (e) => {
      const name = e.currentTarget.getAttribute('data-section');
      if (name) {
        e.preventDefault();
        showSection(name);
      }
    });
  });

  // Demo data
  qs('#btnLoadDemo').addEventListener('click', () => {
    seedDemoData();
    renderAll();
    showToast('Données de démonstration chargées.');
  });

  // Clear all
  qs('#btnClearAll').addEventListener('click', () => {
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
      { inventaireNum: 'INV-001', code: 'P-001', produit: 'Paracetamol 500mg', quantite: 120, quantiteComparee: 118, dateExpiration: daysAgo(-200), date: daysAgo(30) },
      { inventaireNum: 'INV-002', code: 'P-002', produit: 'Ibuprofène 400mg', quantite: 80, quantiteComparee: 80, dateExpiration: daysAgo(-90), date: daysAgo(20) },
      { inventaireNum: 'INV-003', code: 'P-003', produit: 'Amoxicilline 1g', quantite: 60, quantiteComparee: 58, dateExpiration: daysAgo(-30), date: daysAgo(10) },
    ];
    setData(KEYS.inventaire, inv.map((x) => ({ ...x, createdAt: new Date().toISOString() })));

    const makeSimple = (prefix) => [
      { numero: `${prefix}-1001`, date: daysAgo(25), code: 'P-001', produit: 'Paracetamol 500mg', quantite: 20 },
      { numero: `${prefix}-1002`, date: daysAgo(15), code: 'P-002', produit: 'Ibuprofène 400mg', quantite: 10 },
      { numero: `${prefix}-1003`, date: daysAgo(5), code: 'P-003', produit: 'Amoxicilline 1g', quantite: 5 },
    ];
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
