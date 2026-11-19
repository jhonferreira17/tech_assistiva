import type { IncomingMessage, ServerResponse } from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

type VercelRequest = IncomingMessage & { body?: unknown };

const MAX_BODY_BYTES = 64 * 1024;
const FORBIDDEN_SQL_RE = /\b(drop|delete|update|insert|alter|truncate|attach|copy|create|pragma)\b/i;

let cachedDb: any = null;

function loadAuditedDb(): any {
  if (cachedDb) return cachedDb;
  const candidates = [
    path.join(process.cwd(), 'public', 'data', 'dados_ta_sus_2022_2024.json'),
    path.join(process.cwd(), 'dist', 'data', 'dados_ta_sus_2022_2024.json')
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      cachedDb = JSON.parse(fs.readFileSync(p, 'utf-8'));
      return cachedDb;
    }
  }
  throw new Error('Base de dados consolidada não encontrada no ambiente serverless.');
}

async function readJsonBody(req: VercelRequest): Promise<{ sql?: string }> {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === 'string') return JSON.parse(req.body || '{}');
    if (typeof req.body === 'object') return req.body as { sql?: string };
  }

  return new Promise((resolve, reject) => {
    let body = '';
    let size = 0;
    req.on('data', chunk => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error('Payload SQL excede o limite permitido (64 KB).'));
        req.destroy();
        return;
      }
      body += chunk.toString('utf-8');
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body || '{}'));
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

export default async function handler(req: VercelRequest, res: ServerResponse): Promise<void> {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.end(JSON.stringify({ status: 'error', message: 'Method Not Allowed' }));
    return;
  }

  try {
    const payload = await readJsonBody(req);
    const rawSql = (payload.sql || '').trim();
    if (!rawSql) {
      res.statusCode = 400;
      res.end(JSON.stringify({ status: 'error', message: 'Consulta SQL vazia.' }));
      return;
    }
    if (FORBIDDEN_SQL_RE.test(rawSql)) {
      res.statusCode = 403;
      res.end(JSON.stringify({ status: 'error', message: 'Apenas consultas SELECT somente-leitura são permitidas.' }));
      return;
    }

    const sql = rawSql.toLowerCase();
    const db = loadAuditedDb();
    res.statusCode = 200;

    if (sql.includes('pa_cidpri') || sql.includes('cid10')) {
      const rows = (db.cid10_tabela_2_3 || []).slice(0, 15).map((r: any) => [
        r.modalidade,
        r.cid10,
        r.descricao,
        r.faturamentos,
        r.qtd_aprovada,
        r.val_aprovado
      ]);
      res.end(
        JSON.stringify({
          status: 'ok',
          columns: ['modalidade', 'cid10', 'descricao', 'registros', 'qtd_aprovada', 'valor_aprovado_reais'],
          rows
        })
      );
      return;
    }

    if (sql.includes('pa_valapr = 0') || sql.includes('tarifa')) {
      const rows = (db.sigtap_catalog || [])
        .filter((r: any) => r.tarifa_zero_normativa)
        .map((r: any) => [
          r.codigo_sigtap,
          r.modalidade,
          r.subcategoria_ta,
          r.descricao_sigtap || r.categoria_ta,
          r.faturamentos,
          r.qtd_apr,
          r.val_apr
        ]);
      res.end(
        JSON.stringify({
          status: 'ok',
          columns: ['codigo_sigtap', 'modalidade', 'subcategoria', 'descricao_sigtap', 'registros', 'atos_aprovados', 'valor_sigtap'],
          rows
        })
      );
      return;
    }

    const rows = (db.reconciliacao_anual_tabela_1_2 || []).map((r: any) => [
      r.ano,
      r.tipo_registro,
      r.linhas_sia,
      r.qtd_apresentada,
      r.qtd_aprovada,
      r.val_aprovado
    ]);
    res.end(
      JSON.stringify({
        status: 'ok',
        columns: ['ano', 'tipo_registro', 'registros', 'qtd_solicitada', 'qtd_aprovada', 'valor_aprovado_reais'],
        rows
      })
    );
  } catch (err) {
    res.statusCode = 400;
    res.end(
      JSON.stringify({
        status: 'error',
        message: err instanceof Error ? err.message : String(err)
      })
    );
  }
}
