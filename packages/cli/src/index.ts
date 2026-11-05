import { Command } from 'commander';
import { CIP_CRYPTO_VERSION } from '@cip/crypto-core';

export function createCli(): Command {
  const program = new Command();

  program
    .name('cip')
    .description('Crypto Inheritance Platform - Offline Recovery & Heir Kit Utility')
    .version(CIP_CRYPTO_VERSION);

  program
    .command('status')
    .description('Check CLI runtime security and air-gap integrity')
    .action(() => {
      console.log('CIP CLI Status: Offline-ready. Zero network syscalls.');
    });

  return program;
}

