import { pipeline, env } from '@huggingface/transformers';

// Optional: Force models to save locally in the backend folder instead of global cache
env.localModelPath = './.cache';
env.allowRemoteModels = true;

async function download() {
    try {
        console.log('Downloading Xenova/multilingual-e5-small...');
        await pipeline('feature-extraction', 'Xenova/multilingual-e5-small');
        console.log('Embedding model downloaded successfully!');
    } catch (error) {
        console.error('Download failed with error:', error);
    }
}
download();