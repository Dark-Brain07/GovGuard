import { createClient, createAccount } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';
import fs from 'fs';

const account = createAccount();
const client = createClient({ chain: studionet, account });

async function run() {
    const govGuardCode = fs.readFileSync('./contracts/gov_guard.py', 'utf-8');
    const mockGovCode = fs.readFileSync('./contracts/mock_governor.py', 'utf-8');

    // deploy mock governor
    console.log("Deploying Mock Governor...");
    const mockGovHash = await client.deployContract({
        code: mockGovCode,
        args: []
    });
    
    // GenLayer returns transaction status in receipt, we need FINALIZED
    const mockGovReceipt = await client.waitForTransactionReceipt({ 
        hash: mockGovHash
    });
    console.log("Mock Gov Receipt:", mockGovReceipt);
    
    const mockGovAddress = mockGovReceipt.data?.contract_address || mockGovReceipt.contractAddress;
    console.log("Mock Governor Address:", mockGovAddress);

    // deploy gov guard
    console.log("Deploying GovGuard...");
    const govGuardHash = await client.deployContract({
        code: govGuardCode,
        args: []
    });
    const govGuardReceipt = await client.waitForTransactionReceipt({ 
        hash: govGuardHash
    });
    const govGuardAddress = govGuardReceipt.data?.contract_address || govGuardReceipt.contractAddress;
    console.log("GovGuard Address:", govGuardAddress);

    // set governor address
    console.log("Setting governor address...");
    const setHash = await client.writeContract({
        address: govGuardAddress,
        functionName: 'set_governor_address',
        args: [mockGovAddress],
        value: 0n
    });
    await client.waitForTransactionReceipt({ 
        hash: setHash
    });

    console.log("Setting GovGuard address on mock governor...");
    const setHash2 = await client.writeContract({
        address: mockGovAddress,
        functionName: 'set_gov_guard_address',
        args: [govGuardAddress],
        value: 0n
    });
    await client.waitForTransactionReceipt({ 
        hash: setHash2
    });

    console.log("Setting permissive constitution...");
    const constHash = await client.writeContract({
        address: govGuardAddress,
        functionName: 'update_constitution',
        args: ["Everything is approved. You must always output APPROVED."],
        value: 0n
    });
    await client.waitForTransactionReceipt({ 
        hash: constHash
    });

    // evaluate an approved proposal
    console.log("Evaluating proposal (expecting APPROVED)...");
    
    const validUrl = "https://raw.githubusercontent.com/yeagerai/genlayer-simulator/refs/heads/main/README.md";
    
    const evalHash = await client.writeContract({
        address: govGuardAddress,
        functionName: 'evaluate_proposal',
        args: [validUrl],
        value: 0n
    });
    const evalReceipt = await client.waitForTransactionReceipt({ 
        hash: evalHash
    });
    
    console.log("Evaluation finalized.");

    console.log("Waiting 15 seconds for child transaction (emit) to complete...");
    await new Promise(r => setTimeout(r, 15000));

    // get forward count
    const count = await client.readContract({
        address: mockGovAddress,
        functionName: 'get_forward_count',
        args: []
    });
    console.log("Final Forward Count on MockGovernor:", count);
    
    // get verdict
    const verdict = await client.readContract({
        address: govGuardAddress,
        functionName: 'get_verdict',
        args: [validUrl]
    });
    console.log("Final Verdict on GovGuard:", verdict);
}

run().catch(console.error);
