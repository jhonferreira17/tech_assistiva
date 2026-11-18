/**
 * Servidor Backend Node.js + TypeScript do Observatório Nacional de Tecnologia Assistiva no SUS (2022–2024)
 * PPSUS / UFRJ–UFAM • Padrões RECORD, GATHER, CIF/OMS e ISO 9999
 * DOI Zenodo: 10.5281/zenodo.24225551
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const PORT = Number(process.env.PORT || 3000);
const ROOT_DIR = process.cwd();
const PARQUET_GLOB = path
  .join(ROOT_DIR, 'dados_zenodo', 'extracted', '*', '*', '*.parquet')
  .replace(/\\/g, '/');

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.pdf': 'application/pdf',
  '.svg': 'image/svg+xml',
  '.png': 'image/png'
};

const server = http.createServer((req, res) => {
  const urlObj = new URL(req.url || '/', `http://localhost:${PORT}`);

  if (urlObj.pathname === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(
      JSON.stringify({
        status: 'ok',
        runtime: `Node.js ${process.version} + TypeScript`,
        doi: '10.5281/zenodo.24225551',
        parquetPartitions: 972
      })
    );
    return;
  }

  if (urlObj.pathname === '/api/duckdb' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}') as { sql?: string };
        const rawSql = (payload.sql || '').trim();
        const pyScript = `
import sys, json, duckdb
sql = sys.stdin.read()
parquet_glob = "${PARQUET_GLOB}"
sql_resolved = sql.replace("sia_ta_parquet", f"read_parquet('{parquet_glob}')")
try:
    con = duckdb.connect()
    rel = con.sql(sql_resolved)
    cols = rel.columns
    rows = rel.limit(500).fetchall()
    print(json.dumps({"status": "ok", "columns": cols, "rows": rows}, ensure_ascii=False, default=str))
except Exception as e:
    print(json.dumps({"status": "error", "message": str(e)}, ensure_ascii=False))
`;
        const proc = spawn('python', ['-c', pyScript], {
          stdio: ['pipe', 'pipe', 'pipe'],
          env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
        });

        let out = '';
        proc.stdout.on('data', d => {
          out += d.toString('utf-8');
        });
        proc.on('close', () => {
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(out.trim() || JSON.stringify({ status: 'error', message: 'Sem retorno do DuckDB' }));
        });
        proc.stdin.write(rawSql);
        proc.stdin.end();
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ status: 'error', message: String(e) }));
      }
    });
    return;
  }

  // Static fallback
  const safePath = path.normalize(decodeURIComponent(urlObj.pathname)).replace(/^(\.\.[/\\])+/, '');
  const distDir = fs.existsSync(path.join(ROOT_DIR, 'dist', 'index.html'))
    ? path.join(ROOT_DIR, 'dist')
    : ROOT_DIR;
  let filePath = path.join(distDir, safePath === '/' || safePath === '\\' ? 'index.html' : safePath);

  if (!fs.existsSync(filePath) && fs.existsSync(path.join(ROOT_DIR, safePath))) {
    filePath = path.join(ROOT_DIR, safePath);
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404 Not Found');
  }
});

server.listen(PORT, () => {
  console.log(`====================================================================`);
  console.log(` Observatório Nacional de Tecnologia Assistiva no SUS (Node.js + TS)`);
  console.log(` Acesso Local: http://localhost:${PORT}`);
  console.log(`====================================================================`);
});
