export class responseFormatter {

// Main formatting function - enhanced with OCR correction
static formatResponse(text, question = '') {
    if (!text || text.trim().length < 50) return text;

    // Step 1: OCR correction BEFORE other processing
    let cleaned = this.correctOCRErrors(text);
    
    // Step 2: Basic cleanup
    cleaned = this.basicCleanup(cleaned);
    
    // Step 3: Determine if this needs list formatting
    const needsListFormat = this.shouldFormatAsList(cleaned, question);
    
    // Step 4: Apply minimal formatting
    if (needsListFormat) {
        return this.formatAsList(cleaned, question);
    } else {
        return this.formatAsGeneral(cleaned, question);
    }
}

// NEW: OCR error correction
static correctOCRErrors(text) {
    // Common OCR character substitutions
    const charFixes = {
        // Number/letter confusions
        'l': /(?<!\w)1(?=\w)|(?<=\w)1(?!\w)/g,  // 1 → l in word contexts
        '1': /(?<!\w)l(?=\d)|(?<=\d)l(?=\d)/g,  // l → 1 in number contexts
        'O': /(?<=\d)0(?=\d)|(?<!\w)0(?=\w)/g,  // 0 → O in word contexts
        '0': /(?<!\w)O(?=\d)|(?<=\d)O(?=\d)/g,  // O → 0 in number contexts
        'm': /rn(?=\w)/g,                        // rn → m
        'w': /vv(?=\w)/g,                        // vv → w
        'h': /li(?=\w)/g,                        // li → h
        'n': /ri(?=\w)/g,                        // ri → n
        'cl': /d(?=\w)/g,                        // d → cl (sometimes)
    };

    let corrected = text;
    
    // Apply character fixes cautiously
    for (const [replacement, pattern] of Object.entries(charFixes)) {
        corrected = corrected.replace(pattern, replacement);
    }

    // Fix concatenated words (missing spaces)
    corrected = this.fixConcatenatedWords(corrected);
    
    // Fix truncated words at chunk boundaries
    corrected = this.fixTruncatedWords(corrected);
    
    // Fix bullet point formatting issues
    corrected = this.fixBulletPoints(corrected);
    
    return corrected;
}

// Fix words that got concatenated (missing spaces)
static fixConcatenatedWords(text) {
    // Pattern: lowercase letter followed by uppercase (likely missing space)
    return text.replace(/([a-z])([A-Z][a-z])/g, '$1 $2')
               // Pattern: word ending followed by number (like "understanding1.")
               .replace(/([a-z])(\d+\.)/g, '$1 $2')
               // Pattern: period followed by lowercase letter (missing space after sentence)
               .replace(/(\.)([a-z])/g, '$1 $2')
               // Pattern: asterisk formatting issues
               .replace(/(\*\*)([a-z])/g, '$1 $2');
}

// Fix truncated words (common at chunk boundaries)
static fixTruncatedWords(text) {
    const commonTruncations = {
        // Your example: "proved spatial understanding" → "Improved spatial understanding"  
        'proved': 'Improved',
        'hanced': 'Enhanced',
        'ter': 'Better',
        'ect': 'Object',
        'patial': 'Spatial',
        'owever': 'However',
        'mited': 'Limited',
        'verall': 'Overall',
        'ope': 'Hope',
        // Add more based on patterns you see
    };

    let fixed = text;
    
    // Fix at word boundaries
    for (const [truncated, full] of Object.entries(commonTruncations)) {
        const regex = new RegExp(`\\b${truncated}\\b`, 'gi');
        fixed = fixed.replace(regex, full);
    }
    
    // Fix truncated words at start of sentences (missing first letter)
    fixed = fixed.replace(/\.\s+([a-z])/g, (match, letter) => {
        // Common patterns where first letter is missing
        const patterns = {
            'mproved': 'Improved',
            'nhanced': 'Enhanced',
            'etter': 'Better',
            'bject': 'Object',
        };
        
        for (const [truncated, full] of Object.entries(patterns)) {
            if (letter.toLowerCase() + 'PLACEHOLDER'.slice(0, truncated.length - 1) === truncated.toLowerCase()) {
                return '. ' + full;
            }
        }
        return match;
    });
    
    return fixed;
}

// Fix bullet point and numbering issues
static fixBulletPoints(text) {
    return text
        // Fix numbered lists with missing spaces: "1.Text" → "1. Text"
        .replace(/(\d+)\.([A-Z])/g, '$1. $2')
        // Fix bullet points with missing spaces: "•Text" → "• Text"
        .replace(/•([A-Z])/g, '• $1')
        // Fix asterisk bullets: "*Text" → "• Text"
        .replace(/^\*([A-Z])/gm, '• $1')
        // Fix missing numbers at start of list items
        .replace(/^\s*\.([A-Z])/gm, '1. $1');
}

// Enhanced basic cleanup with OCR awareness
static basicCleanup(text) {
    return text
        .replace(/\s+/g, ' ')           // Multiple spaces to single
        .replace(/\n\s*\n\s*\n/g, '\n\n') // Multiple newlines to double
        // Fix common OCR spacing issues around punctuation
        .replace(/\s+([.,:;!?])/g, '$1')  // Remove space before punctuation
        .replace(/([.!?])([A-Z])/g, '$1 $2') // Add space after sentence ending
        .trim();
}

// Rest of your existing methods remain the same...
static shouldFormatAsList(text, question) {
    const questionHasListWords = /(?:effects?|types?|benefits?|ways?|examples?|factors?|characteristics?) of/i.test(question);
    const textHasNumbers = /\d+\.\s+/g.test(text);
    const hasMultiplePoints = (text.match(/\d+\./g) || []).length >= 3;
    
    return questionHasListWords && (textHasNumbers || hasMultiplePoints);
}

static formatAsList(text, question) {
    const header = this.extractSimpleHeader(question);
    let formatted = '';
    
    if (header) {
        formatted += `## ${header}\n\n`;
    }
    
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim());
    
    if (paragraphs.length === 0) return text;
    
    if (paragraphs[0] && !paragraphs[0].match(/^\d+\./)) {
        formatted += `${paragraphs[0]}\n\n`;
        paragraphs.shift();
    }
    
    if (paragraphs.length > 0) {
        formatted += this.createSimpleList(paragraphs.join('\n\n'));
    }
    
    return formatted;
}

static formatAsGeneral(text, question) {
    const header = this.extractSimpleHeader(question);
    
    if (header && text.length > 200) {
        return `## ${header}\n\n${text}`;
    }
    
    return text;
}

static extractSimpleHeader(question) {
    if (!question) return '';
    
    const patterns = [
        { regex: /effects? of (.+)/i, format: 'Effects of $1' },
        { regex: /what (?:is|are) (.+)/i, format: '$1' },
        { regex: /types? of (.+)/i, format: 'Types of $1' },
        { regex: /benefits? of (.+)/i, format: 'Benefits of $1' },
        { regex: /examples? of (.+)/i, format: 'Examples of $1' },
    ];

    for (const { regex, format } of patterns) {
        const match = question.match(regex);
        if (match) {
            let header = question.replace(regex, format);
            header = header.replace(/[?.]/g, '').trim();
            return header.charAt(0).toUpperCase() + header.slice(1);
        }
    }
    
    return '';
}

static createSimpleList(text) {
    const numberedItems = text.split(/(?=\d+\.\s+)/).filter(item => item.trim());
    
    if (numberedItems.length >= 2) {
        return numberedItems.map(item => {
            const match = item.match(/^(\d+)\.\s*(.+)/s);
            if (match) {
                const [, number, content] = match;
                const cleanContent = content.trim();
                
                const sentences = cleanContent.split(/[.!?]\s+/);
                if (sentences.length > 1 && (sentences[0].includes(':') || sentences[0].length < 60)) {
                    const firstSentence = sentences[0].replace(/:$/, '');
                    const restContent = sentences.slice(1).join('. ');
                    return `**${number}. ${firstSentence}**\n${restContent}`;
                } else {
                    return `**${number}.** ${cleanContent}`;
                }
            }
            return item;
        }).join('\n\n');
    }
    
    const sentences = text.split(/[.!?]\s+/).filter(s => s.trim().length > 20);
    if (sentences.length >= 3) {
        return sentences.map(sentence => `• ${sentence.trim()}`).join('\n');
    }
    
    return text;
}

static toHtml(text) {
    if (!text) return '';
    
    return text
        .replace(/^## (.+)$/gm, '<h2 class="response-header">$1</h2>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/^• (.+)$/gm, '<div class="bullet-item">• $1</div>')
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>')
        .replace(/^(.+)$/s, '<p>$1</p>')
        .replace(/<p><h2/g, '<h2')
        .replace(/<\/h2><\/p>/g, '</h2>')
        .replace(/<p><div class="bullet-item">/g, '<div class="bullet-item">')
        .replace(/<\/div><\/p>/g, '</div>');
}
}

// Your existing hook remains the same
export const useSimpleFormatting = (content, question) => {
    const [showFormatted, setShowFormatted] = React.useState(false);
    const [formattedContent, setFormattedContent] = React.useState('');

    React.useEffect(() => {
        if (content && content.length > 100) {
            const formatted = responseFormatter.formatResponse(content, question);
            const hasImprovement = formatted !== content && formatted.includes('##');
            
            if (hasImprovement) {
                setFormattedContent(formatted);
                if (/effects?|types?|benefits?|examples?/i.test(question)) {
                    setShowFormatted(true);
                }
            }
        }
    }, [content, question]);

    const canFormat = formattedContent && formattedContent !== content;

    return {
        canFormat,
        showFormatted,
        setShowFormatted,
        displayContent: showFormatted ? formattedContent : content,
        isFormatted: showFormatted
    };
};