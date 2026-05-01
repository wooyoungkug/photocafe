/**
 * PhotoCafe 로컬 프린트 에이전트
 *
 * 사용법:
 *   node print-agent.js
 *
 * - 이 파일을 실행하면 localhost:9199 에서 프린터 목록 API가 열립니다.
 * - photocafe.co.kr 에서 로컬 PC의 프린터 목록을 조회할 수 있게 됩니다.
 * - 설정에서 "폴더 감시 자동 인쇄"를 활성화하면 지정 폴더에 새 PDF가 생길 때 자동 인쇄합니다.
 * - 이 창을 닫으면 프린터 목록 조회 및 자동 인쇄가 중단됩니다.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PORT = 9199;
const ALLOWED_ORIGINS = [
  'https://photocafe.co.kr',
  'https://www.photocafe.co.kr',
  'http://localhost:3002',
  'http://localhost:3000',
];

// ==================== 설정 파일 ====================

const CONFIG_PATH = path.join(__dirname, 'print-agent-config.json');
const SAVE_CONFIG_PATH = path.join(__dirname, 'agent-config.json');

/** @type {{ watchEnabled: boolean, watchFolder: string, indigoPrinter: string, inkjetPrinter: string, printedFiles: string[] }} */
let config = {
  watchEnabled: false,
  watchFolder: '',
  indigoPrinter: '',
  inkjetPrinter: '',
  printedFiles: [],
};

/** @type {{ savePath: string }} */
let saveConfigData = {
  savePath: '',
};

function loadSaveConfig() {
  try {
    if (fs.existsSync(SAVE_CONFIG_PATH)) {
      const raw = fs.readFileSync(SAVE_CONFIG_PATH, 'utf8');
      saveConfigData = { ...saveConfigData, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.warn('[에이전트] 저장 설정 로드 실패, 기본값 사용:', e.message);
  }
}

function persistSaveConfig() {
  try {
    fs.writeFileSync(SAVE_CONFIG_PATH, JSON.stringify(saveConfigData, null, 2), 'utf8');
  } catch (e) {
    console.warn('[에이전트] 저장 설정 파일 저장 실패:', e.message);
  }
}

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
      config = { ...config, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.warn('[에이전트] 설정 파일 로드 실패, 기본값 사용:', e.message);
  }
}

function saveConfig() {
  try {
    // printedFiles 는 최근 2000개만 유지
    if (config.printedFiles.length > 2000) {
      config.printedFiles = config.printedFiles.slice(-2000);
    }
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');
  } catch (e) {
    console.warn('[에이전트] 설정 파일 저장 실패:', e.message);
  }
}

// ==================== CORS ====================

function setCorsHeaders(req, res) {
  const origin = req.headers.origin || '';
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Filename, X-Subpath');
  // Chrome Private Network Access: https 사이트 → localhost POST 허용
  res.setHeader('Access-Control-Allow-Private-Network', 'true');
}

// ==================== 저장 경로 유틸 ====================

/** 파일/폴더명에 위험한 문자 치환 */
function sanitizeSegment(seg) {
  return seg.replace(/[<>:"|?*\x00-\x1f]/g, '_').trim();
}

/** subPath ("260418/4도/양면") 를 안전한 절대경로로 결합 */
function resolveSavePath(subPath, fileName) {
  const base = saveConfigData.savePath;
  if (!base) return null;
  const safeFileName = sanitizeSegment(fileName).replace(/[\\/]/g, '_');

  let targetDir = base;
  if (subPath) {
    const segments = subPath
      .split(/[\\/]/)
      .map(sanitizeSegment)
      .filter(Boolean);
    for (const seg of segments) {
      targetDir = path.join(targetDir, seg);
    }
  }
  const fullPath = path.join(targetDir, safeFileName);
  return { targetDir, fullPath };
}

// ==================== 프린터 조회 ====================

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
  const output = execSync('lpstat -a 2>/dev/null || echo ""', { encoding: 'utf8', timeout: 5000 });
  return output
    .split('\n')
    .filter(Boolean)
    .map((line) => ({ name: line.split(' ')[0], driver: '', port: '' }));
}

// ==================== 인쇄 ====================

function detectPrinter(filePath) {
  const isInkjet =
    filePath.includes('잉크젯') ||
    filePath.toLowerCase().includes('inkjet');
  if (isInkjet && config.inkjetPrinter) return config.inkjetPrinter;
  if (!isInkjet && config.indigoPrinter) return config.indigoPrinter;
  return '';
}

function printFile(filePath, printerName) {
  if (process.platform !== 'win32') {
    const cmd = printerName
      ? `lpr -P "${printerName}" "${filePath}"`
      : `lpr "${filePath}"`;
    execSync(cmd, { timeout: 60000 });
    return;
  }
  const safePath = filePath.replace(/'/g, "''");
  const cmd = printerName
    ? `powershell -NoProfile -Command "Start-Process -FilePath '${safePath}' -Verb PrintTo -ArgumentList '${printerName.replace(/'/g, "''")}' -Wait -WindowStyle Hidden"`
    : `powershell -NoProfile -Command "Start-Process -FilePath '${safePath}' -Verb Print -Wait -WindowStyle Hidden"`;
  execSync(cmd, { timeout: 60000 });
}

// ==================== 폴더 감시 ====================

let activeWatcher = null;
const pendingFiles = new Map(); // debounce용

function startWatcher() {
  stopWatcher();

  if (!config.watchEnabled || !config.watchFolder) return;
  if (!fs.existsSync(config.watchFolder)) {
    console.log(`[에이전트] 감시 폴더 없음: ${config.watchFolder}`);
    return;
  }

  console.log(`[에이전트] 폴더 감시 시작: ${config.watchFolder}`);

  try {
    activeWatcher = fs.watch(
      config.watchFolder,
      { recursive: true },
      (event, filename) => {
        if (!filename) return;
        if (!filename.toLowerCase().endsWith('.pdf')) return;

        // debounce: 동일 파일은 1초 내 중복 이벤트 무시
        if (pendingFiles.has(filename)) return;
        pendingFiles.set(filename, true);

        setTimeout(() => {
          pendingFiles.delete(filename);
          const fullPath = path.join(config.watchFolder, filename);

          if (!fs.existsSync(fullPath)) return;
          if (config.printedFiles.includes(fullPath)) return;

          const printer = detectPrinter(fullPath);
          console.log(
            `[에이전트] 새 PDF 감지: ${path.basename(fullPath)}` +
            (printer ? ` → 프린터: ${printer}` : ' → 기본 프린터'),
          );

          try {
            printFile(fullPath, printer);
            config.printedFiles.push(fullPath);
            saveConfig();
            console.log(`[에이전트] 인쇄 완료: ${path.basename(fullPath)}`);
          } catch (e) {
            console.error(`[에이전트] 인쇄 실패: ${path.basename(fullPath)}`, e.message);
          }
        }, 1500);
      },
    );

    activeWatcher.on('error', (e) => {
      console.error('[에이전트] 감시 오류:', e.message);
      stopWatcher();
    });
  } catch (e) {
    console.error('[에이전트] 감시 시작 실패:', e.message);
  }
}

function stopWatcher() {
  if (activeWatcher) {
    activeWatcher.close();
    activeWatcher = null;
    console.log('[에이전트] 폴더 감시 중지');
  }
}

// ==================== 요청 body 파싱 ====================

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve({});
      }
    });
    req.on('error', reject);
  });
}

// ==================== HTTP 서버 ====================

const server = http.createServer(async (req, res) => {
  setCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // GET /health
  if (req.url === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      ok: true,
      agent: 'photocafe-print-agent',
      version: '1.1.0',
      watchEnabled: config.watchEnabled,
      watchFolder: config.watchFolder,
      watching: !!activeWatcher,
    }));
    return;
  }

  // GET /printers
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

  // GET /watch-config
  if (req.url === '/watch-config' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      watchEnabled: config.watchEnabled,
      watchFolder: config.watchFolder,
      indigoPrinter: config.indigoPrinter,
      inkjetPrinter: config.inkjetPrinter,
      watching: !!activeWatcher,
      printedCount: config.printedFiles.length,
    }));
    return;
  }

  // POST /watch-config  { watchEnabled, watchFolder, indigoPrinter, inkjetPrinter }
  if (req.url === '/watch-config' && req.method === 'POST') {
    try {
      const body = await readBody(req);
      if (typeof body.watchEnabled === 'boolean') config.watchEnabled = body.watchEnabled;
      if (typeof body.watchFolder === 'string') config.watchFolder = body.watchFolder.trim();
      if (typeof body.indigoPrinter === 'string') config.indigoPrinter = body.indigoPrinter.trim();
      if (typeof body.inkjetPrinter === 'string') config.inkjetPrinter = body.inkjetPrinter.trim();
      saveConfig();
      startWatcher();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, watching: !!activeWatcher }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: e.message }));
    }
    return;
  }

  // GET /save-config
  if (req.url === '/save-config' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ savePath: saveConfigData.savePath }));
    return;
  }

  // POST /save-config { savePath }
  if (req.url === '/save-config' && req.method === 'POST') {
    try {
      const body = await readBody(req);
      if (typeof body.savePath === 'string') {
        saveConfigData.savePath = body.savePath.trim();
        persistSaveConfig();
        console.log(`[에이전트] PDF 저장 경로 설정: ${saveConfigData.savePath || '(없음)'}`);
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, savePath: saveConfigData.savePath }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: e.message }));
    }
    return;
  }

  // POST /save-pdf  (스트리밍 바디, 헤더 X-Filename / X-Subpath 사용)
  if (req.url === '/save-pdf' && req.method === 'POST') {
    try {
      if (!saveConfigData.savePath) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: '에이전트에 저장 경로가 설정되지 않았습니다.' }));
        return;
      }

      const rawFileName = req.headers['x-filename'] || '';
      const rawSubPath = req.headers['x-subpath'] || '';
      let fileName = '';
      let subPath = '';
      try {
        fileName = decodeURIComponent(Array.isArray(rawFileName) ? rawFileName[0] : rawFileName);
      } catch {
        fileName = String(rawFileName);
      }
      try {
        subPath = decodeURIComponent(Array.isArray(rawSubPath) ? rawSubPath[0] : rawSubPath);
      } catch {
        subPath = String(rawSubPath);
      }

      if (!fileName) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'X-Filename 헤더가 필요합니다.' }));
        return;
      }

      const resolved = resolveSavePath(subPath, fileName);
      if (!resolved) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: '저장 경로를 결정할 수 없습니다.' }));
        return;
      }

      try {
        fs.mkdirSync(resolved.targetDir, { recursive: true });
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: `폴더 생성 실패: ${e.message}` }));
        return;
      }

      const writeStream = fs.createWriteStream(resolved.fullPath);
      writeStream.on('error', (err) => {
        console.error('[에이전트] PDF 저장 실패:', err.message);
        try {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: err.message }));
        } catch { /* already responded */ }
      });
      writeStream.on('finish', () => {
        console.log(`[에이전트] PDF 저장 완료: ${resolved.fullPath}`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, path: resolved.fullPath }));
      });
      req.on('error', (err) => {
        console.error('[에이전트] PDF 업로드 스트림 오류:', err.message);
        writeStream.destroy();
      });
      req.pipe(writeStream);
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: e.message }));
    }
    return;
  }

  // POST /pull-and-save  { downloadUrl, fileName, subPath }
  // 브라우저 blob 전송 없이 에이전트가 Railway에서 직접 다운로드하여 저장
  if (req.url === '/pull-and-save' && req.method === 'POST') {
    try {
      if (!saveConfigData.savePath) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: '에이전트에 저장 경로가 설정되지 않았습니다.' }));
        return;
      }
      const body = await readBody(req);
      const { downloadUrl, fileName, subPath } = body;
      if (!downloadUrl || !fileName) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'downloadUrl, fileName 필수' }));
        return;
      }
      const resolved = resolveSavePath(subPath || '', fileName);
      if (!resolved) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: '저장 경로를 결정할 수 없습니다.' }));
        return;
      }
      try {
        fs.mkdirSync(resolved.targetDir, { recursive: true });
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: `폴더 생성 실패: ${e.message}` }));
        return;
      }
      // Railway에서 직접 HTTP(S) 스트리밍 다운로드
      const https = require('https');
      const http = require('http');
      const parsedUrl = new URL(downloadUrl);
      const client = parsedUrl.protocol === 'https:' ? https : http;
      const writeStream = fs.createWriteStream(resolved.fullPath);
      const download = new Promise((resolve, reject) => {
        const request = client.get(downloadUrl, (dlRes) => {
          if (dlRes.statusCode !== 200) {
            dlRes.resume();
            return reject(new Error(`Railway 다운로드 실패: HTTP ${dlRes.statusCode}`));
          }
          dlRes.pipe(writeStream);
          writeStream.on('finish', resolve);
          writeStream.on('error', reject);
        });
        request.on('error', reject);
        request.setTimeout(120000, () => {
          request.destroy();
          reject(new Error('다운로드 타임아웃 (120초)'));
        });
      });
      try {
        await download;
        console.log(`[에이전트] pull-and-save 완료: ${resolved.fullPath}`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, path: resolved.fullPath }));
      } catch (e) {
        try { fs.unlinkSync(resolved.fullPath); } catch { /* ignore */ }
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: e.message }));
      }
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: e.message }));
    }
    return;
  }

  // POST /print-url  { url, printerName? }
  // 로컬 Chrome/Edge headless로 URL을 렌더링해서 프린터에 출력 (슬립 인쇄용)
  if (req.url === '/print-url' && req.method === 'POST') {
    try {
      const body = await readBody(req);
      const { url: printUrl, printerName } = body;
      if (!printUrl) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'url 필수' }));
        return;
      }
      if (process.platform !== 'win32') {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'Windows 전용 기능입니다.' }));
        return;
      }
      const chromePaths = [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        path.join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe'),
        'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
        'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      ];
      const chromePath = chromePaths.find(p => { try { return fs.existsSync(p); } catch { return false; } });
      if (!chromePath) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'Chrome/Edge를 찾을 수 없습니다.' }));
        return;
      }
      const tempPdf = path.join(require('os').tmpdir(), `slip-${Date.now()}.pdf`);
      const { spawnSync } = require('child_process');
      // Chrome headless → PDF
      const chromeResult = spawnSync(
        chromePath,
        [
          '--headless=new',
          '--disable-gpu',
          '--no-sandbox',
          '--disable-dev-shm-usage',
          `--print-to-pdf=${tempPdf}`,
          '--print-to-pdf-no-header',
          '--run-all-compositor-stages-before-draw',
          '--virtual-time-budget=5000',
          printUrl,
        ],
        { timeout: 60000, windowsHide: true },
      );
      if (!fs.existsSync(tempPdf)) {
        const errMsg = chromeResult.stderr ? chromeResult.stderr.toString().slice(0, 300) : '알 수 없는 오류';
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: `PDF 생성 실패: ${errMsg}` }));
        return;
      }
      // PowerShell로 프린터에 출력
      printFile(tempPdf, printerName || '');
      try { setTimeout(() => { try { fs.unlinkSync(tempPdf); } catch { /* ignore */ } }, 30000); } catch { /* ignore */ }
      console.log(`[에이전트] 슬립 인쇄 완료: ${printUrl} → ${printerName || '기본 프린터'}`);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: e.message }));
    }
    return;
  }

  // POST /print-file  { filePath, printerName? }
  if (req.url === '/print-file' && req.method === 'POST') {
    try {
      const body = await readBody(req);
      const filePath = body.filePath || '';
      if (!filePath || !fs.existsSync(filePath)) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: '파일을 찾을 수 없습니다.' }));
        return;
      }
      const printer = body.printerName || detectPrinter(filePath);
      printFile(filePath, printer);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, printer: printer || '(기본 프린터)' }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: e.message }));
    }
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

// ==================== 시작 ====================

loadConfig();
loadSaveConfig();

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

  if (config.watchEnabled && config.watchFolder) {
    startWatcher();
  } else {
    console.log('[에이전트] 폴더 감시 비활성 (설정에서 활성화 가능)');
  }

  if (saveConfigData.savePath) {
    console.log(`[에이전트] PDF 저장 경로: ${saveConfigData.savePath}`);
  } else {
    console.log('[에이전트] PDF 저장 경로 미설정 (설정에서 지정 가능)');
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
