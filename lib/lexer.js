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
            // normalize common aliases (English/hinglish) to the canonical Hindi keywords used in parser
            const mapping = {
                'let': 'ye', 'const': 'sthayi', 'print': 'bol', 'if': 'agar', 'else': 'warna', 'elif': 'nahitoh', 'elseif': 'nahitoh',
                'while': 'lagataar', 'for': 'jabtak', 'break': 'ruk', 'continue': 'chhod', 'return': 'wapas',
                'function': 'karya', 'async': 'aasynk', 'await': 'pratiksha',
                'import': 'aayaat', 'from': 'se', 'export': 'niryaat',
                // fetch helpers (keep 'fetch' as a normal identifier so native fetch calls still parse)
                'lao': 'lao', 'mangao': 'mangao', 'fetchit': 'lao'
            };
            const canonical = mapping[word] || word;
            const keywords = new Set(['ye','bol','agar','nahitoh','warna','lagataar','jabtak','ruk','chhod','wapas','karya','sthayi','aasynk','pratiksha','lao','mangao','aayaat','niryaat','se']);
            if (keywords.has(canonical)) {
                tokens.push({ type: 'keyword', value: canonical });
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
            // Handle two-character operators: >=, <=, ==, !=, => (arrow)
            if ((char === '>' || char === '<' || char === '=' || char === '!') && next === '=') {
                op += next;
                current += 2;
            } else {
                current++;
            }
            tokens.push({ type: 'operator', value: op });
            continue;
        }

        // Punctuation (include dot for member access)
        if (/[\(\)\{\}\;\,\.]/.test(char)) {
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

        // Unknown
        tokens.push({ type: 'unknown', value: char });
        current++;
    }

    return tokens;
}

module.exports = { lexer };
