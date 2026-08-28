const VectorStore = require('./VectorStore');
const DocumentChunk = require('../models/DocumentChunk');
const EmbeddingMetadata = require('../models/EmbeddingMetadata');
const embeddingService = require('./EmbeddingService');

class MongoDBVectorStore extends VectorStore {
  async addDocuments(projectId, documents) {
    if (!documents || documents.length === 0) return [];

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

    await EmbeddingMetadata.findOneAndUpdate(
      { projectId },
      {
        $inc: { totalChunks: insertedChunks.length },
        lastIndexedAt: new Date()
      },
      { upsert: true, new: true }
    );

    return insertedChunks;
  }

  async similaritySearch(projectId, queryEmbedding, topK = 5, filter = {}) {
    const query = { projectId };
    if (filter.sourceType) {
      query.sourceType = filter.sourceType;
    }

    const chunks = await DocumentChunk.find(query).lean();
    if (!chunks || chunks.length === 0) return [];

    const scored = chunks.map(chunk => {
      const score = embeddingService.cosineSimilarity(queryEmbedding, chunk.embedding);
      return {
        chunkId: chunk._id,
        sourceType: chunk.sourceType,
        sourceId: chunk.sourceId,
        content: chunk.content,
        metadata: chunk.metadata,
        score
      };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK);
  }

  async deleteProjectVectors(projectId) {
    await DocumentChunk.deleteMany({ projectId });
    await EmbeddingMetadata.deleteOne({ projectId });
  }
}

module.exports = new MongoDBVectorStore();
