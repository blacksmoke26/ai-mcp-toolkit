/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

import type {MCPServerResponse, MCPServerHealthResponse, MCPServerStatus} from '@/types/api.ts';
import React, {useEffect, useState} from 'react';
import {getMCPServerHealth} from '@/lib/api.ts';
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
  const [healthResult, setHealthResult] = useState<MCPServerHealthResponse | null>(null);

  const runHealthCheck = async () => {
    if (!server) return;

    setChecking(true);
    setHealthResult(null);

    try {
      const result = await getMCPServerHealth(server.id);
      setHealthResult(result);
    } catch (err) {
      setHealthResult({
        id: server.id,
        name: server.name,
        status: 'unknown',
        connectionStatus: server.status,
        checkedAt: new Date(),
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

  const healthStatus: string = healthResult?.status || 'unknown';
  const healthColor = healthStatus === 'healthy' ? 'text-green-500' : healthStatus === 'unhealthy' ? 'text-red-500' : 'text-gray-500';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5"/>
            Server Health Check
          </DialogTitle>
          <DialogDescription>
            Health status for {server.displayName}
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
                  <div className="mt-1">
                    <StatusBadge status={server.status}/>
                  </div>
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

          {healthResult && (
            <>
              <Alert variant={healthStatus === 'healthy' ? 'default' : healthStatus === 'unhealthy' ? 'destructive' : 'default'}>
                {healthStatus === 'healthy' ? (
                  <Check className="h-4 w-4"/>
                ) : healthStatus === 'unhealthy' ? (
                  <AlertCircle className="h-4 w-4"/>
                ) : (
                  <Activity className="h-4 w-4"/>
                )}
                <AlertTitle className={healthColor}>{healthStatus.charAt(0).toUpperCase() + healthStatus.slice(1)}</AlertTitle>
                <AlertDescription>
                  {healthStatus === 'healthy' && 'Server is responding normally'}
                  {healthStatus === 'unhealthy' && 'Server is experiencing issues'}
                  {healthStatus === 'unknown' && 'Unable to determine health status'}
                  {healthResult.lastError && (
                    <div className="mt-2 text-destructive">{healthResult.lastError}</div>
                  )}
                  <div className="mt-2 flex items-center gap-4 text-xs">
                    {healthResult.uptime && (
                      <span>
                        <strong>Uptime:</strong> {Math.floor(healthResult.uptime / 3600)}h {Math.floor((healthResult.uptime % 3600) / 60)}m {healthResult.uptime % 60}s
                      </span>
                    )}
                    <span>
                      <strong>Checked:</strong> {new Date(healthResult.checkedAt).toLocaleString()}
                    </span>
                  </div>
                </AlertDescription>
              </Alert>

              <Card>
                <CardContent className="pt-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Connection Status:</span>
                      <div className="mt-1">
                        <StatusBadge status={healthResult.connectionStatus as MCPServerStatus}/>
                      </div>
                    </div>
                    {healthResult.uptime && (
                      <div>
                        <span className="text-muted-foreground">Uptime:</span>
                        <div className="mt-1 font-medium">{Math.floor(healthResult.uptime / 60)}m {healthResult.uptime % 60}s</div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {!checking && (
            <Button onClick={runHealthCheck} variant="secondary">
              <RefreshCw className="w-4 h-4 mr-2"/>
              Refresh Health
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default HealthDialog;