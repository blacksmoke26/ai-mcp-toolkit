import * as React from 'react';
import { useEffect, useState } from 'react';
import {
  Play,
  Settings,
  Trash2,
  Plus,
  Save,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Terminal,
  Activity,
  Zap,
  Clock,
  FileJson,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/Alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import {
  Input,
  Textarea,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Forms';
import {
  listAdminTools,
  runScenario,
  listMocks,
  setMock,
  removeMock,
  clearMocks,
  getMockMode,
  setMockMode,
  runLoadSimulation,
  executeTool,
  listScenarios,
} from '@/lib/api';
import type {
  ScenarioResult,
  LoadResults,
} from '@/lib/api';

export function ToolSimulator() {
  const [activeTab, setActiveTab] = React.useState('tool-test');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Tool Test State
  const [availableTools, setAvailableTools] = useState<string[]>([]);
  const [selectedTool, setSelectedTool] = useState('');
  const [toolArgs, setToolArgs] = useState('{}');
  const [useMockForTool, setUseMockForTool] = useState(false);
  const [toolResult, setToolResult] = useState<{ success: boolean; result?: any; error?: string; durationMs?: number; timestamp?: string } | null>(null);
  const [toolExecuting, setToolExecuting] = useState(false);

  // Mock Management State
  const [mockModeEnabled, setMockModeEnabled] = useState(false);
  const [mocks, setMocks] = useState<Record<string, { isError?: boolean; delayMs?: number; failureRate?: number }>>({});
  const [mockToolName, setMockToolName] = useState('');
  const [mockContent, setMockContent] = useState('');
  const [mockIsError, setMockIsError] = useState(false);
  const [mockDelayMs, setMockDelayMs] = useState('');
  const [mockFailureRate, setMockFailureRate] = useState('');

  // Scenario State
  const [scenarios, setScenarios] = useState<{ name: string; description: string; steps: number; hasMocks: boolean }[]>([]);
  const [selectedScenario, setSelectedScenario] = useState('');
  const [scenarioResult, setScenarioResult] = useState<ScenarioResult | null>(null);
  const [scenarioRunning, setScenarioRunning] = useState(false);

  // Load Test State
  const [loadTools, setLoadTools] = useState<string[]>([]);
  const [concurrentUsers, setConcurrentUsers] = useState(5);
  const [durationMs, setDurationMs] = useState(5000);
  const [requestsPerSecond, setRequestsPerSecond] = useState(2);
  const [useMocksForLoad, setUseMocksForLoad] = useState(false);
  const [loadResults, setLoadResults] = useState<LoadResults | null>(null);
  const [loadRunning, setLoadRunning] = useState(false);

  // Load initial data
  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [toolsData, mockModeData, mocksData, scenariosData] = await Promise.all([
        listAdminTools().catch(() => ({ tools: [] })),
        getMockMode().catch(() => ({ mockModeEnabled: false })),
        listMocks().catch(() => ({ mocks: {} })),
        listScenarios().catch(() => ({ scenarios: [] })),
      ]);

      setAvailableTools(toolsData.tools.map((t: { name: string }) => t.name) || []);
      setMockModeEnabled(mockModeData.mockModeEnabled);
      setMocks(mocksData.mocks || {});
      setScenarios(scenariosData.scenarios || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load initial data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Tool Test Functions
  const handleToolTest = async () => {
    if (!selectedTool) {
      setError('Please select a tool to test');
      return;
    }

    setToolExecuting(true);
    setError(null);

    try {
      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(toolArgs || '{}');
      } catch {
        // Empty args
      }

      const result = await executeTool({
        name: selectedTool,
        args,
        useMock: useMockForTool,
      });

      setToolResult(result);
    } catch (err) {
      setToolResult({
        success: false,
        error: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setToolExecuting(false);
    }
  };

  const clearToolResult = () => {
    setToolResult(null);
  };

  // Mock Management Functions
  const toggleMockMode = async () => {
    try {
      const newMode = !mockModeEnabled;
      await setMockMode(newMode);
      setMockModeEnabled(newMode);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle mock mode');
    }
  };

  const handleSaveMock = async () => {
    if (!mockToolName || !mockContent) {
      setError('Please provide tool name and mock content');
      return;
    }

    try {
      const mock = {
        tool: mockToolName,
        content: [{ type: 'text' as const, text: mockContent }],
        isError: mockIsError,
        delayMs: mockDelayMs ? parseInt(mockDelayMs) : undefined,
        failureRate: mockFailureRate ? parseFloat(mockFailureRate) : undefined,
      };

      await setMock(mock);
      await loadInitialData();

      // Clear form
      setMockContent('');
      setMockIsError(false);
      setMockDelayMs('');
      setMockFailureRate('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save mock');
    }
  };

  const handleRemoveMock = async (tool: string) => {
    try {
      await removeMock(tool);
      await loadInitialData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove mock');
    }
  };

  const handleClearMocks = async () => {
    if (!confirm('Are you sure you want to clear all mocks?')) return;

    try {
      await clearMocks();
      await loadInitialData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear mocks');
    }
  };

  // Scenario Functions
  const handleRunScenario = async () => {
    if (!selectedScenario) {
      setError('Please select a scenario to run');
      return;
    }

    setScenarioRunning(true);
    setError(null);
    setScenarioResult(null);

    try {
      const result = await runScenario(selectedScenario, { useMocks: true });
      setScenarioResult(result.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run scenario');
    } finally {
      setScenarioRunning(false);
    }
  };

  // Load Test Functions
  const selectToolForLoad = (tool: string) => {
    setLoadTools(prev =>
      prev.includes(tool) ? prev.filter(t => t !== tool) : [...prev, tool]
    );
  };

  const clearLoadTools = () => {
    setLoadTools([]);
  };

  const handleLoadTest = async () => {
    if (loadTools.length === 0) {
      setError('Please select at least one tool for load testing');
      return;
    }

    setLoadRunning(true);
    setError(null);
    setLoadResults(null);

    try {
      const config = {
        tools: loadTools,
        concurrentUsers,
        durationMs,
        requestsPerSecond,
        useMocks: useMocksForLoad,
      };

      const result = await runLoadSimulation(config);
      setLoadResults(result.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run load test');
    } finally {
      setLoadRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Tool Simulator</h2>
          <p className="text-muted-foreground">
            Test tools, configure mocks, run scenarios, and perform load testing
          </p>
        </div>
        <Button variant="outline" onClick={loadInitialData} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 md:grid-cols-4 lg:grid-cols-4">
          <TabsTrigger value="tool-test">
            <Terminal className="mr-2 h-4 w-4" />
            Tool Test
          </TabsTrigger>
          <TabsTrigger value="mocks">
            <Settings className="mr-2 h-4 w-4" />
            Mocks
          </TabsTrigger>
          <TabsTrigger value="scenarios">
            <Play className="mr-2 h-4 w-4" />
            Scenarios
          </TabsTrigger>
          <TabsTrigger value="load-test">
            <Activity className="mr-2 h-4 w-4" />
            Load Test
          </TabsTrigger>
        </TabsList>

        {/* Tool Test Tab */}
        <TabsContent value="tool-test" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Tool Execution Test</CardTitle>
                <CardDescription>Execute a single tool with custom arguments</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="tool-select">Select Tool</Label>
                  <Select value={selectedTool} onValueChange={setSelectedTool}>
                    <SelectTrigger id="tool-select">
                      <SelectValue placeholder="Choose a tool to test..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableTools.map((tool) => (
                        <SelectItem key={tool} value={tool}>
                          {tool}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tool-args">Arguments (JSON)</Label>
                  <Textarea
                    id="tool-args"
                    value={toolArgs}
                    onChange={(e) => setToolArgs(e.target.value)}
                    placeholder='{"expression": "2 + 2"}'
                    className="min-h-[100px] font-mono"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="use-mock"
                    checked={useMockForTool}
                    onChange={(e) => setUseMockForTool(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor="use-mock" className="cursor-pointer">
                    Use mock response (if configured)
                  </Label>
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleToolTest} disabled={toolExecuting || !selectedTool}>
                    <Play className="mr-2 h-4 w-4" />
                    {toolExecuting ? 'Executing...' : 'Execute Tool'}
                  </Button>
                  <Button variant="outline" onClick={clearToolResult} disabled={!toolResult}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Clear Result
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Result</CardTitle>
                <CardDescription>Tool execution output</CardDescription>
              </CardHeader>
              <CardContent>
                {toolResult ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      {toolResult.success ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500" />
                      )}
                      <Badge variant={toolResult.success ? 'default' : 'destructive'}>
                        {toolResult.success ? 'Success' : 'Failed'}
                      </Badge>
                    </div>

                    {toolResult.result?.content && (
                      <div className="space-y-2">
                        <Label>Response Content:</Label>
                        <div className="bg-muted rounded-lg p-3 text-sm font-mono overflow-x-auto">
                          <pre>{JSON.stringify(toolResult.result.content, null, 2)}</pre>
                        </div>
                      </div>
                    )}

                    {toolResult.error && (
                      <div className="space-y-2">
                        <Label>Error:</Label>
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm font-mono">
                          {toolResult.error}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      Duration: {toolResult.durationMs}ms
                    </div>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FileJson className="h-4 w-4" />
                      Timestamp: {new Date(toolResult.timestamp as string).toLocaleString()}
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    <Terminal className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No results yet. Execute a tool to see output.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Mocks Tab */}
        <TabsContent value="mocks" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Create Mock Response</CardTitle>
                <CardDescription>Configure mock responses for tools</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="mock-tool">Tool Name</Label>
                  <Input
                    id="mock-tool"
                    value={mockToolName}
                    onChange={(e) => setMockToolName(e.target.value)}
                    placeholder="e.g., get_current_time"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mock-content">Mock Content (Text Response)</Label>
                  <Textarea
                    id="mock-content"
                    value={mockContent}
                    onChange={(e) => setMockContent(e.target.value)}
                    placeholder="Mock response text"
                    className="min-h-[100px]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="mock-delay">Delay (ms)</Label>
                    <Input
                      id="mock-delay"
                      type="number"
                      value={mockDelayMs}
                      onChange={(e) => setMockDelayMs(e.target.value)}
                      placeholder="100"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="mock-failure-rate">Failure Rate (0-1)</Label>
                    <Input
                      id="mock-failure-rate"
                      type="number"
                      min="0"
                      max="1"
                      step="0.1"
                      value={mockFailureRate}
                      onChange={(e) => setMockFailureRate(e.target.value)}
                      placeholder="0.1"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="mock-error"
                    checked={mockIsError}
                    onChange={(e) => setMockIsError(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor="mock-error" className="cursor-pointer">
                    Mark as error response
                  </Label>
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleSaveMock}>
                    <Save className="mr-2 h-4 w-4" />
                    Save Mock
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Mock Mode
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      {mockModeEnabled ? 'Using mock responses' : 'Using real tool execution'}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={toggleMockMode}
                    >
                      {mockModeEnabled ? 'Disable' : 'Enable'}
                    </Button>
                  </div>

                  <Badge variant={mockModeEnabled ? 'default' : 'secondary'}>
                    {mockModeEnabled ? 'ON' : 'OFF'}
                  </Badge>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Configured Mocks</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground">
                    {Object.keys(mocks).length} mock(s) configured
                  </div>
                  {Object.keys(mocks).length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleClearMocks}
                      className="w-full mt-2"
                    >
                      <Trash2 className="mr-2 h-3 w-3" />
                      Clear All
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Configured Mocks List */}
          {Object.keys(mocks).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Configured Mock Responses</CardTitle>
                <CardDescription>Manage existing mock configurations</CardDescription>

              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(mocks).map(([tool, mock]: [string, { isError?: boolean; delayMs?: number; failureRate?: number }]) => (
                    <div
                      key={tool}
                      className="rounded-lg border bg-muted p-4 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-4">
                        <Badge variant="secondary">{tool}</Badge>
                        <div className="text-sm text-muted-foreground">
                          {mock.delayMs && <span className="mr-2">Delay: {mock.delayMs}ms</span>}
                          {mock.failureRate && <span>Failure rate: {(mock.failureRate * 100).toFixed(0)}%</span>}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveMock(tool)}
                      >
                        <Trash2 className="h-4 w-4" />
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Scenarios Tab */}
        <TabsContent value="scenarios" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Scenario Runner</CardTitle>
                <CardDescription>Execute predefined test scenarios</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="scenario-select">Select Scenario</Label>
                  <Select value={selectedScenario} onValueChange={setSelectedScenario}>
                    <SelectTrigger id="scenario-select">
                      <SelectValue placeholder="Choose a scenario to run..." />
                    </SelectTrigger>
                    <SelectContent>
                      {scenarios.map((scenario) => (
                        <SelectItem key={scenario.name} value={scenario.name}>
                          {scenario.name} - {scenario.description}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={handleRunScenario}
                  disabled={scenarioRunning || !selectedScenario}
                  className="w-full"
                >
                  <Play className="mr-2 h-4 w-4" />
                  {scenarioRunning ? 'Running...' : 'Run Scenario'}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Available Scenarios</CardTitle>
                <CardDescription>{scenarios.length} scenarios registered</CardDescription>
              </CardHeader>
              <CardContent>
                {scenarios.length === 0 ? (
                  <div className="text-center text-muted-foreground py-4">
                    No scenarios available
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {scenarios.map((scenario) => (
                      <div
                        key={scenario.name}
                        className="rounded-lg border p-3 hover:bg-muted transition-colors cursor-pointer"
                        onClick={() => setSelectedScenario(scenario.name)}
                      >
                        <div className="font-medium text-sm">{scenario.name}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {scenario.description}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {scenario.steps} steps · {scenario.hasMocks ? 'With mocks' : 'No mocks'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Scenario Results */}
          {scenarioResult && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{scenarioResult.name}</span>
                  {scenarioResult.passed ? (
                    <Badge variant="default" className="bg-green-500">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Passed
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      <XCircle className="h-3 w-3 mr-1" />
                      Failed
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Completed in {scenarioResult.durationMs}ms
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {scenarioResult.steps.map((step, index: number) => (
                    <div
                      key={index}
                      className="rounded-lg border p-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {step.passed ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                          <span className="font-medium text-sm">{step.name}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {step.durationMs}ms
                        </span>
                      </div>
                      {step.error && (
                        <div className="text-sm text-red-500 mt-2">
                          {step.error}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {scenarioResult.errors.length > 0 && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="font-medium text-red-700 mb-2">Errors:</div>
                    <ul className="list-disc list-inside text-sm text-red-600">
                      {scenarioResult.errors.map((err, idx: number) => (
                        <li key={idx}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Load Test Tab */}
        <TabsContent value="load-test" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Load Test Configuration</CardTitle>
                <CardDescription>Simulate concurrent requests to test tool performance</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Select Tools to Test</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setLoadTools(availableTools)}
                      disabled={availableTools.length === 0}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Select All
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearLoadTools}
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Clear
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border rounded-lg p-2">
                    {availableTools.map((tool) => (
                      <label
                        key={tool}
                        className="flex items-center gap-2 text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={loadTools.includes(tool)}
                          onChange={() => selectToolForLoad(tool)}
                          className="h-4 w-4 rounded"
                        />
                        <span>{tool}</span>
                      </label>
                    ))}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Selected: {loadTools.length} tool(s)
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="concurrent-users">Concurrent Users</Label>
                    <Input
                      id="concurrent-users"
                      type="number"
                      min="1"
                      max="100"
                      value={concurrentUsers}
                      onChange={(e) => setConcurrentUsers(parseInt(e.target.value) || 5)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="duration-ms">Duration (ms)</Label>
                    <Input
                      id="duration-ms"
                      type="number"
                      min="1000"
                      max="60000"
                      value={durationMs}
                      onChange={(e) => setDurationMs(parseInt(e.target.value) || 5000)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="rps">Requests Per Second (per user)</Label>
                    <Input
                      id="rps"
                      type="number"
                      min="1"
                      max="50"
                      value={requestsPerSecond}
                      onChange={(e) => setRequestsPerSecond(parseInt(e.target.value) || 2)}
                    />
                  </div>

                  <div className="flex items-end">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="use-mocks-load"
                        checked={useMocksForLoad}
                        onChange={(e) => setUseMocksForLoad(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <Label htmlFor="use-mocks-load" className="cursor-pointer">
                        Use mock responses
                      </Label>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handleLoadTest}
                  disabled={loadRunning || loadTools.length === 0}
                  className="w-full"
                >
                  <Activity className="mr-2 h-4 w-4" />
                  {loadRunning ? 'Running Load Test...' : 'Start Load Test'}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Stats</CardTitle>
                <CardDescription>Load test overview</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Total Requests (estimated)</div>
                  <div className="text-2xl font-bold">
                    {Math.round((requestsPerSecond * concurrentUsers * durationMs) / 1000)}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Tools</div>
                  <div className="text-2xl font-bold">{loadTools.length}</div>
                </div>

                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Duration</div>
                  <div className="text-2xl font-bold">{(durationMs / 1000).toFixed(1)}s</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Load Test Results */}
          {loadResults && (
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Results Summary</CardTitle>
                  <CardDescription>{loadResults.totalRequests} requests completed</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{loadResults.successfulRequests}</div>
                      <div className="text-xs text-green-600">Successful</div>
                    </div>
                    <div className="text-center p-3 bg-red-50 rounded-lg">
                      <div className="text-2xl font-bold text-red-600">{loadResults.failedRequests}</div>
                      <div className="text-xs text-red-600">Failed</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground">Success Rate</div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 transition-all"
                          style={{ width: `${((loadResults.successfulRequests / loadResults.totalRequests) * 100) || 0}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium">
                        {((loadResults.successfulRequests / loadResults.totalRequests) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Latency Metrics</CardTitle>
                  <CardDescription>Response time statistics</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{loadResults.p50LatencyMs}ms</div>
                      <div className="text-xs text-blue-600">P50</div>
                    </div>
                    <div className="p-3 bg-yellow-50 rounded-lg">
                      <div className="text-2xl font-bold text-yellow-600">{loadResults.p95LatencyMs}ms</div>
                      <div className="text-xs text-yellow-600">P95</div>
                    </div>
                    <div className="p-3 bg-purple-50 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">{loadResults.p99LatencyMs}ms</div>
                      <div className="text-xs text-purple-600">P99</div>
                    </div>
                    <div className="p-3 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{loadResults.rps}</div>
                      <div className="text-xs text-green-600">RPS</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {Object.keys(loadResults.byTool).length > 0 && (
                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle>Performance by Tool</CardTitle>
                    <CardDescription>Detailed breakdown for each tested tool</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(loadResults.byTool).map(([tool, stats]) => (
                        <div
                          key={tool}
                          className="rounded-lg border p-3"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <Badge variant="secondary">{tool}</Badge>
                            <div className="flex items-center gap-4 text-sm">
                              <span>
                                <span className="text-muted-foreground">Avg: </span>
                                <span className="font-medium">{stats.avgLatencyMs}ms</span>
                              </span>
                              <span>
                                <span className="text-muted-foreground">Calls: </span>
                                <span className="font-medium">{stats.count}</span>
                              </span>
                              <span className={stats.errors > 0 ? 'text-red-500' : 'text-muted-foreground'}>
                                <span className="text-muted-foreground">Errors: </span>
                                <span className="font-medium">{stats.errors}</span>
                              </span>
                            </div>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500"
                              style={{ width: `${Math.min((stats.avgLatencyMs / loadResults.p99LatencyMs) * 100, 100)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default ToolSimulator;
