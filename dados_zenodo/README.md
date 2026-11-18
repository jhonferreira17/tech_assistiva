# Microdados de Tecnologia Assistiva no Sistema Único de Saúde (SUS) — Triênio 2022–2024
## Base Censitária Nacional Auditada de Faturamentos Ambulatoriais (SIA/SUS), Dicionários Taxonômicos (SIGTAP), Cadastros CNES e Pareamento Censitário com o Censo Demográfico IBGE 2022

[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.placeholder.svg)](https://doi.org/10.5281/zenodo.placeholder)
[![License: CC BY 4.0](https://img.shields.io/badge/License-CC_BY_4.0-lightgrey.svg)](https://creativecommons.org/licenses/by/4.0/)
[![Standard: RECORD/GATHER](https://img.shields.io/badge/Standard-RECORD%20%2F%20GATHER-blue.svg)](https://www.equator-network.org/)
[![Data Format: Apache Parquet](https://img.shields.io/badge/Format-Apache%20Parquet-orange.svg)](https://parquet.apache.org/)

---

### Autoria, Liderança Científica e Coordenação do Projeto PPSUS

* **Coordenadora do Projeto (Principal Investigator — PI):** Profa. Dra. Carolina Maria do Carmo Alonso (Universidade Federal do Rio de Janeiro — UFRJ / Faculdade de Medicina / PPG em Ciências da Reabilitação e PPG em Engenharia de Produção)
* **Vice-Coordenador do Projeto (Co-Principal Investigator / Vice-Coordinator):** Prof. Dr. Hidelbrando Ferreira Rodrigues (Universidade Federal do Amazonas — UFAM / Instituto de Ciências Exatas e Tecnologia — ICET) — ORCID: [0000-0003-1266-0957](https://orcid.org/0000-0003-1266-0957)
* **Pesquisadores Integrantes da Equipe:**
  * Prof. Dr. Francisco José de Castro Moura Duarte (Universidade Federal do Rio de Janeiro — COPPE/UFRJ)
  * Profa. Dra. Lilian de Fátima Zanoni Nogueira (Universidade Federal do Rio de Janeiro — Faculdade de Medicina/UFRJ)
* **Consórcio Interinstitucional de Pesquisa:** Parceria Acadêmica e Científica DINTER COPPE/UFRJ – UFAM no âmbito do Programa de Pesquisa para o SUS (PPSUS / Decit-MS / CNPq / FAPERJ / FAPEAM)

---

### Financiamento e Fomento Institucional

Esta base de dados é fruto de pesquisa financiada pelo **Programa Pesquisa para o SUS: Gestão Compartilhada em Saúde (PPSUS)**, fruto da cooperação federativa entre:
* **Ministério da Saúde do Brasil** — Secretaria de Ciência, Tecnologia, Inovação e Complexo da Saúde (SECTICS) / Departamento de Ciência e Tecnologia (Decit);
* **Conselho Nacional de Desenvolvimento Científico e Tecnológico (CNPq)**;
* **Fundação Carlos Chagas Filho de Amparo à Pesquisa do Estado do Rio de Janeiro (FAPERJ)**;
* **Fundação de Amparo à Pesquisa do Estado do Amazonas (FAPEAM)**.

---

### Resumo do Dataset (Abstract)

Este repositório disponibiliza a base de dados censitária e auditada da provisão de **Tecnologia Assistiva (TA) no Sistema Único de Saúde (SUS)** para o triênio pós-pandemia (**2022–2024**). A base resulta da varredura exaustiva de **1.779.894.079 registros ambulatoriais brutos** extraídos do Sistema de Informações Ambulatoriais do SUS (SIA/SUS, base `PA`), cobrindo **100% dos 5.570 municípios brasileiros em 972 partições mensais/estaduais (27 UFs × 36 meses)**.

A curadoria clínica e forense auditou os 226 procedimentos do subgrupo `07.01` da Tabela Unificada do SIGTAP, retendo **167 procedimentos estritos de Tecnologia Assistiva** (131 de concessão física de `Produto` e 36 de atos clínicos de `Procedimento` de reabilitação/adaptação) e expurgando 59 procedimentos não aderentes à Rede de Cuidados à Pessoa com Deficiência (RCPD). O dataset contém **2.089.337 faturamentos aprovados** totalizando **R$ 1.270.170.973,83** (2.167.191 dispositivos físicos entregues e 330.358 atos clínicos de acompanhamento), com pareamento determinístico aos **14,4 milhões de pessoas com deficiência identificadas no Censo Demográfico IBGE 2022** e ao cadastro de **592 estabelecimentos de saúde (CNES dez./2024)**.

---

### Estrutura do Pacote de Dados (Data Package Structure)

```
pacote_zenodo/
├── microdados_ta_sus_2022_2024_parquet.zip   # 972 partições colunares Apache Parquet
│   └── sia_ta_parquet/
│       └── uf=[UF]/ano=[ANO]/part-[MES].parquet
├── tabelas_apoio/
│   ├── tabela_correspondencia_sigtap_ta_validada.csv  # 226 códigos SIGTAP auditados
│   ├── cnes_estabelecimentos_ta_2024.csv             # 592 estabelecimentos e habilitações CER
│   └── painel_territorial_base.csv                   # 5.570 municípios com Censo 2022 e PcD
├── script_exemplo_reprodutibilidade.R                # Script R de abertura em segundos
├── datapackage.json                                  # Metadados formais Frictionless Data
├── CITATION.cff                                      # Arquivo de citação bibliográfica
└── Apendice_Metodologico_Rastreabilidade_Dados.pdf   # Dossiê de auditoria forense RECORD
```

---

### Dicionário de Variáveis dos Microdados (`sia_ta_parquet`)

Cada linha representa um registro individual de faturamento ambulatorial de Tecnologia Assistiva:

| Variável | Tipo | Descrição e Categorias |
| :--- | :--- | :--- |
| `PA_PROC_ID` | String (10) | Código oficial do procedimento na Tabela Unificada do SIGTAP |
| `PA_CODUNI` | String (7) | Código do estabelecimento no Cadastro Nacional de Estabelecimentos de Saúde (CNES) |
| `PA_UFMUN` | String (6) | Município de localização do estabelecimento prestador (IBGE 6 dígitos) |
| `PA_MUNPCN` | String (6) | Município de residência habitual do paciente (IBGE 6 dígitos, com DF normalizado) |
| `PA_MVM` | String (6) | Mês e ano de processamento/movimento da produção no SIA/SUS (`AAAAMM`) |
| `PA_CMP` | String (6) | Mês e ano da competência de realização efetiva do atendimento (`AAAAMM`) |
| `PA_CIDPRI` | String (4) | Código da causa primária ou diagnóstico associado segundo a CID-10 |
| `PA_CBOCOD` | String (6) | Código da ocupação do profissional executante na Classificação Brasileira de Ocupações |
| `PA_IDADE` | Inteiro | Idade do usuário em anos completos na data do atendimento |
| `PA_SEXO` | String (1) | Sexo do usuário (`M` = Masculino; `F` = Feminino) |
| `PA_RACACOR` | String (2) | Raça/cor autodeclarada (`01`=Branca, `02`=Preta, `03`=Parda, `04`=Amarela, `05`=Indígena, `99`=Sem inf.) |
| `PA_QTDPRO` | Inteiro | Quantidade física de procedimentos apresentada/produzida pelo prestador |
| `PA_QTDAPR` | Inteiro | Quantidade física de procedimentos efetivamente aprovada pelo gestor/auditor do SUS |
| `PA_VALPRO` | Numérico | Valor financeiro total apresentado/produzido pelo prestador em Reais (R$) |
| `PA_VALAPR` | Numérico | Valor financeiro total efetivamente aprovado e liquidado pelo SUS em Reais (R$) |
| `id_taxonomia_ta` | String (7) | Código taxonômico padronizado do projeto (`TA01.01` a `TA10.02`) |
| `categoria_ta` | String | Macrocategoria (`TA01`=Ortopédicas/Locomoção, `TA02`=Órteses/Próteses, `TA03`=Auditiva, etc.) |
| `subcategoria_ta`| String | Descrição analítica da subcategoria funcional da tecnologia dispensada |
| `tipo_registro` | String | Classificação forense estrita: `Produto` (concessão física) ou `Procedimento` (ato clínico) |
| `uf` | String (2) | Sigla da Unidade da Federação de localização do prestador (`AC`, `AL`, ..., `TO`) |
| `ano` | Inteiro | Ano de realização da competência ambulatorial (`2022`, `2023`, `2024`) |
| `mes` | String (2) | Mês de realização da competência ambulatorial (`01` a `12`) |

---

### Como Carregar os Dados em R (Exemplo Rápido)

Graças ao formato colunar Apache Parquet, você pode consultar toda a base de 2 milhões de linhas em menos de 2 segundos sem sobrecarregar a memória RAM:

```r
# Utilizando DuckDB (sem carregar o dataset na memoria)
library(duckdb)
con <- dbConnect(duckdb())

# Conectar diretamente a pasta de parquets particionados
query <- "
  SELECT 
    ano, 
    tipo_registro, 
    categoria_ta, 
    SUM(PA_QTDAPR) AS total_unidades, 
    SUM(PA_VALAPR) AS total_reais
  FROM read_parquet('sia_ta_parquet/*/*/*.parquet')
  GROUP BY ano, tipo_registro, categoria_ta
  ORDER BY ano, tipo_registro, categoria_ta;
"
resultado <- dbGetQuery(con, query)
print(resultado)
```

---

### Licença e Condições de Uso (Open Access)

Este conjunto de dados é distribuído sob a licença **Creative Commons Attribution 4.0 International (CC-BY 4.0)**. 
Você é livre para compartilhar (copiar e redistribuir em qualquer suporte ou formato) e adaptar (remixar, transformar e criar a partir do material para qualquer fim, mesmo comercial), **desde que atribua o devido crédito aos autores originais, forneça um link para a licença e indique se foram feitas alterações**.

---

### Citação Recomendada (How to Cite)

#### Formato ABNT (NBR 6023:2018):
> ALONSO, Carolina Maria do Carmo; RODRIGUES, Hidelbrando Ferreira; DUARTE, Francisco José de Castro Moura; NOGUEIRA, Lilian de Fátima Zanoni. **Microdados de Tecnologia Assistiva no Sistema Único de Saúde (SUS) — Triênio 2022–2024: Base Censitária Nacional Auditada e Pareada ao Censo Demográfico IBGE 2022**. Repositório Zenodo (CERN), 2026. DOI: [10.5281/zenodo.placeholder]. Disponível em: https://doi.org/10.5281/zenodo.placeholder.

#### Formato BibTeX:
```bibtex
@dataset{alonso_rodrigues_2026_ta_sus,
  author       = {Alonso, Carolina Maria do Carmo and Rodrigues, Hidelbrando Ferreira and Duarte, Francisco José de Castro Moura and Nogueira, Lilian de Fátima Zanoni},
  title        = {{Microdados de Tecnologia Assistiva no Sistema Único de Saúde (SUS) — Triênio 2022–2024: Base Censitária Nacional Auditada e Pareada ao Censo Demográfico IBGE 2022}},
  month        = nov,
  year         = 2026,
  publisher    = {Zenodo},
  version      = {1.0.0},
  doi          = {10.5281/zenodo.placeholder},
  url          = {https://doi.org/10.5281/zenodo.placeholder}
}
```

---

### Declaração Ética de Apoio Computacional e Governança (ICMJE / COPE)

Em conformidade com as diretrizes internacionais do *International Committee of Medical Journal Editors* (ICMJE), *Committee on Publication Ethics* (COPE) e o Marco Legal de Inteligência Artificial do Brasil (PL nº 2.338/2023), declara-se que o desenvolvimento dos scripts de extração, auditoria de integridade algébrica e particionamento dos microdados contou com assistência operacional de ferramentas de Inteligência Artificial (Google DeepMind / Antigravity). Os pesquisadores humanos coordenadores assumem a autoria integral, curadoria metodológica e responsabilidade pública pela veracidade dos dados disponibilizados.
