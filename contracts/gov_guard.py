# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *

class GovGuard(gl.Contract):
    """
    GovGuard: AI-Powered DAO Constitutional Firewall
    Uses GenLayer AI validators to evaluate DAO proposals against a constitution.
    Returns APPROVED if the proposal complies, or REJECTED if it violates rules (spam, malicious, out-of-scope).
    This acts as the Intelligent Contract layer for EVM-based DAOs.
    """
    constitution: str
    total_evaluated: u256

    def __init__(self):
        self.constitution = "Proposals must be relevant to protocol growth, contain no hate speech, no scam links, and provide clear actionable steps."
        self.total_evaluated = u256(0)

    @gl.public.write
    def update_constitution(self, new_rules: str) -> str:
        self.constitution = new_rules
        return "Constitution Updated"

    @gl.public.write
    def evaluate_proposal(self, proposal_url: str) -> str:
        def _fetch_proposal() -> str:
            response = gl.nondet.web.get(proposal_url)
            return response.body.decode("utf-8")[:2000]
        
        proposal_content = gl.eq_principle.strict_eq(_fetch_proposal)

        prompt = (
            "You are a strict, impartial Supreme Court Judge for a Decentralized Autonomous Organization. "
            "Analyze the proposal text. If it violates ANY part of the constitution, contains malicious links, "
            "spam, or lacks clear actionable steps, you must output 'REJECTED'. "
            "If it is safe, well-formatted, and adheres strictly to the rules, output 'APPROVED'. "
            "You must output EXACTLY 'APPROVED' or 'REJECTED' and nothing else.\n\n"
            f"CONSTITUTION:\n{self.constitution}\n\nPROPOSAL CONTENT:\n{proposal_content}"
        )

        def _get_verdict() -> str:
            return gl.nondet.exec_prompt(prompt)

        verdict = gl.eq_principle.prompt_comparative(
            _get_verdict,
            principle="Both verdicts must reach the exact same conclusion: either APPROVED or REJECTED."
        )
        
        clean_verdict = verdict.strip().upper()
        if not clean_verdict.startswith("APPROVED"):
            clean_verdict = "REJECTED"
            
        self.total_evaluated += u256(1)
        return clean_verdict

    @gl.public.view
    def get_stats(self) -> str:
        return f"Total Evaluated: {self.total_evaluated}"

