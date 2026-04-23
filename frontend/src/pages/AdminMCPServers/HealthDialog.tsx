/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

import type {MCPServerResponse} from '@/types/api.ts';
import React, {useEffect, useState} from 'react';
import {testMCPServerConnection} from '@/lib/api.ts';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog.tsx';
import {Activity, AlertCircle, Check, Loader2, RefreshCw} from 'lucide-react';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/Card.tsx';
import StatusBadge from '@/pages/AdminMCPServers/StatusBadge.tsx';
import {Alert, AlertDescription, AlertTitle} from '@/components/ui/Alert.tsx';
import {Button} from '@/components/ui/Button.tsx';

/**
 * Properties for the HealthDialog component.
 */
export interface HealthDialogProps {
  /**
   * Controls whether the dialog is currently open.
   */
  open: boolean;

  /**
   * Callback function invoked when the dialog's open state changes.
   * @param open - The new open state of the dialog.
   */
  onOpenChange(open: boolean): void;

  /**
   * The MCP server data to display and perform health checks on.
   * If null or undefined, the dialog will not render content.
   */
  server?: MCPServerResponse | null;
}

const HealthDialog: React.FC<HealthDialogProps> = ({open, onOpenChange, server}) => {
  const [checking, setChecking] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; status?: string } | null>(null);

  const runHealthCheck = async () => {
    if (!server) return;

    setChecking(true);
    setTestResult(null);

    try {
      const result = await testMCPServerConnection(server.id);
      setTestResult(result);
    } catch (err) {
      setTestResult({
        success: false,
        message: err instanceof Error ? err.message : 'Health check failed',
      });
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    if (open) {
      runHealthCheck();
    }
    // eslint-disable-next-line
  }, [open]);

  if (!server) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5"/>
            Server Health Check
          </DialogTitle>
          <DialogDescription>
            Testing connectivity for {server.displayName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">{server.name}</CardTitle>
              <CardDescription>Type: {server.type}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Status:</span>
                  <div className="mt-1"><StatusBadge status={server.status}/></div>
                </div>
                <div>
                  <span className="text-muted-foreground">Connections:</span>
                  <div className="mt-1">{server.connectionCount} successful</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Failures:</span>
                  <div className="mt-1">{server.failureCount}</div>
                </div>
                {server.lastConnectedAt && (
                  <div>
                    <span className="text-muted-foreground">Last Connected:</span>
                    <div className="mt-1">
                      {new Date(server.lastConnectedAt).toLocaleString()}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {checking && (
            <Alert>
              <Loader2 className="h-4 w-4 animate-spin"/>
              <AlertDescription>Running health check...</AlertDescription>
            </Alert>
          )}

          {testResult && (
            <Alert variant={testResult.success ? 'default' : 'destructive'}>
              {testResult.success ? (
                <Check className="h-4 w-4"/>
              ) : (
                <AlertCircle className="h-4 w-4"/>
              )}
              <AlertTitle>{testResult.success ? 'Success' : 'Failed'}</AlertTitle>
              <AlertDescription>
                {testResult.message}
                {testResult.status && (
                  <div className="mt-2">
                    <StatusBadge status={testResult.status}/>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {!checking && (
            <Button onClick={runHealthCheck} variant="secondary">
              <RefreshCw className="w-4 h-4 mr-2"/>
              Re-run Test
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default HealthDialog;
