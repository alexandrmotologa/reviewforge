# ReviewForge Architecture

This document outlines the internal architecture, data structures, and pipeline flow of ReviewForge.

## System Overview

ReviewForge runs as an autonomous review agent and static auditor. Unlike standard linters or raw text diff analyzers, ReviewForge operates on both the Git unified diff and the Abstract Syntax Tree (AST) of modified files.

The pipeline processes code changes through five core stages:

1. Unified diff parsing and hunk index mapping.
2. AST scope extraction and context expansion.
3. Static OWASP Top 10 security scanning.
4. Unit test suite synthesis.
5. GitHub PR review and multi-line suggestion generation.

```
                  +---------------------------+
                  |  Git Diff / Pull Request  |
                  +-------------+-------------+
                                |
                                v
                  +---------------------------+
                  |     Diff Hunk Parser      |
                  +-------------+-------------+
                                |
                   +------------+------------+
                   |                         |
                   v                         v
        +--------------------+    +--------------------+
        | AST Scope Extractor|    | Static Security    |
        | (Babel/Recast)     |    | Rules Engine       |
        +----------+---------+    +----------+---------+
                   |                         |
                   +------------+------------+
                                |
                                v
                  +---------------------------+
                  | Automated Test Synthesizer|
                  +-------------+-------------+
                                |
                                v
                  +---------------------------+
                  | Review Orchestrator & LLM |
                  +-------------+-------------+
                                |
                                v
                  +---------------------------+
                  | GitHub Comments / Web UI  |
                  +---------------------------+
```

## Core Modules

### 1. Git Diff Parser (`src/git/diff_parser.ts`)

The diff parser ingests raw unified diff text (such as output from `git diff` or GitHub PR diff endpoints). It breaks the stream into `FileDiff` structures:

- File header inspection (`diff --git a/path b/path`, `--- a/path`, `+++ b/path`).
- Hunk extraction (`@@ -oldStart,oldLines +newStart,newLines @@`).
- Line-by-line categorization: context (` `), addition (`+`), and deletion (`-`).
- Precise calculation of the GitHub diff position index required when commenting on specific lines via the GitHub API.

### 2. AST Context Expander (`src/ast/`)

When a developer changes two lines inside a fifty-line function, a raw diff shows only those two lines. Static security linters and language models cannot evaluate variable origins or side effects without knowing the surrounding scope.

ReviewForge expands context:

- For JavaScript and TypeScript, `@babel/parser` parses the complete modified file with full syntax support (JSX, TS, decorators, dynamic imports).
- It traverses the AST to locate the smallest enclosing declaration (FunctionDeclaration, ClassMethod, ArrowFunctionExpression, VariableDeclaration) around every modified line.
- It extracts the complete function code, parameter names, return types, and imported dependencies.
- For Python and Go files, dedicated syntax inspectors identify function signatures, classes, and enclosing scopes.

### 3. Static Security Engine (`src/security/`)

Before invoking any language model, ReviewForge executes deterministic AST security rules. Each rule produces structured findings with:

- Vulnerability title and descriptive summary.
- CWE identifier (such as CWE-89, CWE-22, CWE-798, CWE-78).
- Severity level: Critical, High, Medium, or Low.
- Exact line and column coordinates.
- Concrete remediation suggestion.

Rules include:
- SQL injection: Checks template literals and binary concatenations passed to database query methods.
- Path traversal: Flags unvalidated path parameters passed to filesystem APIs.
- Auth leaks and hardcoded secrets: Detects high-entropy strings, token patterns, and unprotected HTTP routes.
- Command injection: Identifies process execution methods receiving concatenated parameters.
- ReDoS: Flags regular expressions containing nested quantifiers.
- SSRF: Detects user-controlled URLs in outbound HTTP calls.
- Insecure CORS: Detects wildcard origins paired with credential flags.

### 4. Unit Test Synthesizer (`src/synthesizer/`)

For newly added or modified functions, ReviewForge generates a runnable test suite.

- Detects target testing framework: Jest and Vitest for TypeScript/JavaScript, Pytest for Python, and standard `testing` for Go.
- Generates test cases across three distinct requirements:
  1. Happy path: Standard input execution and expected return value validation.
  2. Boundary checks: Empty strings, zero, null, undefined, negative numbers, and boundary collection lengths.
  3. Error rejection: Invalidation tests verifying that exceptions or rejections fire on malformed inputs.
- Operates in two modes: an offline AST-driven heuristic generator and an enhanced LLM synthesizer when an inference provider is connected.

### 5. Multi-Model Engine (`src/engine/`)

The LLM provider connects to:
- Local Ollama instances (default: `http://localhost:11434`), ensuring zero code leaves the host.
- OpenAI-compatible endpoints (vLLM, LMStudio, LocalAI).
- Anthropic Claude, Google Gemini, OpenAI, or OpenRouter.
- Deterministic offline fallback: When no provider is active, the engine operates purely on static AST rules and heuristic synthesis.

### 6. GitHub Review Integration (`src/git/octokit_client.ts`)

ReviewForge converts findings with available fixes into GitHub multi-line suggestion blocks:

````markdown
```suggestion
const safePath = path.normalize(path.join(ALLOWED_DIR, path.basename(userInput)));
```
````

When published as a GitHub PR Review, the repository maintainer can click "Commit suggestion" directly from the GitHub conversation tab.
