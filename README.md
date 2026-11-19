<p align="center">
  <img src="public/orbita-mark.svg" alt="Logo ORBITA" width="96" />
</p>

<h1 align="center">ORBITA — Observatório de Dados sobre Tecnologia Assistiva (SUS)</h1>

<p align="center">
  Plataforma web interativa para monitoramento nacional da dispensação de equipamentos, acompanhamento clínico e fluxos territoriais de Tecnologia Assistiva no Sistema Único de Saúde (2022–2024).
</p>

<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Vite-6.x-646CFF?logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/OpenStreetMap-Leaflet-7EBC6F?logo=openstreetmap&logoColor=white" alt="OpenStreetMap" />
  <img src="https://img.shields.io/badge/Deploy-Vercel-000000?logo=vercel&logoColor=white" alt="Vercel" />
  <img src="https://img.shields.io/badge/Zenodo_DOI-10.5281%2Fzenodo.24225551-0284C7" alt="Zenodo DOI" />
</p>

---

## Visão Geral

O **ORBITA** consolida e audita a base censitária nacional de Tecnologia Assistiva do SIA/SUS (2022–2024), integrada ao Censo Demográfico IBGE 2022, malhas territoriais municipais e critérios internacionais de transparência em saúde (**RECORD** e **GATHER**).

### Números Consolidados da Base Auditada (2022–2024)

| Indicador | Valor Auditado |
| :--- | ---: |
| **Registros ambulatoriais aprovados (SIA/SUS)** | 2.089.337 |
| **Total de itens aprovados** | 2.497.549 |
| **Equipamentos físicos entregues (`REG01`)** | 2.167.191 |
| **Atendimentos clínicos de adaptação (`REG02`)** | 330.358 |
| **Índice de Acompanhamento (`RI = REG02 / REG01`)** | 0,1524 |
| **Investimento SUS aprovado** | R$ 1.270.170.973,39 |
| **Cobertura territorial** | 27 UFs • 5.570 municípios IBGE • 314 polos ofertantes |
| **Repositório oficial de dados (Zenodo)** | 35 arquivos • 972 partições Apache Parquet |

---

## Principais Módulos e Funcionalidades

- **Painel Geral:** evolução mensal (36 competências), separação rigorosa entre equipamentos físicos e atendimentos clínicos, resumo anual e grupos de equipamentos.
- **Ranking (Top 10):** seção dedicada com gráficos interativos e quadro comparativo das **10 Melhores e 10 Piores localidades** (por **Estados — 27 UFs** ou **Municípios Polos — 314**), alternando entre *Taxa por 1.000 PcD*, *Índice de Acompanhamento (RI)* e *Volume de Equipamentos*.
- **Mapa & Cobertura (OpenStreetMap):**
  - Mapa dinâmico de **Origem → Destino** com clique por Estado, malhas municipais do IBGE e cálculo de trajeto rodoviário (OSRM).
  - **Mapa de Calor (Heatmap)** nativo em Canvas 2D sobre OpenStreetMap (100% gratuito, sem necessidade de chave de API), com modos *Rotas*, *Mapa de Calor* e *Rotas + Calor*.
- **Filtros Globais & Busca por Município:** filtragem integrada por Período, Região, Estado, **Município (5.570 municípios IBGE)** e Linha de Cuidado (`TA01`–`TA10`), além de exportação em **CSV** e **JSON**.
- **Rede de Serviços (CNES):** perfil por esfera jurídica (Pública, Filantrópica e Privada), impacto de habilitação CER e Oficinas Ortopédicas, Curva de Lorenz e ranking dos principais estabelecimentos.
- **Deslocamento de Pacientes:** distâncias médias/medianas por macrorregião, fatores de acesso, 15 maiores polos atratores e principais rotas intermunicipais.
- **Pacientes & Equipes:** atuação multiprofissional (CBO), principais diagnósticos (CID-10) e perfil demográfico (faixa etária, sexo e raça/cor).
- **Catálogo SIGTAP:** consulta aos **167 itens monitorados** (incluindo identificação dos 34 procedimentos de custeio global CER com tarifa unitária R$ 0,00) e aos **59 itens fora do escopo de reabilitação**.
- **Base de Dados & Qualidade:** console SQL sobre a base (`DuckDB` local / serverless na Vercel), inventário dos 35 arquivos do Zenodo e checklists completos **RECORD (13/13)** e **GATHER (18/18)**.

---

## Stack Tecnológica

- **Frontend:** TypeScript, Vite 6, HTML5, CSS3 (tema claro/escuro minimalista)
- **Visualização de Dados:** Chart.js 4 (gráficos interativos com clique para filtrar)
- **Geoprocessamento & Mapas:** Leaflet + OpenStreetMap + Canvas 2D Heatmap + API de Malhas IBGE + OSRM
- **Backend / Serverless:** Node.js + TypeScript (`api/health.ts`, `api/duckdb.ts`), pronto para **Vercel**

---

## Estrutura do Projeto

```text
├── api/
│   ├── duckdb.ts                  # Endpoint serverless (Vercel) para consultas SQL somente-leitura
│   └── health.ts                  # Healthcheck da API
├── public/
│   ├── orbita-mark.svg            # Marca oficial e favicon do ORBITA
│   └── data/
│       ├── dados_ta_sus_2022_2024.json / .js   # Base analítica auditada
│       ├── fluxos_od_mapa.json / .js           # Rotas O-D, polos e dicionário dos 5.570 municípios
│       └── br_estados.geojson / .js            # Malha simplificada das 27 UFs
├── scripts/
│   ├── validate-data.mjs          # Quality gate de integridade algébrica da base
│   └── promote-to-main.mjs        # Automação GitFlow (develop -> main)
├── src/
│   ├── main.ts                    # Orquestração de filtros, tabelas e gráficos interativos
│   ├── components/
│   │   └── mapaOrigemDestino.ts   # Controlador OpenStreetMap (Rotas O-D + Heatmap + IBGE + OSRM)
│   ├── server/
│   │   └── nodeServer.ts          # Servidor Node.js local opcional
│   └── types/
│       └── ta-sus.ts              # Tipagem TypeScript estrita da base
├── index.html                     # Interface principal do ORBITA
├── styles.css                     # Design system minimalista (claro/escuro)
├── vercel.json                    # Configuração de deploy na Vercel
├── vite.config.ts                 # Configuração Vite + middleware local DuckDB
└── GITFLOW.md                     # Documentação do fluxo de branches
```

---

## Como Executar Localmente

### Pré-requisitos
- **Node.js** 20+ e **npm** 10+

### Passo a passo

```bash
# 1. Instalar dependências
npm install

# 2. Iniciar servidor de desenvolvimento (http://localhost:3000)
npm run dev

# 3. Rodar validação completa (TypeScript + integridade dos dados + build)
npm run validate

# 4. Gerar build de produção
npm run build
```

---

## Fluxo GitFlow e Deploy (Vercel)

O repositório segue um fluxo controlado de branches (detalhes em [GITFLOW.md](GITFLOW.md)):

- **`develop`**: branch padrão de desenvolvimento e integração contínua.
- **`main`**: branch de produção (dispara deploy automático na **Vercel**).

Para promover alterações validadas de `develop` para `main`:

```bash
npm run flow:promote-main
```

O script executa automaticamente `npm run validate` (`tsc --noEmit`, auditoria dos dados e `vite build`) e só realiza o merge em `main` se todas as verificações passarem.

---

## Fonte de Dados e Critérios Metodológicos

- **Repositório de Dados (Zenodo):** [doi.org/10.5281/zenodo.24225551](https://doi.org/10.5281/zenodo.24225551)
- **Diretrizes de Relato:** RECORD (*REporting of studies Conducted using Observational Routinely-collected Data*) e GATHER (*Guidelines for Accurate and Transparent Health Estimates Reporting*).
- **Regras de Auditoria Aplicadas:**
  - Separação estrita entre equipamentos físicos (`REG01`) e atos clínicos (`REG02`) em todas as taxas populacionais.
  - Preservação dos 34 procedimentos clínicos de tarifa unitária zero (`VL_SA = 0`) como custeio global CER (MAC/FAEC), sem classificá-los como glosa financeira.
