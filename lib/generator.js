// Code Generator: Converts AST into JavaScript code
function generator(node) {
    function gen(n) {
        if (!n) return '';
        switch (n.type) {
            case 'Program':
                return n.body.map(gen).join('\n');
            case 'VariableDeclaration':
                const declKind = n.kind === 'const' ? 'const' : 'let';
                return `${declKind} ${n.name} = ${gen(n.value)};`;
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
            case 'AwaitExpression':
                return `await ${gen(n.argument)}`;
            case 'ArrowFunctionExpression':
                const params = (n.params || []).join(',');
                if (n.body && n.body.type === 'BlockStatement') {
                    return `${n.async ? 'async ' : ''}(${params}) => ${gen(n.body)}`;
                }
                return `${n.async ? 'async ' : ''}(${params}) => ${gen(n.body)}`;
            case 'Literal':
                return JSON.stringify(n.value);
            case 'Identifier':
                return n.name;
            case 'CallExpression':
                // Special-case fetch wrapper: calls to the `fetch` helper (produced by `lao`/`mangao`)
                // are emitted as calls to a generated helper `__shar_fetch(...)`. The runner will
                // prepend the helper implementation which can apply a base URL and default headers.
                if (n.callee && n.callee.type === 'Identifier' && n.callee.name === 'fetch') {
                    return `__shar_fetch(${(n.arguments || []).map(a => gen(a)).join(',')})`;
                }
                return `${gen(n.callee)}(${(n.arguments || []).map(a => gen(a)).join(',')})`;
            case 'FunctionDeclaration':
                return `${n.async ? 'async ' : ''}function ${n.name}(${(n.params || []).join(',')}) ${gen(n.body)}`;
            case 'ExportNamedDeclaration': {
                // export a declaration or existing identifier
                if (n.declaration) {
                    const decl = gen(n.declaration);
                    // determine exported names
                    if (n.declaration.type === 'FunctionDeclaration') {
                        const nm = n.declaration.name;
                        return decl + `\n__shar_exports = __shar_exports || {}; __shar_exports["${nm}"] = ${nm};`;
                    }
                    if (n.declaration.type === 'VariableDeclaration') {
                        const nm = n.declaration.name;
                        return decl + `\n__shar_exports = __shar_exports || {}; __shar_exports["${nm}"] = ${nm};`;
                    }
                    return decl;
                }
                if (n.specifiers && n.specifiers.length) {
                    return n.specifiers.map(s => `__shar_exports = __shar_exports || {}; __shar_exports["${s}"] = ${s};`).join('\n');
                }
                return '';
            }
            default:
                return '';
        }
    }
    return gen(node);
}

module.exports = { generator };
