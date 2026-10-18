---
name: technical-docs
description: "Standard technical documentation writer for API specs, data schemas, and Mermaid architecture diagrams."
---

# Technical documentation

Document the implementation that exists in this repository. Read route handlers, schema migrations, environment examples, and run scripts before writing. Label proposed behavior as proposed. Never include secrets, personal data, or live credentials in examples. Use synthetic Bangladesh land identifiers and people where sample data helps.

## API specification template

For each REST endpoint, use this shape:

```markdown
### METHOD /api/path
Purpose: ...
Authentication and role: ...
Request: path/query/body fields, types, requiredness, validation, example
Response: status code, JSON schema/example, field meaning
Errors: status, machine code, recovery action
Side effects and idempotency: ...
```

For GraphQL, replace the method/path with operation name and schema signature. Include input and output types, authorization, nullability, pagination/cursors, example variables and response, errors, and side effects for mutations. Omit the GraphQL section when the project has no GraphQL API.

## Database schema template

For PostgreSQL/Supabase, document each table or view with a column table (`name | type | nullable | default | meaning`), primary/foreign/unique keys, indexes, check constraints, and lifecycle. Record ownership, Row Level Security policies by role, storage buckets and access rules, migrations, and retention/deletion behavior when implemented. Distinguish database-enforced constraints from application validation. Include a minimal synthetic row only when useful.

## Architecture diagram template

Use a small Mermaid `flowchart` or `sequenceDiagram` with named actors, services, data stores, and external providers. Mark trust boundaries and data flows; keep labels readable. Verify each node and edge against the current code, and add prose for behavior the diagram cannot show.

## Reproduction guide template

State prerequisites and tested versions, clone/install commands, environment-variable names and where to obtain them, local database or migration setup, seed data, run commands, meaningful smoke-test steps with expected results, and troubleshooting for known failures. Prefer commands that work from a clean checkout. Never suggest committing secrets or using real citizen records for a demo.
