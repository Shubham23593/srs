/**
 * Abstract VectorStore Interface
 */
class VectorStore {
  async addDocuments(projectId, documents) {
    throw new Error("addDocuments must be implemented");
  }

  async similaritySearch(projectId, queryEmbedding, topK = 5, filter = {}) {
    throw new Error("similaritySearch must be implemented");
  }

  async deleteProjectVectors(projectId) {
    throw new Error("deleteProjectVectors must be implemented");
  }
}

module.exports = VectorStore;
