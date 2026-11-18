#!/usr/bin/env node
/**
 * Script GitFlow de Promoção Segura: develop -> main
 * Só realiza o merge na branch main (Produção / Vercel) se passar por todas as validações:
 * 1. Checagem estrita TypeScript (tsc --noEmit)
 * 2. Validação de integridade da base de dados (validate-data.mjs)
 * 3. Build de produção Vite (vite build)
 */

import { execSync } from 'node:child_process';

function run(cmd) {
  console.log(`\n▶ Executando: ${cmd}`);
  execSync(cmd, { stdio: 'inherit' });
}

try {
  console.log('====================================================================');
  console.log(' 🚀 INICIANDO PROCESSO GITFLOW DE PROMOÇÃO: develop -> main');
  console.log('====================================================================');

  // 1. Verificar se há arquivos pendentes sem commit
  const status = execSync('git status --porcelain').toString().trim();
  if (status) {
    console.error('❌ Existem alterações não commitadas. Faça commit na branch develop antes de promover para main.');
    process.exit(1);
  }

  // 2. Rodar Quality Gate completo (TypeScript + Dados + Build Vite)
  run('npm run validate');

  // 3. Atualizar develop remoto
  run('git checkout develop');
  run('git push origin develop');

  // 4. Fazer merge fast-forward/no-ff em main e enviar para produção
  run('git checkout main');
  run('git pull origin main');
  run('git merge develop --no-ff -m "chore(release): promove develop validada para main (producao)"');
  run('git push origin main');

  // 5. Retornar automaticamente para a branch develop
  run('git checkout develop');

  console.log('\n====================================================================');
  console.log(' ✅ SUCESSO! A branch main foi atualizada e você voltou para develop.');
  console.log('====================================================================');
} catch (err) {
  console.error('\n❌ Falha na promoção para main. O código permanece isolado na branch de desenvolvimento.');
  try {
    execSync('git checkout develop', { stdio: 'ignore' });
  } catch {}
  process.exit(1);
}
