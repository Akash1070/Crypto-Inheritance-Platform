import http from 'node:http';
import https from 'node:https';
import { EnclaveReleaseService, ReleaseRequest } from './enclave.js';
import { BoxKeyPair, SigningKeyPair } from '@cip/crypto-core';

export interface EnclaveTlsOptions {
  cert: string | Buffer;
  key: string | Buffer;
  ca?: string | Buffer;
  requestCert?: boolean;
  rejectUnauthorized?: boolean;
}

export interface EnclaveServerOptions {
  port?: number;
  enclaveKeyPair: BoxKeyPair;
  releaseSigningKey: SigningKeyPair;
  serverSigningPublicKey?: Uint8Array;
  tls?: EnclaveTlsOptions;
}

export function createEnclaveServer(options: EnclaveServerOptions): http.Server | https.Server {
  const serverPubKey = options.serverSigningPublicKey ?? options.releaseSigningKey.publicKey;
  const enclaveService = new EnclaveReleaseService(
    options.enclaveKeyPair,
    options.releaseSigningKey,
    serverPubKey
  );

  const requestListener: http.RequestListener = async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    if (req.method === 'GET' && req.url === '/health') {
      res.writeHead(200);
      res.end(JSON.stringify({ status: 'enclave_ready', isolated: true, mtls: Boolean(options.tls) }));
      return;
    }

    if (req.method === 'POST' && req.url === '/release') {
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

  if (options.tls) {
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

  return http.createServer(requestListener);
}
