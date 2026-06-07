# GovGuard: AI-Powered DAO Constitutional Firewall

**Category:** Projects & Milestones
**Intelligent Contract:** `contracts/gov_guard.py`
**Frontend:** React / Vite

## What is GovGuard?
GovGuard is a cross-chain DAO security protocol. It acts as an Intelligent Adjudication layer for EVM-based DAOs to prevent governance spam, hate speech, and malicious proposals from ever reaching a vote.

Instead of human moderators reading every forum post, GovGuard uses GenLayer's AI validators as a "Supreme Court."

## Architecture & GenLayer Integration (The Apolo Pattern)
This project was specifically designed to mirror the complex integration pattern of high-scoring GenLayer MVPs:

1. **Deterministic Web Fetching:** Uses `gl.nondet.web.get` to fetch raw proposal evidence from IPFS or web forums.
2. **AI Validator Adjudication:** Uses `gl.eq_principle.prompt_non_comparative` for independent AI validator adjudication against the DAO Constitution.
3. **Fail-Safe Normalization:** Output normalization forces a strict `APPROVED` or `REJECTED` state before consensus is finalized. Ambiguity or AI drift defaults to Reject.
4. **Full-Stack Implementation:** Contains both the Intelligent Contract backend and a live DApp frontend for users to submit and track evaluations.

## How to Run Locally
1. Clone this repository.
2. Run `npm install`
3. Run `npm run dev`
4. The DApp will be live at `http://localhost:5173/`

## Deployment
- **Frontend App:** Ready for Vercel Deployment
- **Intelligent Contract Address:** `0x2E0a398F11D35d3DB95f1A41799AdF4DFdDA53B7`
- **Explorer Link:** [View on GenLayer Studio](https://explorer-studio.genlayer.com/address/0x2E0a398F11D35d3DB95f1A41799AdF4DFdDA53B7)
