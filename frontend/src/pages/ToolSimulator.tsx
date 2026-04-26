/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

import * as React from 'react';
import {useEffect, useState} from 'react';
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
import {Button} from '@/components/ui/Button';
import {Badge} from '@/components/ui/Badge';
import {Alert, AlertDescription, AlertTitle} from '@/components/ui/Alert';
import {Tabs, TabsContent, TabsList, TabsTrigger} from '@/components/ui/Tabs';
import {Card, CardContent, CardHeader, CardTitle, CardDescription} from '@/components/ui/Card';
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
  getSimulationStatus,
  request,
} from '@/lib/api';
import type {ScenarioResult, LoadResults} from '@/lib/api';
import CodeEditor from '@/components/ui/CodeEditor';
import JsonViewer from '@/components/ui/JsonViewer';

export function ToolSimulator() {
  const [activeTab, setActiveTab] = React.useState('tool-test');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Tool Test State
  const [availableTools, setAvailableTools] = useState<string[]>([]);
  const [selectedTool, setSelectedTool] = useState('');
  const [toolArgs, setToolArgs] = useState('{}');
  const [useMockForTool, setUseMockForTool] = useState(false);
  const [toolResult, setToolResult] = useState<{
    success: boolean;
    result?: any;
    error?: string;
    durationMs?: number;
    timestamp?: string
  } | null>(null);
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
  const [scenarios, setScenarios] = useState<{
    name: string;
    description: string;
    steps: number;
    hasMocks: boolean
  }[]>([]);
  const [selectedScenario, setSelectedScenario] = useState('');
  const [scenarioResult, setScenarioResult] = useState<ScenarioResult | null>(null);
  const [scenarioRunning, setScenarioRunning] = useState(false);

  // Scenario Builder State
  const [scenarioBuilder, setScenarioBuilder] = useState<{
    name: string;
    description: string;
    steps: Array<{
      id: string;
      name: string;
      tool: string;
      args: string;
      expectsContains: string;
      expectsNotContains: string;
      expectsError: boolean;
      description: string;
    }>;
    setupMocks: string;
    cleanupMocks: boolean;
  }>({
    name: '',
    description: '',
    steps: [],
    setupMocks: '{}',
    cleanupMocks: true,
  });
  const [scenarioBuilderError, setScenarioBuilderError] = useState<string | null>(null);
  const [scenarioBuilderSuccess, setScenarioBuilderSuccess] = useState<string | null>(null);

  // Load Test State
  const [loadTools, setLoadTools] = useState<string[]>([]);
  const [concurrentUsers, setConcurrentUsers] = useState(5);
  const [durationMs, setDurationMs] = useState(5000);
  const [requestsPerSecond, setRequestsPerSecond] = useState(2);
  const [useMocksForLoad, setUseMocksForLoad] = useState(false);
  const [loadResults, setLoadResults] = useState<LoadResults | null>(null);
  const [loadRunning, setLoadRunning] = useState(false);

  // Args Templates State
  const [argsTemplates, setArgsTemplates] = useState<Record<string, string>>({});
  const [showArgsTemplates, setShowArgsTemplates] = useState(false);

  // Load initial data
  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [toolsData, mockModeData, mocksData, scenariosData] = await Promise.all([
        listAdminTools().catch(() => ({tools: []})),
        getMockMode().catch(() => ({mockModeEnabled: false})),
        listMocks().catch(() => ({mocks: {}})),
        listScenarios().catch(() => ({scenarios: []})),
        getSimulationStatus().catch(() => ({
          mockModeEnabled: false,
          mocksCount: 0,
          scenariosCount: 0,
          availableTools: [],
          mockModeDescription: '',
          system: {memoryUsage: 0, uptime: 0},
        })),
      ]);

      setAvailableTools(toolsData.tools.map((t: { name: string }) => t.name) || []);
      setMockModeEnabled(mockModeData.mockModeEnabled);
      setMocks(mocksData.mocks || {});
      setScenarios(scenariosData.scenarios || []);
      // Update status info if needed
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
        content: [{type: 'text' as const, text: mockContent}],
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
      const result = await runScenario(selectedScenario, {useMocks: true});
      setScenarioResult(result.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run scenario');
    } finally {
      setScenarioRunning(false);
    }
  };

  // Scenario Builder Functions
  const addScenarioStep = () => {
    setScenarioBuilder(prev => ({
      ...prev,
      steps: [...prev.steps, {
        id: `step-${Date.now()}`,
        name: '',
        tool: '',
        args: '{}',
        expectsContains: '',
        expectsNotContains: '',
        expectsError: false,
        description: '',
      }],
    }));
  };

  const removeScenarioStep = (id: string) => {
    setScenarioBuilder(prev => ({
      ...prev,
      steps: prev.steps.filter(s => s.id !== id),
    }));
  };

  const updateScenarioStep = (id: string, field: string, value: string | boolean) => {
    setScenarioBuilder(prev => ({
      ...prev,
      steps: prev.steps.map(s => s.id === id ? {...s, [field]: value} : s),
    }));
  };

  const handleSaveScenario = async () => {
    setScenarioBuilderError(null);
    setScenarioBuilderSuccess(null);

    if (!scenarioBuilder.name.trim()) {
      setScenarioBuilderError('Scenario name is required');
      return;
    }
    if (scenarioBuilder.steps.length === 0) {
      setScenarioBuilderError('At least one step is required');
      return;
    }

    try {
      // Parse and validate steps
      const steps = scenarioBuilder.steps.map(step => {
        let parsedArgs: Record<string, unknown> | undefined;
        try {
          parsedArgs = JSON.parse(step.args || '{}');
        } catch {
          // Keep as undefined if invalid JSON
        }

        const expects: { contains?: string; notContains?: string; hasError?: boolean } = {};
        if (step.expectsContains) expects.contains = step.expectsContains;
        if (step.expectsNotContains) expects.notContains = step.expectsNotContains;
        if (step.expectsError) expects.hasError = true;

        return {
          name: step.name,
          tool: step.tool,
          args: parsedArgs,
          expects,
          description: step.description,
        };
      });

      // Parse setup mocks
      let setupMocks: Record<string, any> | undefined;
      try {
        if (scenarioBuilder.setupMocks?.trim()) {
          setupMocks = JSON.parse(scenarioBuilder.setupMocks);
        }
      } catch {
        setScenarioBuilderError('Invalid JSON in setup mocks');
        return;
      }

      const scenario = {
        name: scenarioBuilder.name.trim(),
        description: scenarioBuilder.description.trim(),
        steps,
        setupMocks,
        cleanupMocks: scenarioBuilder.cleanupMocks,
      };

      // Register the scenario
      await setScenario(scenario);
      setScenarioBuilderSuccess(`Scenario "${scenario.name}" saved successfully`);
      await loadInitialData();

      // Clear form
      setScenarioBuilder({
        name: '',
        description: '',
        steps: [],
        setupMocks: '{}',
        cleanupMocks: true,
      });
    } catch (err) {
      setScenarioBuilderError(err instanceof Error ? err.message : 'Failed to save scenario');
    }
  };

  const setScenario = async (scenario: {
    name: string;
    description: string;
    steps: any[];
    setupMocks?: Record<string, any>;
    cleanupMocks?: boolean
  }): Promise<void> => {
    // Using the backend route to register scenario
    return request(`/simulate/scenarios`, {
      method: 'POST',
      body: JSON.stringify(scenario),
    });
  };

  // Load Test Functions
  const selectToolForLoad = (tool: string) => {
    setLoadTools(prev =>
      prev.includes(tool) ? prev.filter(t => t !== tool) : [...prev, tool],
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
      const config: any = {
        tools: loadTools,
        concurrentUsers,
        durationMs,
        requestsPerSecond,
        useMocks: useMocksForLoad,
      };

      // Add args templates if configured
      if (showArgsTemplates && Object.keys(argsTemplates).length > 0) {
        const templates: Record<string, any[]> = {};
        for (const [tool, jsonStr] of Object.entries(argsTemplates)) {
          try {
            const parsed = JSON.parse(jsonStr);
            templates[tool] = Array.isArray(parsed) ? parsed : [parsed];
          } catch {
            // Skip invalid JSON
          }
        }
        if (Object.keys(templates).length > 0) {
          config.argsTemplates = templates;
        }
      }

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
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`}/>
          Refresh
        </Button>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4"/>
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Scenario Builder Success Alert */}
      {scenarioBuilderSuccess && (
        <Alert>
          <CheckCircle2 className="h-4 w-4 text-green-500"/>
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>{scenarioBuilderSuccess}</AlertDescription>
        </Alert>
      )}

      {/* Scenario Builder Error Alert */}
      {scenarioBuilderError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4"/>
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{scenarioBuilderError}</AlertDescription>
        </Alert>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5 md:grid-cols-5 lg:grid-cols-5">
          <TabsTrigger value="tool-test">
            <Terminal className="mr-2 h-4 w-4"/>
            Tool Test
          </TabsTrigger>
          <TabsTrigger value="mocks">
            <Settings className="mr-2 h-4 w-4"/>
            Mocks
          </TabsTrigger>
          <TabsTrigger value="scenarios">
            <Play className="mr-2 h-4 w-4"/>
            Scenarios
          </TabsTrigger>
          <TabsTrigger value="scenario-builder">
            <FileJson className="mr-2 h-4 w-4"/>
            Scenario Builder
          </TabsTrigger>
          <TabsTrigger value="load-test">
            <Activity className="mr-2 h-4 w-4"/>
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
                      <SelectValue placeholder="Choose a tool to test..."/>
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
                  <CodeEditor language="json" onChange={setToolArgs} heightClass="h-[150px]"
                              value={toolArgs} editorProps={{placeholder: '{"expression": "2 + 2"}'}}/>
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
                    <Play className="mr-2 h-4 w-4"/>
                    {toolExecuting ? 'Executing...' : 'Execute Tool'}
                  </Button>
                  <Button variant="outline" onClick={clearToolResult} disabled={!toolResult}>
                    <Trash2 className="mr-2 h-4 w-4"/>
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
                        <CheckCircle2 className="h-5 w-5 text-green-500"/>
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500"/>
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
                      <Clock className="h-4 w-4"/>
                      Duration: {toolResult.durationMs}ms
                    </div>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FileJson className="h-4 w-4"/>
                      Timestamp: {new Date(toolResult.timestamp as string).toLocaleString()}
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    <Terminal className="h-12 w-12 mx-auto mb-2 opacity-50"/>
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
                    <Save className="mr-2 h-4 w-4"/>
                    Save Mock
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Zap className="h-5 w-5"/>
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
                      <Trash2 className="mr-2 h-3 w-3"/>
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
                  {Object.entries(mocks).map(([tool, mock]: [string, {
                    isError?: boolean;
                    delayMs?: number;
                    failureRate?: number
                  }]) => (
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
                        <Trash2 className="h-4 w-4"/>
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Scenario Builder Tab */}
        <TabsContent value="scenario-builder" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Create Scenario</CardTitle>
                <CardDescription>Build a custom test scenario with multiple steps</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Scenario Name */}
                <div className="space-y-2">
                  <Label htmlFor="scenario-name">Scenario Name</Label>
                  <Input
                    id="scenario-name"
                    value={scenarioBuilder.name}
                    onChange={(e) => setScenarioBuilder(prev => ({...prev, name: e.target.value}))}
                    placeholder="my_custom_scenario"
                  />
                </div>

                {/* Scenario Description */}
                <div className="space-y-2">
                  <Label htmlFor="scenario-description">Description</Label>
                  <Textarea
                    id="scenario-description"
                    value={scenarioBuilder.description}
                    onChange={(e) => setScenarioBuilder(prev => ({...prev, description: e.target.value}))}
                    placeholder="Describe what this scenario tests..."
                    className="min-h-[60px]"
                  />
                </div>

                {/* Setup Mocks */}
                <div className="space-y-2">
                  <Label htmlFor="setup-mocks">Setup Mocks (JSON) - Optional</Label>
                  <CodeEditor
                    language="json"
                    value={scenarioBuilder.setupMocks}
                    onChange={(val) => setScenarioBuilder(prev => ({...prev, setupMocks: val}))}
                    heightClass="h-[100px]"
                    editorProps={{placeholder: '{ "tool_name": { "content": [{ "type": "text", "text": "mock" }] } }'}}
                  />
                </div>

                {/* Cleanup Mocks */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="cleanup-mocks"
                    checked={scenarioBuilder.cleanupMocks}
                    onChange={(e) => setScenarioBuilder(prev => ({...prev, cleanupMocks: e.target.checked}))}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor="cleanup-mocks" className="cursor-pointer">
                    Clean up mocks after scenario
                  </Label>
                </div>

                {/* Steps Header */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Steps</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={addScenarioStep}
                    >
                      <Plus className="h-3 w-3 mr-1"/>
                      Add Step
                    </Button>
                  </div>

                  {/* Steps List */}
                  <div className="space-y-4 max-h-[400px] overflow-y-auto border rounded-lg p-4">
                    {scenarioBuilder.steps.length === 0 ? (
                      <div className="text-center text-muted-foreground py-8">
                        <p>No steps yet. Click "Add Step" to create one.</p>
                      </div>
                    ) : (
                      scenarioBuilder.steps.map((step, index) => (
                        <div key={step.id} className="border rounded-lg p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <Badge variant="secondary">Step {index + 1}</Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeScenarioStep(step.id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500"/>
                            </Button>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label htmlFor={`step-name-${index}`} className="text-xs">Step Name</Label>
                              <Input
                                id={`step-name-${index}`}
                                value={step.name}
                                onChange={(e) => updateScenarioStep(step.id, 'name', e.target.value)}
                                placeholder="Get time"
                                className="h-8"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor={`step-tool-${index}`} className="text-xs">Tool</Label>
                              <Select
                                value={step.tool}
                                onValueChange={(val) => updateScenarioStep(step.id, 'tool', val)}
                              >
                                <SelectTrigger className="h-8">
                                  <SelectValue placeholder="Select tool"/>
                                </SelectTrigger>
                                <SelectContent>
                                  {availableTools.map((tool) => (
                                    <SelectItem key={tool} value={tool}>{tool}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <Label htmlFor={`step-args-${index}`} className="text-xs">Arguments (JSON)</Label>
                            <CodeEditor
                              language="json"
                              value={step.args}
                              onChange={(val) => updateScenarioStep(step.id, 'args', val)}
                              heightClass="h-[60px]"
                              editorProps={{placeholder: '{}'}}
                            />
                          </div>

                          <div className="space-y-1">
                            <Label htmlFor={`step-desc-${index}`} className="text-xs">Description</Label>
                            <Input
                              id={`step-desc-${index}`}
                              value={step.description}
                              onChange={(e) => updateScenarioStep(step.id, 'description', e.target.value)}
                              placeholder="What this step does"
                              className="h-8"
                            />
                          </div>

                          {/* Expectations */}
                          <div className="space-y-2 pt-2 border-t">
                            <Label className="text-xs">Expectations</Label>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <Label htmlFor={`expects-contains-${index}`} className="text-xs">Contains</Label>
                                <Input
                                  id={`expects-contains-${index}`}
                                  value={step.expectsContains}
                                  onChange={(e) => updateScenarioStep(step.id, 'expectsContains', e.target.value)}
                                  placeholder="Response must contain..."
                                  className="h-8 text-xs"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label htmlFor={`expects-notcontains-${index}`} className="text-xs">Not Contains</Label>
                                <Input
                                  id={`expects-notcontains-${index}`}
                                  value={step.expectsNotContains}
                                  onChange={(e) => updateScenarioStep(step.id, 'expectsNotContains', e.target.value)}
                                  placeholder="Response must not contain..."
                                  className="h-8 text-xs"
                                />
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                id={`expects-error-${index}`}
                                checked={step.expectsError}
                                onChange={(e) => updateScenarioStep(step.id, 'expectsError', e.target.checked)}
                                className="h-4 w-4 rounded"
                              />
                              <Label htmlFor={`expects-error-${index}`} className="text-xs cursor-pointer">
                                Expect error response
                              </Label>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Save Scenario Button */}
                <Button onClick={handleSaveScenario} className="w-full">
                  <Save className="mr-2 h-4 w-4"/>
                  Save Scenario
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Scenario Template</CardTitle>
                <CardDescription>Quick reference for building scenarios</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm space-y-2">
                  <div className="font-medium">Scenario Structure:</div>
                  <JsonViewer value={{
                    'name': 'scenario_name',
                    'description': '...',
                    'steps': [
                      {
                        'name': 'Step 1',
                        'tool': 'tool_name',
                        'args': {'...': '...'},
                        'expects': {
                          'contains': {'...': '...'},
                          'hasError': false,
                        },
                      },
                    ],
                    'setupMocks': {'...': '...'},
                    'cleanupMocks': true,
                  }}/>
                </div>

                <div className="text-sm space-y-2">
                  <div className="font-medium">Tips:</div>
                  <ul className="list-disc list-inside text-xs text-muted-foreground space-y-1">
                    <li>Name should be unique (snake_case)</li>
                    <li>Each step executes sequentially</li>
                    <li>Setup mocks are applied before steps</li>
                    <li>Use "Contains" to verify response content</li>
                    <li>Scenario will fail if expectations not met</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Load Test Tab */}
        <TabsContent value="load-test">
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
                      <SelectValue placeholder="Choose a scenario to run..."/>
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
                  <Play className="mr-2 h-4 w-4"/>
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
                      <CheckCircle2 className="h-3 w-3 mr-1"/>
                      Passed
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      <XCircle className="h-3 w-3 mr-1"/>
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
                            <CheckCircle2 className="h-4 w-4 text-green-500"/>
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500"/>
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
                      <Plus className="h-3 w-3 mr-1"/>
                      Select All
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearLoadTools}
                    >
                      <Trash2 className="h-3 w-3 mr-1"/>
                      Clear
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowArgsTemplates(!showArgsTemplates)}
                    >
                      {showArgsTemplates ? 'Hide' : 'Show'} Args Templates
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

                {/* Args Templates Section */}
                {showArgsTemplates && (
                  <div className="space-y-3 p-4 border rounded-lg bg-muted/50">
                    <Label>Argument Templates (JSON arrays)</Label>
                    <div className="text-xs text-muted-foreground mb-2">
                      Define argument templates for each tool. Each tool should have an array of JSON objects.
                    </div>
                    <div className="space-y-3">
                      {loadTools.map((tool) => (
                        <div key={tool} className="space-y-1">
                          <Label htmlFor={`args-template-${tool}`} className="text-xs">{tool}</Label>
                          <CodeEditor
                            language="json"
                            onChange={(val) => setArgsTemplates(prev => ({...prev, [tool]: val}))}
                            heightClass="h-[80px]"
                            value={argsTemplates[tool] || '[]'}
                            editorProps={{placeholder: '[{"arg1": "value1"}, {"arg1": "value2"}]'}}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

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
                  <Activity className="mr-2 h-4 w-4"/>
                  {loadRunning ? 'Running Load Test...' : 'Start Load Test'}
                </Button>
              </CardContent>
            </Card>
          </div>

        </TabsContent>
      </Tabs>
    </div>
  );
}

export default ToolSimulator;
