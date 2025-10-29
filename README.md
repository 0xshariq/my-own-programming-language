# My Own Programming Language

This repository contains a tiny toy programming language with Hindi-like keywords (for learning). Source files use the extension `.shar` by convention in this project, but any file name works.

This README explains how to run a `.shar` file with the included `compile.js` runner and a few usage examples.

Requirements

- Node.js (v14+ recommended)

Quick usage

- Run a `.shar` source file directly (compile then execute):

```bash
# from the project root
node compile.js path/to/your-file.shar
```

When you run the command above the script will:
- compile the `.shar` source to JavaScript and print the compiled JS,
- then execute the compiled JS and print any program output (for example `bol` statements).

Compile-only (print compiled JS without executing)

If you only want the compiled JavaScript source but not execute it, run the command and redirect to a file then inspect it:

```bash
node compile.js path/to/your-file.shar > out.js
# edit or inspect out.js; if you want to run the compiled JS:
node out.js
```

Make a small launcher for convenience

If you'd like to run `.shar` files like regular scripts, create a tiny wrapper in your project (example `run-shar`):

```bash
#!/usr/bin/env bash
node "$(dirname "$0")/compile.js" "$1"
```

Make it executable:

```bash
chmod +x run-shar
./run-shar examples/foo.shar
```

Notes and behavior

- The runner prints both the compiled JavaScript and the program's execution output, so you can inspect the JS the compiler produced.
- `.shar` is just a suggested file extension — the compiler reads plain text. You can use any extension.
- The compiler uses `eval()` to run compiled code (via `runner` / CLI). Do not run untrusted `.shar` files with this tool.

Example `.shar` file (save as `example.shar`):

```shar
ye x = 10;
ye y = 20;
ye sum = x + y;
bol sum;
agar sum > 20 {
  bol "Sum is greater than 20";
} warna {
  bol "Sum is 20 or less";
}
```

Common errors

- "File not found": make sure the path you passed to `node compile.js` exists.
- Syntax errors in `.shar` source: the compiler is minimal and may produce unclear errors; check tokens and punctuation (`;`, `{`, `}`) first.

Next steps I can help with

- Add a small CLI flag `--compile-only` to only print compiled JS without execution.
- Create a proper executable `shar` interpreter script and install it into your PATH for personal use.
- Add tests or examples under an `examples/` directory.

If you want any of those, tell me which and I will implement it.
# This is only for learning purposes, how the programming languages works

## My Own Programming Language — Keywords Reference

This README documents the language keywords supported by the simple compiler in `compile.js`. The compiler is minimal and produces JavaScript code; the following describes the keywords and how they are parsed/generated.

Keywords

- `ye` — variable declaration

  - Syntax: `ye x = 10;`
  - Semantics: declares a JavaScript `let` binding. The right-hand side is an expression.

- `bol` — print statement

  - Syntax: `bol x;` or `bol "hello";`
  - Semantics: compiles to `console.log(...)`.

- `agar` — if

  - Syntax: `agar <condition> { ... }`
  - Semantics: standard `if` statement. The compiler supports chained `nahitoh` (else-if) and final `warna` (else).

- `nahitoh` — else-if (chainable)

  - Syntax: used after an `agar` block: `agar cond1 { ... } nahitoh cond2 { ... } warna { ... }`
  - Semantics: each `nahitoh` becomes an `else if` when generating JS. Multiple `nahitoh` are supported.

- `warna` — else

  - Syntax: follows an `agar` (and optional `nahitoh`) block: `warna { ... }`

- `lagataar` — while loop

  - Syntax: `lagataar <condition> { ... }`
  - Semantics: compiles to a JS `while (<condition>) { ... }`.

- `jabtak` — basic for-like loop (simple form)

  - Syntax (current minimal support): `jabtak <condition> { ... }`
  - Semantics: currently compiled into a `for (; <condition> ;) { ... }` (a for-loop with empty init/update). This is a placeholder for a fuller `for` syntax and can be extended later.

- `ruk` — break

  # My Own Programming Language

  Tiny toy language with Hindi-style keywords. Source files commonly use the `.shar` extension.

  This README shows how to run `.shar` files with the included `compile.js` runner and documents
  the language's keywords and the added JSON/fetch helpers.

  Requirements

  - Node.js (v14+ recommended)

  Quick start

  - Run a `.shar` file (compile and execute):

  ```bash
  # from the project root
  node compile.js path/to/your-file.shar
  ```

  By default the runner prints the compiled JavaScript and then executes it (via eval). To only
  see the compiled JS (no execution) use:

  ```bash
  node compile.js --compile-only path/to/your-file.shar
  ```

  If you prefer to capture the compiled JS to inspect it later:

  ```bash
  node compile.js path/to/your-file.shar > out.js
  node out.js
  ```

  Make a small wrapper to run `.shar` files directly:

  ```bash
  #!/usr/bin/env bash
  node "$(dirname "$0")/compile.js" "$1"
  ```

  Keywords & quick reference
  --------------------------

  The compiler produces JavaScript. The important keywords are:

  - `ye` — variable declaration (`let`). Syntax: `ye x = 10;`
  - `sthayi` — constant declaration (`const`). Syntax: `sthayi pi = 3;`
  - `bol` — print statement. Compiles to `console.log(...)`.
  - `agar` / `nahitoh` / `warna` — `if` / `else if` / `else` chains.
  - `lagataar` — `while` loop.
  - `jabtak` — `for`-like loop (currently limited syntax).
  - `ruk` — `break`.
  - `chhod` — `continue`.
  - `wapas` — `return` inside functions.
  - `karya` — function declaration. Prefix with `aasynk` to make it async: `aasynk karya name(...) {}`.
  - `aasynk` — async prefix (for `karya` and async arrow expressions).
  - `pratiksha` — `await` equivalent for promises.
  - `lao` / `mangao` — fetch helpers that request JSON and return the parsed object when awaited.

  Notes and limitations

  - The compiler is intentionally small. Expression parsing supports common operators but is
    simplified; for example operator precedence may not match full JavaScript in all cases.
  - The runner uses `eval()` to execute compiled JS. Avoid running untrusted `.shar` files.

  Examples
  --------

  Conditionals and printing

  ```shar
  ye x = 10;
  bol x;
  agar x > 5 {
    bol "big";
  } nahitoh x == 5 {
    bol "five";
  } warna {
    bol "small";
  }
  ```

  Loops

  ```shar
  ye i = 0;
  lagataar i < 5 {
    i = i + 1;
    chhod; // continue
  }
  ```

  JSON / Fetching APIs
  --------------------

  This language provides helpers for HTTP + JSON:

  - `lao(url)` — calls fetch(url) and automatically parses JSON. Use with `pratiksha` to await parsed JSON.
  - `mangao(url)` — alias for `lao` (same behavior).
  - `aasynk` — async prefix; `aasynk karya` declares an async function.
  - `pratiksha` — await equivalent.

  Example — fetch JSON and print a field:

  ```shar
  aasynk karya getAndPrint() {
    ye url = "https://jsonplaceholder.typicode.com/todos/1";
    ye data = pratiksha lao(url);
    bol data.title;
  }

  getAndPrint();
  ```

  Notes about fetch helper behavior

  - Calls to `lao(...)` and `mangao(...)` are emitted as calls to a runtime helper `__shar_fetch(...)`.
    The runner prepends an implementation that:
    - Optionally prefixes relative URLs with a `baseUrl` from `shar.config.json` or the
      `SHAR_BASE_URL` environment variable.
    - Optionally applies default headers from `shar.config.json` or `SHAR_DEFAULT_HEADERS` (JSON).
    - Calls `fetch(finalUrl, options).then(r => r.json())` and returns that promise.

  Configuration
  -------------

  You can optionally create `shar.config.json` in the project root with this shape:

  ```json
  {
    "baseUrl": "https://api.example.com/v1",
    "defaultHeaders": { "X-Api-Key": "secret" }
  }
  ```

  Or set environment variables:

  ```bash
  export SHAR_BASE_URL="https://api.example.com/v1"
  export SHAR_DEFAULT_HEADERS='{"X-Api-Key":"secret"}'
  ```

  Examples folder
  ---------------

  See `examples/fetch_example.shar` for a small demo that uses `lao` and `mangao` with async/await.

  If you'd like, I can:

  - Tidy further (add more examples),
  - Add a `--allow-network` opt-in flag, or
  - Improve static typing for JSON responses.
