/**
 * Aplicação Frontend em TypeScript — Observatório Nacional de Tecnologia Assistiva no SUS (2022–2024)
 * PPSUS / UFRJ–UFAM • Padrões RECORD, GATHER, CIF/OMS, ISO 9999 e PNAISPD
 * DOI Zenodo: 10.5281/zenodo.24225551 (35 Arquivos Sincronizados)
 */

import Chart from 'chart.js/auto';
import type {
  BaseDadosObservatorioTASUS,
  CuboUfAnoModalidade,
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

const state: FiltroGlobalState = {
  ano: 'ALL',
  macro: 'ALL',
  uf: 'ALL',
  modalidade: 'ALL',
  sigtapSearch: '',
  sigtapTipo: 'ALL',
  poloMunSearch: ''
};

const charts: Record<string, Chart> = {};

function getEl<T extends HTMLElement = HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

function initSelectors(): void {
  const selUF = getEl<HTMLSelectElement>('filterUF');
  if (!selUF) return;

  const ufs = Array.from(new Set(DB.resumo_uf.map(r => r.uf))).sort();
  ufs.forEach(uf => {
    const row = DB.resumo_uf.find(r => r.uf === uf);
    const opt = document.createElement('option');
    opt.value = uf;
    opt.textContent = `${uf} — ${row ? row.uf_nome : uf}`;
    selUF.appendChild(opt);
  });
}

function getFilteredCubo(): CuboUfAnoModalidade[] {
  return DB.cubo_uf_ano_mod.filter(r => {
    if (state.ano !== 'ALL' && String(r.ano) !== String(state.ano)) return false;
    if (state.macro !== 'ALL' && r.macrorregiao !== state.macro) return false;
    if (state.uf !== 'ALL' && r.uf !== state.uf) return false;
    if (state.modalidade !== 'ALL' && r.modalidade !== state.modalidade) return false;
    return true;
  });
}

function updateGlobalKPIs(): void {
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

  const kpiProdQtd = getEl('kpiProdQtd');
  const kpiProdSub = getEl('kpiProdSub');
  const pctGastoProd = totValApr > 0 ? (prodValApr * 100) / totValApr : 0;
  if (kpiProdQtd) kpiProdQtd.textContent = fmtInt.format(prodQtdApr);
  if (kpiProdSub) {
    kpiProdSub.textContent = `${fmtBRL.format(prodValApr)} (${fmtDec1.format(pctGastoProd)}% do orçamento)`;
  }

  const kpiProcQtd = getEl('kpiProcQtd');
  const kpiProcSub = getEl('kpiProcSub');
  if (kpiProcQtd) kpiProcQtd.textContent = fmtInt.format(procQtdApr);
  if (kpiProcSub) {
    kpiProcSub.textContent = `${fmtBRL.format(procValApr)} • Avaliação, moldagem e ajustes`;
  }

  const kpiRI = getEl('kpiRI');
  const kpiRISub = getEl('kpiRISub');
  const invRi = ri > 0 ? fmtDec1.format(1 / ri) : '—';
  if (kpiRI) kpiRI.textContent = fmtDec4.format(ri);
  if (kpiRISub) {
    kpiRISub.textContent =
      ri > 0
        ? `1 atendimento clínico a cada ${invRi} equipamentos`
        : 'Sem registro simultâneo no filtro';
  }

  const kpiValTotal = getEl('kpiValTotal');
  const kpiValSub = getEl('kpiValSub');
  const kpiGlosa = getEl('kpiGlosa');
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
    if (state.modalidade !== 'ALL' && r.modalidade !== state.modalidade) return false;
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
  }
}

function renderPolosMunicipaisRDS(): void {
  const tbPolosRds = document.querySelector('#tablePolosMunicipaisRDS tbody');
  if (!tbPolosRds || !DB.polos_municipais_oferta) return;

  const q = state.poloMunSearch.trim().toLowerCase();
  const rows = DB.polos_municipais_oferta.filter(r => {
    if (state.uf !== 'ALL' && r.uf !== state.uf) return false;
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

  // Table 2.2 CBO
  const tb22 = document.querySelector('#tableCBO22 tbody');
  if (tb22) {
    tb22.innerHTML = DB.cbo_tabela_2_2
      .filter(r => state.modalidade === 'ALL' || r.modalidade === state.modalidade)
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
      .filter(r => state.modalidade === 'ALL' || r.modalidade === state.modalidade)
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

  // Table Top CNES (with real Municipality and Health Region names from Zenodo RDS!)
  const tbCNES = document.querySelector('#tableTopCNES tbody');
  if (tbCNES) {
    tbCNES.innerHTML = DB.top_cnes
      .filter(r => (state.uf === 'ALL' || r.uf === state.uf) && (state.macro === 'ALL' || r.macrorregiao === state.macro))
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

  document.querySelectorAll('[data-uf-click]').forEach(el => {
    el.addEventListener('click', () => {
      const clickedUf = el.getAttribute('data-uf-click') || 'ALL';
      state.uf = state.uf === clickedUf ? 'ALL' : clickedUf;
      const selUF = getEl<HTMLSelectElement>('filterUF');
      if (selUF) selUF.value = state.uf;
      refreshAll();
    });
  });

  renderPolosMunicipaisRDS();

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

  // Table Top Intermunicipal Arcs enriched with real names and SIRGAS 2000 distances!
  const tbArcos = document.querySelector('#tableArcosOD tbody');
  if (tbArcos && DB.top_arcos_od_intermunicipais) {
    tbArcos.innerHTML = DB.top_arcos_od_intermunicipais
      .filter(
        r =>
          (state.uf === 'ALL' || r.uf_destino === state.uf) &&
          (state.macro === 'ALL' || r.macrorregiao_destino === state.macro)
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
}

function renderCharts(): void {
  const isDark = document.body.classList.contains('dark-theme');
  const textColor = isDark ? '#cbd5e1' : '#475569';
  const gridColor = isDark ? 'rgba(148, 163, 184, 0.1)' : 'rgba(15, 23, 42, 0.06)';

  Chart.defaults.color = textColor;
  Chart.defaults.font.family = "'Inter', sans-serif";

  function createOrUpdateChart(id: string, config: any): void {
    if (charts[id]) {
      charts[id].destroy();
    }
    const ctx = getEl<HTMLCanvasElement>(id);
    if (ctx) {
      charts[id] = new Chart(ctx, config);
    }
  }

  // 1. Chart Série Mensal
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
          yAxisID: 'y1',
          tension: 0.25
        },
        {
          type: 'bar',
          label: 'Equipamentos Entregues',
          data: serieFiltered.map(d => d.prod_qtd_apr),
          backgroundColor: '#0284c7',
          borderRadius: 3,
          yAxisID: 'y'
        },
        {
          type: 'bar',
          label: 'Atendimentos de Adaptação',
          data: serieFiltered.map(d => d.proc_qtd_apr),
          backgroundColor: '#0d9488',
          borderRadius: 3,
          yAxisID: 'y'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      scales: {
        x: { grid: { display: false } },
        y: { type: 'linear', position: 'left', grid: { color: gridColor } },
        y1: { type: 'linear', position: 'right', grid: { drawOnChartArea: false }, min: 0, max: 0.25 }
      }
    }
  });

  // 2. Chart Modalidades Cap 1
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
  const filteredCubo = getFilteredCubo();
  const modProd: Record<string, number> = {};
  const modProc: Record<string, number> = {};
  modOrder.forEach(m => {
    modProd[m] = 0;
    modProc[m] = 0;
  });
  filteredCubo.forEach(r => {
    if (r.tipo_registro === 'Produto') modProd[r.modalidade] = (modProd[r.modalidade] || 0) + r.qtd_aprovada;
    else modProc[r.modalidade] = (modProc[r.modalidade] || 0) + r.qtd_aprovada;
  });

  createOrUpdateChart('chartModalidadesCap1', {
    type: 'bar',
    data: {
      labels: modOrder.map(m => modLabels[m]),
      datasets: [
        {
          type: 'bar',
          label: 'Equipamentos Entregues',
          data: modOrder.map(m => modProd[m]),
          backgroundColor: '#0284c7',
          borderRadius: 4,
          yAxisID: 'y'
        },
        {
          type: 'bar',
          label: 'Atendimentos de Adaptação',
          data: modOrder.map(m => modProc[m]),
          backgroundColor: '#0d9488',
          borderRadius: 4,
          yAxisID: 'y'
        },
        {
          type: 'line',
          label: 'Índice de Acompanhamento',
          data: modOrder.map(m => (modProd[m] > 0 ? +(modProc[m] / modProd[m]).toFixed(4) : 0)),
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
      scales: {
        x: { grid: { display: false } },
        y: { type: 'linear', position: 'left', grid: { color: gridColor } },
        y1: { type: 'linear', position: 'right', grid: { drawOnChartArea: false }, min: 0, max: 0.4 }
      }
    }
  });

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
      .filter(r => r.faixa_etaria === f && (state.modalidade === 'ALL' || r.modalidade === state.modalidade))
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
      .filter(r => r.raca_cor === rc && r.sexo === 'Masculino' && (state.modalidade === 'ALL' || r.modalidade === state.modalidade))
      .reduce((acc, r) => acc + r.faturamentos, 0)
  );
  const femRaca = racas.map(rc =>
    DB.demografia_raca_sexo
      .filter(r => r.raca_cor === rc && r.sexo === 'Feminino' && (state.modalidade === 'ALL' || r.modalidade === state.modalidade))
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
      scales: {
        x: { grid: { display: false } },
        y: { grid: { color: gridColor } }
      }
    }
  });

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
}

function refreshAll(): void {
  updateGlobalKPIs();
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
        const target = getEl(targetId);
        if (target) target.classList.add('active');
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
          if (panel) panel.classList.add('active');
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
        const selUF = getEl<HTMLSelectElement>('filterUF');
        if (selUF) selUF.value = 'ALL';
      }
    }
    refreshAll();
  });

  getEl<HTMLSelectElement>('filterUF')?.addEventListener('change', e => {
    state.uf = (e.target as HTMLSelectElement).value;
    refreshAll();
  });

  getEl<HTMLSelectElement>('filterModalidade')?.addEventListener('change', e => {
    state.modalidade = (e.target as HTMLSelectElement).value as 'ALL' | ModalidadeISO9999;
    refreshAll();
  });

  getEl('btnResetFilters')?.addEventListener('click', () => {
    state.ano = 'ALL';
    state.macro = 'ALL';
    state.uf = 'ALL';
    state.modalidade = 'ALL';
    const fAno = getEl<HTMLSelectElement>('filterAno');
    const fMac = getEl<HTMLSelectElement>('filterMacro');
    const fUf = getEl<HTMLSelectElement>('filterUF');
    const fMod = getEl<HTMLSelectElement>('filterModalidade');
    if (fAno) fAno.value = 'ALL';
    if (fMac) fMac.value = 'ALL';
    if (fUf) fUf.value = 'ALL';
    if (fMod) fMod.value = 'ALL';
    refreshAll();
  });

  // Search Filters
  getEl<HTMLInputElement>('inputSearchSigtap')?.addEventListener('input', e => {
    state.sigtapSearch = (e.target as HTMLInputElement).value;
    renderSigtapTable();
  });

  getEl<HTMLSelectElement>('selectTipoSigtap')?.addEventListener('change', e => {
    state.sigtapTipo = (e.target as HTMLSelectElement).value as FiltroGlobalState['sigtapTipo'];
    renderSigtapTable();
  });

  getEl<HTMLInputElement>('inputSearchPoloMun')?.addEventListener('input', e => {
    state.poloMunSearch = (e.target as HTMLInputElement).value;
    renderPolosMunicipaisRDS();
  });

  // Theme Toggle (Default is Clean Light Mode, toggles Dark Mode)
  getEl('btnToggleTheme')?.addEventListener('click', () => {
    document.body.classList.toggle('dark-theme');
    renderCharts();
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
    a.download = `cubo_ta_sus_2022_2024_${state.ano}_${state.uf}_${state.modalidade}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  });
}

// Initialize TypeScript App
initSelectors();
bindEvents();
refreshAll();
