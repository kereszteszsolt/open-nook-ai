// SPDX-FileCopyrightText: 2026 Keresztes Zsolt <https://kereszteszsolt.hu>
// SPDX-License-Identifier: Apache-2.0

import https from 'node:https';
import http from 'node:http';
import { syncBuiltinESMExports } from 'node:module';

if (process.env.OPENNOOK_TEST_MCP !== '1' || process.env.MCP_CONTEXT7_API_KEY !== 'onk005-test-only-key'
  || process.env.MCP_CONTEXT7_URL !== 'https://mcp.context7.com/mcp'
  || !/^\/open_nook_test[A-Za-z0-9_]*$/.test(new URL(process.env.DATABASE_URL).pathname)) {
  throw new Error('The fake MCP server requires explicit test settings and an isolated test database.');
}
const methods = [];
const server = http.createServer(async (request, response) => {
  if (request.method === 'GET' && request.url === '/stats') {
    response.writeHead(200, { 'Content-Type': 'application/json' }); response.end(JSON.stringify({ methods })); return;
  }
  if (request.method !== 'POST' || request.url !== '/mcp' || request.headers.authorization !== 'Bearer onk005-test-only-key') {
    response.writeHead(403); response.end(); return;
  }
  let raw = '';
  for await (const chunk of request) { raw += chunk; if (raw.length > 8192) { request.destroy(); return; } }
  const input = JSON.parse(raw); methods.push(input.method);
  if (input.method === 'notifications/initialized') { response.writeHead(202); response.end(); return; }
  const result = input.method === 'initialize'
    ? { protocolVersion: '2025-11-25', serverInfo: { name: 'private-mcp-fixture', version: '1' }, capabilities: { tools: {} }, instructions: 'This must never be sent to the model.' }
    : input.method === 'tools/list' ? { tools: [
      ...['resolve-library-id', 'query-docs'].map(name => ({ name, description: 'private-mcp-fixture <script>unsafe</script>', inputSchema: { type: 'object', properties: {} }, annotations: { readOnlyHint: true, destructiveHint: false } })),
      { name: 'delete-all', inputSchema: { type: 'object' } },
    ] } : null;
  response.writeHead(result ? 200 : 400, { 'Content-Type': 'application/json' });
  response.end(JSON.stringify({ jsonrpc: '2.0', id: input.id, ...(result ? { result } : { error: { code: -32601, message: 'Denied fixture method' } }) }));
});
await new Promise((resolve, reject) => { server.once('error', reject); server.listen(3001, '127.0.0.1', resolve); });
server.unref();

// Test-only TLS/DNS substitution; application RPC, HTTP parsing, SDK and byte guards stay real.
https.request = (url, options, callback) => {
  if (String(url) !== 'https://mcp.context7.com/mcp') throw new Error('External HTTPS is disabled in the MCP fixture.');
  return http.request({ ...options, hostname: '127.0.0.1', port: 3001, path: '/mcp', lookup: undefined }, callback);
};
syncBuiltinESMExports();
