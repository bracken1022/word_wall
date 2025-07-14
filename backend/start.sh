#!/bin/bash

# Start script for ECS container with Ollama and NestJS

set -e

echo "🚀 Starting Words Wall Backend with Ollama..."

# Set environment variables for Ollama
export OLLAMA_HOME=/app/.ollama
export OLLAMA_HOST=0.0.0.0
export PATH=/usr/local/bin:$PATH

# Create ollama directory with proper permissions
mkdir -p /app/.ollama
chown -R $(id -u):$(id -g) /app/.ollama

# Start Ollama server in background with explicit host binding
echo "📡 Starting Ollama server..."
echo "📋 Ollama environment:"
echo "  OLLAMA_HOME: $OLLAMA_HOME"
echo "  OLLAMA_HOST: $OLLAMA_HOST"
echo "  User: $(id)"

# Check if ollama binary exists
if ! command -v ollama &> /dev/null; then
    echo "❌ Ollama binary not found!"
    echo "Available commands:"
    ls -la /usr/local/bin/ | grep -i ollama || echo "No ollama binary found"
    echo "Starting without Ollama (fallback mode)"
    node dist/main.js
    exit 0
fi

# Start Ollama with debug output
ollama serve 2>&1 &
OLLAMA_PID=$!

# Wait for Ollama to be ready with better error handling
echo "⏳ Waiting for Ollama to start..."
for i in {1..60}; do
  if curl -s http://localhost:11434/api/version > /dev/null 2>&1; then
    echo "✅ Ollama is ready!"
    break
  fi
  if [ $i -eq 60 ]; then
    echo "❌ Ollama failed to start within 60 seconds"
    echo "📋 Ollama process status:"
    ps aux | grep ollama || echo "No ollama processes found"
    echo "📋 Port status:"
    netstat -tlnp | grep 11434 || echo "Port 11434 not listening"
    echo "Starting NestJS without Ollama (fallback mode)"
    node dist/main.js
    exit 0
  fi
  if [ $((i % 10)) -eq 0 ]; then
    echo "Still waiting... ($i/60)"
  fi
  sleep 1
done

# Pull Qwen model
echo "📥 Pulling Qwen3:1.7b model..."
if ! ollama pull qwen3:1.7b; then
    echo "❌ Failed to pull Qwen model, but continuing with startup"
fi

echo "🎯 Model ready. Starting NestJS application..."

# Function to handle shutdown
cleanup() {
  echo "🛑 Shutting down..."
  kill $OLLAMA_PID 2>/dev/null || true
  wait $OLLAMA_PID 2>/dev/null || true
  exit 0
}

# Set up signal handlers
trap cleanup SIGTERM SIGINT

# Start NestJS application
node dist/main.js &
APP_PID=$!

# Wait for either process to exit
wait $APP_PID