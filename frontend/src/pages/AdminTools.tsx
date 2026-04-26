/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

import * as React from 'react';
import {useEffect, useState} from 'react';
import {
  AlertCircle,
  BookOpen,
  CheckCircle2, CheckSquare,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Code,
  Filter,
  Info,
  RefreshCw,
  Search,
  ToggleLeft,
  ToggleRight,
  Wrench,
  XCircle,
} from 'lucide-react';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/Card';
import {Button} from '@/components/ui/Button';
import {Input} from '@/components/ui/Input';
import {Badge} from '@/components/ui/Badge';
import {Alert, AlertDescription, AlertTitle} from '@/components/ui/Alert';
import {
  batchUpdateTools,
  getToolDetails,
  listAdminTools,
  type ToolDetailResponse,
  type ToolSummary,
  updateTool,
} from '@/lib/api';
import JsonViewer from '@/components/ui/JsonViewer';

/**
 * AdminTools component displays a list of tools with filtering and search capabilities.
 */
export function AdminTools() {
  const [tools, setTools] = useState<ToolSummary[]>([]);
  const [categories, setCategories] = useState<Record<string, string[]>>({});
  const [totalTools, setTotalTools] = useState(0);
  const [enabledTools, setEnabledTools] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTool, setSelectedTool] = useState<ToolDetailResponse | null>(null);
  const [expandedTool, setExpandedTool] = useState<string | null>(null);
  const [updateLoading, setUpdateLoading] = useState<string | null>(null);
  const [batchLoading, setBatchLoading] = useState(false);
  const [selectedTools, setSelectedTools] = useState<Set<string>>(new Set());
  const categoryScrollRef = React.useRef<HTMLDivElement>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await listAdminTools();
      setTools(response.tools || []);
      setCategories(response.categories || {});
      setTotalTools(response.total || 0);
      setEnabledTools(response.enabled || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tools');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Get unique categories
  const categoryList = React.useMemo(() => {
    return ['all', ...Object.keys(categories)];
  }, [categories]);

  // Toggle tool selection for batch operations
  const toggleToolSelection = (toolName: string) => {
    setSelectedTools((prev) => {
      const next = new Set(prev);
      if (next.has(toolName)) {
        next.delete(toolName);
      } else {
        next.add(toolName);
      }
      return next;
    });
  };

  // Select all visible tools
  const selectAllTools = () => {
    setSelectedTools(new Set(filteredTools.map((t) => t.name)));
  };

  // Deselect all tools
  const deselectAllTools = () => {
    setSelectedTools(new Set());
  };

  // Handle batch update (enable/disable selected tools)
  const handleBatchUpdate = async (enabled: boolean) => {
    if (selectedTools.size === 0) {
      setError('Please select at least one tool to update');
      return;
    }

    try {
      setBatchLoading(true);
      setError(null);
      setSuccessMessage(null);

      const result = await batchUpdateTools({
        names: Array.from(selectedTools),
        enabled,
      });

      if (result.updated.length > 0) {
        setSuccessMessage(
          `Successfully ${enabled ? 'enabled' : 'disabled'} ${result.updated.length} tool(s)` +
          (result.notFound.length > 0 ? `, ${result.notFound.length} not found` : ''),
        );
        // Update local state for updated tools
        setTools((prev) =>
          prev.map((t) => (result.updated.includes(t.name) ? {...t, enabled} : t)),
        );
        // Update enabled count: add if enabling, subtract if disabling tools that were enabled
        setEnabledTools((prev) => {
          const currentlyEnabled = result.updated.filter((n) => {
            const tool = tools.find((t) => t.name === n);
            return tool?.enabled === true;
          }).length;
          if (enabled) {
            // Enabling: add the ones that weren't already enabled
            return prev + (result.updated.length - currentlyEnabled);
          } else {
            // Disabling: subtract the ones that were enabled
            return prev - currentlyEnabled;
          }
        });
      }

      if (result.notFound.length > 0) {
        setError(`Tools not found: ${result.notFound.join(', ')}`);
      }

      // Clear selection
      setSelectedTools(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to batch update tools');
    } finally {
      setBatchLoading(false);
    }
  };

  // Batch operation text
  const batchOperationText = selectedTools.size > 0
    ? `${selectedTools.size} selected`
    : '';

  // Filter tools based on search and category
  const filteredTools = React.useMemo(() => {
    return tools.filter((tool) => {
      const matchesSearch =
        tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tool.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        selectedCategory === 'all' || tool.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [tools, searchQuery, selectedCategory]);

  // Fetch tool details
  const fetchToolDetails = async (toolName: string) => {
    try {
      const response = await getToolDetails(toolName);
      setSelectedTool(response);
    } catch (err) {
      console.error('Failed to fetch tool details:', err);
    }
  };

  // Toggle tool enabled/disabled
  const handleToggleTool = async (toolName: string, currentEnabled: boolean) => {
    try {
      setUpdateLoading(toolName);
      setError(null);
      setSuccessMessage(null);

      await updateTool(toolName, {enabled: !currentEnabled});
      setSuccessMessage(`Tool "${toolName}" ${!currentEnabled ? 'enabled' : 'disabled'} successfully`);

      // Update local state
      setTools((prev) =>
        prev.map((t) => (t.name === toolName ? {...t, enabled: !currentEnabled} : t)),
      );

      // Update enabled count
      setEnabledTools((prev) => (currentEnabled ? prev - 1 : prev + 1));

      // Update selected tool if it's the one being toggled
      if (selectedTool?.name === toolName) {
        setSelectedTool((prev) => (prev ? {...prev, enabled: !currentEnabled} : null));
      }

      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update tool');
    } finally {
      setUpdateLoading(null);
    }
  };

  // Reset success message after 3 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Format JSON for display
  const formatJSON = (data: unknown): string => {
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  };

  const scrollCategories = (direction: 'left' | 'right') => {
    const container = categoryScrollRef.current;
    if (!container) return;
    const scrollAmount = 300;
    const newScrollLeft =
      direction === 'left'
        ? container.scrollLeft - scrollAmount
        : container.scrollLeft + scrollAmount;
    container.scrollTo({left: newScrollLeft, behavior: 'smooth'});
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Tools</h2>
          <p className="text-muted-foreground">
            Manage and enable/disable MCP tools
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={fetchData} variant="outline" disabled={loading}>
            <RefreshCw className="mr-2 h-4 w-4"/>
            Refresh
          </Button>
        </div>
      </div>

      {/* Error/Success Alerts */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4"/>
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {successMessage && (
        <Alert variant="success">
          <CheckCircle2 className="h-4 w-4"/>
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tools</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground"/>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTools}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Enabled</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600"/>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{enabledTools}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Disabled</CardTitle>
            <XCircle className="h-4 w-4 text-red-600"/>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{totalTools - enabledTools}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
            <Filter className="h-4 w-4 text-muted-foreground"/>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Object.keys(categories).length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/>
              <Input
                placeholder="Search tools by name or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2 w-[60%]">
              <Button
                variant="outline"
                size="icon"
                onClick={() => scrollCategories('left')}
                className="h-7 w-7 flex-shrink-0"
              >
                <ChevronLeft className="h-4 w-4"/>
              </Button>
              <div
                ref={categoryScrollRef}
                className="flex items-center gap-2 overflow-x-auto flex-1"
                style={{scrollbarWidth: 'none', msOverflowStyle: 'none'}}
              >
                <Filter className="h-4 w-4 text-muted-foreground flex-shrink-0"/>
                {categoryList.map((category) => (
                  <Badge
                    key={category}
                    variant={selectedCategory === category ? 'default' : 'outline'}
                    className="cursor-pointer px-3 py-1 whitespace-nowrap"
                    onClick={() => setSelectedCategory(category)}
                  >
                    {category === 'all' ? 'All Categories' : category}
                    {category !== 'all' && (
                      <span className="ml-1 text-xs opacity-70">
                        ({categories[category]?.length || 0})
                      </span>
                    )}
                  </Badge>
                ))}
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => scrollCategories('right')}
                className="h-7 w-7 flex-shrink-0"
              >
                <ChevronRight className="h-4 w-4"/>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Batch Operation Bar */}
      {selectedTools.size > 0 && (
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">{selectedTools.size} tools selected</span>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleBatchUpdate(true)}
                    disabled={batchLoading}
                  >
                    <ToggleRight className="mr-2 h-4 w-4"/>
                    Enable Selected
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleBatchUpdate(false)}
                    disabled={batchLoading}
                  >
                    <ToggleLeft className="mr-2 h-4 w-4"/>
                    Disable Selected
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={deselectAllTools}
                    disabled={batchLoading}
                  >
                    Clear Selection
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Tools List */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Available Tools</CardTitle>
                  <CardDescription>
                    {filteredTools.length} of {tools.length} tools shown
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {filteredTools.length > 0 && (
                    <>
                      {selectedTools.size === filteredTools.length ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={deselectAllTools}
                        >
                          <XCircle className="mr-2 h-4 w-4"/>
                          Deselect All
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={selectAllTools}
                        >
                          <CheckSquare className="mr-2 h-4 w-4"/>
                          Select All
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[calc(100vh-400px)] overflow-y-auto">
                {loading ? (
                  <div className="p-4 space-y-2">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className="h-20 bg-muted rounded animate-pulse"
                      />
                    ))}
                  </div>
                ) : filteredTools.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <Wrench className="mx-auto h-12 w-12 opacity-20 mb-4"/>
                    <p>No tools found</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {filteredTools.map((tool) => {
                      const isSelected = selectedTool?.name === tool.name;
                      const isExpanded = expandedTool === tool.name;
                      const isChecked = selectedTools.has(tool.name);

                      return (
                        <div
                          key={tool.name}
                          className={
                            'p-4 cursor-pointer transition-colors hover:bg-accent/50 ' +
                            (isSelected ? 'bg-accent' : '')
                          }
                          onClick={() => {
                            setSelectedTool({
                              name: tool.name,
                              description: tool.description,
                              enabled: tool.enabled,
                              category: tool.category,
                              inputSchema: undefined,
                            });
                            fetchToolDetails(tool.name);
                          }}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                {/* Selection Checkbox */}
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    toggleToolSelection(tool.name);
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                />
                                <h3 className="font-medium truncate">{tool.name}</h3>
                                {tool.category && (
                                  <Badge variant="secondary" className="text-xs">
                                    {tool.category}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                                {tool.description}
                              </p>
                            </div>

                            <div className="flex items-center gap-2 ml-4">
                              {/* Toggle Switch */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleTool(tool.name, tool.enabled);
                                }}
                                disabled={updateLoading === tool.name}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
                                  tool.enabled ? 'bg-primary' : 'bg-muted'
                                }`}
                              >
                                <span
                                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                    tool.enabled ? 'translate-x-6' : 'translate-x-1'
                                  }`}
                                />
                              </button>

                              {/* Status Badge */}
                              <Badge variant={tool.enabled ? 'success' : 'outline'}>
                                {tool.enabled ? 'Enabled' : 'Disabled'}
                              </Badge>

                              {/* Expand Button */}
                              <button
                                className="ml-2 flex-shrink-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedTool(isExpanded ? null : tool.name);
                                }}
                              >
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4 text-muted-foreground"/>
                                ) : (
                                  <ChevronRight className="h-4 w-4 text-muted-foreground"/>
                                )}
                              </button>
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="mt-4 pl-4 border-l-2 border-primary">
                              <div className="flex items-center gap-2 mb-2">
                                <Info className="h-4 w-4 text-muted-foreground"/>
                                <p className="text-xs text-muted-foreground">
                                  Tool information
                                </p>
                              </div>
                              <div className="space-y-1 text-xs">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Has Input Schema:</span>
                                  <Badge variant="outline">{tool.hasInputSchema ? 'Yes' : 'No'}</Badge>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tool Details Panel */}
        <div className="lg:col-span-1">
          <Card className="h-fit">
            <CardHeader>
              <CardTitle>Tool Details</CardTitle>
              <CardDescription>
                View tool information and schema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {selectedTool ? (
                <>
                  {/* Tool Info */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Wrench className="h-5 w-5 text-primary"/>
                      <h3 className="font-medium text-lg">{selectedTool.name}</h3>
                    </div>

                    {selectedTool.category && (
                      <Badge variant="secondary">{selectedTool.category}</Badge>
                    )}

                    <div className="flex items-center gap-2">
                      <Badge variant={selectedTool.enabled ? 'success' : 'outline'}>
                        {selectedTool.enabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </div>

                    <p className="text-sm text-muted-foreground">
                      {selectedTool.description}
                    </p>

                    {/* Quick Actions */}
                    <div className="pt-3 border-t">
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() =>
                          handleToggleTool(
                            selectedTool.name,
                            selectedTool.enabled,
                          )
                        }
                        disabled={updateLoading === selectedTool.name}
                      >
                        {updateLoading === selectedTool.name ? (
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin"/>
                        ) : selectedTool.enabled ? (
                          <ToggleLeft className="h-4 w-4 mr-2"/>
                        ) : (
                          <ToggleRight className="h-4 w-4 mr-2"/>
                        )}
                        {selectedTool.enabled ? 'Disable Tool' : 'Enable Tool'}
                      </Button>
                    </div>
                  </div>

                  {/* Input Schema */}
                  {selectedTool.inputSchema && (
                    <div className="space-y-3 pt-3 border-t">
                      <div className="flex items-center gap-2">
                        <Code className="h-4 w-4 text-muted-foreground"/>
                        <h4 className="font-medium text-sm">Input Schema</h4>
                      </div>

                      <Card className="border-dashed bg-muted/30">
                        <CardContent className="p-4">
                          <pre className="text-xs font-mono overflow-x-auto max-h-64">
                            <JsonViewer value={selectedTool.inputSchema}/>
                          </pre>
                        </CardContent>
                      </Card>

                      {/* Schema Properties */}
                      {selectedTool.inputSchema.properties && (
                        <div className="space-y-2">
                          <h4 className="font-medium text-sm">Parameters:</h4>
                          <div className="space-y-1">
                            {Object.entries(selectedTool.inputSchema.properties).map(
                              ([key, prop]: [string, any]) => {
                                const isRequired = (
                                  selectedTool.inputSchema?.required || []
                                ).includes(key);
                                return (
                                  <div
                                    key={key}
                                    className="flex items-start justify-between rounded bg-muted/30 px-3 py-2"
                                  >
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm font-mono">{key}</span>
                                        {isRequired && (
                                          <Badge variant="destructive" className="h-4 text-[8px]">
                                            Required
                                          </Badge>
                                        )}
                                      </div>
                                      {prop.description && (
                                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                                          {prop.description}
                                        </p>
                                      )}
                                    </div>
                                    <Badge variant="outline" className="text-xs ml-2">
                                      {prop.type}
                                    </Badge>
                                  </div>
                                );
                              },
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {!selectedTool.inputSchema && (
                    <div className="pt-3 border-t">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Info className="h-4 w-4"/>
                        <span>This tool does not require any input parameters</span>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Wrench className="mx-auto h-12 w-12 opacity-20 mb-4"/>
                  <p className="text-sm">
                    Select a tool from the list to view details
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Categories Summary */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-base">Categories Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.keys(categories).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No categories available
                </p>
              ) : (
                Object.entries(categories).map(([category, toolNames]) => (
                  <div
                    key={category}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-muted-foreground"/>
                      <span className="font-medium text-sm">{category}</span>
                    </div>
                    <Badge variant="secondary">{toolNames.length}</Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Categories Breakdown Cards */}
      {Object.keys(categories).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Tools by Category</CardTitle>
            <CardDescription>
              Quick overview of tools grouped by category
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Object.entries(categories).map(([category, toolNames]) => (
                <div
                  key={category}
                  className="rounded-lg border bg-card p-4 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{category}</div>
                    <Badge variant="secondary">{toolNames.length}</Badge>
                  </div>
                  <div className="mt-3 space-y-1">
                    {toolNames.map((toolName) => {
                      const tool = tools.find((t) => t.name === toolName);
                      return (
                        <div
                          key={toolName}
                          className="flex items-center justify-between text-sm"
                        >
                          <span className="truncate">{toolName}</span>
                          <Badge
                            variant={tool?.enabled ? 'success' : 'outline'}
                            className="h-5 text-xs"
                          >
                            {tool?.enabled ? 'E' : 'D'}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default AdminTools;
