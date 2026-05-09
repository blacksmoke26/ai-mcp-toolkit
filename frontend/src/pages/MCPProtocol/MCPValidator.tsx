/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

/**
 * @example
 * ```typescript
 * import {MCPValidator} from '@/pages/MCPProtocol';
 *
 * function App() {
 *   return <MCPValidator />;
 * }
 * ```
 */

import * as React from 'react';
import {
  CheckCircle2,
  AlertCircle,
  XCircle,
  FileText,
  RefreshCw,
  ShieldCheck,
  Info,
  Zap,
  Code,
} from 'lucide-react';
import {useCallback, useState} from 'react';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/Card';
import {Button} from '@/components/ui/Button';
import {Badge} from '@/components/ui/Badge';
import {Alert, AlertDescription, AlertTitle} from '@/components/ui/Alert';
import JsonViewer from '@/components/ui/JsonViewer';
import CodeEditor from '@/components/ui/CodeEditor';
import {validateJsonRpcRequest} from '@/lib/api';
import type {JsonRpcValidationResponse, JsonRpcValidationChecks} from '@/types/api';

// ======================== Constants ========================

/** Default validator input template */
const DEFAULT_TEMPLATE = JSON.stringify(
  {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/list',
    params: {},
  },
  null,
  2,
);

// ======================== Types ========================

/**
 * Validation check definition for display purposes.
 */
interface CheckDefinition {
  key: keyof JsonRpcValidationChecks;
  label: string;
  description: string;
  type: 'required' | 'optional' | 'spec';
}

// ======================== Constants ========================

/** Field check definitions for display */
const CHECK_DEFINITIONS: CheckDefinition[] = [
  {
    key: 'isObject',
    label: 'Is JSON Object',
    description: 'The request body must be a JSON object (not array or primitive)',
    type: 'required',
  },
  {
    key: 'hasJsonrpc',
    label: 'Has jsonrpc field',
    description: 'Must include "jsonrpc" field per JSON-RPC 2.0 specification',
    type: 'required',
  },
  {
    key: 'jsonrpcVersion',
    label: 'Version is "2.0"',
    description: 'The jsonrpc field must equal exactly "2.0"',
    type: 'required',
  },
  {
    key: 'hasMethod',
    label: 'Has method field',
    description: 'Must include "method" field specifying the RPC method',
    type: 'required',
  },
  {
    key: 'methodType',
    label: 'Method is string',
    description: 'The method field must be a string type',
    type: 'required',
  },
  {
    key: 'methodNotEmpty',
    label: 'Method is non-empty',
    description: 'The method string must not be empty or whitespace-only',
    type: 'required',
  },
  {
    key: 'methodNotReserved',
    label: 'Not reserved (rpc.*)',
    description: 'Method names starting with "rpc." are reserved per JSON-RPC 2.0 spec',
    type: 'spec',
  },
  {
    key: 'idValid',
    label: 'ID is valid',
    description: 'ID must be string, number, or null (or omitted for notifications)',
    type: 'required',
  },
  {
    key: 'paramsValid',
    label: 'Params is valid',
    description: 'Params must be an object or array if present',
    type: 'optional',
  },
  {
    key: 'isNotification',
    label: 'Is notification',
    description: 'Request without an ID field is a notification (no response expected)',
    type: 'optional',
  },
];

// ======================== Sub-Components ========================

/**
 * CheckRow displays a single validation check result.
 */
interface CheckRowProps {
  definition: CheckDefinition;
  checked: boolean | undefined;
}

function CheckRow({definition, checked}: CheckRowProps) {
  const isChecked = checked === true;
  const isUnchecked = checked === false;

  return (
    <div className={`flex items-center gap-3 p-2.5 rounded-lg border transition-colors ${
      isChecked
        ? 'bg-green-50 dark:bg-green-900/15 border-green-200 dark:border-green-800'
        : isUnchecked
        ? 'bg-red-50 dark:bg-red-900/15 border-red-200 dark:border-red-800'
        : 'bg-muted/20 border-muted'
    }`}>
      <div className={`p-1.5 rounded-md ${
        isChecked
          ? 'bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400'
          : isUnchecked
          ? 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400'
          : 'bg-muted text-muted-foreground'
      }`}>
        {isChecked ? (
          <CheckCircle2 className="h-4 w-4" />
        ) : isUnchecked ? (
          <XCircle className="h-4 w-4" />
        ) : (
          <AlertCircle className="h-4 w-4" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{definition.label}</span>
          <Badge
            variant={
              isChecked
                ? 'success'
                : isUnchecked
                ? 'error'
                : 'outline'
            }
            className="text-xs"
          >
            {isChecked ? 'Pass' : isUnchecked ? 'Fail' : 'N/A'}
          </Badge>
          {definition.type === 'spec' && (
            <Badge variant="secondary" className="text-xs">Spec</Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{definition.description}</p>
      </div>
    </div>
  );
}

/**
 * ValidationResultSummary displays the overall validation result with errors and warnings.
 */
interface ValidationResultSummaryProps {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

function ValidationResultSummary({valid, errors, warnings}: ValidationResultSummaryProps) {
  return (
    <div className="space-y-3">
      {/* Overall Result */}
      <div className={`p-4 rounded-lg border ${
        valid
          ? 'bg-green-50 dark:bg-green-900/15 border-green-200 dark:border-green-800'
          : 'bg-red-50 dark:bg-red-900/15 border-red-200 dark:border-red-800'
      }`}>
        <div className="flex items-center gap-3">
          {valid ? (
            <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
          ) : (
            <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
          )}
          <div>
            <div className={`text-lg font-bold ${
              valid ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'
            }`}>
              {valid ? 'Valid JSON-RPC 2.0 Request' : 'Invalid JSON-RPC Request'}
            </div>
            <div className="text-sm text-muted-foreground">
              {valid
                ? 'The request conforms to the JSON-RPC 2.0 specification'
                : 'The request has validation errors that need to be fixed'}
            </div>
          </div>
        </div>
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <span className="text-sm font-medium text-red-600 dark:text-red-400">
              Errors ({errors.length})
            </span>
          </div>
          <div className="space-y-1">
            {errors.map((err, index) => (
              <Badge
                key={index}
                variant="error"
                className="text-xs break-all"
              >
                {err}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-yellow-500" />
            <span className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
              Warnings ({warnings.length})
            </span>
          </div>
          <div className="space-y-1">
            {warnings.map((warn, index) => (
              <Badge
                key={index}
                variant="warning"
                className="text-xs break-all"
              >
                {warn}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ======================== Main Component ========================

/**
 * MCPValidator provides a comprehensive JSON-RPC request validation interface.
 *
 * Features:
 * - Field-level validation diagnostics for all JSON-RPC 2.0 spec requirements
 * - Visual pass/fail indicators for each check
 * - Error and warning listings with detailed messages
 * - Parsed JSON-RPC preview
 * - Quick template loading
 * - Real-time validation feedback
 */
export function MCPValidator() {
  const [inputBody, setInputBody] = useState<string>(DEFAULT_TEMPLATE);
  const [validationResult, setValidationResult] = useState<JsonRpcValidationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  /**
   * Validate the input JSON-RPC request and display results.
   */
  const handleValidate = useCallback(async () => {
    setParseError(null);
    setLoading(true);

    // Parse and validate input first
    let parsedBody: unknown;
    try {
      parsedBody = JSON.parse(inputBody);
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Failed to parse JSON');
      setValidationResult(null);
      setLoading(false);
      return;
    }

    try {
      const result = await validateJsonRpcRequest(parsedBody);
      setValidationResult(result);
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Validation request failed');
      setValidationResult(null);
    } finally {
      setLoading(false);
    }
  }, [inputBody]);

  /**
   * Load a validation template.
   */
  const loadTemplate = (name: string) => {
    const templates: Record<string, {json: string; description: string}> = {
      'valid-single': {
        json: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/list',
          params: {},
        }, null, 2),
        description: 'Standard single request',
      },
      'valid-with-args': {
        json: JSON.stringify({
          jsonrpc: '2.0',
          id: 2,
          method: 'tools/call',
          params: {
            name: 'echo',
            arguments: {message: 'Hello MCP!'},
          },
        }, null, 2),
        description: 'Tool call with arguments',
      },
      'notification': {
        json: JSON.stringify({
          jsonrpc: '2.0',
          method: 'notifications/initialized',
          params: {},
        }, null, 2),
        description: 'Notification (no ID)',
      },
      'missing-jsonrpc': {
        json: JSON.stringify({
          id: 1,
          method: 'tools/list',
          params: {},
        }, null, 2),
        description: 'Missing jsonrpc field (invalid)',
      },
      'wrong-version': {
        json: JSON.stringify({
          jsonrpc: '1.0',
          id: 1,
          method: 'ping',
          params: {},
        }, null, 2),
        description: 'Wrong version (invalid)',
      },
      'missing-method': {
        json: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          params: {},
        }, null, 2),
        description: 'Missing method (invalid)',
      },
      'invalid-id': {
        json: JSON.stringify({
          jsonrpc: '2.0',
          id: {nested: 'object'},
          method: 'ping',
          params: {},
        }, null, 2),
        description: 'Invalid ID type (invalid)',
      },
      'reserved-method': {
        json: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'rpc.system/debug',
          params: {},
        }, null, 2),
        description: 'Reserved method prefix (invalid)',
      },
      'batch-request': {
        json: JSON.stringify([
          {jsonrpc: '2.0', id: 1, method: 'tools/list'},
          {jsonrpc: '2.0', id: 2, method: 'ping'},
        ], null, 2),
        description: 'Batch (array) — validator expects object',
      },
      'null-id': {
        json: JSON.stringify({
          jsonrpc: '2.0',
          id: null,
          method: 'ping',
          params: {},
        }, null, 2),
        description: 'Null ID (notification-like)',
      },
    };

    const template = templates[name];
    if (template) {
      setInputBody(template.json);
      setValidationResult(null);
      setParseError(null);
    }
  };

  const checks = validationResult?.checks;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="h-6 w-6 text-emerald-500" />
            JSON-RPC Request Validator
          </h2>
          <p className="text-muted-foreground">
            Validate JSON-RPC request structure against the protocol specification
          </p>
        </div>

        {/* Validity badge */}
        {validationResult && (
          <Badge
            variant={validationResult.valid ? 'success' : 'error'}
            className="text-lg px-4 py-1.5"
          >
            {validationResult.valid ? 'Valid' : 'Invalid'}
          </Badge>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column: Input */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Code className="h-5 w-5 text-blue-500" />
              Input JSON
            </CardTitle>
            <CardDescription>
              Paste or edit your JSON-RPC request below
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <CodeEditor
              value={inputBody}
              onChange={setInputBody}
              language="json"
              heightClass="h-[320px]"
            />

            {/* Parse Error */}
            {parseError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Parse Error</AlertTitle>
                <AlertDescription>{parseError}</AlertDescription>
              </Alert>
            )}

            {/* Quick Templates */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground uppercase tracking-wider">
                  Quick Templates
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {Object.keys({
                  'valid-single': 1,
                  'valid-with-args': 1,
                  'notification': 1,
                  'missing-jsonrpc': 1,
                  'wrong-version': 1,
                  'missing-method': 1,
                  'invalid-id': 1,
                  'reserved-method': 1,
                  'batch-request': 1,
                  'null-id': 1,
                }).map(name => (
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

            {/* Validate Button */}
            <Button
              onClick={handleValidate}
              disabled={loading}
              className="w-full"
              size="lg"
            >
              {loading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Validating...
                </>
              ) : (
                <>
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  Validate Request
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Right Column: Results */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              Validation Results
            </CardTitle>
            <CardDescription>
              {validationResult
                ? `Passed: ${Object.values(checks || {}).filter(Boolean).length}/${Object.keys(checks || {}).length} checks`
                : 'Waiting for validation...'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 max-h-[600px] overflow-y-auto">
            {validationResult ? (
              <>
                {/* Summary */}
                <ValidationResultSummary
                  valid={validationResult.valid}
                  errors={validationResult.errors}
                  warnings={validationResult.warnings}
                />

                {/* Field Checks */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Info className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-muted-foreground">
                      Field Checks
                    </span>
                  </div>
                  <div className="space-y-1">
                    {CHECK_DEFINITIONS.map(def => (
                      <CheckRow
                        key={def.key}
                        definition={def}
                        checked={checks?.[def.key]}
                      />
                    ))}
                  </div>
                </div>

                {/* Parsed JSON-RPC */}
                <div className="space-y-2 pt-3 border-t">
                  <div className="flex items-center gap-2">
                    <Code className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Parsed JSON-RPC</span>
                  </div>
                  <div className="rounded-lg border bg-muted/30 p-3 max-h-[150px] overflow-y-auto">
                    <JsonViewer value={JSON.parse(inputBody)} />
                  </div>
                </div>
              </>
            ) : (
              <div className="flex h-[400px] items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <ShieldCheck className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Paste JSON-RPC and click Validate</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">About JSON-RPC 2.0 Validation</CardTitle>
          <CardDescription>
            Understanding the validation rules applied to your request
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Required Fields
              </h4>
              <ul className="text-xs space-y-1 text-muted-foreground list-disc pl-4">
                <li><code className="bg-muted px-1 rounded">jsonrpc</code> — Must be "2.0"</li>
                <li><code className="bg-muted px-1 rounded">method</code> — Non-empty string</li>
                <li><code className="bg-muted px-1 rounded">id</code> — Optional (string, number, null, or omitted)</li>
                <li><code className="bg-muted px-1 rounded">params</code> — Optional (object or array)</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-orange-500" />
                Special Cases
              </h4>
              <ul className="text-xs space-y-1 text-muted-foreground list-disc pl-4">
                <li>Notifications (no <code className="bg-muted px-1 rounded">id</code>) produce no response</li>
                <li>Methods starting with <code className="bg-muted px-1 rounded">rpc.</code> are reserved</li>
                <li>Fractional numeric IDs are discouraged</li>
                <li>String IDs can be up to 256 characters</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ======================== Inline Separator for import convenience ========================

/** Simple vertical separator component */
function Separator(props: {orientation?: 'horizontal' | 'vertical'; className?: string}) {
  return (
    <div
      className={`bg-border ${props.className || 'my-4'}`}
      style={{
        ...(props.orientation === 'vertical' ? {width: '1px', height: 'auto', margin: '0 0.5rem'} : {height: '1px', width: '100%', margin: '1rem 0'}),
      }}
    />
  );
}

export default MCPValidator;
