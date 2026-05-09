/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

import * as React from 'react';
import McpProtocolContext, {type McpProtocolContextValue} from '@/pages/MCPProtocol/MCPContext';

/**
 * Access the shared MCP protocol context.
 *
 * @throws If used outside of `MCPProtocolProvider`
 */
export function useMcpProtocol(): McpProtocolContextValue {
  const ctx = React.useContext(McpProtocolContext);
  if (!ctx) {
    throw new Error('useMcpProtocol must be used within an MCPProtocolProvider');
  }
  return ctx;
}
