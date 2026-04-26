import * as React from 'react';
import {useEffect, useState} from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Code,
  Filter,
  Play,
  Search,
  Wrench,
  XCircle,
} from 'lucide-react';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/Card';
import {Button} from '@/components/ui/Button';
import {Badge} from '@/components/ui/Badge';
import {Input} from '@/components/ui/Input';
import {Alert, AlertDescription, AlertTitle} from '@/components/ui/Alert';
import {callTool, type CallToolResult, listTools, type ToolDefinition, type ToolsCallRequest} from '@/lib/api';
import JsonViewer from '@/components/ui/JsonViewer';

interface ToolInfo extends ToolDefinition {
  category?: string;
  enabled?: boolean;
}

export function MCPTools() {
  const [tools, setTools] = useState<ToolInfo[]>([]);
  const [selectedTool, setSelectedTool] = useState<ToolInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [callResult, setCallResult] = useState<CallToolResult | null>(null);
  const [callError, setCallError] = useState<string | null>(null);
  const [callLoading, setCallLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedTool, setExpandedTool] = useState<string | null>(null);

  // Fetch all tools
  const fetchTools = async () => {
    try {
      setLoading(true);
      setFetchError(null);
      const response = await listTools();
      setTools(response.tools || []);
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'Failed to fetch tools');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTools();
  }, []);

  // Get unique categories
  const categories = React.useMemo(() => {
    const cats = new Set<string>();
    tools.forEach(tool => {
      if (tool.category) cats.add(tool.category);
    });
    return ['all', ...Array.from(cats)];
  }, [tools]);

  // Filter tools based on search and category
  const filteredTools = React.useMemo(() => {
    return tools.filter(tool => {
      const matchesSearch =
        tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tool.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        selectedCategory === 'all' || tool.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [tools, searchQuery, selectedCategory]);

  // Generate input form fields based on tool schema
  const generateToolInputs = (tool: ToolDefinition) => {
    if (!tool.inputSchema) return null;

    const properties = tool.inputSchema.properties || {};
    const required = tool.inputSchema.required || [];

    return Object.entries(properties).map(([key, prop]: [string, any]) => {
      const isRequired = required.includes(key);
      const propType = prop.type;
      const description = prop.description || '';
      const enumValues = prop.enum || [];

      if (enumValues.length > 0) {
        return (
          <div key={key} className="space-y-1">
            <label className="text-sm font-medium">
              {key} {isRequired && <span className="text-red-500">*</span>}
            </label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              defaultValue=""
              data-name={key}
            >
              <option value="">Select...</option>
              {enumValues.map((val) => (
                <option key={val} value={val}>
                  {val}
                </option>
              ))}
            </select>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
        );
      }

      if (propType === 'string') {
        return (
          <div key={key} className="space-y-1">
            <label className="text-sm font-medium">
              {key} {isRequired && <span className="text-red-500">*</span>}
            </label>
            <Input
              placeholder={`Enter ${key}`}
              data-name={key}
              data-type="text"
            />
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
        );
      }

      if (propType === 'number') {
        return (
          <div key={key} className="space-y-1">
            <label className="text-sm font-medium">
              {key} {isRequired && <span className="text-red-500">*</span>}
            </label>
            <Input
              type="number"
              placeholder={`Enter ${key}`}
              data-name={key}
              data-type="number"
            />
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
        );
      }

      return (
        <div key={key} className="space-y-1">
          <label className="text-sm font-medium">
            {key} {isRequired && <span className="text-red-500">*</span>}
          </label>
          <Input
            placeholder={`Enter ${key}`}
            data-name={key}
          />
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
      );
    });
  };

  // Collect form values
  const getToolArguments = (): Record<string, unknown> => {
    const args: Record<string, unknown> = {};
    const inputs = document.querySelectorAll('[data-name]');

    inputs.forEach((input) => {
      const name = input.getAttribute('data-name') || '';
      const type = input.getAttribute('data-type') || 'text';
      const value = (input as HTMLInputElement).value;

      if (value) {
        if (type === 'number') {
          args[name] = parseFloat(value);
        } else {
          args[name] = value;
        }
      }
    });

    return args;
  };

  // Call selected tool
  const handleCallTool = async () => {
    if (!selectedTool) return;

    try {
      setCallLoading(true);
      setCallResult(null);
      setCallError(null);

      const args = getToolArguments();
      const toolRequest: ToolsCallRequest = {
        name: selectedTool.name,
        arguments: args,
      };

      const result = await callTool(toolRequest);
      setCallResult(result);
    } catch (err) {
      setCallError(err instanceof Error ? err.message : 'Failed to call tool');
    } finally {
      setCallLoading(false);
    }
  };

  // Reset tool call
  const resetToolCall = () => {
    setCallResult(null);
    setCallError(null);
    const inputs = document.querySelectorAll('[data-name]');
    inputs.forEach((input) => {
      if (input instanceof HTMLInputElement || input instanceof HTMLSelectElement) {
        input.value = '';
      }
    });
  };

  // Format JSON for display
  const formatJSON = (data: unknown) => {
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">MCP Tools</h2>
          <p className="text-muted-foreground">
            Browse, test, and interact with available MCP tools via JSON-RPC 2.0
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={fetchTools} variant="outline" disabled={loading}>
            <Wrench className="mr-2 h-4 w-4" />
            {loading ? 'Loading...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {fetchError && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{fetchError}</AlertDescription>
        </Alert>
      )}

      {/* Search and Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search tools..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              {categories.map((category) => (
                <Badge
                  key={category}
                  variant={selectedCategory === category ? 'default' : 'outline'}
                  className="cursor-pointer px-3 py-1"
                  onClick={() => setSelectedCategory(category)}
                >
                  {category === 'all' ? 'All' : category}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Tools List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Available Tools</CardTitle>
              <CardDescription>
                {filteredTools.length} of {tools.length} tools shown
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[calc(100vh-300px)] overflow-y-auto">
                {loading ? (
                  <div className="p-4 space-y-2">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className="h-16 bg-muted rounded animate-pulse"
                      />
                    ))}
                  </div>
                ) : filteredTools.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <Wrench className="mx-auto h-12 w-12 opacity-20 mb-4" />
                    <p>No tools found</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {filteredTools.map((tool) => {
                      const isSelected = selectedTool?.name === tool.name;
                      const isExpanded = expandedTool === tool.name;

                      return (
                        <div
                          key={tool.name}
                          className={
                            `p-4 cursor-pointer transition-colors hover:bg-accent/50 ` +
                            (isSelected ? 'bg-accent' : '')
                          }
                          onClick={() => {
                            setSelectedTool(tool);
                            resetToolCall();
                          }}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h3 className="font-medium truncate">
                                  {tool.name}
                                </h3>
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
                            <button
                              className="ml-2 flex-shrink-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedTool(isExpanded ? null : tool.name);
                              }}
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </button>
                          </div>

                          {isExpanded && tool.inputSchema && (
                            <div className="mt-4 pl-4 border-l-2 border-muted">
                              <p className="text-xs font-medium text-muted-foreground mb-2">
                                Input Parameters:
                              </p>
                              <div className="space-y-1 text-xs">
                                {Object.entries(tool.inputSchema.properties || {}).map(
                                  ([key, prop]: [string, any]) => {
                                    const isRequired = (tool.inputSchema?.required || []).includes(
                                      key,
                                    );
                                    return (
                                      <div
                                        key={key}
                                        className="flex items-center justify-between"
                                      >
                                        <span className="text-muted-foreground">
                                          {key}
                                          {isRequired && ' *'}
                                        </span>
                                        <Badge variant="outline" className="text-xs">
                                          {prop.type}
                                        </Badge>
                                      </div>
                                    );
                                  }
                                )}
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

        {/* Tool Details and Testing */}
        <div className="lg:col-span-2">
          {selectedTool ? (
            <div className="space-y-6">
              {/* Tool Info */}
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Wrench className="h-5 w-5" />
                        {selectedTool.name}
                      </CardTitle>
                      {selectedTool.category && (
                        <CardDescription className="mt-1">
                          Category: {selectedTool.category}
                        </CardDescription>
                      )}
                    </div>
                    <Badge variant="outline">JSON-RPC 2.0</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    {selectedTool.description}
                  </p>

                  {selectedTool.inputSchema && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium">Input Schema</h4>
                        <Badge variant="secondary">
                          {Object.keys(selectedTool.inputSchema.properties || {}).length} params
                        </Badge>
                      </div>
                      <Card className="border-dashed">
                        <CardContent className="p-4 bg-muted/30">
                          <pre className="text-xs font-mono overflow-x-auto">
                            <JsonViewer value={selectedTool.inputSchema}/>
                          </pre>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Tool Input Form */}
              {selectedTool.inputSchema && (
                <Card>
                  <CardHeader>
                    <CardTitle>Test Tool</CardTitle>
                    <CardDescription>
                      Enter parameters and call the tool via MCP protocol
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      {generateToolInputs(selectedTool)}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={handleCallTool}
                        disabled={callLoading}
                        className="gap-2"
                      >
                        <Play className="h-4 w-4" />
                        {callLoading ? 'Calling...' : 'Call Tool'}
                      </Button>
                      <Button
                        onClick={resetToolCall}
                        variant="outline"
                        disabled={callLoading}
                      >
                        Clear
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Tool Call Result */}
              {(callResult || callError) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {callError ? (
                        <>
                          <XCircle className="h-5 w-5 text-destructive" />
                          Error
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                          Result
                        </>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {callError ? (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{callError}</AlertDescription>
                      </Alert>
                    ) : (
                      <div className="space-y-4">
                        {callResult?.isError && (
                          <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                              {callResult.content?.[0]?.text || 'Error occurred'}
                            </AlertDescription>
                          </Alert>
                        )}

                        {!callResult?.isError && callResult?.content && (
                          <div className="space-y-2">
                            {callResult.content.map((item, index) => (
                              <div key={index}>
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge variant="secondary">{item.type}</Badge>
                                  {item.mimeType && (
                                    <Badge variant="outline">{item.mimeType}</Badge>
                                  )}
                                </div>
                                {item.text && (
                                  <pre className="text-sm font-mono bg-muted p-4 rounded-lg overflow-x-auto whitespace-pre-wrap">
                                    {item.text}
                                  </pre>
                                )}
                                {item.uri && (
                                  <div className="flex items-center gap-2 text-sm">
                                    <Code className="h-4 w-4" />
                                    <a
                                      href={item.uri}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-primary hover:underline"
                                    >
                                      {item.uri}
                                    </a>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="pt-4 border-t">
                          <h4 className="text-sm font-medium mb-2">Raw Response</h4>
                          <Card className="border-dashed">
                            <CardContent className="p-4 bg-muted/30">
                              <pre className="text-xs font-mono overflow-x-auto">
                                <JsonViewer value={callResult}/>
                              </pre>
                            </CardContent>
                          </Card>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <Card className="h-full min-h-[400px] flex items-center justify-center">
              <CardContent className="text-center text-muted-foreground">
                <Wrench className="mx-auto h-16 w-16 opacity-20 mb-4" />
                <h3 className="text-lg font-medium mb-2">No Tool Selected</h3>
                <p className="text-sm">
                  Select a tool from the list to view details and test it
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

export default MCPTools;
