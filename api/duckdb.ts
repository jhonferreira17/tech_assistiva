import type { IncomingMessage, ServerResponse } from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

export default function handler(req: IncomingMessage, res: ServerResponse): void {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ status: 'error', message: 'Method Not Allowed' }));
    return;
  }

  let body = '';
  req.on('data', chunk => {
    body += chunk.toString();
  });

  req.on('end', () => {
    try {
      const payload = JSON.parse(body || '{}') as { sql?: string };
      const sql = (payload.sql || '').toLowerCase();

      const jsonPath = path.join(process.cwd(), 'public', 'data', 'dados_ta_sus_2022_2024.json');
      const raw = fs.readFileSync(jsonPath, 'utf-8');
      const db = JSON.parse(raw);

      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');

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

      // Default preset 1: annual summary by tipo_registro
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
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(
        JSON.stringify({
          status: 'error',
          message: err instanceof Error ? err.message : String(err)
        })
      );
    }
  });
}
