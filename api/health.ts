import type { IncomingMessage, ServerResponse } from 'node:http';

export default function handler(_req: IncomingMessage, res: ServerResponse): void {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(
    JSON.stringify({
      status: 'ok',
      platform: 'Vercel Serverless (Node.js + TypeScript)',
      doi: '10.5281/zenodo.24225551',
      zenodoFiles: 35,
      parquetPartitions: 972
    })
  );
}
