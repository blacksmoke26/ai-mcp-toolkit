#!/bin/bash

# Synapse - Development Setup Script
echo "🚀 Setting up MCP.."

# Change to backend directory and start the server
echo "Starting backend server..."
cd backend
npm run dev &

# Wait a moment for backend to start
sleep 5

# Change to frontend directory and start the development server
echo "Starting frontend development server..."
cd ../frontend
npm run dev

echo "Application started successfully!"
