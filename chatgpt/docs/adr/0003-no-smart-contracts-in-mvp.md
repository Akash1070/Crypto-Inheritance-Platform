# ADR 0003: No smart contracts in MVP

- Status: Accepted
- Date: 2026-11-05

## Context

A chain-specific inheritance contract introduces contract logic, upgrades, admin keys, oracle assumptions, fees, chain outages, and additional audit scope. The first validated user problem is documenting and coordinating inheritance, not executing transfers.

## Decision

No smart contract, on-chain death oracle, token, NFT, automated transaction, or wallet-signing workflow is part of MVP.

## Consequences

- The first release is chain-agnostic and easier to test.
- Any future chain integration needs its own ADR, protocol threat model, formal/property tests, and independent audit.
