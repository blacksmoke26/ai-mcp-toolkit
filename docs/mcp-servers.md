# MCP Server Management

## Overview

The **MCP Server Management** feature allows you to add, configure, manage, and monitor external Model Context Protocol (MCP) servers from a centralized interface. This extends the capabilities of your AI system by enabling it to connect to various external tools, databases, APIs, and services.

## What is an MCP Server?

An MCP (Model Context Protocol) server is an external service that provides tools, resources, and prompts to AI models. MCP servers can be:

- **Local processes** (stdio transport): Running on the same machine as your AI system
- **Remote services** (SSE/HTTP transport): Accessible over network connections

### Common Use Cases

- **File System Access**: Read/write files on disk
- **Database Connections**: PostgreSQL, SQLite, MongoDB, etc.
- **API Integrations**: GitHub, Slack, Google Drive, AWS S3
- **Browser Automation**: Puppeteer for web scraping and testing
- **AI Services**: Image generation, code completion, etc.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  MCP Server Manager                     │
│  (Backend Service: mcp-server-manager.ts)              │
├─────────────────────────────────────────────────────────┤
│  • Connection Lifecycle Management                      │
│  • Process Spawning (stdio)                             │
│  • HTTP/SSE Connections                                 │
│  • Auto-reconnect Logic                                 │
│  • Health Monitoring                                    │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│                MCP Servers Database                     │
│  (Sequelize Model: MCPServer)                          │
├─────────────────────────────────────────────────────────┤
│  • Server configurations                                │
│  • Connection settings                                  │
│  • Status tracking                                      │
│  • Connection history                                   │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│                 External MCP Servers                    │
│  • File System Server                                  │
│  • PostgreSQL Server                                   │
│  • GitHub Server                                       │
│  • Custom Servers                                      │
└─────────────────────────────────────────────────────────┘
```

## Features

### Core Functionality

1. **Server Configuration**
   - Create, edit, and delete MCP server configurations
   - Support for multiple transport types (stdio, SSE, streamable-http)
   - Environment variable management
   - Custom settings and headers

2. **Connection Management**
   - Start, stop, and restart server connections
   - Real-time status monitoring
   - Auto-reconnect with exponential backoff
   - Connection timeout handling

3. **Health Monitoring**
   - Connection status tracking (disconnected, connecting, connected, error)
   - Health check endpoints
   - Connection statistics (success/failure counts)
   - Error logging and reporting

4. **Template System**
   - Pre-configured templates for popular MCP servers
   - Quick setup with one-click deployment
   - Documentation links for each template

### Security Features

- **Command Validation**: Server names and commands are validated before execution
- **URL Validation**: HTTP-based connections require valid URLs
- **Environment Isolation**: Sensitive data stored securely in database
- **Access Control**: All operations logged for audit trails

## Getting Started

### Quick Start

1. **Access the MCP Servers Management Page**
   - Navigate to `/admin/mcp-servers` in the web interface
   - Or visit `http://localhost:3100/admin/mcp-servers`

2. **Create Your First Server**
   - Click the "Templates" button to browse pre-configured options
   - Select a template (e.g., "File System")
   - Customize the configuration as needed
   - Click "Create Server"

3. **Start the Server**
   - Find your server in the list
   - Click the Play (▶) button to start the connection
   - Monitor the status indicator

4. **Test Connectivity**
   - Click the Activity (📊) button for health check
   - Review the connection test results

### Using Templates

The system includes templates for popular MCP servers:

| Template | Description | Transport |
|----------|-------------|-----------|
| **File System** | Read/write file access | stdio |
| **PostgreSQL** | Database queries | stdio |
| **SQLite** | Lightweight database | stdio |
| **GitHub** | Repository operations | stdio |
| **Google Drive** | File management | stdio |
| **Puppeteer** | Browser automation | stdio |
| **Slack** | Messaging integration | stdio |
| **AWS S3** | Cloud storage | stdio |
| **Fetch** | HTTP requests | stdio |
| **Memory** | In-memory storage | stdio |
| **GitLab** | CI/CD integration | stdio |
| **EverArt** | AI image generation | stdio |

## API Reference

### Base URL
```
http://localhost:3100/api/mcp-servers
```

### Endpoints

#### List Servers
```http
GET /api/mcp-servers
```

**Query Parameters:**
- `enabled` (boolean): Filter by enabled status
- `status` (string): Filter by connection status
- `search` (string): Search in name and description

**Response:**
```json
{
  "total": 3,
  "servers": [
    {
      "id": 1,
      "name": "filesystem",
      "displayName": "File System Access",
      "description": "Read/write file operations",
      "type": "stdio",
      "enabled": true,
      "status": "connected",
      "connectionCount": 5,
      "failureCount": 0,
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:35:00Z"
    }
  ]
}
```

#### Create Server
```http
POST /api/mcp-servers
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "my-server",
  "displayName": "My Custom Server",
  "description": "Custom MCP server description",
  "type": "stdio",
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-example"],
  "env": {
    "API_KEY": "your-api-key"
  },
  "enabled": true,
  "timeout": 30000,
  "autoReconnect": true,
  "maxReconnectAttempts": -1,
  "reconnectDelay": 5000
}
```

**Response:**
```json
{
  "status": "created",
  "server": {
    "id": 1,
    "name": "my-server",
    "displayName": "My Custom Server",
    "enabled": true,
    "status": "connecting",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

#### Get Server Details
```http
GET /api/mcp-servers/:id
```

**Response:**
```json
{
  "id": 1,
  "name": "filesystem",
  "displayName": "File System Access",
  "description": "Read/write file operations",
  "type": "stdio",
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-filesystem", "/safe/path"],
  "env": {},
  "enabled": true,
  "status": "connected",
  "timeout": 30000,
  "autoReconnect": true,
  "maxReconnectAttempts": -1,
  "reconnectDelay": 5000,
  "version": "1.0.0",
  "lastConnectedAt": "2024-01-15T10:30:00Z",
  "connectionCount": 5,
  "failureCount": 0,
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:35:00Z"
}
```

#### Update Server
```http
PUT /api/mcp-servers/:id
Content-Type: application/json
```

**Request Body:**
```json
{
  "displayName": "Updated Name",
  "description": "Updated description",
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-filesystem", "/new/path"],
  "enabled": true
}
```

**Response:**
```json
{
  "status": "updated",
  "server": {
    "id": 1,
    "name": "filesystem",
    "displayName": "Updated Name",
    "type": "stdio",
    "enabled": true,
    "status": "connected",
    "updatedAt": "2024-01-15T10:40:00Z"
  }
}
```

#### Delete Server
```http
DELETE /api/mcp-servers/:id
```

**Response:**
```json
{
  "status": "deleted",
  "server": "filesystem"
}
```

#### Start Server
```http
POST /api/mcp-servers/:id/start
```

**Response:**
```json
{
  "status": "started",
  "server": {
    "id": 1,
    "name": "filesystem",
    "displayName": "File System Access"
  }
}
```

#### Stop Server
```http
POST /api/mcp-servers/:id/stop
Content-Type: application/json
```

**Request Body:**
```json
{
  "force": false
}
```

**Response:**
```json
{
  "status": "stopped",
  "server": {
    "id": 1,
    "name": "filesystem",
    "displayName": "File System Access"
  }
}
```

#### Restart Server
```http
POST /api/mcp-servers/:id/restart
```

**Response:**
```json
{
  "status": "restarted",
  "server": {
    "id": 1,
    "name": "filesystem",
    "displayName": "File System Access"
  }
}
```

#### Get Server Status
```http
GET /api/mcp-servers/:id/status
```

**Response:**
```json
{
  "id": 1,
  "name": "filesystem",
  "displayName": "File System Access",
  "type": "stdio",
  "status": "connected",
  "version": "1.0.0",
  "connectedAt": "2024-01-15T10:30:00Z",
  "connectionCount": 5,
  "failureCount": 0
}
```

#### Health Check
```http
GET /api/mcp-servers/:id/health
```

**Response:**
```json
{
  "id": 1,
  "name": "filesystem",
  "status": "healthy",
  "connectionStatus": "connected",
  "uptime": 300,
  "checkedAt": "2024-01-15T10:35:00Z"
}
```

#### Test Connection
```http
POST /api/mcp-servers/:id/test
```

**Response:**
```json
{
  "success": true,
  "status": "connected",
  "message": "Connection test successful"
}
```

#### Get Templates
```http
GET /api/mcp-servers/templates
```

**Response:**
```json
{
  "templates": [
    {
      "id": "filesystem",
      "name": "filesystem",
      "displayName": "File System",
      "description": "Provides read/write access to the local file system",
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/safe/path"],
      "notes": "Replace /safe/path with your directory",
      "documentationUrl": "https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem"
    }
  ]
}
```

## Configuration Guide

### Stdio Transport (Local Process)

For stdio-based servers, configure the following:

```json
{
  "type": "stdio",
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/dir"],
  "env": {
    "API_KEY": "your-key",
    "DEBUG": "true"
  }
}
```

**Common Commands:**
- `npx` - Node.js package execution (most common)
- `node` - Direct Node.js execution
- `/usr/bin/python3` - Python scripts
- `docker run` - Containerized servers

### SSE Transport (Server-Sent Events)

For remote servers using SSE:

```json
{
  "type": "sse",
  "url": "http://localhost:8080/sse",
  "headers": {
    "Authorization": "Bearer your-token",
    "Content-Type": "application/json"
  }
}
```

### Streamable HTTP Transport

For bidirectional HTTP streaming:

```json
{
  "type": "streamable-http",
  "url": "http://localhost:8080/mcp",
  "headers": {
    "Authorization": "Bearer your-token"
  }
}
```

### Connection Settings

All server types support these advanced settings:

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `timeout` | number | 30000 | Connection timeout in milliseconds |
| `autoReconnect` | boolean | true | Automatically reconnect on failure |
| `maxReconnectAttempts` | number | -1 | Max reconnection attempts (-1 for unlimited) |
| `reconnectDelay` | number | 5000 | Base delay between retries (ms) |

**Example with custom settings:**
```json
{
  "timeout": 60000,
  "autoReconnect": true,
  "maxReconnectAttempts": 5,
  "reconnectDelay": 10000
}
```

## Server Status Codes

The system tracks connection states:

| Status | Description | Icon |
|--------|-------------|------|
| **disconnected** | Server is not connected | ⬛ |
| **connecting** | Establishing connection | 🔄 |
| **connected** | Active and ready | ✅ |
| **error** | Connection failed | ⚠️ |

## Troubleshooting

### Common Issues

#### Server Won't Start

**Symptoms:**
- Status remains "connecting" or shows "error"
- Error message in UI

**Solutions:**
1. Check the error message in the server card
2. Verify the command exists and is executable
3. Check environment variables are set correctly
4. Ensure required dependencies are installed

```bash
# Test command manually
npx -y @modelcontextprotocol/server-filesystem /path
```

#### Connection Timeout

**Symptoms:**
- Status shows "error" after timeout
- "Connection timed out" message

**Solutions:**
1. Increase timeout value in server settings
2. Check network connectivity (for remote servers)
3. Verify server is running and accessible

#### Auto-Reconnect Not Working

**Symptoms:**
- Server disconnects and doesn't reconnect

**Solutions:**
1. Ensure `autoReconnect` is set to `true`
2. Check `maxReconnectAttempts` is not 0
3. Review error logs for root cause

#### Permission Denied

**Symptoms:**
- "Permission denied" error for file operations

**Solutions:**
1. Check file/directory permissions
2. Run server with appropriate user privileges
3. Use absolute paths for file system servers

### Debugging Tips

1. **Enable Debug Logging**
   ```bash
   MCP_LOG_LEVEL=debug bun run dev
   ```

2. **View Server Logs**
   - Use the health check dialog to see recent errors
   - Check console output for detailed logs

3. **Test Connection Manually**
   ```bash
   # For stdio servers
   npx -y @modelcontextprotocol/server-filesystem /tmp
   
   # For HTTP servers
   curl http://localhost:8080/sse
   ```

4. **Check Database State**
   ```sql
   SELECT * FROM mcp_servers WHERE name = 'your-server';
   ```

## Best Practices

### Security

1. **Limit File System Access**
   ```json
   {
     "args": ["-y", "@modelcontextprotocol/server-filesystem", "/safe/path"]
   }
   ```
   Only expose necessary directories, never root filesystem.

2. **Use Environment Variables for Secrets**
   ```json
   {
     "env": {
       "API_KEY": "${API_KEY}",
       "SECRET": "${SECRET}"
     }
   }
   ```

3. **Validate URLs**
   - Only connect to trusted endpoints
   - Use HTTPS for production environments
   - Implement allowlists for remote servers

### Performance

1. **Set Appropriate Timeouts**
   - Short-lived operations: 10-30 seconds
   - Long-running processes: 60-120 seconds

2. **Limit Reconnection Attempts**
   - Production: 3-5 attempts
   - Development: -1 (unlimited)

3. **Monitor Resource Usage**
   - Track memory consumption for long-running servers
   - Restart servers periodically to clear memory leaks

### Maintenance

1. **Regular Health Checks**
   - Schedule periodic health checks
   - Monitor connection success rates
   - Review error logs daily

2. **Version Control**
   - Track server configuration changes
   - Document custom server setups
   - Maintain configuration backups

3. **Access Logging**
   - Enable request/response logging
   - Track tool usage patterns
   - Monitor for anomalies

## Integration Examples

### PostgreSQL Database

```json
{
  "name": "postgres-db",
  "displayName": "Production Database",
  "description": "Connect to production PostgreSQL database",
  "type": "stdio",
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-postgres"],
  "env": {
    "DATABASE_URL": "postgresql://user:pass@localhost:5432/dbname"
  },
  "enabled": true,
  "timeout": 30000,
  "autoReconnect": true
}
```

### GitHub Integration

```json
{
  "name": "github-repo",
  "displayName": "GitHub Repository Access",
  "description": "Access GitHub repositories and issues",
  "type": "stdio",
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-github"],
  "env": {
    "GITHUB_TOKEN": "ghp_your-token-here"
  },
  "enabled": true
}
```

### Custom Python Server

```json
{
  "name": "python-ml",
  "displayName": "ML Model Server",
  "description": "Custom machine learning model inference",
  "type": "stdio",
  "command": "/usr/bin/python3",
  "args": ["/path/to/ml-server.py"],
  "env": {
    "MODEL_PATH": "/models/my-model.h5",
    "DEBUG": "1"
  },
  "timeout": 60000
}
```

## Database Schema

### MCPServer Table

```sql
CREATE TABLE mcp_servers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name VARCHAR(255) UNIQUE NOT NULL,
  displayName VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'stdio',
  command VARCHAR(255),
  args TEXT,
  env TEXT,
  url TEXT,
  headers TEXT,
  enabled BOOLEAN DEFAULT FALSE,
  status VARCHAR(50) DEFAULT 'disconnected',
  lastError TEXT,
  timeout INTEGER DEFAULT 30000,
  autoReconnect BOOLEAN DEFAULT TRUE,
  maxReconnectAttempts INTEGER DEFAULT -1,
  reconnectDelay INTEGER DEFAULT 5000,
  settings TEXT,
  version VARCHAR(50),
  lastConnectedAt DATETIME,
  lastDisconnectedAt DATETIME,
  connectionCount INTEGER DEFAULT 0,
  failureCount INTEGER DEFAULT 0,
  createdAt DATETIME NOT NULL,
  updatedAt DATETIME NOT NULL
);
```

## Contributing

### Adding New Templates

To add a new MCP server template:

1. Edit `backend/src/constants/mcp-server-templates.ts`
2. Add your template configuration
3. Include documentation URL
4. Test the template locally

```typescript
{
  id: 'your-server',
  name: 'your-server',
  displayName: 'Your Server Name',
  description: 'Description of what it does',
  type: 'stdio',
  command: 'npx',
  args: ['-y', '@modelcontextprotocol/server-your-package'],
  env: {
    'REQUIRED_VAR': 'example-value'
  },
  notes: 'Important setup notes',
  documentationUrl: 'https://github.com/.../your-server'
}
```

### Extending the Manager

To add new transport types or features:

1. Update `backend/src/types/mcp-server.ts` for new types
2. Implement handler in `backend/src/services/mcp-server-manager.ts`
3. Add API endpoints in `backend/src/server/routes/mcp-servers.ts`
4. Update frontend components in `frontend/src/pages/index.tsx`

## Changelog

### Version 1.0.0

- Initial release of MCP server management
- Support for stdio, SSE, and streamable-http transports
- Template system with 12 pre-configured servers
- Real-time status monitoring
- Health check endpoints
- Auto-reconnect with exponential backoff
- Comprehensive API documentation

## Support

- **Documentation**: [GitHub Wiki](https://github.com/blacksmoke26/ai-mcp-toolkit/wiki)
- **Issues**: [GitHub Issues](https://github.com/blacksmoke26/ai-mcp-toolkit/issues)
- **Discussions**: [GitHub Discussions](https://github.com/blacksmoke26/ai-mcp-toolkit/discussions)

## License

Copyright © 2026 Junaid Atari. All rights reserved.
