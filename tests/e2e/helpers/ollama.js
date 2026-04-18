// tests/e2e/helpers/ollama.js
// Shared Ollama HTTP utilities — eliminates duplication across MTL spec files.
const http = require('http');

/** GET /api/tags → string[] of model names, or [] on any error. */
function fetchOllamaModels() {
  return new Promise((resolve) => {
    const req = http.get('http://127.0.0.1:11434/api/tags', (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => {
        try { resolve(JSON.parse(data).models?.map((m) => m.name) ?? []); }
        catch { resolve([]); }
      });
    });
    req.on('error', () => resolve([]));
    req.setTimeout(3000, () => { req.destroy(); resolve([]); });
  });
}

/**
 * POST /api/generate with a chrome-extension Origin header.
 * Returns the HTTP status code, or 0 on network/connection error.
 */
function probeGenerate(model) {
  const body = JSON.stringify({ model, prompt: 'Hi', stream: false, options: { num_predict: 1 } });
  return new Promise((resolve) => {
    const req = http.request(
      {
        hostname: '127.0.0.1', port: 11434, path: '/api/generate', method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
          'Origin': 'chrome-extension://testprobeorigin',
        },
      },
      (res) => { res.resume(); resolve(res.statusCode); }
    );
    req.on('error', () => resolve(0));
    req.setTimeout(15000, () => { req.destroy(); resolve(0); });
    req.write(body);
    req.end();
  });
}

/**
 * Install a full-proxy context route for http://localhost:11434/** that strips
 * the chrome-extension Origin header before forwarding to Ollama.
 * Required for Ollama 0.6+ which returns 403 for chrome-extension:// origins.
 * Also ensures think:false is set on /api/generate payloads (qwen3 fast-mode).
 *
 * @param {import('@playwright/test').BrowserContext} context
 * @param {string} [tag] - Log prefix for proxy messages
 */
async function installOllamaProxyRoute(context, tag = '[ollama-proxy]') {
  await context.route('http://localhost:11434/**', async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    let postBody = req.method() !== 'GET' ? await req.postDataBuffer() : null;

    if (url.pathname === '/api/generate' && postBody) {
      try {
        const json = JSON.parse(postBody.toString());
        const hadThink = 'think' in json;
        json.think = false;
        postBody = Buffer.from(JSON.stringify(json));
        const opts = json.options || {};
        console.log(
          `${tag} /api/generate | model:${json.model} | think_was_set:${hadThink}(${json.think}) | ` +
          `num_ctx:${opts.num_ctx ?? '?'} | num_predict:${opts.num_predict ?? '?'} | prompt_len:${json.prompt?.length ?? 0}`
        );
      } catch { /* leave body unchanged if not valid JSON */ }
    } else {
      console.log(`${tag} ${req.method()} ${url.pathname}`);
    }

    const t0 = Date.now();
    const responseData = await new Promise((resolve) => {
      const proxyReq = http.request(
        {
          hostname: '127.0.0.1', port: 11434,
          path: url.pathname + url.search,
          method: req.method(),
          headers: {
            'content-type': 'application/json',
            ...(postBody ? { 'content-length': String(postBody.length) } : {}),
          },
        },
        (res) => {
          const chunks = [];
          res.on('data', (c) => chunks.push(c));
          res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
        }
      );
      proxyReq.on('error', (e) => resolve({ status: 502, headers: {}, body: Buffer.from(e.message) }));
      if (postBody) proxyReq.write(postBody);
      proxyReq.end();
    });

    if (url.pathname === '/api/generate') {
      console.log(`${tag} <- ${responseData.status} in ${((Date.now() - t0) / 1000).toFixed(1)}s | resp_len:${responseData.body.length}`);
    }

    await route.fulfill({
      status: responseData.status,
      headers: responseData.headers,
      body: responseData.body,
    });
  });
}

/**
 * Probe Ollama, install the Origin-stripping proxy when needed (HTTP 403),
 * and return the model to use.
 *
 * @param {string} preferredModel - Model name from extension storage
 * @param {import('@playwright/test').BrowserContext} context
 * @param {string} [tag] - Log prefix
 * @returns {Promise<{ model: string|null, proxyInstalled: boolean }>}
 */
async function resolveOllamaModel(preferredModel, context, tag = '[ollama]') {
  const models = await fetchOllamaModels();
  if (models.length === 0) return { model: null, proxyInstalled: false };

  const chosen = models.includes(preferredModel) ? preferredModel : models[0];
  const status = await probeGenerate(chosen);
  if (status === 0) return { model: null, proxyInstalled: false };

  let proxyInstalled = false;
  if (status === 403) {
    console.log(`${tag} Ollama returned 403 — installing Origin-stripping proxy route`);
    await installOllamaProxyRoute(context, tag);
    proxyInstalled = true;
  }

  return { model: chosen, proxyInstalled };
}

module.exports = { fetchOllamaModels, probeGenerate, installOllamaProxyRoute, resolveOllamaModel };
