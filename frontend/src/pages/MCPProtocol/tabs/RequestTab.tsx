/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

import * as React from 'react';
import {useCallback, useState} from 'react';
import {CheckCircle2, RefreshCw, Zap} from 'lucide-react';

import {Badge} from '@/components/ui/Badge';
import {Button} from '@/components/ui/Button';
import CodeEditor from '@/components/ui/CodeEditor';
import JsonViewer from '@/components/ui/JsonViewer';
import {Alert, AlertDescription, AlertTitle} from '@/components/ui/Alert';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/Card';

import {useMcpProtocol} from '@/hooks/useMcpProtocol';

/**
 * RequestTab allows sending single or batch JSON-RPC requests.
 */
const RequestTab = () => {
  const {sendRequest, sendBatch} = useMcpProtocol();
  const [mode, setMode] = useState<'single' | 'batch'>('single');
  const [requestBody, setRequestBody] = useState<string>(
    JSON.stringify({jsonrpc: '2.0', id: 1, method: 'tools/list'}, null, 2),
  );
  const [response, setResponse] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSend = useCallback(async () => {
    setError(null);
    setResponse(null);
    setLoading(true);

    try {
      const body = JSON.parse(requestBody);
      if (mode === 'single') {
        const res = await sendRequest(body);
        setResponse(res);
      } else {
        const res = await sendBatch(Array.isArray(body) ? body : [body]);
        setResponse(res);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  }, [requestBody, mode, sendRequest, sendBatch]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold">JSON-RPC Request Executor</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Send single or batch JSON-RPC requests to the MCP server
          </p>
        </div>
        <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl">
          <button
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${mode === 'single' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            onClick={() => setMode('single')}
          >
            Single
          </button>
          <button
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${mode === 'batch' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            onClick={() => setMode('batch')}
          >
            Batch
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Input */}
        <Card className="flex flex-col">
          <CardHeader className="pb-3 px-6 py-4 flex-shrink-0">
            <CardTitle className="flex items-center gap-2.5 text-base">
              <div className="p-2 rounded-lg bg-orange-500/15">
                <Zap className="h-4 w-4 text-orange-500"/>
              </div>
              Request Body
              <Badge variant="secondary" className="text-xs ml-auto">
                {mode === 'single' ? 'Object' : 'Array'}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 px-6 pt-0 space-y-4">
            <CodeEditor
              value={requestBody}
              onChange={setRequestBody}
              language="json"
              heightClass="h-[350px]"
            />
            <Button onClick={handleSend} disabled={loading} className="w-full py-6 text-sm font-semibold">
              {loading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin"/>
                  Sending...
                </>
              ) : (
                <>
                  <Zap className="mr-2 h-4 w-4"/>
                  Send {mode === 'single' ? 'Request' : 'Batch'}
                </>
              )}
            </Button>
            {error && (
              <Alert variant="destructive">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Response */}
        <Card className="flex flex-col">
          <CardHeader className="pb-3 px-6 py-4 flex-shrink-0">
            <CardTitle className="flex items-center gap-2.5 text-base">
              <div className="p-2 rounded-lg bg-green-500/15">
                <CheckCircle2 className="h-4 w-4 text-green-500"/>
              </div>
              Response
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 px-6 pt-0">
            {response ? (
              <div className="h-[350px] overflow-auto rounded-xl border bg-muted/20 p-4">
                <JsonViewer value={response as object}/>
              </div>
            ) : (
              <div className="h-[350px] flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Zap className="h-12 w-12 mx-auto mb-4 opacity-20"/>
                  <p className="text-sm font-medium">Send a request to see the response</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Your response will appear here</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RequestTab;
