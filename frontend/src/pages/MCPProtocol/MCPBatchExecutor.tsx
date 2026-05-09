/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

/**
 * @module pages/MCPBatchExecutor
 * @description Advanced JSON-RPC batch executor with concurrency control,
 *              timeout configuration, and fail-fast behavior.
 *
 * This component provides a professional UI for executing batch JSON-RPC
 * requests against the MCP server with fine-grained control over:
 * - Concurrency (1-100 parallel requests)
 * - Per-item timeout (1s-120s)
 * - Fail-fast mode for early termination on errors
 */

import * as React from 'react';
import {
  Layers,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Timer,
  Zap,
  Settings2,
  Play,
  XCircle,
} from 'lucide-react';
import {useCallback, useState} from 'react';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/Card';
import {Button} from '@/components/ui/Button';
import {Badge} from '@/components/ui/Badge';
import {Alert, AlertDescription, AlertTitle} from '@/components/ui/Alert';
import {Switch} from '@/components/ui/Switch';
import {Label} from '@/components/ui/Label';
import {Separator} from '@/components/ui/Separator';
import JsonViewer from '@/components/ui/JsonViewer';
import CodeEditor from '@/components/ui/CodeEditor';
import type {JsonRpcRequest, McpBatchResponseItem} from '@/types/api';
import {sendMcpBatchWith} from '@/lib/api';

// ======================== Constants ========================

/** Default concurrency setting */
const DEFAULT_CONCURRENCY = 10;

/** Default timeout in milliseconds */
const DEFAULT_TIMEOUT = 30000;

/** Minimum concurrency */
const MIN_CONCURRENCY = 1;

/** Maximum concurrency (matches backend MAX_BATCH_SIZE) */
const MAX_CONCURRENCY = 100;

/** Minimum timeout in milliseconds */
const MIN_TIMEOUT = 1000;

/** Maximum timeout in milliseconds */
const MAX_TIMEOUT = 120000;

/** Default batch request template */
const DEFAULT_BATCH_TEMPLATE = JSON.stringify(
  [
    {jsonrpc: '2.0', id: 1, method: 'tools/list'},
    {jsonrpc: '2.0', id: 2, method: 'ping'},
  ],
  null,
  2,
);

// ======================== Types ========================

/**
 * Batch execution result with timing information.
 */
interface BatchExecutionResult {
  /** The raw response items */
  items: McpBatchResponseItem[];
  /** Total execution time in milliseconds */
  durationMs: number;
  /** Start timestamp */
  startedAt: number;
  /** Completion timestamp */
  completedAt: number;
  /** Whether fail-fast was triggered */
  failFastTriggered: boolean;
  /** Number of items processed */
  itemsProcessed: number;
  /** Number of errors */
  errorCount: number;
}

// ======================== Sub-Components ========================

/**
 * BatchItemTimeline displays the execution timeline of individual batch items.
 */
interface BatchItemTimelineProps {
  items: McpBatchResponseItem[];
}

function BatchItemTimeline({items}: BatchItemTimelineProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item, index) => (
        <div
          key={index}
          className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-mono ${
            item.error
              ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
              : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800'
          }`}
        >
          <span>#{index + 1}</span>
          {item.error ? (
            <AlertCircle className="h-3 w-3" />
          ) : (
            <CheckCircle2 className="h-3 w-3" />
          )}
          <span className="truncate max-w-[120px]">
            {item.id !== null ? String(item.id) : 'N/A'}
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * BatchConfig displays the batch configuration options.
 */
interface BatchConfigProps {
  concurrency: number;
  setConcurrency: (val: number) => void;
  timeout: number;
  setTimeout: (val: number) => void;
  failFast: boolean;
  setFailFast: (val: boolean) => void;
}

function BatchConfig({concurrency, setConcurrency, timeout, setTimeout, failFast, setFailFast}: BatchConfigProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-sm font-medium flex items-center gap-2">
          <Zap className="h-4 w-4 text-blue-500" />
          Concurrency
        </Label>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={MIN_CONCURRENCY}
            max={MAX_CONCURRENCY}
            step={1}
            value={concurrency}
            onChange={(e) => setConcurrency(parseInt(e.target.value, 10))}
            className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
          <span className="w-10 text-right font-mono text-sm font-bold text-primary">{concurrency}</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Parallel requests (1-{MAX_CONCURRENCY})
        </p>
      </div>

      <Separator />

      <div className="space-y-2">
        <Label className="text-sm font-medium flex items-center gap-2">
          <Timer className="h-4 w-4 text-orange-500" />
          Timeout (ms)
        </Label>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={MIN_TIMEOUT}
            max={MAX_TIMEOUT}
            step={1000}
            value={timeout}
            onChange={(e) => setTimeout(parseInt(e.target.value, 10))}
            className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-orange-500"
          />
          <span className="w-16 text-right font-mono text-sm font-bold text-primary">
            {timeout >= 1000 ? `${timeout / 1000}s` : `${timeout}ms`}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          Per-item timeout ({MIN_TIMEOUT / 1000}s - {MAX_TIMEOUT / 1000}s)
        </p>
      </div>

      <Separator />

      <div className="flex items-center gap-3">
        <Switch
          checked={failFast}
          onCheckedChange={setFailFast}
          id="fail-fast"
        />
        <div className="flex-1">
          <Label className="text-sm font-medium" htmlFor="fail-fast">
            <XCircle className="h-4 w-4 text-red-500 inline mr-1" />
            Fail Fast
          </Label>
          <p className="text-xs text-muted-foreground">
            Stop batch processing on first error
          </p>
        </div>
      </div>

      <Separator />

      {/* Presets */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground uppercase tracking-wider">Presets</Label>
        <div className="flex flex-wrap gap-1">
          {[
            {label: 'Fast (5, 5s)', concurrency: 5, timeout: 5000},
            {label: 'Default (10, 30s)', concurrency: 10, timeout: 30000},
            {label: 'Thorough (50, 60s)', concurrency: 50, timeout: 60000},
            {label: 'Max (100, 120s)', concurrency: 100, timeout: 120000},
          ].map(preset => (
            <Button
              key={preset.label}
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => {
                setConcurrency(preset.concurrency);
                setTimeout(preset.timeout);
              }}
            >
              {preset.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ======================== Main Component ========================

/**
 * MCPBatchExecutor provides a professional UI for advanced JSON-RPC batch execution.
 *
 * Features:
 * - Concurrency control via slider
 * - Per-item timeout configuration
 * - Fail-fast mode toggle
 * - Request/response JSON editing
 * - Execution timeline visualization
 * - Preset configurations
 * - Real-time execution feedback
 */
export function MCPBatchExecutor() {
  const [concurrency, setConcurrency] = useState(DEFAULT_CONCURRENCY);
  const [timeout, setTimeout] = useState(DEFAULT_TIMEOUT);
  const [failFast, setFailFast] = useState(false);
  const [batchBody, setBatchBody] = useState<string>(DEFAULT_BATCH_TEMPLATE);
  const [result, setResult] = useState<BatchExecutionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [executing, setExecuting] = useState(false);

  /**
   * Validate the batch body JSON and execute the batch request.
   */
  const handleExecute = useCallback(async () => {
    setError(null);
    setResult(null);
    setExecuting(true);

    // Validate JSON first
    let parsedBody: JsonRpcRequest[];
    try {
      const parsed = JSON.parse(batchBody);
      if (!Array.isArray(parsed)) {
        throw new Error('Batch requests must be a JSON array');
      }
      parsedBody = parsed;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid JSON in batch body');
      setExecuting(false);
      return;
    }

    // Validate batch size
    if (parsedBody.length === 0) {
      setError('Batch cannot be empty');
      setExecuting(false);
      return;
    }

    if (parsedBody.length > MAX_CONCURRENCY) {
      setError(`Batch exceeds maximum limit of ${MAX_CONCURRENCY} items`);
      setExecuting(false);
      return;
    }

    // Validate each request has required fields
    for (let i = 0; i < parsedBody.length; i++) {
      const req = parsedBody[i];
      if (!req.jsonrpc || req.jsonrpc !== '2.0') {
        setError(`Item #${i + 1}: invalid jsonrpc version, expected "2.0"`);
        setExecuting(false);
        return;
      }
      if (!req.method || typeof req.method !== 'string' || req.method.trim() === '') {
        setError(`Item #${i + 1}: missing or invalid method`);
        setExecuting(false);
        return;
      }
    }

    setLoading(true);
    const startedAt = Date.now();

    try {
      const responseItems = await sendMcpBatchWith(parsedBody, {
        concurrency,
        timeout: failFast ? 5000 : timeout,
        failFast,
      });

      const completedAt = Date.now();
      const errors = responseItems.filter(item => item.error).length;

      setResult({
        items: responseItems,
        durationMs: completedAt - startedAt,
        startedAt,
        completedAt,
        failFastTriggered: false, // Backend would signal this
        itemsProcessed: responseItems.length,
        errorCount: errors,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Batch execution failed');
    } finally {
      setLoading(false);
      setExecuting(false);
    }
  }, [batchBody, concurrency, timeout, failFast]);

  /**
   * Load a quick batch template.
   */
  const loadTemplate = (templateName: string) => {
    const templates: Record<string, string> = {
      'tools/list + ping': JSON.stringify([
        {jsonrpc: '2.0', id: 1, method: 'tools/list'},
        {jsonrpc: '2.0', id: 2, method: 'ping'},
      ], null, 2),
      'tools/call (echo)': JSON.stringify([
        {
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/call',
          params: {
            name: 'echo',
            arguments: {message: 'Hello MCP!'},
          },
        },
      ], null, 2),
      'multi-tool call': JSON.stringify([
        {
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/call',
          params: {name: 'echo', arguments: {message: 'Hello 1'}},
        },
        {
          jsonrpc: '2.0',
          id: 2,
          method: 'tools/call',
          params: {name: 'echo', arguments: {message: 'Hello 2'}},
        },
        {jsonrpc: '2.0', id: 3, method: 'ping'},
      ], null, 2),
      'capabilities query': JSON.stringify([
        {jsonrpc: '2.0', id: 1, method: 'initialize', params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: {name: 'test-client', version: '1.0.0'},
        }},
        {jsonrpc: '2.0', id: 2, method: 'tools/list'},
        {jsonrpc: '2.0', id: 3, method: 'resources/list'},
      ], null, 2),
      'notification batch': JSON.stringify([
        {jsonrpc: '2.0', method: 'notifications/initialized'},
        {jsonrpc: '2.0', id: 1, method: 'ping'},
      ], null, 2),
    };

    if (templates[templateName]) {
      setBatchBody(templates[templateName]);
      setResult(null);
      setError(null);
    }
  };

  /**
   * Format duration in human-readable form.
   */
  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const hasResults = result !== null;
  const hasErrors = error !== null;
  const successCount = hasResults ? result.items.filter(i => !i.error).length : 0;
  const errorItemCount = hasResults ? result.items.filter(i => i.error).length : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Layers className="h-6 w-6 text-purple-500" />
            Advanced Batch Executor
          </h2>
          <p className="text-muted-foreground">
            Execute multiple JSON-RPC requests with fine-grained concurrency and timeout control
          </p>
        </div>

        {/* Batch size badge */}
        {batchBody && (() => {
          try {
            const count = JSON.parse(batchBody).length;
            return (
              <Badge variant="secondary" className="text-sm">
                {Array.isArray(JSON.parse(batchBody)) ? count : 1} items
              </Badge>
            );
          } catch {
            return null;
          }
        })()}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column: Configuration */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Settings2 className="h-5 w-5" />
              Configuration
            </CardTitle>
            <CardDescription>
              Fine-tune batch execution parameters
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BatchConfig
              concurrency={concurrency}
              setConcurrency={setConcurrency}
              timeout={timeout}
              setTimeout={setTimeout}
              failFast={failFast}
              setFailFast={setFailFast}
            />
          </CardContent>
        </Card>

        {/* Middle Column: Request Input */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Zap className="h-5 w-5 text-orange-500" />
              Batch Request
            </CardTitle>
            <CardDescription>
              JSON array of JSON-RPC 2.0 requests
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <CodeEditor
              value={batchBody}
              onChange={setBatchBody}
              language="json"
              heightClass="h-[280px]"
            />

            {/* Templates */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Quick Templates</Label>
              <div className="flex flex-wrap gap-1">
                {Object.keys(
                  {
                    'tools/list + ping': 1,
                    'tools/call (echo)': 1,
                    'multi-tool call': 1,
                    'capabilities query': 1,
                    'notification batch': 1,
                  },
                ).map(name => (
                  <Button
                    key={name}
                    variant="ghost"
                    size="sm"
                    className="text-xs h-7 px-2"
                    onClick={() => loadTemplate(name)}
                  >
                    {name}
                  </Button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Execute Button */}
            <Button
              onClick={handleExecute}
              disabled={loading || executing || !batchBody.trim()}
              className="w-full"
              size="lg"
            >
              {loading || executing ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Executing Batch...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Execute Batch ({concurrency} concurrent)
                </>
              )}
            </Button>

            {/* Error Alert */}
            {hasErrors && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Right Column: Response Output */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Batch Response
            </CardTitle>
            <CardDescription>
              {hasResults
                ? `${successCount} succeeded, ${errorItemCount} failed`
                : 'Waiting for execution...'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Execution Summary */}
            {hasResults && (
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg border bg-green-50 dark:bg-green-900/20 p-3 text-center">
                  <div className="text-2xl font-bold text-green-600">{successCount}</div>
                  <div className="text-xs text-muted-foreground">Succeeded</div>
                </div>
                <div className="rounded-lg border bg-red-50 dark:bg-red-900/20 p-3 text-center">
                  <div className="text-2xl font-bold text-red-600">{errorItemCount}</div>
                  <div className="text-xs text-muted-foreground">Failed</div>
                </div>
                <div className="rounded-lg border bg-blue-50 dark:bg-blue-900/20 p-3 text-center">
                  <div className="text-lg font-bold text-blue-600">
                    {formatDuration(result.durationMs)}
                  </div>
                  <div className="text-xs text-muted-foreground">Duration</div>
                </div>
                <div className="rounded-lg border bg-purple-50 dark:bg-purple-900/20 p-3 text-center">
                  <div className="text-lg font-bold text-purple-600">
                    {result.itemsProcessed}
                  </div>
                  <div className="text-xs text-muted-foreground">Processed</div>
                </div>
              </div>
            )}

            {/* Timeline */}
            {hasResults && result.items.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Execution Timeline</Label>
                <BatchItemTimeline items={result.items} />
              </div>
            )}

            {/* Raw Response */}
            {hasResults && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Raw Response</Label>
                <div className="h-[200px] overflow-auto rounded-lg border bg-muted/30 p-3">
                  <JsonViewer value={result.items} />
                </div>
              </div>
            )}

            {/* Empty State */}
            {!hasResults && (
              <div className="flex h-[300px] items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <Layers className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Configure and execute a batch to see results</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Info Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-md bg-blue-100 dark:bg-blue-900/30">
                <Zap className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <h4 className="text-sm font-medium">Concurrency Control</h4>
                <p className="text-xs text-muted-foreground">
                  Control how many requests execute in parallel for optimal performance
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-md bg-orange-100 dark:bg-orange-900/30">
                <Timer className="h-4 w-4 text-orange-600" />
              </div>
              <div>
                <h4 className="text-sm font-medium">Per-Item Timeout</h4>
                <p className="text-xs text-muted-foreground">
                  Set individual timeout limits to prevent long-running requests
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-md bg-red-100 dark:bg-red-900/30">
                <XCircle className="h-4 w-4 text-red-600" />
              </div>
              <div>
                <h4 className="text-sm font-medium">Fail Fast</h4>
                <p className="text-xs text-muted-foreground">
                  Immediately stop batch processing when an error occurs
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default MCPBatchExecutor;