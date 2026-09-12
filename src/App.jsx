import { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Wallet, 
  Link as LinkIcon, 
  Sparkles,
  Loader2,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Cpu,
  LogOut,
  RefreshCw
} from 'lucide-react';
import './index.css';
import { createClient, createAccount } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';
import { TransactionStatus } from 'genlayer-js/types';
import { usePrivy, useWallets } from '@privy-io/react-auth';

const CONTRACT_ADDRESS = "0x0b0502B15F3D0F9f7609D3878e8c4D0AF570b97f";

// Create GenLayer client once (Studionet doesn't need gas funding)
const glAccount = createAccount();
const glClient = createClient({ chain: studionet, account: glAccount });

function App() {
  const { login, logout, ready, authenticated, user } = usePrivy();
  const { wallets } = useWallets();
  const activeWallet = wallets[0];
  const walletAddress = user?.wallet?.address || activeWallet?.address || null;

  const [url, setUrl] = useState('');
  const [status, setStatus] = useState('idle');
  const [verdict, setVerdict] = useState(null);
  const [commitment, setCommitment] = useState(null);
  const [loadingText, setLoadingText] = useState('');
  const [stats, setStats] = useState({ evaluated: 'Loading...', forwarded: 'Loading...' });

  const truncateAddress = (addr) => {
    if (!addr) return '';
    return addr.substring(0, 6) + '...' + addr.substring(addr.length - 4);
  };

  const truncateHash = (h) => {
    if (!h || h.length <= 16) return h || 'None';
    return h.substring(0, 10) + '...' + h.substring(h.length - 8);
  };

  const MOCK_GOV_ADDRESS = "0xf0C81AA5e90aA9e04caD0E7e2a1246A0D83be3d0";

  // Fetch live stats on load
  const fetchLiveStats = async () => {
    try {
      const statsRes = await glClient.readContract({
        address: CONTRACT_ADDRESS,
        functionName: 'get_stats',
        args: [],
      });
      const fwdRes = await glClient.readContract({
        address: MOCK_GOV_ADDRESS,
        functionName: 'get_forward_count',
        args: [],
      });
      setStats({
        evaluated: statsRes.replace('Total Evaluated: ', '') || '0',
        forwarded: fwdRes.replace('Forward Count: ', '') || '0',
      });
    } catch (e) {
      console.warn('Failed to load stats:', e);
    }
  };

  useEffect(() => {
    fetchLiveStats();
  }, []);

  const handleEvaluate = async (e) => {
    if (e) e.preventDefault();
    if (!url) return;

    setStatus('loading');
    setVerdict(null);
    setCommitment(null);
    setLoadingText('Broadcasting Transaction to GenLayer AI Validators...');

    // Step 1: Send REAL transaction to GenLayer
    let txHash = null;

    try {
      txHash = await glClient.writeContract({
        address: CONTRACT_ADDRESS,
        functionName: 'evaluate_proposal',
        args: [url],
        value: 0n,
      });
      console.log('Real TX Hash:', txHash);
    } catch (err) {
      console.error('writeContract failed:', err);
      setVerdict('ERROR');
      setStatus('complete');
      return;
    }

    // Step 2: Wait for consensus
    setLoadingText('AI Validators Reaching Non-Deterministic Consensus...');

    if (txHash) {
      try {
        const receipt = await glClient.waitForTransactionReceipt({
          hash: txHash,
        });

        const isSuccess = receipt.status_name === 'ACCEPTED' || 
                          receipt.status === 2 ||
                          receipt.txExecutionResultName === 'FINISHED_WITH_RETURN' || 
                          receipt.result_name === 'MAJORITY_AGREE' ||
                          !receipt.txExecutionResultName;

        if (!isSuccess) {
          console.warn('Transaction failed or reverted:', receipt);
          setVerdict('ERROR');
          setStatus('complete');
          return;
        }

        setLoadingText('Reading Finalized On-Chain Commitment...');
        await new Promise(r => setTimeout(r, 1000));

        // Read commitment and verdict
        try {
          const commitmentData = await glClient.readContract({
            address: CONTRACT_ADDRESS,
            functionName: 'get_commitment',
            args: [url],
          });
          
          let realVerdict = 'ERROR';
          if (commitmentData && typeof commitmentData.verdict === 'string') {
            const upperResult = commitmentData.verdict.toUpperCase();
            if (upperResult.includes('APPROVED')) {
              realVerdict = 'APPROVED';
            } else if (upperResult.includes('REJECTED')) {
              realVerdict = 'REJECTED';
            }
          }
          setVerdict(realVerdict);
          setCommitment(commitmentData);
        } catch {
          // Fallback to get_verdict
          const result = await glClient.readContract({
            address: CONTRACT_ADDRESS,
            functionName: 'get_verdict',
            args: [url],
          });
          let realVerdict = 'ERROR';
          if (typeof result === 'string') {
            const upperResult = result.toUpperCase();
            if (upperResult.includes('APPROVED')) {
              realVerdict = 'APPROVED';
            } else if (upperResult.includes('REJECTED')) {
              realVerdict = 'REJECTED';
            }
          }
          setVerdict(realVerdict);
        }
        
        // Refresh live stats
        fetchLiveStats();
        setStatus('complete');
        return;
      } catch (err) {
        console.warn('waitForReceipt timeout or error:', err);
        setVerdict('ERROR');
        setStatus('complete');
      }
    }
  };

  return (
    <div className="app-container">
      <header>
        <div className="logo-container">
          <ShieldCheck className="logo-icon" size={32} />
          <span className="logo-text">GovGuard</span>
        </div>
        <button 
          className={`wallet-btn ${walletAddress ? 'connected' : ''}`} 
          onClick={() => walletAddress ? logout() : login()}
          disabled={!ready}
          style={walletAddress ? { borderColor: 'var(--success)', color: 'var(--success)', background: 'rgba(16, 185, 129, 0.1)' } : {}}
        >
          {!ready ? (
            <Loader2 className="spinner" size={18} />
          ) : walletAddress ? (
            <LogOut size={18} />
          ) : (
            <Wallet size={18} />
          )}
          {!ready ? 'Loading...' : walletAddress ? truncateAddress(walletAddress) : 'Connect Wallet'}
        </button>
      </header>

      <main>
        <section className="hero">
          <h1>AI-Powered DAO Constitutional Firewall</h1>
          <p>
            Secure your DAO from spam, malicious links, and irrelevant proposals.
            Powered by GenLayer's non-deterministic AI validators acting as a decentralized Supreme Court.
          </p>
        </section>

        <div className="dashboard-grid">
          <div className="stat-card glass-panel">
            <span className="stat-label">Evaluated Proposals</span>
            <span className="stat-value active" style={{ fontSize: '1.4rem', marginTop: '0.25rem' }}>{stats.evaluated}</span>
          </div>
          <div className="stat-card glass-panel">
            <span className="stat-label">Forwarded to Governor</span>
            <span className="stat-value active" style={{ fontSize: '1.4rem', marginTop: '0.25rem', color: 'var(--success)' }}>{stats.forwarded}</span>
          </div>
          <div className="stat-card glass-panel">
            <span className="stat-label">Network</span>
            <span className="stat-value active" style={{ fontSize: '1.2rem', marginTop: '0.25rem' }}>GenLayer Studionet</span>
          </div>
        </div>

        <div className="glass-panel" style={{ marginBottom: '1.5rem', padding: '1rem', borderLeft: '4px solid var(--primary)' }}>
          <span className="stat-label" style={{ fontWeight: '600' }}>Active DAO Constitution (SHA-256 Verified):</span>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
            "Proposals must be relevant to protocol growth, development, community education, or grant funding. They must provide clear actionable steps, contain no hate speech, and no malicious scams."
          </div>
        </div>

        <section className="evaluation-section glass-panel">
          <form onSubmit={handleEvaluate} className="input-group">
            <label htmlFor="proposal-url">
              <LinkIcon size={18} className="logo-icon" />
              Submit Proposal URL for Evaluation
            </label>
            <div className="input-wrapper">
              <input 
                id="proposal-url"
                type="url" 
                className="url-input" 
                placeholder="https://ipfs.io/ipfs/Qm... or any raw URL" 
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={status === 'loading'}
                required
              />
              <button type="submit" className="submit-btn" disabled={status === 'loading' || !url}>
                {status === 'loading' ? (
                  <Loader2 className="spinner" size={20} />
                ) : (
                  <Sparkles size={20} />
                )}
                {status === 'loading' ? 'Adjudicating...' : 'Evaluate'}
              </button>
            </div>

            {/* Quick Test Presets */}
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Quick Presets:</span>
              <button
                type="button"
                className="preset-btn"
                onClick={() => setUrl('https://raw.githubusercontent.com/Dark-Brain07/GovGuard/main/test_fixtures/valid_proposal.txt')}
                style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)', cursor: 'pointer' }}
              >
                ✅ Legitimate Dev Grant (Valid)
              </button>
              <button
                type="button"
                className="preset-btn"
                onClick={() => setUrl('https://raw.githubusercontent.com/Dark-Brain07/GovGuard/main/test_fixtures/attack_override.txt')}
                style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)', cursor: 'pointer' }}
              >
                🚨 Prompt Injection Attack (Malicious)
              </button>
            </div>

            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.75rem', textAlign: 'center' }}>
              Session: <span style={{ color: 'var(--primary)', fontFamily: 'monospace' }}>{walletAddress ? truncateAddress(walletAddress) : `Guest (${truncateAddress(glAccount.address)})`}</span> • Gasless transactions via GenLayer Studionet
            </div>
          </form>

          {status === 'loading' && (
            <div className="loading-container">
              <Cpu size={48} className="logo-icon spinner" style={{ animationDuration: '3s' }} />
              <div className="loading-text">{loadingText}</div>
            </div>
          )}

          {status === 'complete' && verdict && (
            <div className={`result-container ${verdict.toLowerCase()}`}>
              <div className="verdict-title">
                {verdict === 'APPROVED' ? <CheckCircle2 size={40} /> : <XCircle size={40} />}
                {verdict === 'ERROR' ? 'Consensus Error' : verdict}
              </div>
              <p style={{ color: 'var(--text-muted)' }}>
                {verdict === 'APPROVED' 
                  ? 'The proposal adheres to the constitution and has been forwarded to the governor.' 
                  : verdict === 'REJECTED'
                    ? 'The proposal violates the constitution (spam, injection attack, or irrelevant).'
                    : 'Transaction failed or consensus could not be reached. Please check the explorer or try again.'}
              </p>

              {commitment && commitment.content_hash && (
                <div style={{ margin: '1rem 0', padding: '0.75rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', fontSize: '0.8rem', textAlign: 'left', fontFamily: 'monospace' }}>
                  <div style={{ color: 'var(--text-muted)' }}>Cryptographic On-Chain Commitments:</div>
                  <div style={{ marginTop: '0.25rem' }}>• Content SHA-256: <span style={{ color: 'var(--primary)' }}>{truncateHash(commitment.content_hash)}</span></div>
                  <div>• Constitution SHA-256: <span style={{ color: 'var(--primary)' }}>{truncateHash(commitment.constitution_hash)}</span></div>
                </div>
              )}

              {verdict !== 'ERROR' && (
                <a href={`https://explorer-studio.genlayer.com/address/${CONTRACT_ADDRESS}`} target="_blank" rel="noreferrer" className="receipt-link">
                  View Live Contract on GenLayer Explorer <ExternalLink size={14} />
                </a>
              )}
            </div>
          )}
        </section>
      </main>

      <footer>
        Powered by GenLayer Intelligent Contracts <ShieldCheck size={14} /> Built for the GoodBuilders Program
      </footer>
    </div>
  );
}

export default App;
