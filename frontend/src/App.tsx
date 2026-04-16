/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
*/

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// components
import Layout from './components/Layout';

// pages
import Dashboard from '@/pages/Dashboard';
import MCPTools from '@/pages/MCPTools';
import Chat from '@/pages/Chat';
import AdminProviders from '@/pages/AdminProviders';
import AdminTools from '@/pages/AdminTools';
import PerformanceDashboard from '@/pages/PerformanceDashboard';
import ToolSimulator from '@/pages/ToolSimulator';
import ReadinessCheck from '@/pages/ReadinessCheck';
import ServerInfo from '@/pages/ServerInfo';
import HealthCheck from '@/pages/HealthCheck';
import MCPCallTool from '@/pages/MCPCallTool';
import MCPSSE from '@/pages/MCPSSE';
import ConversationsList from '@/pages/ConversationsList';
import ConversationDetail from '@/pages/ConversationDetail';
import ChatStream from '@/pages/ChatStream';
import MCPInfo from '@/pages/MCPInfo';
import ModelsList from '@/pages/ModelsList';
import ToolDetail from '@/pages/ToolDetail';
import CustomTools from '@/pages/CustomTools';

/**
 * Component displayed when a user navigates to a route that does not exist.
 * @returns A 404 error message centered on the screen.
 */
const NotFound: React.FC = () => (
  <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
    <h2 className="text-4xl font-bold tracking-tight">404</h2>
    <p className="text-muted-foreground mt-2">Page not found</p>
  </div>
);

/**
 * Main application component responsible for defining the routing structure.
 * Uses React Router to navigate between different pages and wraps the content
 * in a shared Layout component.
 * @returns The routed application structure.
 */
const App: React.FC = () => (
  <BrowserRouter>
    <Layout>
      <Routes>
        {/* Dashboard */}
        <Route path="/" element={<Dashboard/>}/>

        {/* Health & Monitoring */}
        <Route path="/info" element={<ServerInfo/>}/>
        <Route path="/health" element={<HealthCheck/>}/>
        <Route path="/health/ready" element={<ReadinessCheck/>}/>

        {/* MCP Protocol */}
        <Route path="/mcp/tools" element={<MCPTools/>}/>
        <Route path="/mcp/call" element={<MCPCallTool/>}/>
        <Route path="/mcp/sse" element={<MCPSSE/>}/>
        <Route path="/mcp/info" element={<MCPInfo/>}/>

        {/* Performance & Monitoring */}
        <Route path="/performance" element={<PerformanceDashboard/>}/>

        {/* Chat & Conversations */}
        <Route path="/chat" element={<Chat/>}/>
        <Route path="/chat/stream" element={<ChatStream/>}/>
        <Route path="/chat/conversations" element={<ConversationsList/>}/>
        <Route path="/chat/conversations/:id" element={<ConversationDetail/>}/>

        {/* Admin */}
        <Route path="/admin/providers" element={<AdminProviders/>}/>
        <Route path="/admin/tools" element={<AdminTools/>}/>
        <Route path="/admin/models" element={<ModelsList/>}/>
        <Route path="/admin/tools/:name" element={<ToolDetail/>}/>
        <Route path="/admin/custom-tools" element={<CustomTools/>}/>

        {/* Simulation & Testing */}
        <Route path="/simulate" element={<ToolSimulator/>}/>

        {/* Redirects */}
        <Route path="/dashboard" element={<Navigate to="/" replace/>}/>

        {/* 404 */}
        <Route path="*" element={<NotFound/>}/>
      </Routes>
    </Layout>
  </BrowserRouter>
);

export default App;
