# WASI 0.2 Policy & Compliance Sandboxes

Every agent-synthesized patch and deployment manifest passes through deterministic WebAssembly policy modules before reaching `origin/main` or production PoPs.

## Policy Hooks
- `pre_patch_verify.wasm`: Enforces zero-egress test execution and rejects unpinned dependencies.
- `oci_attest_gate.wasm`: Validates SLSA Level 3 provenance signatures and SBOM completeness.
- `region_residency.wasm`: Guarantees tenant workloads remain pinned to approved sovereign regions.
