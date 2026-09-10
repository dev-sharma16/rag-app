export const chunkText = (text, maxWords = 50) => {
    const paragraphs = text.split(/\n\s*\n/);

    const chunks = [];
    let currentChunk = "";

    for (const paragraph of paragraphs) {
        const words = paragraph.trim().split(/\s+/);

        if (
            currentChunk &&
            currentChunk.split(/\s+/).length + words.length > maxWords
        ) {
            chunks.push(currentChunk);
            currentChunk = "";
        }

        currentChunk += (currentChunk ? " " : "") + paragraph.trim();
    }

    if (currentChunk) {
        chunks.push(currentChunk);
    }

    return chunks;
};