/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

import * as React from 'react';
import {useEffect, useState} from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Bot,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  Copy,
  MessageSquare,
  Settings,
  Trash2,
  User,
  Wrench,
} from 'lucide-react';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/Card';
import {Button} from '@/components/ui/Button';
import {Badge} from '@/components/ui/Badge';
import {Alert, AlertDescription, AlertTitle} from '@/components/ui/Alert';
import {useNavigate, useParams} from 'react-router-dom';
import {type ConversationWithMessages, deleteConversation, getConversation} from '@/lib/api';
import MarkdownViewer from '@/components/ui/MarkdownViewer';

export function ConversationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [conversation, setConversation] = useState<ConversationWithMessages | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchConversation = async () => {
    if (!id) return;

    try {
      setLoading(true);
      setError(null);
      const data = await getConversation(id);
      setConversation(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch conversation');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!id || !window.confirm('Are you sure you want to delete this conversation?')) return;

    try {
      setDeleting(true);
      await deleteConversation(id);
      navigate('/chat/conversations');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete conversation');
    } finally {
      setDeleting(false);
    }
  };

  const copyToClipboard = async () => {
    if (!conversation) return;

    const messagesText = conversation.messages
      .map((msg) => {
        const prefix = msg.role === 'user' ? 'You' : msg.role === 'assistant' ? 'Assistant' : msg.role === 'tool' ? `Tool (${msg.toolName})` : 'System';
        return `${prefix}: ${msg.content}`;
      })
      .join('\n\n');

    try {
      await navigator.clipboard.writeText(messagesText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  useEffect(() => {
    fetchConversation();
  }, [id]);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'user':
        return 'bg-primary text-primary-foreground';
      case 'assistant':
        return 'bg-green-600 text-white';
      case 'tool':
        return 'bg-purple-600 text-white';
      case 'system':
        return 'bg-gray-600 text-white';
      default:
        return 'bg-muted';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'user':
        return <User className="h-4 w-4" />;
      case 'assistant':
        return <Bot className="h-4 w-4" />;
      case 'tool':
        return <Wrench className="h-4 w-4" />;
      case 'system':
        return <Settings className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate('/chat/conversations')}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <h2 className="text-3xl font-bold tracking-tight animate-pulse w-64 h-8 bg-muted rounded" />
        </div>

        <Card className="animate-pulse">
          <CardContent className="p-6">
            <div className="h-6 w-48 bg-muted rounded mb-4" />
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-4 w-full bg-muted rounded" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !conversation) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate('/chat/conversations')}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <h2 className="text-3xl font-bold tracking-tight">Conversation Not Found</h2>
        </div>

        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error || 'Could not load conversation details'}
          </AlertDescription>
        </Alert>

        <Button onClick={() => navigate('/chat/conversations')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Conversations
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/chat/conversations')}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">{conversation.title}</h2>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
              <Calendar className="h-4 w-4" />
              <span>{formatDate(conversation.updatedAt)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            {conversation.messages.length} messages
          </Badge>
          <Badge variant="info">
            {conversation.model}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={copyToClipboard}
            disabled={copied}
          >
            {copied ? (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Copied
              </>
            ) : (
              <>
                <Copy className="mr-2 h-4 w-4" />
                Copy
              </>
            )}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? (
              <>
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Conversation Metadata */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Conversation Details
          </CardTitle>
          <CardDescription>
            Metadata and configuration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">Conversation ID</div>
              <div className="font-mono text-sm">{conversation.id}</div>
            </div>
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">Model</div>
              <div className="font-medium">{conversation.model}</div>
            </div>
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">Total Messages</div>
              <div className="font-medium">{conversation.messages.length}</div>
            </div>
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">Created</div>
              <div className="font-medium">{formatDate(conversation.createdAt)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Messages Display */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Messages
          </CardTitle>
          <CardDescription>
            Full conversation history
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {conversation.messages.map((msg, index) => (
              <div
                key={index}
                className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                {/* Avatar */}
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${getRoleColor(msg.role)}`}>
                  {getRoleIcon(msg.role)}
                </div>

                {/* Message Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium capitalize">{msg.role}</span>
                    {msg.toolName && (
                      <Badge variant="secondary" className="text-xs">
                        {msg.toolName}
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {formatTime(msg.createdAt)}
                    </span>
                  </div>

                  <div
                    className={`rounded-lg p-4 max-w-[80%] ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground rounded-tr-sm'
                        : 'bg-muted rounded-tl-sm'
                    }`}
                  >
                    {msg.role === 'tool' ? (
                      <div className="space-y-2">
                        <div className="text-sm font-medium mb-2">Tool Output</div>
                        <pre className="text-sm whitespace-pre-wrap break-words bg-background/50 p-2 rounded overflow-x-auto">
                          <MarkdownViewer content={msg.content}/>
                        </pre>
                      </div>
                    ) : (
                      <div className="text-sm whitespace-pre-wrap break-words">
                        <MarkdownViewer content={msg.content}/>
                      </div>
                    )}

                    {msg.tokenCount && msg.tokenCount > 0 && (
                      <div className="mt-2 pt-2 border-t border-current/10 text-xs opacity-75">
                        {msg.tokenCount} tokens
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Summary Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Conversation Statistics</CardTitle>
          <CardDescription>
            Summary of this conversation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">User Messages</div>
              <div className="text-2xl font-bold">
                {conversation.messages.filter((m) => m.role === 'user').length}
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Assistant Messages</div>
              <div className="text-2xl font-bold">
                {conversation.messages.filter((m) => m.role === 'assistant').length}
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Tool Calls</div>
              <div className="text-2xl font-bold">
                {conversation.messages.filter((m) => m.role === 'tool').length}
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Total Tokens</div>
              <div className="text-2xl font-bold">
                {conversation.messages.reduce((sum, m) => sum + (m.tokenCount || 0), 0)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => navigate('/chat/conversations')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Conversations
        </Button>

        <Button onClick={() => navigate('/chat')}>
          <MessageSquare className="mr-2 h-4 w-4" />
          Start New Chat
        </Button>
      </div>
    </div>
  );
}

export default ConversationDetail;
