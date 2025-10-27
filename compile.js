// A simple compiler for a custom programming language with Hindi-like keywords
// This compiler includes a runner function to execute the compiled code directly

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

    function parseExpressionFromTokens() {
        // Collect tokens up to a statement boundary (semicolon or punctuation '{' '}' or keyword)
        const parts = [];
        while (tokens.length > 0 && !(tokens[0].type === 'punctuation' && (tokens[0].value === ';' || tokens[0].value === '{' || tokens[0].value === '}')) && tokens[0].type !== 'keyword') {
            parts.push(tokens.shift());
        }
        // Build a simple expression AST from collected parts
        if (parts.length === 0) return null;
        // Single token
        if (parts.length === 1) {
            const t = parts[0];
            if (t.type === 'number') return { type: 'Literal', value: t.value };
            if (t.type === 'string') return { type: 'Literal', value: t.value };
            if (t.type === 'identifier') return { type: 'Identifier', name: t.value };
        }
        // Very simple binary expression parsing (left op right, left associative)
        let left = null;
        let i = 0;
        function toNode(tok) {
            if (tok.type === 'number') return { type: 'Literal', value: tok.value };
            if (tok.type === 'string') return { type: 'Literal', value: tok.value };
            if (tok.type === 'identifier') return { type: 'Identifier', name: tok.value };
            return null;
        }
        left = toNode(parts[i++]);
        while (i < parts.length) {
            const op = parts[i++];
            const rightTok = parts[i++];
            const right = toNode(rightTok);
            left = { type: 'BinaryExpression', operator: op.value, left, right };
        }
        return left;
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
                    value = parseExpressionFromTokens();
                }
                if (peek() && peek().type === 'punctuation' && peek().value === ';') consume();
                return { type: 'VariableDeclaration', name, value };
            }
            // print
            if (t.value === 'bol') {
                consume();
                const expr = parseExpressionFromTokens();
                if (peek() && peek().type === 'punctuation' && peek().value === ';') consume();
                return { type: 'PrintStatement', expression: expr };
            }
            // if with support for 'nahitoh' (else-if) chains and 'warna' (else)
            if (t.value === 'agar') {
                consume();
                const test = parseExpressionFromTokens();
                const consequent = parseBlock();

                // collect any else-if (nahitoh) chains
                const chain = [];
                while (peek() && peek().type === 'keyword' && peek().value === 'nahitoh') {
                    consume();
                    const ntest = parseExpressionFromTokens();
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
                const test = parseExpressionFromTokens();
                const body = parseBlock();
                return { type: 'WhileStatement', test, body };
            }
            // for-like loop (jabtak) - basic form: jabtak <test> { ... }
            if (t.value === 'jabtak') {
                consume();
                const test = parseExpressionFromTokens();
                const body = parseBlock();
                // represent as ForStatement with null init/update for now
                return { type: 'ForStatement', init: null, test, update: null, body };
            }
            // return
            if (t.value === 'wapas') {
                consume();
                const arg = parseExpressionFromTokens();
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
        const expr = parseExpressionFromTokens();
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
                return `for (${n.init ? gen(n.init).replace(/;$/, '') : ''}; ${gen(n.test)}; ${n.update ? gen(n.update).replace(/;$/, '') : ''}) ${gen(n.body)}`;
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
// Runner: Executes the compiled code
function runner(code) {
    const compiledCode = compiler(code);
    eval(compiledCode);
}

const code = `
ye x = 10;
ye y = 20;

ye sum = x + y;
bol sum;
agar sum > 20 {
    bol "Sum is greater than 20";
} warna {
    bol "Sum is 20 or less";
}
`;

runner(code);