/**
 * Tipagem Estrita em TypeScript da Base Censitária Nacional de Tecnologia Assistiva no SUS (2022–2024)
 * Projeto PPSUS / UFRJ–UFAM • Padrões RECORD, GATHER, CIF/OMS, ISO 9999 e PNAISPD
 * DOI Zenodo: 10.5281/zenodo.24225551
 */

export type NaturezaRegistro = 'Produto' | 'Procedimento';

export type ModalidadeISO9999 =
  | 'TA01'
  | 'TA02'
  | 'TA03'
  | 'TA04'
  | 'TA05'
  | 'TA06'
  | 'TA10';

export type MacrorregiaoBrasil =
  | 'Norte'
  | 'Nordeste'
  | 'Sudeste'
  | 'Sul'
  | 'Centro-Oeste';

export interface PesquisadorEquipe {
  nome: string;
  instituicao: string;
  papel: string;
  orcid?: string;
}

export interface MetricasGlobais {
  registros_brutos_varridos: number;
  particoes_parquet_auditadas: number;
  ufs_cobertas: number;
  meses_competencia: number;
  municipios_ibge: number;
  populacao_censo_2022: number;
  populacao_2mais_censo_2022: number;
  populacao_pcd_censo_2022: number;
  pcd_visual: number;
  pcd_motora: number;
  pcd_auditiva: number;
  pcd_membro_sup: number;
  pcd_cognitiva: number;
  codigos_sigtap_auditados: number;
  codigos_sigtap_incluidos: number;
  codigos_sigtap_produto: number;
  codigos_sigtap_procedimento: number;
  codigos_sigtap_excluidos: number;
  codigos_tarifa_zero_normativa: number;
  faturamentos_aprovados: number;
  qtd_apresentada_total: number;
  qtd_aprovada_total: number;
  qtd_aprovada_produtos_reg01: number;
  qtd_aprovada_procedimentos_reg02: number;
  valor_apresentado_total: number;
  valor_aprovado_total: number;
  valor_aprovado_produtos_reg01: number;
  valor_aprovado_procedimentos_reg02: number;
  glosa_fisica_unidades: number;
  glosa_fisica_pct: number;
  glosa_financeira_reais: number;
  glosa_financeira_pct: number;
  razao_integralidade_trienio: number;
  razao_integralidade_2022: number;
  razao_integralidade_2023: number;
  razao_integralidade_2024: number;
  cnes_cadastrados_2024: number;
  cnes_unicos_trienio: number;
  cer_habilitados_2024: number;
  oficinas_ortopedicas_ativas: number;
  polos_municipais_2022: number;
  polos_municipais_2023: number;
  polos_municipais_2024: number;
  municipios_oferta_clinica_2024: number;
  municipios_sem_ato_clinico: number;
  desertos_assistenciais_lisa_baixo_baixo: number;
  polos_lisa_alto_alto: number;
  arcos_od_total: number;
  arcos_od_intermunicipais_validados: number;
  distancia_media_intermunicipal_km: number;
  distancia_media_norte_km: number;
}

export interface MetadataGlobal {
  titulo: string;
  subtitulo: string;
  fomento: string;
  cooperacao: string;
  doi_zenodo: string;
  url_zenodo: string;
  licenca: string;
  padroes_relato: string[];
  equipe_cientifica: PesquisadorEquipe[];
  metricas_globais: MetricasGlobais;
}

export interface CuboUfAnoModalidade {
  uf: string;
  uf_nome: string;
  macrorregiao: MacrorregiaoBrasil | string;
  ano: number;
  modalidade: ModalidadeISO9999 | string;
  categoria_ta: string;
  tipo_registro: NaturezaRegistro;
  faturamentos: number;
  qtd_apresentada: number;
  qtd_aprovada: number;
  val_apresentado: number;
  val_aprovado: number;
  cnes_ativos: number;
  mun_oferta: number;
  mun_residencia: number;
  qtd_intermunicipal: number;
}

export interface SerieMensalCompetencia {
  competencia: string;
  ano: number;
  mes: number;
  prod_qtd_pro: number;
  prod_qtd_apr: number;
  prod_val_pro: number;
  prod_val_apr: number;
  proc_qtd_pro: number;
  proc_qtd_apr: number;
  proc_val_pro: number;
  proc_val_apr: number;
  razao_integralidade: number;
  taxa_glosa_fisica_pct: number;
}

export interface ResumoUfAnual {
  uf: string;
  uf_nome: string;
  macrorregiao: string;
  ano: string;
  cnes_ativos: number;
  mun_oferta: number;
  mun_residencia: number;
  prod_qtd_pro: number;
  prod_qtd_apr: number;
  prod_val_pro: number;
  prod_val_apr: number;
  proc_qtd_pro: number;
  proc_qtd_apr: number;
  proc_val_pro: number;
  proc_val_apr: number;
  prod_intermun: number;
  proc_intermun: number;
  faturamentos: number;
  razao_integralidade: number;
  glosa_fisica_pct: number;
  glosa_fin_pct: number;
  pct_prod_intermun: number;
  pop_pcd_censo2022?: number;
  pop_2mais_censo2022?: number;
  total_municipios_uf?: number;
  taxa_prod_1000pcd?: number;
  taxa_proc_1000pcd?: number;
}

export interface ReconciliacaoAnualTabela12 {
  ano: number;
  tipo_registro: string;
  linhas_sia: number;
  qtd_apresentada: number;
  qtd_aprovada: number;
  val_apresentado: number;
  val_aprovado: number;
  glosa_qtd_pct: number;
  glosa_val_pct: number;
  cnes_faturantes: number;
  mun_oferta: number;
  mun_residencia: number;
}

export interface ModalidadeTabelaA4 {
  modalidade: string;
  nome: string;
  produtos_qtd: number;
  pct_disp: number;
  valor_produtos: number;
  procedimentos_qtd: number;
  valor_procedimentos: number;
  razao_integralidade: number;
  tarifa_zero_obs: string;
}

export interface EstratoAnaliticoTabela13 {
  estrato: string;
  regime: 'Núcleo Estrito' | 'Ampliada/Rep.' | string;
  qtd_2024: number;
  pct_2024: number;
  val_2024: number;
  qtd_trienio: number;
  val_trienio: number;
  denominador_censo: string;
  tx_2024_1000pcd: number;
  tx_tri_1000pcd: number;
  tx_tri_100k_hab: number;
}

export interface AuditoriaCompletudeTabela21 {
  modalidade: string;
  tipo: NaturezaRegistro;
  faturamentos: number;
  qtd_aprovada: number;
  val_aprovado: number;
  cid10_n: number;
  cid10_pct: number;
  cbo_n: number;
  cbo_pct: number;
  sexo_n: number;
  sexo_pct: number;
  idade_n: number;
  idade_pct: number;
  raca_n: number;
  raca_pct: number;
}

export interface ForcaTrabalhoCBOTabela22 {
  modalidade: string;
  categoria_cbo: string;
  faturamentos: number;
  pct_fat: number;
  qtd_aprovada: number;
  val_aprovado: number;
  pct_val: number;
}

export interface DiagnosticoCID10Tabela23 {
  modalidade: string;
  cid10: string;
  descricao: string;
  faturamentos: number;
  qtd_aprovada: number;
  val_aprovado: number;
  grupo_carga: string;
}

export interface EconomiaPoliticaTabela31 {
  dimensao: string;
  estrato1: string;
  estrato2: string;
  cnes: number;
  produtos_un: number;
  valor_produtos_mi: number;
  atos_clinicos: number;
  glosa_qtd_pct: number;
  glosa_val_pct: number;
  razao_integralidade: number;
}

export interface ModeloQuasiPoissonTabela33 {
  termo: string;
  beta: number;
  erro_padrao: number;
  rr: number;
  ic95: string;
  p_valor: string;
  significativo: boolean;
}

export interface CurvaLorenzCNES {
  pct_cnes: number;
  pct_valor_produtos: number;
  pct_qtd_produtos: number;
  pct_atos_clinicos: number;
}

export interface RankingCNES {
  cnes: string;
  uf: string;
  macrorregiao: string;
  cod_mun_6: string;
  municipio_nome?: string;
  regiao_saude_nome?: string;
  anos_ativos: number;
  prod_apr: number;
  prod_val: number;
  proc_apr: number;
  proc_val: number;
  val_total: number;
  mun_atendidos: number;
  razao_integralidade: number;
  glosa_fisica_pct: number;
}

export interface JusticaEspacialTabela41 {
  dimensao: string;
  estrato: string;
  municipios: number;
  pcd_2022: number;
  pct_mun_prod_res: number;
  pct_mun_atos_res: number;
  pct_mun_prod_ofe: number;
  pct_mun_atos_ofe: number;
  taxa_prod_res_1000pcd: number;
  taxa_atos_res_1000pcd: number;
  ri_res: number;
}

export interface IndicesDesigualdadeTabela42 {
  indicador: string;
  media_pond: number;
  sii: number;
  sii_ic95: string;
  rii: number;
  rii_ic95: string;
  conc_c: number;
  wagstaff_w: number;
  wagstaff_ic95: string;
  erreygers_e: number;
  interpretacao: string;
}

export interface ClusterMoranLisaTabela43 {
  indicador: string;
  moran_i: number;
  p_valor: number;
  cluster_lisa: string;
  municipios: number;
  pct_mun: number;
  pcd_2022: number;
  pct_pcd_nac: number;
  pib_pc_medio: number;
  taxa_media: number;
}

export interface ModeloHurdleNBTabela51 {
  modelo: string;
  estagio: string;
  termo: string;
  estimativa: number;
  or_irr: number;
  ic95: string;
  p_valor: string;
  significativo: boolean;
}

export interface RedeFluxoODMacroTabela52 {
  macrorregiao: string;
  arcos_intermun: number;
  pct_prod_intermun: number;
  pct_atos_intermun: number;
  pct_cruza_rs: number;
  pct_cruza_uf: number;
  dist_media_km: number;
  mediana_km: number;
}

export interface PoloAtratorTabela53 {
  polo: string;
  uf: string;
  macrorregiao: string;
  produtos: number;
  atos_clinicos: number;
  valor_aprovado: number;
  in_degree_mun: number;
  dist_media_km: number;
  pct_nac: number;
  razao_integralidade: number;
  perfil_auditoria: string;
}

export interface ArcoODIntermunicipal {
  mun_origem: string;
  mun_destino: string;
  mun_origem_nome?: string;
  mun_destino_nome?: string;
  cruza_regiao_saude?: boolean;
  distancia_km?: number;
  uf_destino: string;
  macrorregiao_destino: string;
  prod_apr: number;
  proc_apr: number;
  total_itens: number;
  val_apr: number;
  faturamentos: number;
  razao_integralidade: number;
}

export interface ProcedimentoSigtapExcluido {
  codigo_sigtap: string;
  modalidade: string;
  categoria_ta: string;
  subcategoria_ta: string;
  descricao_sigtap: string;
  regra_exclusao: string;
  motivo_exclusao: string;
}

export interface PoloMunicipalOfertaRDS {
  cod_mun_6: string;
  municipio: string;
  uf: string;
  regiao_saude: string;
  pop_pcd_2022: number;
  cnes_ativos: number;
  prod_oferta: number;
  proc_oferta: number;
  val_oferta: number;
  ri_oferta: number;
  prod_residencia: number;
  proc_residencia: number;
  taxa_res_1000pcd: number;
}

export interface ArquivoZenodoCatalogo {
  arquivo: string;
  tamanho_bytes: number;
  tamanho_kb: number;
  checksum: string;
  extensao: string;
  url_download: string;
}

export interface PlanoEpistemologicoTabela11 {
  plano: string;
  taxonomia_leek_peng: string;
  dominios: string;
  perguntas_permitidas: string;
  indicadores_auditados: string;
  zonas_silencio: string;
  capitulos: string;
}

export interface ItemChecklistRECORD {
  codigo: string;
  secao: string;
  requisito: string;
  conformidade_sistema: string;
  localizacao: string;
}

export interface ItemChecklistGATHER {
  item: number;
  secao: string;
  requisito: string;
  status: string;
  evidencia: string;
}

export interface ProcedimentoSIGTAP {
  codigo_sigtap: string;
  modalidade: string;
  categoria_ta: string;
  subcategoria_ta: string;
  descricao_sigtap?: string;
  observacao_curadoria?: string;
  tipo_registro: NaturezaRegistro;
  faturamentos: number;
  qtd_pro: number;
  qtd_apr: number;
  val_pro: number;
  val_apr: number;
  tarifa_zero_normativa: boolean;
  glosa_qtd_pct: number;
}

export interface DemografiaFaixaEtaria {
  modalidade: string;
  tipo_registro: NaturezaRegistro;
  faixa_etaria: string;
  faturamentos: number;
  qtd_apr: number;
  val_apr: number;
}

export interface DemografiaRacaSexo {
  modalidade: string;
  tipo_registro: NaturezaRegistro;
  raca_cor: string;
  sexo: string;
  faturamentos: number;
  qtd_apr: number;
  val_apr: number;
}

export interface BaseDadosObservatorioTASUS {
  metadata: MetadataGlobal;
  reconciliacao_anual_tabela_1_2: ReconciliacaoAnualTabela12[];
  modalidades_tabela_a4: ModalidadeTabelaA4[];
  estratos_analiticos_tabela_1_3: EstratoAnaliticoTabela13[];
  completude_tabela_2_1: AuditoriaCompletudeTabela21[];
  cbo_tabela_2_2: ForcaTrabalhoCBOTabela22[];
  cid10_tabela_2_3: DiagnosticoCID10Tabela23[];
  economia_politica_tabela_3_1: EconomiaPoliticaTabela31[];
  modelo_quasi_poisson_tabela_3_3: ModeloQuasiPoissonTabela33[];
  justica_espacial_tabela_4_1: JusticaEspacialTabela41[];
  indices_desigualdade_tabela_4_2: IndicesDesigualdadeTabela42[];
  moran_lisa_tabela_4_3: ClusterMoranLisaTabela43[];
  modelo_hurdle_tabela_5_1: ModeloHurdleNBTabela51[];
  redes_od_macro_tabela_5_2: RedeFluxoODMacroTabela52[];
  top15_polos_tabela_5_3: PoloAtratorTabela53[];
  planos_epistemologicos_tabela_1_1: PlanoEpistemologicoTabela11[];
  checklist_record: ItemChecklistRECORD[];
  checklist_gather: ItemChecklistGATHER[];
  cubo_uf_ano_mod: CuboUfAnoModalidade[];
  serie_mensal: SerieMensalCompetencia[];
  resumo_uf: ResumoUfAnual[];
  lorenz_cnes: CurvaLorenzCNES[];
  top_cnes: RankingCNES[];
  demografia_faixa_etaria: DemografiaFaixaEtaria[];
  demografia_raca_sexo: DemografiaRacaSexo[];
  sigtap_catalog: ProcedimentoSIGTAP[];
  sigtap_excluidos_59?: ProcedimentoSigtapExcluido[];
  polos_municipais_oferta?: PoloMunicipalOfertaRDS[];
  arquivos_zenodo_35?: ArquivoZenodoCatalogo[];
  top_arcos_od_intermunicipais?: ArcoODIntermunicipal[];
}

export interface FiltroGlobalState {
  ano: 'ALL' | '2022' | '2023' | '2024';
  macro: 'ALL' | MacrorregiaoBrasil;
  uf: 'ALL' | string;
  municipioCod: string;
  municipioNome: string;
  modalidades: ModalidadeISO9999[];
  equipChartGroup: 'categoria' | 'ano' | 'regiao';
  equipChartMetric: 'equipamentos' | 'orcamento' | 'ambos' | 'ri';
  sigtapSearch: string;
  sigtapTipo: 'ALL' | 'Produto' | 'Procedimento' | 'ZERO';
  poloMunSearch: string;
  top10Scope: 'UF' | 'MUNICIPIO';
  top10Metric: 'taxa_1k_pcd' | 'ri' | 'prod';
}
