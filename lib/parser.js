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
        // await (pratiksha) unary
        if (t.type === 'keyword' && t.value === 'pratiksha') {
            consume();
            const arg = parseExpression(6); // high precedence for unary
            return { type: 'AwaitExpression', argument: arg };
        }
        // async arrow prefix: 'aasynk ( ... ) => ...' will be handled below
        if (t.type === 'keyword' && t.value === 'aasynk') {
            // could be async function declaration (handled in parseStatement) or async arrow expression
            // handle async arrow here: 'aasynk (params) => ...'
            // Peek ahead: if next is '(' treat as async arrow
            if (tokens[1] && tokens[1].type === 'punctuation' && tokens[1].value === '(') {
                consume(); // consume aasynk
                // parse arrow function params and body
                const params = parseParams().map(p => p.name);
                if (peek() && peek().type === 'operator' && peek().value === '=>') {
                    consume(); // =>
                    let body = null;
                    if (peek() && peek().type === 'punctuation' && peek().value === '{') body = parseBlock();
                    else body = parseExpression(0);
                    return { type: 'ArrowFunctionExpression', params, body, async: true };
                }
                // fallthrough if not arrow
            }
        }
        if (t.type === 'number') { consume(); return { type: 'Literal', value: t.value }; }
        if (t.type === 'string') { consume(); return { type: 'Literal', value: t.value }; }
        // 'lao' and 'mangao' fetch helpers: lao/mangao <expr>  or lao/mangao(<args>)
        if (t.type === 'keyword' && (t.value === 'lao' || t.value === 'mangao')) {
            consume();
            const args = [];
            if (peek() && peek().type === 'punctuation' && peek().value === '(') {
                consume();
                while (peek() && !(peek().type === 'punctuation' && peek().value === ')')) {
                    const a = parseExpression(0);
                    if (a) args.push(a);
                    if (peek() && peek().type === 'punctuation' && peek().value === ',') consume();
                }
                if (peek() && peek().type === 'punctuation' && peek().value === ')') consume();
            } else {
                const a = parseExpression(0);
                if (a) args.push(a);
            }
            return { type: 'CallExpression', callee: { type: 'Identifier', name: 'fetch' }, arguments: args };
        }
        if (t.type === 'identifier') {
            // identifier or call/member expression
            const idTok = consume();
            let node = { type: 'Identifier', name: idTok.value };
            // support call expressions: identifier ( args ) and member access: .prop
            while (peek()) {
                const p = peek();
                if (p.type === 'punctuation' && p.value === '(') {
                    consume(); // (
                    const args = [];
                    while (peek() && !(peek().type === 'punctuation' && peek().value === ')')) {
                        const arg = parseExpression(0);
                        if (arg) args.push(arg);
                        if (peek() && peek().type === 'punctuation' && peek().value === ',') consume();
                    }
                    if (peek() && peek().type === 'punctuation' && peek().value === ')') consume();
                    node = { type: 'CallExpression', callee: node, arguments: args };
                    continue;
                }
                if (p.type === 'punctuation' && p.value === '.') {
                    consume(); // .
                    if (peek() && peek().type === 'identifier') {
                        const prop = consume();
                        node = { type: 'MemberExpression', object: node, property: { type: 'Identifier', name: prop.value } };
                        continue;
                    } else {
                        // unexpected token after dot; break
                        break;
                    }
                }
                break;
            }
            return node;
        }
        // Parenthesized expression
        if (t.type === 'punctuation' && t.value === '(') {
            // detect arrow function: (a,b) => ...
            // look ahead to see if this is simple identifier list followed by =>
            function isArrowAhead() {
                let depth = 0;
                for (let i = 0; i < tokens.length; i++) {
                    const tk = tokens[i];
                    if (i === 0 && tk.type === 'punctuation' && tk.value === '(') depth = 1;
                    else if (depth > 0) {
                        if (tk.type === 'punctuation' && tk.value === '(') depth++;
                        else if (tk.type === 'punctuation' && tk.value === ')') {
                            depth--;
                            if (depth === 0) {
                                const next = tokens[i+1];
                                return next && next.type === 'operator' && next.value === '=>';
                            }
                        }
                    }
                    if (i > 20) break; // avoid long scans
                }
                return false;
            }

            if (isArrowAhead()) {
                // parse params
                const params = parseParams().map(p => p.name);
                if (peek() && peek().type === 'operator' && peek().value === '=>') {
                    consume(); // =>
                    let body = null;
                    if (peek() && peek().type === 'punctuation' && peek().value === '{') body = parseBlock();
                    else body = parseExpression(0);
                    return { type: 'ArrowFunctionExpression', params, body, async: false };
                }
            }

            // otherwise, parenthesized expression
            consume();
            const expr = parseExpression(0);
            if (peek() && peek().type === 'punctuation' && peek().value === ')') consume();
            return expr;
        }
        return null;
    }

    function parseBlock() {
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

    function parseParams() {
        const params = [];
        if (!peek() || peek().type !== 'punctuation' || peek().value !== '(') return params;
        consume(); // (
        while (peek() && !(peek().type === 'punctuation' && peek().value === ')')) {
            if (peek().type === 'identifier') {
                params.push({ name: consume().value });
                if (peek() && peek().type === 'punctuation' && peek().value === ',') consume();
            } else {
                // skip unexpected
                consume();
            }
        }
        if (peek() && peek().type === 'punctuation' && peek().value === ')') consume();
        return params;
    }

    function parseStatement() {
        if (tokens.length === 0) return null;
        const t = peek();
        if (t.type === 'keyword') {
            // import
            if (t.value === 'aayaat') {
                consume();
                // two forms: aayaat "./mod.shar";  OR  aayaat { a, b } se "./mod.shar";
                if (peek() && peek().type === 'string') {
                    const src = consume().value;
                    if (peek() && peek().type === 'punctuation' && peek().value === ';') consume();
                    return { type: 'ImportDeclaration', specifiers: null, source: src };
                }
                if (peek() && peek().type === 'punctuation' && peek().value === '{') {
                    consume();
                    const names = [];
                    while (peek() && !(peek().type === 'punctuation' && peek().value === '}')) {
                        if (peek().type === 'identifier') names.push(consume().value);
                        if (peek() && peek().type === 'punctuation' && peek().value === ',') consume();
                        else break;
                    }
                    if (peek() && peek().type === 'punctuation' && peek().value === '}') consume();
                    // expect 'se' keyword
                    if (peek() && peek().type === 'keyword' && peek().value === 'se') consume();
                    const src = (peek() && peek().type === 'string') ? consume().value : null;
                    if (peek() && peek().type === 'punctuation' && peek().value === ';') consume();
                    return { type: 'ImportDeclaration', specifiers: names, source: src };
                }
            }

            // export
            if (t.value === 'niryaat') {
                consume();
                // forms: niryaat ye x = ...;   niryaat karya f() { }   niryaat name;
                if (peek() && peek().type === 'keyword' && (peek().value === 'ye' || peek().value === 'sthayi')) {
                    const decl = parseStatement();
                    return { type: 'ExportNamedDeclaration', declaration: decl };
                }
                if (peek() && peek().type === 'keyword' && peek().value === 'karya') {
                    // parse function declaration and wrap
                    const decl = parseStatement();
                    return { type: 'ExportNamedDeclaration', declaration: decl };
                }
                // export an existing identifier: niryaat name;
                if (peek() && peek().type === 'identifier') {
                    const name = consume().value;
                    if (peek() && peek().type === 'punctuation' && peek().value === ';') consume();
                    return { type: 'ExportNamedDeclaration', specifiers: [name], declaration: null };
                }
            }
            if (t.value === 'ye' || t.value === 'sthayi') {
                const kind = t.value === 'sthayi' ? 'const' : 'let';
                consume(); // ye or sthayi
                const idTok = consume();
                const name = idTok ? idTok.value : null;
                let value = null;
                if (peek() && peek().type === 'operator' && peek().value === '=') {
                    consume(); // =
                    value = parseExpression(0);
                }
                if (peek() && peek().type === 'punctuation' && peek().value === ';') consume();
                return { type: 'VariableDeclaration', name, value, kind };
            }
            if (t.value === 'bol') {
                consume();
                const expr = parseExpression(0);
                if (peek() && peek().type === 'punctuation' && peek().value === ';') consume();
                return { type: 'PrintStatement', expression: expr };
            }
            if (t.value === 'agar') {
                consume();
                const test = parseExpression(0);
                const consequent = parseBlock();
                const chain = [];
                while (peek() && peek().type === 'keyword' && peek().value === 'nahitoh') {
                    consume();
                    const ntest = parseExpression(0);
                    const nconsequent = parseBlock();
                    chain.push({ test: ntest, consequent: nconsequent });
                }
                let alternate = null;
                if (peek() && peek().type === 'keyword' && peek().value === 'warna') {
                    consume();
                    alternate = parseBlock();
                }
                for (let i = chain.length - 1; i >= 0; i--) {
                    const item = chain[i];
                    alternate = { type: 'IfStatement', test: item.test, consequent: item.consequent, alternate };
                }
                return { type: 'IfStatement', test, consequent, alternate };
            }
            if (t.value === 'lagataar') {
                consume();
                const test = parseExpression(0);
                const body = parseBlock();
                return { type: 'WhileStatement', test, body };
            }
            if (t.value === 'jabtak') {
                consume();
                let init = null, test = null, update = null;
                if (peek() && peek().type === 'punctuation' && peek().value === '(') {
                    consume();
                    if (peek() && peek().type === 'keyword' && peek().value === 'ye') {
                        consume();
                        const idTok = consume();
                        const name = idTok ? idTok.value : null;
                        let val = null;
                        if (peek() && peek().type === 'operator' && peek().value === '=') { consume(); val = parseExpression(0); }
                        init = { type: 'VariableDeclaration', name, value: val };
                    } else if (!(peek() && peek().type === 'punctuation' && peek().value === ';')) {
                        init = parseExpression(0);
                    }
                    if (peek() && peek().type === 'punctuation' && peek().value === ';') consume();
                    if (!(peek() && peek().type === 'punctuation' && peek().value === ';')) {
                        test = parseExpression(0);
                    }
                    if (peek() && peek().type === 'punctuation' && peek().value === ';') consume();
                    if (!(peek() && peek().type === 'punctuation' && peek().value === ')')) {
                        update = parseExpression(0);
                    }
                    if (peek() && peek().type === 'punctuation' && peek().value === ')') consume();
                }
                const body = parseBlock();
                return { type: 'ForStatement', init, test, update, body };
            }
            if (t.value === 'wapas') {
                consume();
                const arg = parseExpression(0);
                if (peek() && peek().type === 'punctuation' && peek().value === ';') consume();
                return { type: 'ReturnStatement', argument: arg };
            }
            if (t.value === 'ruk') {
                consume();
                if (peek() && peek().type === 'punctuation' && peek().value === ';') consume();
                return { type: 'BreakStatement' };
            }
            if (t.value === 'chhod') {
                consume();
                if (peek() && peek().type === 'punctuation' && peek().value === ';') consume();
                return { type: 'ContinueStatement' };
            }
            if (t.value === 'karya') {
                // function declaration: karya name (params) { body }
                consume();
                const nameTok = consume();
                const name = nameTok ? nameTok.value : null;
                const params = parseParams().map(p => p.name);
                const bodyNode = parseBlock();
                return { type: 'FunctionDeclaration', name, params, body: bodyNode };
            }
            // async function declaration: aasynk karya name (...) { }
            if (t.value === 'aasynk') {
                consume();
                if (peek() && peek().type === 'keyword' && peek().value === 'karya') {
                    consume();
                    const nameTok = consume();
                    const name = nameTok ? nameTok.value : null;
                    const params = parseParams().map(p => p.name);
                    const bodyNode = parseBlock();
                    return { type: 'FunctionDeclaration', name, params, body: bodyNode, async: true };
                }
                // otherwise, could be an async arrow expression — handled in parsePrimary
            }
        }
        if (t.type === 'punctuation' && t.value === '{') {
            return parseBlock();
        }
        if (t.type === 'punctuation' && t.value === ';') { consume(); return null; }
        const expr = parseExpression(0);
        if (peek() && peek().type === 'punctuation' && peek().value === ';') consume();
        return expr ? { type: 'ExpressionStatement', expression: expr } : null;
    }

    while (tokens.length > 0) {
        const stmt = parseStatement();
        if (stmt) ast.body.push(stmt);
    }
    return ast;
}

module.exports = { parser };
