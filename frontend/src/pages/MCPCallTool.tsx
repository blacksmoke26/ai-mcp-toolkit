import * as React from 'react';
import {useEffect, useState} from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Code,
  FileText,
  Play,
  RefreshCw,
  Settings,
  Wrench,
} from 'lucide-react';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/Card';
import {Button} from '@/components/ui/Button';
import {Badge} from '@/components/ui/Badge';
import {Alert, AlertDescription, AlertTitle} from '@/components/ui/Alert';
import {Input} from '@/components/ui/Input';
import {Textarea} from '@/components/ui/Textarea';
import {callTool, type CallToolResult, listTools, type ToolDefinition, type ToolsCallRequest} from '@/lib/api';

interface ToolInput {
  name: string;
  type: string;
  description: string;
  required: boolean;
  enum?: string[];
}

export function MCPCallTool() {
  const [tools, setTools] = useState<ToolDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selectedTool, setSelectedTool] = useState<ToolDefinition | null>(null);
  const [toolInputs, setToolInputs] = useState<Record<string, string>>({});
  const [callResult, setCallResult] = useState<CallToolResult | null>(null);
  const [callError, setCallError] = useState<string | null>(null);
  const [callLoading, setCallLoading] = useState(false);
  const [expandedTool, setExpandedTool] = useState<string | null>(null);

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

  const generateToolInputs = (tool: ToolDefinition): ToolInput[] => {
    if (!tool.inputSchema?.properties) {
      return [];
    }

    const properties = tool.inputSchema.properties as Record<string, { type?: string; description?: string }>;
    const required = tool.inputSchema.required || [];

    return Object.entries(properties).map(([name, schema]) => ({
      name,
      type: schema.type || 'string',
      description: schema.description || '',
      required: required.includes(name),
    }));
  };

  const handleSelectTool = (tool: ToolDefinition) => {
    setSelectedTool(tool);
    setToolInputs({});
    setCallResult(null);
    setCallError(null);
    setExpandedTool(tool.name);
  };

  const handleInputChange = (name: string, value: string) => {
    setToolInputs((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const getToolArguments = (): Record<string, unknown> => {
    const args: Record<string, unknown> = {};
    if (!selectedTool?.inputSchema?.properties) {
      return args;
    }

    const properties = selectedTool.inputSchema.properties as Record<string, { type?: string }>;
    Object.entries(toolInputs).forEach(([name, value]) => {
      if (!value) return;

      const type = properties[name]?.type || 'string';

      if (type === 'number' && value !== '') {
        args[name] = parseFloat(value);
      } else if (type === 'integer' && value !== '') {
        args[name] = parseInt(value, 10);
      } else if (type === 'boolean' && value !== '') {
        args[name] = value.toLowerCase() === 'true';
      } else if (type === 'array' && value !== '') {
        try {
          args[name] = JSON.parse(value);
        } catch {
          args[name] = value.split(',').map((v) => v.trim());
        }
      } else {
        args[name] = value;
      }
    });

    return args;
  };

  const handleCallTool = async () => {
    if (!selectedTool) return;

    try {
      setCallLoading(true);
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

  const handleReset = () => {
    setToolInputs({});
    setCallResult(null);
    setCallError(null);
    setSelectedTool(null);
    setExpandedTool(null);
  };

  const formatJSON = (obj: unknown): string => {
    return JSON.stringify(obj, null, 2);
  };

  const getToolCategoryIcon = (category?: string) => {
    switch (category?.toLowerCase()) {
      case 'file':
        return <FileText className="h-4 w-4" />;
      case 'search':
        return <Code className="h-4 w-4" />;
      case 'system':
        return <Settings className="h-4 w-4" />;
      default:
        return <Wrench className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">MCP Call Tool</h2>
            <p className="text-muted-foreground">Execute MCP tools directly via JSON-RPC</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-6 w-48 bg-muted rounded mb-2" />
                <div className="h-4 w-64 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">MCP Call Tool</h2>
          <p className="text-muted-foreground">
            Execute MCP tools directly via JSON-RPC
          </p>
        </div>
        <Button onClick={fetchTools} variant="outline" disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh Tools
        </Button>
      </div>

      {fetchError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{fetchError}</AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Tools List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                Available Tools
              </CardTitle>
              <CardDescription>
                {tools.length} tools registered
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {tools.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No tools available
                  </div>
                ) : (
                  tools.map((tool) => {
                    const isExpanded = expandedTool === tool.name;
                    const isSelected = selectedTool?.name === tool.name;

                    return (
                      <div
                        key={tool.name}
                        className="rounded-lg border transition-all"
                      >
                        <button
                          onClick={() => handleSelectTool(tool)}
                          className={`w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors ${
                            isSelected ? 'bg-muted/50' : ''
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            {getToolCategoryIcon(tool.annotations?.readOnlyHint ? 'system' : undefined)}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm truncate">
                                  {tool.name}
                                </span>
                                {tool.annotations?.readOnlyHint && (
                                  <Badge variant="secondary" className="text-xs">
                                    Read-Only
                                  </Badge>
                                )}
                                {tool.annotations?.destructibleHint && (
                                  <Badge variant="error" className="text-xs">
                                    Destructive
                                  </Badge>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {tool.description}
                              </div>
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </button>

                        {isExpanded && (
                          <div className="border-t p-4 space-y-3 bg-muted/30">
                            <div>
                              <div className="text-xs font-medium mb-2">Input Parameters:</div>
                              {(() => {
                                const inputs = generateToolInputs(tool);
                                if (inputs.length === 0) {
                                  return <div className="text-xs text-muted-foreground">No parameters required</div>;
                                }

                                return (
                                  <div className="space-y-2">
                                    {inputs.map((input) => (
                                      <div
                                        key={input.name}
                                        className="flex items-start gap-2 text-xs"
                                      >
                                        {input.required && (
                                          <span className="text-red-500">*</span>
                                        )}
                                        <span className="font-mono">{input.name}</span>
                                        <span className="text-muted-foreground">
                                          ({input.type})
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                );
                              })()}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tool Execution Panel */}
        <div className="lg:col-span-2">
          {!selectedTool ? (
            <Card className="h-full min-h-[400px] flex items-center justify-center">
              <CardContent className="text-center p-8">
                <Wrench className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Select a Tool</h3>
                <p className="text-muted-foreground max-w-md">
                  Choose a tool from the list on the left to configure and execute it
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Tool Configuration */}
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {getToolCategoryIcon()}
                        {selectedTool.name}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {selectedTool.description}
                      </CardDescription>
                    </div>
                    <Button
                      onClick={handleReset}
                      variant="ghost"
                      size="sm"
                    >
                      Clear
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* Input Fields */}
                    {(() => {
                      const inputs = generateToolInputs(selectedTool);
                      if (inputs.length === 0) {
                        return (
                          <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                            No input parameters required for this tool
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-medium">Input Parameters</h4>
                            <Badge variant="secondary">
                              {inputs.filter((i) => i.required).length} required
                            </Badge>
                          </div>

                          {inputs.map((input) => (
                            <div key={input.name} className="space-y-2">
                              <label
                                htmlFor={input.name}
                                className="text-sm font-medium flex items-center gap-2"
                              >
                                {input.required && (
                                  <span className="text-red-500">*</span>
                                )}
                                {input.name}
                                <span className="text-muted-foreground text-xs font-normal">
                                  ({input.type})
                                </span>
                              </label>

                              {input.type === 'string' ||
                              input.type === 'text' ? (
                                <Textarea
                                  id={input.name}
                                  value={toolInputs[input.name] || ''}
                                  onChange={(e) =>
                                    handleInputChange(input.name, e.target.value)
                                  }
                                  placeholder={input.description || `Enter ${input.name}`}
                                  rows={input.name.includes('query') || input.name.includes('text') ? 3 : 2}
                                  className="font-mono text-sm"
                                />
                              ) : input.type === 'object' || input.type === 'array' ? (
                                <Textarea
                                  id={input.name}
                                  value={toolInputs[input.name] || ''}
                                  onChange={(e) =>
                                    handleInputChange(input.name, e.target.value)
                                  }
                                  placeholder={`Enter valid JSON for ${input.name}`}
                                  rows={4}
                                  className="font-mono text-sm"
                                />
                              ) : (
                                <Input
                                  id={input.name}
                                  value={toolInputs[input.name] || ''}
                                  onChange={(e) =>
                                    handleInputChange(input.name, e.target.value)
                                  }
                                  placeholder={input.description || `Enter ${input.name}`}
                                  className="font-mono"
                                />
                              )}

                              {input.description && (
                                <p className="text-xs text-muted-foreground">
                                  {input.description}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      );
                    })()}

                    {/* Execute Button */}
                    <div className="flex items-center justify-between pt-4 border-t">
                      <div className="text-sm text-muted-foreground">
                        <span className="font-medium">{tools.length}</span> tools available
                      </div>
                      <Button
                        onClick={handleCallTool}
                        disabled={callLoading}
                      >
                        {callLoading ? (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                            Executing...
                          </>
                        ) : (
                          <>
                            <Play className="mr-2 h-4 w-4" />
                            Execute Tool
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Tool Call Result */}
              {(callResult || callError) && (
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {callError ? (
                        <AlertCircle className="h-5 w-5 text-red-600" />
                      ) : (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      )}
                      Execution Result
                    </CardTitle>
                    <CardDescription>
                      Tool execution completed
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {callError ? (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Execution Failed</AlertTitle>
                        <AlertDescription>{callError}</AlertDescription>
                      </Alert>
                    ) : callResult && (
                      <div className="space-y-4">
                        <div className="rounded-lg border bg-muted/50 p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-medium">Tool Output</h4>
                            <Badge variant={callResult.isError ? 'error' : 'success'}>
                              {callResult.isError ? 'Error' : 'Success'}
                            </Badge>
                          </div>

                          <div className="space-y-3">
                            {callResult.content?.map((content, index) => (
                              <div key={index} className="space-y-1">
                                <div className="text-xs font-medium text-muted-foreground">
                                  {content.type === 'text'
                                    ? 'Text Content'
                                    : content.type === 'image'
                                    ? 'Image'
                                    : content.type === 'resource'
                                    ? 'Resource'
                                    : 'Other'}
                                </div>

                                {content.type === 'text' && (
                                  <div className="text-sm whitespace-pre-wrap break-words">
                                    {content.text}
                                  </div>
                                )}

                                {content.type === 'image' && (
                                  <div className="text-sm text-muted-foreground italic">
                                    [Image content: {content.mimeType}]
                                  </div>
                                )}

                                {content.type === 'resource' && (
                                  <div className="text-sm">
                                    <div className="font-mono text-xs text-muted-foreground mb-1">
                                      URI: {content.resource.uri}
                                    </div>
                                    {content.resource.mimeType === 'application/json' && content.resource.text ? (
                                      <pre className="text-xs bg-background p-2 rounded overflow-x-auto">
                                        {JSON.stringify(JSON.parse(content.resource.text), null, 2)}
                                      </pre>
                                    ) : (
                                      <div className="text-xs bg-background p-2 rounded overflow-x-auto">
                                        {content.resource.text}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Raw JSON Output */}
                        <div className="rounded-lg border bg-muted/50 p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-medium">Raw JSON-RPC Response</h4>
                            <Badge variant="secondary">JSON</Badge>
                          </div>
                          <pre className="text-xs bg-background p-3 rounded overflow-x-auto max-h-[300px] overflow-y-auto">
                            {formatJSON(callResult)}
                          </pre>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </div>

      {/* API Documentation */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            API Reference
          </CardTitle>
          <CardDescription>
            MCP Protocol endpoint details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border bg-muted/30 p-4">
              <h4 className="text-sm font-medium mb-2">Request Format</h4>
              <pre className="text-xs bg-background p-3 rounded overflow-x-auto">
{`{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "${selectedTool?.name || 'tool-name'}",
    "arguments": {}
  }
}`}
              </pre>
            </div>

            <div className="rounded-lg border bg-muted/30 p-4">
              <h4 className="text-sm font-medium mb-2">Supported Methods</h4>
              <ul className="text-xs space-y-1 text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3 w-3 text-green-600" />
                  <span className="font-mono">tools/list</span>
                  <span>— List all available tools</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3 w-3 text-green-600" />
                  <span className="font-mono">tools/call</span>
                  <span>— Execute a tool</span>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default MCPCallTool;
