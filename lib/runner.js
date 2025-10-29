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

    const runStart = Date.now();
    console.log('[shar] runFile start:', filePath);
    // first parse AST so we can resolve imports before generating final output
    const tLexStart = Date.now();
    const tokensMain = lexer(content);
    const tLexEnd = Date.now();
    console.log(`[shar] lexed main in ${tLexEnd - tLexStart}ms, tokens: ${tokensMain.length}`);
    const tParseStart = Date.now();
    const astMain = parser(tokensMain);
    const tParseEnd = Date.now();
    console.log(`[shar] parsed main in ${tParseEnd - tParseStart}ms`);

    // find imports
    const imports = (astMain.body || []).filter(n => n && n.type === 'ImportDeclaration');
    const moduleWrappers = [];
    const importAssignments = [];
    const moduleCache = Object.create(null);
    let moduleIndex = 0;
    for (const imp of imports) {
        let src = imp.source;
        if (!src) continue;
        // resolve path relative to the importing file
        let resolved = path.isAbsolute(src) ? src : path.resolve(path.dirname(filePath), src);
        if (!fs.existsSync(resolved)) {
            // try add .shar
            if (fs.existsSync(resolved + '.shar')) resolved = resolved + '.shar';
        }
        if (!fs.existsSync(resolved)) {
            console.warn('Imported file not found:', src);
            continue;
        }
        const modContent = fs.readFileSync(resolved, 'utf8');
        let astMod, outMod;
        if (moduleCache[resolved]) {
            ({ ast: astMod, output: outMod } = moduleCache[resolved]);
            console.log('[shar] using cached module:', resolved);
        } else {
            const tModStart = Date.now();
            ({ ast: astMod, output: outMod } = compiler(modContent));
            const tModEnd = Date.now();
            console.log(`[shar] compiled module ${path.basename(resolved)} in ${tModEnd - tModStart}ms`);
            moduleCache[resolved] = { ast: astMod, output: outMod };
        }
        const modVar = `__shar_mod_${moduleIndex++}`;
        // wrap module so its exports are captured in __shar_exports
        const wrapper = `const ${modVar} = (function(){ var __shar_exports = {};\n${outMod}\n return __shar_exports; })();\n`;
        moduleWrappers.push(wrapper);

        // create assignments for named imports
        if (imp.specifiers && Array.isArray(imp.specifiers)) {
            for (const name of imp.specifiers) {
                importAssignments.push(`const ${name} = ${modVar}["${name}"];`);
            }
        }
    }

    // remove import declarations from AST so generator won't emit them
    const filteredBody = (astMain.body || []).filter(n => !(n && n.type === 'ImportDeclaration'));
    const ast = { type: 'Program', body: filteredBody };
    const output = generator(ast);

    // Build a small helper for fetch calls. Read optional config from shar.config.json
    let sharConfig = {};
    try {
        const cfgPath = path.join(process.cwd(), 'shar.config.json');
        if (fs.existsSync(cfgPath)) {
            sharConfig = JSON.parse(fs.readFileSync(cfgPath, 'utf8')) || {};
        }
    } catch (e) {
        // ignore parse errors
        sharConfig = {};
    }
    const baseUrl = process.env.SHAR_BASE_URL || sharConfig.baseUrl || '';
    const defaultHeaders = process.env.SHAR_DEFAULT_HEADERS ? (() => { try { return JSON.parse(process.env.SHAR_DEFAULT_HEADERS); } catch(e){ return null; } })() : (sharConfig.defaultHeaders || null);

    const helperCode = `const __shar_fetch = (url, opts) => {
const base = ${JSON.stringify(baseUrl)};
const defHeaders = ${JSON.stringify(defaultHeaders || null)};
const finalUrl = (typeof url === 'string' && base && !/^https?:\/\//.test(url)) ? (base.replace(/\/$/, '') + '/' + url.replace(/^\//, '')) : url;
const options = Object.assign({}, opts || {});
if (defHeaders) {
    options.headers = Object.assign({}, defHeaders, options.headers || {});
}
return fetch(finalUrl, options).then(r => r.json());
};\n\n`;

    // assemble final output: helper + module wrappers + import assignments + main output
    const finalOutput = helperCode + moduleWrappers.join('\n') + '\n' + importAssignments.join('\n') + '\n' + output;

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
        console.log(finalOutput);
        console.log('--- AST ---');
        console.log(JSON.stringify(ast, null, 2));
        if (hadTypeErrors) {
            console.log('Skipping execution due to type errors.');
        } else {
            console.log('--- execution output ---');
            try { eval(finalOutput); } catch (e) { console.error('Runtime error:', e); }
        }
    } else {
        // print AST and compiled code (including helper)
        console.log('--- AST ---');
        console.log(JSON.stringify(ast, null, 2));
        console.log('--- compiled JS ---');
        console.log(finalOutput);
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

    // Build helper for runString too (same behavior as runFile)
    let sharConfig = {};
    try {
        const cfgPath = path.join(process.cwd(), 'shar.config.json');
        if (fs.existsSync(cfgPath)) {
            sharConfig = JSON.parse(fs.readFileSync(cfgPath, 'utf8')) || {};
        }
    } catch (e) {
        sharConfig = {};
    }
    const baseUrl = process.env.SHAR_BASE_URL || sharConfig.baseUrl || '';
    const defaultHeaders = process.env.SHAR_DEFAULT_HEADERS ? (() => { try { return JSON.parse(process.env.SHAR_DEFAULT_HEADERS); } catch(e){ return null; } })() : (sharConfig.defaultHeaders || null);

    const helperCode = `const __shar_fetch = (url, opts) => {
const base = ${JSON.stringify(baseUrl)};
const defHeaders = ${JSON.stringify(defaultHeaders || null)};
const finalUrl = (typeof url === 'string' && base && !/^https?:\/\//.test(url)) ? (base.replace(/\/$/, '') + '/' + url.replace(/^\//, '')) : url;
const options = Object.assign({}, opts || {});
if (defHeaders) {
    options.headers = Object.assign({}, defHeaders, options.headers || {});
}
return fetch(finalUrl, options).then(r => r.json());
};\n\n`;

    const finalOutput = helperCode + output;

    if (!options.compileOnly) {
        console.log('--- compiled JS ---');
        console.log(finalOutput);
        console.log('--- AST ---');
        console.log(JSON.stringify(ast, null, 2));
        console.log('--- execution output ---');
        try { eval(finalOutput); } catch (e) { console.error('Runtime error:', e); }
    } else {
        console.log('--- AST ---');
        console.log(JSON.stringify(ast, null, 2));
        console.log('--- compiled JS ---');
        console.log(finalOutput);
    }
}

module.exports = { runFile, runString };
