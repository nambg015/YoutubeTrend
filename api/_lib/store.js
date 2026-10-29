// Bộ đếm hạn mức + ghi nhớ giao dịch. Ưu tiên Upstash/Vercel KV (qua REST), nếu chưa cấu hình thì dùng RAM
// (RAM chỉ đúng trong 1 instance serverless -> chỉ để chạy thử; production PHẢI gắn KV).
const https = require('https');

const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '';
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '';
const mem = new Map();

function redis(cmd) {
  return new Promise((resolve, reject) => {
    const u = new URL(URL_);
    const payload = JSON.stringify(cmd);
    const req = https.request({
      hostname: u.hostname, path: u.pathname || '/', method: 'POST',
      headers: { Authorization: 'Bearer ' + TOKEN, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
    }, r => {
      let b = '';
      r.on('data', c => { b += c; });
      r.on('end', () => {
        try { const j = JSON.parse(b); if (j.error) reject(new Error(j.error)); else resolve(j.result); }
        catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(payload); req.end();
  });
}

const hasKv = () => !!(URL_ && TOKEN);

// Tăng bộ đếm, tự hết hạn sau ttlSec. Trả về giá trị sau khi tăng.
async function incr(key, ttlSec) {
  if (hasKv()) {
    const n = await redis(['INCR', key]);
    if (n === 1) await redis(['EXPIRE', key, String(ttlSec)]);
    return Number(n);
  }
  const now = Date.now();
  const cur = mem.get(key);
  if (!cur || cur.exp < now) { mem.set(key, { n: 1, exp: now + ttlSec * 1000 }); return 1; }
  cur.n += 1; return cur.n;
}

// Chỉ ghi nếu chưa tồn tại (dùng chống dùng 1 giao dịch ngân hàng cho nhiều đơn). true = ghi được.
async function setOnce(key, value, ttlSec) {
  if (hasKv()) {
    const r = await redis(['SET', key, String(value), 'NX', 'EX', String(ttlSec)]);
    return r === 'OK';
  }
  const now = Date.now();
  const cur = mem.get(key);
  if (cur && cur.exp > now) return false;
  mem.set(key, { n: value, exp: now + ttlSec * 1000 });
  return true;
}

async function get(key) {
  if (hasKv()) return await redis(['GET', key]);
  const cur = mem.get(key);
  return cur && cur.exp > Date.now() ? String(cur.n) : null;
}

const today = () => new Date().toISOString().slice(0, 10);

// Kiểm tra + trừ hạn mức ngày theo uid. Trả { allowed, used, limit }.
async function consumeDaily(uid, bucket, limit) {
  const used = await incr(`quota:${bucket}:${uid}:${today()}`, 60 * 60 * 26);
  return { allowed: used <= limit, used, limit };
}

module.exports = { incr, setOnce, get, consumeDaily, hasKv };
