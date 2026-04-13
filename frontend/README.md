# MCP Server Frontend

A comprehensive React-based testing and simulation interface for the MCP Server backend. This frontend application provides a user-friendly UI to test and interact with all MCP Server API endpoints.

## 🚀 Features

### Dashboard
- **Real-time Server Status**: Monitor server health, uptime, and availability
- **Provider Overview**: View configured LLM providers and their status
- **Tool Statistics**: Quick overview of registered and enabled MCP tools
- **Health Checks**: Real-time readiness probe status with detailed service checks
- **Quick Actions**: Fast access to commonly used features

### MCP Protocol Testing
- **Tools Listing**: Browse all available MCP tools via JSON-RPC 2.0
- **Tool Execution**: Test and execute tools with dynamic parameter input
- **Schema Visualization**: View tool input schemas in a readable format
- **Result Display**: See tool execution results with formatted output
- **Category Filtering**: Filter tools by category for easier navigation

### Chat & Conversations
- **Interactive Chat**: Real-time chat with the MCP agent
- **Tool Usage Display**: See when the agent automatically uses tools
- **Conversation History**: View and manage past conversations
- **Provider Selection**: Choose between different LLM providers
- **Model Configuration**: Select and configure LLM models

### Admin Panel
- **Provider Management**:
  - Add new LLM providers (Ollama, OpenAI-compatible)
  - Configure provider settings (base URL, API keys, models)
  - Set default providers
  - View available models from providers
  - Remove providers
  
- **Tool Management**:
  - Enable/disable MCP tools
  - View tool details and schemas
  - Filter tools by category
  - Monitor tool usage statistics

## 📁 Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── ui/          # Reusable UI components (Button, Card, etc.)
│   │   └── Layout.tsx   # Main layout with navigation
│   ├── lib/
│   │   ├── api.ts       # API client service
│   │   └── utils.ts     # Utility functions
│   ├── pages/           # Page components
│   │   ├── Dashboard.tsx
│   │   ├── MCPTools.tsx
│   │   ├── Chat.tsx
│   │   ├── AdminProviders.tsx
│   │   └── AdminTools.tsx
│   ├── types/
│   │   └── api.ts       # TypeScript type definitions
│   ├── App.tsx          # Main app with routing
│   ├── main.tsx         # Application entry point
│   └── index.css        # Global styles
├── public/
├── index.html
├── package.json
├── tailwind.config.js
├── postcss.config.js
├── tsconfig.app.json
└── vite.config.ts
```

## 🛠️ Technologies

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first CSS framework
- **Radix UI** - Accessible UI components
- **React Router** - Client-side routing
- **Vite** - Build tool and dev server
- **Lucide React** - Icon library

## 📦 Installation

### Prerequisites

- Node.js 18+ 
- npm or yarn package manager

### Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and visit:
   ```
   http://localhost:5173
   ```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the frontend root directory:

```env
# Backend API URL
VITE_API_BASE_URL=http://localhost:3100
```

**Note**: The frontend will automatically connect to `http://localhost:3100` by default if no environment variable is set.

### Building for Production

```bash
npm run build
```

The production build will be created in the `dist/` directory.

### Preview Production Build

```bash
npm run preview
```

## 🔌 API Coverage

This frontend covers all MCP Server API endpoints:

### Health & Info Endpoints
| Endpoint | Method | Feature | Status |
|----------|--------|---------|--------|
| `/health` | GET | Dashboard | ✅ |
| `/health/ready` | GET | Dashboard | ✅ |
| `/info` | GET | Dashboard, Server Info | ✅ |

### MCP Protocol Endpoints
| Endpoint | Method | Feature | Status |
|----------|--------|---------|--------|
| `/mcp` | POST | MCP Tools, Call Tool | ✅ |
| `/mcp/sse` | GET | SSE Stream | ⚠️ Placeholder |

### Chat API Endpoints
| Endpoint | Method | Feature | Status |
|----------|--------|---------|--------|
| `/chat` | POST | Chat | ✅ |
| `/chat/stream` | POST | Stream Chat | ⚠️ Placeholder |
| `/chat/conversations` | GET | Conversations | ⚠️ Placeholder |
| `/chat/conversations/:id` | GET | Conversation Detail | ⚠️ Placeholder |
| `/chat/conversations/:id` | DELETE | Delete Conversation | ✅ |

### Admin Endpoints - Providers
| Endpoint | Method | Feature | Status |
|----------|--------|---------|--------|
| `/admin/providers` | GET | Provider Management | ✅ |
| `/admin/providers` | POST | Add Provider | ✅ |
| `/admin/providers/:name` | DELETE | Remove Provider | ✅ |
| `/admin/providers/:name/default` | POST | Set Default | ✅ |
| `/admin/providers/:name/models` | GET | List Models | ✅ |

### Admin Endpoints - Tools
| Endpoint | Method | Feature | Status |
|----------|--------|---------|--------|
| `/admin/tools` | GET | Tool Management | ✅ |
| `/admin/tools/:name` | GET | Tool Details | ✅ |
| `/admin/tools/:name` | PATCH | Enable/Disable Tool | ✅ |

**Legend**: ✅ Fully Implemented | ⚠️ Placeholder UI

## 📖 Usage Guide

### Testing MCP Tools

1. Navigate to **MCP Tools** from the sidebar
2. Browse or search for available tools
3. Select a tool to see its details
4. Fill in the required parameters
5. Click **Call Tool** to execute
6. View the result in the response area

### Chatting with the Agent

1. Go to the **Chat** page
2. Select your preferred LLM provider
3. Type your message
4. Press Enter or click **Send**
5. The agent will respond and automatically use tools when needed
6. View tool usage in the conversation thread

### Managing Providers

1. Navigate to **Admin > Providers**
2. Click **Add Provider**
3. Fill in the provider details:
   - Name (e.g., `my-ollama`)
   - Type (Ollama or OpenAI)
   - Base URL
   - API Key (optional for Ollama, required for OpenAI)
   - Default Model
   - Temperature and Max Tokens (optional)
4. Click **Add Provider**
5. Select a provider to view its details and available models
6. Use the toggle buttons to set default provider or remove it

### Managing Tools

1. Go to **Admin > Tools**
2. Browse or search for tools
3. View tool details in the right panel
4. Toggle the switch to enable/disable tools
5. Filter by category for easier navigation

## 🎨 UI Components

The frontend uses a consistent design system with:

- **Buttons**: Primary, Secondary, Destructive, Outline, Ghost variants
- **Cards**: Content containers with header, content, and footer sections
- **Badges**: Status indicators (success, warning, error, info)
- **Alerts**: Non-modal alerts for success, warning, and error messages
- **Inputs & Textareas**: Form fields with validation styling
- **Dialogs & Modals**: Accessible dialog components from Radix UI

## 🌐 Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## 🐛 Troubleshooting

### Connection Issues

If you can't connect to the backend:

1. Ensure the backend server is running on `http://localhost:3100`
2. Check for CORS issues in the browser console
3. Verify the backend has CORS enabled

### Build Errors

If you encounter TypeScript errors:

```bash
# Clean and reinstall
rm -rf node_modules
npm install

# Try building again
npm run build
```

### Tool Not Found

If tools are not appearing:

1. Check the backend has tools registered
2. Refresh the page
3. Check the backend logs for tool registration

## 📝 Notes

- The frontend is a **testing interface** and not production-ready
- All API interactions are done via HTTP requests
- The frontend does not persist data locally (except for session state)
- For production use, consider adding authentication and authorization

## 🔗 Backend Documentation

For full backend documentation, refer to the backend README:
```
../backend/README.md
```

## 📄 License

Same as the parent project.

## 👥 Contributing

Contributions are welcome! Please read the contributing guidelines in the main README before submitting changes.