import * as React from 'react';
import {useEffect, useState} from 'react';
import {Archive, Bot, ChevronRight, Clock, MessageCircle, MessageSquare, Search, Trash2} from 'lucide-react';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/Card';
import {Button} from '@/components/ui/Button';
import {Badge} from '@/components/ui/Badge';
import {Input} from '@/components/ui/Input';
import {Alert, AlertDescription} from '@/components/ui/Alert';
import {type Conversation, deleteConversation, listConversations} from '@/lib/api';
import {Link} from 'react-router-dom';

export function ConversationsList() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchConversations = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await listConversations();
      setConversations(response.conversations || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch conversations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  const handleDeleteConversation = async (id: string) => {
    if (!confirm('Are you sure you want to delete this conversation?')) return;

    try {
      setDeletingId(id);
      await deleteConversation(id);
      setConversations((prev) => prev.filter((conv) => conv.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete conversation');
    } finally {
      setDeletingId(null);
    }
  };

  const filteredConversations = conversations.filter((conv) => {
    const query = searchQuery.toLowerCase();
    return (
      conv.title.toLowerCase().includes(query) ||
      conv.lastMessage?.toLowerCase().includes(query) ||
      conv.model?.toLowerCase().includes(query)
    );
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }
    if (days === 1) {
      return 'Yesterday';
    }
    if (days < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'long' });
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const truncateMessage = (message: string | undefined, maxLength: number = 80) => {
    if (!message) return 'No messages';
    return message.length > maxLength
      ? `${message.substring(0, maxLength).trim()}...`
      : message;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Conversations</h2>
            <p className="text-muted-foreground">Manage conversation history</p>
          </div>
        </div>

        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="h-6 w-48 bg-muted rounded" />
                  <div className="h-4 w-24 bg-muted rounded" />
                </div>
                <div className="h-4 w-64 bg-muted rounded mt-3" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Conversations</h2>
          <p className="text-muted-foreground">
            Manage conversation history
          </p>
        </div>
        <Button onClick={fetchConversations} variant="outline">
          <Archive className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Conversations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{conversations.length}</div>
            <p className="text-xs text-muted-foreground">active conversations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Filtered Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredConversations.length}</div>
            <p className="text-xs text-muted-foreground">
              {searchQuery ? `matching "${searchQuery}"` : 'all conversations'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Oldest Conversation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium">
              {conversations.length > 0
                ? formatDate(conversations[conversations.length - 1].updatedAt)
                : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">ago</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search conversations by title, message, or model..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Conversations List */}
      {filteredConversations.length === 0 ? (
        <Card className="p-8 text-center">
          <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">
            {searchQuery ? 'No matching conversations' : 'No conversations yet'}
          </h3>
          <p className="text-muted-foreground mb-4">
            {searchQuery
              ? 'Try adjusting your search query'
              : 'Start a new conversation to see it here'}
          </p>
          <Link to="/chat">
            <Button>
              <MessageSquare className="mr-2 h-4 w-4" />
              Start Chatting
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredConversations.map((conversation) => (
            <Card key={conversation.id} className="transition-shadow hover:shadow-md">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Link to={`/chat/conversations/${conversation.id}`}>
                        <h3 className="font-medium text-lg hover:text-primary cursor-pointer transition-colors truncate">
                          {conversation.title}
                        </h3>
                      </Link>
                      {conversation.model && (
                        <Badge variant="secondary" className="text-xs">
                          {conversation.model}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-sm text-muted-foreground mb-2">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDate(conversation.updatedAt)}
                      </div>
                      <div className="flex items-center gap-1">
                        <MessageCircle className="h-3 w-3" />
                        {conversation.lastMessage ? 'Has messages' : 'No messages'}
                      </div>
                    </div>

                    {conversation.lastMessage && (
                      <div className="text-sm text-muted-foreground line-clamp-2">
                        {truncateMessage(conversation.lastMessage, 120)}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Link to={`/chat/conversations/${conversation.id}`}>
                      <Button variant="ghost" size="icon">
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteConversation(conversation.id)}
                      disabled={deletingId === conversation.id}
                      title="Delete conversation"
                    >
                      {deletingId === conversation.id ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      ) : (
                        <Trash2 className="h-4 w-4 text-red-600" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            About Conversations
          </CardTitle>
          <CardDescription>
            Conversation management features
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Features</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Bot className="h-3 w-3" />
                  <span>View conversation history</span>
                </li>
                <li className="flex items-center gap-2">
                  <Archive className="h-3 w-3" />
                  <span>Search through conversations</span>
                </li>
                <li className="flex items-center gap-2">
                  <Trash2 className="h-3 w-3" />
                  <span>Delete unwanted conversations</span>
                </li>
                <li className="flex items-center gap-2">
                  <ChevronRight className="h-3 w-3" />
                  <span>Continue previous conversations</span>
                </li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-medium">Data Storage</h4>
              <p className="text-sm text-muted-foreground">
                Conversations are stored in the database with full message history.
                Each conversation tracks the model used, timestamps, and all interactions
                including tool calls and responses.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default ConversationsList;
