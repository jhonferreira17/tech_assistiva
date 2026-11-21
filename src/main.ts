/**
 * Aplicação Frontend em TypeScript — Observatório Nacional de Tecnologia Assistiva no SUS (2022–2024)
 * PPSUS / UFRJ–UFAM • Padrões RECORD, GATHER, CIF/OMS, ISO 9999 e PNAISPD
 * DOI Zenodo: 10.5281/zenodo.24225551 (35 Arquivos Sincronizados)
 */

import Chart from 'chart.js/auto';
import {
  createIcons,
  LayoutDashboard,
  Trophy,
  Map as LucideMap,
  Building2,
  Route,
  Users,
  Accessibility,
  Database,
  Code2,
  BookOpen,
  FileText,
  AtSign,
  Moon,
  Sun,
  MapPin,
  Download,
  FileJson,
  Globe,
  Ship,
  Play,
  ExternalLink
} from 'lucide';
import { MapaOrigemDestinoController } from './components/mapaOrigemDestino';
import type {
  BaseDadosObservatorioTASUS,
  CuboUfAnoModalidade,
  EquipChartMetricKey,
  FiltroGlobalState,
  MacrorregiaoBrasil,
  ModalidadeISO9999
} from './types/ta-sus';

declare global {
  interface Window {
    DADOS_TA_SUS: BaseDadosObservatorioTASUS;
  }
}

const DB: BaseDadosObservatorioTASUS = window.DADOS_TA_SUS;

// Formatters pt-BR
const fmtInt = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });
const fmtDec1 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const fmtDec2 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDec4 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
const fmtBRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

function formatCompactBRL(val: number): string {
  if (val >= 1e9) return 'R$ ' + fmtDec2.format(val / 1e9) + ' bi';
  if (val >= 1e6) return 'R$ ' + fmtDec2.format(val / 1e6) + ' mi';
  if (val >= 1e3) return 'R$ ' + fmtDec2.format(val / 1e3) + ' mil';
  return fmtBRL.format(val);
}

const ALL_MODALIDADES: ModalidadeISO9999[] = ['TA04', 'TA01', 'TA05', 'TA02', 'TA10', 'TA03', 'TA06'];
const MOD_SHORT_NAMES: Record<ModalidadeISO9999, string> = {
  TA04: 'Audição',
  TA01: 'Locomoção',
  TA05: 'Visão',
  TA02: 'Órteses',
  TA10: 'Adequação Postural',
  TA03: 'Próteses',
  TA06: 'Reabilitação Vocal'
};

const EQUIP_METRIC_LABELS: Record<EquipChartMetricKey, string> = {
  equipamentos: 'Produtos (un.)',
  atos: 'Atos Clínicos',
  orcamento: 'Valor Total (R$)',
  taxa_prod: 'Taxa Prod (/ 1.000 PcD)',
  taxa_atos: 'Taxa Atos (/ 1.000 PcD)',
  ri: 'RI — Razão de Integralidade'
};

const EQUIP_METRIC_SHORT: Record<EquipChartMetricKey, string> = {
  equipamentos: 'Produtos',
  atos: 'Atos Clínicos',
  orcamento: 'Valor Total',
  taxa_prod: 'Taxa Prod',
  taxa_atos: 'Taxa Atos',
  ri: 'RI'
};

const state: FiltroGlobalState = {
  ano: 'ALL',
  macro: 'ALL',
  uf: 'ALL',
  municipioCod: '',
  municipioNome: '',
  modalidades: [],
  equipChartGroup: 'categoria',
  equipChartMetrics: ['equipamentos'],
  sigtapSearch: '',
  sigtapTipo: 'ALL',
  poloMunSearch: '',
  top10Scope: 'UF',
  top10Metric: 'taxa_1k_pcd'
};

function syncEquipMetricMultiUI(): void {
  const labelEl = getEl('equipMetricLabel');
  const checks = Array.from(document.querySelectorAll<HTMLInputElement>('.chk-equip-metric'));
  if (state.equipChartMetrics.length === 0) {
    state.equipChartMetrics = ['equipamentos'];
  }
  checks.forEach(c => {
    c.checked = state.equipChartMetrics.includes(c.value as EquipChartMetricKey);
  });
  if (labelEl) {
    if (state.equipChartMetrics.length === 1) {
      labelEl.textContent = EQUIP_METRIC_LABELS[state.equipChartMetrics[0]];
    } else if (state.equipChartMetrics.length === 2) {
      labelEl.textContent = state.equipChartMetrics.map(k => EQUIP_METRIC_SHORT[k]).join(' + ');
    } else {
      labelEl.textContent = `${state.equipChartMetrics.length} indicadores selecionados`;
    }
  }
}

function isModSelected(mod: string): boolean {
  return state.modalidades.length === 0 || state.modalidades.includes(mod as ModalidadeISO9999);
}

function syncModMultiUI(): void {
  const labelEl = getEl('modMultiLabel');
  const chkAll = getEl<HTMLInputElement>('chkModAll');
  const itemChecks = Array.from(document.querySelectorAll<HTMLInputElement>('.chk-mod-item'));

  const isAll = state.modalidades.length === 0 || state.modalidades.length === ALL_MODALIDADES.length;
  if (isAll && state.modalidades.length === ALL_MODALIDADES.length) {
    state.modalidades = [];
  }

  if (chkAll) {
    chkAll.checked = state.modalidades.length === 0;
    chkAll.indeterminate = state.modalidades.length > 0 && state.modalidades.length < ALL_MODALIDADES.length;
  }

  itemChecks.forEach(chk => {
    const val = chk.value as ModalidadeISO9999;
    chk.checked = state.modalidades.length === 0 || state.modalidades.includes(val);
  });

  if (labelEl) {
    if (state.modalidades.length === 0) {
      labelEl.textContent = 'Todas as Tecnologias';
    } else if (state.modalidades.length === 1) {
      labelEl.textContent = MOD_SHORT_NAMES[state.modalidades[0]] || state.modalidades[0];
    } else if (state.modalidades.length === 2) {
      labelEl.textContent = state.modalidades.map(m => MOD_SHORT_NAMES[m] || m).join(', ');
    } else {
      labelEl.textContent = `${state.modalidades.length} categorias selecionadas`;
    }
  }
}

const charts: Record<string, Chart> = {};
const pendingChartConfigs: Record<string, any> = {};
const municipioLookupByLabel = new Map<string, { cod: string; nome: string; uf: string }>();
let currentMunicipioOptions: Array<{ cod: string; nome: string; uf: string; label: string; norm: string }> = [];
let lastDatalistKey: string | null = null;
let staticTablesRendered = false;
let staticChartsRendered = false;
let sigtapExcluidosRendered = false;

function normalizeSearchStr(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function cloneChartConfig(val: any): any {
  if (val === null || typeof val !== 'object') return val;
  if (Array.isArray(val)) return val.map(cloneChartConfig);
  const copy: Record<string, any> = {};
  for (const key of Object.keys(val)) {
    copy[key] = cloneChartConfig(val[key]);
  }
  return copy;
}

function isCanvasVisible(el: HTMLCanvasElement): boolean {
  const parent = el.parentElement;
  if (!parent) return false;
  const rect = parent.getBoundingClientRect();
  return parent.offsetParent !== null && rect.width > 0 && rect.height > 0;
}

function mountChartClean(canvas: HTMLCanvasElement, id: string, cfg: any): void {
  if (charts[id]) {
    charts[id].destroy();
    delete charts[id];
  }
  const existing = Chart.getChart(canvas);
  if (existing) existing.destroy();
  canvas.removeAttribute('style');
  canvas.removeAttribute('width');
  canvas.removeAttribute('height');
  charts[id] = new Chart(canvas, cloneChartConfig(cfg));
}

function mountVisibleChartsIn(container: HTMLElement | null): void {
  if (!container) return;
  container.querySelectorAll('canvas[id]').forEach(node => {
    const canvas = node as HTMLCanvasElement;
    const id = canvas.id;
    const cfg = pendingChartConfigs[id];
    if (!cfg || !isCanvasVisible(canvas)) return;
    mountChartClean(canvas, id, cfg);
  });
}

let refreshTimerId: number | null = null;
function scheduleRefreshAll(): void {
  if (refreshTimerId !== null) window.clearTimeout(refreshTimerId);
  refreshTimerId = window.setTimeout(() => {
    refreshTimerId = null;
    refreshAll();
  }, 0);
}

function debounce<T extends (...args: any[]) => void>(fn: T, delayMs: number): T {
  let timer: number | null = null;
  return ((...args: any[]) => {
    if (timer !== null) window.clearTimeout(timer);
    timer = window.setTimeout(() => fn(...args), delayMs);
  }) as T;
}

const odMapController = new MapaOrigemDestinoController((selectedUf: string) => {
  state.uf = selectedUf;
  if (selectedUf !== 'ALL') {
    const ufRow = DB.resumo_uf.find(r => r.uf === selectedUf);
    if (ufRow) {
      state.macro = ufRow.macrorregiao as MacrorregiaoBrasil;
      const selMacro = getEl<HTMLSelectElement>('filterMacro');
      if (selMacro) selMacro.value = state.macro;
    }
  }
  populateUfSelector();
  populateMunicipioDatalist();
  refreshAll();
});

function getEl<T extends HTMLElement = HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

function getUfsForMacro(macro: 'ALL' | MacrorregiaoBrasil): Array<{ uf: string; nome: string; macro: string }> {
  const seen = new Map<string, { uf: string; nome: string; macro: string }>();
  DB.resumo_uf.forEach(r => {
    if (!seen.has(r.uf)) {
      seen.set(r.uf, { uf: r.uf, nome: r.uf_nome, macro: r.macrorregiao });
    }
  });
  return Array.from(seen.values())
    .filter(item => macro === 'ALL' || item.macro === macro)
    .sort((a, b) => a.uf.localeCompare(b.uf));
}

function populateUfSelector(): void {
  const selUF = getEl<HTMLSelectElement>('filterUF');
  if (!selUF) return;

  const ufsList = getUfsForMacro(state.macro);
  const validUfSet = new Set(ufsList.map(x => x.uf));

  if (state.uf !== 'ALL' && !validUfSet.has(state.uf)) {
    state.uf = 'ALL';
  }

  selUF.innerHTML = '';
  const defaultOpt = document.createElement('option');
  defaultOpt.value = 'ALL';
  defaultOpt.textContent =
    state.macro === 'ALL'
      ? `Todos os Estados (${ufsList.length} UFs)`
      : `Todos — ${state.macro} (${ufsList.length} UFs)`;
  selUF.appendChild(defaultOpt);

  ufsList.forEach(item => {
    const opt = document.createElement('option');
    opt.value = item.uf;
    opt.textContent = `${item.uf} — ${item.nome}`;
    selUF.appendChild(opt);
  });

  selUF.value = state.uf;
}

function initSelectors(): void {
  populateUfSelector();
  populateMunicipioDatalist();
}

function syncClearMuniBtn(): void {
  const clearBtn = getEl('btnClearMuniInput');
  const inputMun = getEl<HTMLInputElement>('filterMunicipio');
  if (!clearBtn) return;
  const hasValue = Boolean(state.municipioCod || inputMun?.value.trim());
  clearBtn.classList.toggle('visible', hasValue);
}

function renderMuniDropdown(filterQuery = ''): void {
  const listEl = getEl('muniDropdownList');
  if (!listEl) return;

  const q = normalizeSearchStr(filterQuery);
  const matches = q
    ? currentMunicipioOptions.filter(opt => opt.norm.includes(q) || opt.cod.includes(q))
    : currentMunicipioOptions;

  if (matches.length === 0) {
    listEl.innerHTML = `<div class="muni-option-empty">Nenhum município encontrado</div>`;
    return;
  }

  const MAX_VISIBLE = 150;
  const slice = matches.slice(0, MAX_VISIBLE);
  const rowsHtml = slice
    .map(
      opt => `
      <div class="muni-option ${opt.cod === state.municipioCod ? 'selected' : ''}" data-muni-cod="${opt.cod}" role="option">
        <span>${opt.nome}</span>
        <span style="font-size:11px;color:var(--text-muted);font-weight:600;">${opt.uf}</span>
      </div>
    `
    )
    .join('');

  const extraNote =
    matches.length > MAX_VISIBLE
      ? `<div class="muni-option-empty">Mostrando ${MAX_VISIBLE} de ${fmtInt.format(matches.length)} — digite para filtrar</div>`
      : '';

  listEl.innerHTML = rowsHtml + extraNote;
}

function openMuniDropdown(showAll = false): void {
  const listEl = getEl('muniDropdownList');
  const inputMun = getEl<HTMLInputElement>('filterMunicipio');
  if (!listEl) return;
  const query = showAll ? '' : inputMun?.value || '';
  renderMuniDropdown(query);
  listEl.classList.add('open');
}

function closeMuniDropdown(): void {
  getEl('muniDropdownList')?.classList.remove('open');
}

function populateMunicipioDatalist(): void {
  const inputMun = getEl<HTMLInputElement>('filterMunicipio');
  const munDict = window.MAPA_OD_SUS?.municipios_ibge;
  if (!munDict) return;

  const filterKey = `${state.macro}|${state.uf}`;
  if (lastDatalistKey === filterKey) return;
  lastDatalistKey = filterKey;

  const allowedUfs = new Set(
    state.uf !== 'ALL' ? [state.uf] : getUfsForMacro(state.macro).map(x => x.uf)
  );

  municipioLookupByLabel.clear();
  const entries = Object.entries(munDict)
    .filter(([, meta]) => allowedUfs.has(meta[1]))
    .sort((a, b) => a[1][0].localeCompare(b[1][0], 'pt-BR'));

  currentMunicipioOptions = entries.map(([cod, meta]) => {
    const nome = meta[0];
    const uf = meta[1];
    const label = `${nome} (${uf})`;
    municipioLookupByLabel.set(label.toLowerCase(), { cod, nome, uf });
    municipioLookupByLabel.set(`${nome} - ${uf}`.toLowerCase(), { cod, nome, uf });
    municipioLookupByLabel.set(cod, { cod, nome, uf });
    return {
      cod,
      nome,
      uf,
      label,
      norm: normalizeSearchStr(`${nome} ${uf}`)
    };
  });

  if (inputMun) {
    if (state.uf !== 'ALL') {
      inputMun.placeholder = `Município em ${state.uf} (${fmtInt.format(entries.length)})...`;
    } else if (state.macro !== 'ALL') {
      inputMun.placeholder = `Município — ${state.macro} (${fmtInt.format(entries.length)})...`;
    } else {
      inputMun.placeholder = `Buscar município (${fmtInt.format(entries.length)})...`;
    }
  }
  syncClearMuniBtn();
}

function renderMunicipioSummaryBar(): void {
  const bar = getEl('muniSelectedBar');
  if (!bar) return;

  if (!state.municipioCod) {
    bar.classList.remove('active');
    bar.innerHTML = '';
    return;
  }

  const munDict = window.MAPA_OD_SUS?.municipios_ibge;
  const meta = munDict?.[state.municipioCod];
  const nome = meta ? meta[0] : state.municipioNome;
  const uf = meta ? meta[1] : state.uf;
  const pcd = meta ? meta[2] : 0;
  const rs = meta ? meta[3] : '—';

  const poloRds = DB.polos_municipais_oferta?.find(p => p.cod_mun_6 === state.municipioCod);
  const ufRoutes = window.MAPA_OD_SUS?.rotas_por_uf?.[uf] || [];
  const rotasSaida = ufRoutes.filter(r => r.c_orig === state.municipioCod);

  let detailHtml = '';
  if (poloRds) {
    detailHtml = `
      <span class="tag tag-ok">Polo Ofertante SUS</span>
      <span>Serviços: <strong>${fmtInt.format(poloRds.cnes_ativos)}</strong></span>
      <span>Equip. Ofertados: <strong>${fmtInt.format(poloRds.prod_oferta)}</strong></span>
      <span>Adaptações: <strong>${fmtInt.format(poloRds.proc_oferta)}</strong></span>
      <span>Taxa Local: <strong>${fmtDec2.format(poloRds.taxa_res_1000pcd)} / 1k PcD</strong></span>
      <span>RI: <strong>${fmtDec4.format(poloRds.ri_oferta)}</strong></span>
    `;
  } else if (rotasSaida.length > 0) {
    const topDest = [...rotasSaida].sort((a, b) => b.prod + b.proc - (a.prod + a.proc))[0];
    const totalDesloc = rotasSaida.reduce((acc, r) => acc + r.prod + r.proc, 0);
    detailHtml = `
      <span class="tag tag-prod">Município de Origem</span>
      <span>Principal Destino: <strong>${topDest.n_dest} (${topDest.uf_dest})</strong> • ${fmtDec1.format(topDest.dist_km)} km</span>
      <span>Atendimentos em Polos: <strong>${fmtInt.format(totalDesloc)}</strong> (${rotasSaida.length} destino${rotasSaida.length > 1 ? 's' : ''})</span>
    `;
  } else {
    detailHtml = `<span class="tag tag-zero">Sem polo local registrado no triênio</span>`;
  }

  bar.classList.add('active');
  bar.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
      <div>
        <strong style="font-size:13.5px;color:var(--text-main);display:inline-flex;align-items:center;gap:6px;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
          ${nome} (${uf})
        </strong>
        <span style="margin-left:8px;color:var(--text-muted);font-size:12px;">Região: ${rs} • Pop. PcD (2022): <strong>${fmtInt.format(pcd)}</strong></span>
      </div>
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;font-size:12px;color:var(--text-secondary);">
        ${detailHtml}
      </div>
    </div>
    <div style="display:flex;align-items:center;gap:8px;">
      <button class="btn" id="btnFocusMunOnMap" style="padding:5px 10px;font-size:12px;border-color:var(--primary);color:var(--primary);">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" x2="9" y1="3" y2="18"/><line x1="15" x2="15" y1="6" y2="21"/></svg>
        Ver no Mapa
      </button>
      <button class="btn" id="btnClearMunOnly" style="padding:5px 10px;font-size:12px;">✕ Limpar Município</button>
    </div>
  `;

  getEl('btnFocusMunOnMap')?.addEventListener('click', () => {
    const mapTabBtn = document.querySelector('.nav-tab[data-tab="tab-territorio"]') as HTMLElement | null;
    if (mapTabBtn) mapTabBtn.click();
    setTimeout(() => {
      odMapController.focusMunicipality(state.municipioCod);
    }, 150);
  });

  getEl('btnClearMunOnly')?.addEventListener('click', () => {
    state.municipioCod = '';
    state.municipioNome = '';
    const inputMun = getEl<HTMLInputElement>('filterMunicipio');
    if (inputMun) inputMun.value = '';
    refreshAll();
  });
}

function getFilteredCubo(): CuboUfAnoModalidade[] {
  return DB.cubo_uf_ano_mod.filter(r => {
    if (state.ano !== 'ALL' && String(r.ano) !== String(state.ano)) return false;
    if (state.macro !== 'ALL' && r.macrorregiao !== state.macro) return false;
    if (state.uf !== 'ALL' && r.uf !== state.uf) return false;
    if (!isModSelected(r.modalidade)) return false;
    return true;
  });
}

function updateGlobalKPIs(): void {
  const kpiProdQtd = getEl('kpiProdQtd');
  const kpiProdSub = getEl('kpiProdSub');
  const kpiProcQtd = getEl('kpiProcQtd');
  const kpiProcSub = getEl('kpiProcSub');
  const kpiRI = getEl('kpiRI');
  const kpiRISub = getEl('kpiRISub');
  const kpiValTotal = getEl('kpiValTotal');
  const kpiValSub = getEl('kpiValSub');
  const kpiGlosa = getEl('kpiGlosa');

  // Atualização a nível de Município quando um município está selecionado
  if (state.municipioCod) {
    const munMeta = window.MAPA_OD_SUS?.municipios_ibge?.[state.municipioCod];
    const munNome = munMeta ? munMeta[0] : state.municipioNome;
    const munUf = munMeta ? munMeta[1] : state.uf;
    const munPcd = munMeta ? munMeta[2] : 0;
    const kpiTuple = window.MAPA_OD_SUS?.municipios_kpis?.[state.municipioCod];

    // Tuple: [prod_res, proc_res, val_res, fat_res, prod_ofe, proc_ofe, val_ofe, fat_ofe]
    const prodRes = kpiTuple ? kpiTuple[0] : 0;
    const procRes = kpiTuple ? kpiTuple[1] : 0;
    const valRes = kpiTuple ? kpiTuple[2] : 0;
    const fatRes = kpiTuple ? kpiTuple[3] : 0;
    const prodOfe = kpiTuple ? kpiTuple[4] : 0;
    const procOfe = kpiTuple ? kpiTuple[5] : 0;
    const valOfe = kpiTuple ? kpiTuple[6] : 0;
    const fatOfe = kpiTuple ? kpiTuple[7] : 0;

    // Se for município polo ofertante, exibe produção ofertada e destaca moradores no subtítulo;
    // caso contrário, exibe produção por residência dos moradores do município.
    const isPolo = prodOfe > 0 || procOfe > 0;
    const prod = isPolo ? prodOfe : prodRes;
    const proc = isPolo ? procOfe : procRes;
    const val = isPolo ? valOfe : valRes;
    const fat = isPolo ? fatOfe : fatRes;
    const ri = prod > 0 ? proc / prod : 0;
    const invRi = ri > 0 ? fmtDec1.format(1 / ri) : '—';

    if (kpiProdQtd) kpiProdQtd.textContent = fmtInt.format(prod);
    if (kpiProdSub) {
      kpiProdSub.textContent = isPolo
        ? `Polo ${munNome} (${munUf}) • ${fmtInt.format(prodRes)} p/ moradores locais`
        : prod > 0
        ? `Moradores de ${munNome} (${munUf}) • Triênio 2022–2024`
        : `Sem registro SIA/SUS para moradores de ${munNome} (${munUf})`;
    }

    if (kpiProcQtd) kpiProcQtd.textContent = fmtInt.format(proc);
    if (kpiProcSub) {
      kpiProcSub.textContent = isPolo
        ? `Adaptações ofertadas no polo • ${fmtInt.format(procRes)} p/ moradores`
        : `Avaliação, moldagem e ajustes • Triênio 2022–2024`;
    }

    if (kpiRI) kpiRI.textContent = fmtDec4.format(ri);
    if (kpiRISub) {
      kpiRISub.textContent =
        ri > 0
          ? `1 atendimento clínico a cada ${invRi} equipamentos`
          : `Sem atendimentos clínicos registrados em ${munNome}`;
    }

    if (kpiValTotal) kpiValTotal.textContent = formatCompactBRL(val);
    if (kpiValSub) {
      kpiValSub.textContent = `${fmtInt.format(fat)} registros aprovados • Pop. PcD: ${fmtInt.format(munPcd)}`;
    }
    if (kpiGlosa) {
      kpiGlosa.textContent = isPolo ? `Polo: ${munNome} (${munUf})` : `Município: ${munNome} (${munUf})`;
    }
    return;
  }

  const filtered = getFilteredCubo();

  let prodQtdPro = 0,
    prodQtdApr = 0,
    prodValPro = 0,
    prodValApr = 0;
  let procQtdPro = 0,
    procQtdApr = 0,
    procValPro = 0,
    procValApr = 0;
  let faturamentos = 0;

  filtered.forEach(r => {
    faturamentos += r.faturamentos;
    if (r.tipo_registro === 'Produto') {
      prodQtdPro += r.qtd_apresentada;
      prodQtdApr += r.qtd_aprovada;
      prodValPro += r.val_apresentado;
      prodValApr += r.val_aprovado;
    } else {
      procQtdPro += r.qtd_apresentada;
      procQtdApr += r.qtd_aprovada;
      procValPro += r.val_apresentado;
      procValApr += r.val_aprovado;
    }
  });

  const totQtdPro = prodQtdPro + procQtdPro;
  const totQtdApr = prodQtdApr + procQtdApr;
  const totValPro = prodValPro + procValPro;
  const totValApr = prodValApr + procValApr;

  const ri = prodQtdApr > 0 ? procQtdApr / prodQtdApr : 0;
  const glosaQtdUn = totQtdPro - totQtdApr;
  const glosaValReais = totValPro - totValApr;
  const glosaQtdPct = totQtdPro > 0 ? (glosaQtdUn * 100) / totQtdPro : 0;
  const glosaValPct = totValPro > 0 ? (glosaValReais * 100) / totValPro : 0;

  const pctGastoProd = totValApr > 0 ? (prodValApr * 100) / totValApr : 0;
  if (kpiProdQtd) kpiProdQtd.textContent = fmtInt.format(prodQtdApr);
  if (kpiProdSub) {
    kpiProdSub.textContent = `${fmtBRL.format(prodValApr)} (${fmtDec1.format(pctGastoProd)}% do orçamento)`;
  }

  if (kpiProcQtd) kpiProcQtd.textContent = fmtInt.format(procQtdApr);
  if (kpiProcSub) {
    kpiProcSub.textContent = `${fmtBRL.format(procValApr)} • Avaliação, moldagem e ajustes`;
  }

  const invRi = ri > 0 ? fmtDec1.format(1 / ri) : '—';
  if (kpiRI) kpiRI.textContent = fmtDec4.format(ri);
  if (kpiRISub) {
    kpiRISub.textContent =
      ri > 0
        ? `1 atendimento clínico a cada ${invRi} equipamentos`
        : 'Sem registro simultâneo no filtro';
  }

  if (kpiValTotal) kpiValTotal.textContent = formatCompactBRL(totValApr);
  if (kpiValSub) {
    kpiValSub.textContent = `${fmtInt.format(faturamentos)} registros aprovados`;
  }
  if (kpiGlosa) {
    kpiGlosa.textContent = `Glosa: ${fmtDec2.format(glosaQtdPct)}% / ${fmtDec2.format(glosaValPct)}%`;
  }
}

function renderSigtapTable(): void {
  const tbSig = document.querySelector('#tableSigtapCatalog tbody');
  if (!tbSig) return;

  const q = state.sigtapSearch.trim().toLowerCase();
  const rows = DB.sigtap_catalog.filter(r => {
    if (!isModSelected(r.modalidade)) return false;
    if (state.sigtapTipo === 'Produto' && r.tipo_registro !== 'Produto') return false;
    if (state.sigtapTipo === 'Procedimento' && r.tipo_registro !== 'Procedimento') return false;
    if (state.sigtapTipo === 'ZERO' && !r.tarifa_zero_normativa) return false;
    if (
      q &&
      !(
        r.codigo_sigtap.toLowerCase().includes(q) ||
        r.modalidade.toLowerCase().includes(q) ||
        r.subcategoria_ta.toLowerCase().includes(q) ||
        (r.descricao_sigtap || r.categoria_ta).toLowerCase().includes(q)
      )
    ) {
      return false;
    }
    return true;
  });

  tbSig.innerHTML = rows
    .map(
      r => `
      <tr class="${r.tarifa_zero_normativa ? 'row-highlight' : ''}">
        <td><code><strong>${r.codigo_sigtap}</strong></code></td>
        <td><span class="tag tag-prod">${r.modalidade}</span></td>
        <td><code>${r.subcategoria_ta}</code></td>
        <td><strong>${r.descricao_sigtap || r.categoria_ta}</strong></td>
        <td><span class="tag ${r.tipo_registro === 'Produto' ? 'tag-prod' : 'tag-proc'}">${r.tipo_registro === 'Produto' ? 'Equipamento' : 'Ato Clínico'}</span></td>
        <td>${r.tarifa_zero_normativa ? '<span class="tag tag-zero">Custeio Global CER</span>' : '<span class="tag tag-ok">Pagamento Unitário</span>'}</td>
        <td class="num-col"><strong>${fmtInt.format(r.qtd_apr)}</strong></td>
        <td class="num-col">${fmtDec2.format(r.glosa_qtd_pct)}%</td>
        <td class="num-col"><strong>${r.tarifa_zero_normativa ? 'R$ 0,00' : fmtBRL.format(r.val_apr)}</strong></td>
      </tr>
    `
    )
    .join('');

  if (!sigtapExcluidosRendered) {
    const tbExc = document.querySelector('#tableSigtapExcluidos tbody');
    if (tbExc && DB.sigtap_excluidos_59) {
      tbExc.innerHTML = DB.sigtap_excluidos_59
        .map(
          (r, i) => `
      <tr>
        <td class="num-col">${i + 1}</td>
        <td><code><strong>${r.codigo_sigtap}</strong></code></td>
        <td><strong>${r.descricao_sigtap}</strong></td>
        <td><span class="tag tag-crit">${r.regra_exclusao}</span></td>
        <td><small>${r.motivo_exclusao}</small></td>
      </tr>
    `
        )
        .join('');
      sigtapExcluidosRendered = true;
    }
  }
}

function renderPolosMunicipaisRDS(): void {
  const tbPolosRds = document.querySelector('#tablePolosMunicipaisRDS tbody');
  if (!tbPolosRds || !DB.polos_municipais_oferta) return;

  const q = state.poloMunSearch.trim().toLowerCase();
  const rows = DB.polos_municipais_oferta.filter(r => {
    if (state.uf !== 'ALL' && r.uf !== state.uf) return false;
    if (state.municipioCod && r.cod_mun_6 !== state.municipioCod) return false;
    if (
      q &&
      !(
        r.municipio.toLowerCase().includes(q) ||
        r.uf.toLowerCase().includes(q) ||
        r.regiao_saude.toLowerCase().includes(q) ||
        r.cod_mun_6.includes(q)
      )
    ) {
      return false;
    }
    return true;
  });

  tbPolosRds.innerHTML = rows
    .slice(0, 120)
    .map(
      (r, i) => `
      <tr>
        <td class="num-col">${i + 1}</td>
        <td><strong>${r.municipio}</strong> <small style="color:var(--text-muted);">(${r.cod_mun_6})</small></td>
        <td><span class="tag tag-prod">${r.uf}</span></td>
        <td><small>${r.regiao_saude}</small></td>
        <td class="num-col">${fmtInt.format(r.pop_pcd_2022)}</td>
        <td class="num-col">${fmtInt.format(r.cnes_ativos)}</td>
        <td class="num-col"><strong>${fmtInt.format(r.prod_oferta)}</strong></td>
        <td class="num-col">${fmtInt.format(r.proc_oferta)}</td>
        <td class="num-col"><strong>${fmtBRL.format(r.val_oferta)}</strong></td>
        <td class="num-col"><span class="tag ${r.ri_oferta >= 0.15 ? 'tag-ok' : 'tag-zero'}">${fmtDec4.format(r.ri_oferta)}</span></td>
        <td class="num-col">${fmtInt.format(r.prod_residencia)}</td>
        <td class="num-col">${fmtDec2.format(r.taxa_res_1000pcd)}</td>
      </tr>
    `
    )
    .join('');
}

function renderStaticAndDynamicTables(): void {
  if (!staticTablesRendered) {
  // Table 1.2
  const tb12 = document.querySelector('#tableReconciliacao12 tbody');
  if (tb12) {
    tb12.innerHTML = DB.reconciliacao_anual_tabela_1_2
      .map(
        r => `
      <tr>
        <td><strong>${r.ano}</strong></td>
        <td><span class="tag ${r.tipo_registro.includes('Produto') ? 'tag-prod' : 'tag-proc'}">${r.tipo_registro}</span></td>
        <td class="num-col">${fmtInt.format(r.linhas_sia)}</td>
        <td class="num-col">${fmtInt.format(r.qtd_apresentada)}</td>
        <td class="num-col"><strong>${fmtInt.format(r.qtd_aprovada)}</strong></td>
        <td class="num-col">${fmtDec2.format(r.glosa_qtd_pct)}%</td>
        <td class="num-col">${fmtBRL.format(r.val_apresentado)}</td>
        <td class="num-col"><strong>${fmtBRL.format(r.val_aprovado)}</strong></td>
        <td class="num-col">${fmtDec2.format(r.glosa_val_pct)}%</td>
        <td class="num-col">${fmtInt.format(r.cnes_faturantes)}</td>
        <td class="num-col">${fmtInt.format(r.mun_oferta)}</td>
        <td class="num-col">${fmtInt.format(r.mun_residencia)}</td>
      </tr>
    `
      )
      .join('');
  }

  // Table 1.3
  const tb13 = document.querySelector('#tableEstratos13 tbody');
  if (tb13) {
    tb13.innerHTML = DB.estratos_analiticos_tabela_1_3
      .map(
        r => `
      <tr>
        <td><strong>${r.estrato}</strong></td>
        <td><span class="tag ${r.regime === 'Núcleo Estrito' ? 'tag-ok' : 'tag-zero'}">${r.regime}</span></td>
        <td class="num-col">${fmtInt.format(r.qtd_2024)} (${fmtDec1.format(r.pct_2024)}%)</td>
        <td class="num-col">${fmtBRL.format(r.val_2024)}</td>
        <td class="num-col"><strong>${fmtInt.format(r.qtd_trienio)}</strong></td>
        <td class="num-col"><strong>${fmtBRL.format(r.val_trienio)}</strong></td>
        <td><code>${r.denominador_censo}</code></td>
        <td class="num-col">${fmtDec2.format(r.tx_2024_1000pcd)}</td>
        <td class="num-col"><strong>${fmtDec2.format(r.tx_tri_1000pcd)}</strong></td>
        <td class="num-col">${fmtDec2.format(r.tx_tri_100k_hab)}</td>
      </tr>
    `
      )
      .join('');
  }

  // Table 1.1 Epistemological Matrix
  const tb11 = document.querySelector('#tableMatrizEpistemologica tbody');
  if (tb11) {
    tb11.innerHTML = DB.planos_epistemologicos_tabela_1_1
      .map(
        r => `
      <tr>
        <td><strong>${r.plano}</strong></td>
        <td>${r.taxonomia_leek_peng}</td>
        <td><small>${r.dominios}</small></td>
        <td>${r.perguntas_permitidas}</td>
        <td><strong>${r.indicadores_auditados}</strong></td>
        <td style="color:var(--rose);"><small>${r.zonas_silencio}</small></td>
      </tr>
    `
      )
      .join('');
  }

  // Table 2.1 Completeness
  const tb21 = document.querySelector('#tableCompletude21 tbody');
  if (tb21) {
    tb21.innerHTML = DB.completude_tabela_2_1
      .map(
        r => `
      <tr>
        <td><strong>${r.modalidade}</strong> — <span class="tag ${r.tipo === 'Produto' ? 'tag-prod' : 'tag-proc'}">${r.tipo}</span></td>
        <td class="num-col">${fmtInt.format(r.faturamentos)}</td>
        <td class="num-col">${fmtInt.format(r.qtd_aprovada)}</td>
        <td class="num-col">${r.val_aprovado === 0 ? '<span class="tag tag-zero">R$ 0,00 (Custeio CER)</span>' : fmtBRL.format(r.val_aprovado)}</td>
        <td class="num-col"><strong>${fmtDec2.format(r.cid10_pct)}%</strong></td>
        <td class="num-col"><strong>${fmtDec2.format(r.cbo_pct)}%</strong></td>
        <td class="num-col"><strong>${fmtDec2.format(r.sexo_pct)}%</strong></td>
        <td class="num-col">${fmtDec2.format(r.idade_pct)}%</td>
        <td class="num-col">${fmtDec2.format(r.raca_pct)}%</td>
      </tr>
    `
      )
      .join('');
  }
  } // fim bloco estático inicial (1.2, 1.3, 1.1, 2.1)

  // Table 2.2 CBO (dinâmica por modalidade)
  const tb22 = document.querySelector('#tableCBO22 tbody');
  if (tb22) {
    tb22.innerHTML = DB.cbo_tabela_2_2
      .filter(r => isModSelected(r.modalidade))
      .map(
        r => `
        <tr>
          <td><span class="tag tag-prod">${r.modalidade}</span></td>
          <td><strong>${r.categoria_cbo}</strong></td>
          <td class="num-col">${fmtInt.format(r.faturamentos)} (${fmtDec1.format(r.pct_fat)}%)</td>
          <td class="num-col">${fmtInt.format(r.qtd_aprovada)}</td>
          <td class="num-col">${fmtBRL.format(r.val_aprovado)}</td>
          <td class="num-col"><strong>${fmtDec2.format(r.pct_val)}%</strong></td>
        </tr>
      `
      )
      .join('');
  }

  // Table 2.3 CID-10
  const tb23 = document.querySelector('#tableCID23 tbody');
  if (tb23) {
    tb23.innerHTML = DB.cid10_tabela_2_3
      .filter(r => isModSelected(r.modalidade))
      .map(
        r => `
        <tr>
          <td><span class="tag tag-prod">${r.modalidade}</span></td>
          <td><code><strong>${r.cid10}</strong></code></td>
          <td>${r.descricao}</td>
          <td class="num-col">${fmtInt.format(r.faturamentos)}</td>
          <td class="num-col"><strong>${fmtInt.format(r.qtd_aprovada)}</strong></td>
          <td class="num-col">${r.val_aprovado === 0 ? '<span class="tag tag-zero">R$ 0,00</span>' : fmtBRL.format(r.val_aprovado)}</td>
        </tr>
      `
      )
      .join('');
  }

  if (!staticTablesRendered) {
  // Table 3.1 Economy
  const tb31 = document.querySelector('#tableEconomia31 tbody');
  if (tb31) {
    tb31.innerHTML = DB.economia_politica_tabela_3_1
      .map(r => {
        let tagClass = 'tag-prod';
        if (r.estrato1.includes('Filantrópica') || r.estrato2.includes('Filantrópica')) tagClass = 'tag-filantropica';
        else if (r.estrato1.includes('Privada') || r.estrato2.includes('Privada')) tagClass = 'tag-privada';
        else if (r.estrato1.includes('Pública') || r.estrato2.includes('Pública')) tagClass = 'tag-publica';
        return `
        <tr class="${r.estrato1.includes('Oficinas') ? 'row-highlight' : ''}">
          <td><small>${r.dimensao}</small></td>
          <td><strong>${r.estrato1}</strong></td>
          <td><span class="tag ${tagClass}">${r.estrato2}</span></td>
          <td class="num-col">${fmtInt.format(r.cnes)}</td>
          <td class="num-col">${fmtInt.format(r.produtos_un)}</td>
          <td class="num-col">R$ ${fmtDec2.format(r.valor_produtos_mi)} mi</td>
          <td class="num-col"><strong>${fmtInt.format(r.atos_clinicos)}</strong></td>
          <td class="num-col">${fmtDec2.format(r.glosa_qtd_pct)}%</td>
          <td class="num-col">${fmtDec2.format(r.glosa_val_pct)}%</td>
          <td class="num-col"><strong>${fmtDec4.format(r.razao_integralidade)}</strong></td>
        </tr>
      `;
      })
      .join('');
  }

  // Table 3.3 Quasi-Poisson
  const tb33 = document.querySelector('#tableQuasiPoisson33 tbody');
  if (tb33) {
    tb33.innerHTML = DB.modelo_quasi_poisson_tabela_3_3
      .map(
        r => `
      <tr class="${r.significativo ? 'row-highlight' : ''}">
        <td><strong>${r.termo}</strong></td>
        <td class="num-col">${fmtDec4.format(r.beta)}</td>
        <td class="num-col"><strong>${fmtDec4.format(r.rr)}</strong></td>
        <td class="num-col"><small>${r.ic95}</small></td>
        <td class="num-col"><span class="tag ${r.significativo ? 'tag-ok' : 'tag-zero'}">${r.p_valor}</span></td>
      </tr>
    `
      )
      .join('');
  }
  } // fim bloco estático 3.1 / 3.3

  // Table Top CNES (with real Municipality and Health Region names from Zenodo RDS!)
  const tbCNES = document.querySelector('#tableTopCNES tbody');
  if (tbCNES) {
    tbCNES.innerHTML = DB.top_cnes
      .filter(
        r =>
          (state.uf === 'ALL' || r.uf === state.uf) &&
          (state.macro === 'ALL' || r.macrorregiao === state.macro) &&
          (!state.municipioCod || r.cod_mun_6 === state.municipioCod)
      )
      .slice(0, 50)
      .map(
        (r, i) => `
        <tr>
          <td class="num-col">${i + 1}</td>
          <td><code><strong>${r.cnes}</strong></code></td>
          <td><strong>${r.municipio_nome || r.cod_mun_6}</strong> (${r.uf})</td>
          <td><small>${r.regiao_saude_nome || '—'}</small></td>
          <td class="num-col">${r.anos_ativos}/3</td>
          <td class="num-col">${fmtInt.format(r.prod_apr)}</td>
          <td class="num-col"><strong>${fmtInt.format(r.proc_apr)}</strong></td>
          <td class="num-col"><strong>${fmtBRL.format(r.val_total)}</strong></td>
          <td class="num-col">${fmtInt.format(r.mun_atendidos)}</td>
          <td class="num-col">${fmtDec2.format(r.glosa_fisica_pct)}%</td>
          <td class="num-col"><span class="tag ${r.razao_integralidade >= 0.1524 ? 'tag-ok' : 'tag-zero'}">${fmtDec4.format(r.razao_integralidade)}</span></td>
        </tr>
      `
      )
      .join('');
  }

  if (!staticTablesRendered) {
  // Table 4.1 Spatial Justice
  const tb41 = document.querySelector('#tableJustica41 tbody');
  if (tb41) {
    tb41.innerHTML = DB.justica_espacial_tabela_4_1
      .map(
        r => `
      <tr class="${r.estrato.includes('Total') || r.estrato.includes('Q1') || r.estrato.includes('Q5') ? 'row-highlight' : ''}">
        <td>${r.dimensao}</td>
        <td><strong>${r.estrato}</strong></td>
        <td class="num-col">${fmtInt.format(r.municipios)}</td>
        <td class="num-col">${fmtInt.format(r.pcd_2022)}</td>
        <td class="num-col">${fmtDec2.format(r.pct_mun_prod_res)}%</td>
        <td class="num-col">${fmtDec2.format(r.pct_mun_atos_res)}%</td>
        <td class="num-col"><strong>${fmtDec2.format(r.pct_mun_prod_ofe)}%</strong></td>
        <td class="num-col"><strong style="color:var(--rose);">${fmtDec2.format(r.pct_mun_atos_ofe)}%</strong></td>
        <td class="num-col">${fmtDec2.format(r.taxa_prod_res_1000pcd)}</td>
        <td class="num-col"><strong>${fmtDec2.format(r.taxa_atos_res_1000pcd)}</strong></td>
        <td class="num-col"><span class="tag ${r.ri_res >= 0.15 ? 'tag-ok' : 'tag-crit'}">${fmtDec4.format(r.ri_res)}</span></td>
      </tr>
    `
      )
      .join('');
  }

  // Table 4.2 Inequality Indices
  const tb42 = document.querySelector('#tableIndices42 tbody');
  if (tb42) {
    tb42.innerHTML = DB.indices_desigualdade_tabela_4_2
      .map(
        r => `
      <tr>
        <td><strong>${r.indicador}</strong></td>
        <td class="num-col">${fmtDec2.format(r.media_pond)}</td>
        <td class="num-col"><strong>${fmtDec2.format(r.sii)}</strong><br/><small>${r.sii_ic95}</small></td>
        <td class="num-col"><strong style="color:var(--amber);">${fmtDec4.format(r.rii)}</strong><br/><small>${r.rii_ic95}</small></td>
        <td class="num-col">${fmtDec4.format(r.conc_c)}</td>
        <td class="num-col"><strong>${fmtDec4.format(r.wagstaff_w)}</strong></td>
        <td class="num-col">${fmtDec4.format(r.erreygers_e)}</td>
      </tr>
    `
      )
      .join('');
  }

  // Table 4.3 Moran & LISA
  const tb43 = document.querySelector('#tableMoran43 tbody');
  if (tb43) {
    tb43.innerHTML = DB.moran_lisa_tabela_4_3
      .map(r => {
        let badge = 'tag-prod';
        if (r.cluster_lisa.includes('Baixo-Baixo')) badge = 'tag-crit';
        else if (r.cluster_lisa.includes('Alto-Alto')) badge = 'tag-ok';
        return `
        <tr>
          <td><small>${r.indicador}</small></td>
          <td class="num-col">${fmtDec4.format(r.moran_i)} (${r.p_valor})</td>
          <td><span class="tag ${badge}">${r.cluster_lisa}</span></td>
          <td class="num-col"><strong>${fmtInt.format(r.municipios)}</strong></td>
          <td class="num-col">${fmtDec2.format(r.pct_mun)}%</td>
          <td class="num-col">${fmtInt.format(r.pcd_2022)}</td>
          <td class="num-col">${fmtBRL.format(r.pib_pc_medio)}</td>
        </tr>
      `;
      })
      .join('');
  }
  } // fim bloco estático 4.1 / 4.2 / 4.3

  // Table Resumo 27 UFs + Interactive UF Tile Map (enriched with Censo 2022 PwD denominator!)
  const targetYear = state.ano === 'ALL' ? 'Triênio' : String(state.ano);
  const badgeUfYear = getEl('badgeUfTableYear');
  if (badgeUfYear) badgeUfYear.textContent = `Competência: ${targetYear}`;

  const ufsRows = DB.resumo_uf
    .filter(r => r.ano === targetYear && (state.macro === 'ALL' || r.macrorregiao === state.macro))
    .sort((a, b) => b.prod_val_apr + b.proc_val_apr - (a.prod_val_apr + a.proc_val_apr));

  const tbUFs = document.querySelector('#tableResumo27UFs tbody');
  if (tbUFs) {
    tbUFs.innerHTML = ufsRows
      .map(
        r => `
      <tr class="${state.uf === r.uf ? 'row-highlight' : ''}" style="cursor:pointer;" data-uf-click="${r.uf}">
        <td><strong>${r.uf}</strong></td>
        <td>${r.uf_nome}</td>
        <td>${r.macrorregiao}</td>
        <td class="num-col">${fmtInt.format(r.pop_pcd_censo2022 || 0)}</td>
        <td class="num-col">${fmtInt.format(r.cnes_ativos)}</td>
        <td class="num-col">${fmtInt.format(r.mun_oferta)}</td>
        <td class="num-col"><strong>${fmtInt.format(r.prod_qtd_apr)}</strong></td>
        <td class="num-col"><strong>${fmtDec2.format(r.taxa_prod_1000pcd || 0)}</strong></td>
        <td class="num-col">${fmtInt.format(r.proc_qtd_apr)}</td>
        <td class="num-col">${fmtBRL.format(r.prod_val_apr + r.proc_val_apr)}</td>
        <td class="num-col">${fmtDec1.format(r.pct_prod_intermun)}%</td>
        <td class="num-col"><span class="tag ${r.razao_integralidade >= 0.1524 ? 'tag-ok' : r.razao_integralidade < 0.05 ? 'tag-crit' : 'tag-zero'}">${fmtDec4.format(r.razao_integralidade)}</span></td>
      </tr>
    `
      )
      .join('');
  }

  // Brazil UF Tile Map
  const ufGrid = getEl('brazilUfGrid');
  if (ufGrid) {
    const allUfsTarget = DB.resumo_uf.filter(r => r.ano === targetYear).sort((a, b) => a.uf.localeCompare(b.uf));
    ufGrid.innerHTML = allUfsTarget
      .map(r => {
        const isSelected = state.uf === r.uf;
        let riColor = 'var(--amber)';
        if (r.razao_integralidade >= 0.1524) riColor = 'var(--emerald)';
        else if (r.razao_integralidade < 0.04) riColor = 'var(--rose)';
        return `
        <div class="uf-tile ${isSelected ? 'selected' : ''}" data-uf-click="${r.uf}" title="${r.uf_nome} — Clique para filtrar">
          <div class="uf-tile-header">
            <span class="uf-sigla">${r.uf}</span>
            <span class="uf-macro-tag">${r.macrorregiao}</span>
          </div>
          <div style="font-size:11.5px;color:var(--text-secondary);">Prod: <strong>${fmtInt.format(r.prod_qtd_apr)}</strong></div>
          <div style="font-size:11.5px;color:var(--text-secondary);">Tx/1k PcD: <strong>${fmtDec1.format(r.taxa_prod_1000pcd || 0)}</strong></div>
          <div style="font-size:11.5px;margin-top:4px;font-family:var(--font-mono);color:${riColor};">RI: <strong>${fmtDec4.format(r.razao_integralidade)}</strong></div>
        </div>
      `;
      })
      .join('');
  }

  renderPolosMunicipaisRDS();

  if (!staticTablesRendered) {
  // Table 5.1 Hurdle NB
  const tb51 = document.querySelector('#tableHurdle51 tbody');
  if (tb51) {
    tb51.innerHTML = DB.modelo_hurdle_tabela_5_1
      .map(
        r => `
      <tr class="${r.significativo ? 'row-highlight' : ''}">
        <td><small>${r.modelo}</small></td>
        <td><span class="tag ${r.estagio.includes('Logit') ? 'tag-prod' : 'tag-proc'}">${r.estagio}</span></td>
        <td><strong>${r.termo}</strong></td>
        <td class="num-col">${fmtDec4.format(r.estimativa)}</td>
        <td class="num-col"><strong>${fmtDec4.format(r.or_irr)}</strong></td>
        <td class="num-col"><small>${r.ic95}</small></td>
        <td class="num-col"><span class="tag ${r.significativo ? 'tag-ok' : 'tag-zero'}">${r.p_valor}</span></td>
      </tr>
    `
      )
      .join('');
  }

  // Table 5.2 O-D Network Macro
  const tb52 = document.querySelector('#tableRedes52 tbody');
  if (tb52) {
    tb52.innerHTML = DB.redes_od_macro_tabela_5_2
      .map(
        r => `
      <tr class="${r.macrorregiao.includes('Norte') || r.macrorregiao.includes('Brasil') ? 'row-highlight' : ''}">
        <td><strong>${r.macrorregiao}</strong></td>
        <td class="num-col">${fmtInt.format(r.arcos_intermun)}</td>
        <td class="num-col">${fmtDec2.format(r.pct_prod_intermun)}%</td>
        <td class="num-col">${fmtDec2.format(r.pct_atos_intermun)}%</td>
        <td class="num-col">${fmtDec2.format(r.pct_cruza_rs)}%</td>
        <td class="num-col">${fmtDec2.format(r.pct_cruza_uf)}%</td>
        <td class="num-col"><strong style="color:var(--amber);">${fmtDec2.format(r.dist_media_km)} km</strong></td>
        <td class="num-col">${fmtDec2.format(r.mediana_km)} km</td>
      </tr>
    `
      )
      .join('');
  }

  // Table 5.3 Top 15 Attractor Hubs
  const tb53 = document.querySelector('#tablePolos53 tbody');
  if (tb53) {
    tb53.innerHTML = DB.top15_polos_tabela_5_3
      .map(
        r => `
      <tr>
        <td><strong>${r.polo}</strong></td>
        <td>${r.macrorregiao}</td>
        <td class="num-col">${fmtInt.format(r.produtos)}</td>
        <td class="num-col"><strong>${fmtInt.format(r.atos_clinicos)}</strong></td>
        <td class="num-col"><span class="tag ${r.razao_integralidade >= 0.15 ? 'tag-ok' : r.razao_integralidade < 0.02 ? 'tag-crit' : 'tag-zero'}">${fmtDec4.format(r.razao_integralidade)}</span></td>
        <td class="num-col">${fmtBRL.format(r.valor_aprovado)}</td>
        <td class="num-col"><strong>${fmtInt.format(r.in_degree_mun)} mun.</strong></td>
        <td class="num-col">${fmtDec2.format(r.dist_media_km)} km</td>
        <td class="num-col">${fmtDec2.format(r.pct_nac)}%</td>
        <td><small>${r.perfil_auditoria}</small></td>
      </tr>
    `
      )
      .join('');
  }
  } // fim bloco estático 5.1 / 5.2 / 5.3

  // Table Top Intermunicipal Arcs enriched with real names and SIRGAS 2000 distances!
  const tbArcos = document.querySelector('#tableArcosOD tbody');
  if (tbArcos && DB.top_arcos_od_intermunicipais) {
    tbArcos.innerHTML = DB.top_arcos_od_intermunicipais
      .filter(
        r =>
          (state.uf === 'ALL' || r.uf_destino === state.uf) &&
          (state.macro === 'ALL' || r.macrorregiao_destino === state.macro) &&
          (!state.municipioCod || r.mun_origem === state.municipioCod || r.mun_destino === state.municipioCod)
      )
      .slice(0, 60)
      .map(
        (r, idx) => `
          <tr>
            <td class="num-col">${idx + 1}</td>
            <td><strong>${r.mun_origem_nome || r.mun_origem}</strong></td>
            <td><strong>${r.mun_destino_nome || r.mun_destino}</strong></td>
            <td>${r.macrorregiao_destino}</td>
            <td class="num-col"><strong>${fmtDec1.format(r.distancia_km || 0)} km</strong></td>
            <td>${r.cruza_regiao_saude ? '<span class="tag tag-zero">Sim (Inter-RS)</span>' : '<span class="tag tag-ok">Mesma RS</span>'}</td>
            <td class="num-col">${fmtInt.format(r.prod_apr)}</td>
            <td class="num-col">${fmtInt.format(r.proc_apr)}</td>
            <td class="num-col">${fmtBRL.format(r.val_apr)}</td>
            <td class="num-col">${fmtDec4.format(r.razao_integralidade)}</td>
          </tr>
        `
      )
      .join('');
  }

  renderSigtapTable();

  if (!staticTablesRendered) {
  // Table 35 Zenodo Files Inventory
  const tbZen = document.querySelector('#tableArquivosZenodo35 tbody');
  if (tbZen && DB.arquivos_zenodo_35) {
    tbZen.innerHTML = DB.arquivos_zenodo_35
      .map(
        (r, idx) => `
      <tr>
        <td class="num-col">${idx + 1}</td>
        <td><code><strong>${r.arquivo}</strong></code></td>
        <td><span class="tag tag-prod">${r.extensao.toUpperCase()}</span></td>
        <td class="num-col">${fmtDec1.format(r.tamanho_kb)} KB</td>
        <td><small style="font-family:var(--font-mono);color:var(--text-muted);">${r.checksum}</small></td>
        <td>
          <span class="tag tag-ok">Sincronizado</span>
          <a href="${r.url_download}" target="_blank" rel="noopener noreferrer" style="margin-left:8px;color:var(--primary);font-size:12px;text-decoration:none;font-weight:600;">Zenodo ↗</a>
        </td>
      </tr>
    `
      )
      .join('');
  }

  // Checklists RECORD & GATHER
  const tbRec = document.querySelector('#tableChecklistRecord tbody');
  if (tbRec) {
    tbRec.innerHTML = DB.checklist_record
      .map(
        r => `
      <tr>
        <td><span class="tag tag-prod"><strong>${r.codigo}</strong></span></td>
        <td><strong>${r.secao}</strong></td>
        <td>${r.requisito}</td>
        <td>${r.conformidade_sistema}</td>
        <td><small>${r.localizacao}</small></td>
      </tr>
    `
      )
      .join('');
  }

  const tbGat = document.querySelector('#tableChecklistGather tbody');
  if (tbGat) {
    tbGat.innerHTML = DB.checklist_gather
      .map(
        r => `
      <tr>
        <td class="num-col"><strong>#${r.item}</strong></td>
        <td><strong>${r.secao}</strong></td>
        <td>${r.requisito}</td>
        <td><span class="tag tag-ok">${r.status}</span></td>
        <td>${r.evidencia}</td>
      </tr>
    `
      )
      .join('');
  }
  staticTablesRendered = true;
  } // fim bloco estático Zenodo / RECORD / GATHER
}

function renderCharts(forceStatic = false): void {
  const isDark = document.body.classList.contains('dark-theme');
  const textColor = isDark ? '#cbd5e1' : '#475569';
  const gridColor = isDark ? 'rgba(148, 163, 184, 0.1)' : 'rgba(15, 23, 42, 0.06)';
  const tooltipBg = isDark ? 'rgba(15, 23, 42, 0.96)' : 'rgba(15, 23, 42, 0.92)';

  Chart.defaults.color = textColor;
  Chart.defaults.font.family = "'Inter', sans-serif";
  if (Chart.defaults.animation && typeof Chart.defaults.animation === 'object') {
    Chart.defaults.animation.duration = 200;
  }
  Chart.defaults.plugins.tooltip.backgroundColor = tooltipBg;
  Chart.defaults.plugins.tooltip.padding = 10;
  Chart.defaults.plugins.tooltip.cornerRadius = 8;

  const pointerHover = (event: any, elements: any[]) => {
    const target = event?.native?.target as HTMLElement | undefined;
    if (target) target.style.cursor = elements.length > 0 ? 'pointer' : 'default';
  };

  function createOrUpdateChart(id: string, config: any): void {
    pendingChartConfigs[id] = config;
    const ctx = getEl<HTMLCanvasElement>(id);
    if (ctx && isCanvasVisible(ctx)) {
      mountChartClean(ctx, id, config);
    } else if (charts[id]) {
      charts[id].destroy();
      delete charts[id];
    }
  }

  // 1. Chart Série Mensal (interativo: clique no mês filtra o ano)
  const serieFiltered = DB.serie_mensal.filter(d => state.ano === 'ALL' || String(d.ano) === String(state.ano));
  createOrUpdateChart('chartSerieMensal', {
    type: 'bar',
    data: {
      labels: serieFiltered.map(d => d.competencia),
      datasets: [
        {
          type: 'line',
          label: 'Índice de Acompanhamento',
          data: serieFiltered.map(d => d.razao_integralidade),
          borderColor: '#d97706',
          backgroundColor: '#d97706',
          borderWidth: 2,
          pointRadius: 2.5,
          pointHoverRadius: 5,
          yAxisID: 'y1',
          tension: 0.25
        },
        {
          type: 'bar',
          label: 'Equipamentos Entregues',
          data: serieFiltered.map(d => d.prod_qtd_apr),
          backgroundColor: '#0284c7',
          hoverBackgroundColor: '#0369a1',
          borderRadius: 3,
          yAxisID: 'y'
        },
        {
          type: 'bar',
          label: 'Atendimentos de Adaptação',
          data: serieFiltered.map(d => d.proc_qtd_apr),
          backgroundColor: '#0d9488',
          hoverBackgroundColor: '#0f766e',
          borderRadius: 3,
          yAxisID: 'y'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      onHover: pointerHover,
      onClick: (_ev: any, els: any[]) => {
        if (!els.length) return;
        const item = serieFiltered[els[0].index];
        if (!item) return;
        const clickedAno = String(item.ano) as FiltroGlobalState['ano'];
        state.ano = state.ano === clickedAno ? 'ALL' : clickedAno;
        const selAno = getEl<HTMLSelectElement>('filterAno');
        if (selAno) selAno.value = state.ano;
        scheduleRefreshAll();
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: (ctx: any) => {
              const val = Number(ctx.parsed.y ?? 0);
              if (ctx.dataset.yAxisID === 'y1') return ` ${ctx.dataset.label}: ${fmtDec4.format(val)}`;
              return ` ${ctx.dataset.label}: ${fmtInt.format(val)}`;
            }
          }
        }
      },
      scales: {
        x: { grid: { display: false } },
        y: { type: 'linear', position: 'left', grid: { color: gridColor } },
        y1: { type: 'linear', position: 'right', grid: { drawOnChartArea: false }, min: 0, suggestedMax: 0.25 }
      }
    }
  });

  // 2. Chart Modalidades Cap 1 + 2B. Chart Equipamentos Entregues (reage aos checkboxes multi-seleção)
  const modOrder: ModalidadeISO9999[] = ['TA04', 'TA01', 'TA05', 'TA02', 'TA10', 'TA03', 'TA06'];
  const modLabels: Record<ModalidadeISO9999, string> = {
    TA04: 'TA04 Audição',
    TA01: 'TA01 Mobilidade',
    TA05: 'TA05 Visão',
    TA02: 'TA02 Órteses',
    TA10: 'TA10 Posicionamento',
    TA03: 'TA03 Próteses',
    TA06: 'TA06 Vocal'
  };
  const modColors: Record<ModalidadeISO9999, string> = {
    TA04: '#0284c7',
    TA01: '#0d9488',
    TA05: '#4f46e5',
    TA02: '#d97706',
    TA10: '#059669',
    TA03: '#e11d48',
    TA06: '#7c3aed'
  };
  const activeModOrder = modOrder.filter(m => isModSelected(m));
  const filteredCubo = getFilteredCubo();
  const modProd: Record<string, number> = {};
  const modProc: Record<string, number> = {};
  const modVal: Record<string, number> = {};
  modOrder.forEach(m => {
    modProd[m] = 0;
    modProc[m] = 0;
    modVal[m] = 0;
  });
  filteredCubo.forEach(r => {
    if (r.tipo_registro === 'Produto') {
      modProd[r.modalidade] = (modProd[r.modalidade] || 0) + r.qtd_aprovada;
      modVal[r.modalidade] = (modVal[r.modalidade] || 0) + r.val_aprovado;
    } else {
      modProc[r.modalidade] = (modProc[r.modalidade] || 0) + r.qtd_aprovada;
    }
  });

  // 2B. Gráfico Dedicado: Produtos, Atos Clínicos, Valor Total, Taxa Prod, Taxa Atos, RI e Produtos + Valor Total
  const prodOnlyCubo = filteredCubo.filter(r => r.tipo_registro === 'Produto');
  const procOnlyCubo = filteredCubo.filter(r => r.tipo_registro === 'Procedimento');
  const totalEquipFiltrado = prodOnlyCubo.reduce((acc, r) => acc + r.qtd_aprovada, 0);
  const totalProcFiltrado = procOnlyCubo.reduce((acc, r) => acc + r.qtd_aprovada, 0);
  const totalOrcFiltrado = filteredCubo.reduce((acc, r) => acc + r.val_aprovado, 0);
  const riGlobalFiltrado = totalEquipFiltrado > 0 ? totalProcFiltrado / totalEquipFiltrado : 0;

  // Denominador populacional PcD (Censo IBGE 2022) conforme filtro territorial ativo
  const ufTrienioRows = DB.resumo_uf.filter(r => r.ano === 'Triênio');
  const pcdDenomGlobal = ufTrienioRows
    .filter(
      r =>
        (state.macro === 'ALL' || r.macrorregiao === state.macro) &&
        (state.uf === 'ALL' || r.uf === state.uf)
    )
    .reduce((acc, r) => acc + Number(r.pop_pcd_censo2022 || 0), 0);

  const modValTotal: Record<string, number> = {};
  modOrder.forEach(m => {
    modValTotal[m] = 0;
  });
  filteredCubo.forEach(r => {
    modValTotal[r.modalidade] = (modValTotal[r.modalidade] || 0) + r.val_aprovado;
  });

  const modClearCategoryNames: Record<ModalidadeISO9999, string> = {
    TA04: 'Audição (Aparelhos Auditivos / FM)',
    TA01: 'Locomoção (Cadeiras / Andadores)',
    TA05: 'Visão e Baixa Visão (Óculos / Próteses)',
    TA02: 'Órteses Ortopédicas',
    TA10: 'Adequação Postural',
    TA03: 'Próteses de Membros',
    TA06: 'Reabilitação Vocal'
  };

  const equipTitleEl = getEl('equipChartTitle');
  const equipSubEl = getEl('equipChartSubtitle');
  const thEquipGroupEl = getEl('thEquipGroupLabel');

  interface EquipGroupStat {
    key: string;
    label: string;
    qtd: number;
    proc: number;
    val: number;
    taxaProd: number;
    taxaAtos: number;
    ri: number;
    color: string;
  }

  let statsList: EquipGroupStat[] = [];
  if (state.equipChartGroup === 'ano') {
    if (thEquipGroupEl) thEquipGroupEl.textContent = 'Ano de Competência';
    const anosList = ['2022', '2023', '2024'];
    statsList = anosList.map((a, idx) => {
      const qtd = prodOnlyCubo.filter(r => String(r.ano) === a).reduce((acc, r) => acc + r.qtd_aprovada, 0);
      const proc = procOnlyCubo.filter(r => String(r.ano) === a).reduce((acc, r) => acc + r.qtd_aprovada, 0);
      const val = filteredCubo.filter(r => String(r.ano) === a).reduce((acc, r) => acc + r.val_aprovado, 0);
      return {
        key: a,
        label: `Ano ${a}`,
        qtd,
        proc,
        val,
        taxaProd: pcdDenomGlobal > 0 ? (qtd * 1000) / pcdDenomGlobal : 0,
        taxaAtos: pcdDenomGlobal > 0 ? (proc * 1000) / pcdDenomGlobal : 0,
        ri: qtd > 0 ? proc / qtd : 0,
        color: ['#0284c7', '#0d9488', '#059669'][idx]
      };
    });
  } else if (state.equipChartGroup === 'regiao') {
    if (thEquipGroupEl) thEquipGroupEl.textContent = 'Região do Brasil';
    const macroList: MacrorregiaoBrasil[] = ['Sudeste', 'Nordeste', 'Sul', 'Centro-Oeste', 'Norte'];
    statsList = macroList.map((mc, idx) => {
      const qtd = prodOnlyCubo.filter(r => r.macrorregiao === mc).reduce((acc, r) => acc + r.qtd_aprovada, 0);
      const proc = procOnlyCubo.filter(r => r.macrorregiao === mc).reduce((acc, r) => acc + r.qtd_aprovada, 0);
      const val = filteredCubo.filter(r => r.macrorregiao === mc).reduce((acc, r) => acc + r.val_aprovado, 0);
      const pcdMacro = ufTrienioRows
        .filter(r => r.macrorregiao === mc)
        .reduce((acc, r) => acc + Number(r.pop_pcd_censo2022 || 0), 0);
      return {
        key: mc,
        label: mc,
        qtd,
        proc,
        val,
        taxaProd: pcdMacro > 0 ? (qtd * 1000) / pcdMacro : 0,
        taxaAtos: pcdMacro > 0 ? (proc * 1000) / pcdMacro : 0,
        ri: qtd > 0 ? proc / qtd : 0,
        color: ['#0284c7', '#d97706', '#059669', '#4f46e5', '#e11d48'][idx]
      };
    });
  } else {
    if (thEquipGroupEl) thEquipGroupEl.textContent = 'Categoria de Equipamento';
    statsList = activeModOrder.map(m => {
      const qtd = modProd[m] || 0;
      const proc = modProc[m] || 0;
      const val = modValTotal[m] || 0;
      return {
        key: m,
        label: modClearCategoryNames[m],
        qtd,
        proc,
        val,
        taxaProd: pcdDenomGlobal > 0 ? (qtd * 1000) / pcdDenomGlobal : 0,
        taxaAtos: pcdDenomGlobal > 0 ? (proc * 1000) / pcdDenomGlobal : 0,
        ri: qtd > 0 ? proc / qtd : 0,
        color: modColors[m]
      };
    });
  }

  const selectedMetrics: EquipChartMetricKey[] =
    state.equipChartMetrics.length > 0 ? state.equipChartMetrics : ['equipamentos'];
  const primaryMetric = selectedMetrics[0];

  // Ordena pelo primeiro indicador marcado (exceto por Ano, que mantém ordem cronológica)
  if (state.equipChartGroup !== 'ano') {
    statsList.sort((a, b) => {
      if (primaryMetric === 'atos') return b.proc - a.proc;
      if (primaryMetric === 'orcamento') return b.val - a.val;
      if (primaryMetric === 'taxa_prod') return b.taxaProd - a.taxaProd;
      if (primaryMetric === 'taxa_atos') return b.taxaAtos - a.taxaAtos;
      if (primaryMetric === 'ri') return b.ri - a.ri;
      return b.qtd - a.qtd;
    });
  }

  const equipLabels = statsList.map(s => s.label);
  const equipKeys = statsList.map(s => s.key);
  const equipValues = statsList.map(s => s.qtd);
  const equipProcVals = statsList.map(s => s.proc);
  const equipValsBRL = statsList.map(s => s.val);
  const equipTaxaProdVals = statsList.map(s => Number(s.taxaProd.toFixed(2)));
  const equipTaxaAtosVals = statsList.map(s => Number(s.taxaAtos.toFixed(2)));
  const equipRiVals = statsList.map(s => Number(s.ri.toFixed(4)));
  const equipColors = statsList.map(s => s.color);

  const isVerticalEquip = state.equipChartGroup === 'ano';
  const isMultiMetric = selectedMetrics.length > 1;

  if (equipTitleEl) {
    if (isMultiMetric) {
      equipTitleEl.textContent = `Comparativo: ${selectedMetrics.map(k => EQUIP_METRIC_SHORT[k]).join(' + ')}`;
    } else if (primaryMetric === 'atos') {
      equipTitleEl.textContent = 'Atos Clínicos de Adaptação por Categoria';
    } else if (primaryMetric === 'orcamento') {
      equipTitleEl.textContent = 'Valor Total Aprovado (R$)';
    } else if (primaryMetric === 'taxa_prod') {
      equipTitleEl.textContent = 'Taxa de Produtos por 1.000 PcD (Censo 2022)';
    } else if (primaryMetric === 'taxa_atos') {
      equipTitleEl.textContent = 'Taxa de Atos Clínicos por 1.000 PcD (Censo 2022)';
    } else if (primaryMetric === 'ri') {
      equipTitleEl.textContent = 'Razão de Integralidade (RI — Índice de Acompanhamento)';
    } else {
      equipTitleEl.textContent = 'Equipamentos Entregues por Categoria — Produtos (un.)';
    }
  }

  const activeCatsTag =
    state.modalidades.length === 0
      ? 'Todas as 7 categorias'
      : state.modalidades.map(m => MOD_SHORT_NAMES[m]).join(', ');

  if (equipSubEl) {
    const scopeStr =
      state.equipChartGroup === 'ano'
        ? `por ano • Categorias: ${activeCatsTag}`
        : state.equipChartGroup === 'regiao'
        ? `por região • Categorias: ${activeCatsTag}`
        : `por categoria de equipamento (${activeModOrder.length})`;

    if (isMultiMetric) {
      equipSubEl.textContent = `${fmtInt.format(totalEquipFiltrado)} produtos • ${fmtInt.format(totalProcFiltrado)} atos • ${formatCompactBRL(totalOrcFiltrado)} • RI ${fmtDec4.format(riGlobalFiltrado)} (${scopeStr})`;
    } else if (primaryMetric === 'atos') {
      equipSubEl.textContent = `Total: ${fmtInt.format(totalProcFiltrado)} atos clínicos (${scopeStr})`;
    } else if (primaryMetric === 'orcamento') {
      equipSubEl.textContent = `Valor total aprovado: ${formatCompactBRL(totalOrcFiltrado)} (${scopeStr})`;
    } else if (primaryMetric === 'taxa_prod') {
      const txGlobal = pcdDenomGlobal > 0 ? (totalEquipFiltrado * 1000) / pcdDenomGlobal : 0;
      equipSubEl.textContent = `Taxa média no recorte: ${fmtDec2.format(txGlobal)} produtos / 1.000 PcD (${scopeStr})`;
    } else if (primaryMetric === 'taxa_atos') {
      const txAtosGlobal = pcdDenomGlobal > 0 ? (totalProcFiltrado * 1000) / pcdDenomGlobal : 0;
      equipSubEl.textContent = `Taxa média no recorte: ${fmtDec2.format(txAtosGlobal)} atos clínicos / 1.000 PcD (${scopeStr})`;
    } else if (primaryMetric === 'ri') {
      equipSubEl.textContent = `Razão de Integralidade média: ${fmtDec4.format(riGlobalFiltrado)} (${scopeStr})`;
    } else {
      equipSubEl.textContent = `Total: ${fmtInt.format(totalEquipFiltrado)} produtos físicos (${scopeStr}) • Clique em uma barra para filtrar`;
    }
  }

  // Agrupa escalas compatíveis: volume (equipamentos/atos) vs financeiro (orcamento) vs taxas/RI
  const getMetricUnitGroup = (k: EquipChartMetricKey): 'vol' | 'brl' | 'rate' => {
    if (k === 'orcamento') return 'brl';
    if (k === 'taxa_prod' || k === 'taxa_atos' || k === 'ri') return 'rate';
    return 'vol';
  };
  const primaryUnitGroup = getMetricUnitGroup(primaryMetric);
  const needsSecondaryAxis = selectedMetrics.some(k => getMetricUnitGroup(k) !== primaryUnitGroup);
  const secondaryMetric = selectedMetrics.find(k => getMetricUnitGroup(k) !== primaryUnitGroup);

  const metricDataMap: Record<EquipChartMetricKey, number[]> = {
    equipamentos: equipValues,
    atos: equipProcVals,
    orcamento: equipValsBRL,
    taxa_prod: equipTaxaProdVals,
    taxa_atos: equipTaxaAtosVals,
    ri: equipRiVals
  };

  const metricColorMap: Record<EquipChartMetricKey, string> = {
    equipamentos: '#0284c7',
    atos: '#0d9488',
    orcamento: '#059669',
    taxa_prod: '#4f46e5',
    taxa_atos: '#7c3aed',
    ri: '#d97706'
  };

  const formatMetricAxisTick = (k: EquipChartMetricKey, v: number): string => {
    if (k === 'orcamento') return formatCompactBRL(v);
    if (k === 'ri') return fmtDec2.format(v);
    if (k === 'taxa_prod' || k === 'taxa_atos') return fmtDec1.format(v);
    return fmtInt.format(v);
  };

  const formatMetricBarLabel = (k: EquipChartMetricKey, idx: number, compact = false): string => {
    if (k === 'ri') return fmtDec4.format(equipRiVals[idx] || 0);
    if (k === 'taxa_prod') {
      const v = fmtDec2.format(equipTaxaProdVals[idx] || 0);
      return compact ? v : `${v} / 1k PcD`;
    }
    if (k === 'taxa_atos') {
      const v = fmtDec2.format(equipTaxaAtosVals[idx] || 0);
      return compact ? v : `${v} / 1k PcD`;
    }
    if (k === 'atos') {
      const pVal = equipProcVals[idx] || 0;
      const pct = totalProcFiltrado > 0 ? (pVal * 100) / totalProcFiltrado : 0;
      return `${fmtInt.format(pVal)} (${fmtDec1.format(pct)}%)`;
    }
    if (k === 'orcamento') {
      const brl = equipValsBRL[idx] || 0;
      const pct = totalOrcFiltrado > 0 ? (brl * 100) / totalOrcFiltrado : 0;
      return `${formatCompactBRL(brl)} (${fmtDec1.format(pct)}%)`;
    }
    const val = equipValues[idx] || 0;
    const pct = totalEquipFiltrado > 0 ? (val * 100) / totalEquipFiltrado : 0;
    return `${fmtInt.format(val)} (${fmtDec1.format(pct)}%)`;
  };

  // Ajusta dinamicamente a altura do container conforme o nº de categorias e indicadores marcados
  const equipChartBoxEl = getEl('equipChartBox');
  if (equipChartBoxEl) {
    if (isVerticalEquip) {
      equipChartBoxEl.style.height = '360px';
    } else if (selectedMetrics.length === 1) {
      equipChartBoxEl.style.height = `${Math.max(300, equipLabels.length * 46 + 64)}px`;
    } else {
      const rowHeight = selectedMetrics.length * 24 + 26;
      equipChartBoxEl.style.height = `${Math.max(380, equipLabels.length * rowHeight + 95)}px`;
    }
  }

  const equipDatasets: any[] = selectedMetrics.map(k => {
    const useSecAxis = needsSecondaryAxis && getMetricUnitGroup(k) !== primaryUnitGroup;
    const axisProps = needsSecondaryAxis
      ? isVerticalEquip
        ? { yAxisID: useSecAxis ? 'y1' : 'y' }
        : { xAxisID: useSecAxis ? 'x1' : 'x' }
      : {};
    return {
      label: EQUIP_METRIC_LABELS[k],
      data: metricDataMap[k],
      backgroundColor: !isMultiMetric && k === 'equipamentos' ? equipColors : metricColorMap[k],
      borderRadius: isMultiMetric ? 4 : 5,
      categoryPercentage: isMultiMetric ? 0.76 : 0.72,
      barPercentage: isMultiMetric ? 0.84 : 0.85,
      ...axisProps
    };
  });

  const equipScales: any = needsSecondaryAxis
    ? isVerticalEquip
      ? {
          x: {
            type: 'category',
            grid: { display: false },
            ticks: { autoSkip: false, font: { size: 12, weight: 600 } }
          },
          y: {
            type: 'linear',
            position: 'left',
            grid: { color: gridColor },
            title: { display: true, text: EQUIP_METRIC_SHORT[primaryMetric], font: { size: 11 } },
            ticks: { callback: (v: any) => formatMetricAxisTick(primaryMetric, Number(v)) }
          },
          y1: {
            type: 'linear',
            position: 'right',
            grid: { drawOnChartArea: false },
            title: {
              display: true,
              text: secondaryMetric ? EQUIP_METRIC_SHORT[secondaryMetric] : '',
              font: { size: 11 }
            },
            ticks: {
              callback: (v: any) =>
                secondaryMetric ? formatMetricAxisTick(secondaryMetric, Number(v)) : String(v)
            }
          }
        }
      : {
          x: {
            type: 'linear',
            position: 'bottom',
            grid: { color: gridColor },
            title: { display: true, text: EQUIP_METRIC_SHORT[primaryMetric], font: { size: 11 } },
            ticks: { callback: (v: any) => formatMetricAxisTick(primaryMetric, Number(v)) }
          },
          x1: {
            type: 'linear',
            position: 'top',
            grid: { drawOnChartArea: false },
            title: {
              display: true,
              text: secondaryMetric ? EQUIP_METRIC_SHORT[secondaryMetric] : '',
              font: { size: 11 }
            },
            ticks: {
              callback: (v: any) =>
                secondaryMetric ? formatMetricAxisTick(secondaryMetric, Number(v)) : String(v)
            }
          },
          y: {
            type: 'category',
            grid: { display: false },
            ticks: { autoSkip: false, font: { size: 12, weight: 600 } }
          }
        }
    : isVerticalEquip
    ? {
        x: {
          type: 'category',
          grid: { display: false },
          ticks: { autoSkip: false, font: { size: 12, weight: 600 } }
        },
        y: {
          type: 'linear',
          grid: { color: gridColor },
          ticks: { callback: (v: any) => formatMetricAxisTick(primaryMetric, Number(v)) }
        }
      }
    : {
        x: {
          type: 'linear',
          grid: { color: gridColor },
          ticks: { callback: (v: any) => formatMetricAxisTick(primaryMetric, Number(v)) }
        },
        y: {
          type: 'category',
          grid: { display: false },
          ticks: { autoSkip: false, font: { size: 12, weight: 600 } }
        }
      };

  createOrUpdateChart('chartEquipamentosEntregues', {
    type: 'bar',
    data: {
      labels: equipLabels,
      datasets: equipDatasets
    },
    options: {
      indexAxis: isVerticalEquip ? 'x' : 'y',
      responsive: true,
      maintainAspectRatio: false,
      onHover: pointerHover,
      onClick: (_ev: any, els: any[]) => {
        if (!els.length) return;
        const idx = els[0].index;
        const key = equipKeys[idx];
        if (!key) return;
        if (state.equipChartGroup === 'ano') {
          const clickedAno = key as FiltroGlobalState['ano'];
          state.ano = state.ano === clickedAno ? 'ALL' : clickedAno;
          const selAno = getEl<HTMLSelectElement>('filterAno');
          if (selAno) selAno.value = state.ano;
        } else if (state.equipChartGroup === 'regiao') {
          const clickedMacro = key as MacrorregiaoBrasil;
          state.macro = state.macro === clickedMacro ? 'ALL' : clickedMacro;
          const selMacro = getEl<HTMLSelectElement>('filterMacro');
          if (selMacro) selMacro.value = state.macro;
          populateUfSelector();
          populateMunicipioDatalist();
        } else {
          const mod = key as ModalidadeISO9999;
          if (state.modalidades.length === 1 && state.modalidades[0] === mod) {
            state.modalidades = [];
          } else {
            state.modalidades = [mod];
          }
          syncModMultiUI();
        }
        scheduleRefreshAll();
      },
      layout: {
        padding: isVerticalEquip ? { top: 26, right: 12 } : { top: 6, right: 160 }
      },
      plugins: {
        legend: { display: isMultiMetric },
        tooltip: {
          callbacks: {
            label: (ctx: any) => {
              const i = ctx.dataIndex;
              if (isMultiMetric) {
                const mKey = selectedMetrics[ctx.datasetIndex];
                if (mKey) return ` ${EQUIP_METRIC_SHORT[mKey]}: ${formatMetricBarLabel(mKey, i)}`;
              }
              const qtd = equipValues[i] || 0;
              const proc = equipProcVals[i] || 0;
              const pctQtd = totalEquipFiltrado > 0 ? (qtd * 100) / totalEquipFiltrado : 0;
              const pctProc = totalProcFiltrado > 0 ? (proc * 100) / totalProcFiltrado : 0;
              const brl = equipValsBRL[i] || 0;
              const pctBrl = totalOrcFiltrado > 0 ? (brl * 100) / totalOrcFiltrado : 0;
              const txP = equipTaxaProdVals[i] || 0;
              const txA = equipTaxaAtosVals[i] || 0;
              const ri = equipRiVals[i] || 0;
              return [
                ` Produtos (un.): ${fmtInt.format(qtd)} (${fmtDec1.format(pctQtd)}%)`,
                ` Atos Clínicos: ${fmtInt.format(proc)} (${fmtDec1.format(pctProc)}%)`,
                ` Valor Total: ${fmtBRL.format(brl)} (${fmtDec1.format(pctBrl)}%)`,
                ` Taxa Prod: ${fmtDec2.format(txP)} | Taxa Atos: ${fmtDec2.format(txA)} / 1k PcD`,
                ` RI: ${fmtDec4.format(ri)}`
              ];
            }
          }
        }
      },
      scales: equipScales
    },
    plugins: [
      {
        id: 'equipAbsPctLabels',
        afterDatasetsDraw(chart: any) {
          const { ctx } = chart;
          const isVertical = chart.options.indexAxis === 'x';

          ctx.save();
          ctx.font = isMultiMetric ? "600 10.5px 'Inter', sans-serif" : "600 11.5px 'Inter', sans-serif";
          ctx.fillStyle = isDark ? '#e2e8f0' : '#334155';

          chart.data.datasets.forEach((_ds: any, dsIdx: number) => {
            const meta = chart.getDatasetMeta(dsIdx);
            if (!meta || meta.hidden || !meta.data) return;
            const mKey = selectedMetrics[dsIdx] || 'equipamentos';

            meta.data.forEach((bar: any, idx: number) => {
              const labelText = formatMetricBarLabel(mKey, idx, selectedMetrics.length >= 3);
              if (isVertical) {
                ctx.textAlign = 'center';
                ctx.textBaseline = 'bottom';
                ctx.fillText(labelText, bar.x, bar.y - 5);
              } else {
                ctx.textAlign = 'left';
                ctx.textBaseline = 'middle';
                ctx.fillText(labelText, bar.x + 8, bar.y);
              }
            });
          });
          ctx.restore();
        }
      }
    ]
  });

  // Tabela-resumo completa com todos os 6 indicadores (Produtos, Atos Clínicos, Valor Total, Taxa Prod, Taxa Atos, RI)
  const tbEquipResumo = document.querySelector('#tableEquipResumo tbody');
  if (tbEquipResumo) {
    tbEquipResumo.innerHTML = statsList
      .map(
        s => `
        <tr>
          <td>
            <span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${s.color};margin-right:7px;"></span>
            <strong>${s.label}</strong>
          </td>
          <td class="num-col"><strong>${fmtInt.format(s.qtd)}</strong></td>
          <td class="num-col">${fmtInt.format(s.proc)}</td>
          <td class="num-col"><strong>${fmtBRL.format(s.val)}</strong></td>
          <td class="num-col">${fmtDec2.format(s.taxaProd)}</td>
          <td class="num-col">${fmtDec2.format(s.taxaAtos)}</td>
          <td class="num-col"><span class="tag ${s.ri >= 0.1524 ? 'tag-ok' : s.ri < 0.05 ? 'tag-crit' : 'tag-zero'}">${fmtDec4.format(s.ri)}</span></td>
        </tr>
      `
      )
      .join('');
  }

  createOrUpdateChart('chartModalidadesCap1', {
    type: 'bar',
    data: {
      labels: activeModOrder.map(m => modLabels[m]),
      datasets: [
        {
          type: 'bar',
          label: 'Equipamentos Entregues',
          data: activeModOrder.map(m => modProd[m]),
          backgroundColor: '#0284c7',
          borderRadius: 4,
          yAxisID: 'y'
        },
        {
          type: 'bar',
          label: 'Atendimentos de Adaptação',
          data: activeModOrder.map(m => modProc[m]),
          backgroundColor: '#0d9488',
          borderRadius: 4,
          yAxisID: 'y'
        },
        {
          type: 'line',
          label: 'Índice de Acompanhamento',
          data: activeModOrder.map(m => (modProd[m] > 0 ? +(modProc[m] / modProd[m]).toFixed(4) : 0)),
          borderColor: '#d97706',
          backgroundColor: '#d97706',
          borderWidth: 2,
          pointRadius: 4,
          yAxisID: 'y1'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      onHover: pointerHover,
      onClick: (_ev: any, els: any[]) => {
        if (!els.length) return;
        const clickedMod = activeModOrder[els[0].index];
        if (!clickedMod) return;
        if (state.modalidades.length === 1 && state.modalidades[0] === clickedMod) {
          state.modalidades = [];
        } else {
          state.modalidades = [clickedMod];
        }
        syncModMultiUI();
        scheduleRefreshAll();
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: (ctx: any) => {
              const val = Number(ctx.parsed.y ?? 0);
              if (ctx.dataset.yAxisID === 'y1') return ` ${ctx.dataset.label}: ${fmtDec4.format(val)}`;
              return ` ${ctx.dataset.label}: ${fmtInt.format(val)}`;
            }
          }
        }
      },
      scales: {
        x: { grid: { display: false } },
        y: { type: 'linear', position: 'left', grid: { color: gridColor } },
        y1: { type: 'linear', position: 'right', grid: { drawOnChartArea: false }, min: 0, suggestedMax: 0.4 }
      }
    }
  });

  if (!staticChartsRendered || forceStatic) {
  // 3. Chart CBO por Modalidade
  const cboCats = ['Fisioterapeuta', 'Fonoaudiólogo', 'Médico Especialista', 'Terapeuta Ocupacional'];
  const cboColors: Record<string, string> = {
    Fisioterapeuta: '#0284c7',
    Fonoaudiólogo: '#0d9488',
    'Médico Especialista': '#e11d48',
    'Terapeuta Ocupacional': '#d97706'
  };
  const modsCbo: ModalidadeISO9999[] = ['TA01', 'TA02', 'TA03', 'TA04', 'TA05', 'TA10'];
  createOrUpdateChart('chartCBOModalidade', {
    type: 'bar',
    data: {
      labels: modsCbo.map(m => modLabels[m]),
      datasets: cboCats.map(cat => ({
        label: cat,
        backgroundColor: cboColors[cat],
        data: modsCbo.map(m => {
          const totMod = DB.cbo_tabela_2_2.filter(x => x.modalidade === m).reduce((acc, x) => acc + x.faturamentos, 0) || 1;
          const found = DB.cbo_tabela_2_2.find(x => x.modalidade === m && x.categoria_cbo === cat);
          return found ? +((found.faturamentos * 100) / totMod).toFixed(1) : 0;
        })
      }))
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { stacked: true, max: 100, grid: { color: gridColor } },
        y: { stacked: true, grid: { display: false } }
      }
    }
  });

  // 4. Chart Top CID-10
  const topCids = [
    { label: 'H903 — Perda auditiva bilateral', val: 268549, color: '#0d9488' },
    { label: 'G80 — Paralisia cerebral infantil', val: 194878, color: '#4f46e5' },
    { label: 'H905 — Perda auditiva NE', val: 120201, color: '#0d9488' },
    { label: 'H547 — Perda da visão NE', val: 100039, color: '#d97706' },
    { label: 'M216 — Deformidades tornozelo/pé', val: 86608, color: '#0284c7' },
    { label: 'H919 — Perda de audição NE', val: 82819, color: '#0d9488' },
    { label: 'R268 — Anormalidades da marcha', val: 75103, color: '#0284c7' },
    { label: 'Z899/S881/S781 — Amputações', val: 63741, color: '#e11d48' },
    { label: 'A303 — Hanseníase dimorfa', val: 38837, color: '#059669' },
    { label: 'I694 — Sequelas de AVC', val: 33676, color: '#4f46e5' }
  ];
  createOrUpdateChart('chartTopCID10', {
    type: 'bar',
    data: {
      labels: topCids.map(c => c.label),
      datasets: [
        {
          label: 'Faturamentos Aprovados',
          data: topCids.map(c => c.val),
          backgroundColor: topCids.map(c => c.color),
          borderRadius: 4
        }
      ]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: gridColor } },
        y: { grid: { display: false } }
      }
    }
  });
  } // fim gráficos estáticos 3 e 4

  // 5. Chart Faixa Etária
  const faixas = [
    '00-14 anos (Pediátrico)',
    '15-29 anos (Jovem)',
    '30-59 anos (Adulto)',
    '60-74 anos (Idoso)',
    '75+ anos (Longevo)'
  ];
  const faixaAgg = faixas.map(f =>
    DB.demografia_faixa_etaria
      .filter(r => r.faixa_etaria === f && isModSelected(r.modalidade))
      .reduce((acc, r) => acc + r.qtd_apr, 0)
  );
  createOrUpdateChart('chartFaixaEtaria', {
    type: 'bar',
    data: {
      labels: faixas,
      datasets: [
        {
          label: 'Itens Aprovados',
          data: faixaAgg,
          backgroundColor: ['#4f46e5', '#0284c7', '#0d9488', '#d97706', '#e11d48'],
          borderRadius: 5
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false } },
        y: { grid: { color: gridColor } }
      }
    }
  });

  // 6. Chart Raça/Cor e Sexo
  const racas = ['Branca', 'Parda', 'Preta', 'Amarela', 'Indígena', 'Sem Informação'];
  const mascRaca = racas.map(rc =>
    DB.demografia_raca_sexo
      .filter(r => r.raca_cor === rc && r.sexo === 'Masculino' && isModSelected(r.modalidade))
      .reduce((acc, r) => acc + r.faturamentos, 0)
  );
  const femRaca = racas.map(rc =>
    DB.demografia_raca_sexo
      .filter(r => r.raca_cor === rc && r.sexo === 'Feminino' && isModSelected(r.modalidade))
      .reduce((acc, r) => acc + r.faturamentos, 0)
  );
  createOrUpdateChart('chartRacaSexo', {
    type: 'bar',
    data: {
      labels: racas,
      datasets: [
        { label: 'Feminino', data: femRaca, backgroundColor: '#0d9488', borderRadius: 4 },
        { label: 'Masculino', data: mascRaca, backgroundColor: '#0284c7', borderRadius: 4 }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        tooltip: {
          callbacks: {
            label: (ctx: any) => ` ${ctx.dataset.label}: ${fmtInt.format(Number(ctx.parsed.y ?? 0))} registros`
          }
        }
      },
      scales: {
        x: { grid: { display: false } },
        y: { grid: { color: gridColor } }
      }
    }
  });

  if (!staticChartsRendered || forceStatic) {
  // 7. Chart Esfera Jurídica
  createOrUpdateChart('chartEsferaJuridica', {
    type: 'bar',
    data: {
      labels: ['CNES (2024)', 'Produtos (Qtd.)', 'Valor Prod. (R$)', 'Atos Clínicos'],
      datasets: [
        { label: 'Pública (300)', data: [50.7, 39.0, 27.3, 31.3], backgroundColor: '#0284c7' },
        { label: 'Filantrópica (219)', data: [37.0, 47.0, 57.0, 66.4], backgroundColor: '#059669' },
        { label: 'Privada (73)', data: [12.3, 14.0, 15.6, 2.4], backgroundColor: '#e11d48' }
      ]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { stacked: true, max: 100, grid: { color: gridColor } },
        y: { stacked: true, grid: { display: false } }
      }
    }
  });

  // 8. Chart Razão de Integralidade por Esfera, CER e Oficina
  createOrUpdateChart('chartIntegralidadeCER', {
    type: 'bar',
    data: {
      labels: [
        'Oficinas Ortopédicas (8)',
        'Pública CER (99)',
        'Filantrópica Não-CER (104)',
        'Filantrópica CER (99)',
        'Média Nacional SUS',
        'Pública Não-CER (92)',
        'Privada Não-CER (59)',
        'Privada CER (2)'
      ],
      datasets: [
        {
          label: 'Razão de Integralidade (RI)',
          data: [0.4135, 0.2521, 0.2245, 0.1631, 0.1524, 0.0831, 0.0247, 0.0],
          backgroundColor: ['#d97706', '#0284c7', '#059669', '#0d9488', '#4f46e5', '#64748b', '#e11d48', '#991b1b'],
          borderRadius: 4
        }
      ]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: gridColor } },
        y: { grid: { display: false } }
      }
    }
  });

  // 9. Chart Curva de Lorenz
  createOrUpdateChart('chartLorenzGini', {
    type: 'line',
    data: {
      labels: DB.lorenz_cnes.map(p => `${p.pct_cnes}%`),
      datasets: [
        {
          label: 'Equidade (Gini = 0)',
          data: DB.lorenz_cnes.map(p => p.pct_cnes),
          borderColor: '#94a3b8',
          borderDash: [4, 4],
          pointRadius: 0,
          borderWidth: 1.5
        },
        {
          label: 'Valor Produtos (Gini = 0,7562)',
          data: DB.lorenz_cnes.map(p => p.pct_valor_produtos),
          borderColor: '#0284c7',
          backgroundColor: 'rgba(2, 132, 199, 0.08)',
          fill: true,
          pointRadius: 2,
          borderWidth: 2
        },
        {
          label: 'Atos Clínicos (Gini = 0,9162)',
          data: DB.lorenz_cnes.map(p => p.pct_atos_clinicos),
          borderColor: '#e11d48',
          backgroundColor: 'rgba(225, 29, 72, 0.08)',
          fill: true,
          pointRadius: 2,
          borderWidth: 2
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { grid: { display: false } },
        y: { grid: { color: gridColor }, min: 0, max: 100 }
      }
    }
  });

  // 10. Chart Quintis de PIB per capita
  const quintis = DB.justica_espacial_tabela_4_1.filter(r => r.dimensao.includes('Quintil'));
  createOrUpdateChart('chartQuintisPIB', {
    type: 'bar',
    data: {
      labels: quintis.map(q => q.estrato),
      datasets: [
        {
          label: 'Produtos / 1.000 PcD (RII = 3,05)',
          data: quintis.map(q => q.taxa_prod_res_1000pcd),
          backgroundColor: '#0284c7',
          borderRadius: 4
        },
        {
          label: 'Atos Clínicos / 1.000 PcD (RII = 8,49)',
          data: quintis.map(q => q.taxa_atos_res_1000pcd),
          backgroundColor: '#d97706',
          borderRadius: 4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        tooltip: {
          callbacks: {
            label: (ctx: any) => ` ${ctx.dataset.label}: ${fmtDec2.format(Number(ctx.parsed.y ?? 0))} / 1.000 PcD`
          }
        }
      },
      scales: {
        x: { grid: { display: false } },
        y: { grid: { color: gridColor } }
      }
    }
  });

  // 11. Chart Escalamento da Desigualdade SII/RII/Wagstaff
  createOrUpdateChart('chartDesigualdadeSiiRii', {
    type: 'bar',
    data: {
      labels: ['Produtos (Res.)', 'Produtos (Oferta)', 'Atos Clín. (Res.)', 'Atos Clín. (Oferta)'],
      datasets: [
        {
          type: 'bar',
          label: 'Relative Index of Inequality (RII)',
          data: [3.052, 6.055, 8.489, 22.908],
          backgroundColor: ['#0284c7', '#0369a1', '#d97706', '#e11d48'],
          borderRadius: 4,
          yAxisID: 'y'
        },
        {
          type: 'line',
          label: 'Índice de Wagstaff (W)',
          data: [0.1898, 0.2868, 0.3357, 0.4533],
          borderColor: '#059669',
          backgroundColor: '#059669',
          borderWidth: 2,
          pointRadius: 4,
          yAxisID: 'y1'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { grid: { display: false } },
        y: { type: 'linear', position: 'left', grid: { color: gridColor } },
        y1: { type: 'linear', position: 'right', grid: { drawOnChartArea: false }, min: 0, max: 0.6 }
      }
    }
  });

  // 12. Chart Distância Geodésica da Migração Pendular
  const macrosOd = DB.redes_od_macro_tabela_5_2.filter(r => !r.macrorregiao.includes('Brasil'));
  createOrUpdateChart('chartDistanciaMacro', {
    type: 'bar',
    data: {
      labels: macrosOd.map(r => r.macrorregiao),
      datasets: [
        {
          label: 'Distância Média Ponderada (km)',
          data: macrosOd.map(r => r.dist_media_km),
          backgroundColor: ['#e11d48', '#d97706', '#0284c7', '#059669', '#4f46e5'],
          borderRadius: 4
        },
        {
          label: 'Mediana (km)',
          data: macrosOd.map(r => r.mediana_km),
          backgroundColor: 'rgba(100, 116, 139, 0.35)',
          borderRadius: 4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      onHover: pointerHover,
      onClick: (_ev: any, els: any[]) => {
        if (!els.length) return;
        const macroRow = macrosOd[els[0].index];
        if (!macroRow) return;
        const clickedMacro = macroRow.macrorregiao as MacrorregiaoBrasil;
        state.macro = state.macro === clickedMacro ? 'ALL' : clickedMacro;
        const selMacro = getEl<HTMLSelectElement>('filterMacro');
        if (selMacro) selMacro.value = state.macro;
        scheduleRefreshAll();
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: (ctx: any) => ` ${ctx.dataset.label}: ${fmtDec1.format(Number(ctx.parsed.y ?? 0))} km`
          }
        }
      },
      scales: {
        x: { grid: { display: false } },
        y: { grid: { color: gridColor } }
      }
    }
  });

  // 13. Chart Hurdle NB Forest
  const hurdleClin = DB.modelo_hurdle_tabela_5_1.filter(r => r.modelo.includes('Acesso Clínico'));
  createOrUpdateChart('chartHurdleForest', {
    type: 'bar',
    data: {
      labels: hurdleClin.map(r => `${r.estagio.startsWith('1') ? '[Logit OR]' : '[ZTNB IRR]'} ${r.termo.split('(')[0].trim()}`),
      datasets: [
        {
          label: 'OR / IRR (Ref. = 1,00)',
          data: hurdleClin.map(r => r.or_irr),
          backgroundColor: hurdleClin.map(r => (r.or_irr < 1 ? '#e11d48' : '#059669')),
          borderRadius: 4
        }
      ]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: gridColor } },
        y: { grid: { display: false } }
      }
    }
  });
  staticChartsRendered = true;
  } // fim gráficos estáticos 7 a 13

  // 14. Chart 10 Melhores e 10 Piores por Localidade (seção dedicada + interativo)
  const targetYearTop10 = state.ano === 'ALL' ? 'Triênio' : String(state.ano);
  let rankedItems: Array<{ label: string; value: number; uf: string; codMun?: string; nomeMun?: string }> = [];
  let metricLabel = 'Taxa por 1.000 PcD';

  if (state.top10Metric === 'ri') metricLabel = 'Índice de Acompanhamento (RI)';
  else if (state.top10Metric === 'prod') metricLabel = 'Equipamentos Entregues';

  const formatMetricVal = (v: number): string => {
    if (state.top10Metric === 'ri') return fmtDec4.format(v);
    if (state.top10Metric === 'prod') return fmtInt.format(v);
    return `${fmtDec2.format(v)} / 1k PcD`;
  };

  if (state.top10Scope === 'UF') {
    const ufList = DB.resumo_uf.filter(
      r => r.ano === targetYearTop10 && (state.macro === 'ALL' || r.macrorregiao === state.macro)
    );
    rankedItems = ufList.map(r => ({
      label: `${r.uf} — ${r.uf_nome}`,
      uf: r.uf,
      value:
        state.top10Metric === 'ri'
          ? Number(r.razao_integralidade || 0)
          : state.top10Metric === 'prod'
          ? Number(r.prod_qtd_apr || 0)
          : Number(r.taxa_prod_1000pcd || 0)
    }));
  } else {
    const polosList = (DB.polos_municipais_oferta || []).filter(
      r => (state.uf === 'ALL' || r.uf === state.uf) && r.prod_oferta > 0
    );
    rankedItems = polosList.map(r => ({
      label: `${r.municipio} (${r.uf})`,
      uf: r.uf,
      codMun: r.cod_mun_6,
      nomeMun: r.municipio,
      value:
        state.top10Metric === 'ri'
          ? Number(r.ri_oferta || 0)
          : state.top10Metric === 'prod'
          ? Number(r.prod_oferta || 0)
          : Number(r.taxa_res_1000pcd || 0)
    }));
  }

  const sortedDesc = [...rankedItems].sort((a, b) => b.value - a.value);
  const top10Best = sortedDesc.slice(0, 10);
  const top10Worst = [...rankedItems].sort((a, b) => a.value - b.value).slice(0, 10);

  const subEl = getEl('top10Subtitle');
  if (subEl) {
    const scopeTxt =
      state.top10Scope === 'UF'
        ? `Estados (${targetYearTop10})`
        : state.uf === 'ALL'
        ? 'Municípios Polos do Brasil (314)'
        : `Municípios Polos de ${state.uf}`;
    subEl.textContent = `${scopeTxt} • Critério: ${metricLabel} • Clique em qualquer barra para filtrar`;
  }

  const handleRankingBarClick = (list: typeof top10Best, idx: number): void => {
    const item = list[idx];
    if (!item) return;
    if (state.top10Scope === 'UF') {
      state.uf = state.uf === item.uf ? 'ALL' : item.uf;
      state.municipioCod = '';
      state.municipioNome = '';
      const selUF = getEl<HTMLSelectElement>('filterUF');
      if (selUF) selUF.value = state.uf;
      const inputMun = getEl<HTMLInputElement>('filterMunicipio');
      if (inputMun) inputMun.value = '';
      populateMunicipioDatalist();
      scheduleRefreshAll();
    } else if (item.codMun) {
      state.municipioCod = item.codMun;
      state.municipioNome = item.nomeMun || '';
      state.uf = item.uf;
      const selUF = getEl<HTMLSelectElement>('filterUF');
      if (selUF) selUF.value = item.uf;
      const inputMun = getEl<HTMLInputElement>('filterMunicipio');
      if (inputMun) inputMun.value = `${item.nomeMun} (${item.uf})`;
      populateMunicipioDatalist();
      scheduleRefreshAll();
    }
  };

  createOrUpdateChart('chartTop10Melhores', {
    type: 'bar',
    data: {
      labels: top10Best.map(x => x.label),
      datasets: [
        {
          label: metricLabel,
          data: top10Best.map(x => x.value),
          backgroundColor: '#059669',
          hoverBackgroundColor: '#047857',
          borderRadius: 4
        }
      ]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      onHover: pointerHover,
      onClick: (_ev: any, els: any[]) => {
        if (els.length) handleRankingBarClick(top10Best, els[0].index);
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx: any) => ` ${metricLabel}: ${formatMetricVal(Number(ctx.parsed.x ?? 0))}`
          }
        }
      },
      scales: {
        x: { grid: { color: gridColor } },
        y: { grid: { display: false } }
      }
    }
  });

  createOrUpdateChart('chartTop10Piores', {
    type: 'bar',
    data: {
      labels: top10Worst.map(x => x.label),
      datasets: [
        {
          label: metricLabel,
          data: top10Worst.map(x => x.value),
          backgroundColor: '#e11d48',
          hoverBackgroundColor: '#be123c',
          borderRadius: 4
        }
      ]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      onHover: pointerHover,
      onClick: (_ev: any, els: any[]) => {
        if (els.length) handleRankingBarClick(top10Worst, els[0].index);
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx: any) => ` ${metricLabel}: ${formatMetricVal(Number(ctx.parsed.x ?? 0))}`
          }
        }
      },
      scales: {
        x: { grid: { color: gridColor } },
        y: { grid: { display: false } }
      }
    }
  });

  // Tabela comparativa 10 Melhores vs. 10 Piores
  const tbTop10 = document.querySelector('#tableTop10Comparativo tbody');
  if (tbTop10) {
    const maxRows = Math.max(top10Best.length, top10Worst.length);
    const rowsHtml: string[] = [];
    for (let i = 0; i < maxRows; i++) {
      const b = top10Best[i];
      const w = top10Worst[i];
      rowsHtml.push(`
        <tr>
          <td><strong>#${i + 1}</strong></td>
          <td>${b ? `<strong style="color:var(--emerald);">${b.label}</strong>` : '—'}</td>
          <td class="num-col">${b ? `<strong>${formatMetricVal(b.value)}</strong>` : '—'}</td>
          <td>${w ? `<strong style="color:var(--rose);">${w.label}</strong>` : '—'}</td>
          <td class="num-col">${w ? `<strong>${formatMetricVal(w.value)}</strong>` : '—'}</td>
        </tr>
      `);
    }
    tbTop10.innerHTML = rowsHtml.join('');
  }
}

function refreshAll(): void {
  updateGlobalKPIs();
  renderMunicipioSummaryBar();
  renderStaticAndDynamicTables();
  renderCharts();
}

function bindEvents(): void {
  // Main Sidebar Tabs
  document.querySelectorAll('.nav-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-tab').forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      const targetId = btn.getAttribute('data-tab');
      if (targetId) {
        const hideKpiHeader = targetId === 'tab-desenvolvedores' || targetId === 'tab-sobre-ta';
        const kpiStrip = getEl('globalKpiGrid');
        const muniBar = getEl('muniSelectedBar');
        if (kpiStrip) kpiStrip.style.display = hideKpiHeader ? 'none' : '';
        if (muniBar) muniBar.style.display = hideKpiHeader ? 'none' : '';

        const target = getEl(targetId);
        if (target) {
          target.classList.add('active');
          requestAnimationFrame(() => mountVisibleChartsIn(target));
        }
        if (targetId === 'tab-territorio') {
          odMapController.initMap('odLeafletMap');
          if (state.uf !== 'ALL') {
            odMapController.selectState(state.uf, true);
          }
          odMapController.invalidateSize();
        }
      }
    });
  });

  // Segmented Sub-views inside each Chapter
  document.querySelectorAll('.segmented-control').forEach(ctrl => {
    const buttons = ctrl.querySelectorAll('.seg-btn');
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        const parentSection = ctrl.closest('.tab-panel');
        if (!parentSection) return;
        buttons.forEach(b => b.classList.remove('active'));
        parentSection.querySelectorAll('.subview-panel').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        const targetId = btn.getAttribute('data-target');
        if (targetId) {
          const panel = getEl(targetId);
          if (panel) {
            panel.classList.add('active');
            requestAnimationFrame(() => mountVisibleChartsIn(panel));
          }
        }
      });
    });
  });

  // Global Filters
  getEl<HTMLSelectElement>('filterAno')?.addEventListener('change', e => {
    state.ano = (e.target as HTMLSelectElement).value as FiltroGlobalState['ano'];
    refreshAll();
  });

  getEl<HTMLSelectElement>('filterMacro')?.addEventListener('change', e => {
    state.macro = (e.target as HTMLSelectElement).value as 'ALL' | MacrorregiaoBrasil;
    if (state.macro !== 'ALL' && state.uf !== 'ALL') {
      const ufRow = DB.resumo_uf.find(r => r.uf === state.uf);
      if (ufRow && ufRow.macrorregiao !== state.macro) {
        state.uf = 'ALL';
      }
    }
    if (state.municipioCod) {
      const munMeta = window.MAPA_OD_SUS?.municipios_ibge?.[state.municipioCod];
      const allowedUfs = new Set(getUfsForMacro(state.macro).map(x => x.uf));
      if (!munMeta || !allowedUfs.has(munMeta[1])) {
        state.municipioCod = '';
        state.municipioNome = '';
        const inputMun = getEl<HTMLInputElement>('filterMunicipio');
        if (inputMun) inputMun.value = '';
      }
    }
    populateUfSelector();
    populateMunicipioDatalist();
    if (state.uf === 'ALL') {
      odMapController.selectState('ALL', false);
    }
    refreshAll();
  });

  getEl<HTMLSelectElement>('filterUF')?.addEventListener('change', e => {
    state.uf = (e.target as HTMLSelectElement).value;
    if (state.uf !== 'ALL') {
      const ufRow = DB.resumo_uf.find(r => r.uf === state.uf);
      if (ufRow && state.macro !== ufRow.macrorregiao) {
        state.macro = ufRow.macrorregiao as MacrorregiaoBrasil;
        const selMacro = getEl<HTMLSelectElement>('filterMacro');
        if (selMacro) selMacro.value = state.macro;
        populateUfSelector();
      }
    }
    state.municipioCod = '';
    state.municipioNome = '';
    const inputMun = getEl<HTMLInputElement>('filterMunicipio');
    if (inputMun) inputMun.value = '';
    populateMunicipioDatalist();
    odMapController.selectState(state.uf, true);
    refreshAll();
  });

  const inputMunEl = getEl<HTMLInputElement>('filterMunicipio');
  const btnClearMuni = getEl('btnClearMuniInput');
  const btnToggleMuni = getEl('btnToggleMuniList');
  const muniDropdown = getEl('muniDropdownList');
  const muniWrap = getEl('muniComboWrap');

  const selectMunicipioByCode = (cod: string): void => {
    const munMeta = window.MAPA_OD_SUS?.municipios_ibge?.[cod];
    if (!munMeta) return;
    const nome = munMeta[0];
    const uf = munMeta[1];
    state.municipioCod = cod;
    state.municipioNome = nome;
    if (inputMunEl) inputMunEl.value = `${nome} (${uf})`;

    const ufRow = DB.resumo_uf.find(r => r.uf === uf);
    if (ufRow && state.macro !== ufRow.macrorregiao) {
      state.macro = ufRow.macrorregiao as MacrorregiaoBrasil;
      const selMacro = getEl<HTMLSelectElement>('filterMacro');
      if (selMacro) selMacro.value = state.macro;
    }
    if (state.uf !== uf) {
      state.uf = uf;
    }
    populateUfSelector();
    populateMunicipioDatalist();
    syncClearMuniBtn();
    closeMuniDropdown();
    odMapController.focusMunicipality(cod);
    refreshAll();
  };

  const clearMunicipioSelection = (): void => {
    state.municipioCod = '';
    state.municipioNome = '';
    if (inputMunEl) inputMunEl.value = '';
    syncClearMuniBtn();
    closeMuniDropdown();
    refreshAll();
  };

  inputMunEl?.addEventListener('focus', () => {
    openMuniDropdown(true);
  });

  inputMunEl?.addEventListener('click', () => {
    openMuniDropdown(true);
  });

  inputMunEl?.addEventListener('input', e => {
    const val = (e.target as HTMLInputElement).value;
    syncClearMuniBtn();
    if (!val.trim()) {
      if (state.municipioCod) {
        state.municipioCod = '';
        state.municipioNome = '';
        refreshAll();
      }
      openMuniDropdown(true);
      return;
    }
    const exact = municipioLookupByLabel.get(val.trim().toLowerCase());
    if (exact) {
      selectMunicipioByCode(exact.cod);
      return;
    }
    renderMuniDropdown(val);
    muniDropdown?.classList.add('open');
  });

  btnToggleMuni?.addEventListener('click', e => {
    e.stopPropagation();
    if (muniDropdown?.classList.contains('open')) {
      closeMuniDropdown();
    } else {
      openMuniDropdown(true);
      inputMunEl?.focus();
    }
  });

  btnClearMuni?.addEventListener('click', e => {
    e.stopPropagation();
    clearMunicipioSelection();
    openMuniDropdown(true);
    inputMunEl?.focus();
  });

  muniDropdown?.addEventListener('mousedown', e => {
    const optEl = (e.target as HTMLElement | null)?.closest('[data-muni-cod]') as HTMLElement | null;
    if (!optEl) return;
    e.preventDefault();
    const cod = optEl.getAttribute('data-muni-cod') || '';
    if (cod) selectMunicipioByCode(cod);
  });

  document.addEventListener('click', e => {
    if (muniWrap && !muniWrap.contains(e.target as Node)) {
      closeMuniDropdown();
      // Se o usuário digitou texto parcial inválido e saiu sem escolher, restaura o nome do município ativo
      if (inputMunEl && state.municipioCod) {
        const meta = window.MAPA_OD_SUS?.municipios_ibge?.[state.municipioCod];
        if (meta) inputMunEl.value = `${meta[0]} (${meta[1]})`;
      }
      syncClearMuniBtn();
    }
  });

  getEl<HTMLSelectElement>('selectTop10Scope')?.addEventListener('change', e => {
    state.top10Scope = (e.target as HTMLSelectElement).value as 'UF' | 'MUNICIPIO';
    renderCharts();
  });

  getEl<HTMLSelectElement>('selectTop10Metric')?.addEventListener('change', e => {
    state.top10Metric = (e.target as HTMLSelectElement).value as 'taxa_1k_pcd' | 'ri' | 'prod';
    renderCharts();
  });

  // Multi-select Checkbox Dropdown (Linha de Cuidado)
  const modWrap = getEl('modMultiWrap');
  const modBtn = getEl('btnModMultiToggle');
  const modDropdown = getEl('modMultiDropdown');
  const chkModAll = getEl<HTMLInputElement>('chkModAll');
  const modItemChecks = Array.from(document.querySelectorAll<HTMLInputElement>('.chk-mod-item'));

  modBtn?.addEventListener('click', e => {
    e.stopPropagation();
    const isOpen = modDropdown?.classList.toggle('open') || false;
    modBtn.setAttribute('aria-expanded', String(isOpen));
  });

  document.addEventListener('click', e => {
    if (modWrap && !modWrap.contains(e.target as Node)) {
      modDropdown?.classList.remove('open');
      modBtn?.setAttribute('aria-expanded', 'false');
    }
  });

  chkModAll?.addEventListener('change', () => {
    if (chkModAll.checked) {
      state.modalidades = [];
    } else {
      // Se desmarcar "Todas", mantém pelo menos a primeira para não zerar tudo sem querer
      state.modalidades = ['TA04'];
    }
    syncModMultiUI();
    refreshAll();
  });

  modItemChecks.forEach(chk => {
    chk.addEventListener('change', () => {
      const checkedVals = modItemChecks
        .filter(c => c.checked)
        .map(c => c.value as ModalidadeISO9999);
      if (checkedVals.length === 0 || checkedVals.length === ALL_MODALIDADES.length) {
        state.modalidades = [];
      } else {
        state.modalidades = checkedVals;
      }
      syncModMultiUI();
      refreshAll();
    });
  });

  // Multi-select Checkbox Listbox (Indicador do gráfico Equipamentos Entregues)
  const equipMetricWrap = getEl('equipMetricWrap');
  const equipMetricBtn = getEl('btnEquipMetricToggle');
  const equipMetricDropdown = getEl('equipMetricDropdown');
  const equipMetricChecks = Array.from(document.querySelectorAll<HTMLInputElement>('.chk-equip-metric'));

  equipMetricBtn?.addEventListener('click', e => {
    e.stopPropagation();
    const isOpen = equipMetricDropdown?.classList.toggle('open') || false;
    equipMetricBtn.setAttribute('aria-expanded', String(isOpen));
  });

  document.addEventListener('click', e => {
    if (equipMetricWrap && !equipMetricWrap.contains(e.target as Node)) {
      equipMetricDropdown?.classList.remove('open');
      equipMetricBtn?.setAttribute('aria-expanded', 'false');
    }
  });

  equipMetricChecks.forEach(chk => {
    chk.addEventListener('change', () => {
      const checked = equipMetricChecks
        .filter(c => c.checked)
        .map(c => c.value as EquipChartMetricKey);
      if (checked.length === 0) {
        // Garante ao menos 1 indicador ativo
        chk.checked = true;
        return;
      }
      state.equipChartMetrics = checked;
      syncEquipMetricMultiUI();
      renderCharts();
    });
  });

  getEl<HTMLSelectElement>('selectEquipChartGroup')?.addEventListener('change', e => {
    state.equipChartGroup = (e.target as HTMLSelectElement).value as 'categoria' | 'ano' | 'regiao';
    renderCharts();
  });

  getEl('btnResetFilters')?.addEventListener('click', () => {
    state.ano = 'ALL';
    state.macro = 'ALL';
    state.uf = 'ALL';
    state.municipioCod = '';
    state.municipioNome = '';
    state.modalidades = [];
    const fAno = getEl<HTMLSelectElement>('filterAno');
    const fMac = getEl<HTMLSelectElement>('filterMacro');
    const fMun = getEl<HTMLInputElement>('filterMunicipio');
    if (fAno) fAno.value = 'ALL';
    if (fMac) fMac.value = 'ALL';
    if (fMun) fMun.value = '';
    syncModMultiUI();
    populateUfSelector();
    populateMunicipioDatalist();
    odMapController.selectState('ALL', true);
    refreshAll();
  });

  // Event Delegation para cliques em cartões/linhas de UF (evita re-anexar listeners a cada filtro)
  document.addEventListener('click', e => {
    const target = (e.target as HTMLElement | null)?.closest('[data-uf-click]') as HTMLElement | null;
    if (!target) return;
    const clickedUf = target.getAttribute('data-uf-click') || 'ALL';
    state.uf = state.uf === clickedUf ? 'ALL' : clickedUf;
    if (state.uf !== 'ALL') {
      const ufRow = DB.resumo_uf.find(r => r.uf === state.uf);
      if (ufRow) {
        state.macro = ufRow.macrorregiao as MacrorregiaoBrasil;
        const selMacro = getEl<HTMLSelectElement>('filterMacro');
        if (selMacro) selMacro.value = state.macro;
      }
    }
    state.municipioCod = '';
    state.municipioNome = '';
    const inputMun = getEl<HTMLInputElement>('filterMunicipio');
    if (inputMun) inputMun.value = '';
    populateUfSelector();
    populateMunicipioDatalist();
    odMapController.initMap('odLeafletMap');
    odMapController.selectState(state.uf, true);
    document.getElementById('odLeafletMap')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    refreshAll();
  });

  // Search Filters (com debounce de 120ms para digitação fluida)
  const debouncedSigtap = debounce(() => renderSigtapTable(), 120);
  getEl<HTMLInputElement>('inputSearchSigtap')?.addEventListener('input', e => {
    state.sigtapSearch = (e.target as HTMLInputElement).value;
    debouncedSigtap();
  });

  getEl<HTMLSelectElement>('selectTipoSigtap')?.addEventListener('change', e => {
    state.sigtapTipo = (e.target as HTMLSelectElement).value as FiltroGlobalState['sigtapTipo'];
    renderSigtapTable();
  });

  const debouncedPoloMun = debounce(() => renderPolosMunicipaisRDS(), 120);
  getEl<HTMLInputElement>('inputSearchPoloMun')?.addEventListener('input', e => {
    state.poloMunSearch = (e.target as HTMLInputElement).value;
    debouncedPoloMun();
  });

  // Quick Open Map button in Topbar
  getEl('btnQuickOpenMap')?.addEventListener('click', () => {
    const mapTabBtn = document.querySelector('.nav-tab[data-tab="tab-territorio"]') as HTMLElement | null;
    if (mapTabBtn) {
      mapTabBtn.click();
    }
  });

  // Theme Toggle (Default is Clean Light Mode, toggles Dark Mode)
  getEl('btnToggleTheme')?.addEventListener('click', () => {
    document.body.classList.toggle('dark-theme');
    renderCharts(true);
  });

  // Copy R Script
  getEl('btnCopyRScript')?.addEventListener('click', () => {
    const code = getEl('codeReprodutibilidadeR')?.innerText || '';
    navigator.clipboard.writeText(code).then(() => {
      const btn = getEl('btnCopyRScript');
      if (btn) {
        const old = btn.textContent;
        btn.textContent = '✓ Copiado!';
        setTimeout(() => {
          btn.textContent = old;
        }, 2000);
      }
    });
  });

  // DuckDB SQL Console Presets & Execution via Node.js TypeScript Backend
  const sqlInput = getEl<HTMLTextAreaElement>('textareaDuckDBSql');
  const sqlOut = getEl('duckdbResultContainer');
  if (sqlInput && sqlOut) {
    getEl('btnSqlPreset1')?.addEventListener('click', () => {
      sqlInput.value = `SELECT \n  ano,\n  tipo_registro,\n  COUNT(*) AS faturamentos,\n  CAST(SUM(PA_QTDPRO) AS BIGINT) AS qtd_apresentada,\n  CAST(SUM(PA_QTDAPR) AS BIGINT) AS qtd_aprovada,\n  ROUND(SUM(PA_VALAPR), 2) AS valor_aprovado_reais\nFROM sia_ta_parquet\nGROUP BY ano, tipo_registro\nORDER BY ano, tipo_registro;`;
    });
    getEl('btnSqlPreset2')?.addEventListener('click', () => {
      sqlInput.value = `SELECT \n  id_taxonomia_ta AS modalidade,\n  PA_CIDPRI AS cid10,\n  COUNT(*) AS faturamentos,\n  CAST(SUM(PA_QTDAPR) AS BIGINT) AS qtd_aprovada,\n  ROUND(SUM(PA_VALAPR), 2) AS valor_aprovado_reais\nFROM sia_ta_parquet\nGROUP BY 1, 2\nORDER BY faturamentos DESC\nLIMIT 15;`;
    });
    getEl('btnSqlPreset3')?.addEventListener('click', () => {
      sqlInput.value = `SELECT \n  PA_PROC_ID AS codigo_sigtap,\n  id_taxonomia_ta AS modalidade,\n  subcategoria_ta,\n  COUNT(*) AS faturamentos,\n  CAST(SUM(PA_QTDAPR) AS BIGINT) AS atos_clinicos_aprovados,\n  ROUND(SUM(PA_VALAPR), 2) AS valor_sigtap\nFROM sia_ta_parquet\nWHERE tipo_registro = 'Procedimento' AND PA_VALAPR = 0\nGROUP BY 1, 2, 3\nORDER BY atos_clinicos_aprovados DESC;`;
    });
    getEl('btnRunDuckDB')?.addEventListener('click', async () => {
      sqlOut.innerHTML = `<div style="padding:12px;color:var(--primary);">Consultando 972 partições Apache Parquet via Node.js + TypeScript + DuckDB...</div>`;
      try {
        const resp = await fetch('/api/duckdb', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sql: sqlInput.value })
        });
        const data = (await resp.json()) as {
          status: string;
          columns?: string[];
          rows?: Array<Array<string | number | null>>;
          message?: string;
        };
        if (data.status === 'ok' && data.columns && data.rows) {
          const ths = data.columns.map(c => `<th>${c}</th>`).join('');
          const trs = data.rows
            .map(r => `<tr>${r.map(v => `<td class="${typeof v === 'number' ? 'num-col' : ''}">${v ?? ''}</td>`).join('')}</tr>`)
            .join('');
          sqlOut.innerHTML = `<table class="sci-table"><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>`;
        } else {
          sqlOut.innerHTML = `<div style="padding:12px;color:var(--rose);">Erro SQL: ${data.message}</div>`;
        }
      } catch (_err) {
        const ths = `<th>ano</th><th>tipo_registro</th><th class="num-col">linhas_sia</th><th class="num-col">qtd_apresentada</th><th class="num-col">qtd_aprovada</th><th class="num-col">val_aprovado</th>`;
        const trs = DB.reconciliacao_anual_tabela_1_2
          .map(
            r =>
              `<tr><td>${r.ano}</td><td>${r.tipo_registro}</td><td class="num-col">${fmtInt.format(r.linhas_sia)}</td><td class="num-col">${fmtInt.format(r.qtd_apresentada)}</td><td class="num-col">${fmtInt.format(r.qtd_aprovada)}</td><td class="num-col">${fmtBRL.format(r.val_aprovado)}</td></tr>`
          )
          .join('');
        sqlOut.innerHTML = `<table class="sci-table"><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>`;
      }
    });
  }

  // Export Filtered Cube to CSV
  getEl('btnExportCurrentCSV')?.addEventListener('click', () => {
    const rows = getFilteredCubo();
    const headers: Array<keyof CuboUfAnoModalidade> = [
      'uf',
      'uf_nome',
      'macrorregiao',
      'ano',
      'modalidade',
      'categoria_ta',
      'tipo_registro',
      'faturamentos',
      'qtd_apresentada',
      'qtd_aprovada',
      'val_apresentado',
      'val_aprovado',
      'cnes_ativos',
      'mun_oferta',
      'mun_residencia',
      'qtd_intermunicipal'
    ];
    const csvLines = [
      headers.join(';'),
      ...rows.map(r => headers.map(h => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(';'))
    ];
    const blob = new Blob(['\uFEFF' + csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const modTag = state.modalidades.length === 0 ? 'ALL' : state.modalidades.join('-');
    a.download = `cubo_ta_sus_2022_2024_${state.ano}_${state.uf}_${modTag}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  });
}

// Renderiza ícones vetoriais profissionais (Lucide Icons)
createIcons({
  icons: {
    LayoutDashboard,
    Trophy,
    Map: LucideMap,
    Building2,
    Route,
    Users,
    Accessibility,
    Database,
    Code2,
    BookOpen,
    FileText,
    AtSign,
    Moon,
    Sun,
    MapPin,
    Download,
    FileJson,
    Globe,
    Ship,
    Play,
    ExternalLink
  }
});

// Initialize TypeScript App (Mapa inicializado sob demanda ao abrir a aba para boot instantâneo)
initSelectors();
bindEvents();
refreshAll();
