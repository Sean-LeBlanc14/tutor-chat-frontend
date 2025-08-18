export class responseFormatter {
    // Main formatting function
    static formatResponse(text, question = '') {
        if (!text || text.trim().length < 50) return text;

        // Step 1: cleanup (preserve line structure)
        const cleaned = this.basicCleanup(text);

        // Step 2: decide on formatting style
        const needsList = this.shouldFormatAsList(cleaned, question);

        return needsList
        ? this.formatAsList(cleaned, question)
        : this.formatAsGeneral(cleaned, question);
    }

    // --- Safe cleanup (preserves newlines) ---
    static basicCleanup(text) {
        if (!text) return '';
        return String(text)
        .replace(/\r\n?/g, '\n')              // normalize line endings
        .replace(/[ \t]+/g, ' ')              // collapse spaces/tabs (not newlines)
        .replace(/[ \t]+\n/g, '\n')           // trim trailing spaces
        .replace(/\n[ \t]+/g, '\n')           // trim leading spaces
        .replace(/\n{3,}/g, '\n\n')           // collapse 3+ blank lines
        .replace(/ (?=[.,:;!?])/g, '')        // remove space before punctuation
        .replace(/([.!?])([A-Za-z])/g, '$1 $2') // ensure space after sentence
        .trim();
    }

    // --- Decide if we should show a list (safer trigger) ---
    static shouldFormatAsList(text, question) {
        // Strong signal in the question
        const qHasList = /(?:effects?|types?|benefits?|ways?|examples?|factors?|characteristics?) of/i.test(question);

        // Count well-formed numbered lines at line starts: "1. ..." on its own line
        const numberedLines = text.match(/(?:^|\n)\d+\.\s+/g) || [];

        // Count bullet lines at line starts: "-", "*", or "• "
        const bulletLines = text.match(/(?:^|\n)(?:[-*•])\s+/g) || [];

        // Only auto-format when it clearly looks like a list
        const hasWellFormedList = numberedLines.length >= 3 || bulletLines.length >= 3;

        // If the question hints at a list, require *some* structure and paragraph breaks
        const hasSomeListSignals =
        (numberedLines.length + bulletLines.length) >= 2 && /\n{2,}/.test(text);

        return hasWellFormedList || (qHasList && hasSomeListSignals);
    }

    // --- Format text as a list ---
    static formatAsList(text, question) {
        const header = this.extractSimpleHeader(question);
        let out = header ? `## ${header}\n\n` : '';

        // Prefer explicit numbered items at line starts
        const numberedItems = text
        .split(/(?:^|\n)(?=\d+\.\s+)/) // split but keep item tokens by using lookahead
        .map(s => s.trim())
        .filter(Boolean)
        .filter(s => /^\d+\.\s+/.test(s));

        if (numberedItems.length >= 2) {
        out += numberedItems
            .map(s => {
            const m = s.match(/^(\d+)\.\s*(.+)$/s);
            if (!m) return s;
            const [, n, body] = m;

            // If the first clause reads like a short title, bold it
            const sentences = body.trim().split(/[.!?]\s+/);
            if (sentences.length > 1 && (sentences[0].includes(':') || sentences[0].length < 60)) {
                const first = sentences[0].replace(/:$/, '');
                const rest = sentences.slice(1).join('. ');
                return `**${n}. ${first}**\n${rest}`;
            }
            return `**${n}.** ${body.trim()}`;
            })
            .join('\n\n');
        return out;
        }

        // Otherwise, try bullet lines at line starts
        const bulletLines = text
        .split('\n')
        .map(l => l.trim())
        .filter(l => /^[-*•]\s+/.test(l));

        if (bulletLines.length >= 2) {
        out += bulletLines
            .map(l => '• ' + l.replace(/^[-*•]\s+/, '').trim())
            .join('\n');
        return out;
        }

        // If no explicit markers, fall back to sentence bullets when there are several full sentences
        const sentences = text.split(/[.!?]\s+/).filter(s => s.trim().length > 20);
        if (sentences.length >= 3) {
        out += sentences.map(s => `• ${s.trim()}`).join('\n');
        return out;
        }

        // Fallback: just return with header if we made one
        return header ? `${out}${text}` : text;
    }

    // --- Format as general text (paragraph style) ---
    static formatAsGeneral(text, question) {
        const header = this.extractSimpleHeader(question);
        return header && text.length > 200 ? `## ${header}\n\n${text}` : text;
    }

    // --- Header extractor based on question ---
    static extractSimpleHeader(question) {
        if (!question) return '';
        const patterns = [
        { re: /effects? of (.+)/i, t: 'Effects of $1' },
        { re: /what (?:is|are) (.+)/i, t: '$1' },
        { re: /types? of (.+)/i, t: 'Types of $1' },
        { re: /benefits? of (.+)/i, t: 'Benefits of $1' },
        { re: /examples? of (.+)/i, t: 'Examples of $1' },
        ];
        for (const { re, t } of patterns) {
        const m = question.match(re);
        if (m) {
            const hdr = question.replace(re, t).replace(/[?.]/g, '').trim();
            return hdr.charAt(0).toUpperCase() + hdr.slice(1);
        }
        }
        return '';
    }
}
