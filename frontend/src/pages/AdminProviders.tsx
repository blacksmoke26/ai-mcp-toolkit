/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

import * as React from 'react';
import {useEffect, useState} from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Code,
  Database,
  Key,
  Plus,
  RefreshCw,
  Server,
  Sparkles,
  Trash2,
  Wifi,
} from 'lucide-react';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/Card';
import {Button} from '@/components/ui/Button';
import {Input} from '@/components/ui/Input';
import {Badge} from '@/components/ui/Badge';
import {Alert, AlertDescription, AlertTitle} from '@/components/ui/Alert';
import {
  createProvider,
  type CreateProviderRequest,
  listProviderModels,
  listProviders,
  type Model,
  type Provider,
  removeProvider,
  testProviderConnection,
} from '@/lib/api';
import type {ProviderTestResponse} from '@/types/api.ts';

/**
 * AdminProviders Component
 *
 * A React functional component that manages LLM provider configurations.
 * It allows users to add, remove, and view details for providers like Ollama and OpenAI.
 *
 * @example
 * ```tsx
 * import AdminProviders from './AdminProviders';
 *
 * function App() {
 *   return (
 *     <div className="admin-dashboard">
 *       <AdminProviders />
 *     </div>
 *   );
 * }
 * ```
 */
const AdminProviders: React.FC = () => {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [configuredProviders, setConfiguredProviders] = useState<Provider[]>([]);
  const [defaultProvider, setDefaultProvider] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [models, setModels] = useState<Model[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [testingConnection, setTestingConnection] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, ProviderTestResponse>>({});

  // Form state
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<'ollama' | 'openai'>('ollama');
  const [formBaseUrl, setFormBaseUrl] = useState('');
  const [formApiKey, setFormApiKey] = useState('');
  const [formDefaultModel, setFormDefaultModel] = useState('');
  const [formIsDefault, setFormIsDefault] = useState(false);
  const [formTemperature, setFormTemperature] = useState(0.7);
  const [formMaxTokens, setFormMaxTokens] = useState(4096);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await listProviders();
      setProviders(response.active || []);
      setConfiguredProviders((response?.configured ?? []) as unknown as Provider[]);
      setDefaultProvider(response.default || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch providers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Fetch models for selected provider
  const fetchModels = async (providerName: string) => {
    try {
      setLoadingModels(true);
      const response = await listProviderModels(providerName);
      setModels(response.models || []);
    } catch (err) {
      console.error('Failed to fetch models:', err);
      setModels([]);
    } finally {
      setLoadingModels(false);
    }
  };

  // Handle adding new provider
  const handleAddProvider = async () => {
    if (!formName || !formBaseUrl || !formDefaultModel) {
      setError('Name, Base URL, and Default Model are required');
      return;
    }

    try {
      setError(null);
      setLoading(true);
      const provider: CreateProviderRequest = {
        name: formName,
        type: formType,
        baseUrl: formBaseUrl,
        apiKey: formApiKey || undefined,
        defaultModel: formDefaultModel,
        isDefault: formIsDefault,
        temperature: formTemperature,
        maxTokens: formMaxTokens,
      };

      await createProvider(provider);
      setSuccessMessage(`Provider "${formName}" added successfully`);
      setShowAddForm(false);

      // Reset form
      setFormName('');
      setFormBaseUrl('');
      setFormApiKey('');
      setFormDefaultModel('');
      setFormIsDefault(false);
      setFormTemperature(0.7);
      setFormMaxTokens(4096);

      // Refresh data
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add provider');
    } finally {
      setLoading(false);
    }
  };

  // Handle removing provider
  const handleRemoveProvider = async (name: string) => {
    if (!window.confirm(`Are you sure you want to remove provider "${name}"?`)) {
      return;
    }

    try {
      setError(null);
      setLoading(true);
      await removeProvider(name);
      setSuccessMessage(`Provider "${name}" removed successfully`);
      setSelectedProvider(null);
      setModels([]);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove provider');
    } finally {
      setLoading(false);
    }
  };

  // Handle setting default provider
  const handleSetDefaultProvider = async (name: string) => {
    try {
      setError(null);
      setLoading(true);
      setDefaultProvider(name);
      setSuccessMessage(`Provider "${name}" set as default`);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set default provider');
    } finally {
      setLoading(false);
    }
  };

  // Handle testing provider connection
  const handleTestConnection = async (name: string) => {
    try {
      setTestingConnection(name);
      setError(null);
      const result = await testProviderConnection(name);
      setTestResults((prev) => ({...prev, [name]: result}));
      if (result.status === 'ok') {
        setSuccessMessage(`Provider "${name}" connection successful (${result.latencyMs}ms)`);
      } else {
        setError(`Provider "${name}" connection failed: ${result.message || result.error || 'Unknown error'}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to test connection');
      setTestResults((prev) => ({
        ...prev,
        [name]: {
          provider: name,
          status: 'error',
          error: 'Connection test failed',
          message: err instanceof Error ? err.message : String(err),
        },
      }));
    } finally {
      setTestingConnection(null);
    }
  };

  // Reset success message after 3 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const clearForm = () => {
    setShowAddForm(false);
    setFormName('');
    setFormType('ollama');
    setFormBaseUrl('');
    setFormApiKey('');
    setFormDefaultModel('');
    setFormIsDefault(false);
    setFormTemperature(0.7);
    setFormMaxTokens(4096);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Providers</h2>
          <p className="text-muted-foreground">
            Manage LLM providers (Ollama, OpenAI-compatible)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={fetchData} variant="outline" disabled={loading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={() => setShowAddForm(!showAddForm)} disabled={loading}>
            <Plus className="mr-2 h-4 w-4" />
            Add Provider
          </Button>
        </div>
      </div>

      {/* Error/Success Alerts */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {successMessage && (
        <Alert variant="success">
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}

      {/* Add Provider Form */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>Add New Provider</CardTitle>
            <CardDescription>
              Configure a new LLM provider for the MCP server
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Provider Name *</label>
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g., my-ollama, my-openai"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Type *</label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value as 'ollama' | 'openai')}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="ollama">Ollama</option>
                  <option value="openai">OpenAI-compatible</option>
                </select>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <label className="text-sm font-medium">Base URL *</label>
                <Input
                  type="text"
                  value={formBaseUrl}
                  onChange={(e) => setFormBaseUrl(e.target.value)}
                  placeholder={`e.g., http://localhost:11434 (Ollama) or https://api.openai.com (OpenAI)`}
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <label className="text-sm font-medium">
                  API Key <span className="text-muted-foreground">(optional, required for OpenAI)</span>
                </label>
                <Input
                  type="text"
                  value={formApiKey}
                  onChange={(e) => setFormApiKey(e.target.value)}
                  placeholder="sk-..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Default Model *</label>
                <Input
                  value={formDefaultModel}
                  onChange={(e) => setFormDefaultModel(e.target.value)}
                  placeholder="e.g., llama3.1, gpt-4"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Temperature</label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="2"
                  value={formTemperature}
                  onChange={(e) => setFormTemperature(parseFloat(e.target.value) || 0.7)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Max Tokens</label>
                <Input
                  type="number"
                  value={formMaxTokens}
                  onChange={(e) => setFormMaxTokens(parseInt(e.target.value) || 4096)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Set as Default</label>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formIsDefault}
                    onChange={(e) => setFormIsDefault(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="text-sm">Use as default provider</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button onClick={handleAddProvider} disabled={loading}>
                {loading ? 'Adding...' : 'Add Provider'}
              </Button>
              <Button variant="outline" onClick={clearForm}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Providers List */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                Active Providers
                <Badge variant="secondary" className="ml-auto">
                  {providers.length} total
                </Badge>
              </CardTitle>
              <CardDescription>
                Providers currently registered and available
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-24 bg-muted rounded animate-pulse" />
                  ))}
                </div>
              ) : providers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Server className="mx-auto h-12 w-12 opacity-20 mb-4" />
                  <p>No providers configured</p>
                  <p className="text-sm mt-2">Click "Add Provider" to get started</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {providers.map((provider) => {
                    const isDefault = defaultProvider === provider.name;
                    const isSelected = selectedProvider?.name === provider.name;

                    return (
                      <div
                        key={provider.name}
                        className={`rounded-lg border p-4 transition-colors cursor-pointer ${
                          isSelected ? 'border-primary bg-accent/50' : 'hover:bg-accent/30'
                        }`}
                        onClick={() => {
                          setSelectedProvider(provider);
                          fetchModels(provider.name);
                        }}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium truncate">{provider.name}</h3>
                              <Badge variant={provider.type === 'ollama' ? 'info' : 'default'}>
                                {provider.type}
                              </Badge>
                              {isDefault && (
                                <Badge variant="success">
                                  <Sparkles className="h-3 w-3 mr-1" />
                                  Default
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              <Code className="h-3 w-3 inline mr-1" />
                              {provider.defaultModel}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              <Key className="h-3 w-3 inline mr-1" />
                              {provider.baseUrl}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 ml-4">
                            {!isDefault && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSetDefaultProvider(provider.name);
                                }}
                                title="Set as default"
                              >
                                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleTestConnection(provider.name);
                              }}
                              title="Test connection"
                              disabled={testingConnection === provider.name}
                            >
                              {testingConnection === provider.name ? (
                                <RefreshCw className="h-4 w-4 text-muted-foreground animate-spin" />
                              ) : (
                                <Wifi className="h-4 w-4 text-muted-foreground" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveProvider(provider.name);
                              }}
                              title="Remove provider"
                            >
                              <Trash2 className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </div>
                        </div>

                        <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                            {provider.apiKey && (
                              <span className="flex items-center gap-1">
                                <Key className="h-3 w-3" />
                                API Key configured
                              </span>
                            )}
                            {provider.temperature !== undefined && (
                              <span>Temp: {provider.temperature}</span>
                            )}
                            {provider.maxTokens !== undefined && (
                              <span>Tokens: {provider.maxTokens}</span>
                            )}
                          </div>
                          {/* Test Connection Result */}
                          {testResults[provider.name] && (
                            <div className="mt-2">
                              {testResults[provider.name].status === 'ok' ? (
                                <span className="inline-flex items-center gap-1 text-xs text-green-600">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Connected ({testResults[provider.name].latencyMs}ms)
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-xs text-red-600" title={testResults[provider.name].message || testResults[provider.name].error}>
                                  <AlertCircle className="h-3 w-3" />
                                  Connection failed
                                </span>
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

          {/* Configured Providers */}
          {configuredProviders.length > 0 && providers.length !== configuredProviders.length && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Configured Providers (Database)
                </CardTitle>
                <CardDescription>
                  Providers saved in database but not currently active
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {configuredProviders
                    .filter((p) => !providers.some((a) => a.name === p.name))
                    .map((provider) => (
                      <div
                        key={provider.id}
                        className="rounded-lg border border-dashed border-muted p-4 opacity-60"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-medium">{provider.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {provider.type} • {provider.defaultModel}
                            </p>
                          </div>
                          <Badge variant="outline">Inactive</Badge>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Provider Details Panel */}
        <div className="lg:col-span-1">
          <Card className="h-fit">
            <CardHeader>
              <CardTitle>Provider Details</CardTitle>
              <CardDescription>
                View provider information and models
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {selectedProvider ? (
                <>
                  {/* Provider Info */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Server className="h-5 w-5 text-primary" />
                      <h3 className="font-medium text-lg">{selectedProvider.name}</h3>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Type:</span>
                        <Badge variant="outline">{selectedProvider.type}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Default Model:</span>
                        <span className="font-mono">{selectedProvider.defaultModel}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Base URL:</span>
                        <span className="font-mono text-xs truncate max-w-[200px]">
                          {selectedProvider.baseUrl}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Has API Key:</span>
                        {selectedProvider.apiKey ? (
                          <Badge variant="success">Yes</Badge>
                        ) : (
                          <Badge variant="outline">No</Badge>
                        )}
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Temperature:</span>
                        <span>{selectedProvider.temperature || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Max Tokens:</span>
                        <span>{selectedProvider.maxTokens || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Is Default:</span>
                        {defaultProvider === selectedProvider.name ? (
                          <Badge variant="success">Yes</Badge>
                        ) : (
                          <Badge variant="outline">No</Badge>
                        )}
                      </div>
                    </div>

                    <div className="pt-3 border-t">
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => handleSetDefaultProvider(selectedProvider.name)}
                        disabled={defaultProvider === selectedProvider.name}
                      >
                        {defaultProvider === selectedProvider.name ? (
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                        ) : (
                          <Sparkles className="mr-2 h-4 w-4" />
                        )}
                        {defaultProvider === selectedProvider.name ? 'Current Default' : 'Set as Default'}
                      </Button>
                    </div>
                  </div>

                  {/* Models List */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">Available Models</h3>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchModels(selectedProvider.name)}
                        disabled={loadingModels}
                      >
                        <RefreshCw className={`h-3 w-3 ${loadingModels ? 'animate-spin' : ''}`} />
                      </Button>
                    </div>

                    {loadingModels ? (
                      <div className="space-y-2">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="h-8 bg-muted rounded animate-pulse" />
                        ))}
                      </div>
                    ) : models.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No models found. Click refresh to load models from provider.
                      </p>
                    ) : (
                      <div className="space-y-1 max-h-48 overflow-y-auto">
                        {models.map((model) => (
                          <div
                            key={model.id}
                            className="flex items-center justify-between rounded-md bg-muted/30 px-3 py-2 text-sm"
                          >
                            <span className="font-mono">{model.id}</span>
                            {model.name && model.name !== model.id && (
                              <span className="text-muted-foreground truncate max-w-[100px]">
                                {model.name}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Server className="mx-auto h-12 w-12 opacity-20 mb-4" />
                  <p className="text-sm">
                    Select a provider from the list to view details
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Tips */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-base">Quick Tips</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="space-y-1">
                <p className="font-medium text-muted-foreground">Ollama</p>
                <p className="text-xs">
                  Default URL: <code className="bg-muted px-1 py-0.5 rounded">http://localhost:11434</code>
                </p>
              </div>
              <div className="space-y-1">
                <p className="font-medium text-muted-foreground">OpenAI</p>
                <p className="text-xs">
                  Default URL: <code className="bg-muted px-1 py-0.5 rounded">https://api.openai.com</code>
                </p>
                <p className="text-xs">
                  API Key is required for OpenAI-compatible providers
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminProviders;
