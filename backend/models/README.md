# Neural embedding model cache

The production embedding engine runs **Xenova/multilingual-e5-small** (the ONNX
int8 build of `intfloat/multilingual-e5-small`; XLM-RoBERTa, 12 layers,
**384 dimensions**, MIT license) fully in-process via
[`@huggingface/transformers`](https://www.npmjs.com/package/@huggingface/transformers)
with `allowRemoteModels=false` — no network calls at runtime.

## Files (git-ignored; fetched locally)

```
models/hf-cache/Xenova/multilingual-e5-small/
├── onnx/
│   ├── model_quantized.onnx   # ~118 MB int8 weights
│   └── model.onnx             # symlink → model_quantized.onnx
├── tokenizer.json             # ~17 MB Unigram tokenizer (250k vocab)
├── tokenizer_config.json
├── special_tokens_map.json
└── config.json
```

The weight/tokenizer binaries are **excluded from git** (too large). Fetch
them into this exact layout with:

```bash
cd backend
node scripts/fetchEmbeddingModel.js
```

The script tries the Hugging Face CDN first, then a GitHub codeload mirror for
restricted networks, and reconstructs the split-chunk files automatically.

If the weights are missing or inference fails, `EmbeddingService` falls back to
the deterministic embedding engine and logs a clear warning — the application
still boots and every semantic operation continues to work.
