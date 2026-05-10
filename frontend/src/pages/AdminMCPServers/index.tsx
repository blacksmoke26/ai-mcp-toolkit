/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

/**
 * @module pages/AdminMCPServers
 * @description MCP Servers Management page with full CRUD, bulk operations,
 * list/grid view toggle, keyboard shortcuts, and professional advanced UI.
 *
 * Features:
 * - List all MCP servers with filtering and search
 * - Create new MCP servers with configuration forms
 * - Edit existing server configurations
 * - Start, stop, restart, clone, and delete servers
 * - Bulk operations with floating action bar
 * - Real-time health monitoring
 * - Test connectivity
 * - Load server templates
 * - Enable/disable servers dynamically
 * - List/Grid view toggle
 * - Keyboard shortcuts (Ctrl+N, Ctrl+F, Esc)
 * - Export/Import configurations
 * - Expandable details with JSON viewer
 */

import React, {createContext, useCallback, useEffect, useMemo, useState} from 'react';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronUp,
  Download,
  Globe,
  Loader2,
  Plus,
  Search,
  Server,
  ServerCrash,
  TestTube,
  Trash2,
  Upload,
  X,
} from 'lucide-react';

import type {
  CreateMCPServerRequest,
  MCPServerHealthResponse,
  MCPServerResponse,
  MCPServerStatus,
  MCPServerTemplate,
  UpdateMCPServerRequest,
} from '@/types/api';

import {
  createMCPServer,
  deleteMCPServer,
  getMCPServerHealth,
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
import {Alert, AlertDescription, AlertTitle} from '@/components/ui/Alert';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/Card';
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from '@/components/ui/Tooltip';
import {Switch} from '@/components/ui/Switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import CodeEditor from '@/components/ui/CodeEditor';
import {Label} from '@/components/ui/Label';
import CreateEditDialog from './CreateEditDialog';
import TemplateDialog from './TemplateDialog';
import HealthDialog from './HealthDialog';
import VariableInputModal from '@/components/ui/VariableInputModal';
import ServerCard from './ServerCard';
import ServerRow from './ServerRow';
import BulkActionBar from './BulkActionBar';
import {
  exportServersToJson,
  formatDuration,
  formatTimestamp,
  generateUniqueName,
  parseExportedJson,
} from './utils';

// ========== Type Definitions ==========

/**
 * Allowed status filter values
 */
type StatusFilter = 'all' | MCPServerStatus;

/**
 * Allowed enabled filter values
 */
type EnabledFilter = 'all' | 'enabled' | 'disabled';

/**
 * View mode for server list display
 */
type ViewMode = 'grid' | 'list';

/**
 * Result from a connectivity test
 */
interface TestResultEntry {
  success: boolean;
  message: string;
  status?: string;
  lastError?: string;
}

/**
 * Context for global toast/notification system
 */
interface NotificationContextValue {
  success: (message: string) => void;
  error: (message: string) => void;
  dismiss: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextValue>({
  success: () => {
  },
  error: () => {
  },
  dismiss: () => {
  },
});

// ========== Helper Functions ==========

// --- Small helper icons ---
const GridIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
       strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7"/>
    <rect x="14" y="3" width="7" height="7"/>
    <rect x="3" y="14" width="7" height="7"/>
    <rect x="14" y="14" width="7" height="7"/>
  </svg>
);

const ListIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
       strokeLinejoin="round">
    <line x1="8" y1="6" x2="21" y2="6"/>
    <line x1="8" y1="12" x2="21" y2="12"/>
    <line x1="8" y1="18" x2="21" y2="18"/>
    <line x1="3" y1="6" x2="3.01" y2="6"/>
    <line x1="3" y1="12" x2="3.01" y2="12"/>
    <line x1="3" y1="18" x2="3.01" y2="18"/>
  </svg>
);

// ========== Main Page Component ==========

/**
 * Main AdminMCPServers page component.
 * Provides server management with CRUD, bulk operations, and advanced UI.
 */
const AdminMCPServers: React.FC = () => {
  // --- Data State ---
  const [listResponse, setListResponse] = useState<{
    servers: MCPServerResponse[];
    pagination?: { total: number; page: number; limit: number; totalPages: number };
  } | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [/*error*/, setError] = useState<string>('');

  // --- Toast Notifications ---
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    type: 'success' | 'error';
    message: string;
  }>>([]);

  const addNotification = useCallback((type: 'success' | 'error', message: string) => {
    const id = `notif-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setNotifications(prev => [...prev, {id, type, message}]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 4000);
  }, []);

  const dismissNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  // --- Search & Filters ---
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [enabledFilter, setEnabledFilter] = useState<EnabledFilter>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [refreshInterval, setRefreshInterval] = useState<number>(5000);
  const [isLive, setIsLive] = useState<boolean>(true);

  // --- Dialogs ---
  const [createDialogOpen, setCreateDialogOpen] = useState<boolean>(false);
  const [editDialogOpen, setEditDialogOpen] = useState<boolean>(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState<boolean>(false);
  const [healthDialogOpen, setHealthDialogOpen] = useState<boolean>(false);
  const [testDialogOpen, setTestDialogOpen] = useState<boolean>(false);
  const [importDialogOpen, setImportDialogOpen] = useState<boolean>(false);

  const [templateData, setTemplateData] = useState<MCPServerTemplate | null>(null);
  const [importedJson, setImportedJson] = useState<string>('');
  const [importErrors, setImportErrors] = useState<string>('');

  // --- Variable Input Modal ---
  const [variableModalOpen, setVariableModalOpen] = useState<boolean>(false);
  const [pendingTemplate, setPendingTemplate] = useState<MCPServerTemplate | null>(null);
  const [prefillVariableValues, setPrefillVariableValues] = useState<Record<string, string>>({});

  // --- Selected Server ---
  const [selectedServer, setSelectedServer] = useState<MCPServerResponse | null>(null);
  const [healthResult, setHealthResult] = useState<MCPServerHealthResponse | null>(null);

  // --- Pagination ---
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);

  // --- Bulk Operations ---
  const [selectedServerIds, setSelectedServerIds] = useState<Set<number>>(new Set());

  // --- Operation States (discriminated union) ---
  interface OperationState {
    id: number;
    operation: 'start' | 'stop' | 'restart';
  }

  const [operationState, setOperationState] = useState<OperationState | null>(null);
  const [testingServerId, setTestingServerId] = useState<number | null>(null);
  const [deletingServerId, setDeletingServerId] = useState<number | null>(null);
  const [/*cloningServerId*/, setCloningServerId] = useState<number | null>(null);

  // --- Test Results per server ---
  const [testResults, setTestResults] = useState<Map<number, TestResultEntry>>(new Map());

  // --- Expanded Details ---
  const [expandedServerId, setExpandedServerId] = useState<number | null>(null);

  // --- Fetch Servers ---
  const fetchServers = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError('');
    try {
      const response = await listMCPServers({
        page: currentPage,
        limit: itemsPerPage,
        enabled: enabledFilter === 'enabled' ? true : enabledFilter === 'disabled' ? false : undefined,
        status: statusFilter === 'all' ? undefined : statusFilter,
        search: searchQuery || undefined,
      });
      setListResponse({
        servers: response.servers || [],
        pagination: response.pagination,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load servers');
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage, enabledFilter, statusFilter, searchQuery]);

  useEffect(() => {
    fetchServers();
  }, [fetchServers]);

  // --- Auto-refresh ---
  useEffect(() => {
    if (!isLive) return;
    const interval = setInterval(fetchServers, refreshInterval);
    return () => clearInterval(interval);
  }, [isLive, refreshInterval, fetchServers]);

  // Reset page on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [enabledFilter, statusFilter, searchQuery]);

  // --- Computed Values ---
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const currentServers = listResponse?.servers || [];
  const paginationInfo = listResponse?.pagination;
  const totalServers = paginationInfo?.total || 0;
  const totalPages = totalServers > 0 ? Math.ceil(totalServers / itemsPerPage) : 0;
  const currentPageNum = paginationInfo?.page || 1;

  // Count from server list for current page
  const connectedServers = currentServers.filter(s => s.status === 'connected').length;
  const connectingServers = currentServers.filter(s => s.status === 'connecting').length;
  //const disconnectedServers = currentServers.filter(s => s.status === 'disconnected').length;
  const errorServersCount = currentServers.filter(s => s.status === 'error').length;

  // --- Bulk Operations ---
  const selectedServers = useMemo(
    () => currentServers.filter(s => selectedServerIds.has(s.id)),
    [currentServers, selectedServerIds],
  );

  const handleSelectAll = useCallback((): void => {
    setSelectedServerIds(prev => {
      if (prev.size === currentServers.length) {
        return new Set<number>();
      }
      return new Set(currentServers.map(s => s.id));
    });
  }, [currentServers]);

  const handleSelectServer = useCallback((id: number, selected: boolean): void => {
    setSelectedServerIds(prev => {
      const next = new Set(prev);
      if (selected) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }, []);

  // --- Bulk Actions ---
  const handleBulkStart = useCallback(async (): Promise<void> => {
    setOperationState({id: -1, operation: 'start'});
    try {
      const promises = selectedServers.map(s => startMCPServer(s.id));
      await Promise.allSettled(promises);
      addNotification('success', `Started ${selectedServers.length} servers`);
      await fetchServers();
    } catch (err) {
      addNotification('error', `Failed to start servers: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setOperationState(null);
    }
  }, [selectedServers, fetchServers, addNotification]);

  const handleBulkStop = useCallback(async (): Promise<void> => {
    setOperationState({id: -1, operation: 'stop'});
    try {
      const promises = selectedServers.map(s => stopMCPServer(s.id));
      await Promise.allSettled(promises);
      addNotification('success', `Stopped ${selectedServers.length} servers`);
      await fetchServers();
    } catch (err) {
      addNotification('error', `Failed to stop servers: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setOperationState(null);
    }
  }, [selectedServers, fetchServers, addNotification]);

  const handleBulkRestart = useCallback(async (): Promise<void> => {
    setOperationState({id: -1, operation: 'restart'});
    try {
      const promises = selectedServers.map(s => restartMCPServer(s.id));
      await Promise.allSettled(promises);
      addNotification('success', `Restarted ${selectedServers.length} servers`);
      await fetchServers();
    } catch (err) {
      addNotification('error', `Failed to restart servers: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setOperationState(null);
    }
  }, [selectedServers, fetchServers, addNotification]);

  const [bulkDeleteOpen, setBulkDeleteOpen] = useState<boolean>(false);

  const handleBulkDelete = useCallback(async (): Promise<void> => {
    setDeletingServerId(-1);
    try {
      const promises = selectedServers.map(s => deleteMCPServer(s.id));
      await Promise.allSettled(promises);
      addNotification('success', `Deleted ${selectedServers.length} servers`);
      setSelectedServerIds(new Set());
      await fetchServers();
    } catch (err) {
      addNotification('error', `Failed to delete servers: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setDeletingServerId(null);
    }
  }, [selectedServers, fetchServers, addNotification]);

  // --- CRUD Handlers ---
  const handleCreate = useCallback((): void => {
    setTemplateData(null);
    setCreateDialogOpen(true);
  }, []);

  const handleEdit = useCallback((server: MCPServerResponse): void => {
    setSelectedServer(server);
    setEditDialogOpen(true);
  }, []);

  // --- Clone Handler ---
  const handleClone = useCallback(async (server: MCPServerResponse): Promise<void> => {
    setCloningServerId(server.id);
    try {
      const existingNames = new Set(currentServers.map(s => s.name));
      const uniqueName = generateUniqueName(server.name, existingNames);
      const template: MCPServerTemplate = {
        id: `clone-${server.id}`,
        name: uniqueName,
        displayName: `${server.displayName} (Copy)`,
        description: server.description,
        type: server.type,
        command: server.command,
        args: server.args,
        url: server.url,
        env: server.env,
        headers: server.headers,
        notes: undefined,
        documentationUrl: undefined,
        category: undefined,
        icon: undefined,
        tags: undefined,
        runtime: undefined,
        homepage: undefined,
        variables: undefined,
      };
      setTemplateData(template);
      setCreateDialogOpen(true);
      setCloningServerId(null);
      addNotification('success', `Cloned "${server.displayName}"`);
    } catch (err) {
      addNotification('error', `Failed to clone server: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setCloningServerId(null);
    }
  }, [currentServers, addNotification]);

  const handleSave = useCallback(async (data: CreateMCPServerRequest | UpdateMCPServerRequest): Promise<void> => {
    try {
      if (editDialogOpen && selectedServer) {
        const updateData = {
          name: data.name,
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
          enabled: data.enabled,
        } as UpdateMCPServerRequest;

        await updateMCPServer(selectedServer.id, updateData);
        setEditDialogOpen(false);
        setSelectedServer(null);
        addNotification('success', 'Server updated successfully');
      } else {
        const createData = {
          name: data.name,
          displayName: data.displayName,
          description: data.description,
          type: data.type,
          command: data.command,
          args: data.args,
          env: data.env,
          url: data.url,
          headers: data.headers,
          enabled: data.enabled,
          timeout: data.timeout,
          autoReconnect: data.autoReconnect,
          maxReconnectAttempts: data.maxReconnectAttempts,
          reconnectDelay: data.reconnectDelay,
          settings: data.settings,
        } as CreateMCPServerRequest;

        await createMCPServer(createData);
        setCreateDialogOpen(false);
        addNotification('success', 'Server created successfully');
      }
      await fetchServers();
    } catch (err) {
      addNotification('error', `Failed to save server: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, [editDialogOpen, selectedServer, fetchServers, addNotification]);

  const handleSelectTemplate = useCallback((template: MCPServerTemplate): void => {
    setTemplateDialogOpen(false);
    const variables = template?.variables;
    const hasVariables = variables && variables.length > 0;
    if (hasVariables) {
      setPendingTemplate(template);
      // Build prefilled values from template variable defaults
      const prefills: Record<string, string> = {};
      variables.forEach((v) => {
        if (v.default) {
          prefills[v.key] = v.default;
        }
      });
      setPrefillVariableValues(prefills);
      setVariableModalOpen(true);
    } else {
      setTemplateData(template);
      setCreateDialogOpen(true);
    }
  }, []);

  const handleVariableModalSubmit = useCallback((values: Record<string, string>): void => {
    if (!pendingTemplate) return;
    // Apply filled variable values to the template data
    const appliedTemplate: MCPServerTemplate = {
      ...pendingTemplate,
      env: {
        ...((pendingTemplate.env as any) ?? {}),
        ...values,
      },
    };
    setTemplateData(appliedTemplate);
    setVariableModalOpen(false);
    setPendingTemplate(null);
    setPrefillVariableValues({});
    setCreateDialogOpen(true);
  }, [pendingTemplate]);

  const handleVariableModalClose = useCallback(() => {
    setVariableModalOpen(false);
    setPendingTemplate(null);
    setPrefillVariableValues({});
  }, []);

  // --- Individual Operations ---
  const handleTestConnection = useCallback(async (server: MCPServerResponse): Promise<void> => {
    setTestingServerId(server.id);
    try {
      const result = await testMCPServerConnection(server.id);
      setTestResults(prev => {
        const next = new Map(prev);
        next.set(server.id, {
          success: result.success,
          message: result.message,
          status: result.status,
          lastError: result.lastError,
        });
        return next;
      });
      setTestDialogOpen(true);
      addNotification(result.success ? 'success' : 'error', `${result.success ? 'Test successful' : 'Test failed'} for ${server.displayName}`);
    } catch (err) {
      setTestResults(prev => {
        const next = new Map(prev);
        next.set(server.id, {
          success: false,
          message: err instanceof Error ? err.message : 'Test failed',
        });
        return next;
      });
      setTestDialogOpen(true);
      addNotification('error', `Test failed for ${server.displayName}`);
    } finally {
      setTestingServerId(null);
    }
  }, [addNotification]);

  const handleStart = useCallback(async (server: MCPServerResponse): Promise<void> => {
    setOperationState({id: server.id, operation: 'start'});
    try {
      await startMCPServer(server.id);
      addNotification('success', `Started ${server.displayName}`);
      await fetchServers();
    } catch (err) {
      addNotification('error', `Failed to start ${server.displayName}: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setOperationState(null);
    }
  }, [fetchServers, addNotification]);

  const handleStop = useCallback(async (server: MCPServerResponse): Promise<void> => {
    setOperationState({id: server.id, operation: 'stop'});
    try {
      await stopMCPServer(server.id);
      addNotification('success', `Stopped ${server.displayName}`);
      await fetchServers();
    } catch (err) {
      addNotification('error', `Failed to stop ${server.displayName}: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setOperationState(null);
    }
  }, [fetchServers, addNotification]);

  const handleRestart = useCallback(async (server: MCPServerResponse): Promise<void> => {
    setOperationState({id: server.id, operation: 'restart'});
    try {
      await restartMCPServer(server.id);
      addNotification('success', `Restarted ${server.displayName}`);
      await fetchServers();
    } catch (err) {
      addNotification('error', `Failed to restart ${server.displayName}: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setOperationState(null);
    }
  }, [fetchServers, addNotification]);

  const handleDelete = useCallback(async (server: MCPServerResponse): Promise<void> => {
    setDeletingServerId(server.id);
    try {
      await deleteMCPServer(server.id);
      addNotification('success', `Deleted ${server.displayName}`);
      await fetchServers();
    } catch (err) {
      addNotification('error', `Failed to delete ${server.displayName}: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setDeletingServerId(null);
    }
  }, [fetchServers, addNotification]);

  const handleHealthCheck = useCallback(async (server: MCPServerResponse): Promise<void> => {
    setSelectedServer(server);
    setHealthDialogOpen(true);
    setTestDialogOpen(true);
    try {
      const result = await getMCPServerHealth(server.id);
      setHealthResult(result);
    } catch (err) {
      setHealthResult(null);
      addNotification('error', `Health check failed for ${server.displayName}`);
    }
  }, [addNotification]);

  const handleEnableToggle = useCallback(async (server: MCPServerResponse): Promise<void> => {
    try {
      await updateMCPServer(server.id, {enabled: !server.enabled} as UpdateMCPServerRequest);
      addNotification('success', `${!server.enabled ? 'Enabled' : 'Disabled'} ${server.displayName}`);
      await fetchServers();
    } catch (err) {
      addNotification('error', `Failed to toggle ${server.displayName}`);
    }
  }, [fetchServers, addNotification]);

  // --- Page Change ---
  const handlePageChange = useCallback((page: number): void => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  }, [totalPages]);

  // --- Export ---
  const handleExport = useCallback((): void => {
    const json = exportServersToJson(currentServers);
    const blob = new Blob([json], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mcp-servers-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    addNotification('success', 'Servers exported successfully');
  }, [currentServers, addNotification]);

  // --- Import ---
  const handleImport = useCallback(async (): Promise<void> => {
    setImportErrors('');
    try {
      const configs = parseExportedJson(importedJson);
      const results = await Promise.allSettled(
        configs.map(config => {
          const requiredFields = config.name && config.displayName && config.description && config.type;
          if (!requiredFields) {
            throw new Error(`Missing required fields: name, displayName, description, type`);
          }
          return createMCPServer(config as CreateMCPServerRequest);
        }),
      );
      let successCount = 0;
      let failCount = 0;
      results.forEach((result) => {
        if (result.status === 'fulfilled') {
          successCount++;
        } else {
          failCount++;
        }
      });
      setImportDialogOpen(false);
      setImportedJson('');
      addNotification('success', `Imported ${successCount} servers, ${failCount} failed`);
      await fetchServers();
    } catch (err) {
      setImportErrors(err instanceof Error ? err.message : 'Import failed');
    }
  }, [importedJson, fetchServers, addNotification]);

  // --- Keyboard Shortcuts ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      // Ctrl+N: New server
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        setCreateDialogOpen(true);
      }
      // Ctrl+F: Focus search
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        document.getElementById('server-search')?.focus();
      }
      // Esc: Close dialogs
      if (e.key === 'Escape') {
        if (createDialogOpen) setCreateDialogOpen(false);
        if (editDialogOpen) setEditDialogOpen(false);
        if (templateDialogOpen) setTemplateDialogOpen(false);
        if (healthDialogOpen) setHealthDialogOpen(false);
        if (testDialogOpen) setTestDialogOpen(false);
        if (importDialogOpen) setImportDialogOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [createDialogOpen, editDialogOpen, templateDialogOpen, healthDialogOpen, testDialogOpen, importDialogOpen]);

  // --- Render ---
  return (
    <>
      <NotificationContext.Provider value={{
        success: (msg) => addNotification('success', msg),
        error: (msg) => addNotification('error', msg),
        dismiss: dismissNotification,
      }}>
        <TooltipProvider>
          <div className="container mx-auto p-6 space-y-6">
            {/* --- Toast Notifications --- */}
            <div className="fixed top-4 right-4 z-[100] space-y-2 max-w-md">
              {notifications.map(notif => (
                <Alert
                  key={notif.id}
                  variant={notif.type === 'error' ? 'destructive' : 'default'}
                  className="shadow-lg animate-in slide-in-from-right-5"
                >
                  {notif.type === 'success' ? (
                    <Check className="h-4 w-4 text-green-500"/>
                  ) : (
                    <AlertCircle className="h-4 w-4"/>
                  )}
                  <AlertTitle className={notif.type === 'success' ? 'text-green-600 dark:text-green-400' : ''}>
                    {notif.type === 'success' ? 'Success' : 'Error'}
                  </AlertTitle>
                  <AlertDescription className="flex items-center justify-between">
                    <span className="flex-1">{notif.message}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6 ml-2"
                            onClick={() => dismissNotification(notif.id)}>
                      <X className="h-3 w-3"/>
                    </Button>
                  </AlertDescription>
                </Alert>
              ))}
            </div>

            {/* --- Header --- */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                  <ServerCrash className="w-8 h-8 text-blue-500"/>
                  MCP Servers
                </h1>
                <p className="text-muted-foreground mt-1">
                  Manage external Model Context Protocol server connections
                </p>
              </div>

              <div className="flex items-center gap-2">
                {/* Live Indicator */}
                <div className="flex items-center gap-1 mr-2">
                  <div className={`w-2 h-2 rounded-full ${isLive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}/>
                  <span className="text-xs text-muted-foreground">
                  {isLive ? 'Live' : 'Paused'}
                </span>
                </div>

                {/* Refresh Interval */}
                <Select.Root value={String(refreshInterval)} onValueChange={(v) => {
                  setRefreshInterval(parseInt(v, 10));
                  setIsLive(true);
                }}>
                  <Select.Trigger className="w-[100px]">
                    <Select.Value placeholder="Refresh"/>
                  </Select.Trigger>
                  <Select.Content>
                    <Select.Item value="1000">1s</Select.Item>
                    <Select.Item value="5000">5s</Select.Item>
                    <Select.Item value="15000">15s</Select.Item>
                    <Select.Item value="30000">30s</Select.Item>
                    <Select.Item value="60000">1m</Select.Item>
                  </Select.Content>
                </Select.Root>

                {/* Toggle Live */}
                <Switch
                  size="sm"
                  color="primary"
                  checked={isLive}
                  onCheckedChange={setIsLive}
                  label="Live"
                  labelPosition="left"
                />

                {/* Export */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="sm" onClick={handleExport}>
                        <Download className="w-4 h-4 mr-2"/>
                        Export
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Export current view as JSON</TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                {/* Import */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="sm" onClick={() => setImportDialogOpen(true)}>
                        <Upload className="w-4 h-4 mr-2"/>
                        Import
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Import servers from JSON</TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                {/* Templates */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="sm" onClick={() => setTemplateDialogOpen(true)}>
                        <Globe className="w-4 h-4 mr-2"/>
                        Templates
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Browse server templates</TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                {/* New Server */}
                <Button size="sm" onClick={handleCreate} className="bg-blue-600 hover:bg-blue-700 text-white">
                  <Plus className="w-4 h-4 mr-2"/>
                  New Server
                  <span className="ml-2 text-xs opacity-60">⌘N</span>
                </Button>
              </div>
            </div>

            {/* --- Statistics Cards --- */}
            <div className="grid grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total</CardTitle>
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
                  <CardTitle className="text-sm font-medium">Connecting</CardTitle>
                  <Activity className="w-4 h-4 text-yellow-500"/>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-500">{connectingServers}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Errors</CardTitle>
                  <AlertCircle className="w-4 h-4 text-red-500"/>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-500">{errorServersCount}</div>
                </CardContent>
              </Card>
            </div>

            {/* --- Filters --- */}
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-4">
                  {/* Search */}
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
                    <Input
                      id="server-search"
                      placeholder="Search servers..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>

                  {/* Status Filter */}
                  <Select.Root value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
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

                  {/* Enabled Filter */}
                  <Select.Root value={enabledFilter} onValueChange={(v) => setEnabledFilter(v as EnabledFilter)}>
                    <Select.Trigger className="w-[130px]">
                      <Select.Value placeholder="Enabled"/>
                    </Select.Trigger>
                    <Select.Content>
                      <Select.Item value="all">All</Select.Item>
                      <Select.Item value="enabled">Enabled</Select.Item>
                      <Select.Item value="disabled">Disabled</Select.Item>
                    </Select.Content>
                  </Select.Root>

                  {/* View Mode Toggle */}
                  <div className="flex items-center border rounded-md">
                    <Button
                      variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                      size="sm"
                      className="rounded-r-none border-r"
                      onClick={() => setViewMode('grid')}
                    >
                      <GridIcon className="w-4 h-4"/>
                    </Button>
                    <Button
                      variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                      size="sm"
                      className="rounded-l-none"
                      onClick={() => setViewMode('list')}
                    >
                      <ListIcon className="w-4 h-4"/>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* --- Server List --- */}
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin"/>
                <span className="ml-2 text-muted-foreground">Loading servers...</span>
              </div>
            ) : currentServers.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Server className="w-12 h-12 mx-auto text-muted-foreground mb-4"/>
                  <h3 className="text-lg font-medium">No servers found</h3>
                  <p className="text-muted-foreground mt-2">
                    {searchQuery || statusFilter !== 'all' || enabledFilter !== 'all'
                      ? 'Try adjusting your filters'
                      : 'Create your first MCP server to get started'}
                  </p>
                  {!searchQuery && statusFilter === 'all' && enabledFilter === 'all' && (
                    <Button onClick={handleCreate} className="mt-4">
                      <Plus className="w-4 h-4 mr-2"/>
                      Add Server
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : viewMode === 'grid' ? (
              <div className="grid gap-4">
                {currentServers.map((server) => (
                  <ServerCard
                    key={server.id}
                    server={server}
                    isOperating={operationState?.id === server.id}
                    isTesting={testingServerId === server.id}
                    isSelected={selectedServerIds.has(server.id)}
                    onSelect={(selected) => handleSelectServer(server.id, selected)}
                    onStart={() => handleStart(server)}
                    onStop={() => handleStop(server)}
                    onRestart={() => handleRestart(server)}
                    onTestConnection={() => handleTestConnection(server)}
                    onHealthCheck={() => handleHealthCheck(server)}
                    onEdit={() => handleEdit(server)}
                    onDelete={() => handleDelete(server)}
                    onClone={() => handleClone(server)}
                    onToggleEnabled={() => handleEnableToggle(server)}
                    onToggleExpand={() => setExpandedServerId(expandedServerId === server.id ? null : server.id)}
                    isExpanded={expandedServerId === server.id}
                    testResult={testResults.get(server.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                  <tr className="border-b border-border">
                    <th className="py-3 px-4 text-left w-12">
                      <input
                        type="checkbox"
                        checked={selectedServerIds.size === currentServers.length && currentServers.length > 0}
                        onChange={handleSelectAll}
                        className="rounded border-gray-300"
                      />
                    </th>
                    <th className="py-3 px-4 text-left text-sm font-medium text-muted-foreground">Status</th>
                    <th className="py-3 px-4 text-left text-sm font-medium text-muted-foreground">Name / Type</th>
                    <th className="py-3 px-4 text-left text-sm font-medium text-muted-foreground">Connections</th>
                    <th className="py-3 px-4 text-left text-sm font-medium text-muted-foreground">Failures</th>
                    <th className="py-3 px-4 text-left text-sm font-medium text-muted-foreground">Last Connected</th>
                    <th className="py-3 px-4 text-left text-sm font-medium text-muted-foreground">Enabled</th>
                    <th className="py-3 px-4 text-left text-sm font-medium text-muted-foreground">Actions</th>
                  </tr>
                  </thead>
                  <tbody>
                  {currentServers.map((server) => (
                    <React.Fragment key={server.id}>
                      <ServerRow
                        server={server}
                        isOperating={operationState?.id === server.id}
                        isTesting={testingServerId === server.id}
                        isSelected={selectedServerIds.has(server.id)}
                        onSelect={(selected) => handleSelectServer(server.id, selected)}
                        onStart={() => handleStart(server)}
                        onStop={() => handleStop(server)}
                        onRestart={() => handleRestart(server)}
                        onTestConnection={() => handleTestConnection(server)}
                        onHealthCheck={() => handleHealthCheck(server)}
                        onEdit={() => handleEdit(server)}
                        onDelete={() => handleDelete(server)}
                        onClone={() => handleClone(server)}
                        onToggleEnabled={() => handleEnableToggle(server)}
                        onToggleExpand={() => setExpandedServerId(expandedServerId === server.id ? null : server.id)}
                        isExpanded={expandedServerId === server.id}
                      />
                    </React.Fragment>
                  ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* --- Pagination --- */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Page {currentPageNum} of {totalPages} ({totalServers} total servers)
                </div>
                <div className="flex items-center gap-2">
                  <Select.Root
                    value={String(itemsPerPage)}
                    onValueChange={(v) => {
                      setItemsPerPage(parseInt(v, 10));
                      setCurrentPage(1);
                    }}
                  >
                    <Select.Trigger className="w-[100px]">
                      <Select.Value/>
                    </Select.Trigger>
                    <Select.Content>
                      <Select.Item value="5">5 per page</Select.Item>
                      <Select.Item value="10">10 per page</Select.Item>
                      <Select.Item value="25">25 per page</Select.Item>
                      <Select.Item value="50">50 per page</Select.Item>
                    </Select.Content>
                  </Select.Root>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPageNum - 1)}
                    disabled={currentPageNum <= 1}
                  >
                    <ChevronDown className="w-4 h-4"/>
                  </Button>

                  <div className="text-sm font-medium">
                    {currentPageNum} / {totalPages}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPageNum + 1)}
                    disabled={currentPageNum >= totalPages}
                  >
                    <ChevronUp className="w-4 h-4"/>
                  </Button>
                </div>
              </div>
            )}

            {/* --- Dialogs --- */}
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

            {/* Variable Input Modal - shows when a template with variables is selected */}
            <VariableInputModal
              isOpen={variableModalOpen}
              variables={pendingTemplate?.variables}
              prefillValues={prefillVariableValues}
              onClose={handleVariableModalClose}
              onSubmit={handleVariableModalSubmit}
            />

            <HealthDialog
              open={healthDialogOpen}
              onOpenChange={setHealthDialogOpen}
              server={selectedServer}
              healthResult={healthResult}
              isHealthChecking={false}
            />

            {/* Test Result Dialog */}
            <Dialog open={testDialogOpen} onOpenChange={setTestDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <TestTube className="w-5 h-5"/>
                    Connectivity Test Result
                  </DialogTitle>
                  <DialogDescription>
                    Test result for {selectedServer?.displayName || 'server'}
                  </DialogDescription>
                </DialogHeader>

                {healthResult && (
                  <Alert>
                    {healthResult.status === 'healthy' ? (
                      <Check className="h-4 w-4"/>
                    ) : healthResult.status === 'unhealthy' ? (
                      <AlertCircle className="h-4 w-4"/>
                    ) : (
                      <Activity className="h-4 w-4"/>
                    )}
                    <AlertTitle>
                      {healthResult.status === 'healthy' ? 'Successful' : healthResult.status === 'unhealthy' ? 'Failed' : 'Unknown'}
                    </AlertTitle>
                    <AlertDescription>
                      {healthResult.lastError ? healthResult.lastError : 'Health check completed'}
                      {healthResult.uptime && (
                        <div className="mt-1 text-xs">
                          <strong>Uptime:</strong> {formatDuration(healthResult.uptime)}
                        </div>
                      )}
                      <div className="mt-1 text-xs">
                        <strong>Checked:</strong> {formatTimestamp(healthResult.checkedAt)}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                <DialogFooter>
                  <Button onClick={() => setTestDialogOpen(false)}>Close</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Import Dialog */}
            <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Upload className="w-5 h-5"/>
                    Import MCP Servers
                  </DialogTitle>
                  <DialogDescription>
                    Paste exported JSON configuration to import servers
                  </DialogDescription>
                </DialogHeader>

                {importErrors && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4"/>
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{importErrors}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="import-json">JSON Configuration</Label>
                    <CodeEditor
                      language="json"
                      value={importedJson}
                      onChange={setImportedJson}
                      heightClass="h-[300px]"
                      editorProps={{placeholder: '[{"name":"server1","displayName":"Server 1","description":"Imported server","type":"stdio","command":"npx"}]'}}
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setImportDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleImport} disabled={!importedJson.trim()}>
                    <Upload className="w-4 h-4 mr-2"/>
                    Import
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* --- Bulk Action Bar --- */}
            <BulkActionBar
              count={selectedServerIds.size}
              selectedIds={Array.from(selectedServerIds)}
              selectedNames={selectedServers.map(s => s.displayName)}
              isOperating={operationState?.id === -1}
              onSelectAll={handleSelectAll}
              onStartAll={handleBulkStart}
              onStopAll={handleBulkStop}
              onRestartAll={handleBulkRestart}
              onDeleteAll={() => setBulkDeleteOpen(true)}
              onClose={() => setSelectedServerIds(new Set())}
            />
          </div>
        </TooltipProvider>
      </NotificationContext.Provider>

      {/* Bulk Delete Confirmation */}
      <Dialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-500">
              <AlertTriangle className="w-5 h-5"/>
              Delete {selectedServerIds.size} Servers?
            </DialogTitle>
            <DialogDescription>
              This will permanently delete {selectedServers.map(s => `"${s.displayName}"`).join(', ')}. This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={async () => {
              setBulkDeleteOpen(false);
              await handleBulkDelete();
            }} disabled={deletingServerId === -1}>
              {deletingServerId === -1 ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin"/> Deleting...</>
              ) : (
                <><Trash2 className="w-4 h-4 mr-2"/> Delete All</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdminMCPServers;
