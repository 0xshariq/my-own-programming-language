# My Own Programming Language — Keywords Reference

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

If you'd like, I can:
- Add full `for (init; cond; update)` syntax for `jabtak`.
- Improve expression parsing with operator precedence.
- Add unit tests for the lexer/parser/generator.

Feel free to tell me which keywords or syntax you'd like next and I'll implement them and update this README. 
