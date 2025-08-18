export class responseFormatter {
    static formatResponse(text, question = '') {
        if (!text || text.trim().length < 50) return text;
        let cleaned = this.basicCleanup(text);            // SAFE ONLY
        const needsList = this.shouldFormatAsList(cleaned, question);
        return needsList ? this.formatAsList(cleaned, question)
                        : this.formatAsGeneral(cleaned, question);
    }

    // SAFE cleanup only
    static basicCleanup(text) {
        return text
        .replace(/\s+/g, ' ')
        .replace(/\n\s*\n\s*\n/g, '\n\n')
        .replace(/\s+([.,:;!?])/g, '$1')
        .replace(/([.!?])([A-Z])/g, '$1 $2')
        .trim();
    }

    static shouldFormatAsList(text, question) {
        const qHasList = /(?:effects?|types?|benefits?|ways?|examples?|factors?|characteristics?) of/i.test(question);
        const hasNumbers = /\d+\.\s+/.test(text);
        const manyPoints = (text.match(/\d+\./g) || []).length >= 3;
        return qHasList && (hasNumbers || manyPoints);
    }

    static formatAsList(text, question) {
        const header = this.extractSimpleHeader(question);
        let out = header ? `## ${header}\n\n` : '';
        const paras = text.split(/\n\s*\n/).filter(Boolean);
        if (!paras.length) return text;
        if (paras[0] && !/^\d+\./.test(paras[0])) {
        out += `${paras[0]}\n\n`; paras.shift();
        }
        out += this.createSimpleList(paras.join('\n\n'));
        return out;
    }

    static formatAsGeneral(text, question) {
        const header = this.extractSimpleHeader(question);
        return header && text.length > 200 ? `## ${header}\n\n${text}` : text;
    }

    static extractSimpleHeader(question) {
        if (!question) return '';
        const patterns = [
        { re:/effects? of (.+)/i, t:'Effects of $1' },
        { re:/what (?:is|are) (.+)/i, t:'$1' },
        { re:/types? of (.+)/i, t:'Types of $1' },
        { re:/benefits? of (.+)/i, t:'Benefits of $1' },
        { re:/examples? of (.+)/i, t:'Examples of $1' },
        ];
        for (const {re,t} of patterns) {
        const m = question.match(re);
        if (m) {
            const hdr = question.replace(re, t).replace(/[?.]/g,'').trim();
            return hdr.charAt(0).toUpperCase() + hdr.slice(1);
        }
        }
        return '';
    }

    static createSimpleList(text) {
        const items = text.split(/(?=\d+\.\s+)/).filter(Boolean);
        if (items.length >= 2) {
        return items.map(s => {
            const m = s.match(/^(\d+)\.\s*(.+)/s);
            if (!m) return s;
            const [, n, body] = m;
            const content = body.trim();
            const sentences = content.split(/[.!?]\s+/);
            if (sentences.length > 1 && (sentences[0].includes(':') || sentences[0].length < 60)) {
            const first = sentences[0].replace(/:$/, '');
            const rest = sentences.slice(1).join('. ');
            return `**${n}. ${first}**\n${rest}`;
            }
            return `**${n}.** ${content}`;
        }).join('\n\n');
        }
        const sentences = text.split(/[.!?]\s+/).filter(s => s.trim().length > 20);
        return sentences.length >= 3 ? sentences.map(s => `• ${s.trim()}`).join('\n') : text;
    }
}
