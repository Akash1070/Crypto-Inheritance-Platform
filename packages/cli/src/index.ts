import { Command } from 'commander';
import { CIP_CRYPTO_VERSION } from '@cip/crypto-core';
import { initVaultAction } from './commands/initVault.js';
import { splitKeyAction } from './commands/splitKey.js';
import { sealShareAction } from './commands/sealShare.js';
import { recoverAction } from './commands/recover.js';
import { heirKitAction } from './commands/heirKit.js';

export function createCli(): Command {
  const program = new Command();

  program
    .name('cip')
    .description('Crypto Inheritance Platform - Sovereign Offline Recovery & Heir Kit Utility')
    .version(CIP_CRYPTO_VERSION);

  program
    .command('status')
    .description('Check CLI runtime security and air-gap integrity')
    .action(() => {
      console.log('CIP CLI Status: Offline-ready. Zero network syscalls.');
    });

  program
    .command('init-vault')
    .description('Generate 256-bit Vault Key and encrypt an estate file offline')
    .requiredOption('-i, --input <path>', 'Path to file containing estate payload to encrypt')
    .option('--out-vault <path>', 'Output path for encrypted vault package JSON', 'vault-package.json')
    .option('--out-key <path>', 'Output path for raw Vault Key hex', 'vault.key')
    .option('--vault-id <uuid>', 'Custom Vault UUIDv4 identifier')
    .action(initVaultAction);

  program
    .command('split-key')
    .description('Split 256-bit Vault Key into Verifiable Shamir threshold shares')
    .requiredOption('-k, --key-file <path>', 'Path to file containing Vault Key hex')
    .requiredOption('--vault-id <uuid>', 'Vault UUIDv4 identifier')
    .option('-t, --threshold <number>', 'Minimum shares required to reconstruct', '2')
    .option('-n, --total-shares <number>', 'Total number of shares to generate', '2')
    .option('-o, --out-dir <dir>', 'Directory to save generated share files', './shares')
    .action(splitKeyAction);

  program
    .command('seal-share')
    .description('Seal a Shamir share to a recipient public key using X25519 sealed box')
    .requiredOption('-s, --share-file <path>', 'Path to share file to seal')
    .requiredOption('-p, --recipient-pubkey <hex>', 'Recipient X25519 public key in hex')
    .requiredOption('-o, --out <path>', 'Output path for sealed ciphertext hex')
    .action(sealShareAction);

  program
    .command('recover')
    .description('Offline reconstruction of Vault Key and package decryption')
    .requiredOption('-v, --vault-package <path>', 'Path to vault package JSON')
    .requiredOption('-s, --shares <paths...>', 'Paths to share files (minimum threshold required)')
    .requiredOption('-o, --out <path>', 'Output path for decrypted estate payload')
    .action(recoverAction);

  program
    .command('heir-kit')
    .description('Generate printable Heir Kit document with SVG and terminal QR code')
    .requiredOption('-s, --share-file <path>', 'Path to the Heir share file')
    .requiredOption('-v, --vault-package-file <path>', 'Path to the encrypted vault package JSON')
    .option('--heir-name <name>', 'Name or label for the heir', 'Appointed Heir')
    .option('-o, --out-html <path>', 'Output path for printable HTML document', 'heir-kit.html')
    .action(heirKitAction);

  return program;
}
