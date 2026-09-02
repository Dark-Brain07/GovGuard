# GovGuard: AI-Powered DAO Constitutional Firewall

**Category:** Projects & Milestones
**Intelligent Contract:** `contracts/gov_guard.py`
**Frontend:** React / Vite

## What is GovGuard?
GovGuard is a cross-chain DAO security protocol. It acts as an Intelligent Adjudication layer for EVM-based DAOs to prevent governance spam, hate speech, and malicious proposals from ever reaching a vote.

Instead of human moderators reading every forum post, GovGuard uses GenLayer's AI validators as a "Supreme Court."

## Architecture & GenLayer Integration (The Apolo Pattern)
This project was specifically designed to mirror the complex integration pattern of high-scoring GenLayer MVPs:

1. **Deterministic Web Fetching:** Uses `gl.get_webpage` wrapped in a stable comparative block to fetch raw proposal evidence from IPFS or web forums.
2. **AI Validator Adjudication:** Uses `gl.eq_principle.prompt_comparative` for intelligent AI validator adjudication against the DAO Constitution, ensuring all nodes reach substantive agreement on the decision.
3. **Fail-Safe Normalization:** Output normalization forces a strict `APPROVED` or `REJECTED` state before consensus is finalized. Ambiguity or AI drift defaults to Reject.
4. **DAO Enforcement Layer (Native IC-to-IC):** Integrates via `@gl.contract_interface` and the native `.emit()` path to securely forward an approved proposal to a GenLayer `MockGovernor` contract once a proposal is APPROVED.
5. **Full-Stack Implementation:** Contains both the Intelligent Contract backend and a live DApp frontend for users to submit and track evaluations. The frontend submits transactions gaslessly using an ephemeral `createAccount()` signer, meaning the connected user wallet (MetaMask/Privy) does not need to sign the GenLayer execution.

## How to Run Locally
1. Clone this repository.
2. Run `npm install`
3. Run `npm run dev`
4. The DApp will be live at `http://localhost:5173/`

## Deployment
- **Frontend App:** Ready for Vercel Deployment
- **GovGuard Contract Address:** `0x6D74B2Ac0eBD5bC9bcb8f4C8a891396729B0ED62`
- **Mock Governor Target:** `0x98765585f2AA0Edce17176d2Fb920fdF8Ef949C8`
- **Explorer Link:** [View on GenLayer Studio](https://explorer-studio.genlayer.com/address/0x6D74B2Ac0eBD5bC9bcb8f4C8a891396729B0ED62)
