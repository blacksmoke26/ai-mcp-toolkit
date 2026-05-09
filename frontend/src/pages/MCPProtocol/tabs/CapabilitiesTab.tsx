/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

import * as React from 'react';
import {Database, FileText, Terminal, Wrench} from 'lucide-react';

import {Badge} from '@/components/ui/Badge';
import CapabilityIndicator from '../parts/CapabilityIndicator';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/Card';

import {useMcpProtocol} from '@/hooks/useMcpProtocol';

/**
 * CapabilitiesTab displays detailed server capabilities.
 */
const CapabilitiesTab = () => {
  const {state} = useMcpProtocol();
  const caps = state.capabilities;

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-xl font-bold">Server Capabilities</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Detailed overview of MCP server capabilities and supported primitives
        </p>
      </div>

      {caps ? (
        <>
          {/* Protocol Info */}
          <section>
            <h4 className="text-lg font-bold mb-4">Protocol Details</h4>
            <Card className="overflow-hidden">
              <CardContent className="p-6">
                <div className="grid gap-6 sm:grid-cols-3">
                  <div className="space-y-2">
                    <span
                      className="text-xs text-muted-foreground/80 uppercase tracking-widest font-semibold">Protocol</span>
                    <div className="text-xl font-extrabold font-mono">{caps.protocolVersion}</div>
                  </div>
                  <div className="space-y-2">
                    <span
                      className="text-xs text-muted-foreground/80 uppercase tracking-widest font-semibold">Server</span>
                    <div className="text-xl font-extrabold">{caps.serverInfo.name}</div>
                    <div className="text-sm text-muted-foreground/70">v{caps.serverInfo.version}</div>
                  </div>
                  <div className="space-y-2">
                    <span
                      className="text-xs text-muted-foreground/80 uppercase tracking-widest font-semibold">Transports</span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {caps.transports.map(t => (
                        <Badge key={t} variant="secondary" className="text-xs font-semibold px-3 py-1">{t}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Primitives */}
          <section>
            <h4 className="text-lg font-bold mb-4">Supported Primitives</h4>
            <Card className="overflow-hidden">
              <CardContent className="p-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <CapabilityIndicator
                    icon={<Wrench className="h-5 w-5"/>}
                    name="Tools"
                    supported={caps.capabilities.tools.supported}
                  />
                  <CapabilityIndicator
                    icon={<Database className="h-5 w-5"/>}
                    name="Resources"
                    supported={caps.capabilities.resources.supported}
                    details={caps.capabilities.resources.subscribe ? 'Subscribe supported' : undefined}
                  />
                  <CapabilityIndicator
                    icon={<FileText className="h-5 w-5"/>}
                    name="Prompts"
                    supported={caps.capabilities.prompts.supported}
                  />
                  <CapabilityIndicator
                    icon={<Terminal className="h-5 w-5"/>}
                    name="Logging"
                    supported={caps.capabilities.logging.supported}
                  />
                </div>
              </CardContent>
            </Card>
          </section>

          {/* All Methods */}
          <section>
            <h4 className="text-lg font-bold mb-4">Available Methods</h4>
            <Card className="overflow-hidden">
              <CardHeader className="pb-3 px-6 py-4">
                <CardTitle className="text-base">{caps.methods?.length || 0} methods registered</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid gap-2 sm:grid-cols-2">
                  {caps.methods?.map((m, i) => (
                    <div key={i}
                         className="flex items-center gap-2.5 p-3 rounded-lg border bg-muted/15 hover:bg-muted/30 transition-colors">
                      <Badge variant="outline" className="text-xs font-mono px-2.5 py-1">{m}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </section>
        </>
      ) : (
        <section>
          <Card>
            <CardContent className="flex h-40 items-center justify-center text-muted-foreground">
              <p className="font-medium">Loading capabilities...</p>
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  );
};

export default CapabilitiesTab;
