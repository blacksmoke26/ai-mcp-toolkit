/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

import * as React from 'react';
import {useCallback, useState} from 'react';
import {CheckCircle2, RefreshCw} from 'lucide-react';

import {Button} from '@/components/ui/Button';
import {Badge} from '@/components/ui/Badge';
import CodeEditor from '@/components/ui/CodeEditor';
import JsonViewer from '@/components/ui/JsonViewer';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/Card';

import {useMcpProtocol} from '@/hooks/useMcpProtocol';

/**
 * ValidateTab provides JSON-RPC request validation.
 */
const ValidateTab = () => {
  const {validateRequest, state} = useMcpProtocol();
  const [inputBody, setInputBody] = useState<string>(
    JSON.stringify({jsonrpc: '2.0', id: 1, method: 'tools/list', params: {}}, null, 2),
  );
  const [loading, setLoading] = useState(false);
  const [validationResult, setValidationResult] = useState<NonNullable<typeof state.validation>>(null);

  const handleValidate = useCallback(async () => {
    setLoading(true);
    try {
      const body = JSON.parse(inputBody);
      const result = await validateRequest(body);
      setValidationResult(result);
    } catch {
      setValidationResult({valid: false, checks: {} as any, errors: ['Invalid JSON input'], warnings: []});
    } finally {
      setLoading(false);
    }
  }, [inputBody, validateRequest]);

  const checks = validationResult?.checks || {};
  const errors = validationResult?.errors || [];
  const warnings = validationResult?.warnings || [];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold">JSON-RPC Request Validator</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Validate JSON-RPC request structure against the protocol specification
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="flex flex-col">
          <CardHeader className="pb-3 px-6 py-4 flex-shrink-0">
            <CardTitle className="text-base">Input JSON</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 px-6 pt-0 space-y-4">
            <CodeEditor
              value={inputBody}
              onChange={setInputBody}
              language="json"
              heightClass="h-[350px]"
            />
            <Button onClick={handleValidate} disabled={loading} className="w-full py-6 text-sm font-semibold">
              {loading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin"/>
                  Validating...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4"/>
                  Validate
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader className="pb-3 px-6 py-4 flex-shrink-0">
            <CardTitle className="flex items-center gap-2.5 text-base">
              Validation Results
              {validationResult && (
                <Badge variant={validationResult.valid ? 'success' : 'error'} className="ml-auto text-xs font-semibold">
                  {validationResult.valid ? 'Valid' : 'Invalid'}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 px-6 pt-0 space-y-5 max-h-[450px] overflow-auto">
            {validationResult ? (
              <>
                {/* Checks */}
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">Field Checks</h4>
                  <div className="grid gap-1.5">
                    {[
                      {key: 'isObject', label: 'Is JSON Object'},
                      {key: 'hasJsonrpc', label: 'Has jsonrpc field'},
                      {key: 'jsonrpcVersion', label: 'Version is "2.0"'},
                      {key: 'hasMethod', label: 'Has method field'},
                      {key: 'methodType', label: 'Method is string'},
                      {key: 'methodNotEmpty', label: 'Method is non-empty'},
                      {key: 'methodNotReserved', label: 'Not reserved (rpc.*)'},
                      {key: 'idValid', label: 'ID is valid'},
                      {key: 'paramsValid', label: 'Params is valid'},
                      {key: 'isNotification', label: 'Is notification'},
                    ].map(({key, label}) => (
                      <div key={key}
                           className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/30">
                        <span className="text-muted-foreground/80 text-sm">{label}</span>
                        <Badge variant={checks[key as keyof typeof checks] ? 'success' : 'error'}
                               className="text-xs font-semibold px-2.5 py-0.5">
                          {checks[key as keyof typeof checks] ? '✓' : '✗'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>

                {errors.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-red-600">Errors</h4>
                    {errors.map((err, i) => (
                      <Badge key={i} variant="error" className="text-xs font-semibold px-2.5 py-1">{err}</Badge>
                    ))}
                  </div>
                )}

                {warnings.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-yellow-600">Warnings</h4>
                    {warnings.map((w, i) => (
                      <Badge key={i} variant="warning" className="text-xs font-semibold px-2.5 py-1">{w}</Badge>
                    ))}
                  </div>
                )}

                {/* Raw JSON-RPC */}
                <div className="pt-3 border-t border-muted/30">
                  <h4 className="text-sm font-semibold mb-2.5">Parsed JSON-RPC</h4>
                  <div className="rounded-xl border bg-muted/20 p-4 max-h-[180px] overflow-auto">
                    <JsonViewer value={JSON.parse(inputBody)}/>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex h-[350px] items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-4 opacity-20"/>
                  <p className="text-sm font-medium">Paste JSON and validate</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ValidateTab;
