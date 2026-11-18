#!/usr/bin/env node
/**
 * Portão de Qualidade (Quality Gate) da Base de Dados e Estrutura para GitFlow
 * Verifica se os arquivos de dados em public/data/ estão íntegros antes de liberar para a branch main.
 */

import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const requiredFiles = [
  'public/data/dados_ta_sus_2022_2024.json',
  'public/data/dados_ta_sus_2022_2024.js',
  'public/data/fluxos_od_mapa.json',
  'public/data/fluxos_od_mapa.js',
  'public/data/br_estados.geojson',
  'public/data/br_estados.js',
  'index.html',
  'vercel.json'
];

console.log('🔍 [GitFlow Quality Gate] Validando integridade dos arquivos e base de dados...');

for (const relPath of requiredFiles) {
  const fullPath = path.join(root, relPath);
  if (!fs.existsSync(fullPath)) {
    console.error(`❌ Erro: Arquivo obrigatório ausente: ${relPath}`);
    process.exit(1);
  }
}

const mainJson = JSON.parse(
  fs.readFileSync(path.join(root, 'public/data/dados_ta_sus_2022_2024.json'), 'utf-8')
);
const odJson = JSON.parse(
  fs.readFileSync(path.join(root, 'public/data/fluxos_od_mapa.json'), 'utf-8')
);

const m = mainJson?.metadata?.metricas_globais;
if (!m || m.qtd_aprovada_total !== 2497549 || m.ufs_cobertas !== 27) {
  console.error('❌ Erro: Fechamento contábil inválido em dados_ta_sus_2022_2024.json.');
  process.exit(1);
}

if (!odJson?.uf_bounds || Object.keys(odJson.uf_bounds).length !== 27) {
  console.error('❌ Erro: Mapa Origem-Destino não contém todas as 27 UFs.');
  process.exit(1);
}

console.log('✅ [GitFlow Quality Gate] Base de dados, 27 UFs e contratos JSON validados com sucesso!');
