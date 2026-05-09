/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

import * as React from 'react';
import {useCallback, useState} from 'react';
import {Layers, RefreshCw} from 'lucide-react';

import {useMcpProtocol} from '@/hooks/useMcpProtocol';

import {Label} from '@/components/ui/Label';
import {AdvancedInput} from '@/components/ui/AdvanceInput';
import {Switch} from '@/components/ui/Switch';
import {Button} from '@/components/ui/Button';
import Separator from '@/components/ui/Separator';
import JsonViewer from '@/components/ui/JsonViewer';
import CodeEditor from '@/components/ui/CodeEditor';
import {Alert, AlertDescription, AlertTitle} from '@/components/ui/Alert';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/Card';

/**
 * BatchTab provides advanced batch execution with concurrency and timeout options.
 */
const BatchTab = () => {
  const {sendBatchWith} = useMcpProtocol();
  const [concurrency, setConcurrency] = useState(10);
  const [timeout, setTimeout] = useState(30000);
  const [failFast, setFailFast] = useState(false);
  const [batchBody, setBatchBody] = useState<string>(
    JSON.stringify([
      {jsonrpc: '2.0', id: 1, method: 'tools/list'},
      {jsonrpc: '2.0', id: 2, method: 'ping'},
    ], null, 2),
  );
  const [response, setResponse] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSend = useCallback(async () => {
    setError(null);
    setResponse(null);
    setLoading(true);
    try {
      const body = JSON.parse(batchBody);
      const items = Array.isArray(body) ? body : [body];
      const res = await sendBatchWith(items, {concurrency, timeout: failFast ? 5000 : timeout, failFast});
      setResponse(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Batch failed');
    } finally {
      setLoading(false);
    }
  }, [batchBody, concurrency, timeout, failFast, sendBatchWith]);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold">Advanced Batch Executor</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Execute multiple JSON-RPC requests with concurrency control, timeout, and fail-fast options
        </p>
      </div>
      <div className="grid gap-3 lg:grid-cols-[370px_1fr]">
        {/* Configuration */}
        <Card className="flex flex-col">
          <CardHeader className="pb-3 px-6 py-4 flex-shrink-0">
            <CardTitle className="text-base">Configuration</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 px-6 pt-0 space-y-5">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Concurrency (1-100)</Label>
              <AdvancedInput
                allowNumericOnly
                value={concurrency as unknown as string}
                min={1}
                max={100}
                maxLength={3}
                allowClear={false}
                onChange={e => setConcurrency(parseInt(e.target.value) || 10)}/>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold">Timeout (ms)</Label>
              <AdvancedInput
                allowNumericOnly
                value={timeout as unknown as string}
                min={1000}
                max={120000}
                maxLength={6}
                allowClear={false}
                onChange={e => setTimeout(parseInt(e.target.value) || 30000)}/>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
              <Switch checked={failFast} onCheckedChange={setFailFast}/>
              <div className="flex-1">
                <Label className="text-sm font-semibold">Fail Fast</Label>
                <p className="text-xs text-muted-foreground mt-0.5">Stop batch on first error</p>
              </div>
            </div>

            <Separator/>

            <Button onClick={handleSend} disabled={loading} className="w-full py-6 text-sm font-semibold">
              {loading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin"/>
                  Processing...
                </>
              ) : (
                <>
                  <Layers className="mr-2 h-4 w-4"/>
                  Execute Batch
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Batch Input */}
        <Card className="flex flex-col">
          <CardHeader className="pb-3 px-6 py-4 flex-shrink-0">
            <CardTitle className="text-base">Batch Request</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 px-6 pt-0">
            <CodeEditor
              value={batchBody}
              onChange={setBatchBody}
              language="json"
              heightClass="h-[350px]"
            />
          </CardContent>
        </Card>
      </div>
      <div>
        {/* Batch Response */}
        <Card className="flex flex-col">
          <CardHeader className="pb-3 px-6 py-4 flex-shrink-0">
            <CardTitle className="text-base">Batch Response</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 px-6 pt-0">
            {response ? (
              <div className="min-h-[150px] max-h-[350px] overflow-auto rounded-xl border bg-muted/20 p-4">
                <JsonViewer value={response as object}/>
              </div>
            ) : (
              <div
                className="min-h-[150px] max-h-[350px] flex items-center justify-center text-muted-foreground text-sm">
                <div className="text-center">
                  <Layers className="h-12 w-12 mx-auto mb-4 opacity-20"/>
                  <p className="font-medium">Send batch to see results</p>
                </div>
              </div>
            )}
            {error && (
              <Alert variant="destructive" className="mt-4">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BatchTab;
