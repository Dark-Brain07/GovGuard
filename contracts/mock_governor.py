# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *

class MockGovernor(gl.Contract):
    """
    MockGovernor: A mock governance contract to demonstrate DAO enforcement path.
    Receives forwarded proposals from GovGuard.
    """
    received_proposals: DynArray[str]
    forward_count: u256

    def __init__(self):
        self.forward_count = u256(0)

    @gl.public.write
    def forward_proposal(self, proposal_url: str) -> None:
        self.received_proposals.append(proposal_url)
        self.forward_count += u256(1)

    @gl.public.view
    def get_forward_count(self) -> str:
        return f"Forward Count: {self.forward_count}"
