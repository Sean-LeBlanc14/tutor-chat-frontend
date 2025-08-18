// ultra-minimal: only add readable section spacing
export class responseFormatter {
    static formatResponse(text, question = '') {
        if (!text || text.trim().length < 50) return text;

        // 1) normalize very lightly
        let out = this.normalize(text);

        // 2) fix spacing around bold headers and colons (no content changes)
        out = this.fixSpacing(out);

        // 3) add blank lines around obvious section starts
        out = this.addSectionSeparators(out);

        return out;
    }

    // keep it gentle: don't collapse paragraphs, don't touch words
    static normalize(text) {
        return String(text)
            .replace(/\r\n?/g, '\n')            // normalize newlines
            .replace(/[ \t]+\n/g, '\n')         // trim trailing spaces at line end
            .replace(/\n[ \t]+/g, '\n')         // trim leading spaces at line start
            .replace(/ (?=[.,;!?])/g, '')       // remove space before punctuation
            .replace(/:([^\s])/g, ': $1')       // ensure a space after colon
            .replace(/\n{3,}/g, '\n\n')         // collapse 3+ blank lines
            .trim();
    }

    // minimal, targeted spacing fixes (no rewriting of words)
    static fixSpacing(text) {
        let t = text;

        // 1) Bold headers at start of a line → ensure blank line before
        t = t.replace(
            /(^|\n)([^\n\S]*)(\*\*[^\n*]{3,}\*\*:?\s*)(?!\S)/g,
            (m, leadNL, indent, hdr) => {
                const before = leadNL ? '\n' : '';
                return `${before}${indent}\n${indent}${hdr}`;
            }
        );

        // 2) Ensure newline after a header-like bold line
        t = t.replace(
            /(^|\n)([^\n\S]*)(\*\*[^\n*]{3,}\*\*:?\s*)(?!\S)(?!\n)/g,
            `$1$2$3\n`
        );

        // 3) If a colon is immediately followed by a list start or bold header, put a newline
        t = t.replace(/:([ \t]*)(?=(\d+\.\s|\*\*[^\n*]{3,}\*\*))/g, ':\n');

        // 4) Collapse any extra blank lines
        t = t.replace(/\n{3,}/g, '\n\n').trim();

        return t;
    }

    static addSectionSeparators(text) {
        const lines = text.split('\n');
        const out = [];

        // patterns that look like section headers
        const isHeaderLine = (line) =>
            /^#{1,6}\s+/.test(line) ||                           // Markdown headers
            /^\*\*[^*]{3,}\*\*:?$/.test(line.trim()) ||          // **Header** or **Header:**
            /^[A-Z][A-Za-z0-9 ,/&()-]{3,}:\s*$/.test(line.trim()); // "Cognitive Effects:" style

        // list starts
        const isNumbered = (line) => /^\d+\.\s+/.test(line.trim());
        const isBulleted = (line) => /^[-*•]\s+/.test(line.trim());

        for (let i = 0; i < lines.length; i++) {
            const prev = out.length ? out[out.length - 1] : '';
            const line = lines[i];

            const header = isHeaderLine(line);
            const listStart = isNumbered(line) || isBulleted(line);

            // ensure a blank line BEFORE headers or list starts
            if ((header || listStart) && prev !== '' && out[out.length - 1] !== '') {
                out.push('');
            }

            out.push(line);

            // ensure a blank line AFTER a header line (if next line is content)
            const next = lines[i + 1] ?? '';
            if (header && next !== '' && !isHeaderLine(next)) {
                out.push('');
            }
        }

        // also ensure list groups are visually separated
        return out
            .join('\n')
            // keep numbered items contiguous but avoid jam with other blocks
            .replace(/(\n\d+\.\s[^\n]+)(?=\n\d+\.\s)/g, '$1')
            // keep bullets contiguous
            .replace(/(\n[-*•]\s[^\n]+)(?=\n[-*•]\s)/g, '$1')
            .replace(/\n{3,}/g, '\n\n') // final tidy
            .trim();
    }
}
