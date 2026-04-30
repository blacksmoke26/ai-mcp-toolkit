/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

import React, {useEffect, useState} from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import {AlertCircle, ArrowDown, Check, Loader2, Plus, Server, Wrench} from 'lucide-react';
import {Alert, AlertDescription, AlertTitle} from '@/components/ui/Alert';
import {Label} from '@/components/ui/Label';
import {Input} from '@/components/ui/Input';
import {Textarea} from '@/components/ui/Textarea';
import Separator from '@/components/ui/Separator';
import * as Tabs from '@radix-ui/react-tabs';
import CodeEditor from '@/components/ui/CodeEditor';
import {Button} from '@/components/ui/Button';
import {Select, SelectContent, SelectItem, SelectTrigger} from '@/components/ui/Select';
import Popover from '@/components/ui/Popover';
import {DocTooltip} from '@/components/ui/Tooltip';
import type {MCPServerTemplate, UpdateMCPServerRequest} from '@/types/api';

/**
 * Properties for the CreateEditDialog component.
 */
export interface CreateEditDialogProps {
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

  /** Unique server identifier used in API calls and internal references. */
  const [name, setName] = useState<string>('');
  /** Human-readable name displayed in the UI. */
  const [displayName, setDisplayName] = useState<string>('');
  /** Brief description of the server's purpose. */
  const [description, setDescription] = useState<string>('');
  /** Transport mechanism for communicating with the server. */
  const [type, setType] = useState<'stdio' | 'sse' | 'streamable-http'>('stdio');
  /** Executable command to run for stdio type servers. */
  const [command, setCommand] = useState<string>('');
  /** Command-line arguments as a JSON string. */
  const [args, setArgs] = useState<string>('[]');
  /** Environment variables as a JSON string. */
  const [env, setEnv] = useState<string>('{}');
  /** HTTP endpoint URL for SSE or streamable-http servers. */
  const [url, setUrl] = useState<string>('');
  /** HTTP headers as a JSON string. */
  const [headers, setHeaders] = useState<string>('{}');
  /** Flag indicating if the server should be enabled after saving. */
  const [enabled, setEnabled] = useState<boolean>(false);
  /** Maximum time in milliseconds to wait for a server response. */
  const [timedOut, setTimedOut] = useState<number>(30000);
  /** Flag indicating whether to automatically reconnect on failure. */
  const [autoReconnect, setAutoReconnect] = useState<boolean>(true);
  /** Maximum number of reconnection attempts before giving up. */
  const [maxReconnectAttempts, setMaxReconnectAttempts] = useState<number>(-1);
  /** Time in milliseconds to wait before attempting to reconnect. */
  const [reconnectDelay, setReconnectDelay] = useState<number>(5000);
  /** Additional custom configuration options as a JSON string. */
  const [settings, setSettings] = useState<string>('{}');
  /** Loading state indicating if a save operation is in progress. */
  const [loading, setLoading] = useState<boolean>(false);
  /** Error message to display if validation or save fails. */
  const [error, setError] = useState<string>('');
  /** Success message to display after a successful save operation. */
  const [success, setSuccess] = useState<string>('');

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      if (isEditing && server) {
        setName(server.name);
        setDisplayName(server.displayName ?? '');
        setDescription(server.description ?? '');
        setType(server.type ?? 'stdio');
        setCommand(server?.command || '');
        setArgs(JSON.stringify(server.args || [], null, 2));
        setEnv(JSON.stringify(server.env || {}, null, 2));
        setUrl(server.url || '');
        setHeaders(JSON.stringify(server.headers || {}, null, 2));
        setEnabled(server.enabled ?? false);
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

    // Validate minimum values
    if (timedOut < 1000) {
      setError('Timeout must be at least 1000ms');
      return false;
    }

    if (reconnectDelay < 100) {
      setError('Reconnect delay must be at least 100ms');
      return false;
    }

    if (maxReconnectAttempts < -1) {
      setError('Max reconnect attempts must be at least -1 (-1 means unlimited)');
      return false;
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
        args: type === 'stdio' ? JSON.parse(args) : undefined,
        env: type === 'stdio' ? JSON.parse(env) : undefined,
        url: type === 'sse' || type === 'streamable-http' ? url : undefined,
        headers: type === 'sse' || type === 'streamable-http' ? JSON.parse(headers) : undefined,
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
                <DocTooltip content={
                  <>
                    <p className="font-medium mb-1">Server Name</p>
                    <p className="text-muted-foreground">
                      A unique identifier for the server. This value is used in API calls and internal references.
                    </p>
                    <ul className="mt-1.5 space-y-1 text-muted-foreground list-disc pl-4">
                      <li>Must start with a letter</li>
                      <li>Only letters, numbers, underscores, and hyphens allowed</li>
                      <li>Example: <code className="bg-muted px-1 rounded">filesystem</code>, <code
                        className="bg-muted px-1 rounded">postgres-db</code></li>
                    </ul>
                  </>
                }/>
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
              <Label htmlFor="displayName">
                Display Name
                <DocTooltip content={
                  <>
                    <p className="font-medium mb-1">Display Name</p>
                    <p className="text-muted-foreground">
                      A human-readable name shown in the UI. This is what users see when selecting or viewing the
                      server.
                    </p>
                    <ul className="mt-1.5 space-y-1 text-muted-foreground list-disc pl-4">
                      <li>Can contain spaces and special characters</li>
                      <li>Example: <code className="bg-muted px-1 rounded">File System</code>, <code
                        className="bg-muted px-1 rounded">PostgreSQL Database</code></li>
                    </ul>
                  </>
                }/>
              </Label>
              <Input
                id="displayName"
                placeholder="File System Access"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">
              Description
              <DocTooltip content={
                <>
                  <p className="font-medium mb-1">Description</p>
                  <p className="text-muted-foreground">
                    A brief description of what this MCP server does. This helps users understand the server's purpose.
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    Tip: Reference examples from MCP server templates for consistency.
                  </p>
                </>
              }/>
            </Label>
            <Textarea
              id="description"
              placeholder="Provides read/write access to the local file system..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div className="space-y-2">

            <Popover
              trigger={(opener) => (
                <span className="cursor-pointer">
                  Transport Type: <span
                  className="text-amber-700">{type === 'stdio' ? 'Stdio' : type === 'sse' ? 'SSE' : 'HTTP'}</span>
                  <ArrowDown width="16" className="relative inline top-[-2px] ml-[2px]"/>
                </span>
              )}
              side="bottom"
              align="start"
              showArrow
              showHeader={false}
              showFooter={false}
              showCloseButton={false}
            >
              <div className="p-3">
                <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
                  <SelectTrigger id="type">
                    {type === 'stdio' ? 'Stdio (Local Process)' : type === 'sse' ? 'SSE (Server-Sent Events)' : 'Streamable HTTP'}
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stdio">Stdio (Local Process)</SelectItem>
                    <SelectItem value="sse">SSE (Server-Sent Events)</SelectItem>
                    <SelectItem value="streamable-http">Streamable HTTP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </Popover>
            <Label htmlFor="type">
              <DocTooltip content={
                <>
                  <p className="font-medium mb-2">Transport Type</p>
                  <div className="space-y-1.5">
                    <div>
                      <p className="font-medium text-foreground">stdio</p>
                      <p className="text-muted-foreground text-[11px]">Local process via standard I/O (most common)</p>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">sse</p>
                      <p className="text-muted-foreground text-[11px]">Server-Sent Events over HTTP (remote)</p>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">streamable-http</p>
                      <p className="text-muted-foreground text-[11px]">HTTP with streaming for bidirectional comms</p>
                    </div>
                  </div>
                </>
              }/>
            </Label>
          </div>

          {/* Transport-specific fields */}
          {type === 'stdio' && (
            <Tabs.Root defaultValue="command" className="w-full">
              <Tabs.List className="grid w-full grid-cols-2 border-b pb-2">
                <Tabs.Trigger value="command" className="border-r">Command & Args</Tabs.Trigger>
                <Tabs.Trigger value="env">Environment</Tabs.Trigger>
              </Tabs.List>

              <Tabs.Content value="command" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="command">
                    Command
                    <DocTooltip content={
                      <>
                        <p className="font-medium mb-1">Command</p>
                        <p className="text-muted-foreground">
                          The executable to run. Common values include:
                        </p>
                        <ul className="mt-1 space-y-0.5 text-muted-foreground list-disc pl-4">
                          <li><code className="bg-muted px-1 rounded">npx</code> - for npm packages</li>
                          <li><code className="bg-muted px-1 rounded">node</code> - for .js files</li>
                          <li><code className="bg-muted px-1 rounded">/usr/bin/python3</code> - for Python scripts</li>
                        </ul>
                      </>
                    }/>
                  </Label>
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
                  <Label htmlFor="args">
                    Arguments (JSON Array)
                    <DocTooltip content={
                      <>
                        <p className="font-medium mb-1">Arguments</p>
                        <p className="text-muted-foreground">
                          Command-line arguments as a JSON array. The last argument often specifies configuration.
                        </p>
                        <pre className="mt-1.5 bg-muted p-1.5 rounded text-[10px] overflow-x-auto">
                          {`["-y", "@modelcontextprotocol/server-filesystem", "/safe/path"]`}
                        </pre>
                      </>
                    }/>
                  </Label>
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
                  <Label htmlFor="env">
                    Environment Variables (JSON Object)
                    <DocTooltip content={
                      <>
                        <p className="font-medium mb-1">Environment Variables</p>
                        <p className="text-muted-foreground">
                          Key-value pairs passed to the process. Common variables from templates include:
                        </p>
                        <ul className="mt-1 space-y-0.5 text-muted-foreground list-disc pl-4">
                          <li><code className="bg-muted px-1 rounded">DATABASE_URL</code> - Database connection</li>
                          <li><code className="bg-muted px-1 rounded">API_KEY</code> - Authentication token</li>
                          <li><code className="bg-muted px-1 rounded">GOOGLE_APPLICATION_CREDENTIALS</code> - GCP auth
                          </li>
                        </ul>
                      </>
                    }/>
                  </Label>
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
              <Tabs.List className="grid w-full grid-cols-2 border-b pb-2">
                <Tabs.Trigger value="url" className="border-r">URL</Tabs.Trigger>
                <Tabs.Trigger value="headers">Headers</Tabs.Trigger>
              </Tabs.List>

              <Tabs.Content value="url" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="url">
                    Server URL
                    <DocTooltip content={
                      <>
                        <p className="font-medium mb-1">Server URL</p>
                        <p className="text-muted-foreground">
                          The HTTP(S) endpoint where the MCP server is listening.
                        </p>
                        <ul className="mt-1 space-y-0.5 text-muted-foreground list-disc pl-4">
                          <li>Must be a valid URL with http:// or https://</li>
                          <li>For local testing: <code
                            className="bg-muted px-1 rounded">http://localhost:3001/sse</code></li>
                          <li>For production: <code className="bg-muted px-1 rounded">https://mcp.example.com/sse</code>
                          </li>
                        </ul>
                      </>
                    }/>
                  </Label>
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
                  <Label htmlFor="headers">
                    HTTP Headers (JSON Object)
                    <DocTooltip content={
                      <>
                        <p className="font-medium mb-1">HTTP Headers</p>
                        <p className="text-muted-foreground">
                          Custom HTTP headers to send with each request. Useful for authentication.
                        </p>
                        <pre className="mt-1.5 bg-muted p-1.5 rounded text-[10px] overflow-x-auto">
                          {`{\n  "Authorization": "Bearer YOUR_TOKEN",\n  "X-API-Key": "your-key"\n}`}
                        </pre>
                      </>
                    }/>
                  </Label>
                  <CodeEditor
                    heightClass="h-[150px]"
                    language="json"
                    value={headers}
                    onChange={setHeaders}
                    editorProps={{
                      placeholder: '{"Authorization": "Bearer token", "Content-Type": "application/json"}',
                    }}/>
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
              <Label htmlFor="timeout">
                Timeout (ms)
                <DocTooltip content={
                  <>
                    <p className="font-medium mb-1">Timeout</p>
                    <p className="text-muted-foreground">
                      Maximum time in milliseconds to wait for a response from the server before timing out.
                    </p>
                    <ul className="mt-1 space-y-0.5 text-muted-foreground list-disc pl-4">
                      <li>Default: <code className="bg-muted px-1 rounded">30000</code> (30 seconds)</li>
                      <li>For slow operations (e.g., file processing), consider increasing to <code
                        className="bg-muted px-1 rounded">60000</code></li>
                      <li>Set to <code className="bg-muted px-1 rounded">0</code> for no timeout (not recommended)</li>
                    </ul>
                  </>
                }/>
              </Label>
              <Input
                id="timeout"
                type="number"
                value={timedOut}
                onChange={(e) => setTimedOut(parseInt(e.target.value) || 30000)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reconnectDelay">
                Reconnect Delay (ms)
                <DocTooltip content={
                  <>
                    <p className="font-medium mb-1">Reconnect Delay</p>
                    <p className="text-muted-foreground">
                      Time to wait before attempting to reconnect after a connection failure.
                    </p>
                    <ul className="mt-1 space-y-0.5 text-muted-foreground list-disc pl-4">
                      <li>Default: <code className="bg-muted px-1 rounded">5000</code> (5 seconds)</li>
                      <li>Shorter delays may cause rapid reconnect attempts</li>
                      <li>Longer delays reduce server load during outages</li>
                    </ul>
                  </>
                }/>
              </Label>
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
              <DocTooltip content={
                <>
                  <p className="font-medium mb-1">Max Reconnect Attempts</p>
                  <p className="text-muted-foreground">
                    Maximum number of reconnection attempts before giving up.
                  </p>
                  <ul className="mt-1 space-y-0.5 text-muted-foreground list-disc pl-4">
                    <li><code className="bg-muted px-1 rounded">-1</code> - Unlimited attempts (default)</li>
                    <li><code className="bg-muted px-1 rounded">0</code> - No automatic reconnection</li>
                    <li><code className="bg-muted px-1 rounded">3-5</code> - Reasonable for production</li>
                  </ul>
                </>
              }/>
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
            <Label htmlFor="enabled" className="cursor-pointer">
              Enable on save
              <DocTooltip content={
                <>
                  <p className="font-medium mb-1">Enable on save</p>
                  <p className="text-muted-foreground">
                    If checked, the server will be automatically started and enabled after saving.
                  </p>
                  <p className="text-muted-foreground">
                    Unchecked servers remain in a stopped state until manually started.
                  </p>
                </>
              }/>
            </Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="settings">
              Additional Settings (JSON Object)
              <DocTooltip content={
                <>
                  <p className="font-medium mb-1">Additional Settings</p>
                  <p className="text-muted-foreground">
                    Custom configuration options specific to your MCP server type.
                  </p>
                  <p className="text-muted-foreground mt-1">
                    Common settings vary by server type. Check the server documentation for available options.
                  </p>
                  <pre className="mt-1.5 bg-muted p-1.5 rounded text-[10px] overflow-x-auto">
                    {`{\n  "customOption": "value",\n  "retryCount": 3\n}`}
                  </pre>
                </>
              }/>
            </Label>
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

export default CreateEditDialog;
