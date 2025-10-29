// Minimal CLI wrapper that delegates to the modular runner in ./lib
const fs = require('fs');
const { runFile, runString } = require('./lib/runner');

// Small embedded example used when no file is provided
const example = `
aasynk karya getTodo() {
  ye url = "https://jsonplaceholder.typicode.com/todos/1";
  ye data = pratiksha lao(url);
  bol data.title;
}

getTodo();
`;

if (require.main === module) {
    const args = process.argv.slice(2);
    const compileOnly = args.includes('--compile-only');
    const fileArg = args.find(a => !a.startsWith('--'));

    if (fileArg) {
        if (!fs.existsSync(fileArg)) {
            console.error('File not found:', fileArg);
            process.exit(2);
        }
        runFile(fileArg, { compileOnly });
    } else {
        runString(example, { compileOnly });
    }
}

module.exports = { runFile, runString };