// Types loader and validator for .shari files
// Supported .shari syntax (simple):
// varName: type
// funcName(param1:type,param2:type): returnType
// types may be 'number', 'string', 'boolean', 'any' or unions like 'number|string'

function parseTypes(text) {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l && !l.startsWith('#'));
    const types = { vars: {}, funcs: {} };
    for (const line of lines) {
        // function signature
        const funcMatch = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([^)]*)\)\s*:\s*(.+)$/);
        if (funcMatch) {
            const name = funcMatch[1];
            const paramsPart = funcMatch[2].trim();
            const returnType = funcMatch[3].trim();
            const params = {};
            if (paramsPart) {
                for (const p of paramsPart.split(',')) {
                    const [pname, ptype] = p.split(':').map(s => s && s.trim());
                    if (pname) params[pname] = ptype || 'any';
                }
            }
            types.funcs[name] = { params, returns: returnType };
            continue;
        }

        // variable declaration
        const varMatch = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*(.+)$/);
        if (varMatch) {
            const name = varMatch[1];
            const t = varMatch[2].trim();
            types.vars[name] = t;
        }
    }
    return types;
}

// Helpers
function splitUnion(typeStr) {
    return (typeStr || '').split('|').map(s => s.trim()).filter(Boolean);
}

function typeAllows(expectedTypeStr, actualType) {
    if (!expectedTypeStr) return true;
    if (expectedTypeStr === 'any') return true;
    const parts = splitUnion(expectedTypeStr);
    return parts.includes(actualType) || parts.includes('any');
}

// infer simple expression types
function inferType(node, env) {
    if (!node) return 'any';
    switch (node.type) {
        case 'Literal': {
            const v = node.value;
            const t = typeof v;
            if (t === 'number') return 'number';
            if (t === 'string') return 'string';
            if (t === 'boolean') return 'boolean';
            return 'any';
        }
        case 'Identifier': {
            return env[node.name] || 'any';
        }
        case 'BinaryExpression': {
            const op = node.operator;
            const l = inferType(node.left, env);
            const r = inferType(node.right, env);
            if (op === '+' ) {
                if (l === 'string' || r === 'string') return 'string';
                if (l === 'number' && r === 'number') return 'number';
                return 'any';
            }
            if (['-', '*', '/', '%'].includes(op)) {
                if (l === 'number' && r === 'number') return 'number';
                return 'any';
            }
            if (['==', '!=', '>', '<', '>=', '<='].includes(op)) return 'boolean';
            if (['&&', '||'].includes(op)) return 'boolean';
            return 'any';
        }
        default:
            return 'any';
    }
}

function collectReturns(node, env) {
    const returns = [];
    function walk(n) {
        if (!n) return;
        switch (n.type) {
            case 'ReturnStatement':
                returns.push(n); break;
            case 'BlockStatement':
                n.body.forEach(walk); break;
            case 'IfStatement':
                walk(n.consequent); if (n.alternate) walk(n.alternate); break;
            default:
                if (n.body) walk(n.body);
                if (n.expression) walk(n.expression);
                if (n.test) walk(n.test);
                if (n.left) walk(n.left);
                if (n.right) walk(n.right);
                break;
        }
    }
    walk(node);
    return returns;
}

function validate(ast, typesSpec) {
    const warnings = [];
    const errors = [];

    // global environment: name -> type
    const globalEnv = Object.assign({}, typesSpec.vars || {});

    function checkProgram(p) {
        for (const stmt of p.body) checkStmt(stmt, globalEnv, null);
    }

    function checkStmt(node, env, currentFuncSpec) {
        if (!node) return;
        switch (node.type) {
            case 'VariableDeclaration': {
                if (!node.name) return;
                if (env[node.name] && env._declaredLocally && env._declaredLocally.has(node.name)) {
                    errors.push(`Redeclaration of variable ${node.name}`);
                }
                const declaredType = (typesSpec.vars && typesSpec.vars[node.name]) || null;
                const inferred = inferType(node.value, env);
                if (declaredType) {
                    if (!typeAllows(declaredType, inferred)) {
                        errors.push(`Type error: variable '${node.name}' declared as '${declaredType}' but assigned '${inferred}'`);
                    }
                    env[node.name] = declaredType;
                } else {
                    env[node.name] = inferred || 'any';
                }
                // track local declared names if env is local
                if (!env._declaredLocally) env._declaredLocally = new Set();
                env._declaredLocally.add(node.name);
                break;
            }
            case 'FunctionDeclaration': {
                const name = node.name;
                const spec = (typesSpec.funcs && typesSpec.funcs[name]) || null;
                // check params count
                if (spec) {
                    const specParams = Object.keys(spec.params || {});
                    if (specParams.length !== (node.params || []).length) {
                        errors.push(`Function '${name}' parameter count mismatch: expected ${specParams.length} but got ${(node.params || []).length}`);
                    }
                }
                // prepare local env for function
                const localEnv = Object.create(globalEnv);
                localEnv._declaredLocally = new Set();
                (node.params || []).forEach((p, idx) => {
                    const pname = p;
                    const ptype = spec && spec.params && spec.params[pname] ? spec.params[pname] : 'any';
                    localEnv[pname] = ptype;
                    localEnv._declaredLocally.add(pname);
                });

                // check body
                if (node.body) checkStmt(node.body, localEnv, spec);

                // check returns vs spec
                if (spec && spec.returns && spec.returns !== 'void') {
                    const returns = collectReturns(node.body, localEnv);
                    if (returns.length === 0) {
                        errors.push(`Function '${name}' must return '${spec.returns}' but no return found`);
                    } else {
                        for (const r of returns) {
                            const rt = inferType(r.argument, localEnv);
                            if (!typeAllows(spec.returns, rt)) {
                                errors.push(`Function '${name}' return type mismatch: expected '${spec.returns}' but returned '${rt}'`);
                            }
                        }
                    }
                }
                break;
            }
            case 'BlockStatement':
                // new scope
                const childEnv = Object.create(env);
                childEnv._declaredLocally = new Set();
                for (const s of node.body) checkStmt(s, childEnv, currentFuncSpec);
                break;
            case 'IfStatement':
                // test should be boolean-ish
                const t = inferType(node.test, env);
                // allow non-boolean but warn
                if (t !== 'boolean' && t !== 'any') warnings.push(`Condition expression evaluated to '${t}', expected 'boolean'`);
                checkStmt(node.consequent, Object.create(env), currentFuncSpec);
                if (node.alternate) checkStmt(node.alternate, Object.create(env), currentFuncSpec);
                break;
            case 'WhileStatement':
                {
                    const tt = inferType(node.test, env);
                    if (tt !== 'boolean' && tt !== 'any') warnings.push(`While condition is '${tt}', expected 'boolean'`);
                    checkStmt(node.body, Object.create(env), currentFuncSpec);
                }
                break;
            case 'ForStatement':
                if (node.init) checkStmt(node.init, Object.create(env), currentFuncSpec);
                if (node.test) { const t2 = inferType(node.test, env); if (t2 !== 'boolean' && t2 !== 'any') warnings.push(`For loop test is '${t2}', expected 'boolean'`); }
                if (node.body) checkStmt(node.body, Object.create(env), currentFuncSpec);
                break;
            case 'ReturnStatement':
                if (!currentFuncSpec) {
                    warnings.push('Return used outside of function');
                }
                break;
            case 'ExpressionStatement':
                // check binary ops inside
                checkExpression(node.expression, env, errors, warnings);
                break;
            case 'PrintStatement':
                checkExpression(node.expression, env, errors, warnings);
                break;
            default:
                // for other nodes, attempt to check child expressions
                if (node.test) checkExpression(node.test, env, errors, warnings);
                if (node.expression) checkExpression(node.expression, env, errors, warnings);
                if (node.left) checkExpression(node.left, env, errors, warnings);
                if (node.right) checkExpression(node.right, env, errors, warnings);
                break;
        }
    }

    function checkExpression(expr, envLocal, errors, warnings) {
        if (!expr) return;
        switch (expr.type) {
            case 'BinaryExpression': {
                const l = inferType(expr.left, envLocal);
                const r = inferType(expr.right, envLocal);
                const op = expr.operator;
                if (['+', '-', '*', '/', '%'].includes(op)) {
                    if (l !== 'number' || r !== 'number') {
                        // allow string concat for +
                        if (op === '+' && (l === 'string' || r === 'string')) {
                            // ok
                        } else if (l !== 'any' && r !== 'any') {
                            errors.push(`Operator '${op}' applied to incompatible types: '${l}' and '${r}'`);
                        }
                    }
                }
                if (['==', '!=', '>', '<', '>=', '<='].includes(op)) {
                    // comparisons are ok between most primitives; no-op
                }
                // recursively check subexpressions
                checkExpression(expr.left, envLocal, errors, warnings);
                checkExpression(expr.right, envLocal, errors, warnings);
                break;
            }
            case 'Identifier': {
                if (!envLocal[expr.name]) warnings.push(`Use of undeclared identifier '${expr.name}' (assumed any)`);
                break;
            }
            case 'Literal':
                break;
            default:
                break;
        }
    }

    // start
    if (ast && ast.type === 'Program') checkProgram(ast);

    return { warnings, errors };
}

module.exports = { parseTypes, validate };
