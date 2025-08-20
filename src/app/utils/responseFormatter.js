// ultra-minimal: unwrap SSE "data:" lines safely + add readable section spacing
export class responseFormatter {
    static formatResponse(text, question = '') {
        if (!text || text.trim().length < 50) return text;

        // 0) unwrap any SSE "data:" lines safely (no word truncation)
        let out = this.stripSSEWrappers(text);

        // 1) normalize very lightly
        out = this.normalize(out);

        // 2) fix spacing around bold headers and colons (no content changes)
        out = this.fixSpacing(out);

        // 3) add blank lines around obvious section starts
        out = this.addSectionSeparators(out);

        return out;
    }

    // --- NEW: safely strip SSE wrappers like "data: ...", preserving content ---
    static stripSSEWrappers(text) {
        const lines = String(text).split(/\r?\n/);
        const out = [];

        for (let line of lines) {
            if (line.startsWith('data:')) {
                // Skip done signal lines entirely
                if (line.trim() === 'data: [DONE]') continue;

                // Remove the "data:" prefix (exactly), then decide what to do with the next char
                let rest = line.slice(5); // after 'data:'

                // If the next char is a single space:
                // - remove that space only if the following char is NOT a letter (avoids "Improved" → "proved")
                if (rest.startsWith(' ')) {
                    const next = rest.length > 1 ? rest[1] : '';
                    if (!/[A-Za-z]/.test(next)) {
                        // remove the single space (e.g., before *, #, digit, punctuation, or another space)
                        rest = rest.slice(1);
                    }
                    // else keep the space to avoid eating the first letter
                }

                out.push(rest);
            } else {
                out.push(line);
            }
        }

        return out.join('\n');
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
        return text
            // ensure a blank line BEFORE any bold header-like marker if jammed to previous token
            .replace(/(\S)\*\*([^*][^*]{0,200}?)\*\*/g, '$1\n\n**$2**')
            // ensure a newline immediately AFTER bold block that looks like a header (optional trailing colon)
            .replace(/\*\*([^*][^*]{2,}?)\*\*:?(\S)/g, '**$1**\n$2')
            // ensure newline after colon if the next char starts a list number or bold header
            .replace(/:([0-9*])/g, ':\n$1')
            // collapse any accidental 3+ newlines
            .replace(/\n{3,}/g, '\n\n')
            .trim();
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

            // ensure a blank line BEFORE headers or list starts (if previous isn't blank)
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
