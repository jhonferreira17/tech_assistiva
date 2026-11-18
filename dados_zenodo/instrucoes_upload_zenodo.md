# Guia Prático de Publicação no Zenodo (Passo a Passo)
## Depósito dos Microdados de Tecnologia Assistiva no SUS (2022–2024)
### Liderança: Profa. Dra. Carolina (UFRJ - Coordenadora Geral) & Prof. Dr. Hidelbrando Rodrigues (UFAM - Vice-Coordenador)

---

Este guia orienta o upload do seu conjunto de dados no **Zenodo** para obtenção do **DOI oficial permanente**. O processo é 100% gratuito e leva cerca de 5 minutos.

---

### Passo 1: Acessar e Criar Conta no Zenodo

1. Acesse o site oficial: [https://zenodo.org](https://zenodo.org)
2. No canto superior direito, clique em **"Log in"** ou **"Sign up"**.
   * *Recomendação:* Você ou a Coordenadora Profa. Carolina podem fazer login diretamente utilizando o identificador **ORCID** ou conta institucional.

---

### Passo 2: Iniciar um Novo Depósito (*New Upload*)

1. No topo da tela, clique no botão verde ou no menu: **"New upload"** (ou acesse `https://zenodo.org/deposit/new`).
2. Você verá a tela de submissão do dataset.

---

### Passo 3: Fazer o Upload dos Arquivos (Arrastar e Soltar)

Na seção **"Files"**, selecione ou arraste os seguintes arquivos localizados em `E:/.PPSUS_DATA/projeto/publicacao_zenodo/`:

1. `microdados_ta_sus_2022_2024_parquet.zip` (arquivo de ~15,5 MB contendo as 972 partições);
2. A pasta `tabelas_apoio/` (ou os 3 arquivos CSV contidos nela):
   * `tabela_correspondencia_sigtap_ta_validada.csv`
   * `cnes_estabelecimentos_ta_2024.csv`
   * `painel_territorial_base.csv`
3. `script_exemplo_reprodutibilidade.R`
4. `datapackage.json`
5. `README.md`
6. `CITATION.cff`

*Após selecionar os arquivos, clique no botão verde **"Start upload"**.*

---

### Passo 4: Preencher os Metadados Oficiais (Basta Copiar e Colar)

Preencha os campos do formulário do Zenodo conforme abaixo:

* **Resource type:** Selecione `Dataset`.
* **Title:**
  `Microdados de Tecnologia Assistiva no Sistema Único de Saúde (SUS) — Triênio 2022–2024: Base Censitária Nacional Auditada e Pareada ao Censo Demográfico IBGE 2022`
* **Authors (na ordem exata de coordenação do PPSUS):**
  1. *Autora 1 (Coordenadora Geral / PI):*
     * Family name: `Carolina` *(inserir sobrenome)*
     * Given names: `Profa. Dra.`
     * Affiliation: `Universidade Federal do Rio de Janeiro (UFRJ)`
  2. *Autor 2 (Vice-Coordenador Geral / Co-PI):*
     * Family name: `Rodrigues`
     * Given names: `Hidelbrando Ferreira`
     * Affiliation: `Universidade Federal do Amazonas (UFAM)`
* **Description:**
  Copie e cole o texto do arquivo `README.md` (a seção "Resumo do Dataset" / "Abstract").
* **License:**
  Selecione: `Creative Commons Attribution 4.0 International (CC-BY 4.0)`.
* **Keywords:**
  `Tecnologia Assistiva`, `Sistema Único de Saúde (SUS)`, `Reabilitação`, `Pessoas com Deficiência`, `Microdados DATASUS`, `Censo 2022`.
* **Funding (Financiamento):**
  * Adicione: `Programa Pesquisa para o SUS (PPSUS) / Decit-MS / CNPq / FAPERJ / FAPEAM`.

---

### Passo 5: Reservar o DOI (*Reserve DOI*) e Publicar

1. No topo da página de edição, você verá o campo **"Digital Object Identifier"**.
2. Clique no botão **"Reserve DOI"**:
   * O Zenodo gerará imediatamente o seu número de DOI (ex.: `10.5281/zenodo.14XXXXXX`).
   * Você já pode anotar esse número e usá-lo no livro ou artigo!
3. Quando tiver revisado os dados, clique em **"Publish"** (no topo direito).
