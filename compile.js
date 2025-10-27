// A simple compiler for a custom programming language with Hindi-like keywords
// This compiler includes a runner function to execute the compiled code directly

const fs = require('fs');

// Lexer: Converts input code into tokens
function lexer(input) {
    const tokens = [];
    let current = 0;

    while (current < input.length) {
        let char = input[current];

        // Skip whitespace
        if (/\s/.test(char)) {
            current++;
            continue;
        }

        // Strings
        if (char === '"' || char === "'") {
            let str = '';
            char = input[++current];
            while (char !== '"' && char !== "'" && current < input.length) {
                str += char;
                char = input[++current];
            }
            current++;
            tokens.push({ type: 'string', value: str });
            continue;
        }

        // Identifiers and keywords
        if (/[a-zA-Z]/.test(char)) {
            let word = '';
            while (/[a-zA-Z]/.test(char) && current < input.length) {
                word += char;
                char = input[++current];
            }
            if (word === 'ye' || word === 'bol' || word === 'agar' || word === 'nahitoh' || word === 'warna' || word === 'lagataar' || word === 'jabtak' || word === 'ruk' || word === 'chhod' || word === 'wapas') {
                tokens.push({ type: 'keyword', value: word });
            } else {
                tokens.push({ type: 'identifier', value: word });
            }
            continue;
        }

        // Numbers
        if (/[0-9]/.test(char)) {
            let number = '';
            while (/[0-9]/.test(char) && current < input.length) {
                number += char;
                char = input[++current];
            }
            tokens.push({ type: 'number', value: parseInt(number, 10) });
            continue;
        }

        // Operators (including relational and two-char operators)
        if (/[\+\-\*\/=\%<>!]/.test(char)) {
            let op = char;
            const next = input[current + 1];
            // Handle two-character operators: >=, <=, ==, !=
            if ((char === '>' || char === '<' || char === '=' || char === '!') && next === '=') {
                op += next;
                current += 2;
            } else {
                current++;
            }
            tokens.push({ type: 'operator', value: op });
            continue;
        }

        // Punctuation
        if (/[\(\)\{\}\;\,]/.test(char)) {
            tokens.push({ type: 'punctuation', value: char });
            current++;
            continue;
        }

        // Comments
        if (char === '/' && input[current + 1] === '/') {
            while (char !== '\n' && current < input.length) {
                char = input[++current];
            }
            continue;
        }

        // If we reach here the character wasn't recognized by any rule above.
        // Advance `current` to avoid an infinite loop and emit an unknown token.
        tokens.push({ type: 'unknown', value: char });
        current++;
    }

    return tokens;
}
// Parser: Converts tokens into an Abstract Syntax Tree (AST)
function parser(tokens) {
    // tokens is mutated (shifted) as we parse
    const ast = { type: 'Program', body: [] };

    function peek() { return tokens[0]; }
    function consume() { return tokens.shift(); }

    // Expression parser with operator precedence (Pratt-like)
    const PRECEDENCE = {
        '||': 1,
        '&&': 2,
        '==': 3, '!=': 3,
        '>': 4, '<': 4, '>=': 4, '<=': 4,
        '+': 5, '-': 5,
        '*': 6, '/': 6, '%': 6,
    };

    function isExpressionBoundary(tok) {
        return !tok || tok.type === 'punctuation' && (tok.value === ';' || tok.value === '}' || tok.value === ')' || tok.value === '{') || tok.type === 'keyword';
    }

    function parseExpression(precedence = 0) {
        let left = parsePrimary();
        if (!left) return null;

        while (true) {
            const next = peek();
            if (!next || next.type !== 'operator') break;
            const op = next.value;
            const prec = PRECEDENCE[op] || 0;
            if (prec <= precedence) break;
            consume(); // operator
            const right = parseExpression(prec);
            left = { type: 'BinaryExpression', operator: op, left, right };
        }
        return left;
    }

    function parsePrimary() {
        const t = peek();
        if (!t) return null;
        if (t.type === 'number') { consume(); return { type: 'Literal', value: t.value }; }
        if (t.type === 'string') { consume(); return { type: 'Literal', value: t.value }; }
        if (t.type === 'identifier') { consume(); return { type: 'Identifier', name: t.value }; }
        // Parenthesized expression
        if (t.type === 'punctuation' && t.value === '(') {
            consume();
            const expr = parseExpression(0);
            if (peek() && peek().type === 'punctuation' && peek().value === ')') consume();
            return expr;
        }
        return null;
    }

    function parseBlock() {
        // assume next token is '{'
        if (!peek() || peek().type !== 'punctuation' || peek().value !== '{') return null;
        consume(); // '{'
        const body = [];
        while (tokens.length > 0 && !(peek().type === 'punctuation' && peek().value === '}')) {
            const stmt = parseStatement();
            if (stmt) body.push(stmt);
            else consume();
        }
        if (peek() && peek().type === 'punctuation' && peek().value === '}') consume();
        return { type: 'BlockStatement', body };
    }

    function parseStatement() {
        if (tokens.length === 0) return null;
        const t = peek();
        if (t.type === 'keyword') {
            // var decl
            if (t.value === 'ye') {
                consume(); // ye
                const idTok = consume();
                const name = idTok ? idTok.value : null;
                let value = null;
                if (peek() && peek().type === 'operator' && peek().value === '=') {
                    consume(); // =
                    value = parseExpression(0);
                }
                if (peek() && peek().type === 'punctuation' && peek().value === ';') consume();
                return { type: 'VariableDeclaration', name, value };
            }
            // print
            if (t.value === 'bol') {
                consume();
                const expr = parseExpression(0);
                if (peek() && peek().type === 'punctuation' && peek().value === ';') consume();
                return { type: 'PrintStatement', expression: expr };
            }
            // if with support for 'nahitoh' (else-if) chains and 'warna' (else)
            if (t.value === 'agar') {
                consume();
                const test = parseExpression(0);
                const consequent = parseBlock();

                // collect any else-if (nahitoh) chains
                const chain = [];
                while (peek() && peek().type === 'keyword' && peek().value === 'nahitoh') {
                    consume();
                    const ntest = parseExpression(0);
                    const nconsequent = parseBlock();
                    chain.push({ test: ntest, consequent: nconsequent });
                }

                // optional else
                let alternate = null;
                if (peek() && peek().type === 'keyword' && peek().value === 'warna') {
                    consume();
                    alternate = parseBlock();
                }

                // build nested IfStatements for the nahitoh chain, attaching the final alternate
                for (let i = chain.length - 1; i >= 0; i--) {
                    const item = chain[i];
                    alternate = { type: 'IfStatement', test: item.test, consequent: item.consequent, alternate };
                }

                return { type: 'IfStatement', test, consequent, alternate };
            }
            // while / loop
            if (t.value === 'lagataar') {
                consume();
                const test = parseExpression(0);
                const body = parseBlock();
                return { type: 'WhileStatement', test, body };
            }
            // for-like loop (jabtak) - basic form: jabtak <test> { ... }
            if (t.value === 'jabtak') {
                // full for-syntax: jabtak ( init ; test ; update ) { ... }
                consume();
                let init = null, test = null, update = null;
                if (peek() && peek().type === 'punctuation' && peek().value === '(') {
                    consume(); // (
                    // init: either a declaration (ye ...) or an expression
                    if (peek() && peek().type === 'keyword' && peek().value === 'ye') {
                        consume(); // ye
                        const idTok = consume();
                        const name = idTok ? idTok.value : null;
                        let val = null;
                        if (peek() && peek().type === 'operator' && peek().value === '=') { consume(); val = parseExpression(0); }
                        init = { type: 'VariableDeclaration', name, value: val };
                    } else if (!(peek() && peek().type === 'punctuation' && peek().value === ';')) {
                        init = parseExpression(0);
                    }
                    // consume semicolon
                    if (peek() && peek().type === 'punctuation' && peek().value === ';') consume();

                    // test
                    if (!(peek() && peek().type === 'punctuation' && peek().value === ';')) {
                        test = parseExpression(0);
                    }
                    if (peek() && peek().type === 'punctuation' && peek().value === ';') consume();

                    // update
                    if (!(peek() && peek().type === 'punctuation' && peek().value === ')')) {
                        update = parseExpression(0);
                    }
                    if (peek() && peek().type === 'punctuation' && peek().value === ')') consume();
                }
                const body = parseBlock();
                return { type: 'ForStatement', init, test, update, body };
            }
            // return
            if (t.value === 'wapas') {
                consume();
                const arg = parseExpression(0);
                if (peek() && peek().type === 'punctuation' && peek().value === ';') consume();
                return { type: 'ReturnStatement', argument: arg };
            }
            // break
            if (t.value === 'ruk') {
                consume();
                if (peek() && peek().type === 'punctuation' && peek().value === ';') consume();
                return { type: 'BreakStatement' };
            }
            // continue
            if (t.value === 'chhod') {
                consume();
                if (peek() && peek().type === 'punctuation' && peek().value === ';') consume();
                return { type: 'ContinueStatement' };
            }
        }
        // block
        if (t.type === 'punctuation' && t.value === '{') {
            return parseBlock();
        }
        // skip semicolons
        if (t.type === 'punctuation' && t.value === ';') {
            consume();
            return null;
        }
        // otherwise, expression statement
        const expr = parseExpression(0);
        if (peek() && peek().type === 'punctuation' && peek().value === ';') consume();
        return expr ? { type: 'ExpressionStatement', expression: expr } : null;
    }

    // top level
    while (tokens.length > 0) {
        const stmt = parseStatement();
        if (stmt) ast.body.push(stmt);
    }
    return ast;
}

// Code Generator: Converts AST into JavaScript code
function generator(node) {
    function gen(n) {
        if (!n) return '';
        switch (n.type) {
            case 'Program':
                return n.body.map(gen).join('\n');
            case 'VariableDeclaration':
                return `let ${n.name} = ${gen(n.value)};`;
            case 'PrintStatement':
                return `console.log(${gen(n.expression)});`;
            case 'IfStatement':
                return `if (${gen(n.test)}) ${gen(n.consequent)}${n.alternate ? ' else ' + gen(n.alternate) : ''}`;
            case 'WhileStatement':
                return `while (${gen(n.test)}) ${gen(n.body)}`;
            case 'ForStatement':
                return `for (${n.init ? (n.init.type === 'VariableDeclaration' ? ('let ' + n.init.name + ' = ' + (gen(n.init.value) || '')) : gen(n.init).replace(/;$/, '')) : ''}; ${n.test ? gen(n.test) : ''}; ${n.update ? gen(n.update).replace(/;$/, '') : ''}) ${gen(n.body)}`;
            case 'ReturnStatement':
                return `return ${gen(n.argument)};`;
            case 'BreakStatement':
                return 'break;';
            case 'ContinueStatement':
                return 'continue;';
            case 'BlockStatement':
                return '{\n' + n.body.map(s => gen(s)).join('\n') + '\n}';
            case 'ExpressionStatement':
                return gen(n.expression) + ';';
            case 'BinaryExpression':
                return `${gen(n.left)} ${n.operator} ${gen(n.right)}`;
            case 'Literal':
                return JSON.stringify(n.value);
            case 'Identifier':
                return n.name;
            default:
                return '';
        }
    }
    return gen(node);
}
// Compiler: Combines lexer, parser, and generator
function compiler(input) {
    const tokens = lexer(input);
    const ast = parser(tokens);
    const output = generator(ast);
    return output;
}
// Runner: executes compiled code (returns compiled JS string)
function runner(code) {
    const compiledCode = compiler(code);
    try {
        eval(compiledCode);
    } catch (e) {
        console.error('Runtime error during runner execution:', e);
        throw e;
    }
    return compiledCode;
}

// CLI: accept a source file (e.g. .shar) as first argument; otherwise run the embedded example
if (require.main === module) {
        const arg = process.argv[2];
        if (arg) {
                const path = arg;
                if (!fs.existsSync(path)) {
                        console.error('File not found:', path);
                        process.exit(2);
                }
                const content = fs.readFileSync(path, 'utf8');
                const compiled = compiler(content);
                console.log('--- compiled JS ---');
                console.log(compiled);
                console.log('--- execution output ---');
                try { eval(compiled); } catch (e) { console.error('Runtime error:', e); }
        } else {
                const compiled = compiler(code);
                console.log('--- compiled JS ---');
                console.log(compiled);
                console.log('--- execution output ---');
                try { eval(compiled); } catch (e) { console.error('Runtime error:', e); }
        }
}