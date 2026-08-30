const VectorStore = require('./VectorStore');
const DocumentChunk = require('../models/DocumentChunk');
const EmbeddingMetadata = require('../models/EmbeddingMetadata');
const embeddingService = require('./EmbeddingService');

class MongoDBVectorStore extends VectorStore {
  async addDocuments(projectId, documents) {
    if (!documents || documents.length === 0) return [];
    try {
      const insertedChunks = [];
      for (const doc of documents) {
        const embedding = doc.embedding || await embeddingService.generateEmbedding(doc.content);
        const chunk = new DocumentChunk({
          projectId,
          sourceType: doc.sourceType || 'PROJECT_INFO',
          sourceId: doc.sourceId || '',
          content: doc.content,
          metadata: doc.metadata || {},
          embedding
        });
        await chunk.save();
        insertedChunks.push(chunk);
      }

      if (typeof EmbeddingMetadata.findOneAndUpdate === 'function') {
        await EmbeddingMetadata.findOneAndUpdate(
          { projectId },
          { $inc: { totalChunks: insertedChunks.length }, lastIndexedAt: new Date() },
          { upsert: true, new: true }
        );
      }
      return insertedChunks;
    } catch (e) {
      console.warn('[VectorStore] addDocuments best-effort skipped:', e.message);
      return [];
    }
  }

  async similaritySearch(projectId, queryEmbedding, topK = 5, filter = {}) {
    try {
      const query = { projectId };
      if (filter.sourceType) query.sourceType = filter.sourceType;

      const q = DocumentChunk.find(query);
      const chunks = typeof q.lean === 'function' ? await q.lean() : await q;
      if (!chunks || chunks.length === 0) return [];

      const scored = chunks.map((chunk) => ({
        chunkId: chunk._id,
        sourceType: chunk.sourceType,
        sourceId: chunk.sourceId,
        content: chunk.content,
        metadata: chunk.metadata,
        score: embeddingService.cosineSimilarity(queryEmbedding, chunk.embedding)
      }));

      scored.sort((a, b) => b.score - a.score);
      return scored.slice(0, topK);
    } catch (e) {
      return [];
    }
  }

  async deleteProjectVectors(projectId) {
    try {
      await DocumentChunk.deleteMany({ projectId });
      if (typeof EmbeddingMetadata.deleteOne === 'function') {
        await EmbeddingMetadata.deleteOne({ projectId });
      }
    } catch (e) { /* best-effort */ }
  }
}

module.exports = new MongoDBVectorStore();
