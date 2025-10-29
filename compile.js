// Minimal CLI wrapper that delegates to the modular runner in ./lib
const fs = require('fs');
const path = require('path');
const { runFile, runString } = require('./lib/runner');

// Small embedded example used when no file is provided
const example = `
karya add(a, b) {
  wapas a + b;
}
  bol add(5, 7);
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
        // only allow .shar and .shari files
        const ext = path.extname(fileArg).toLowerCase();
        if (ext !== '.shar' && ext !== '.shari') {
            console.error('Unsupported file type. Only .shar and .shari are allowed.');
            process.exit(3);
        }
        runFile(fileArg, { compileOnly });
    } else {
        runString(example, { compileOnly });
    }
}

module.exports = { runFile, runString };