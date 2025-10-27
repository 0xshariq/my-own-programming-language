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

  - Syntax: `ruk;`
  - Semantics: compiles to `break;` inside loops.

- `chhod` — continue

  - Syntax: `chhod;`
  - Semantics: compiles to `continue;` inside loops.

- `wapas` — return
  - Syntax: `wapas <expression>;`
  - Semantics: compiles to `return <expression>;` (useful inside functions — the compiler currently provides minimal function support).

Literals and other tokens

- Strings: enclosed in single or double quotes, e.g. `"hello"` or `'hi'`.
- Numbers: simple integer literals (sequence of digits).
- Identifiers: ASCII letters only in this simple lexer (e.g. `x`, `sum`).
- Operators: `+ - * / % = > < >= <= == !=` (two-character equality/relational operators supported).
- Punctuation: `(` `)` `{` `}` `;` `,`

Notes and limitations

- The parser is intentionally small and sometimes permissive; expression parsing is a very simple left-associative binary parser with no operator precedence. That means `1 + 2 * 3` will be parsed as `(1 + 2) * 3`.
- `jabtak` currently acts like a `for` with only a condition (i.e., `for (; condition ;) { ... }`). If you want traditional `for (init; cond; update)` support we can extend the syntax and parser.
- The compiler emits JavaScript source and the `runner` helper does a `eval()` on the compiled JS. Use carefully and avoid running untrusted input.

Examples

Example 1 — conditionals and printing:

```
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

Example 2 — loops and break/continue:

```
ye i = 0;
lagataar i < 5 {
	i = i + 1;
	chhod; // continue
}
```
