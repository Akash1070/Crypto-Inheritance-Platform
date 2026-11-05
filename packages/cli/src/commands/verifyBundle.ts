import fs from 'node:fs/promises';
import path from 'node:path';
import {
  sha256Hex,
  deriveSigningKeyPairFromPrivate,
  signHash,
  verifySignature
} from '@cip/crypto-core';

export interface VerifyBundleOptions {
  dir: string;
  manifest?: string;
  generate?: boolean;
  sign?: boolean;
  privateKeyFile?: string;
  publicKeyFile?: string;
}

function canonicalManifestJson(manifest: BundleManifest): string {
  return JSON.stringify(manifest);
}

async function readKeyHexFile(filePath: string, name: string): Promise<Buffer> {
  let raw: string;
  try {
    raw = (await fs.readFile(filePath, 'utf-8')).trim();
  } catch {
    throw new Error(`Unable to read ${name} file: ${filePath}`);
  }
  const hex = raw.match(/[0-9a-f]{64}/i)?.[0];
  if (!hex) {
    throw new Error(`${name} file must contain a 32-byte hex seed`);
  }
  return Buffer.from(hex, 'hex');
}

export interface BundleManifestEntry {
  sha256Hex: string;
  sri?: string;
  size: number;
}

export type BundleManifest = Record<string, BundleManifestEntry>;

/**
 * Recursively scans directory and returns relative paths normalized to POSIX slashes.
 */
async function scanDirectory(baseDir: string, currentDir = ''): Promise<string[]> {
  const fullCurrent = path.join(baseDir, currentDir);
  const entries = await fs.readdir(fullCurrent, { withFileTypes: true });
  const results: string[] = [];

  for (const entry of entries) {
    const relEntry = path.join(currentDir, entry.name).replace(/\\/g, '/');
    if (entry.isDirectory()) {
      const nested = await scanDirectory(baseDir, relEntry);
      results.push(...nested);
    } else if (entry.isFile()) {
      if (entry.name !== '.DS_Store' && entry.name !== 'checksums.json') {
        results.push(relEntry);
      }
    }
  }

  return results.sort();
}

/**
 * Computes SHA-256 and SRI hash for a file.
 */
async function hashFile(filePath: string): Promise<BundleManifestEntry> {
  const buf = await fs.readFile(filePath);
  const hex = sha256Hex(buf);
  const b64 = Buffer.from(buf).toString('base64');
  return {
    sha256Hex: hex,
    sri: `sha256-${b64}`,
    size: buf.length
  };
}

export async function generateManifest(bundleDir: string, manifestPath: string): Promise<BundleManifest> {
  const files = await scanDirectory(bundleDir);
  const manifest: BundleManifest = {};

  for (const file of files) {
    const fullPath = path.join(bundleDir, file);
    manifest[file] = await hashFile(fullPath);
  }

  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf-8');
  return manifest;
}

export async function verifyBundleAction(options: VerifyBundleOptions): Promise<void> {
  const bundleDir = path.resolve(options.dir);
  const manifestPath = options.manifest
    ? path.resolve(options.manifest)
    : path.join(bundleDir, 'checksums.json');

  let manifest: BundleManifest;

  if (options.generate) {
    manifest = await generateManifest(bundleDir, manifestPath);

    if (options.sign) {
      if (!options.privateKeyFile) {
        throw new Error('--sign requires --private-key-file');
      }
      const seed = await readKeyHexFile(options.privateKeyFile, 'private key');
      const keyPair = await deriveSigningKeyPairFromPrivate(seed);
      const canonical = canonicalManifestJson(manifest);
      const hashBytes = Buffer.from(sha256Hex(canonical), 'hex');
      const signature = await signHash(hashBytes, keyPair.privateKey);
      const sigPath = `${manifestPath}.sig`;
      await fs.writeFile(sigPath, Buffer.from(signature).toString('hex') + '\n', 'utf-8');
      console.log(` Manifest signed with Ed25519. Signature: ${sigPath}`);
    }

    console.log(` Bundle manifest generated successfully.`);
    console.log(` Target directory: ${bundleDir}`);
    console.log(` Manifest path:    ${manifestPath}`);
    console.log(` Files indexed:    ${Object.keys(manifest).length}`);
    return;
  }

  // Verification mode
  let manifestRaw: string;
  try {
    manifestRaw = await fs.readFile(manifestPath, 'utf-8');
  } catch {
    throw new Error(`Manifest not found at "${manifestPath}". Run with --generate or specify valid --manifest.`);
  }

  manifest = JSON.parse(manifestRaw) as BundleManifest;

  if (options.publicKeyFile) {
    const sigPath = `${manifestPath}.sig`;
    let signatureHex: string;
    try {
      signatureHex = (await fs.readFile(sigPath, 'utf-8')).trim();
    } catch {
      throw new Error(`Manifest signature not found at "${sigPath}". Sign the manifest at release time with --sign.`);
    }
    const publicKey = await readKeyHexFile(options.publicKeyFile, 'public key');
    const canonical = canonicalManifestJson(manifest);
    const hashBytes = Buffer.from(sha256Hex(canonical), 'hex');
    const valid = await verifySignature(Buffer.from(signatureHex, 'hex'), hashBytes, publicKey);
    if (!valid) {
      throw new Error('Manifest signature verification FAILED. The manifest is not trusted.');
    }
    console.log(' Manifest signature verified (Ed25519).');
  }

  const onDiskFiles = await scanDirectory(bundleDir);
  const manifestFiles = Object.keys(manifest);

  const missingFiles: string[] = [];
  const mismatchedFiles: { file: string; expected: string; actual: string }[] = [];
  const verifiedFiles: { file: string; size: number; sha256: string }[] = [];

  for (const file of manifestFiles) {
    const fullPath = path.join(bundleDir, file);
    try {
      const stats = await hashFile(fullPath);
      if (stats.sha256Hex.toLowerCase() !== manifest[file]!.sha256Hex.toLowerCase()) {
        mismatchedFiles.push({
          file,
          expected: manifest[file]!.sha256Hex,
          actual: stats.sha256Hex
        });
      } else {
        verifiedFiles.push({
          file,
          size: stats.size,
          sha256: stats.sha256Hex
        });
      }
    } catch {
      missingFiles.push(file);
    }
  }

  const unexpectedFiles = onDiskFiles.filter((f) => !manifest[f]);

  console.log('\n======================================================');
  console.log(' CRYPTO INHERITANCE PLATFORM - WEB BUNDLE INTEGRITY');
  console.log('======================================================');
  console.log(`Target Directory: ${bundleDir}`);
  console.log(`Manifest:         ${manifestPath}`);
  console.log('------------------------------------------------------');

  for (const item of verifiedFiles) {
    console.log(` [VERIFIED] ${item.file} (${item.size} bytes)`);
    console.log(`            SHA256: ${item.sha256}`);
  }

  let failed = false;

  if (mismatchedFiles.length > 0) {
    failed = true;
    console.error('\n [CRITICAL ERROR] CHECKSUM MISMATCH (POTENTIAL TAMPERING):');
    for (const item of mismatchedFiles) {
      console.error(`  - ${item.file}`);
      console.error(`    Expected: ${item.expected}`);
      console.error(`    Actual:   ${item.actual}`);
    }
  }

  if (missingFiles.length > 0) {
    failed = true;
    console.error('\n [CRITICAL ERROR] MISSING BUNDLE FILES:');
    for (const f of missingFiles) {
      console.error(`  - ${f}`);
    }
  }

  if (unexpectedFiles.length > 0) {
    failed = true;
    console.error('\n [CRITICAL ERROR] UNEXPECTED EXTRANEOUS FILES IN BUNDLE:');
    for (const f of unexpectedFiles) {
      console.error(`  - ${f}`);
    }
  }

  console.log('------------------------------------------------------');
  if (failed) {
    const reasons: string[] = [];
    if (mismatchedFiles.length > 0) reasons.push(`${mismatchedFiles.length} file checksum mismatch`);
    if (missingFiles.length > 0) reasons.push(`${missingFiles.length} missing bundle files`);
    if (unexpectedFiles.length > 0) reasons.push(`${unexpectedFiles.length} unexpected extraneous files`);

    console.error(' BUNDLE VERIFICATION FAILED: Do NOT deploy or run this bundle.');
    throw new Error(`Web bundle verification failed: ${reasons.join(', ')}`);
  } else {
    console.log(' BUNDLE VERIFICATION PASSED: 100% of files match release signature.');
    console.log('======================================================\n');
  }
}
