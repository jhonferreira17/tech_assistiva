# ==============================================================================
# SCRIPT DE REPRODUTIBILIDADE E CONSULTA RÁPIDA (MICRODADOS TA / SUS 2022-2024)
# Autores: Prof. Dr. Hidelbrando Rodrigues (UFAM) & Profa. Dra. Carolina (UFRJ)
# Projeto: PPSUS / Pesquisa Nacional em Tecnologia Assistiva no SUS
# ==============================================================================

# 1. Carregar pacotes recomendados (ou instalar se necessario)
if (!requireNamespace("duckdb", quietly = TRUE)) install.packages("duckdb")
if (!requireNamespace("DBI", quietly = TRUE)) install.packages("DBI")

library(DBI)
library(duckdb)

# 2. Criar conexao DuckDB em memoria (desempenho ultrarrapido)
con <- dbConnect(duckdb::duckdb())

# Nota: Caso os dados estejam descompactados na pasta "sia_ta_parquet":
# O caminho abaixo busca recursivamente todas as particoes Parquet
parquet_path <- "sia_ta_parquet/*/*/*.parquet"

cat("Consultando base censitaria de Tecnologia Assistiva (trienio 2022-2024)...\n")

# 3. Consulta de Agregacao: Producao Fisica e Financeira por Ano e Tipo
query_resumo <- sprintf("
  SELECT 
    ano,
    tipo_registro,
    COUNT(*) AS total_registros_faturados,
    SUM(PA_QTDAPR) AS qtd_fisica_aprovada,
    ROUND(SUM(PA_VALAPR), 2) AS valor_financeiro_aprovado_reais
  FROM read_parquet('%s')
  GROUP BY ano, tipo_registro
  ORDER BY ano, tipo_registro;
", parquet_path)

# Executar query (executa em cerca de 1 a 2 segundos)
tryCatch({
  tabela_resumo <- dbGetQuery(con, query_resumo)
  print(tabela_resumo)
}, error = function(e) {
  cat("Nota: Descompacte o arquivo 'microdados_ta_sus_2022_2024_parquet.zip' para rodar a query localmente.\n")
})

# 4. Desconectar
dbDisconnect(con, shutdown = TRUE)
cat("\nConsulta concluida com sucesso!\n")
