export const chunkText = (text, maxWords = 10, overlap = 0) => {
    const paragraphs = text.split(/\n\s*\n/);

    const chunks = [];
    let currentChunk = "";

    for (const paragraph of paragraphs) {

        const words = paragraph.trim().split(/\s+/);

        // If paragraph itself is bigger than maxWords
        if (words.length > maxWords) {

            // Save current chunk first
            if (currentChunk) {
                chunks.push(currentChunk);
                currentChunk = "";
            }

            // Split large paragraph into word chunks
            for (let i = 0; i < words.length; i += maxWords - overlap) {
                chunks.push(
                    words.slice(i, i + maxWords).join(" ")
                );
            }

            continue;
        }

        // If adding paragraph would exceed maxWords
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