/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

/**
 * @module pages/AdminMCPServers
 * @description MCP Servers Management page for creating, editing, starting, stopping, and monitoring external MCP servers.
 *
 * Features:
 * - List all MCP servers with filtering and search
 * - Create new MCP servers with configuration forms
 * - Edit existing MCP server configurations
 * - Start, stop, and restart server connections
 * - Monitor server health and status in real-time
 * - Test server connectivity
 * - Load server templates for quick setup
 * - Enable/Disable servers dynamically
 * - View server logs and connection history
 * - Interactive documentation and help tooltips
 */

import React, {useCallback, useEffect, useState} from 'react';
import {
  Activity,
  AlertCircle,
  Check,
  Edit,
  ExternalLink,
  Globe,
  HelpCircle,
  Loader2,
  Play,
  Plus,
  RefreshCw,
  Search,
  Server,
  Square,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Wrench,
  ServerCrash,
} from 'lucide-react';
import type {CreateMCPServerRequest, MCPServerResponse, MCPServerTemplate, UpdateMCPServerRequest} from '@/types/api';
import {
  createMCPServer,
  deleteMCPServer,
  getMCPServerTemplates,
  listMCPServers,
  restartMCPServer,
  startMCPServer,
  stopMCPServer,
  testMCPServerConnection,
  updateMCPServer,
} from '@/lib/api';
import * as Select from '@radix-ui/react-select';
import {Button} from '@/components/ui/Button';
import {Input} from '@/components/ui/Input';
import {Textarea} from '@/components/ui/Textarea';
import {Badge} from '@/components/ui/Badge';
import CodeEditor from '@/components/ui/CodeEditor';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import {Alert, AlertDescription, AlertTitle} from '@/components/ui/Alert';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/Card';
import {Label} from '@/components/ui/Label';
import Separator from '@/components/ui/Separator';
import {Popover} from '@/components/ui/Popover';
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from '@/components/ui/Tooltip';
import * as Tabs from '@radix-ui/react-tabs';

// ─── Status Badge Component ────────────────────────────────────────────────

interface StatusBadgeProps {
  status: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({status}) => {
  const getStatusColor = () => {
    switch (status) {
      case 'connected':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'connecting':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'disconnected':
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      case 'error':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'connected':
        return <Check className="w-3 h-3 mr-1"/>;
      case 'connecting':
        return <Loader2 className="w-3 h-3 mr-1 animate-spin"/>;
      case 'disconnected':
        return <Square className="w-3 h-3 mr-1"/>;
      case 'error':
        return <AlertCircle className="w-3 h-3 mr-1"/>;
      default:
        return <Square className="w-3 h-3 mr-1"/>;
    }
  };

  return (
    <Badge variant="outline" className={`${getStatusColor()} font-mono text-xs px-2 py-0.5`}>
      {getStatusIcon()}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
};

// ─── Create/Edit Dialog Component ───────────────────────────────────────────

/**
 * Properties for the CreateEditDialog component.
 */
interface CreateEditDialogProps {
  /**
   * Controls whether the dialog is currently open.
   */
  open: boolean;

  /**
   * Callback function invoked when the dialog's open state changes.
   * @param open - The new open state of the dialog.
   */
  onOpenChange(open: boolean): void;

  /**
   * Flag indicating whether the dialog is in edit mode.
   * If true, the form will populate with existing server data.
   */
  isEditing: boolean;

  /**
   * The MCP server data to edit.
   * If provided, the form fields will be pre-populated with this server's configuration.
   * Optional and can be null if creating a new server.
   */
  server?: UpdateMCPServerRequest | null;

  /**
   * Template data to pre-populate the form when creating a new server.
   * If provided, the form fields will be initialized with this template's configuration.
   * Optional and can be null if starting from scratch.
   */
  templateData?: MCPServerTemplate | null;

  /**
   * Callback function invoked when the user submits the form.
   * @param data - The form data containing the server configuration.
   * @returns A promise that resolves when the save operation is complete.
   */
  onSave(data: any): Promise<void>;
}

const CreateEditDialog: React.FC<CreateEditDialogProps> = (props) => {
  const {open, onOpenChange, isEditing, server, templateData, onSave} = props;

  const [name, setName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'stdio' | 'sse' | 'streamable-http'>('stdio');
  const [command, setCommand] = useState('');
  const [args, setArgs] = useState('[]');
  const [env, setEnv] = useState('{}');
  const [url, setUrl] = useState('');
  const [headers, setHeaders] = useState('{}');
  const [enabled, setEnabled] = useState(false);
  const [timedOut, setTimedOut] = useState(30000);
  const [autoReconnect, setAutoReconnect] = useState(true);
  const [maxReconnectAttempts, setMaxReconnectAttempts] = useState(-1);
  const [reconnectDelay, setReconnectDelay] = useState(5000);
  const [settings, setSettings] = useState('{}');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      if (isEditing && server) {
        setName(server.name);
        setDisplayName(server.displayName);
        setDescription(server.description);
        setType(server.type);
        setCommand(server?.command || '');
        setArgs(JSON.stringify(server.args || [], null, 2));
        setEnv(JSON.stringify(server.env || {}, null, 2));
        setUrl(server.url || '');
        setHeaders(JSON.stringify(server.headers || {}, null, 2));
        setEnabled(server.enabled);
        setTimedOut(server.timeout || 30000);
        setAutoReconnect(server.autoReconnect ?? true);
        setMaxReconnectAttempts(server.maxReconnectAttempts ?? -1);
        setReconnectDelay(server.reconnectDelay ?? 5000);
        setSettings(JSON.stringify(server.settings || {}, null, 2));
      } else if (templateData) {
        setName(templateData.name);
        setDisplayName(templateData.displayName);
        setDescription(templateData.description);
        setType(templateData.type);
        setCommand(templateData.command || '');
        setArgs(JSON.stringify(templateData.args || [], null, 2));
        setEnv(JSON.stringify(templateData.env || {}, null, 2));
        setUrl(templateData.url || '');
        setHeaders(JSON.stringify(templateData.headers || {}, null, 2));
        setEnabled(false);
      } else {
        setName('');
        setDisplayName('');
        setDescription('');
        setType('stdio');
        setCommand('');
        setArgs('[]');
        setEnv('{}');
        setUrl('');
        setHeaders('{}');
        setEnabled(false);
        setTimedOut(30000);
        setAutoReconnect(true);
        setMaxReconnectAttempts(-1);
        setReconnectDelay(5000);
        setSettings('{}');
      }
      setError('');
      setSuccess('');
    }
  }, [open, isEditing, server, templateData]);

  const validateForm = (): boolean => {
    if (!name || !displayName || !description) {
      setError('Name, Display Name, and Description are required');
      return false;
    }

    const nameRegex = /^[a-zA-Z][a-zA-Z0-9_-]*$/;
    if (!nameRegex.test(name)) {
      setError('Name must start with a letter and contain only letters, numbers, underscores, and hyphens');
      return false;
    }

    if (type === 'stdio' && !command) {
      setError('Command is required for stdio server type');
      return false;
    }

    if ((type === 'sse' || type === 'streamable-http') && !url) {
      setError('URL is required for SSE and Streamable HTTP server types');
      return false;
    }

    if (type === 'streamable-http' && url) {
      try {
        new URL(url);
      } catch {
        setError('Invalid URL format');
        return false;
      }
    }

    // Validate JSON fields
    try {
      JSON.parse(args);
    } catch {
      setError('Invalid JSON in Args');
      return false;
    }

    try {
      JSON.parse(env);
    } catch {
      setError('Invalid JSON in Environment Variables');
      return false;
    }

    try {
      JSON.parse(headers);
    } catch {
      setError('Invalid JSON in Headers');
      return false;
    }

    try {
      JSON.parse(settings);
    } catch {
      setError('Invalid JSON in Settings');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    setError('');
    setSuccess('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const data = {
        name,
        displayName,
        description,
        type,
        command: type === 'stdio' ? command : undefined,
        args: JSON.parse(args),
        env: JSON.parse(env),
        url: type === 'sse' || type === 'streamable-http' ? url : undefined,
        headers: JSON.parse(headers),
        enabled,
        timeout: timedOut,
        autoReconnect,
        maxReconnectAttempts,
        reconnectDelay,
        settings: JSON.parse(settings),
      };

      await onSave(data);
      setSuccess(isEditing ? 'Server updated successfully' : 'Server created successfully');

      // Close dialog after success
      setTimeout(() => {
        onOpenChange(false);
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal={true}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Server className="w-5 h-5"/>
            {isEditing ? 'Edit MCP Server' : 'Create MCP Server'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the server configuration. Changes will be applied after restart.'
              : 'Add a new external MCP server to your system.'}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4"/>
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert>
            <Check className="h-4 w-4"/>
            <AlertTitle>Success</AlertTitle>
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 py-4">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                Server Name
                <Popover trigger={() => (
                  <HelpCircle className="ml-1 h-3 w-3 inline cursor-help"/>
                )}>
                  <p className="text-sm">
                    Unique identifier for the server. Must start with a letter and contain only letters, numbers,
                    underscores, and hyphens.
                  </p>
                </Popover>
              </Label>
              <Input
                id="name"
                placeholder="filesystem"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isEditing}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                placeholder="File System Access"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Provides read/write access to the local file system..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">
              Transport Type
              <Popover trigger={() => (
                <HelpCircle className="ml-1 h-3 w-3 inline cursor-help"/>
              )}>
                <div className="space-y-2">
                  <p className="text-sm font-medium">stdio</p>
                  <p className="text-sm text-muted-foreground">
                    Standard input/output for local processes (most common for MCP servers).
                  </p>
                  <Separator/>
                  <p className="text-sm font-medium">sse</p>
                  <p className="text-sm text-muted-foreground">
                    Server-Sent Events over HTTP for remote servers.
                  </p>
                  <Separator/>
                  <p className="text-sm font-medium">streamable-http</p>
                  <p className="text-sm text-muted-foreground">
                    HTTP with streaming support for bidirectional communication.
                  </p>
                </div>
              </Popover>
            </Label>
            <Select.Root value={type} onValueChange={(v) => setType(v as typeof type)}>
              <Select.Trigger id="type">
                <Select.Value/>
              </Select.Trigger>
              <Select.Content>
                <Select.Item value="stdio">Stdio (Local Process)</Select.Item>
                <Select.Item value="sse">SSE (Server-Sent Events)</Select.Item>
                <Select.Item value="streamable-http">Streamable HTTP</Select.Item>
              </Select.Content>
            </Select.Root>
          </div>

          {/* Transport-specific fields */}
          {type === 'stdio' && (
            <Tabs.Root defaultValue="command" className="w-full">
              <Tabs.List className="grid w-full grid-cols-2">
                <Tabs.Trigger value="command">Command & Args</Tabs.Trigger>
                <Tabs.Trigger value="env">Environment</Tabs.Trigger>
              </Tabs.List>

              <Tabs.Content value="command" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="command">Command</Label>
                  <Input
                    id="command"
                    placeholder="npx"
                    value={command}
                    onChange={(e) => setCommand(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    The executable command (e.g., 'npx', 'node', '/usr/bin/python3')
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="args">Arguments (JSON Array)</Label>
                  <CodeEditor
                    heightClass="h-[200px]"
                    language="json"
                    value={args}
                    onChange={setArgs}
                    editorProps={{
                      placeholder: '["-y", "@modelcontextprotocol/server-filesystem", "/safe/path"]',
                    }}/>
                  <p className="text-xs text-muted-foreground">
                    Command-line arguments as a JSON array
                  </p>
                </div>
              </Tabs.Content>

              <Tabs.Content value="env" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="env">Environment Variables (JSON Object)</Label>
                  <CodeEditor
                    heightClass="h-[250px]"
                    language="json"
                    value={env}
                    onChange={setEnv}
                    editorProps={{
                      placeholder: '{"API_KEY": "your-key", "PORT": "3000"}',
                    }}/>
                  <p className="text-xs text-muted-foreground">
                    Environment variables as a JSON object
                  </p>
                </div>
              </Tabs.Content>
            </Tabs.Root>
          )}

          {(type === 'sse' || type === 'streamable-http') && (
            <Tabs.Root defaultValue="url" className="w-full">
              <Tabs.List className="grid w-full grid-cols-2">
                <Tabs.Trigger value="url">URL</Tabs.Trigger>
                <Tabs.Trigger value="headers">Headers</Tabs.Trigger>
              </Tabs.List>

              <Tabs.Content value="url" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="url">Server URL</Label>
                  <Input
                    id="url"
                    type="url"
                    placeholder="http://localhost:8080/sse"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    HTTP endpoint for the MCP server
                  </p>
                </div>
              </Tabs.Content>

              <Tabs.Content value="headers" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="headers">HTTP Headers (JSON Object)</Label>
                  <Textarea
                    id="headers"
                    placeholder='{"Authorization": "Bearer token", "Content-Type": "application/json"}'
                    value={headers}
                    onChange={(e) => setHeaders(e.target.value)}
                    rows={4}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    HTTP headers as a JSON object
                  </p>
                </div>
              </Tabs.Content>
            </Tabs.Root>
          )}

          {/* Connection Settings */}
          <Separator/>
          <div className="text-sm font-medium">Connection Settings</div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="timeout">Timeout (ms)</Label>
              <Input
                id="timeout"
                type="number"
                value={timedOut}
                onChange={(e) => setTimedOut(parseInt(e.target.value) || 30000)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reconnectDelay">Reconnect Delay (ms)</Label>
              <Input
                id="reconnectDelay"
                type="number"
                value={reconnectDelay}
                onChange={(e) => setReconnectDelay(parseInt(e.target.value) || 5000)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxReconnectAttempts">
              Max Reconnect Attempts
              <Popover trigger={() => (<HelpCircle className="ml-1 h-3 w-3 inline cursor-help"/>)}>
                <p className="text-sm">Set to -1 for unlimited reconnection attempts</p>
              </Popover>
            </Label>
            <Input
              id="maxReconnectAttempts"
              type="number"
              value={maxReconnectAttempts}
              onChange={(e) => setMaxReconnectAttempts(parseInt(e.target.value) || -1)}
            />
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="autoReconnect"
              checked={autoReconnect}
              onChange={(e) => setAutoReconnect(e.target.checked)}
              className="rounded border-gray-300"
            />
            <Label htmlFor="autoReconnect" className="cursor-pointer">Auto-reconnect on failure</Label>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="enabled"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="rounded border-gray-300"
            />
            <Label htmlFor="enabled" className="cursor-pointer">Enable on save</Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="settings">Additional Settings (JSON Object)</Label>
            <CodeEditor
              heightClass="h-[150px]"
              language="json"
              value={settings}
              onChange={setSettings}
              editorProps={{
                placeholder: '{"custom": "setting"}',
              }}/>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin"/>
                Saving...
              </>
            ) : (
              <>
                {isEditing ? <Wrench className="w-4 h-4 mr-2"/> : <Plus className="w-4 h-4 mr-2"/>}
                {isEditing ? 'Update Server' : 'Create Server'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ─── Template Dialog Component ──────────────────────────────────────────────

/**
 * Properties for the TemplateDialog component.
 */
interface TemplateDialogProps {
  /**
   * Controls whether the dialog is currently open.
   */
  open: boolean;

  /**
   * Callback function invoked when the dialog's open state changes.
   * @param open - The new open state of the dialog.
   */
  onOpenChange(open: boolean): void;

  /**
   * Callback function invoked when a template is selected.
   * @param template - The selected MCP server template data.
   */
  onSelectTemplate(template: MCPServerTemplate): void;
}

const TemplateDialog: React.FC<TemplateDialogProps> = (props) => {
  const {open, onOpenChange, onSelectTemplate} = props;

  const [templates, setTemplates] = useState<MCPServerTemplate[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [tagFilter, setTagFilter] = useState<string>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<MCPServerTemplate | null>(null);

  useEffect(() => {
    if (open) {
      fetchTemplates();
      setSearchQuery('');
      setCategoryFilter('all');
      setTagFilter('all');
    }
  }, [open]);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const response = await getMCPServerTemplates();
      setTemplates(response.templates || []);
    } catch (err) {
      console.error('Failed to fetch templates:', err);
    } finally {
      setLoading(false);
    }
  };

  // Extract unique categories and tags
  const categories = React.useMemo(() => {
    const cats = new Set(templates.map(t => t.category).filter(Boolean));
    return ['all', ...Array.from(cats).sort()];
  }, [templates]);

  const tags = React.useMemo(() => {
    const tagSet = new Set<string>();
    templates.forEach(t => t.tags?.forEach(tag => tagSet.add(tag)));
    return ['all', ...Array.from(tagSet).sort()];
  }, [templates]);

  // Get category color for visual indication
  const getCategoryColor = (category?: string) => {
    if (!category) return undefined;
    const colors: Record<string, string> = {
      'Database': 'border-blue-500',
      'Cloud': 'border-purple-500',
      'Development': 'border-green-500',
      'Utility': 'border-gray-500',
      'AI': 'border-orange-500',
      'Social': 'border-pink-500',
      'Storage': 'border-yellow-500',
      'Monitoring': 'border-red-500',
      'Networking': 'border-cyan-500',
      'DevOps': 'border-indigo-500',
    };
    return colors[category] || 'border-muted';
  };

  // Filter templates
  const filteredTemplates = React.useMemo(() => {
    return templates.filter(template => {
      // Search filter - includes tags
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = !searchQuery ||
        template.displayName.toLowerCase().includes(searchLower) ||
        template.description.toLowerCase().includes(searchLower) ||
        template.notes?.toLowerCase().includes(searchLower) ||
        template.category?.toLowerCase().includes(searchLower) ||
        template.tags?.some(tag => tag.toLowerCase().includes(searchLower));

      // Category filter
      const matchesCategory = categoryFilter === 'all' || template.category === categoryFilter;

      // Tag filter
      const matchesTag = tagFilter === 'all' || template.tags?.includes(tagFilter);

      return matchesSearch && matchesCategory && matchesTag;
    });
  }, [templates, searchQuery, categoryFilter, tagFilter]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5"/>
            MCP Server Templates
          </DialogTitle>
          <DialogDescription>
            Choose a pre-configured template to quickly set up a common MCP server
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Search and Filter Bar */}
          <div className="flex flex-col gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground"/>
              <Input
                  placeholder="Search templates (name, description, category, tags, notes)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
            </div>
            <div className="flex gap-2">
              <Select.Root value={categoryFilter} onValueChange={setCategoryFilter}>
                <Select.Trigger className="w-[150px]">
                  <Select.Value placeholder="Category"/>
                </Select.Trigger>
                <Select.Content>
                  {categories.map(cat => (
                    <Select.Item key={cat} value={cat}>
                      {cat === 'all' ? 'All Categories' : cat}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>

              <Select.Root value={tagFilter} onValueChange={setTagFilter}>
                <Select.Trigger className="w-[150px]">
                  <Select.Value placeholder="Tag"/>
                </Select.Trigger>
                <Select.Content>
                  {tags.map(tag => (
                    <Select.Item key={tag} value={tag}>
                      {tag === 'all' ? 'All Tags' : tag}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </div>
          </div>

          {/* Results count */}
          <div className="text-sm text-muted-foreground">
            {filteredTemplates.length} of {templates.length} templates
          </div>

          {/* Templates Grid */}
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin"/>
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Search className="w-12 h-12 mx-auto mb-3 opacity-30"/>
              <p>No templates found matching your filters</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredTemplates.map((template) => (
                <Popover
                  trigger={() => (
                    <Card
                      className={`cursor-pointer hover:bg-accent/50 transition-colors border-l-4 ${getCategoryColor(template.category)}`}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2">
                              {template.icon && <span className="text-2xl">{template.icon}</span>}
                              <CardTitle className="text-lg">{template.displayName}</CardTitle>
                            </div>
                            <CardDescription className="line-clamp-2">
                              {template.description}
                            </CardDescription>
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            <Badge variant="secondary">{template.type}</Badge>
                            {template.category && (
                              <Badge variant="outline">{template.category}</Badge>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-1.5">
                          {template.tags?.map(tag => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  key={template.id}
                  open={selectedTemplate?.id === template.id}
                  onOpenChange={(open) => {
                    if (open) {
                      setSelectedTemplate(template);
                    } else {
                      setSelectedTemplate(null);
                    }
                  }}
                >
                  <div className="space-y-3">
                    {template.icon && (
                      <div className="text-4xl text-center">{template.icon}</div>
                    )}
                    <div>
                      <h4 className="font-semibold text-base">{template.displayName}</h4>
                      {template.category && (
                        <Badge variant="outline" className="mt-1">{template.category}</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{template.description}</p>
                    {template.notes && (
                      <div>
                        <h5 className="font-medium text-sm mb-1">Notes</h5>
                        <p className="text-xs text-muted-foreground">{template.notes}</p>
                      </div>
                    )}
                    {template.tags && template.tags.length > 0 && (
                      <div>
                        <h5 className="font-medium text-sm mb-1">Tags</h5>
                        <div className="flex flex-wrap gap-1">
                          {template.tags.map(tag => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {template.variables && template.variables.length > 0 && (
                      <div>
                        <h5 className="font-medium text-sm mb-1">Variables</h5>
                        <div className="space-y-1">
                          {template.variables.map((variable, idx) => (
                            <div key={idx} className="text-xs">
                              <span className="font-mono font-semibold">{variable.key}</span>
                              {variable.required && (
                                <span className="text-red-500 ml-1">*</span>
                              )}
                              {variable.description && (
                                <p className="text-muted-foreground">{variable.description}</p>
                              )}
                              {variable.example && (
                                <code className="bg-muted px-1 rounded text-[10px]">{variable.example}</code>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="flex gap-2 pt-2">
                      {template.documentationUrl && (
                        <a
                          href={template.documentationUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="flex-1 text-center text-xs text-blue-500 hover:underline flex items-center justify-center gap-1"
                        >
                          Docs <ExternalLink className="w-3 h-3"/>
                        </a>
                      )}
                      {template.homepage && (
                        <a
                          href={template.homepage}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="flex-1 text-center text-xs text-blue-500 hover:underline flex items-center justify-center gap-1"
                        >
                          Homepage <ExternalLink className="w-3 h-3"/>
                        </a>
                      )}
                    </div>
                    <Button
                      className="w-full"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectTemplate(template);
                        onOpenChange(false);
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2"/>
                      Use Template
                    </Button>
                  </div>
                </Popover>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ─── Health Check Dialog ────────────────────────────────────────────────────

// ─── Health Check Dialog ────────────────────────────────────────────────────

/**
 * Properties for the HealthDialog component.
 */
interface HealthDialogProps {
  /**
   * Controls whether the dialog is currently open.
   */
  open: boolean;

  /**
   * Callback function invoked when the dialog's open state changes.
   * @param open - The new open state of the dialog.
   */
  onOpenChange(open: boolean): void;

  /**
   * The MCP server data to display and perform health checks on.
   * If null or undefined, the dialog will not render content.
   */
  server?: MCPServerResponse | null;
}

const HealthDialog: React.FC<HealthDialogProps> = ({open, onOpenChange, server}) => {
  const [checking, setChecking] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; status?: string } | null>(null);

  const runHealthCheck = async () => {
    if (!server) return;

    setChecking(true);
    setTestResult(null);

    try {
      const result = await testMCPServerConnection(server.id);
      setTestResult(result);
    } catch (err) {
      setTestResult({
        success: false,
        message: err instanceof Error ? err.message : 'Health check failed',
      });
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    if (open) {
      runHealthCheck();
    }
    // eslint-disable-next-line
  }, [open]);

  if (!server) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5"/>
            Server Health Check
          </DialogTitle>
          <DialogDescription>
            Testing connectivity for {server.displayName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">{server.name}</CardTitle>
              <CardDescription>Type: {server.type}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Status:</span>
                  <div className="mt-1"><StatusBadge status={server.status}/></div>
                </div>
                <div>
                  <span className="text-muted-foreground">Connections:</span>
                  <div className="mt-1">{server.connectionCount} successful</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Failures:</span>
                  <div className="mt-1">{server.failureCount}</div>
                </div>
                {server.lastConnectedAt && (
                  <div>
                    <span className="text-muted-foreground">Last Connected:</span>
                    <div className="mt-1">
                      {new Date(server.lastConnectedAt).toLocaleString()}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {checking && (
            <Alert>
              <Loader2 className="h-4 w-4 animate-spin"/>
              <AlertDescription>Running health check...</AlertDescription>
            </Alert>
          )}

          {testResult && (
            <Alert variant={testResult.success ? 'default' : 'destructive'}>
              {testResult.success ? (
                <Check className="h-4 w-4"/>
              ) : (
                <AlertCircle className="h-4 w-4"/>
              )}
              <AlertTitle>{testResult.success ? 'Success' : 'Failed'}</AlertTitle>
              <AlertDescription>
                {testResult.message}
                {testResult.status && (
                  <div className="mt-2">
                    <StatusBadge status={testResult.status}/>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {!checking && (
            <Button onClick={runHealthCheck} variant="secondary">
              <RefreshCw className="w-4 h-4 mr-2"/>
              Re-run Test
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ─── Main Page Component ────────────────────────────────────────────────────

/**
 * Main AdminMCPServers page component.
 */
const AdminMCPServers: React.FC = () => {
  const [servers, setServers] = useState<MCPServerResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  // Search and filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [enabledFilter, setEnabledFilter] = useState<'all' | 'enabled' | 'disabled'>('all');

  // Dialogs
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [healthDialogOpen, setHealthDialogOpen] = useState(false);
  const [templateData, setTemplateData] = useState<MCPServerTemplate | null>(null);

  // Selected server for operations
  const [selectedServer, setSelectedServer] = useState<MCPServerResponse | null>(null);

  // Operation states
  const [operatingServerId, setOperatingServerId] = useState<number | null>(null);
  const [deletingServerId, setDeletingServerId] = useState<number | null>(null);

  // Fetch servers
  const fetchServers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await listMCPServers();
      setServers(response.servers || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load servers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchServers();

    // Auto-refresh every 5 seconds
    const interval = setInterval(fetchServers, 5000);
    return () => clearInterval(interval);
  }, [fetchServers]);

  // Filter servers
  const filteredServers = servers.filter((server) => {
    const matchesSearch = !searchQuery ||
      server.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      server.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      server.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || server.status === statusFilter;

    const matchesEnabled = enabledFilter === 'all' ||
      (enabledFilter === 'enabled' && server.enabled) ||
      (enabledFilter === 'disabled' && !server.enabled);

    return matchesSearch && matchesStatus && matchesEnabled;
  });

  // Statistics
  const totalServers = servers.length;
  const connectedServers = servers.filter(s => s.status === 'connected').length;
  const disconnectedServers = servers.filter(s => s.status === 'disconnected').length;
  const errorServers = servers.filter(s => s.status === 'error').length;

  // Handlers
  const handleCreate = () => {
    setTemplateData(null);
    setCreateDialogOpen(true);
  };

  const handleEdit = (server: MCPServerResponse) => {
    setSelectedServer(server);
    setEditDialogOpen(true);
  };

  const handleSelectTemplate = (template: MCPServerTemplate) => {
    setTemplateData(template);
    setTemplateDialogOpen(false);
    setCreateDialogOpen(true);
  };

  const handleSave = async (data: UpdateMCPServerRequest) => {
    if (editDialogOpen && selectedServer) {
      // Update existing
      const updateData: Partial<UpdateMCPServerRequest> = {
        displayName: data.displayName,
        description: data.description,
        type: data.type,
        command: data.command,
        args: data.args,
        env: data.env,
        url: data.url,
        headers: data.headers,
        timeout: data.timeout,
        autoReconnect: data.autoReconnect,
        maxReconnectAttempts: data.maxReconnectAttempts,
        reconnectDelay: data.reconnectDelay,
        settings: data.settings,
      };
      await updateMCPServer(selectedServer.id, updateData as UpdateMCPServerRequest);
      setEditDialogOpen(false);
      setSelectedServer(null);
      setSuccessMessage('Server updated successfully');
    } else {
      // Create new
      await createMCPServer(data as CreateMCPServerRequest);
      setCreateDialogOpen(false);
      setSuccessMessage('Server created successfully');
    }
    fetchServers();

    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleStart = async (server: MCPServerResponse) => {
    setOperatingServerId(server.id);
    try {
      await startMCPServer(server.id);
      setSuccessMessage(`Started ${server.displayName}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start server');
    } finally {
      setOperatingServerId(null);
      setTimeout(() => setSuccessMessage(''), 3000);
      fetchServers();
    }
  };

  const handleStop = async (server: MCPServerResponse) => {
    setOperatingServerId(server.id);
    try {
      await stopMCPServer(server.id);
      setSuccessMessage(`Stopped ${server.displayName}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop server');
    } finally {
      setOperatingServerId(null);
      setTimeout(() => setSuccessMessage(''), 3000);
      fetchServers();
    }
  };

  const handleRestart = async (server: MCPServerResponse) => {
    setOperatingServerId(server.id);
    try {
      await restartMCPServer(server.id);
      setSuccessMessage(`Restarted ${server.displayName}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to restart server');
    } finally {
      setOperatingServerId(null);
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  };

  const handleDelete = async (server: MCPServerResponse) => {
    if (!confirm(`Are you sure you want to delete "${server.displayName}"?`)) {
      return;
    }

    setDeletingServerId(server.id);
    try {
      await deleteMCPServer(server.id);
      setSuccessMessage(`Deleted ${server.displayName}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete server');
    } finally {
      setDeletingServerId(null);
      setTimeout(() => setSuccessMessage(''), 3000);
      fetchServers();
    }
  };

  const handleHealthCheck = (server: MCPServerResponse) => {
    setSelectedServer(server);
    setHealthDialogOpen(true);
  };

  const handleEnableToggle = async (server: MCPServerResponse) => {
    try {
      const updateData = {enabled: !server.enabled} as UpdateMCPServerRequest;
      await updateMCPServer(server.id, updateData);
      setSuccessMessage(`${!server.enabled ? 'Enabled' : 'Disabled'} ${server.displayName}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle server');
    } finally {
      setTimeout(() => setSuccessMessage(''), 3000);
      fetchServers();
    }
  };

  return (
    <TooltipProvider>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <ServerCrash className="w-8 h-8"/>
              MCP Servers
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage external Model Context Protocol server connections
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setTemplateDialogOpen(true)}>
              <Globe className="w-4 h-4 mr-2"/>
              Templates
            </Button>
            <Button onClick={handleCreate}>
              <Plus className="w-4 h-4 mr-2"/>
              Add Server
            </Button>
          </div>
        </div>

        {/* Success/Error Messages */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4"/>
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {successMessage && (
          <Alert>
            <Check className="h-4 w-4"/>
            <AlertTitle>Success</AlertTitle>
            <AlertDescription>{successMessage}</AlertDescription>
          </Alert>
        )}

        {/* Statistics */}
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Servers</CardTitle>
              <Server className="w-4 h-4 text-muted-foreground"/>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalServers}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Connected</CardTitle>
              <Check className="w-4 h-4 text-green-500"/>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">{connectedServers}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Disconnected</CardTitle>
              <Square className="w-4 h-4 text-gray-500"/>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-500">{disconnectedServers}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Errors</CardTitle>
              <AlertCircle className="w-4 h-4 text-red-500"/>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">{errorServers}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground"/>
                <Input
                  placeholder="Search servers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>

              <Select.Root value={statusFilter} onValueChange={setStatusFilter}>
                <Select.Trigger className="w-[150px]">
                  <Select.Value placeholder="Status"/>
                </Select.Trigger>
                <Select.Content>
                  <Select.Item value="all">All Status</Select.Item>
                  <Select.Item value="connected">Connected</Select.Item>
                  <Select.Item value="connecting">Connecting</Select.Item>
                  <Select.Item value="disconnected">Disconnected</Select.Item>
                  <Select.Item value="error">Error</Select.Item>
                </Select.Content>
              </Select.Root>

              <Select.Root value={enabledFilter} onValueChange={(v) => setEnabledFilter(v as any)}>
                <Select.Trigger className="w-[150px]">
                  <Select.Value placeholder="Enabled"/>
                </Select.Trigger>
                <Select.Content>
                  <Select.Item value="all">All</Select.Item>
                  <Select.Item value="enabled">Enabled</Select.Item>
                  <Select.Item value="disabled">Disabled</Select.Item>
                </Select.Content>
              </Select.Root>
            </div>
          </CardHeader>
        </Card>

        {/* Server List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin"/>
          </div>
        ) : filteredServers.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Server className="w-12 h-12 mx-auto text-muted-foreground mb-4"/>
              <h3 className="text-lg font-medium">No servers found</h3>
              <p className="text-muted-foreground">
                {searchQuery || statusFilter !== 'all' || enabledFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Create your first MCP server to get started'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredServers.map((server) => (
              <Card key={server.id} className={server.enabled ? '' : 'opacity-50'}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">{server.displayName}</CardTitle>
                        <StatusBadge status={server.status}/>
                        {server.enabled ? (
                          <Badge variant="secondary">Enabled</Badge>
                        ) : (
                          <Badge variant="outline" className="text-gray-500">Disabled</Badge>
                        )}
                      </div>
                      <CardDescription className="line-clamp-1">
                        {server.description}
                      </CardDescription>
                      <div className="text-xs text-muted-foreground font-mono">
                        {server.name}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Enable/Disable Toggle */}
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEnableToggle(server)}
                              className="h-8 w-8"
                            >
                              {server.enabled ? (
                                <ToggleRight className="h-4 w-4"/>
                              ) : (
                                <ToggleLeft className="h-4 w-4"/>
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {server.enabled ? 'Disable' : 'Enable'}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      {/* Start Button */}
                      {server.status !== 'connected' && server.enabled && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleStart(server)}
                                disabled={operatingServerId === server.id}
                              >
                                {operatingServerId === server.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin"/>
                                ) : (
                                  <Play className="w-4 h-4"/>
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Start</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}

                      {/* Stop Button */}
                      {server.status === 'connected' && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleStop(server)}
                                disabled={operatingServerId === server.id}
                              >
                                {operatingServerId === server.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin"/>
                                ) : (
                                  <Square className="w-4 h-4"/>
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Stop</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}

                      {/* Restart Button */}
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRestart(server)}
                              disabled={operatingServerId === server.id}
                            >
                              {operatingServerId === server.id ? (
                                <Loader2 className="w-4 h-4 animate-spin"/>
                              ) : (
                                <RefreshCw className="w-4 h-4"/>
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Restart</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      {/* Health Check Button */}
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleHealthCheck(server)}
                            >
                              <Activity className="w-4 h-4"/>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Health Check</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      {/* Edit Button */}
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(server)}
                            >
                              <Edit className="w-4 h-4"/>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Edit</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      {/* Delete Button */}
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(server)}
                              disabled={deletingServerId === server.id || server.status === 'connected'}
                              className={server.status === 'connected' ? 'text-muted-foreground' : ''}
                            >
                              {deletingServerId === server.id ? (
                                <Loader2 className="w-4 h-4 animate-spin"/>
                              ) : (
                                <Trash2 className="w-4 h-4"/>
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {server.status === 'connected' ? 'Stop server first' : 'Delete'}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                </CardHeader>

                <Separator/>

                <CardContent className="pt-3">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Type:</span>
                      <div className="font-medium">{server.type}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Connections:</span>
                      <div className="font-medium">{server.connectionCount}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Failures:</span>
                      <div className="font-medium">{server.failureCount}</div>
                    </div>
                    {server.lastConnectedAt && (
                      <div>
                        <span className="text-muted-foreground">Last Connected:</span>
                        <div className="font-medium">
                          {new Date(server.lastConnectedAt).toLocaleDateString()}
                        </div>
                      </div>
                    )}
                  </div>

                  {server.lastError && (
                    <Alert variant="destructive" className="mt-3">
                      <AlertCircle className="h-4 w-4"/>
                      <AlertTitle>Error</AlertTitle>
                      <AlertDescription className="line-clamp-2">{server.lastError}</AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Dialogs */}
        <CreateEditDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          isEditing={false}
          templateData={templateData}
          onSave={handleSave}
        />

        <CreateEditDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          isEditing={true}
          server={selectedServer}
          onSave={handleSave}
        />

        <TemplateDialog
          open={templateDialogOpen}
          onOpenChange={setTemplateDialogOpen}
          onSelectTemplate={handleSelectTemplate}
        />

        <HealthDialog
          open={healthDialogOpen}
          onOpenChange={setHealthDialogOpen}
          server={selectedServer}
        />
      </div>
    </TooltipProvider>
  );
};

export default AdminMCPServers;
