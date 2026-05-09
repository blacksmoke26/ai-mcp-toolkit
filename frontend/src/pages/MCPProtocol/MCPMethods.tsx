/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

/**
 * @module pages/MCPMethods
 * @description Comprehensive MCP methods browser and explorer.
 *
 * Dynamically fetches and displays all available MCP methods from the server
 * with descriptions, parameters, and categorized organization.
 *
 * Features:
 * - Dynamic method listing from /mcp/available-methods
 * - Category-based filtering (tools, resources, prompts, logging, system)
 * - Search functionality
 * - Copy-to-clipboard for method names
 * - Request template generation for each method
 * - Method detail expansion
 * - Statistics about method categories
 */

import * as React from 'react';
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  ArrowRight,
  BookOpen,
  Bot,
  Check,
  ChevronDown,
  ChevronRight,
  Code,
  Copy,
  Database,
  Eye,
  FileText,
  Filter,
  Layers,
  MessageSquare,
  RefreshCw,
  Search,
  Settings,
  Terminal,
  Zap,
} from 'lucide-react';
import {Badge} from '@/components/ui/Badge';
import {Input} from '@/components/ui/Input';
import {Button} from '@/components/ui/Button';
import {Separator} from '@/components/ui/Separator';
import {Alert, AlertDescription, AlertTitle} from '@/components/ui/Alert';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/Card';
import type {McpMethodDescription} from '@/types/api';
import {useMcpProtocol} from '@/hooks/useMcpProtocol';
import {generateMethodTemplate, isMethodNotification, methodRequiresParams, formatRelative} from './utils';

// ======================== Constants ========================

/** Category definitions for method categorization */
const METHOD_CATEGORIES = [
  {id: 'all', label: 'All Methods', icon: <BookOpen className="h-4 w-4"/>, color: 'text-primary'},
  {id: 'tools', label: 'Tools', icon: <Zap className="h-4 w-4"/>, color: 'text-blue-500'},
  {id: 'resources', label: 'Resources', icon: <Database className="h-4 w-4"/>, color: 'text-green-500'},
  {id: 'prompts', label: 'Prompts', icon: <FileText className="h-4 w-4"/>, color: 'text-purple-500'},
  {id: 'logging', label: 'Logging', icon: <Terminal className="h-4 w-4"/>, color: 'text-orange-500'},
  {id: 'system', label: 'System', icon: <Settings className="h-4 w-4"/>, color: 'text-cyan-500'},
  {id: 'notifications', label: 'Notifications', icon: <MessageSquare className="h-4 w-4"/>, color: 'text-pink-500'},
  {id: 'server', label: 'Server', icon: <Bot className="h-4 w-4"/>, color: 'text-indigo-500'},
] as const;

/** Method pattern to category mapping */
const METHOD_CATEGORY_MAP: Record<string, string> = {
  'tools/': 'tools',
  'resources/': 'resources',
  'prompts/': 'prompts',
  'logging/': 'logging',
  'notifications/': 'notifications',
  'initialize': 'server',
  'ping': 'system',
  'shutdown': 'system',
  'supported': 'server',
  'capabilities': 'server',
};

/** Default method name for templates */
const DEFAULT_METHOD_NAME = 'tools/list';

// ======================== Types ========================

/** Extended method with computed category and properties */
interface ExtendedMethod extends McpMethodDescription {
  category: string;
  icon: React.ReactNode;
  isNotification: boolean;
  requiresParams: boolean;
  color: string;
}

/** Search filter state */
interface FilterState {
  category: string;
  searchQuery: string;
}

// ======================== Helpers ========================

/** Determine the category of a method name */
const getMethodCategory = (methodName: string): string => {
  for (const [pattern, category] of Object.entries(METHOD_CATEGORY_MAP)) {
    if (methodName.toLowerCase().includes(pattern.toLowerCase())) {
      return category;
    }
  }
  return 'system';
};

/** Get icon for a method category */
const getMethodIcon = (category: string): React.ReactNode => {
  const iconMap: Record<string, React.ReactNode> = {
    tools: <Zap className="h-4 w-4"/>,
    resources: <Database className="h-4 w-4"/>,
    prompts: <FileText className="h-4 w-4"/>,
    logging: <Terminal className="h-4 w-4"/>,
    notifications: <MessageSquare className="h-4 w-4"/>,
    server: <Bot className="h-4 w-4"/>,
    system: <Settings className="h-4 w-4"/>,
  };
  return iconMap[category] || <Eye className="h-4 w-4"/>;
};


// ======================== Sub-Components ========================

/**
 * CopyButton is a small button that copies text on click with visual feedback.
 */
interface CopyButtonProps {
  text: string;
  className?: string;
}

const CopyButton = ({text, className}: CopyButtonProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [text]);

  return (
    <Button
      variant="ghost"
      size="sm"
      className={className}
      onClick={handleCopy}
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-green-500"/>
      ) : (
        <Copy className="h-3.5 w-3.5"/>
      )}
    </Button>
  );
};

/**
 * MethodCard displays a single method with its details in a collapsible card.
 */
interface MethodCardProps {
  method: ExtendedMethod;
  index: number;
}

const MethodCard: React.FC<MethodCardProps> = ({method, index}) => {
  const [expanded, setExpanded] = useState(false);
  const [template, setTemplate] = useState('');

  useEffect(() => {
    if (expanded) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTemplate(generateMethodTemplate(method));
    }
  }, [expanded, method]);

  return (
    <div className="border rounded-lg transition-all hover:border-primary/30">
      <button
        className="w-full text-left p-4 hover:bg-muted/30 transition-colors flex items-start gap-3"
        onClick={() => setExpanded(!expanded)}
      >
        <div className={`p-1.5 rounded-md bg-muted/60 ${method.color}`}>
          {method.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono font-semibold text-sm text-primary">
              {method.method}
            </span>
            <Badge variant="outline" className="text-xs">{method.category}</Badge>
            {method.isNotification && (
              <Badge variant="warning" className="text-xs">Notification</Badge>
            )}
            {!method.isNotification && (
              <Badge variant="secondary" className="text-xs">Request/Response</Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
            {method.description}
          </p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <CopyButton
            text={method.method}
            className="h-7 w-7 p-0"
          />
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground"/>
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground"/>
          )}
        </div>
      </button>

      {expanded && (
        <div className="border-t bg-muted/20 p-4 space-y-3">
          {/* Description */}
          <div className="space-y-1">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Description
            </h4>
            <p className="text-sm">{method.description}</p>
          </div>

          <Separator/>

          {/* Parameters */}
          <div className="space-y-1">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Expected Parameters
            </h4>
            <div className="p-2 rounded-md border bg-muted/30">
              <code className="text-xs font-mono">{method.params}</code>
            </div>
          </div>

          {/* JSON-RPC Template */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                JSON-RPC Template
              </h4>
              <CopyButton text={template} className="h-6 w-6 p-0"/>
            </div>
            <div className="rounded-lg border bg-muted/40 p-3">
              <pre className="text-xs font-mono overflow-x-auto">
                {template}
              </pre>
            </div>
          </div>

          {/* Visual indicator */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <ArrowRight className="h-3 w-3"/>
              <span>Direction: {method.isNotification ? 'Outbound' : 'Bidirectional'}</span>
            </div>
            <div className="flex items-center gap-1">
              <Layers className="h-3 w-3"/>
              <span>Category: {method.category}</span>
            </div>
            <div className="flex items-center gap-1">
              <Code className="h-3 w-3"/>
              <span>Index: #{index + 1}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * CategoryStats displays the count of methods per category in a compact bar format.
 */
interface CategoryStatsProps {
  methods: ExtendedMethod[];
  activeCategory: string;

  onCategoryChange(category: string): void;
}

const CategoryStats: React.FC<CategoryStatsProps> = ({methods, activeCategory, onCategoryChange}) => {
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    methods.forEach(m => {
      counts[m.category] = (counts[m.category] || 0) + 1;
    });
    return counts;
  }, [methods]);

  const totalCount = methods.length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Categories</span>
        <Badge variant="secondary" className="text-xs">
          {totalCount} total
        </Badge>
      </div>
      <div className="space-y-1.5">
        {METHOD_CATEGORIES.filter(c => c.id !== 'all').map(cat => {
          const count = categoryCounts[cat.id] || 0;
          const isActive = activeCategory === cat.id;
          return (
            <div
              key={cat.id}
              className={`flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors ${
                isActive ? 'bg-primary/10 border border-primary/30' : 'hover:bg-muted/30'
              }`}
              onClick={() => onCategoryChange(cat.id)}
            >
              <div className={`${cat.color}`}>{cat.icon}</div>
              <span className="text-xs font-medium">{cat.label}</span>
              <Badge variant="outline" className="text-xs ml-auto">
                {count}
              </Badge>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/**
 * SearchBar provides a search input with icon.
 */
interface SearchBarProps {
  value: string;
  placeholder?: string;

  onChange(value: string): void;
}

const SearchBar: React.FC<SearchBarProps> = ({value, onChange, placeholder}) => (
  <div className="relative">
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
    <Input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder || 'Search methods...'}
      className="pl-9"
    />
    {value && (
      <button
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        onClick={() => onChange('')}
      >
        <X className="h-4 w-4"/>
      </button>
    )}
  </div>
);

// Inline X component for clearing search
const X = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M18 6 6 18"/>
    <path d="m6 6 12 12"/>
  </svg>
);

// ======================== Main Component ========================

/**
 * MCPMethods provides a comprehensive browser and explorer for MCP methods.
 *
 * Features:
 * - Dynamic method listing from the server
 * - Category-based organization and filtering
 * - Real-time search
 * - Expandable method cards with JSON-RPC templates
 * - Copy-to-clipboard for method names and templates
 * - Category statistics
 * - Visual indicators for request types (notifications vs bidirectional)
 */
export const MCPMethods = () => {
  const {state, refreshAll} = useMcpProtocol();
  const [filter, setFilter] = useState<FilterState>({
    category: 'all',
    searchQuery: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const methodsRef = useRef<HTMLDivElement>(null);

  // Fetch methods when component mounts
  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // Build extended methods from state
  const extendedMethods = useMemo<ExtendedMethod[]>(() => {
    if (!state.methods?.list) return [];
    return state.methods.list.map(m => ({
      ...m,
      category: getMethodCategory(m.method),
      icon: getMethodIcon(getMethodCategory(m.method)),
      isNotification: isMethodNotification(m.method),
      requiresParams: methodRequiresParams(m.method),
    })) as ExtendedMethod[];
  }, [state.methods]);

  // Filter methods
  const filteredMethods = useMemo(() => {
    return extendedMethods.filter(m => {
      const matchesCategory = filter.category === 'all' || m.category === filter.category;
      const matchesSearch = filter.searchQuery === '' ||
        m.method.toLowerCase().includes(filter.searchQuery.toLowerCase()) ||
        m.description.toLowerCase().includes(filter.searchQuery.toLowerCase()) ||
        m.params.toLowerCase().includes(filter.searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [extendedMethods, filter]);

  // Category counts for the active set
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredMethods.forEach(m => {
      counts[m.category] = (counts[m.category] || 0) + 1;
    });
    return counts;
  }, [filteredMethods]);

  const handleCategoryChange = useCallback((category: string) => {
    setFilter(prev => ({...prev, category}));
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setFilter(prev => ({...prev, searchQuery: value}));
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-blue-500"/>
            MCP Methods Browser
          </h2>
          <p className="text-muted-foreground">
            Browse and explore all available MCP protocol methods
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Method count badge */}
          <Badge variant="secondary" className="text-sm px-3 py-1">
            {filteredMethods.length} of {extendedMethods.length} methods
          </Badge>

          {/* Refresh */}
          <Button
            onClick={() => {
              setLoading(true);
              refreshAll().finally(() => setLoading(false));
            }}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`}/>
            Refresh
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Empty State */}
      {!state.methods && !loading && (
        <Card>
          <CardContent className="flex h-40 items-center justify-center text-muted-foreground">
            <div className="text-center">
              <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-30"/>
              <p className="text-sm">No methods available. Try refreshing.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {loading && (
        <Card>
          <CardContent className="flex h-40 items-center justify-center text-muted-foreground">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 mx-auto mb-3 animate-spin text-primary"/>
              <p className="text-sm">Loading methods...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Methods List */}
      {extendedMethods.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-4">
          {/* Left Column: Search + Categories */}
          <div className="lg:col-span-1 space-y-4">
            {/* Search */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Search Methods</CardTitle>
              </CardHeader>
              <CardContent>
                <SearchBar
                  value={filter.searchQuery}
                  onChange={handleSearchChange}
                  placeholder="Search by name, description..."
                />
              </CardContent>
            </Card>

            {/* Categories */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Filter className="h-4 w-4"/>
                  Categories
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CategoryStats
                  methods={extendedMethods}
                  activeCategory={filter.category}
                  onCategoryChange={handleCategoryChange}
                />
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Method Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-mono font-bold">{extendedMethods.length}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Notifications</span>
                  <span className="font-mono font-bold text-orange-600">
                    {extendedMethods.filter(m => m.isNotification).length}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Bidirectional</span>
                  <span className="font-mono font-bold text-blue-600">
                    {extendedMethods.filter(m => !m.isNotification).length}
                  </span>
                </div>
                <Separator/>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Last Updated</span>
                  <span className="font-mono">
                    {state.methods ? formatRelative('') : '—'}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Method List */}
          <div className="lg:col-span-3" ref={methodsRef}>
            <Card className="h-full">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    Methods
                    <Badge variant="outline" className="ml-2 text-xs">
                      {filteredMethods.length}
                    </Badge>
                  </CardTitle>
                  {filter.category !== 'all' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setFilter(prev => ({...prev, category: 'all'}))}
                    >
                      Clear Filter
                    </Button>
                  )}
                </div>
                <CardDescription>
                  {filter.searchQuery
                    ? `Showing ${filteredMethods.length} methods matching "${filter.searchQuery}"`
                    : filter.category !== 'all'
                      ? `Showing ${filteredMethods.length} ${filter.category} methods`
                      : 'All available MCP methods on this server'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {filteredMethods.length === 0 ? (
                  <div className="flex h-[200px] items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <Search className="h-10 w-10 mx-auto mb-3 opacity-30"/>
                      <p className="text-sm">No methods match your search</p>
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => setFilter({category: 'all', searchQuery: ''})}
                      >
                        Clear filters
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                    {filteredMethods.map((method, index) => (
                      <MethodCard key={method.method} method={method} index={index}/>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Method Categories Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Method Categories</CardTitle>
          <CardDescription>
            Understanding the different types of MCP methods
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            {METHOD_CATEGORIES.filter(c => c.id !== 'all').map(cat => (
              <div key={cat.id} className="flex items-start gap-3 p-3 rounded-lg border bg-muted/20">
                <div className={cat.color}>{cat.icon}</div>
                <div>
                  <h4 className="text-sm font-medium">{cat.label}</h4>
                  <p className="text-xs text-muted-foreground">
                    {cat.id === 'tools' && 'Methods for invoking tools and executing operations'}
                    {cat.id === 'resources' && 'Methods for listing and reading data resources'}
                    {cat.id === 'prompts' && 'Methods for working with prompt templates'}
                    {cat.id === 'logging' && 'Methods for configuring and receiving log messages'}
                    {cat.id === 'notifications' && 'One-way messages that do not expect a response'}
                    {cat.id === 'server' && 'Server lifecycle and initialization methods'}
                    {cat.id === 'system' && 'System-level methods like ping and health checks'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* JSON-RPC Format Reference */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">JSON-RPC 2.0 Request Format</CardTitle>
          <CardDescription>
            Standard format used by all MCP methods
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Request Object</h4>
              <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-xs font-mono">
{`{
  "jsonrpc": "2.0",  // Always "2.0"
  "method": "string", // Method name (required)
  "id": number|string|null, // Request identifier
  "params": object|// Array (optional)
}`}
              </pre>
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Response Object</h4>
              <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-xs font-mono">
{`{
  "jsonrpc": "2.0",  // Always "2.0"
  "result": any,      // Result (success)
  "id": number|string // Must match request ID
}`}
              </pre>
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Error Response</h4>
              <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-xs font-mono">
{`{
  "jsonrpc": "2.0",
  "error": {
    "code": number,
    "message": string,
    "data": any (optional)
  },
  "id": number|string
}`}
              </pre>
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Notification</h4>
              <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-xs font-mono">
{`{
  "jsonrpc": "2.0",
  "method": "string",
  "params": object // optional
  // No "id" field
}`}
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MCPMethods;
