import * as React from 'react';
import {useEffect, useState} from 'react';
import {
  ChevronDown,
  ChevronUp,
  Database,
  ExternalLink,
  Loader2,
  RefreshCw,
  Server,
  Sparkles,
  XCircle,
} from 'lucide-react';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/Card';
import {Badge} from '@/components/ui/Badge';
import {Button} from '@/components/ui/Button';
import {Alert, AlertDescription, AlertTitle} from '@/components/ui/Alert';
import {listProviderModels, listProviders, type Model, type Provider} from '@/lib/api';

interface ProviderWithModels extends Provider {
  models?: Model[];
  loadingModels?: boolean;
  errorLoadingModels?: string;
}

export default function ModelsList() {
  const [providers, setProviders] = useState<ProviderWithModels[]>([]);
  const [defaultProvider, setDefaultProvider] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedProviders, setExpandedProviders] = useState<Set<string>>(new Set());
  const [loadingAllModels, setLoadingAllModels] = useState(false);

  // Fetch providers and their models
  const fetchData = async (fetchModels: boolean = true) => {
    try {
      setLoading(true);
      setError(null);

      const response = await listProviders();
      setDefaultProvider(response.default || '');

      let providersWithModels: ProviderWithModels[] = (response.active || []).map(p => ({
        ...p,
        loadingModels: fetchModels,
      }));

      if (fetchModels) {
        setLoadingAllModels(true);
        const modelsPromises = providersWithModels.map(async (provider) => {
          try {
            const modelsResponse = await listProviderModels(provider.name);
            return {
              ...provider,
              models: modelsResponse.models || [],
              loadingModels: false,
            };
          } catch (err) {
            return {
              ...provider,
              loadingModels: false,
              errorLoadingModels: err instanceof Error ? err.message : 'Failed to load models',
            };
          }
        });

        const results = await Promise.all(modelsPromises);
        providersWithModels = results;
        setLoadingAllModels(false);
      }

      setProviders(providersWithModels);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch providers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const toggleProvider = (providerName: string) => {
    setExpandedProviders(prev => {
      const next = new Set(prev);
      if (next.has(providerName)) {
        next.delete(providerName);
      } else {
        next.add(providerName);
        // Fetch models for this provider if not already loaded
        if (!providers.find(p => p.name === providerName)?.models) {
          fetchProviderModels(providerName);
        }
      }
      return next;
    });
  };

  const fetchProviderModels = async (providerName: string) => {
    try {
      // Update to show loading state
      setProviders(prev => prev.map(p =>
        p.name === providerName ? { ...p, loadingModels: true } : p
      ));

      const response = await listProviderModels(providerName);

      setProviders(prev => prev.map(p =>
        p.name === providerName
          ? {
              ...p,
              models: response.models || [],
              loadingModels: false,
              errorLoadingModels: undefined
            }
          : p
      ));
    } catch (err) {
      setProviders(prev => prev.map(p =>
        p.name === providerName
          ? {
              ...p,
              loadingModels: false,
              errorLoadingModels: err instanceof Error ? err.message : 'Failed to load models'
            }
          : p
      ));
    }
  };

  const refreshModels = () => {
    setProviders(prev => prev.map(p => ({ ...p, models: undefined, errorLoadingModels: undefined })));
    fetchData(true);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <RefreshCw className="h-6 w-6 animate-spin" />
          <h2 className="text-3xl font-bold tracking-tight">Loading Models...</h2>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <XCircle className="h-6 w-6 text-destructive" />
          <h2 className="text-3xl font-bold tracking-tight">Error Loading Models</h2>
        </div>
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={() => fetchData()}>Retry</Button>
      </div>
    );
  }

  const totalModels = providers.reduce((acc, p) => acc + (p.models?.length || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight">Available Models</h2>
          <p className="text-muted-foreground">
            List of all models from configured LLM providers
          </p>
        </div>
        <Button onClick={refreshModels} variant="outline" size="sm" disabled={loadingAllModels}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loadingAllModels ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Providers</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{providers.length}</div>
            <p className="text-xs text-muted-foreground">{defaultProvider ? `Default: ${defaultProvider}` : 'No default set'}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Models</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalModels}</div>
            <p className="text-xs text-muted-foreground">Across all providers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Provider Types</CardTitle>
            <Sparkles className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Badge variant="outline">{providers.filter(p => p.type === 'ollama').length} Ollama</Badge>
              <Badge variant="outline">{providers.filter(p => p.type === 'openai').length} OpenAI</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Configured types</p>
          </CardContent>
        </Card>
      </div>

      {/* Providers List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Providers & Models</CardTitle>
              <CardDescription>Click on a provider to expand and see its models</CardDescription>
            </div>
            <Badge variant={providers.every(p => !p.loadingModels && !p.errorLoadingModels) ? "default" : "secondary"}>
              {providers.every(p => !p.loadingModels && !p.errorLoadingModels) ? "All Loaded" : "Loading..."}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {providers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Server className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No providers configured</p>
              <p className="text-sm mt-2">Add a provider via Admin &gt; Providers</p>
            </div>
          ) : (
            <div className="space-y-4">
              {providers.map((provider) => {
                const isExpanded = expandedProviders.has(provider.name);
                const hasModels = provider.models && provider.models.length > 0;

                return (
                  <div
                    key={provider.name}
                    className="border rounded-lg overflow-hidden transition-all duration-200 hover:shadow-sm"
                  >
                    {/* Provider Header */}
                    <div
                      className="flex items-center justify-between p-4 bg-muted/50 cursor-pointer hover:bg-muted/70 transition-colors"
                      onClick={() => toggleProvider(provider.name)}
                    >
                      <div className="flex items-center gap-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleProvider(provider.name);
                          }}
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                        <div className="flex items-center gap-2">
                          <Server className="h-5 w-5 text-blue-500" />
                          <div>
                            <div className="font-semibold flex items-center gap-2">
                              {provider.name}
                              {provider.isDefault && (
                                <Badge variant="default" className="text-xs">Default</Badge>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground flex items-center gap-2">
                              <Badge variant="outline">{provider.type}</Badge>
                              <span>{provider.baseUrl}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {provider.loadingModels ? (
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        ) : hasModels ? (
                          <Badge variant="secondary">{provider?.models?.length} models</Badge>
                        ) : provider.errorLoadingModels ? (
                          <Badge variant="destructive">Error</Badge>
                        ) : (
                          <Badge variant="outline">No models</Badge>
                        )}
                      </div>
                    </div>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <div className="p-4 border-t bg-card">
                        {provider.loadingModels ? (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Loading models...</span>
                          </div>
                        ) : provider.errorLoadingModels ? (
                          <Alert variant="destructive">
                            <XCircle className="h-4 w-4" />
                            <AlertDescription className="ml-2">
                              {provider.errorLoadingModels}
                            </AlertDescription>
                            <Button
                              size="sm"
                              variant="outline"
                              className="mt-2"
                              onClick={() => fetchProviderModels(provider.name)}
                            >
                              Retry
                            </Button>
                          </Alert>
                        ) : provider.models && provider.models.length > 0 ? (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-sm font-medium text-muted-foreground">
                                Default Model: <span className="text-foreground">{provider.defaultModel}</span>
                              </p>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => fetchProviderModels(provider.name)}
                              >
                                <RefreshCw className="h-3 w-3 mr-1" />
                                Refresh
                              </Button>
                            </div>
                            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                              {provider.models.map((model) => (
                                <div
                                  key={model.id}
                                  className={`flex items-center justify-between p-3 rounded-md border transition-colors ${
                                    model.id === provider.defaultModel
                                      ? 'bg-primary/5 border-primary/50'
                                      : 'bg-muted/30 hover:bg-muted/50'
                                  }`}
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <Database className="h-4 w-4 text-green-500 flex-shrink-0" />
                                    <div className="min-w-0">
                                      <p className="font-medium text-sm truncate">
                                        {model.name || model.id}
                                      </p>
                                      {model.id !== provider.defaultModel && (
                                        <p className="text-xs text-muted-foreground truncate">
                                          ID: {model.id}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  {model.id === provider.defaultModel && (
                                    <Badge variant="default" className="text-xs flex-shrink-0">
                                      Default
                                    </Badge>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-4 text-muted-foreground">
                            <Database className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No models available</p>
                            <p className="text-xs mt-1">The provider may be offline or misconfigured</p>
                            <Button
                              size="sm"
                              variant="outline"
                              className="mt-2"
                              onClick={() => fetchProviderModels(provider.name)}
                            >
                              Try Again
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Manage providers and view more details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <Button variant="outline" className="justify-start" asChild>
              <a href="/admin/providers">
                <Server className="h-4 w-4 mr-2" />
                Manage Providers
              </a>
            </Button>
            <Button variant="outline" className="justify-start" asChild>
              <a href="/admin/tools">
                <Database className="h-4 w-4 mr-2" />
                View Tools
              </a>
            </Button>
            <Button variant="outline" className="justify-start" asChild>
              <a href="/mcp/info">
                <ExternalLink className="h-4 w-4 mr-2" />
                MCP Info
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
