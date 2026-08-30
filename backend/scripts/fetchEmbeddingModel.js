#!/usr/bin/env node
/**
 * ============================================================================
 * DOWNLOAD THE REAL MULTILINGUAL EMBEDDING MODEL (offline-capable)
 * ============================================================================
 *
 * Fetches the ONNX int8 build of `Xenova/multilingual-e5-small` (XLM-RoBERTa,
 * 384-dim, MIT license) into `backend/models/hf-cache/` so the in-process
 * Transformers.js runtime can load it with allowRemoteModels=false (no network
 * needed at application runtime).
 *
 * Sources, tried in order:
 *   1. Hugging Face CDN (works on open networks).
 *   2. GitHub codeload tarball mirror (`privatemanolo1963-sudo/
 *      archivio-semantico-modello`) — used in restricted environments where
 *      huggingface.co is firewalled but github.com/codeload is reachable.
 *      The mirror stores model_quantized.onnx as modello_00..14 and
 *      tokenizer.json as tokenizer_00..02; this script concatenates them.
 *
 * If download is impossible, EmbeddingService automatically falls back to the
 * deterministic engine (logged clearly), so the app still boots.
 *
 * Usage:  node scripts/fetchEmbeddingModel.js
 */
const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

const MODEL_DIR = path.join(__dirname, '..', 'models', 'hf-cache', 'Xenova', 'multilingual-e5-small');
const ONNX_DIR = path.join(MODEL_DIR, 'onnx');
const ONNX_FILE = path.join(ONNX_DIR, 'model_quantized.onnx');
const TOKENIZER_FILE = path.join(MODEL_DIR, 'tokenizer.json');

const HF_BASE = 'https://huggingface.co/Xenova/multilingual-e5-small/resolve/main';
const GH_TARBALL = 'https://codeload.github.com/privatemanolo1963-sudo/archivio-semantico-modello/tar.gz/refs/heads/main';

function download(url, dest, redirects = 0) {
  return new Promise((resolve, reject) => {
    if (redirects > 5) return reject(new Error('too many redirects'));
    https.get(url, { headers: { 'User-Agent': 'node' } }, (res) => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode)) {
        res.resume();
        return resolve(download(res.headers.location, dest, redirects + 1));
      }
      if (res.statusCode !== 200) { res.resume(); return reject(new Error(`HTTP ${res.statusCode} for ${url}`)); }
      const out = fs.createWriteStream(dest);
      res.pipe(out);
      out.on('finish', () => out.close(resolve));
      out.on('error', reject);
    }).on('error', reject);
  });
}

function present(p, minBytes) {
  try { return fs.statSync(p).size >= (minBytes || 1); } catch { return false; }
}

async function viaHuggingFace() {
  console.log('[1] Trying Hugging Face CDN...');
  fs.mkdirSync(ONNX_DIR, { recursive: true });
  const tmp = path.join(require('os').tmpdir(), 'mle5');
  fs.mkdirSync(tmp, { recursive: true });
  const jobs = [
    [`${HF_BASE}/onnx/model_quantized.onnx`, ONNX_FILE, 100_000_000],
    [`${HF_BASE}/tokenizer.json`, TOKENIZER_FILE, 15_000_000],
    [`${HF_BASE}/config.json`, path.join(MODEL_DIR, 'config.json'), 500],
    [`${HF_BASE}/tokenizer_config.json`, path.join(MODEL_DIR, 'tokenizer_config.json'), 100],
    [`${HF_BASE}/special_tokens_map.json`, path.join(MODEL_DIR, 'special_tokens_map.json'), 100]
  ];
  for (const [url, dest, min] of jobs) {
    if (present(dest, min)) { console.log('    cached', path.basename(dest)); continue; }
    await download(url, dest);
    console.log('    ok   ', path.basename(dest));
  }
  symlinkModel();
  return true;
}

function viaGitHubMirror() {
  console.log('[2] Trying GitHub codeload mirror (reconstruct split chunks)...');
  const tmp = path.join(require('os').tmpdir(), 'mle5-gh');
  fs.rmSync(tmp, { recursive: true, force: true });
  fs.mkdirSync(tmp, { recursive: true });
  const tgz = path.join(tmp, 'repo.tgz');
  execSync(`curl -fsSL "${GH_TARBALL}" -o "${tgz}"`, { stdio: 'inherit' });
  execSync(`tar -xzf "${tgz}" -C "${tmp}"`);
  const root = fs.readdirSync(tmp).find((d) => d.startsWith('archivio-semantico-modello'));
  const repo = path.join(tmp, root);

  fs.mkdirSync(ONNX_DIR, { recursive: true });
  const modelChunks = fs.readdirSync(repo).filter((f) => /^modello_\d+$/.test(f)).sort();
  if (!modelChunks.length) throw new Error('model chunks not found in mirror');
  fs.writeFileSync(ONNX_FILE, Buffer.concat(modelChunks.map((c) => fs.readFileSync(path.join(repo, c)))));
  console.log(`    assembled onnx (${fs.statSync(ONNX_FILE).size} bytes from ${modelChunks.length} chunks)`);

  const tokChunks = fs.readdirSync(repo).filter((f) => /^tokenizer_\d+$/.test(f)).sort();
  if (tokChunks.length) {
    fs.writeFileSync(TOKENIZER_FILE, Buffer.concat(tokChunks.map((c) => fs.readFileSync(path.join(repo, c)))));
    console.log(`    assembled tokenizer.json (${fs.statSync(TOKENIZER_FILE).size} bytes from ${tokChunks.length} chunks)`);
  }
  for (const cfg of ['config.json', 'tokenizer_config.json', 'special_tokens_map.json']) {
    const src = path.join(repo, cfg);
    if (present(src)) fs.copyFileSync(src, path.join(MODEL_DIR, cfg));
  }
  symlinkModel();
  return true;
}

function symlinkModel() {
  const link = path.join(ONNX_DIR, 'model.onnx');
  try { if (fs.lstatSync(link).isSymbolicLink()) fs.unlinkSync(link); } catch {}
  try { fs.symlinkSync('model_quantized.onnx', link); } catch (e) { /* Windows fallback: copy */ fs.copyFileSync(ONNX_FILE, link); }
}

async function main() {
  fs.mkdirSync(MODEL_DIR, { recursive: true });
  if (present(ONNX_FILE, 100_000_000) && present(TOKENIZER_FILE, 15_000_000)) {
    symlinkModel();
    console.log('Model already present at', MODEL_DIR);
    return;
  }
  try { await viaHuggingFace(); }
  catch (e) {
    console.warn('    Hugging Face failed:', e.message);
    viaGitHubMirror();
  }
  console.log('Done. Model directory:', MODEL_DIR);
}

main().catch((e) => {
  console.error('Model fetch failed:', e.message);
  console.error('The app will still boot using the DETERMINISTIC fallback embedding engine.');
  process.exit(1);
});
