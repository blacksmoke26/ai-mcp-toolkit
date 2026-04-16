# MCP Toolkit

A production-ready **Model Context Protocol (MCP)** server implementation with an accompanying testing interface. Connect local and cloud LLMs to custom tools through a unified, developer-friendly platform.

---

## Overview

This project consists of two main components:

### [`backend/`](./backend/)
The core MCP server implementing the Model Context Protocol specification. Features:
- **MCP Protocol** — JSON-RPC 2.0 over HTTP/SSE for MCP-compatible clients
- **Multi-Provider LLM** — Supports Ollama, OpenAI, and any OpenAI-compatible API
- **Autonomous Agent** — LLM-driven tool orchestration with configurable iteration limits
- **Tool Registry** — Register, enable, and categorize custom tools at runtime
- **SQLite Persistence** — Zero-config database for providers, conversations, and configurations
- **REST Admin API** — Full CRUD operations for providers and tools

Built with **Fastify**, **Sequelize**, and **TypeScript**.

### [`frontend/`](./frontend/)
A React-based testing and simulation interface for the MCP server. Features:
- **Dashboard** — Real-time server status and health monitoring
- **MCP Tools Testing** — Browse, execute, and debug MCP tools via UI
- **Chat Interface** — Interact with the LLM agent and view tool usage
- **Admin Panel** — Manage providers and tools through a graphical interface

Built with **React**, **TypeScript**, **Tailwind CSS**, and **Vite**.

---

## Quick Start

1. **Start the backend**: `cd backend && npm install && npm run dev`
2. **Start the frontend**: `cd frontend && npm install && npm run dev`
3. **Open the UI**: Visit `http://localhost:5173`

---

## Documentation

- [Backend Documentation](./backend/README.md) — Full API reference, architecture, and development guide
- [Frontend Documentation](./frontend/README.md) — UI features, components, and usage guide

---

## Copyright ©️

Developed with ❤️ by Junaid Atari
