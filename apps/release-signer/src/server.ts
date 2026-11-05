import http from 'node:http';
import https from 'node:https';
import { EnclaveReleaseService, ReleaseRequest } from './enclave.js';
import { BoxKeyPair, SigningKeyPair, hmacSha256Hex } from '@cip/crypto-core';

export interface EnclaveTlsOptions {
  cert: string | Buffer;
  key: string | Buffer;
  ca?: string | Buffer;
  requestCert?: boolean;
  rejectUnauthorized?: boolean;
}

export interface EnclaveServerOptions {
  port?: number | undefined;
  enclaveKeyPair: BoxKeyPair;
  releaseSigningKey: SigningKeyPair;
  serverSigningPublicKey?: Uint8Array | undefined;
  tls?: EnclaveTlsOptions | undefined;
  sharedSecret: string;
}

function constantTimeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export function createEnclaveServer(options: EnclaveServerOptions): http.Server | https.Server {
  if (!options.serverSigningPublicKey) {
    throw new Error('CIP_SERVER_SIGNING_PUBLIC_KEY_HEX is required for enclave release verification');
  }
  if (!options.tls) {
    throw new Error('Release-signer enclave refuses to serve on plaintext HTTP; TLS (mTLS) is required');
  }
  if (!options.sharedSecret || options.sharedSecret.length < 32) {
    throw new Error('CIP_RELEASE_SHARED_SECRET is required (min 32 chars)');
  }

  const expectedAuth = hmacSha256Hex(options.sharedSecret, 'RELEASE');

  const enclaveService = new EnclaveReleaseService(
    options.enclaveKeyPair,
    options.releaseSigningKey,
    options.serverSigningPublicKey
  );

  const rateLimits = new Map<string, { count: number; resetAt: number }>();
  const RATE_LIMIT_MAX = 20;
  const RATE_LIMIT_WINDOW_MS = 60_000;

  function allowRequest(ip: string): boolean {
    const now = Date.now();
    const entry = rateLimits.get(ip);
    if (!entry || now > entry.resetAt) {
      rateLimits.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
      return true;
    }
    entry.count += 1;
    return entry.count <= RATE_LIMIT_MAX;
  }

  const requestListener: http.RequestListener = async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    if (req.method === 'GET' && req.url === '/health') {
      res.writeHead(200);
      res.end(JSON.stringify({ status: 'enclave_ready', isolated: true, mtls: true }));
      return;
    }

    if (req.method === 'POST' && req.url === '/release') {
      const ip = req.socket.remoteAddress || 'unknown';
      if (!allowRequest(ip)) {
        res.writeHead(429);
        res.end(JSON.stringify({ error: 'RATE_LIMITED' }));
        return;
      }

      const presented = (req.headers['x-cip-release-auth'] as string | undefined) || '';
      if (!constantTimeEqualHex(presented.toLowerCase(), expectedAuth)) {
        res.writeHead(401);
        res.end(JSON.stringify({ error: 'UNAUTHORIZED' }));
        return;
      }

      let body = '';
      req.on('data', (chunk) => {
        body += chunk;
        if (body.length > 512 * 1024) {
          res.writeHead(413);
          res.end(JSON.stringify({ error: 'Payload too large' }));
          req.destroy();
        }
      });

      req.on('end', async () => {
        try {
          const parsed = JSON.parse(body) as ReleaseRequest;
          const result = await enclaveService.processRelease(parsed);

          if (!result.success) {
            res.writeHead(400);
            res.end(JSON.stringify(result));
            return;
          }

          res.writeHead(200);
          res.end(JSON.stringify(result));
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Release verification failed';
          res.writeHead(400);
          res.end(JSON.stringify({ error: message }));
        }
      });
      return;
    }

    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not Found' }));
  };

  return https.createServer(
    {
      cert: options.tls.cert,
      key: options.tls.key,
      ca: options.tls.ca,
      requestCert: options.tls.requestCert ?? true,
      rejectUnauthorized: options.tls.rejectUnauthorized ?? true
    },
    requestListener
  );
}
