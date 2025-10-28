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
            case 'FunctionDeclaration':
                return `function ${n.name}(${(n.params || []).join(',')}) ${gen(n.body)}`;
            default:
                return '';
        }
    }
    return gen(node);
}

module.exports = { generator };
