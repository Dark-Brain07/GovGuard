# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *

@gl.contract_interface
class GovernorContract:
    def forward_proposal(self, proposal_url: str) -> None:
        pass

class GovGuard(gl.Contract):
    """
    GovGuard: AI-Powered DAO Constitutional Firewall
    Uses GenLayer AI validators to evaluate DAO proposals against a constitution.
    Returns APPROVED if the proposal complies, or REJECTED if it violates rules (spam, malicious, out-of-scope).
    This acts as the Intelligent Contract layer for EVM-based DAOs.
    """
    constitution: str
    total_evaluated: u256
    last_verdict: str
    governor_address: str
    owner: Address

    def __init__(self):
        self.constitution = "Proposals must be relevant to protocol growth, contain no hate speech, no scam links, and provide clear actionable steps."
        self.total_evaluated = u256(0)
        self.last_verdict = "NONE"
        self.governor_address = ""
        self.owner = gl.message.sender_address

    @gl.public.write
    def update_constitution(self, new_rules: str) -> str:
        if gl.message.sender_address != self.owner:
            raise gl.UserError("Only owner can update constitution")
        self.constitution = new_rules
        return "Constitution Updated"
        
    @gl.public.write
    def set_governor_address(self, addr: str) -> str:
        if gl.message.sender_address != self.owner:
            raise gl.UserError("Only owner can set governor address")
        self.governor_address = addr
        return "Governor address set"

    @gl.public.write
    def evaluate_proposal(self, proposal_url: str) -> str:
        prompt = (
            "You are a strict, impartial Supreme Court Judge for a Decentralized Autonomous Organization. "
            "Analyze the proposal text. If it violates ANY part of the constitution, contains malicious links, "
            "spam, or lacks clear actionable steps, you must output 'REJECTED'. "
            "If it is safe, well-formatted, and adheres strictly to the rules, output 'APPROVED'. "
            "You must output EXACTLY 'APPROVED' or 'REJECTED' and nothing else.\n\n"
            f"CONSTITUTION:\n{self.constitution}\n\n"
        )

        def _get_verdict() -> str:
            proposal_content = ""
            try:
                page_content = gl.get_webpage(proposal_url, mode="text")
                proposal_content = page_content[:2000] if page_content else "(empty response)"
            except Exception:
                proposal_content = "(Could not fetch URL)"
                
            full_prompt = prompt + f"PROPOSAL CONTENT:\n{proposal_content}"
            return gl.nondet.exec_prompt(full_prompt)

        verdict = gl.eq_principle.prompt_comparative(
            _get_verdict,
            principle="Both verdicts must reach the exact same conclusion: either APPROVED or REJECTED."
        )
        
        clean_verdict = verdict.strip().upper()
            
        self.last_verdict = clean_verdict
        self.total_evaluated += u256(1)
        
        # DAO Enforcement Layer
        if clean_verdict == "APPROVED" and len(self.governor_address) > 10:
            GovernorContract(Address(self.governor_address)).emit().forward_proposal(proposal_url=proposal_url)
            
        return clean_verdict

    @gl.public.view
    def get_stats(self) -> str:
        return f"Total Evaluated: {self.total_evaluated}"

    @gl.public.view
    def get_last_verdict(self) -> str:
        return self.last_verdict
