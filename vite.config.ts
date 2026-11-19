import { defineConfig, Plugin } from 'vite';
import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

function duckdbParquetApiPlugin(): Plugin {
  const parquetGlob = path
    .join(process.cwd(), 'dados_zenodo', 'extracted', '*', '*', '*.parquet')
    .replace(/\\/g, '/');

  return {
    name: 'duckdb-parquet-api-middleware',
    configureServer(server) {
      server.middlewares.use('/api/health', (_req, res) => {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(
          JSON.stringify({
            status: 'ok',
            runtime: `Node.js ${process.version} + TypeScript`,
            doi: '10.5281/zenodo.24225551',
            parquetPartitions: 972,
            parquetGlob
          })
        );
      });

      server.middlewares.use('/api/duckdb', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
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
            const rawSql = (payload.sql || '').trim();
            if (!rawSql) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.end(JSON.stringify({ status: 'error', message: 'Consulta SQL vazia.' }));
              return;
            }

            const pyScript = `
import sys, json, duckdb
sql = sys.stdin.read()
parquet_glob = "${parquetGlob}"
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

            let stdoutData = '';
            let stderrData = '';

            proc.stdout.on('data', d => {
              stdoutData += d.toString('utf-8');
            });
            proc.stderr.on('data', d => {
              stderrData += d.toString('utf-8');
            });

            proc.on('close', () => {
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              if (stdoutData.trim()) {
                res.statusCode = 200;
                res.end(stdoutData.trim());
              } else {
                res.statusCode = 500;
                res.end(
                  JSON.stringify({
                    status: 'error',
                    message: stderrData || 'Erro ao executar DuckDB no Node.js'
                  })
                );
              }
            });

            proc.stdin.write(rawSql);
            proc.stdin.end();
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
      });
    }
  };
}

export default defineConfig({
  plugins: [duckdbParquetApiPlugin()],
  server: {
    port: 3000,
    host: true,
    watch: {
      ignored: ['**/documentos_base/**', '**/dados_zenodo/**']
    }
  }
});
