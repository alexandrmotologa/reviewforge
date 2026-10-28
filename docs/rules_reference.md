# Security Rules Reference

ReviewForge applies static AST rules to modified files prior to language model synthesis. Each rule targets a specific security weakness from the OWASP Top 10 and Common Weakness Enumeration (CWE).

## Rule Catalog

### 1. SQL Injection (CWE-89)
- **Severity**: Critical
- **Target APIs**: `db.query()`, `client.query()`, `prisma.$queryRawUnsafe()`, `sequelize.query()`, `knex.raw()`, `cursor.execute()`
- **Detection**: Flags string concatenation (`+`) or template literal interpolation (`${var}`) directly inside SQL query executions without parameter placeholders.
- **Remediation**: Use parameterized statements with positional placeholders (`$1`, `?`) and separate parameter arrays.

### 2. Path Traversal (CWE-22)
- **Severity**: High
- **Target APIs**: `fs.readFile()`, `fs.readFileSync()`, `fs.createReadStream()`, `fs.writeFile()`, `path.join()`, `path.resolve()`, `open()`
- **Detection**: Flags variables originating from request parameters (`req.params`, `req.query`, `req.body`, `argv`) passed into path resolution without validation against an allowlist or containment checking.
- **Remediation**: Validate paths with `path.normalize()`, verify the target starts with the trusted root directory, or use `path.basename()` to strip directory navigation tokens.

### 3. Hardcoded Secrets and Credentials (CWE-798)
- **Severity**: Critical
- **Detection**: Inspects string literals for known token prefixes (GitHub tokens, AWS access keys, Slack webhooks, Stripe keys, Private Key PEM headers) and strings exceeding Shannon entropy thresholds.
- **Remediation**: Remove literal keys and load them from environment variables or a secret vault.

### 4. Command Injection (CWE-78)
- **Severity**: Critical
- **Target APIs**: `child_process.exec()`, `child_process.execSync()`, `subprocess.Popen(..., shell=True)`, `os.system()`
- **Detection**: Flags dynamic string interpolation in commands executed via shell subshells.
- **Remediation**: Use `child_process.execFile()` or `child_process.spawn()` with an argument array rather than a shell string.

### 5. Catastrophic Backtracking ReDoS (CWE-1333)
- **Severity**: Medium
- **Detection**: Inspects `RegExp` literals and `new RegExp()` constructors for overlapping nested quantifiers (such as `(a+)+`, `([a-zA-Z]+)*`).
- **Remediation**: Refactor patterns to be non-overlapping or use linear-time regex engines.

### 6. Server-Side Request Forgery / SSRF (CWE-918)
- **Severity**: High
- **Target APIs**: `fetch()`, `axios.get()`, `axios.post()`, `http.request()`, `urllib.request.urlopen()`
- **Detection**: Flags outgoing HTTP calls where the hostname or complete URL is taken directly from client request properties without an allowlist check.
- **Remediation**: Restrict outbound requests to an explicit domain allowlist and block private IP ranges (127.0.0.1, 10.0.0.0/8, 169.254.169.254).

### 7. Insecure CORS and Missing CSRF Protection (CWE-942)
- **Severity**: Medium
- **Detection**: Detects `Access-Control-Allow-Origin: *` headers configured alongside `credentials: true`.
- **Remediation**: Specify an explicit origin rather than a wildcard when credentials are exchanged.
