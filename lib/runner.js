const fs = require('fs');
const path = require('path');
const { lexer } = require('./lexer');
const { parser } = require('./parser');
const { generator } = require('./generator');
const { parseTypes, validate } = require('./types');

function runFile(filePath, options = {}) {
    const content = fs.readFileSync(filePath, 'utf8');
    // inline small compiler pipeline to avoid a separate file
    function compiler(input) {
        const tokens = lexer(input);
        const ast = parser(tokens);
        const output = generator(ast);
        return { ast, output };
    }
    const { ast, output } = compiler(content);

    // Load sibling .shari types file if exists
    const typesPath = filePath.replace(/\.[^.]+$/, '') + '.shari';
    if (fs.existsSync(typesPath)) {
        const typesText = fs.readFileSync(typesPath, 'utf8');
        const typesSpec = parseTypes(typesText);
        const result = validate(ast, typesSpec);
        // backward-compatible: allow validate to return array
        const warnings = Array.isArray(result) ? result : (result.warnings || []);
        const errors = Array.isArray(result) ? [] : (result.errors || []);
        warnings.forEach(w => console.warn('Type warning:', w));
        if (errors.length) {
            errors.forEach(e => console.error('Type error:', e));
            // Do not execute on type errors, but still show AST/compiled output so user can inspect
            // We'll set a flag and handle execution below
            var hadTypeErrors = true;
        }
    }

    if (!options.compileOnly) {
        console.log('--- compiled JS ---');
        console.log(output);
        console.log('--- AST ---');
        console.log(JSON.stringify(ast, null, 2));
        if (hadTypeErrors) {
            console.log('Skipping execution due to type errors.');
        } else {
            console.log('--- execution output ---');
            try { eval(output); } catch (e) { console.error('Runtime error:', e); }
        }
    } else {
        // print AST and compiled code
        console.log('--- AST ---');
        console.log(JSON.stringify(ast, null, 2));
        console.log('--- compiled JS ---');
        console.log(output);
    }
}

function runString(source, options = {}) {
    function compiler(input) {
        const tokens = lexer(input);
        const ast = parser(tokens);
        const output = generator(ast);
        return { ast, output };
    }
    const { ast, output } = compiler(source);
    if (!options.compileOnly) {
        console.log('--- compiled JS ---');
        console.log(output);
        console.log('--- AST ---');
        console.log(JSON.stringify(ast, null, 2));
        console.log('--- execution output ---');
        try { eval(output); } catch (e) { console.error('Runtime error:', e); }
    } else {
        console.log('--- AST ---');
        console.log(JSON.stringify(ast, null, 2));
        console.log('--- compiled JS ---');
        console.log(output);
    }
}

module.exports = { runFile, runString };
