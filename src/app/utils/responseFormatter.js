export class responseFormatter {

// Main formatting function - very straightforward
static formatResponse(text, question = '') {
    if (!text || text.trim().length < 50) return text;

    // Step 1: Basic cleanup only
    let cleaned = this.basicCleanup(text);
    
    // Step 2: Determine if this needs list formatting
    const needsListFormat = this.shouldFormatAsList(cleaned, question);
    
    // Step 3: Apply minimal formatting
    if (needsListFormat) {
    return this.formatAsList(cleaned, question);
    } else {
    return this.formatAsGeneral(cleaned, question);
    }
}

// Very basic cleanup - only fix obvious issues
static basicCleanup(text) {
    return text
    .replace(/\s+/g, ' ')           // Multiple spaces to single
    .replace(/\n\s*\n\s*\n/g, '\n\n') // Multiple newlines to double
    .trim();
}

// Simple detection for list-worthy content
static shouldFormatAsList(text, question) {
    const questionHasListWords = /(?:effects?|types?|benefits?|ways?|examples?|factors?|characteristics?) of/i.test(question);
    const textHasNumbers = /\d+\.\s+/g.test(text);
    const hasMultiplePoints = (text.match(/\d+\./g) || []).length >= 3;
    
    return questionHasListWords && (textHasNumbers || hasMultiplePoints);
}

// Simple list formatting
static formatAsList(text, question) {
    const header = this.extractSimpleHeader(question);
    let formatted = '';
    
    // Add header if we can extract one
    if (header) {
    formatted += `## ${header}\n\n`;
    }
    
    // Split into paragraphs
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim());
    
    if (paragraphs.length === 0) return text;
    
    // First paragraph as intro (if it doesn't start with a number)
    if (paragraphs[0] && !paragraphs[0].match(/^\d+\./)) {
    formatted += `${paragraphs[0]}\n\n`;
    paragraphs.shift(); // Remove intro from remaining paragraphs
    }
    
    // Format remaining content as list
    if (paragraphs.length > 0) {
    formatted += this.createSimpleList(paragraphs.join('\n\n'));
    }
    
    return formatted;
}

// Simple general formatting - just add a header if appropriate
static formatAsGeneral(text, question) {
    const header = this.extractSimpleHeader(question);
    
    if (header && text.length > 200) {
    return `## ${header}\n\n${text}`;
    }
    
    return text;
}

// Extract simple header from common question patterns
static extractSimpleHeader(question) {
    if (!question) return '';
    
    const patterns = [
    { regex: /effects? of (.+)/i, format: 'Effects of $1' },
    { regex: /what is (.+)/i, format: '$1' },
    { regex: /types? of (.+)/i, format: 'Types of $1' },
    { regex: /benefits? of (.+)/i, format: 'Benefits of $1' },
    { regex: /examples? of (.+)/i, format: 'Examples of $1' },
    ];

    for (const { regex, format } of patterns) {
    const match = question.match(regex);
    if (match) {
        let header = question.replace(regex, format);
        // Clean and capitalize
        header = header.replace(/[?.]/g, '').trim();
        return header.charAt(0).toUpperCase() + header.slice(1);
    }
    }
    
    return '';
}

// Create simple numbered list from text
static createSimpleList(text) {
    // Split by numbered items if they exist
    const numberedItems = text.split(/(?=\d+\.\s+)/).filter(item => item.trim());
    
    if (numberedItems.length >= 2) {
    return numberedItems.map(item => {
        const match = item.match(/^(\d+)\.\s*(.+)/s);
        if (match) {
        const [, number, content] = match;
        const cleanContent = content.trim();
        
        // Make first sentence bold if it ends with colon or is short
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
    
    // Fallback: create simple bullet points from sentences
    const sentences = text.split(/[.!?]\s+/).filter(s => s.trim().length > 20);
    if (sentences.length >= 3) {
    return sentences.map(sentence => `• ${sentence.trim()}`).join('\n');
    }
    
    return text;
}

// Convert simple markdown to HTML for display
static toHtml(text) {
    if (!text) return '';
    
    return text
    // Headers
    .replace(/^## (.+)$/gm, '<h2 class="response-header">$1</h2>')
    
    // Bold text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    
    // Simple bullet points
    .replace(/^• (.+)$/gm, '<div class="bullet-item">• $1</div>')
    
    // Line breaks
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>')
    
    // Wrap in paragraphs
    .replace(/^(.+)$/s, '<p>$1</p>')
    
    // Clean up
    .replace(/<p><h2/g, '<h2')
    .replace(/<\/h2><\/p>/g, '</h2>')
    .replace(/<p><div class="bullet-item">/g, '<div class="bullet-item">')
    .replace(/<\/div><\/p>/g, '</div>');
}
}

// Simple hook for the formatting toggle
export const useSimpleFormatting = (content, question) => {
const [showFormatted, setShowFormatted] = React.useState(false);
const [formattedContent, setFormattedContent] = React.useState('');

React.useEffect(() => {
    if (content && content.length > 100) {
    const formatted = SimpleFormatter.formatResponse(content, question);
    const hasImprovement = formatted !== content && formatted.includes('##');
    
    if (hasImprovement) {
        setFormattedContent(formatted);
        // Auto-format list questions
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