/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

import * as React from 'react';
import {Link, useLocation} from 'react-router-dom';
import {
  Activity,
  MessageSquare,
  Server,
  Wrench,
  Bot,
  Database,
  LayoutDashboard,
  ExternalLink,
  CheckCircle2,
  Sun,
  Moon,
  Zap,
  Info,
  LayoutList,
  Blocks, PocketKnife,
} from 'lucide-react';
import {cn} from '@/lib/utils';
import {Button} from './ui/Button';
import {Badge} from './ui/Badge';
import {useTheme} from '@/context/ThemeContext';

interface NavItem {
  /**
   * The display text for the navigation item.
   * @example "Dashboard"
   */
  label: string;
  /**
   * The URL path the navigation item links to.
   * @example "/"
   */
  href: string;
  /**
   * The Lucide React icon component to render.
   * @example LayoutDashboard
   */
  icon: React.ElementType;
  /**
   * Optional short description explaining the item's purpose.
   * @example "Server status and quick stats"
   */
  description?: string;
  /**
   * Optional badge text to display next to the item.
   * @example "JSON-RPC"
   */
  badge?: string;
}

const navSections: {
  title: string;
  items: NavItem[];
}[] = [
  {
    title: 'Overview',
    items: [
      {
        label: 'Dashboard',
        href: '/',
        icon: LayoutDashboard,
        description: 'Server status and quick stats',
      },
      {
        label: 'Server Info',
        href: '/info',
        icon: Server,
        description: 'Server capabilities and configuration',
      },
    ],
  },
  {
    title: 'Health & Monitoring',
    items: [
      {
        label: 'Health Check',
        href: '/health',
        icon: Activity,
        description: 'Check server health and uptime',
      },
      {
        label: 'Readiness',
        href: '/health/ready',
        icon: CheckCircle2,
        description: 'Detailed readiness probe',
      },
    ],
  },
  {
    title: 'MCP Protocol',
    items: [
      {
        label: 'List Tools',
        href: '/mcp/tools',
        icon: LayoutList,
        description: 'List all available MCP tools',
        badge: 'JSON-RPC',
      },
      {
        label: 'Call Tool',
        href: '/mcp/call',
        icon: Wrench,
        description: 'Execute MCP tools directly',
        badge: 'JSON-RPC',
      },
      {
        label: 'SSE Stream',
        href: '/mcp/sse',
        icon: Bot,
        description: 'Server-Sent Events endpoint',
        badge: 'Streaming',
      },
      {
        label: 'MCP Info',
        href: '/mcp/info',
        icon: Info,
        description: 'Server-Sent Events endpoint',
      },
    ],
  },
  {
    title: 'Chat & Conversations',
    items: [
      {
        label: 'Chat',
        href: '/chat',
        icon: MessageSquare,
        description: 'Interactive chat with agent',
        badge: 'Agent Loop',
      },
      {
        label: 'Stream Chat',
        href: '/chat/stream',
        icon: MessageSquare,
        description: 'Stream chat responses',
        badge: 'SSE',
      },
      {
        label: 'Conversations',
        href: '/chat/conversations',
        icon: Database,
        description: 'Manage conversation history',
      },
    ],
  },
  {
    title: 'Admin',
    items: [
      {
        label: 'Providers',
        href: '/admin/providers',
        icon: Server,
        description: 'Manage LLM providers',
      },
      {
        label: 'Models',
        href: '/admin/models',
        icon: Blocks,
        description: 'Display LLM Models',
      },
      {
        label: 'Tools',
        href: '/admin/tools',
        icon: Wrench,
        description: 'Enable/disable MCP tools',
      },
      {
        label: 'Custom Tools',
        href: '/admin/custom-tools',
        icon: PocketKnife,
        description: 'Custom tools management',
      },
    ],
  },
  {
    title: 'Simulation & Testing',
    items: [
      {
        label: 'Tool Simulator',
        href: '/simulate',
        icon: Zap,
        description: 'Test tools, manage mocks, run scenarios',
        badge: 'Testing',
      },
    ],
  },
];

interface LayoutProps {
  /**
   * The content to be rendered within the layout component.
   * @example <div>Page Content</div>
   */
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({children}) => {
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);
  const {theme, toggleTheme} = useTheme();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-card">
        <div className="flex h-16 items-center px-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="md:hidden mr-2"
          >
            <LayoutDashboard className="h-5 w-5"/>
          </Button>

          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Bot className="h-5 w-5 text-primary-foreground"/>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">MCP Toolkit</h1>
              <p className="text-xs text-muted-foreground">
                Model Context Protocol Testing Interface
              </p>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Badge variant="info">v1.0.0</Badge>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="rounded-full"
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? (
                <Sun className="h-5 w-5"/>
              ) : (
                <Moon className="h-5 w-5"/>
              )}
            </Button>
            <a
              href="http://localhost:3100"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" size="sm" asChild>
                <Link to="http://localhost:3100" target="_blank" rel="noopener noreferrer">
                  Backend: localhost:3100
                  <ExternalLink className="ml-2 h-3 w-3"/>
                </Link>
              </Button>
            </a>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar Navigation */}
        <aside
          className={cn(
            'fixed inset-y-0 left-0 z-40 w-96 transform border-r border-border bg-card transition-transform',
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full',
            'md:relative md:translate-x-0',
          )}
        >
          <nav className="space-y-6 overflow-y-auto p-4 pt-7">
            {navSections.map((section) => (
              <div key={section.title}>
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {section.title}
                </h2>
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const isActive = location.pathname === item.href;
                    const Icon = item.icon;

                    return (
                      <Link key={item.href} to={item.href}>
                        <Button
                          variant={isActive ? 'secondary' : 'ghost'}
                          className={cn(
                            'w-full justify-start gap-3 rounded-lg px-4 py-2.5 text-left transition-all',
                            isActive && 'font-semibold',
                          )}
                        >
                          <Icon className="h-4 w-4"/>
                          <div className="flex flex-col items-start">
                            <span className="text-sm">{item.label}</span>
                            {item.description && (
                              <span className="text-xs text-muted-foreground">
                                {item.description}
                              </span>
                            )}
                          </div>
                          {item.badge && (
                            <Badge variant="info" className="ml-auto">
                              {item.badge}
                            </Badge>
                          )}
                        </Button>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 md:p-6">
          <div className="mx-auto max-w-6xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
