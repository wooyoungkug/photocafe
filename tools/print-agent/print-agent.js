/**
 * PhotoCafe 로컬 프린트 에이전트
 *
 * 사용법:
 *   node print-agent.js
 *
 * - 이 파일을 실행하면 localhost:9199 에서 프린터 목록 API가 열립니다.
 * - photocafe.co.kr 에서 로컬 PC의 프린터 목록을 조회할 수 있게 됩니다.
 * - 이 창을 닫으면 프린터 목록이 조회되지 않습니다.
 */

const http = require('http');
const { execSync } = require('child_process');

const PORT = 9199;
const ALLOWED_ORIGINS = [
  'https://photocafe.co.kr',
  'https://www.photocafe.co.kr',
  'http://localhost:3002',
  'http://localhost:3000',
];

function setPrinterCorsHeaders(req, res) {
  const origin = req.headers.origin || '';
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function getPrinters() {
  if (process.platform === 'win32') {
    const output = execSync(
      'powershell -NoProfile -Command "Get-Printer | Select-Object Name,DriverName,PortName | ConvertTo-Json"',
      { encoding: 'utf8', timeout: 8000 },
    );
    const raw = JSON.parse(output);
    const list = Array.isArray(raw) ? raw : [raw];
    return list.map((p) => ({
      name: p.Name || '',
      driver: p.DriverName || '',
      port: p.PortName || '',
    }));
  }
  // macOS / Linux
  const output = execSync('lpstat -a 2>/dev/null || echo ""', { encoding: 'utf8', timeout: 5000 });
  return output
    .split('\n')
    .filter(Boolean)
    .map((line) => ({ name: line.split(' ')[0], driver: '', port: '' }));
}

const server = http.createServer((req, res) => {
  setPrinterCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, agent: 'photocafe-print-agent', version: '1.0.0' }));
    return;
  }

  if (req.url === '/printers' && req.method === 'GET') {
    try {
      const printers = getPrinters();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(printers));
    } catch (e) {
      console.error('[에이전트] 프린터 조회 오류:', e.message);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify([]));
    }
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, '127.0.0.1', () => {
  console.log('');
  console.log('======================================');
  console.log('  PhotoCafe 로컬 프린트 에이전트 실행 중');
  console.log(`  포트: ${PORT}`);
  console.log('  이 창을 닫으면 프린터 조회가 중단됩니다.');
  console.log('======================================');
  console.log('');
  try {
    const printers = getPrinters();
    console.log(`[에이전트] 감지된 프린터 ${printers.length}개:`);
    printers.forEach((p) => console.log(`  - ${p.name}`));
  } catch (e) {
    console.log('[에이전트] 프린터 조회 실패:', e.message);
  }
});

server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    console.error(`[에이전트] 포트 ${PORT}가 이미 사용 중입니다. 기존 에이전트를 종료 후 다시 실행하세요.`);
  } else {
    console.error('[에이전트] 오류:', e.message);
  }
  process.exit(1);
});
