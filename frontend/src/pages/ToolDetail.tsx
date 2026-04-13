import * as React from 'react';
import {useEffect, useState} from 'react';
import {useParams} from 'react-router-dom';
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Copy,
  ExternalLink,
  FileJson,
  Info,
  RefreshCw,
  Settings,
  Wrench,
  XCircle,
  Zap,
} from 'lucide-react';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/Card';
import {Badge} from '@/components/ui/Badge';
import {Button} from '@/components/ui/Button';
import {Input} from '@/components/ui/Input';
import {Textarea} from '@/components/ui/Textarea';
import {Alert, AlertDescription, AlertTitle} from '@/components/ui/Alert';
import {
  callTool,
  type CallToolResult,
  getToolDetails,
  type ToolDetailResponse,
  type ToolsCallRequest,
  updateTool,
  type UpdateToolRequest,
} from '@/lib/api';

export default function ToolDetail() {
  const { name } = useParams<{ name: string }>();
  const [tool, setTool] = useState<ToolDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [callResult, setCallResult] = useState<CallToolResult | null>(null);
  const [callError, setCallError] = useState<string | null>(null);
  const [callLoading, setCallLoading] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showCallForm, setShowCallForm] = useState(false);

  // Form inputs for each parameter
  const [paramValues, setParamValues] = useState<Record<string, string>>({});

  const fetchData = async () => {
    if (!name) return;

    try {
      setLoading(true);
      setError(null);
      const response = await getToolDetails(name);
      setTool(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tool details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!name) return;

    const fetch = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await getToolDetails(name);
        setTool(response);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch tool details');
      } finally {
        setLoading(false);
      }
    };

    fetch();
  }, [name]);

  // Update param values when tool changes
  useEffect(() => {
    if (tool?.inputSchema?.properties) {
      const initialValues: Record<string, string> = {};
      Object.entries(tool.inputSchema.properties).forEach(([key, prop]: [string, any]) => {
        if (prop.default !== undefined) {
          initialValues[key] = String(prop.default);
        } else if (prop.enum && prop.enum.length > 0) {
          initialValues[key] = prop.enum[0];
        } else {
          initialValues[key] = '';
        }
      });
      setParamValues(initialValues);
    }
  }, [tool]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleParamChange = (paramName: string, value: string) => {
    setParamValues(prev => ({ ...prev, [paramName]: value }));
  };

  const handleCallTool = async () => {
    if (!tool) return;

    try {
      setCallLoading(true);
      setCallResult(null);
      setCallError(null);

      // Build arguments from form values
      const args: Record<string, unknown> = {};
      if (tool.inputSchema?.properties) {
        Object.entries(tool.inputSchema.properties).forEach(([key, prop]: [string, any]) => {
          const value = paramValues[key] || '';
          if (value) {
            if (prop.type === 'number' || prop.type === 'integer') {
              args[key] = parseFloat(value);
            } else if (prop.type === 'boolean') {
              args[key] = value.toLowerCase() === 'true';
            } else {
              args[key] = value;
            }
          }
        });
      }

      const toolRequest: ToolsCallRequest = {
        name: tool.name,
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

  const handleToggleEnabled = async () => {
    if (!tool || !name) return;

    try {
      setUpdateLoading(true);
      const update: UpdateToolRequest = { enabled: !tool.enabled };
      await updateTool(name, update);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update tool');
    } finally {
      setUpdateLoading(false);
    }
  };

  const resetCallForm = () => {
    setCallResult(null);
    setCallError(null);
    setShowCallForm(false);
  };

  const formatJSON = (data: unknown) => {
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  };

  const getParamInput = (paramName: string, prop: any) => {
    const value = paramValues[paramName] || '';
    const isRequired = tool?.inputSchema?.required?.includes(paramName) || false;

    if (prop.enum && prop.enum.length > 0) {
      return (
        <select
          key={paramName}
          value={value}
          onChange={(e) => handleParamChange(paramName, e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {prop.enum.map((option: string) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      );
    }

    if (prop.type === 'number' || prop.type === 'integer') {
      return (
        <Input
          key={paramName}
          type="number"
          value={value}
          onChange={(e) => handleParamChange(paramName, e.target.value)}
          placeholder={`Enter ${paramName}`}
          step={prop.type === 'integer' ? '1' : 'any'}
        />
      );
    }

    if (prop.type === 'boolean') {
      return (
        <select
          key={paramName}
          value={value}
          onChange={(e) => handleParamChange(paramName, e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="true">true</option>
          <option value="false">false</option>
        </select>
      );
    }

    if (prop.type === 'array') {
      return (
        <Textarea
          key={paramName}
          value={value}
          onChange={(e) => handleParamChange(paramName, e.target.value)}
          placeholder={`Enter comma-separated ${paramName}`}
        />
      );
    }

    return (
      <Input
        key={paramName}
        type="text"
        value={value}
        onChange={(e) => handleParamChange(paramName, e.target.value)}
        placeholder={`Enter ${paramName}`}
      />
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <RefreshCw className="h-6 w-6 animate-spin" />
          <h2 className="text-3xl font-bold tracking-tight">Loading Tool Details...</h2>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-6 w-6 text-destructive" />
          <h2 className="text-3xl font-bold tracking-tight">Error Loading Tool</h2>
        </div>
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <div className="flex gap-2">
          <Button onClick={fetchData}>Retry</Button>
          <Button variant="outline" asChild>
            <a href="/admin/tools">
              <ExternalLink className="h-4 w-4 mr-2" />
              Browse Tools
            </a>
          </Button>
        </div>
      </div>
    );
  }

  if (!tool) {
    return (
      <div className="space-y-6">
        <Alert>
          <AlertTitle>Tool Not Found</AlertTitle>
          <AlertDescription>The requested tool does not exist.</AlertDescription>
        </Alert>
        <Button variant="outline" asChild>
          <a href="/admin/tools">
            <ExternalLink className="h-4 w-4 mr-2" />
            Browse Tools
          </a>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Wrench className="h-8 w-8 text-blue-500" />
            <div>
              <h2 className="text-3xl font-bold tracking-tight">{tool.name}</h2>
              <Badge variant={tool.enabled ? "default" : "secondary"}>
                {tool.enabled ? "Enabled" : "Disabled"}
              </Badge>
            </div>
          </div>
          {tool.category && (
            <p className="text-muted-foreground">
              Category: <Badge variant="outline">{tool.category}</Badge>
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            onClick={fetchData}
            variant="outline"
            size="sm"
            disabled={updateLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${updateLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={handleToggleEnabled}
            variant="outline"
            size="sm"
            disabled={updateLoading || callLoading}
          >
            {tool.enabled ? (
              <XCircle className="h-4 w-4 mr-2" />
            ) : (
              <CheckCircle2 className="h-4 w-4 mr-2" />
            )}
            {tool.enabled ? 'Disable' : 'Enable'}
          </Button>
        </div>
      </div>

      {/* Tool Description */}
      <Card>
        <CardHeader>
          <CardTitle>Description</CardTitle>
          <CardDescription>Detailed information about this tool</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{tool.description}</p>
        </CardContent>
      </Card>

      {/* Tool Status Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            {tool.enabled ? (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            ) : (
              <XCircle className="h-4 w-4 text-muted-foreground" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">{tool.enabled ? 'Active' : 'Inactive'}</div>
            <p className="text-xs text-muted-foreground">
              {tool.enabled ? 'Ready to be called' : 'Currently disabled'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Parameters</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {tool.inputSchema?.properties ? Object.keys(tool.inputSchema.properties).length : 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {tool.inputSchema?.required?.length || 0} required
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Schema Type</CardTitle>
            <FileJson className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {tool.inputSchema ? 'Defined' : 'None'}
            </div>
            <p className="text-xs text-muted-foreground">
              {tool.inputSchema ? 'Accepts parameters' : 'No parameters'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Input Schema */}
      {tool.inputSchema && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Input Schema</CardTitle>
                <CardDescription>Parameters accepted by this tool</CardDescription>
              </div>
              <Button
                onClick={() => copyToClipboard(formatJSON(tool.inputSchema))}
                variant="outline"
                size="sm"
              >
                {copied ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                {copied ? 'Copied!' : 'Copy JSON'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {Object.entries(tool.inputSchema.properties || {}).length > 0 ? (
              <div className="space-y-4">
                {Object.entries(tool?.inputSchema?.properties ?? {}).map(([key, prop]: [string, any]) => {
                  const isRequired = (tool?.inputSchema?.required || []).includes(key);
                  return (
                    <div
                      key={key}
                      className="border rounded-lg p-4 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{key}</h4>
                          {isRequired && (
                            <Badge variant="destructive" className="text-xs">Required</Badge>
                          )}
                          <Badge variant="outline">{prop.type}</Badge>
                        </div>
                        {prop.enum && prop.enum.length > 0 && (
                          <Badge variant="secondary">
                            {prop.enum.map((e: string) => e).join(', ')}
                          </Badge>
                        )}
                      </div>
                      {prop.description && (
                        <p className="text-sm text-muted-foreground">{prop.description}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Info className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>This tool accepts no parameters</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* JSON Schema Preview */}
      {tool.inputSchema && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>JSON Schema</CardTitle>
                <CardDescription>Raw schema definition</CardDescription>
              </div>
              <Badge variant="outline">JSON</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted p-4 rounded-md overflow-x-auto text-sm">
              <code>{formatJSON(tool.inputSchema)}</code>
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Call Tool Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Call Tool</CardTitle>
              <CardDescription>Test this tool with sample inputs</CardDescription>
            </div>
            <Button
              onClick={() => setShowCallForm(!showCallForm)}
              variant="outline"
            >
              <Zap className="h-4 w-4 mr-2" />
              {showCallForm ? 'Hide Form' : 'Show Form'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {showCallForm && (
            <div className="space-y-4">
              {tool.inputSchema?.properties && Object.keys(tool.inputSchema.properties).length > 0 ? (
                <div className="space-y-4">
                  {Object.entries(tool.inputSchema.properties).map(([key, prop]: [string, any]) => (
                    <div key={key} className="space-y-2">
                      <label className="text-sm font-medium flex items-center gap-2">
                        {key}
                        {tool.inputSchema?.required?.includes(key) && (
                          <Badge variant="destructive" className="text-xs h-4 px-1">Required</Badge>
                        )}
                      </label>
                      {getParamInput(key, prop)}
                      {prop.description && (
                        <p className="text-xs text-muted-foreground">{prop.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    This tool accepts no parameters
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={handleCallTool}
                  disabled={callLoading || !tool.enabled}
                >
                  {callLoading ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Calling...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 mr-2" />
                      Call Tool
                    </>
                  )}
                </Button>
                <Button
                  onClick={resetCallForm}
                  variant="outline"
                  disabled={callLoading}
                >
                  Reset
                </Button>
              </div>

              {callError && (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription className="ml-2">{callError}</AlertDescription>
                </Alert>
              )}

              {callResult && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">Result</h4>
                    <Badge variant={callResult.isError ? "destructive" : "default"}>
                      {callResult.isError ? 'Error' : 'Success'}
                    </Badge>
                  </div>
                  <pre className="bg-muted p-4 rounded-md overflow-x-auto text-sm max-h-96 overflow-y-auto">
                    <code>{formatJSON(callResult)}</code>
                  </pre>
                </div>
              )}
            </div>
          )}

          {!showCallForm && (
            <div className="text-center py-8 text-muted-foreground">
              <Zap className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Click "Show Form" to test this tool</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Links */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Links</CardTitle>
          <CardDescription>Navigate to related pages</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <Button variant="outline" className="justify-start" asChild>
              <a href="/admin/tools">
                <Wrench className="h-4 w-4 mr-2" />
                All Tools
              </a>
            </Button>
            <Button variant="outline" className="justify-start" asChild>
              <a href="/mcp/tools">
                <ChevronRight className="h-4 w-4 mr-2" />
                Browse & Call
              </a>
            </Button>
            <Button variant="outline" className="justify-start" asChild>
              <a href="/mcp/info">
                <Info className="h-4 w-4 mr-2" />
                MCP Info
              </a>
            </Button>
            <Button variant="outline" className="justify-start" asChild>
              <a href="/simulate">
                <Settings className="h-4 w-4 mr-2" />
                Simulator
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
