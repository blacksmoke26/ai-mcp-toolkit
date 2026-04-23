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
  Globe,
  Loader2,
  Play,
  Plus,
  RefreshCw,
  Search,
  Server,
  ServerCrash,
  Square,
  ToggleLeft,
  ToggleRight,
  Trash2,
} from 'lucide-react';
import type {CreateMCPServerRequest, MCPServerResponse, MCPServerTemplate, UpdateMCPServerRequest} from '@/types/api';
import {
  createMCPServer,
  deleteMCPServer,
  listMCPServers,
  restartMCPServer,
  startMCPServer,
  stopMCPServer,
  updateMCPServer,
} from '@/lib/api';
import * as Select from '@radix-ui/react-select';
import {Button} from '@/components/ui/Button';
import {Input} from '@/components/ui/Input';
import {Badge} from '@/components/ui/Badge';
import {Alert, AlertDescription, AlertTitle} from '@/components/ui/Alert';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/Card';
import Separator from '@/components/ui/Separator';
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from '@/components/ui/Tooltip';
import StatusBadge from './StatusBadge';
import CreateEditDialog from './CreateEditDialog';
import TemplateDialog from './TemplateDialog';
import HealthDialog from './HealthDialog';

/**
 * Main AdminMCPServers page component.
 */
 const AdminMCPServers: React.FC = () => {
   /** List of all MCP servers */
   const [servers, setServers] = useState<MCPServerResponse[]>([]);
   /** Loading state for data fetching */
   const [loading, setLoading] = useState<boolean>(true);
   /** Error message string */
   const [error, setError] = useState<string>('');
   /** Success message string */
   const [successMessage, setSuccessMessage] = useState<string>('');

   // Search and filter
   /** Current search query string */
   const [searchQuery, setSearchQuery] = useState<string>('');
   /** Current status filter value */
   const [statusFilter, setStatusFilter] = useState<string>('all');
   /** Current enabled/disabled filter value */
   const [enabledFilter, setEnabledFilter] = useState<'all' | 'enabled' | 'disabled'>('all');

   // Dialogs
   /** Controls visibility of the Create Server dialog */
   const [createDialogOpen, setCreateDialogOpen] = useState<boolean>(false);
   /** Controls visibility of the Edit Server dialog */
   const [editDialogOpen, setEditDialogOpen] = useState<boolean>(false);
   /** Controls visibility of the Template Selection dialog */
   const [templateDialogOpen, setTemplateDialogOpen] = useState<boolean>(false);
   /** Controls visibility of the Health Check dialog */
   const [healthDialogOpen, setHealthDialogOpen] = useState<boolean>(false);
   /** Data for the selected template to be applied */
   const [templateData, setTemplateData] = useState<MCPServerTemplate | null>(null);

   // Selected server for operations
   /** The server currently selected for editing or viewing details */
   const [selectedServer, setSelectedServer] = useState<MCPServerResponse | null>(null);

   // Operation states
   /** ID of the server currently undergoing a start/stop/restart operation */
   const [operatingServerId, setOperatingServerId] = useState<number | null>(null);
   /** ID of the server currently being deleted */
   const [deletingServerId, setDeletingServerId] = useState<number | null>(null);

   // Fetch servers
   /** Fetches the list of servers from the API */
   const fetchServers = useCallback(async (): Promise<void> => {
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
     const interval: NodeJS.Timeout = setInterval(fetchServers, 5000);
     return () => clearInterval(interval);
   }, [fetchServers]);

   // Filter servers
   /** List of servers filtered by search query, status, and enabled state */
   const filteredServers: MCPServerResponse[] = servers.filter((server: MCPServerResponse) => {
     const matchesSearch: boolean = !searchQuery ||
       server.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
       server.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
       server.description.toLowerCase().includes(searchQuery.toLowerCase());

     const matchesStatus: boolean = statusFilter === 'all' || server.status === statusFilter;

     const matchesEnabled: boolean = enabledFilter === 'all' ||
       (enabledFilter === 'enabled' && server.enabled) ||
       (enabledFilter === 'disabled' && !server.enabled);

     return matchesSearch && matchesStatus && matchesEnabled;
   });

   // Statistics
   /** Total count of servers */
   const totalServers: number = servers.length;
   /** Count of connected servers */
   const connectedServers: number = servers.filter((s: MCPServerResponse) => s.status === 'connected').length;
   /** Count of disconnected servers */
   const disconnectedServers: number = servers.filter((s: MCPServerResponse) => s.status === 'disconnected').length;
   /** Count of servers in error state */
   const errorServers: number = servers.filter((s: MCPServerResponse) => s.status === 'error').length;

   // Handlers
   /** Opens the create server dialog */
   const handleCreate = (): void => {
     setTemplateData(null);
     setCreateDialogOpen(true);
   };

   /** Opens the edit server dialog for a specific server */
   const handleEdit = (server: MCPServerResponse): void => {
     setSelectedServer(server);
     setEditDialogOpen(true);
   };

   /** Handles selection of a template and opens the create dialog with pre-filled data */
   const handleSelectTemplate = (template: MCPServerTemplate): void => {
     setTemplateData(template);
     setTemplateDialogOpen(false);
     setCreateDialogOpen(true);
   };

   /** Handles saving (creating or updating) a server configuration */
   const handleSave = async (data: UpdateMCPServerRequest): Promise<void> => {
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

   /** Handles starting a server connection */
   const handleStart = async (server: MCPServerResponse): Promise<void> => {
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

   /** Handles stopping a server connection */
   const handleStop = async (server: MCPServerResponse): Promise<void> => {
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

   /** Handles restarting a server connection */
   const handleRestart = async (server: MCPServerResponse): Promise<void> => {
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

   /** Handles deleting a server */
   const handleDelete = async (server: MCPServerResponse): Promise<void> => {
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

   /** Opens the health check dialog for a specific server */
   const handleHealthCheck = (server: MCPServerResponse): void => {
     setSelectedServer(server);
     setHealthDialogOpen(true);
   };

   /** Handles toggling the enabled state of a server */
   const handleEnableToggle = async (server: MCPServerResponse): Promise<void> => {
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
