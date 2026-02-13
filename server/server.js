/**
 * Express server for the Swagger Editor clone.
 * - Serves static frontend files from /public
 * - Provides a CORS-enabled proxy endpoint for "Try it out" API testing
 * - Validates and sanitises proxy requests
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const https = require('https');
const { URL } = require('url');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static files from /public
app.use(express.static(path.join(__dirname, '..', 'public')));

// ── Health check ───────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── CORS Proxy endpoint ───────────────────────────────────────────────────
// Forwards requests to external APIs so the browser does not hit CORS errors
// when using the "Try it out" feature.
app.all('/api/proxy', async (req, res) => {
    try {
        const targetUrl = req.query.url || req.body?.url;
        if (!targetUrl) {
            return res.status(400).json({ error: 'Missing "url" query parameter' });
        }

        // Basic URL validation
        let parsedUrl;
        try {
            parsedUrl = new URL(targetUrl);
        } catch {
            return res.status(400).json({ error: 'Invalid URL provided' });
        }

        // Only allow http and https
        if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
            return res.status(400).json({ error: 'Only HTTP and HTTPS protocols are allowed' });
        }

        // Block private / internal IPs (basic SSRF protection)
        const blockedHosts = ['localhost', '127.0.0.1', '0.0.0.0', '[::1]'];
        if (blockedHosts.includes(parsedUrl.hostname)) {
            return res.status(403).json({ error: 'Requests to local addresses are not allowed' });
        }

        // Build headers – forward content-type and authorization if present
        const forwardHeaders = {};
        if (req.headers['content-type']) forwardHeaders['Content-Type'] = req.headers['content-type'];
        if (req.headers['authorization']) forwardHeaders['Authorization'] = req.headers['authorization'];
        if (req.headers['accept']) forwardHeaders['Accept'] = req.headers['accept'];

        // Forward custom headers from the body
        const customHeaders = req.body?.headers;
        if (customHeaders && typeof customHeaders === 'object') {
            Object.entries(customHeaders).forEach(([key, value]) => {
                // Prevent header injection
                const sanitisedKey = String(key).replace(/[\r\n]/g, '');
                const sanitisedValue = String(value).replace(/[\r\n]/g, '');
                forwardHeaders[sanitisedKey] = sanitisedValue;
            });
        }

        const method = (req.body?.method || req.method).toUpperCase();
        const bodyPayload = req.body?.body;

        // Determine the right http(s) module
        const transport = parsedUrl.protocol === 'https:' ? https : http;

        const options = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
            path: parsedUrl.pathname + parsedUrl.search,
            method,
            headers: forwardHeaders,
            timeout: 30000,
        };

        const proxyReq = transport.request(options, (proxyRes) => {
            // Collect the response body
            const chunks = [];
            proxyRes.on('data', (chunk) => chunks.push(chunk));
            proxyRes.on('end', () => {
                const body = Buffer.concat(chunks).toString('utf-8');

                // Forward status and selected headers
                res.status(proxyRes.statusCode);
                const safeHeaders = ['content-type', 'x-request-id', 'x-ratelimit-remaining'];
                safeHeaders.forEach((h) => {
                    if (proxyRes.headers[h]) res.setHeader(h, proxyRes.headers[h]);
                });

                res.send(body);
            });
        });

        proxyReq.on('error', (err) => {
            console.error('[proxy] Request error:', err.message);
            res.status(502).json({ error: 'Proxy request failed', details: err.message });
        });

        proxyReq.on('timeout', () => {
            proxyReq.destroy();
            res.status(504).json({ error: 'Proxy request timed out' });
        });

        // Write body for non-GET requests
        if (bodyPayload && method !== 'GET') {
            const payload = typeof bodyPayload === 'string' ? bodyPayload : JSON.stringify(bodyPayload);
            proxyReq.write(payload);
        }

        proxyReq.end();
    } catch (err) {
        console.error('[proxy] Unexpected error:', err);
        res.status(500).json({ error: 'Internal proxy error' });
    }
});

// ── SPA fallback ──────────────────────────────────────────────────────────
app.get('*', (_req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// ── Start server ──────────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`\n  🚀  Swagger Editor is running at  http://localhost:${PORT}\n`);
});
