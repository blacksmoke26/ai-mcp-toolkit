/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

/**
 * MCPProtocol barrel export
 * Provides easy imports for all MCP protocol-related components and types.
 */

export { McpProtocolProvider, default as McpProtocolContext } from './MCPContext';
export type { McpProtocolState, McpProtocolContextValue, HealthStatus } from './MCPContext';

export { useMcpProtocol } from '@/hooks/useMcpProtocol';

export { default as MCPDashboard } from './MCPDashboard';
export { default as MCPBatchExecutor } from './MCPBatchExecutor';
export { default as MCPValidator } from './MCPValidator';
export { default as MCPStats } from './MCPStats';
export { default as MCPMethods } from './MCPMethods';
export { default as MCPInfo } from './MCPInfo';
export { default as MCPHealth } from './MCPHealth';
export { default as MCPCallTool } from './MCPCallTool';
export { default as MCPSSE } from './MCPSSE';
export { default as MCPTools } from './MCPTools';
