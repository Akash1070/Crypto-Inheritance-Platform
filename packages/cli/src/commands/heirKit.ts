import fs from 'node:fs/promises';
import QRCode from 'qrcode';

export interface HeirKitOptions {
  shareFile: string;
  vaultPackageFile: string;
  heirName?: string;
  outHtml?: string;
}

export async function heirKitAction(options: HeirKitOptions): Promise<void> {
  const shareContent = await fs.readFile(options.shareFile, 'utf-8');
  const shareLine = shareContent.split('\n').find((l) => l.trim().startsWith('cip:v1:'));
  if (!shareLine) {
    throw new Error('Could not find serialized share (cip:v1:...) in share file');
  }

  const packageContent = await fs.readFile(options.vaultPackageFile, 'utf-8');
  const envelope = JSON.parse(packageContent);
  const heirName = options.heirName || 'Appointed Heir';
  const outHtmlPath = options.outHtml || 'heir-kit.html';

  // Generate SVG QR code
  const qrSvg = await QRCode.toString(shareLine.trim(), {
    type: 'svg',
    errorCorrectionLevel: 'H',
    margin: 2
  });

  // Generate Terminal ASCII QR code
  const qrTerminal = await QRCode.toString(shareLine.trim(), {
    type: 'terminal',
    small: true
  });

  console.log('\n--- HEIR SHARE QR CODE (TERMINAL PREVIEW) ---');
  console.log(qrTerminal);
  console.log('--------------------------------------------\n');

  // Build clean, high-density, printable HTML document
  const htmlDoc = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Emergency Heir Kit - Crypto Inheritance Platform</title>
  <style>
    @media print {
      body { margin: 0; padding: 20px; font-size: 12pt; }
      .no-print { display: none; }
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      max-width: 800px;
      margin: 40px auto;
      padding: 0 20px;
      color: #0f172a;
      line-height: 1.5;
    }
    .header {
      border-bottom: 2px solid #0f172a;
      padding-bottom: 12px;
      margin-bottom: 24px;
    }
    .badge {
      display: inline-block;
      background: #0f172a;
      color: #fff;
      font-size: 11px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 4px;
      letter-spacing: 0.5px;
    }
    .qr-container {
      display: flex;
      gap: 30px;
      align-items: center;
      margin: 24px 0;
      padding: 20px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
    }
    .qr-svg {
      width: 200px;
      height: 200px;
      flex-shrink: 0;
    }
    .share-text {
      word-break: break-all;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 12px;
      background: #fff;
      padding: 12px;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
    }
    .warning {
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #991b1b;
      padding: 14px;
      border-radius: 6px;
      font-size: 13px;
      margin: 20px 0;
    }
    .steps ol {
      padding-left: 20px;
    }
    .steps li {
      margin-bottom: 8px;
    }
  </style>
</head>
<body>
  <div class="header">
    <span class="badge">OFFLINE EMERGENCY HEIR KIT</span>
    <h1 style="margin: 8px 0 0 0;">Crypto Inheritance Recovery Document</h1>
    <p style="color: #64748b; margin: 4px 0 0 0;">Prepared for: <strong>${heirName}</strong></p>
  </div>

  <div class="warning">
    <strong>CONFIDENTIAL PHYSICAL RECOVERY MATERIAL:</strong>
    This document contains a cryptographically signed Shamir threshold share. 
    Store this document in a physically secure location (e.g. fireproof home safe or bank deposit box). 
    Never scan, photograph, or email this QR code to cloud accounts or unverified devices.
  </div>

  <h2>1. Your Cryptographic Heir Share</h2>
  <p>Scan this QR code or provide the armored share string below into the offline recovery utility:</p>
  
  <div class="qr-container">
    <div class="qr-svg">${qrSvg}</div>
    <div style="flex-grow: 1;">
      <div style="font-weight: 600; font-size: 13px; margin-bottom: 6px;">Armored Share String:</div>
      <div class="share-text">${shareLine.trim()}</div>
      <div style="font-size: 12px; color: #64748b; margin-top: 8px;">
        Vault ID: <code>${envelope.vaultId}</code>
      </div>
    </div>
  </div>

  <h2>2. Step-by-Step Offline Recovery Instructions</h2>
  <div class="steps">
    <ol>
      <li><strong>Obtain the Encrypted Vault Package:</strong> Retrieve the file <code>vault-package.json</code> from the platform archive or local storage.</li>
      <li><strong>Acquire the Second Share:</strong>
        <ul>
          <li>If the platform is active: Trigger the claim via the WebAuthn Heir Portal to receive the released Escrow Share ($S$).</li>
          <li>If the platform is offline: Retrieve the Escrow Share copy from the continuity trustee or family attorney.</li>
        </ul>
      </li>
      <li><strong>Boot an Air-Gapped Clean Device:</strong> For high-value estates, run recovery on a secure, offline computer.</li>
      <li><strong>Run the CIP Recovery Tool:</strong>
        <pre style="background: #f1f5f9; padding: 10px; border-radius: 6px; font-size: 12px;">cip recover --vault-package vault-package.json --shares share-heir.txt share-escrow.txt --out recovered-estate.txt</pre>
      </li>
      <li><strong>Secure Funds:</strong> Immediately transfer all recovered crypto assets to a new, freshly initialized hardware wallet.</li>
    </ol>
  </div>
</body>
</html>`;

  await fs.writeFile(outHtmlPath, htmlDoc, 'utf-8');
  console.log(` Printable Heir Kit written to: ${outHtmlPath}`);
  console.log(' Open in any web browser and print to physical paper.');
}

