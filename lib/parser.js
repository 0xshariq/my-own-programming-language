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
        if (t.type === 'number') { consume(); return { type: 'Literal', value: t.value }; }
        if (t.type === 'string') { consume(); return { type: 'Literal', value: t.value }; }
        if (t.type === 'identifier') {
            // identifier or call expression
            const idTok = consume();
            let node = { type: 'Identifier', name: idTok.value };
            // support call expressions: identifier ( args )
            while (peek() && peek().type === 'punctuation' && peek().value === '(') {
                consume(); // (
                const args = [];
                while (peek() && !(peek().type === 'punctuation' && peek().value === ')')) {
                    const arg = parseExpression(0);
                    if (arg) args.push(arg);
                    if (peek() && peek().type === 'punctuation' && peek().value === ',') consume();
                }
                if (peek() && peek().type === 'punctuation' && peek().value === ')') consume();
                node = { type: 'CallExpression', callee: node, arguments: args };
            }
            return node;
        }
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
