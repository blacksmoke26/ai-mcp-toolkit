import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { MCPTools } from './pages/MCPTools';
import { Chat } from './pages/Chat';
import { AdminProviders } from './pages/AdminProviders';
import { AdminTools } from './pages/AdminTools';
import { PerformanceDashboard } from './pages/PerformanceDashboard';
import { ToolSimulator } from './pages/ToolSimulator';
import ReadinessCheck from '@/pages/ReadinessCheck.tsx';
import ServerInfo from '@/pages/ServerInfo.tsx';
import HealthCheck from '@/pages/HealthCheck.tsx';
import MCPCallTool from '@/pages/MCPCallTool.tsx';
import MCPSSE from '@/pages/MCPSSE.tsx';
import ConversationsList from '@/pages/ConversationsList.tsx';
import ConversationDetail from '@/pages/ConversationDetail.tsx';
import ChatStream from '@/pages/ChatStream.tsx';
import MCPInfo from '@/pages/MCPInfo.tsx';
import ModelsList from '@/pages/ModelsList.tsx';
import ToolDetail from '@/pages/ToolDetail.tsx';

function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <h2 className="text-4xl font-bold tracking-tight">404</h2>
      <p className="text-muted-foreground mt-2">Page not found</p>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          {/* Dashboard */}
          <Route path="/" element={<Dashboard />} />

          {/* Health & Monitoring */}
          <Route path="/info" element={<ServerInfo />} />
          <Route path="/health" element={<HealthCheck />} />
          <Route path="/health/ready" element={<ReadinessCheck />} />

          {/* MCP Protocol */}
          <Route path="/mcp/tools" element={<MCPTools />} />
          <Route path="/mcp/call" element={<MCPCallTool />} />
          <Route path="/mcp/sse" element={<MCPSSE />} />
          <Route path="/mcp/info" element={<MCPInfo />} />

          {/* Performance & Monitoring */}
          <Route path="/performance" element={<PerformanceDashboard />} />

          {/* Chat & Conversations */}
          <Route path="/chat" element={<Chat />} />
          <Route path="/chat/stream" element={<ChatStream />} />
          <Route path="/chat/conversations" element={<ConversationsList />} />
          <Route path="/chat/conversations/:id" element={<ConversationDetail />} />

          {/* Admin */}
          <Route path="/admin/providers" element={<AdminProviders />} />
          <Route path="/admin/tools" element={<AdminTools />} />
          <Route path="/admin/models" element={<ModelsList />} />
          <Route path="/admin/tools/:name" element={<ToolDetail />} />

          {/* Simulation & Testing */}
          <Route path="/simulate" element={<ToolSimulator />} />

          {/* Redirects */}
          <Route path="/dashboard" element={<Navigate to="/" replace />} />

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
