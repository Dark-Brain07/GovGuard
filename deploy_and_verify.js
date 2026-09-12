import { createClient, createAccount } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';
import fs from 'fs';

const account = createAccount();
const client = createClient({ chain: studionet, account });

async function main() {
    console.log("==================================================================");
    console.log(" GovGuard Canonical Deployment & Enforcement Verification Script");
    console.log("==================================================================");

    const govGuardCode = fs.readFileSync('./contracts/gov_guard.py', 'utf-8');
    const mockGovCode = fs.readFileSync('./contracts/mock_governor.py', 'utf-8');

    // 1. Deploy MockGovernor
    console.log("\n[1/6] Deploying MockGovernor...");
    const mockGovHash = await client.deployContract({
        code: mockGovCode,
        args: []
    });
    const mockGovReceipt = await client.waitForTransactionReceipt({ hash: mockGovHash });
    const mockGovAddress = mockGovReceipt.data?.contract_address || mockGovReceipt.contractAddress;
    console.log("MockGovernor Address:", mockGovAddress);
    console.log("Deploy MockGovernor Tx:", mockGovHash);

    // 2. Deploy GovGuard
    console.log("\n[2/6] Deploying GovGuard...");
    const govGuardHash = await client.deployContract({
        code: govGuardCode,
        args: []
    });
    const govGuardReceipt = await client.waitForTransactionReceipt({ hash: govGuardHash });
    const govGuardAddress = govGuardReceipt.data?.contract_address || govGuardReceipt.contractAddress;
    console.log("GovGuard Address:", govGuardAddress);
    console.log("Deploy GovGuard Tx:", govGuardHash);

    // 3. Link GovGuard -> MockGovernor
    console.log("\n[3/6] Setting governor address on GovGuard...");
    const setGovTx = await client.writeContract({
        address: govGuardAddress,
        functionName: 'set_governor_address',
        args: [mockGovAddress],
        value: 0n
    });
    await client.waitForTransactionReceipt({ hash: setGovTx });
    console.log("Governor address linked.");

    // 4. Link MockGovernor -> GovGuard (Firewall setup)
    console.log("\n[4/6] Setting GovGuard address on MockGovernor (Firewall setup)...");
    const setGuardTx = await client.writeContract({
        address: mockGovAddress,
        functionName: 'set_gov_guard_address',
        args: [govGuardAddress],
        value: 0n
    });
    await client.waitForTransactionReceipt({ hash: setGuardTx });
    console.log("MockGovernor firewall restricted to GovGuard.");

    // Check Initial State
    const initialCount = await client.readContract({
        address: mockGovAddress,
        functionName: 'get_forward_count',
        args: []
    });
    console.log("\nMockGovernor Initial State:", initialCount);

    // 5. Evaluate Compliant Proposal
    const validProposalUrl = "https://raw.githubusercontent.com/Dark-Brain07/GovGuard/main/test_fixtures/valid_proposal.txt";
    console.log("\n[5/6] Evaluating legitimate proposal (expecting APPROVED):");
    console.log("URL:", validProposalUrl);

    const evalTx = await client.writeContract({
        address: govGuardAddress,
        functionName: 'evaluate_proposal',
        args: [validProposalUrl],
        value: 0n
    });
    console.log("Evaluation Tx Broadcasted:", evalTx);

    const evalReceipt = await client.waitForTransactionReceipt({ hash: evalTx });
    console.log("Evaluation Tx Finalized on-chain. Status:", evalReceipt.status_name || evalReceipt.status);

    // Wait for IC-to-IC child transaction (.emit()) to finalize
    console.log("Waiting 20 seconds for IC-to-IC child transaction to settle on MockGovernor...");
    await new Promise(r => setTimeout(r, 20000));

    // 6. Verify State Change and Commitments
    console.log("\n[6/6] Verifying On-Chain State Change & Cryptographic Commitments...");
    const finalCount = await client.readContract({
        address: mockGovAddress,
        functionName: 'get_forward_count',
        args: []
    });
    console.log("MockGovernor Final State:", finalCount);

    const verdict = await client.readContract({
        address: govGuardAddress,
        functionName: 'get_verdict',
        args: [validProposalUrl]
    });
    console.log("GovGuard Verdict:", verdict);

    const commitment = await client.readContract({
        address: govGuardAddress,
        functionName: 'get_commitment',
        args: [validProposalUrl]
    });
    console.log("GovGuard Commitment Record:", JSON.stringify(commitment, null, 2));

    const latestProposal = await client.readContract({
        address: mockGovAddress,
        functionName: 'get_latest_proposal',
        args: []
    });
    console.log("MockGovernor Received Commitment:", JSON.stringify(latestProposal, null, 2));

    console.log("\n==================================================================");
    console.log(" CANONICAL DEPLOYMENT SUMMARY");
    console.log("==================================================================");
    console.log(`GovGuard Address:       ${govGuardAddress}`);
    console.log(`MockGovernor Address:   ${mockGovAddress}`);
    console.log(`Evaluation Tx Hash:     ${evalTx}`);
    console.log(`Initial Forward Count:  ${initialCount}`);
    console.log(`Final Forward Count:    ${finalCount}`);
    console.log(`Content Hash (SHA-256): ${commitment.content_hash}`);
    console.log(`Const. Hash  (SHA-256): ${commitment.constitution_hash}`);
    console.log("==================================================================");

    // Save summary to JSON for subsequent automation
    const summary = {
        govGuardAddress,
        mockGovAddress,
        evalTx,
        initialCount,
        finalCount,
        contentHash: commitment.content_hash,
        constitutionHash: commitment.constitution_hash,
        timestamp: new Date().toISOString()
    };
    fs.writeFileSync('./canonical_deployment.json', JSON.stringify(summary, null, 2));
    console.log("Saved canonical deployment record to canonical_deployment.json");
}

main().catch(err => {
    console.error("Deployment failed:", err);
    process.exit(1);
});
