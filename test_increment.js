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
        hash: mockGovHash,
        status: "FINALIZED"
    });
    const mockGovAddress = mockGovReceipt.contractAddress;
    console.log("Mock Governor Address:", mockGovAddress);

    // deploy gov guard
    console.log("Deploying GovGuard...");
    const govGuardHash = await client.deployContract({
        code: govGuardCode,
        args: []
    });
    const govGuardReceipt = await client.waitForTransactionReceipt({ 
        hash: govGuardHash,
        status: "FINALIZED"
    });
    const govGuardAddress = govGuardReceipt.contractAddress;
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
        hash: setHash,
        status: "FINALIZED"
    });

    // evaluate an approved proposal
    // We use a simple URL that doesn't violate the constitution: a plain text string about protocol growth.
    // The constitution: "Proposals must be relevant to protocol growth, contain no hate speech, no scam links, and provide clear actionable steps."
    console.log("Evaluating proposal (expecting APPROVED)...");
    
    // We can use a dummy URL that just returns text or simulate it if the URL isn't strict. 
    // The simulator fetches from the URL. Let's use a dummy text file from github.
    const validUrl = "https://raw.githubusercontent.com/yeagerai/genlayer-simulator/refs/heads/main/README.md";
    
    const evalHash = await client.writeContract({
        address: govGuardAddress,
        functionName: 'evaluate_proposal',
        args: [validUrl],
        value: 0n
    });
    const evalReceipt = await client.waitForTransactionReceipt({ 
        hash: evalHash,
        status: "FINALIZED"
    });
    
    console.log("Evaluation finalized.");

    // get forward count
    const count = await client.readContract({
        address: mockGovAddress,
        functionName: 'get_forward_count',
        args: []
    });
    console.log("Final Forward Count on MockGovernor:", count);
    
    // get last verdict
    const verdict = await client.readContract({
        address: govGuardAddress,
        functionName: 'get_last_verdict',
        args: []
    });
    console.log("Final Verdict on GovGuard:", verdict);
}

run().catch(console.error);
