/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

/**
 * @module constants/mcp-server-templates
 * @description Pre-defined MCP server templates for quick setup.
 *
 * These templates provide starting configurations for popular MCP servers.
 * Users can select a template and customize it for their specific needs.
 *
 * ## New Properties
 * | Property | Type | Description |
 * |----------|------|-------------|
 * | category | string | Grouping for UI organization (e.g., Database, Cloud) |
 * | icon | string | Emoji or icon identifier for UI display |
 * | tags | string[] | List of tags for filtering/searching |
 * | variables | VariableDoc[] | Structured documentation for environment variables |
 * | runtime | string | Execution runtime (node, python, binary, go) |
 * | homepage | string | URL to the official repository or homepage |
 *
 * ## Available Templates
 *
 | Template | Category | Description |
 |---------|----------|-------------|
 | filesystem | Utility | File system read/write access |
 | postgres | Database | PostgreSQL database access |
 | sqlite | Database | SQLite database access |
 | github | Development | GitHub API integration |
 | google-drive | Cloud | Google Drive file access |
 | puppeteer | Automation | Browser automation |
 | slack | Communication | Slack messaging |
 | aws-s3 | Cloud | Amazon S3 storage |
 | fetch | Utility | HTTP request utility |
 | memory | Utility | In-memory key-value store |
 | gitlab | Development | GitLab integration |
 | everart | AI | AI image generation |
 | google-docs | Cloud | Google Docs document access |
 | google-maps | Maps | Google Maps geolocation |
 | twitter-x | Social | Twitter/X API integration |
 | docker | DevOps | Docker container management |
 | mysql | Database | MySQL database access |
 | redis | Database | Redis key-value store |
 | jira | Productivity | Atlassian Jira integration |
 | notion | Productivity | Notion workspace access |
 | confluence | Productivity | Confluence wiki access |
 | linear | Productivity | Linear issue tracking |
 | searxng | Search | SearXNG search engine |
 | brave-search | Search | Brave Search integration |
 | windows-cli | System | Windows command line |
 | tavily-search | Search | AI-powered search |
 | everything | System | Fast local file search (Windows) |
 | kubernetes | DevOps | Kubernetes cluster management |
 | mongodb | Database | MongoDB database access |
 | figma | Design | Figma design tool access |
 | sequential-thinking | AI | Chain of thought reasoning |
 */

import type {MCPServerTemplate} from '@/types/mcp-server';

/**
 * Collection of MCP server templates.
 */
const mcpServerTemplates: MCPServerTemplate[] = [
  {
    id: 'filesystem',
    name: 'filesystem',
    displayName: 'File System',
    description: 'Provides read/write access to the local file system. Allow the LLM to read and write files on disk.',
    type: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-filesystem', '/safe/path'],
    notes: 'Replace /safe/path with the directory you want to expose. For security, limit access to specific directories.',
    documentationUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem',
    category: 'Utility',
    icon: '📁',
    tags: ['local', 'files', 'storage'],
    runtime: 'node',
    homepage: 'https://github.com/modelcontextprotocol/servers',
    variables: [
      {
        key: 'ALLOWED_DIRECTORY',
        description: 'The absolute path to the directory allowed for access. Passed as an argument in this template.',
        required: true,
        example: '/Users/junaid/projects'
      }
    ]
  },
  {
    id: 'postgres',
    name: 'postgres',
    displayName: 'PostgreSQL',
    description: 'Connect to a PostgreSQL database. Enables SQL queries and database schema inspection.',
    type: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-postgres'],
    env: {
      DATABASE_URL: 'postgresql://user:password@localhost:5432/database',
    },
    notes: 'Set DATABASE_URL environment variable with your connection string. Use connection pooling for production.',
    documentationUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/postgres',
    category: 'Database',
    icon: '🐘',
    tags: ['sql', 'database', 'relational'],
    runtime: 'node',
    homepage: 'https://github.com/modelcontextprotocol/servers',
    variables: [
      {
        key: 'DATABASE_URL',
        description: 'Connection string for the PostgreSQL instance.',
        required: true,
        example: 'postgresql://postgres:password@localhost:5432/mydb'
      }
    ]
  },
  {
    id: 'sqlite',
    name: 'sqlite',
    displayName: 'SQLite',
    description: 'Connect to a SQLite database for lightweight data storage and queries.',
    type: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-sqlite'],
    env: {
      SQLITE_DB_PATH: './data/database.sqlite',
    },
    notes: 'Set SQLITE_DB_PATH to point to your SQLite database file.',
    documentationUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/sqlite',
    category: 'Database',
    icon: '💾',
    tags: ['sql', 'database', 'local'],
    runtime: 'node',
    homepage: 'https://github.com/modelcontextprotocol/servers',
    variables: [
      {
        key: 'SQLITE_DB_PATH',
        description: 'Filesystem path to the SQLite database file.',
        required: true,
        example: './data/app.sqlite'
      }
    ]
  },
  {
    id: 'github',
    name: 'github',
    displayName: 'GitHub',
    description: 'Interact with GitHub repositories, issues, pull requests, and more.',
    type: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-github'],
    env: {
      GITHUB_TOKEN: 'your-github-token',
    },
    notes: 'Set GITHUB_TOKEN with a personal access token. Token scopes depend on required operations.',
    documentationUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/github',
    category: 'Development',
    icon: '🐙',
    tags: ['git', 'cicd', 'code'],
    runtime: 'node',
    homepage: 'https://github.com/modelcontextprotocol/servers',
    variables: [
      {
        key: 'GITHUB_TOKEN',
        description: 'GitHub Personal Access Token (PAT) with necessary scopes.',
        required: true,
        example: 'ghp_xxxxxxxxxxxx'
      }
    ]
  },
  {
    id: 'google-drive',
    name: 'google-drive',
    displayName: 'Google Drive',
    description: 'Access Google Drive files, search, and manage documents.',
    type: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-gdrive'],
    env: {
      GOOGLE_APPLICATION_CREDENTIALS: '/path/to/service-account.json',
      DRIVE_SCOPE: 'https://www.googleapis.com/auth/drive.readonly',
    },
    notes: 'Requires Google service account credentials JSON file. Configure OAuth scopes as needed.',
    documentationUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/gdrive',
    category: 'Cloud',
    icon: '☁️',
    tags: ['google', 'storage', 'documents'],
    runtime: 'node',
    homepage: 'https://github.com/modelcontextprotocol/servers',
    variables: [
      {
        key: 'GOOGLE_APPLICATION_CREDENTIALS',
        description: 'Path to the Google Cloud service account JSON key file.',
        required: true,
        example: '/secrets/google-service-account.json'
      },
      {
        key: 'DRIVE_SCOPE',
        description: 'OAuth scope defining access level (e.g., readonly or full access).',
        required: false,
        default: 'https://www.googleapis.com/auth/drive.readonly'
      }
    ]
  },
  {
    id: 'puppeteer',
    name: 'puppeteer',
    displayName: 'Puppeteer Browser',
    description: 'Automate browser actions, scraping, and testing with headless Chrome.',
    type: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-puppeteer'],
    notes: 'Requires Chrome/Chromium to be installed. Be mindful of resource usage.',
    documentationUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/puppeteer',
    category: 'Automation',
    icon: '🤖',
    tags: ['browser', 'scraping', 'testing'],
    runtime: 'node',
    homepage: 'https://github.com/modelcontextprotocol/servers',
    variables: [] // No env vars typically required for basic setup
  },
  {
    id: 'slack',
    name: 'slack',
    displayName: 'Slack',
    description: 'Send and receive Slack messages, manage channels, and interact with workspace.',
    type: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-slack'],
    env: {
      SLACK_BOT_TOKEN: 'your-bot-token',
      SLACK_SIGNING_SECRET: 'your-signing-secret',
    },
    notes: 'Create a Slack app and obtain bot token and signing secret from Slack API.',
    documentationUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/slack',
    category: 'Communication',
    icon: '💬',
    tags: ['messaging', 'team', 'api'],
    runtime: 'node',
    homepage: 'https://github.com/modelcontextprotocol/servers',
    variables: [
      {
        key: 'SLACK_BOT_TOKEN',
        description: 'Bot User OAuth Token starting with xoxb-.',
        required: true,
        example: '1234567890-1234567890123-AbCdEfGhIjKlMnOpQrStUvWx'
      },
      {
        key: 'SLACK_SIGNING_SECRET',
        description: 'Signing Secret used to verify requests from Slack.',
        required: true,
        example: 'a1b2c3d4e5f6g7h8i9j0'
      }
    ]
  },
  {
    id: 'aws-s3',
    name: 'aws-s3',
    displayName: 'AWS S3',
    description: 'Interact with Amazon S3 buckets, upload/download objects, and manage storage.',
    type: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-aws-s3'],
    env: {
      AWS_ACCESS_KEY_ID: 'your-access-key',
      AWS_SECRET_ACCESS_KEY: 'your-secret-key',
      AWS_REGION: 'us-east-1',
    },
    notes: 'Configure AWS credentials securely using IAM roles or environment variables.',
    documentationUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/aws-s3',
    category: 'Cloud',
    icon: '🌧️',
    tags: ['aws', 'storage', 's3'],
    runtime: 'node',
    homepage: 'https://github.com/modelcontextprotocol/servers',
    variables: [
      { key: 'AWS_ACCESS_KEY_ID', description: 'AWS access key ID.', required: true },
      { key: 'AWS_SECRET_ACCESS_KEY', description: 'AWS secret access key.', required: true },
      { key: 'AWS_REGION', description: 'AWS region for the buckets.', required: true, default: 'us-east-1' }
    ]
  },
  {
    id: 'fetch',
    name: 'fetch',
    displayName: 'HTTP Fetch',
    description: 'Make HTTP requests to external APIs and web services.',
    type: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-fetch'],
    notes: 'Be cautious with external API calls. Implement rate limiting and validate endpoints.',
    documentationUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/fetch',
    category: 'Utility',
    icon: '🌐',
    tags: ['http', 'api', 'network'],
    runtime: 'node',
    homepage: 'https://github.com/modelcontextprotocol/servers',
    variables: []
  },
  {
    id: 'memory',
    name: 'memory',
    displayName: 'Memory Storage',
    description: 'In-memory key-value store for temporary data and session state.',
    type: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-memory'],
    notes: 'Data is lost on server restart. Use for temporary/session data only.',
    documentationUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/memory',
    category: 'Utility',
    icon: '🧠',
    tags: ['kv', 'state', 'ephemeral'],
    runtime: 'node',
    homepage: 'https://github.com/modelcontextprotocol/servers',
    variables: []
  },
  {
    id: 'gitlab',
    name: 'gitlab',
    displayName: 'GitLab',
    description: 'Interact with GitLab projects, issues, MRs, and CI/CD pipelines.',
    type: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-gitlab'],
    env: {
      GITLAB_PERSONAL_ACCESS_TOKEN: 'your-gitlab-token',
      GITLAB_API: 'https://gitlab.com/api/v4',
    },
    notes: 'Set GitLab personal access token. Configure API endpoint for self-hosted instances.',
    documentationUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/gitlab',
    category: 'Development',
    icon: '🦊',
    tags: ['git', 'cicd', 'code'],
    runtime: 'node',
    homepage: 'https://github.com/modelcontextprotocol/servers',
    variables: [
      { key: 'GITLAB_PERSONAL_ACCESS_TOKEN', description: 'GitLab Personal Access Token.', required: true },
      { key: 'GITLAB_API', description: 'GitLab API URL.', required: false, default: 'https://gitlab.com/api/v4' }
    ]
  },
  {
    id: 'everart',
    name: 'everart',
    displayName: 'EverArt AI',
    description: 'Generate images using AI models (DALL-E, Stable Diffusion, etc.).',
    type: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-everart'],
    env: {
      EVERART_API_KEY: 'your-everart-api-key',
    },
    notes: 'Requires EverArt API key. Check rate limits and usage quotas.',
    documentationUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/everart',
    category: 'AI',
    icon: '🎨',
    tags: ['images', 'generation', 'art'],
    runtime: 'node',
    homepage: 'https://github.com/modelcontextprotocol/servers',
    variables: [
      { key: 'EVERART_API_KEY', description: 'API Key for EverArt service.', required: true }
    ]
  },
  {
    id: 'google-docs',
    name: 'google-docs',
    displayName: 'Google Docs',
    description: 'Create, read, and edit Google Docs documents programmatically.',
    type: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-gdocs'],
    env: {
      GOOGLE_APPLICATION_CREDENTIALS: '/path/to/service-account.json',
    },
    notes: 'Requires Google service account credentials. Enable Google Docs API in Google Cloud Console.',
    documentationUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/gdocs',
    category: 'Cloud',
    icon: '📝',
    tags: ['google', 'documents', 'office'],
    runtime: 'node',
    homepage: 'https://github.com/modelcontextprotocol/servers',
    variables: [
      { key: 'GOOGLE_APPLICATION_CREDENTIALS', description: 'Path to Google Cloud service account JSON.', required: true }
    ]
  },
  {
    id: 'google-maps',
    name: 'google-maps',
    displayName: 'Google Maps',
    description: 'Search places, geocode addresses, and get directions using Google Maps API.',
    type: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-google-maps'],
    env: {
      GOOGLE_MAPS_API_KEY: 'your-google-maps-api-key',
    },
    notes: 'Requires a Google Maps Platform API key. Configure billing in Google Cloud Console.',
    documentationUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/google-maps',
    category: 'Maps',
    icon: '🗺️',
    tags: ['google', 'location', 'places'],
    runtime: 'node',
    homepage: 'https://github.com/modelcontextprotocol/servers',
    variables: [
      { key: 'GOOGLE_MAPS_API_KEY', description: 'Google Maps Platform API Key.', required: true }
    ]
  },
  {
    id: 'twitter-x',
    name: 'twitter-x',
    displayName: 'Twitter/X',
    description: 'Post tweets, search timelines, and manage Twitter/X account interactions.',
    type: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-twitter'],
    env: {
      TWITTER_BEARER_TOKEN: 'your-twitter-bearer-token',
      TWITTER_API_KEY: 'your-twitter-api-key',
      TWITTER_API_SECRET: 'your-twitter-api-secret',
    },
    notes: 'Requires Twitter Developer account and API credentials. Choose appropriate API tier.',
    documentationUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/twitter',
    category: 'Social',
    icon: '𝕏',
    tags: ['twitter', 'social', 'news'],
    runtime: 'node',
    homepage: 'https://github.com/modelcontextprotocol/servers',
    variables: [
      { key: 'TWITTER_BEARER_TOKEN', description: 'OAuth 2.0 Bearer Token for app context.', required: true },
      { key: 'TWITTER_API_KEY', description: 'Consumer Key (API Key).', required: false },
      { key: 'TWITTER_API_SECRET', description: 'Consumer Key (API Secret).', required: false }
    ]
  },
  {
    id: 'docker',
    name: 'docker',
    displayName: 'Docker',
    description: 'Manage Docker containers, images, and networks. Inspect and control Docker daemon.',
    type: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-docker'],
    notes: 'Requires Docker daemon to be running and accessible. Ensure proper permissions.',
    documentationUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/docker',
    category: 'DevOps',
    icon: '🐳',
    tags: ['containers', 'deployment', 'virtualization'],
    runtime: 'node',
    homepage: 'https://github.com/modelcontextprotocol/servers',
    variables: []
  },
  {
    id: 'mysql',
    name: 'mysql',
    displayName: 'MySQL',
    description: 'Connect to MySQL databases for queries, schema inspection, and data management.',
    type: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-mysql'],
    env: {
      MYSQL_URL: 'mysql://user:password@localhost:3306/database',
    },
    notes: 'Set MYSQL_URL with your connection string. Ensure MySQL server is accessible.',
    documentationUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/mysql',
    category: 'Database',
    icon: '🐬',
    tags: ['sql', 'database', 'relational'],
    runtime: 'node',
    homepage: 'https://github.com/modelcontextprotocol/servers',
    variables: [
      { key: 'MYSQL_URL', description: 'Connection string for MySQL server.', required: true, example: 'mysql://root:password@localhost:3306/app' }
    ]
  },
  {
    id: 'redis',
    name: 'redis',
    displayName: 'Redis',
    description: 'Interact with Redis key-value store for caching, pub/sub, and data operations.',
    type: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-redis'],
    env: {
      REDIS_URL: 'redis://localhost:6379',
    },
    notes: 'Set REDIS_URL with your Redis connection string. Supports TLS and authentication.',
    documentationUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/redis',
    category: 'Database',
    icon: '🔴',
    tags: ['nosql', 'cache', 'kv'],
    runtime: 'node',
    homepage: 'https://github.com/modelcontextprotocol/servers',
    variables: [
      { key: 'REDIS_URL', description: 'Connection string for Redis instance.', required: true, example: 'redis://user:pass@localhost:6379/0' }
    ]
  },
  {
    id: 'jira',
    name: 'jira',
    displayName: 'Jira',
    description: 'Manage Jira issues, projects, sprints, and workflows for Atlassian Jira.',
    type: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-jira'],
    env: {
      JIRA_DOMAIN: 'your-domain.atlassian.net',
      JIRA_EMAIL: 'your-email@example.com',
      JIRA_API_TOKEN: 'your-jira-api-token',
    },
    notes: 'Generate API token from Atlassian account settings. Use for cloud Jira instances.',
    documentationUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/jira',
    category: 'Productivity',
    icon: '📋',
    tags: ['atlassian', 'agile', 'tasks'],
    runtime: 'node',
    homepage: 'https://github.com/modelcontextprotocol/servers',
    variables: [
      { key: 'JIRA_DOMAIN', description: 'Your Atlassian domain (e.g., company.atlassian.net).', required: true },
      { key: 'JIRA_EMAIL', description: 'Email address associated with the account.', required: true },
      { key: 'JIRA_API_TOKEN', description: 'API Token generated from Atlassian account settings.', required: true }
    ]
  },
  {
    id: 'notion',
    name: 'notion',
    displayName: 'Notion',
    description: 'Access Notion databases, pages, and blocks. Create and manage workspace content.',
    type: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-notion'],
    env: {
      NOTION_INTEGRATION_TOKEN: 'your-notion-integration-token',
    },
    notes: 'Create an internal integration in Notion settings. Share pages with the integration.',
    documentationUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/notion',
    category: 'Productivity',
    icon: '📒',
    tags: ['notes', 'wiki', 'database'],
    runtime: 'node',
    homepage: 'https://github.com/modelcontextprotocol/servers',
    variables: [
      { key: 'NOTION_INTEGRATION_TOKEN', description: 'Internal Integration Token (Secret).', required: true }
    ]
  },
  {
    id: 'confluence',
    name: 'confluence',
    displayName: 'Confluence',
    description: 'Access Confluence pages, spaces, and attachments for Atlassian Confluence.',
    type: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-confluence'],
    env: {
      CONFLUENCE_DOMAIN: 'your-domain.atlassian.net',
      CONFLUENCE_EMAIL: 'your-email@example.com',
      CONFLUENCE_API_TOKEN: 'your-confluence-api-token',
    },
    notes: 'Generate API token from Atlassian account. Configure space permissions as needed.',
    documentationUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/confluence',
    category: 'Productivity',
    icon: '📄',
    tags: ['atlassian', 'wiki', 'collaboration'],
    runtime: 'node',
    homepage: 'https://github.com/modelcontextprotocol/servers',
    variables: [
      { key: 'CONFLUENCE_DOMAIN', description: 'Your Atlassian domain.', required: true },
      { key: 'CONFLUENCE_EMAIL', description: 'Email for Atlassian account.', required: true },
      { key: 'CONFLUENCE_API_TOKEN', description: 'API Token for account.', required: true }
    ]
  },
  {
    id: 'linear',
    name: 'linear',
    displayName: 'Linear',
    description: 'Manage Linear issues, projects, teams, and workflows for issue tracking.',
    type: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-linear'],
    env: {
      LINEAR_API_KEY: 'your-linear-api-key',
    },
    notes: 'Generate API key from Linear team settings. Requires Linear account access.',
    documentationUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/linear',
    category: 'Productivity',
    icon: '⚡',
    tags: ['agile', 'tasks', 'saas'],
    runtime: 'node',
    homepage: 'https://github.com/modelcontextprotocol/servers',
    variables: [
      { key: 'LINEAR_API_KEY', description: 'Linear API Key.', required: true }
    ]
  },
  {
    id: 'searxng',
    name: 'searxng',
    displayName: 'SearXNG',
    description: 'Perform privacy-focused web searches using a self-hosted SearXNG instance.',
    type: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-searxng'],
    env: {
      SEARXNG_URL: 'https://searxng.example.com',
    },
    notes: 'Deploy a SearXNG instance and configure the URL. Supports multiple search engines.',
    documentationUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/searxng',
    category: 'Search',
    icon: '🔎',
    tags: ['metasearch', 'privacy', 'self-hosted'],
    runtime: 'node',
    homepage: 'https://github.com/modelcontextprotocol/servers',
    variables: [
      { key: 'SEARXNG_URL', description: 'Base URL of the self-hosted SearXNG instance.', required: true }
    ]
  },
  {
    id: 'brave-search',
    name: 'brave-search',
    displayName: 'Brave Search',
    description: 'Search the web using Brave Search API for fast and privacy-respecting results.',
    type: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-brave-search'],
    env: {
      BRAVE_API_KEY: 'your-brave-api-key',
    },
    notes: 'Get API key from Brave Search API portal. Free tier available with rate limits.',
    documentationUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/brave-search',
    category: 'Search',
    icon: '🦁',
    tags: ['api', 'privacy', 'web'],
    runtime: 'node',
    homepage: 'https://github.com/modelcontextprotocol/servers',
    variables: [
      { key: 'BRAVE_API_KEY', description: 'Brave Search API Key.', required: true }
    ]
  },
  {
    id: 'windows-cli',
    name: 'windows-cli',
    displayName: 'Windows CLI',
    description: 'Execute Windows command-line tools, scripts, and PowerShell commands.',
    type: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-windows-cli'],
    notes: 'Runs commands in Windows environment. Be cautious with system-level operations.',
    documentationUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/windows-cli',
    category: 'System',
    icon: '🪟',
    tags: ['cmd', 'powershell', 'windows'],
    runtime: 'node',
    homepage: 'https://github.com/modelcontextprotocol/servers',
    variables: []
  },
  {
    id: 'tavily-search',
    name: 'tavily-search',
    displayName: 'Tavily Search',
    description: 'AI-optimized search engine specifically designed for LLM agents. Provides real-time web data.',
    type: 'stdio',
    command: 'npx',
    args: ['-y', '@tavily/mcp-server'],
    env: {
      TAVILY_API_KEY: 'your-tavily-api-key',
    },
    notes: 'Tavily is optimized for RAG and AI agents. Sign up at tavily.com for an API key.',
    documentationUrl: 'https://github.com/tavily/mcp-server',
    category: 'Search',
    icon: '🔍',
    tags: ['ai', 'rag', 'research'],
    runtime: 'node',
    homepage: 'https://tavily.com',
    variables: [
      {
        key: 'TAVILY_API_KEY',
        description: 'API key for Tavily Search.',
        required: true,
        example: 'tvly-xxxxxxxxxxxxx'
      }
    ]
  },
  {
    id: 'everything',
    name: 'everything',
    displayName: 'Everything Search',
    description: 'Integrates with "Everything" search engine for ultra-fast local file indexing on Windows.',
    type: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-everything'],
    env: {
      EVERYTHING_HOST: '127.0.0.1',
      EVERYTHING_PORT: '9999',
    },
    notes: 'Requires "Everything" software running with the ETP/HTTP server enabled on port 9999.',
    documentationUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/everything',
    category: 'System',
    icon: '⚡',
    tags: ['search', 'windows', 'local', 'file-indexing'],
    runtime: 'node',
    homepage: 'https://www.voidtools.com/',
    variables: [
      {
        key: 'EVERYTHING_HOST',
        description: 'Host address where the Everything HTTP server is listening.',
        required: false,
        default: '127.0.0.1'
      },
      {
        key: 'EVERYTHING_PORT',
        description: 'Port number for the Everything HTTP server.',
        required: false,
        default: '9999'
      }
    ]
  },
  {
    id: 'kubernetes',
    name: 'kubernetes',
    displayName: 'Kubernetes',
    description: 'Interact with Kubernetes clusters to manage pods, services, and deployments.',
    type: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-k8s'],
    env: {
      KUBECONFIG: '~/.kube/config',
    },
    notes: 'Ensure kubectl is configured locally or KUBECONFIG points to a valid config file.',
    documentationUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/k8s',
    category: 'DevOps',
    icon: '☸️',
    tags: ['k8s', 'containers', 'orchestration'],
    runtime: 'node',
    homepage: 'https://github.com/modelcontextprotocol/servers',
    variables: [
      {
        key: 'KUBECONFIG',
        description: 'Path to the kubeconfig file. Defaults to ~/.kube/config if not set.',
        required: false,
        default: '~/.kube/config'
      }
    ]
  },
  {
    id: 'mongodb',
    name: 'mongodb',
    displayName: 'MongoDB',
    description: 'Connect to MongoDB databases for document-oriented data operations and aggregation.',
    type: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-mongodb'],
    env: {
      MONGODB_URI: 'mongodb://localhost:27017',
    },
    notes: 'Supports standard MongoDB connection strings. Atlas or local instances.',
    documentationUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/mongodb',
    category: 'Database',
    icon: '🍃',
    tags: ['nosql', 'document', 'database'],
    runtime: 'node',
    homepage: 'https://github.com/modelcontextprotocol/servers',
    variables: [
      {
        key: 'MONGODB_URI',
        description: 'Connection string for MongoDB instance.',
        required: true,
        example: 'mongodb+srv://user:password@cluster0.mongodb.net/'
      }
    ]
  },
  {
    id: 'figma',
    name: 'figma',
    displayName: 'Figma',
    description: 'Access Figma files, read components, and inspect design data.',
    type: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-figma'],
    env: {
      FIGMA_ACCESS_TOKEN: 'your-figma-access-token',
      FIGMA_FILE_KEY: 'your-file-key',
    },
    notes: 'Generate a personal access token from Figma account settings. Requires file keys to access specific files.',
    documentationUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/figma',
    category: 'Design',
    icon: '🎨',
    tags: ['design', 'ui', 'collaboration'],
    runtime: 'node',
    homepage: 'https://github.com/modelcontextprotocol/servers',
    variables: [
      {
        key: 'FIGMA_ACCESS_TOKEN',
        description: 'Personal Access Token from Figma.',
        required: true
      },
      {
        key: 'FIGMA_FILE_KEY',
        description: 'The ID of the Figma file to access.',
        required: false,
      }
    ]
  },
  {
    id: 'sequential-thinking',
    name: 'sequential-thinking',
    displayName: 'Sequential Thinking',
    description: 'A server that enables structured chain-of-thought reasoning for complex tasks.',
    type: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-sequential-thinking'],
    env: {},
    notes: 'Does not require API keys. Runs reasoning logic locally.',
    documentationUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/sequential-thinking',
    category: 'AI',
    icon: '🧩',
    tags: ['reasoning', 'logic', 'agent'],
    runtime: 'node',
    homepage: 'https://github.com/modelcontextprotocol/servers',
    variables: []
  },
  {
    id: 'sendgrid',
    name: 'sendgrid',
    displayName: 'SendGrid',
    description: 'Send emails and manage templates via the SendGrid API.',
    type: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-sendgrid'],
    env: {
      SENDGRID_API_KEY: 'your-sendgrid-api-key',
    },
    notes: 'Requires a valid SendGrid API key with "Mail Send" permissions.',
    documentationUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/sendgrid',
    category: 'Communication',
    icon: '📧',
    tags: ['email', 'marketing', 'smtp'],
    runtime: 'node',
    homepage: 'https://github.com/modelcontextprotocol/servers',
    variables: [
      {
        key: 'SENDGRID_API_KEY',
        description: 'API Key for SendGrid.',
        required: true,
        example: 'SG.xxxxx'
      }
    ]
  },
  {
    id: 'spider',
    name: 'spider',
    displayName: 'Spider',
    description: 'Web scraping tool that crawls websites and converts content to LLM-readable markdown.',
    type: 'stdio',
    command: 'npx',
    args: ['-y', '@spider-rw/mcp-server'],
    env: {
      SPIDER_API_KEY: 'your-spider-api-key',
    },
    notes: 'Spider specializes in extracting data from complex web pages.',
    documentationUrl: 'https://github.com/spider-rw/mcp-server',
    category: 'Utility',
    icon: '🕷️',
    tags: ['scraping', 'crawler', 'data-extraction'],
    runtime: 'node',
    homepage: 'https://spider.cloud',
    variables: [
      {
        key: 'SPIDER_API_KEY',
        description: 'API key for Spider.',
        required: true
      }
    ]
  },
];

export default mcpServerTemplates;
