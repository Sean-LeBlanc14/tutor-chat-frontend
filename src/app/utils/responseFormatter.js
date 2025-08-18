// ultra-minimal: only add readable section spacing (no word changes)
export class responseFormatter {
    static formatResponse(text, question = '') {
        if (!text || text.trim().length < 50) return text;

        let out = this.normalize(text);
        out = this.fixSpacing(out);
        out = this.addSectionSeparators(out);

        return out;
    }

    // Light normalization that preserves content
    static normalize(text) {
        return String(text)
            .replace(/\r\n?/g, '\n')         // normalize newlines
            .replace(/[ \t]+\n/g, '\n')      // trim trailing spaces before newline
            .replace(/\n[ \t]+/g, '\n')      // trim leading spaces after newline
            .replace(/ (?=[.,;!?])/g, '')    // remove space before punctuation
            .replace(/:([^\s])/g, ': $1')    // ensure a space after colon
            .replace(/\n{3,}/g, '\n\n')      // collapse 3+ blank lines
            .trim();
    }

    // Targeted spacing fixes around headers, lists, and references
    static fixSpacing(text) {
        let t = text;

        // 1) Ensure a blank line before header-like bold blocks that are glued to prior text
        //    ...foo.**Effects on X:**  ->  ...foo.\n\n**Effects on X:**
        t = t.replace(
            /([.!?])(\s*)(\*\*[A-Z][^*\n]{2,}\*\*:?(?:\s|$))/g,
            (_m, end, _sp, hdr) => `${end}\n\n${hdr}`
        );

        // 2) If a bold header immediately follows a letter with no punctuation, separate it
        //    ...word**Effects on X:**  ->  ...word\n\n**Effects on X:**
        t = t.replace(
            /([a-zA-Z])(\*\*[A-Z][^*\n]{2,}\*\*:?(?:\s|$))/g,
            '$1\n\n$2'
        );

        // 3) Ensure a newline AFTER a header-like bold block when content follows on same line
        //    **Effects on X:**Text -> **Effects on X:**\nText
        t = t.replace(
            /(\*\*[A-Z][^*\n]{2,}\*\*:?)([^\n])/g,
            '$1\n$2'
        );

        // 4) Ensure numbered list items start on their own line if glued to previous text
        //    ...sentence 1. Item -> ...sentence\n1. Item
        //    (limit to 1–2 digits to avoid years; require a capital after the space)
        t = t.replace(
            /([^\n])(\d{1,2}\.\s+[A-Z])/g,
            '$1\n$2'
        );

        // 5) Ensure a blank line before well-known section labels ending with colon
        //    e.g., Cognitive Effects: / Neural Basis: / Practical Applications: / References:
        t = t.replace(
            /([^\n])(\s*)(?=(Cognitive|Perceptual|Behavioral|Neural|Practical|Real[- ]?World|Applications|Implications|Limitations|References):)/gi,
            '$1\n\n'
        );

        // 6) Put "References:" on its own line with spacing around it
        t = t.replace(
            /(?:^|\n)\s*References:\s*/gi,
            '\n\nReferences:\n\n'
        );

        // 7) If a colon is immediately followed by a list start or a header, break line
        //    “...: 1. ...” or “...: **Header**”
        t = t.replace(
            /:(\s*)(?=(\d{1,2}\.\s+[A-Z]|\*\*[A-Z][^*\n]{2,}\*\*))/g,
            ':\n'
        );

        // 8) Final tidy for excessive blank lines
        t = t.replace(/\n{3,}/g, '\n\n').trim();

        return t;
    }

    static addSectionSeparators(text) {
        const lines = text.split('\n');
        const out = [];

        const isHeaderLine = (line) =>
            /^#{1,6}\s+/.test(line) ||
            /^\*\*[A-Z][^*]{2,}\*\*:?$/.test(line.trim()) ||
            /^[A-Z][A-Za-z0-9 ,/&()-]{3,}:\s*$/.test(line.trim());

        const isNumbered = (line) => /^\d+\.\s+/.test(line.trim());
        const isBulleted = (line) => /^[-*•]\s+/.test(line.trim());

        for (let i = 0; i < lines.length; i++) {
            const prev = out.length ? out[out.length - 1] : '';
            const line = lines[i];

            const header = isHeaderLine(line);
            const listStart = isNumbered(line) || isBulleted(line);

            // blank line BEFORE headers or list starts (if previous isn't blank)
            if ((header || listStart) && prev !== '' && out[out.length - 1] !== '') {
                out.push('');
            }

            out.push(line);

            // blank line AFTER headers (if next line is not another header)
            const next = lines[i + 1] ?? '';
            if (header && next !== '' && !isHeaderLine(next)) {
                out.push('');
            }
        }

        return out
            .join('\n')
            // keep numbered items contiguous within a block
            .replace(/(\n\d+\.\s[^\n]+)(?=\n\d+\.\s)/g, '$1')
            // keep bullets contiguous within a block
            .replace(/(\n[-*•]\s[^\n]+)(?=\n[-*•]\s)/g, '$1')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
    }
}