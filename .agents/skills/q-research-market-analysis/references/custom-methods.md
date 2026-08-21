# Custom methods

Load this reference only when no bundled method can implement an approved module.

Keep the method project-local. Before execution, record the unmet need, why each relevant bundled method is insufficient, exact finding and assumption inputs, output contract, numeric and size bounds, and approval owner. Use deterministic local code when possible; do not add network access, dynamic evaluation, unsafe deserialization, secret handling, or writes outside the authorized project path.

After execution, record code path, SHA-256 hash, command, runtime/version, tests or verification, output hash, limitations, review status, and material-change approval. The result must still use calculation lineage and `published_results`; custom code does not become evidence or skill-validated methodology.

If the method should become reusable, stop after the project-local result and propose a separate `q-maint-ai-workflow` change. Never copy it into this package from a project run.

Complete the branch when the custom lineage block is valid and approved, or when the module remains an explicit gap with one owner-routed next action.
