import { createClient, createAccount } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';
import fs from 'fs';

const deployment = JSON.parse(fs.readFileSync('./canonical_deployment.json', 'utf-8'));
const govGuardAddress = deployment.govGuardAddress;
const mockGovAddress = deployment.mockGovAddress;

// Ephemeral client account
const clientAccount = createAccount();
const client = createClient({ chain: studionet, account: clientAccount });

// Stranger account for unauthorized access testing
const strangerAccount = createAccount();
const strangerClient = createClient({ chain: studionet, account: strangerAccount });

async function runFullTestSuite() {
    console.log("==================================================================");
    console.log(" GOVGUARD COMPREHENSIVE TRANSACTION & INTEGRITY TEST SUITE");
    console.log("==================================================================");
    console.log("GovGuard Contract:    ", govGuardAddress);
    console.log("MockGovernor Contract:", mockGovAddress);
    console.log("Client Account:       ", clientAccount.address);
    console.log("Stranger Account:     ", strangerAccount.address);
    console.log("==================================================================\n");

    const suiteReport = [];

    // -------------------------------------------------------------
    // SECTION 1: View Stats & Initial State
    // -------------------------------------------------------------
    console.log("--- SECTION 1: Reading Contract Initial State ---");
    try {
        const stats = await client.readContract({
            address: govGuardAddress,
            functionName: 'get_stats',
            args: []
        });
        const initialForwardCount = await client.readContract({
            address: mockGovAddress,
            functionName: 'get_forward_count',
            args: []
        });
        console.log("✅ get_stats:", stats);
        console.log("✅ MockGovernor forward count:", initialForwardCount);
        suiteReport.push({ test: "Section 1: Initial State Read", status: "SUCCESS", details: { stats, initialForwardCount } });
    } catch (err) {
        console.error("❌ Section 1 Failed:", err.message);
        suiteReport.push({ test: "Section 1: Initial State Read", status: "ERROR", error: err.message });
    }

    // -------------------------------------------------------------
    // SECTION 2: Legitimate Proposal Evaluation (APPROVED Path)
    // -------------------------------------------------------------
    console.log("\n--- SECTION 2: Testing Proposal Evaluation (APPROVED Path) ---");
    const validUrl = "https://raw.githubusercontent.com/Dark-Brain07/GovGuard/main/test_fixtures/valid_proposal.txt";
    try {
        const initialCountStr = await client.readContract({
            address: mockGovAddress,
            functionName: 'get_forward_count',
            args: []
        });
        const prevCount = parseInt(initialCountStr.replace(/\D/g, '')) || 0;

        console.log("Broadcasting evaluate_proposal transaction for compliant proposal...");
        const evalTx = await client.writeContract({
            address: govGuardAddress,
            functionName: 'evaluate_proposal',
            args: [validUrl],
            value: 0n
        });
        console.log("Tx Hash:", evalTx);

        const receipt = await client.waitForTransactionReceipt({ hash: evalTx });
        console.log("Receipt Status Name:", receipt.status_name || receipt.status);
        console.log("Tx Execution Result:", receipt.txExecutionResultName || receipt.result_name || "FINISHED");

        const verdict = await client.readContract({
            address: govGuardAddress,
            functionName: 'get_verdict',
            args: [validUrl]
        });
        console.log("On-Chain Verdict:", verdict);

        const commitment = await client.readContract({
            address: govGuardAddress,
            functionName: 'get_commitment',
            args: [validUrl]
        });
        console.log("Cryptographic Commitment:", commitment);

        const isApproved = verdict === "APPROVED";
        const hasValidHashes = commitment.content_hash.startsWith("0x") && commitment.constitution_hash.startsWith("0x");

        if (isApproved && hasValidHashes) {
            console.log("✅ Section 2 Evaluation: SUCCESS (APPROVED + Cryptographic Hashes Stored)");
            suiteReport.push({
                test: "Section 2: Proposal Evaluation (APPROVED)",
                status: "SUCCESS",
                txHash: evalTx,
                verdict,
                contentHash: commitment.content_hash,
                constitutionHash: commitment.constitution_hash
            });
        } else {
            console.error("❌ Section 2 Evaluation: Unexpected result:", verdict);
            suiteReport.push({ test: "Section 2: Proposal Evaluation (APPROVED)", status: "FAILED", verdict });
        }
    } catch (err) {
        console.error("❌ Section 2 Failed:", err.message);
        suiteReport.push({ test: "Section 2: Proposal Evaluation (APPROVED)", status: "ERROR", error: err.message });
    }

    // -------------------------------------------------------------
    // SECTION 3: Malicious/Adversarial Proposal Evaluation (REJECTED Path)
    // -------------------------------------------------------------
    console.log("\n--- SECTION 3: Testing Malicious Proposal Evaluation (REJECTED Path) ---");
    const attackUrl = "https://raw.githubusercontent.com/Dark-Brain07/GovGuard/main/test_fixtures/attack_override.txt";
    try {
        const preAttackCountStr = await client.readContract({
            address: mockGovAddress,
            functionName: 'get_forward_count',
            args: []
        });

        console.log("Broadcasting evaluate_proposal transaction for prompt-injection attack...");
        const rejectTx = await client.writeContract({
            address: govGuardAddress,
            functionName: 'evaluate_proposal',
            args: [attackUrl],
            value: 0n
        });
        console.log("Tx Hash:", rejectTx);

        const rejectReceipt = await client.waitForTransactionReceipt({ hash: rejectTx });
        console.log("Receipt Status Name:", rejectReceipt.status_name || rejectReceipt.status);

        const attackVerdict = await client.readContract({
            address: govGuardAddress,
            functionName: 'get_verdict',
            args: [attackUrl]
        });
        console.log("On-Chain Verdict:", attackVerdict);

        const postAttackCountStr = await client.readContract({
            address: mockGovAddress,
            functionName: 'get_forward_count',
            args: []
        });
        console.log("Governor Count Before:", preAttackCountStr, "| Governor Count After:", postAttackCountStr);

        const attackBlocked = attackVerdict === "REJECTED";
        const governorNotIncremented = preAttackCountStr === postAttackCountStr;

        if (attackBlocked && governorNotIncremented) {
            console.log("✅ Section 3 Evaluation: SUCCESS (Malicious Proposal Strictly REJECTED & Governor Not Spammed)");
            suiteReport.push({
                test: "Section 3: Malicious Proposal Evaluation (REJECTED)",
                status: "SUCCESS",
                txHash: rejectTx,
                verdict: attackVerdict,
                governorFirewalled: governorNotIncremented
            });
        } else {
            console.error("❌ Section 3 Failed: Attack was not properly rejected!");
            suiteReport.push({ test: "Section 3: Malicious Proposal Evaluation (REJECTED)", status: "FAILED", verdict: attackVerdict });
        }
    } catch (err) {
        console.error("❌ Section 3 Failed:", err.message);
        suiteReport.push({ test: "Section 3: Malicious Proposal Evaluation (REJECTED)", status: "ERROR", error: err.message });
    }

    // -------------------------------------------------------------
    // SECTION 4: Security & Firewall Enforcement Tests (Unauthorized Access)
    // -------------------------------------------------------------
    console.log("\n--- SECTION 4: Testing Unauthorized Access Security (Firewall Reverts) ---");

    // Test 4A: Stranger trying to update governor address on GovGuard
    console.log("Test 4A: Stranger calling set_governor_address on GovGuard...");
    try {
        const strangerTx = await strangerClient.writeContract({
            address: govGuardAddress,
            functionName: 'set_governor_address',
            args: [strangerAccount.address],
            value: 0n
        });
        const strangerReceipt = await strangerClient.waitForTransactionReceipt({ hash: strangerTx });
        
        // In GenLayer, user errors result in failed execution (result !== 6 or status_name indicating failure)
        console.log("Receipt Result Name:", strangerReceipt.result_name || strangerReceipt.txExecutionResultName || strangerReceipt.status);
        if (strangerReceipt.result_name !== "SUCCESS" && strangerReceipt.txExecutionResultName !== "FINISHED_WITH_RETURN") {
            console.log("✅ Test 4A: SUCCESS (Unauthorized update reverted as expected)");
            suiteReport.push({ test: "Section 4A: Unauthorized set_governor_address", status: "SUCCESS", outcome: "REVERTED_AS_EXPECTED" });
        } else {
            console.warn("⚠️ Test 4A: Unexpected success for unauthorized caller");
            suiteReport.push({ test: "Section 4A: Unauthorized set_governor_address", status: "WARNING", outcome: "NOT_REVERTED" });
        }
    } catch (err) {
        console.log("✅ Test 4A: SUCCESS (Reverted on broadcast / execution):", err.message);
        suiteReport.push({ test: "Section 4A: Unauthorized set_governor_address", status: "SUCCESS", outcome: "REVERTED_AS_EXPECTED" });
    }

    // Test 4B: Stranger directly calling MockGovernor.forward_proposal (Bypassing GovGuard)
    console.log("\nTest 4B: Stranger directly calling MockGovernor.forward_proposal (Bypassing GovGuard)...");
    try {
        const bypassTx = await strangerClient.writeContract({
            address: mockGovAddress,
            functionName: 'forward_proposal',
            args: [
                "https://malicious-bypass.com",
                "0x1111111111111111111111111111111111111111111111111111111111111111",
                "0x2222222222222222222222222222222222222222222222222222222222222222"
            ],
            value: 0n
        });
        const bypassReceipt = await strangerClient.waitForTransactionReceipt({ hash: bypassTx });
        console.log("Receipt Result:", bypassReceipt.result_name || bypassReceipt.txExecutionResultName || bypassReceipt.status);

        if (bypassReceipt.result_name !== "SUCCESS" && bypassReceipt.txExecutionResultName !== "FINISHED_WITH_RETURN") {
            console.log("✅ Test 4B: SUCCESS (Firewall blocked direct caller to MockGovernor)");
            suiteReport.push({ test: "Section 4B: MockGovernor Firewall Direct Bypass", status: "SUCCESS", outcome: "BLOCKED_AS_EXPECTED" });
        } else {
            console.warn("⚠️ Test 4B: Bypass call succeeded unexpectedly");
            suiteReport.push({ test: "Section 4B: MockGovernor Firewall Direct Bypass", status: "WARNING", outcome: "NOT_BLOCKED" });
        }
    } catch (err) {
        console.log("✅ Test 4B: SUCCESS (Firewall blocked call as expected):", err.message);
        suiteReport.push({ test: "Section 4B: MockGovernor Firewall Direct Bypass", status: "SUCCESS", outcome: "BLOCKED_AS_EXPECTED" });
    }

    // -------------------------------------------------------------
    // FINAL SUMMARY
    // -------------------------------------------------------------
    console.log("\n==================================================================");
    console.log(" COMPREHENSIVE SUITE REPORT SUMMARY");
    console.log("==================================================================");
    for (const item of suiteReport) {
        console.log(`${item.status === 'SUCCESS' ? '✅' : '❌'} ${item.test}: ${item.status}`);
        if (item.txHash) console.log(`   Tx Hash: ${item.txHash}`);
        if (item.verdict) console.log(`   Verdict: ${item.verdict}`);
        if (item.outcome) console.log(`   Outcome: ${item.outcome}`);
    }
    console.log("==================================================================");

    fs.writeFileSync('./full_test_report.json', JSON.stringify(suiteReport, null, 2));
    console.log("Saved test report to full_test_report.json");
}

runFullTestSuite().catch(err => {
    console.error("Test execution failed:", err);
    process.exit(1);
});
