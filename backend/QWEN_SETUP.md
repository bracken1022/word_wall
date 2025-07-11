# Qwen3:1.7b Local AI Setup

This application uses **only** Qwen3:1.7b as the local LLM. All external AI APIs (OpenAI, DeepSeek) have been removed for complete local operation.

## Prerequisites

1. **Install Ollama**: Download from https://ollama.ai/
2. **Pull Qwen Model**: Run the command below to download the model

## Setup Instructions

### 1. Install Qwen3:1.7b Model

```bash
ollama pull qwen3:1.7b
```

### 2. Verify Installation

```bash
ollama list
```

You should see `qwen3:1.7b` in the list.

### 3. Test the Model

```bash
ollama run qwen3:1.7b "Hello, how are you?"
```

### 4. Start Ollama Service (if not auto-started)

```bash
ollama serve
```

The service will run on `http://localhost:11434` by default.

## Configuration

The application is configured to use:
- **Model**: `qwen3:1.7b`
- **Endpoint**: `http://localhost:11434`
- **Temperature**: 0.1 (for consistent responses)
- **Max Tokens**: 500

## Features

Qwen3:1.7b provides:
- ✅ **Chinese Language Support**: Native Chinese understanding
- ✅ **English Vocabulary Analysis**: Detailed word explanations  
- ✅ **100% Local Processing**: No external API calls, completely offline
- ✅ **No API Keys Required**: Zero configuration for external services
- ✅ **Fast Response**: Optimized 1.5B parameter model
- ✅ **Structured Output**: Markdown formatted responses
- ✅ **Privacy Focused**: All data stays on your machine

## Troubleshooting

### Model Not Found
```bash
# Pull the model again
ollama pull qwen3:1.7b
```

### Connection Issues
```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# Restart Ollama if needed
ollama serve
```

### Alternative Models
If you prefer a different size:
```bash
# Smaller Qwen3 model (faster)
ollama pull qwen3:1.5b

# Larger Qwen3 model (better quality)
ollama pull qwen3:3b

# Legacy Qwen 2.5 models
ollama pull qwen2.5:1.5b
ollama pull qwen2.5:3b
```

Then update the model name in `src/ai/ai.service.ts`:
```typescript
model: 'qwen3:1.5b',  // or qwen3:3b, qwen2.5:1.5b, etc.
```

## Performance Notes

- **qwen3:1.5b**: Fast, good quality
- **qwen3:1.7b**: Balanced speed and quality (recommended)
- **qwen3:3b**: Better quality, slower
- **qwen2.5:3b**: Legacy model, good quality
- **qwen2.5:7b**: Legacy model, highest quality, requires more RAM

Choose based on your hardware capabilities and quality requirements.