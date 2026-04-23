/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

import type {MCPServerTemplate, UpdateMCPServerRequest} from '@/types/api.ts';
import React, {useEffect, useState} from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import {AlertCircle, Check, HelpCircle, Loader2, Plus, Server, Wrench} from 'lucide-react';
import {Alert, AlertDescription, AlertTitle} from '@/components/ui/Alert';
import {Label} from '@/components/ui/Label';
import {Input} from '@/components/ui/Input';
import {Textarea} from '@/components/ui/Textarea';
import Separator from '@/components/ui/Separator';
import * as Select from '@radix-ui/react-select';
import * as Tabs from '@radix-ui/react-tabs';
import CodeEditor from '@/components/ui/CodeEditor';
import {Button} from '@/components/ui/Button';
import Popover from '@/components/ui/Popover';

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

export default CreateEditDialog;
