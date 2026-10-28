# ReviewForge: Master Implementation Plan

> Self-hosted AI pull request reviewer, AST semantic diff auditor, and automated unit test synthesizer. Runs as a self-hosted daemon or CLI tool, inspects Abstract Syntax Tree (AST) context for changed files, audits OWASP vulnerabilities, and generates GitHub multi-line suggestions with runnable unit tests.

---

## 1. Architecture and Data Flow

ReviewForge provides a private, self-hosted alternative to cloud-only code review tools. It analyzes code changes in the context of their enclosing scopes (functions, classes, imports) rather than isolated diff lines, runs static security audits, synthesizes unit tests for modified logic, and outputs actionable GitHub suggestion blocks.

```
+-----------------------------------------------------------------------------------+
|                                    REVIEWFORGE                                    |
+-----------------------------------------+-----------------------------------------+
                                          |
        +---------------------------------+---------------------------------+
        |                                                                   |
+-------v-------------------------+                 +-----------------------v-------+
|    Git Diff & AST Engine        |                 |    Security & Vulnerability   |
|  * Unified Diff Hunk Parser     |                 |  * OWASP Top 10 AST Checks    |
|  * Babel/Recast Scope Resolver  |                 |  * SQLi, Path Traversal, SSRF |
|  * Python & Go AST Analyzers    |                 |  * Secret & Auth Leak Audit   |
+-------+-------------------------+                 +-----------------------+-------+
        |                                                                   |
        +---------------------------------+---------------------------------+
                                          |
                        +-----------------v-----------------+
                        |   Automated Test Synthesizer      |
                        |  * Jest, Vitest, Pytest, Go Tests |
                        |  * Happy Path & Boundary Coverage |
                        |  * Error Handling Verification    |
                        +-----------------+-----------------+
                                          |
                        +-----------------v-----------------+
                        |   GitHub PR Multi-Line Commenter  |
                        |  * Octokit Pull Request Reviews   |
                        |  * 1-Click Suggestion Blocks      |
                        |  * Markdown & SARIF Export        |
                        +-----------------+-----------------+
                                          |
                        +-----------------v-----------------+
                        |   Fastify Webhook & Web Studio    |
                        |  * GitHub Webhook (HMAC SHA-256)  |
                        |  * React 19 Interactive Studio    |
                        |  * CLI Engine (Port 9440)         |
                        +-----------------------------------+
```

---

## 2. Directory Structure

```
reviewforge/
├── src/
│   ├── git/
│   │   ├── diff_parser.ts        # Parses unified diffs into file hunks and line positions
│   │   ├── hunk_locator.ts       # Maps diff line positions to GitHub review comment lines
│   │   └── octokit_client.ts     # Octokit integration for PR reviews and suggestion blocks
│   ├── ast/
│   │   ├── ts_parser.ts          # TypeScript and JavaScript AST parser (Babel and Recast)
│   │   ├── python_parser.ts      # Python scope, function, and import extractor
│   │   ├── go_parser.ts          # Go function, receiver, and package inspector
│   │   ├── context_expander.ts   # Locates surrounding function and class scope for hunks
│   │   ├── breaking_changes.ts   # API contract comparison (parameter and export changes)
│   │   └── taint_tracer.ts       # AST taint flow tracer and blast radius calculator
│   ├── security/
│   │   ├── rules/
│   │   │   ├── sql_injection.ts  # Detects unparameterized SQL queries in template strings
│   │   │   ├── auth_leak.ts      # Flags missing auth guards and hardcoded credentials
│   │   │   ├── traversal.ts      # Detects unsafe path joins with user inputs
│   │   │   ├── command_injection.ts # Flags shell execution with unsanitized inputs
│   │   │   ├── insecure_regex.ts # Detects exponential catastrophic backtracking patterns
│   │   │   ├── ssrf.ts           # Detects unvalidated outbound network requests
│   │   │   └── cors_csrf.ts      # Detects permissive CORS origins and unprotected routes
│   │   ├── custom_rule_engine.ts # In-memory custom regex sandbox and .reviewforge.yml updater
│   │   └── linter.ts             # Orchestrates static security rules and CWE classification
│   ├── synthesizer/
│   │   ├── test_generator.ts     # Generates complete test suites for modified functions
│   │   ├── suggestion_fixer.ts   # Formats replacement code into 1-click suggestion blocks
│   │   ├── validator.ts          # Validates syntax of generated tests with auto-repair
│   │   ├── pr_description.ts     # Synthesizes Conventional PR descriptions and changelogs
│   │   └── prompt_templates.ts   # Prompts for logic review, security, and test synthesis
│   ├── engine/
│   │   ├── llm_provider.ts       # Provider client for Ollama, OpenAI, Anthropic, Gemini
│   │   └── reviewer.ts           # Core orchestrator running AST, security, and LLM reviews
│   ├── server/
│   │   ├── webhook.ts            # Fastify webhook receiver with HMAC signature validation
│   │   └── api.ts                # REST API for the review management web studio
│   ├── export/
│   │   └── sarif.ts              # Generates SARIF 2.1.0 reports for GitHub Code Scanning
│   └── cli.ts                    # CLI tool for local diff review and PR analysis
├── web/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header.tsx            # Navigation header and connection status
│   │   │   ├── PrReviewCard.tsx      # Finding cards with inline suggestion diff view
│   │   │   ├── DiffPlayground.tsx    # Live diff input and on-demand review inspector
│   │   │   ├── DiffViewer.tsx        # Interactive diff viewer with inline patch fixes & filters
│   │   │   ├── PrDescriptionTab.tsx  # Conventional PR title, markdown description, and changelog
│   │   │   ├── TaintTracerTab.tsx    # Taint flow trajectory and blast radius visualizer
│   │   │   ├── AuditLogTab.tsx       # Historical PR reviews and webhook execution log
│   │   │   ├── CustomRulesModal.tsx  # In-browser regex rule sandbox and policy editor
│   │   │   ├── SynthesizedTests.tsx  # Generated test suite drawer with copy and export
│   │   │   ├── SecurityScorecard.tsx # OWASP risk scorecard and CWE vulnerability table
│   │   │   └── ModelSettingsModal.tsx# Provider configuration (Ollama, API keys, models)
│   │   ├── hooks/
│   │   │   └── useReviewSession.ts   # State management hook for reviews and test suites
│   │   ├── types.ts                  # Shared client types
│   │   ├── App.tsx                   # Main studio view with tabs
│   │   ├── index.css                 # Tailwind utility styling
│   │   └── main.tsx                  # Application bootstrap
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── index.html
├── tests/
│   ├── diff_parser.test.ts       # Validates unified diff parsing and line positions
│   ├── context_expander.test.ts  # Validates AST enclosing scope retrieval
│   ├── security_rules.test.ts    # Validates OWASP vulnerability detection
│   ├── test_generator.test.ts    # Validates unit test synthesis
│   ├── reviewer_engine.test.ts   # Validates end-to-end review orchestration
│   └── sarif_export.test.ts      # Validates SARIF output compliance
├── docs/
│   ├── architecture.md           # System architecture and data flow documentation
│   ├── webhook_setup.md          # Guide for configuring GitHub and GitLab webhooks
│   └── rules_reference.md        # Reference of security rules and CWE classifications
├── .github/
│   └── workflows/
│       └── reviewforge.yml       # Self-hosted GitHub Action workflow definition
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── README.md
```

---

## 3. Implementation Phases

### Phase 1: Git Diff Parser and AST Context Expansion
- Parse unified git diffs into structured file objects with hunks, line additions, and deletions.
- Compute GitHub review comment target line numbers for single-line and multi-line comments.
- Implement AST scope extractors for TypeScript/JavaScript (`@babel/parser`, `@babel/traverse`), Python, and Go.
- Match modified diff lines to their enclosing function or class definitions, providing surrounding context to the review engine.

### Phase 2: Static Security Rules and OWASP Scanner
- Implement AST pattern checkers for SQL injection, path traversal, command execution, hardcoded credentials, ReDoS, and SSRF.
- Map all findings to standardized CWE identifiers and severity ratings.
- Calculate repository risk scores based on detected vulnerability counts and severities.

### Phase 3: Automated Unit Test Synthesizer
- Identify modified functions, parameter signatures, and branch conditions.
- Detect testing frameworks (Jest, Vitest, Pytest, Go testing).
- Generate runnable test files covering valid calls, boundary inputs (null, empty strings, limits), and exception rejections.
- Implement both template-driven heuristic synthesis and LLM-assisted generation.

### Phase 4: Suggestion Blocks, GitHub Client, and SARIF Export
- Format code corrections into GitHub multi-line markdown `suggestion` blocks.
- Implement GitHub Pull Request Review API publisher using Octokit.
- Generate SARIF 2.1.0 reports to upload directly to GitHub Code Scanning.

### Phase 5: Fastify Webhook Server and CLI Engine
- Create Fastify HTTP server on port 9440.
- Handle GitHub webhook events (`pull_request.opened`, `pull_request.synchronize`) with HMAC SHA-256 validation.
- Implement REST API endpoints for review listing, live diff analysis, settings, and test exports.
- Implement CLI commands for local diff analysis (`reviewforge review --diff`), remote PR analysis (`reviewforge review --pr <owner>/<repo>/<id>`), security audits, and server startup.

### Phase 6: React 19 Review Studio
- Build interactive web interface in `web/` using React 19, Vite, and Tailwind CSS.
- Provide a Live Diff Playground for instant pasting and analysis of Git diffs.
- Render finding cards with diff visualizers and 1-click suggestion copy blocks.
- Render Security Scorecard with CWE breakdown and risk meters.
- Render Synthesized Tests drawer with language highlighting and file downloads.
- Provide settings modal for local Ollama and cloud LLM connection testing.

### Phase 7: Verification and Documentation
- Write Vitest unit test suite covering diff parsing, AST expansion, security rules, test synthesis, and reviewer engine.
- Verify end-to-end functionality across CLI, API, and web interface.
- Complete documentation files and clean README with humanizer discipline.

### Phase 8: Advanced Extensions and Studio Enhancements (Completed)
- Auto-generated Conventional PR Descriptions and CHANGELOG.md snippets from AST diff analysis.
- AST Taint and Blast Radius Propagation Tracer for dangerous execution sinks.
- In-browser interactive custom regex rule sandbox with YAML persistence.
- One-click inline fix application, line replacement, and patched file download directly in the web UI.
- PR Audit Log and webhook review history dashboard with re-review execution.
- Reviewer progress tracking with file search, review completion checks, and vulnerability status filtering.
