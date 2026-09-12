# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *

class MockGovernor(gl.Contract):
    """
    MockGovernor: A mock governance contract to demonstrate DAO enforcement path.
    Receives forwarded proposals along with cryptographic content and constitution commitments from GovGuard.
    """
    received_proposals: DynArray[str]
    received_content_hashes: DynArray[str]
    received_constitution_hashes: DynArray[str]
    forward_count: u256
    owner: Address
    gov_guard_address: Address

    def __init__(self):
        self.forward_count = u256(0)
        self.owner = gl.message.sender_address
        self.gov_guard_address = Address("0x0000000000000000000000000000000000000000")

    @gl.public.write
    def set_gov_guard_address(self, addr: str) -> str:
        if gl.message.sender_address != self.owner:
            raise gl.UserError("Only owner can set gov_guard_address")
        self.gov_guard_address = Address(addr)
        return "GovGuard address set"

    @gl.public.write
    def forward_proposal(self, proposal_url: str, content_hash: str, constitution_hash: str) -> None:
        if gl.message.sender_address != self.gov_guard_address:
            raise gl.UserError("Only GovGuard can forward proposals")
        self.received_proposals.append(proposal_url)
        self.received_content_hashes.append(content_hash)
        self.received_constitution_hashes.append(constitution_hash)
        self.forward_count += u256(1)

    @gl.public.view
    def get_forward_count(self) -> str:
        return f"Forward Count: {self.forward_count}"

    @gl.public.view
    def get_latest_proposal(self) -> dict:
        if len(self.received_proposals) == 0:
            return {
                "url": "",
                "content_hash": "",
                "constitution_hash": ""
            }
        last_idx = len(self.received_proposals) - 1
        return {
            "url": self.received_proposals[last_idx],
            "content_hash": self.received_content_hashes[last_idx],
            "constitution_hash": self.received_constitution_hashes[last_idx]
        }

