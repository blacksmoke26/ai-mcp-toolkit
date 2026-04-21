/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

/**
 * @module pages/CustomTools
 * @description Custom Tools Management page for creating, editing, testing, and deleting custom MCP tools.
 *
 * Features:
 * - List all custom tools with filtering and search
 * - Create new custom tools with code editor
 * - Edit existing custom tools
 * - Test custom tools with argument input
 * - Enable/Disable tools dynamically
 * - Delete custom tools
 * - Load example templates
 * - Interactive documentation via tooltips, popovers, and modals
 */

import React, {useCallback, useEffect, useState} from 'react';
import {
  AlertCircle,
  BookOpen,
  Check,
  Code,
  Copy,
  Download,
  Edit,
  FileCode,
  HelpCircle,
  Info,
  Loader2,
  Play,
  Plus,
  Search,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Zap,
} from 'lucide-react';
import type {
  CreateCustomToolRequest,
  CustomToolDetailResponse,
  CustomToolSummary,
  CustomToolTemplate,
  TestCustomToolResponse,
  UpdateCustomToolRequest,
} from '@/lib/api.js';
import {
  createCustomTool,
  deleteCustomTool,
  getCustomTool,
  getCustomToolTemplates,
  listCustomTools,
  testCustomTool,
  toggleCustomTool,
  updateCustomTool,
} from '@/lib/api.js';
import * as Select from '@radix-ui/react-select';
import {Button} from '@/components/ui/Button';
import {Input} from '@/components/ui/Input';
import {Textarea} from '@/components/ui/Textarea';
import {Badge} from '@/components/ui/Badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import {Alert, AlertDescription, AlertTitle} from '@/components/ui/Alert';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/Card';
import {Label} from '@/components/ui/Label';
import Separator from '@/components/ui/Separator';
import CodeEditor from '@/components/ui/CodeEditor';
import {Popover} from '@/components/ui/Popover';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/Tooltip';
import * as Tabs from '@radix-ui/react-tabs';

interface CreateEditDialogProps {
  /** Controls the visibility of the dialog. */
  open: boolean;

  /** Indicates whether the dialog is in edit mode. */
  isEditing: boolean;

  /** The tool data to edit, if editing an existing tool. */
  tool?: CustomToolDetailResponse | null;

  /** The template data to pre-fill the form, if creating from a template. */
  templateData?: CustomToolTemplate | null;

  /** Callback function invoked when the dialog's open state changes. */
  onOpenChange(open: boolean): void;

  /** Callback function invoked when the save button is clicked. */
  onSave(data: CreateCustomToolRequest | UpdateCustomToolRequest): Promise<void>;
}

interface TestDialogProps {
  /** Controls the visibility of the dialog. */
  open: boolean;

  /** The tool summary to be tested. */
  tool: CustomToolSummary | null;

  /** Callback function invoked when the dialog's open state changes. */
  onOpenChange(open: boolean): void;

  /** Callback function invoked to execute the tool test with provided arguments. */
  onTest(args: Record<string, unknown>): Promise<TestCustomToolResponse>;
}

interface TemplateDialogProps {
  /** Controls the visibility of the dialog. */
  open: boolean;

  /** List of available templates to display. */
  templates: CustomToolTemplate[];

  /** The currently selected template data. */
  templateData: CustomToolTemplate | null;

  /** Callback function invoked when the dialog's open state changes. */
  onOpenChange(open: boolean): void;

  /** Callback function to update the selected template data state. */
  setTemplateData(template: CustomToolTemplate | null): void;

  /** Callback function invoked when a template is selected for use. */
  onSelectTemplate(template: CustomToolTemplate): void;
}

interface InfoDialogProps {
  /** Controls the visibility of the dialog. */
  open: boolean;

  /** Callback function invoked when the dialog's open state changes. */
  onOpenChange(open: boolean): void;
}

/**
 * Info Dialog component displaying comprehensive documentation about Custom Tools.
 * Includes overview, architecture, API endpoints, templates, security considerations, and troubleshooting.
 */

/**
 * Dialog component for creating or editing a custom tool.
 *
 * @example
 * // Example usage for creating a new tool:
 * <CreateEditDialog
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 *   isEditing={false}
 *   onSave={async (data) => {
 *     await createCustomTool(data);
 *   }}
 * />
 *
 * @example
 * // Example usage for editing an existing tool:
 * <CreateEditDialog
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 *   isEditing={true}
 *   tool={currentTool}
 *   onSave={async (data) => {
 *     await updateCustomTool(currentTool.id, data);
 *   }}
 * />
 */
const CreateEditDialog: React.FC<CreateEditDialogProps> = ({open, onOpenChange, tool, templateData, onSave, isEditing}) => {
  // Documentation content for popovers
  const inputSchemaHelp = `
Input Schema defines the parameters your tool accepts. It follows JSON Schema format:

{
  "type": "object",
  "properties": {
    "paramName": {
      "type": "string|number|boolean|array|object",
      "description": "Parameter description"
    }
  },
  "required": ["requiredParam"]
}

Supported types: string, number, boolean, array, object
  `.trim();

  const handlerCodeHelp = `
Handler Code is JavaScript that executes when your tool is called.

Available: 
  - args: Input parameters from the schema
  - safeContext: Access to safe globals (Math, Date, JSON, fetch, etc.)

Must return:
  {
    content: [{ type: 'text', text: 'result' }],
    isError: false
  }

Example:
  const result = args.a + args.b;
  return { content: [{ type: 'text', text: String(result) }] };
  `.trim();
  const [name, setName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [description, setDescription] = useState('');
  const [inputSchema, setInputSchema] = useState('{\n  "type": "object",\n  "properties": {},\n  "required": []\n}');
  const [handlerCode, setHandlerCode] = useState('return {\n  content: [{ type: \'text\', text: \'Hello World\' }]\n};');
  const [category, setCategory] = useState('custom');
  const [icon, setIcon] = useState('🔧');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (tool) {
      setName(tool.name);
      setDisplayName(tool.displayName);
      setDescription(tool.description);
      setInputSchema(tool.inputSchema);
      setHandlerCode(tool.handlerCode);
      setCategory(tool.category || 'custom');
      setIcon(tool.icon || '🔧');
    } else if (templateData) {
      setName(templateData.code.name);
      setDisplayName(templateData.code.displayName);
      setDescription(templateData.code.description);
      setInputSchema(templateData.code.inputSchema);
      setHandlerCode(templateData.code.handlerCode);
      setCategory(templateData.code.category);
      setIcon(templateData.code.icon);
    } else {
      resetForm();
    }
  }, [tool, templateData, open]);

  const resetForm = () => {
    setName('');
    setDisplayName('');
    setDescription('');
    setInputSchema('{\n  "type": "object",\n  "properties": {},\n  "required": []\n}');
    setHandlerCode('return {\n  content: [{ type: \'text\', text: \'Hello World\' }]\n};');
    setCategory('custom');
    setIcon('🔧');
    setError('');
  };

  const validateToolName = (name: string): boolean => {
    const nameRegex = /^[a-zA-Z][a-zA-Z0-9_]*$/;
    return nameRegex.test(name);
  };

  const validateJSON = (jsonString: string): boolean => {
    try {
      JSON.parse(jsonString);
      return true;
    } catch {
      return false;
    }
  };

  const handleSubmit = async () => {
    setError('');

    if (!name || !displayName || !description) {
      setError('Please fill in all required fields');
      return;
    }

    if (!validateToolName(name)) {
      setError('Tool name must start with a letter and contain only letters, numbers, and underscores');
      return;
    }

    if (!validateJSON(inputSchema)) {
      setError('Invalid JSON schema');
      return;
    }

    setLoading(true);
    try {
      const data: CreateCustomToolRequest | UpdateCustomToolRequest = {
        name,
        displayName,
        description,
        inputSchema,
        handlerCode,
        category,
        icon,
      };

      await onSave(data);
      onOpenChange(false);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save tool');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Custom Tool' : 'Create Custom Tool'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the tool configuration and code.'
              : 'Create a new custom MCP tool with your own logic.'}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4"/>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="name">Tool Name *</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" onClick={(e) => e.preventDefault()}/>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Tool name must start with a letter and contain only letters, numbers, and underscores (e.g., my_custom_tool).</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="my_custom_tool"
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Must start with letter, only letters/numbers/underscores
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="displayName">Display Name *</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" onClick={(e) => e.preventDefault()}/>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Human-readable name displayed in the UI (e.g., My Custom Tool).</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="My Custom Tool"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="description">Description *</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" onClick={(e) => e.preventDefault()}/>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Detailed description of what your tool does. This appears in tool listings.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this tool do?"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select.Root value={category?.toString?.() ?? ''} onValueChange={setCategory}>
                <Select.Trigger/>
                <Select.Content>
                  <Select.Item value="custom">Custom</Select.Item>
                  <Select.Item value="utility">Utility</Select.Item>
                  <Select.Item value="api">API</Select.Item>
                  <Select.Item value="data">Data</Select.Item>
                  <Select.Item value="transformation">Transformation</Select.Item>
                </Select.Content>
              </Select.Root>
            </div>

            <div className="space-y-2">
              <Label htmlFor="icon">Icon (Emoji)</Label>
              <Input
                id="icon"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                placeholder="🔧"
                maxLength={4}
              />
            </div>
          </div>

          <Separator/>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="inputSchema">Input Schema (JSON) *</Label>
              <Popover
                title="Input Schema Guide"
                description="JSON Schema format for defining tool parameters"
                contentClassName="max-w-md"
                maxHeight="400px"
                triggerIcon={HelpCircle}
                triggerVariant="outline"
              >
                <pre className="text-xs font-mono whitespace-pre-wrap">{inputSchemaHelp}</pre>
              </Popover>
            </div>
            <CodeEditor
              editorProps={{id: 'inputSchema'}}
              language="json"
              value={inputSchema}
              onChange={setInputSchema}
            />
            <p className="text-xs text-muted-foreground">
              JSON Schema defining the tool's input parameters
            </p>
          </div>

          <Separator/>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="handlerCode">Handler Code (JavaScript) *</Label>
              <Popover
                title="Handler Code Guide"
                description="JavaScript code that executes when your tool is called"
                contentClassName="max-w-md"
                maxHeight="400px"
                triggerIcon={HelpCircle}
                triggerVariant="outline"
              >
                <pre className="text-xs font-mono whitespace-pre-wrap">{handlerCodeHelp}</pre>
              </Popover>
            </div>
            <CodeEditor
              editorProps={{id: 'handlerCode'}}
              language="javascript"
              value={handlerCode}
              onChange={setHandlerCode}
            />
            <p className="text-xs text-muted-foreground">
              JavaScript function body that receives <code>args</code> and <code>safeContext</code> parameters.
              Must return <code>{`{ content: [{ type: 'text', text: '...' }] }`}</code>
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
            {isEditing ? 'Update Tool' : 'Create Tool'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/**
 * Info Dialog component displaying comprehensive documentation about Custom Tools.
 */
const InfoDialog: React.FC<InfoDialogProps> = ({open, onOpenChange}) => {
  const [activeTab, setActiveTab] = useState('overview');

  const documentation = {
    overview: {
      title: 'Overview',
      icon: BookOpen,
      content: (
        <div className="space-y-4">
          <p>
            The Custom Tools feature allows you to create your own MCP (Model Context Protocol) tools
            using JavaScript. These tools can be used to extend the capabilities of your AI assistant
            with custom logic, data processing, and integrations.
          </p>
          <Alert>
            <Info className="h-4 w-4"/>
            <AlertTitle>What are Custom Tools?</AlertTitle>
            <AlertDescription>
              Custom tools are JavaScript functions that can be called by the MCP protocol. They receive
              input arguments, execute your custom logic, and return results to the AI assistant.
            </AlertDescription>
          </Alert>
          <div className="space-y-2">
            <h4 className="font-semibold">Key Features:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Create tools with custom input schemas (JSON Schema)</li>
              <li>Write JavaScript handler code</li>
              <li>Test tools before deploying</li>
              <li>Enable/Disable tools dynamically</li>
              <li>Organize tools by category</li>
              <li>Use pre-built templates to get started</li>
            </ul>
          </div>
        </div>
      ),
    },
    architecture: {
      title: 'Architecture',
      icon: Code,
      content: (
        <div className="space-y-4">
          <p>
            Custom Tools are registered with the MCP server and made available to AI assistants
            through the standard MCP protocol. The architecture consists of several components:
          </p>
          <div className="space-y-3">
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm">1. Frontend UI</CardTitle>
              </CardHeader>
              <CardContent className="py-2">
                <p className="text-xs text-muted-foreground">
                  Web interface for creating, editing, testing, and managing custom tools. Built with React
                  and includes code editors, form validation, and real-time testing.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm">2. Backend API</CardTitle>
              </CardHeader>
              <CardContent className="py-2">
                <p className="text-xs text-muted-foreground">
                  RESTful API endpoints for CRUD operations on tools. Handles tool compilation, testing,
                  and registration with the MCP server.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm">3. Tool Engine</CardTitle>
              </CardHeader>
              <CardContent className="py-2">
                <p className="text-xs text-muted-foreground">
                  Secure JavaScript execution environment (vm2) that runs tool handler code with access
                  to a safe context containing only approved globals.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm">4. MCP Server</CardTitle>
              </CardHeader>
              <CardContent className="py-2">
                <p className="text-xs text-muted-foreground">
                  Registers custom tools with the MCP protocol, making them available to AI assistants
                  for discovery and invocation.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      ),
    },
    'api-endpoints': {
      title: 'API Endpoints',
      icon: Zap,
      content: (
        <div className="space-y-4">
          <p>The following API endpoints are available for managing custom tools:</p>
          <div className="space-y-3">
            <Card>
              <CardHeader className="py-2">
                <CardTitle className="text-xs flex items-center gap-2">
                  <span className="text-green-500">GET</span>
                  /api/custom-tools
                </CardTitle>
              </CardHeader>
              <CardContent className="py-2">
                <p className="text-xs text-muted-foreground">
                  List all custom tools with optional filtering by enabled status, category, and search query.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="py-2">
                <CardTitle className="text-xs flex items-center gap-2">
                  <span className="text-green-500">GET</span>
                  /api/custom-tools/{'{id}'}
                </CardTitle>
              </CardHeader>
              <CardContent className="py-2">
                <p className="text-xs text-muted-foreground">
                  Get detailed information about a specific tool, including input schema and handler code.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="py-2">
                <CardTitle className="text-xs flex items-center gap-2">
                  <span className="text-blue-500">POST</span>
                  /api/custom-tools
                </CardTitle>
              </CardHeader>
              <CardContent className="py-2">
                <p className="text-xs text-muted-foreground">
                  Create a new custom tool.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="py-2">
                <CardTitle className="text-xs flex items-center gap-2">
                  <span className="text-yellow-500">PUT</span>
                  /api/custom-tools/{'{id}'}
                </CardTitle>
              </CardHeader>
              <CardContent className="py-2">
                <p className="text-xs text-muted-foreground">
                  Update an existing custom tool.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="py-2">
                <CardTitle className="text-xs flex items-center gap-2">
                  <span className="text-red-500">DELETE</span>
                  /api/custom-tools/{'{id}'}
                </CardTitle>
              </CardHeader>
              <CardContent className="py-2">
                <p className="text-xs text-muted-foreground">
                  Delete a custom tool.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="py-2">
                <CardTitle className="text-xs flex items-center gap-2">
                  <span className="text-purple-500">POST</span>
                  /api/custom-tools/{'{id}'}
                  /test
                </CardTitle>
              </CardHeader>
              <CardContent className="py-2">
                <p className="text-xs text-muted-foreground">
                  Test a custom tool with provided input arguments.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="py-2">
                <CardTitle className="text-xs flex items-center gap-2">
                  <span className="text-orange-500">PATCH</span>
                  /api/custom-tools/{'{id}'}
                  /toggle
                </CardTitle>
              </CardHeader>
              <CardContent className="py-2">
                <p className="text-xs text-muted-foreground">
                  Toggle a custom tool's enabled status.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="py-2">
                <CardTitle className="text-xs flex items-center gap-2">
                  <span className="text-green-500">GET</span>
                  /api/custom-tools/templates
                </CardTitle>
              </CardHeader>
              <CardContent className="py-2">
                <p className="text-xs text-muted-foreground">
                  Get available tool templates for quick creation.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      ),
    },
    templates: {
      title: 'Templates',
      icon: FileCode,
      content: (
        <div className="space-y-4">
          <p>
            Choose from 40+ pre-built templates across different categories to get started quickly.
            Templates provide a foundation you can customize for your specific needs.
          </p>
          <div className="space-y-2">
            <h4 className="font-semibold">Available Categories:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li><strong>Math & Numbers:</strong> Calculator, Random Generator, Percentage, Fibonacci, Prime Checker</li>
              <li><strong>Text & String:</strong> Transformer, Word Counter, Palindrome Checker, Base64, Regex Matcher</li>
              <li><strong>Data & Parsing:</strong> JSON Formatter, CSV Parser, URL Parser</li>
              <li><strong>Date & Time:</strong> Current Time, Date Difference, Age Calculator</li>
              <li><strong>Array & List:</strong> Reverser, Shuffler, Sorter</li>
              <li><strong>Conversion:</strong> Temperature, Length, Weight, Currency Formatter</li>
              <li><strong>Utility:</strong> UUID Generator, Email Validator, Color Converter, City Lookup</li>
            </ul>
          </div>
          <Alert>
            <BookOpen className="h-4 w-4"/>
            <AlertDescription>
              Click the Templates button to browse and use any template. Templates auto-fill the create form.
            </AlertDescription>
          </Alert>
        </div>
      ),
    },
    'handler-code': {
      title: 'Handler Code',
      icon: Code,
      content: (
        <div className="space-y-4">
          <p>
            The handler code is JavaScript that executes when your tool is called. It receives
            input arguments and a safe context, and must return a properly formatted result.
          </p>
          <Alert>
            <Info className="h-4 w-4"/>
            <AlertTitle>Function Signature</AlertTitle>
            <AlertDescription>
              Your handler receives <code>args</code> (input parameters) and can access globals via <code>safeContext</code>.
            </AlertDescription>
          </Alert>
          <h4 className="font-semibold">Example Handler:</h4>
          <pre className="bg-muted p-4 rounded-md text-xs overflow-x-auto">
{`// Simple greeting tool
const name = args.name || 'World';
return {
  content: [{
    type: 'text',
    text: \`Hello, \${name}!\`
  }]
};`}
          </pre>
          <h4 className="font-semibold">Return Format:</h4>
          <pre className="bg-muted p-4 rounded-md text-xs overflow-x-auto">
{`{
  content: [
    { type: 'text', text: 'Plain text result' },
    { type: 'resource', resource: { uri: '...', text: '...' } }
  ],
  isError: false
}`}
          </pre>
          <h4 className="font-semibold">Available in safeContext:</h4>
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
            <li><code>Math</code> - Mathematical functions</li>
            <li><code>Date</code> - Date and time operations</li>
            <li><code>JSON</code> - JSON parsing/stringifying</li>
            <li><code>RegExp</code> - Regular expressions</li>
            <li><code>Array</code>, <code>String</code> - Built-in types</li>
            <li><code>fetch</code> - HTTP requests (limited)</li>
          </ul>
        </div>
      ),
    },
    security: {
      title: 'Security',
      icon: AlertCircle,
      content: (
        <div className="space-y-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4"/>
            <AlertTitle>Important Security Notes</AlertTitle>
            <AlertDescription>
              Custom tool code runs in a sandboxed environment, but you should still follow security best practices.
            </AlertDescription>
          </Alert>
          <div className="space-y-3">
            <Card>
              <CardHeader className="py-2">
                <CardTitle className="text-sm">🔒 Sandboxed Execution</CardTitle>
              </CardHeader>
              <CardContent className="py-2">
                <p className="text-xs text-muted-foreground">
                  Tools run in a restricted VM2 environment with no direct access to the filesystem,
                  environment variables, or dangerous APIs.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="py-2">
                <CardTitle className="text-sm">🚫 Restricted Globals</CardTitle>
              </CardHeader>
              <CardContent className="py-2">
                <p className="text-xs text-muted-foreground">
                  Only approved globals are available through <code>safeContext</code>. Functions like <code>require()</code>,
                  <code>process</code>, <code>eval()</code>, and <code>setTimeout()</code> are blocked.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="py-2">
                <CardTitle className="text-sm">⚠️ Never Trust Input</CardTitle>
              </CardHeader>
              <CardContent className="py-2">
                <p className="text-xs text-muted-foreground">
                  Always validate and sanitize input arguments. Use secure patterns for HTTP requests
                  and avoid executing user-provided code.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="py-2">
                <CardTitle className="text-sm">🔑 Protect Sensitive Data</CardTitle>
              </CardHeader>
              <CardContent className="py-2">
                <p className="text-xs text-muted-foreground">
                  Do not hardcode API keys or secrets in handler code. Use environment variables or
                  secure configuration management for sensitive values.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      ),
    },
    troubleshooting: {
      title: 'Troubleshooting',
      icon: AlertCircle,
      content: (
        <div className="space-y-4">
          <div className="space-y-3">
            <Card>
              <CardHeader className="py-2">
                <CardTitle className="text-sm">Tool Not Appearing in List</CardTitle>
              </CardHeader>
              <CardContent className="py-2">
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>Check if the tool is enabled (use toggle button)</li>
                  <li>Clear any active search or category filters</li>
                  <li>Refresh the page to reload from the database</li>
                  <li>Check browser console for API errors</li>
                </ul>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="py-2">
                <CardTitle className="text-sm">Tool Execution Errors</CardTitle>
              </CardHeader>
              <CardContent className="py-2">
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>Verify input arguments match the schema</li>
                  <li>Check handler code for syntax errors</li>
                  <li>Ensure all variables are properly declared</li>
                  <li>Use the Test feature to debug before deployment</li>
                </ul>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="py-2">
                <CardTitle className="text-sm">Compilation Errors</CardTitle>
              </CardHeader>
              <CardContent className="py-2">
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>Wrap your code in a function body format</li>
                  <li>Don't use top-level <code>import</code> statements</li>
                  <li>Avoid async/await at top level; use regular functions</li>
                  <li>Check for ES2015+ features not supported in the VM</li>
                </ul>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="py-2">
                <CardTitle className="text-sm">Tool in Inconsistent State</CardTitle>
              </CardHeader>
              <CardContent className="py-2">
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>Try editing and saving the tool</li>
                  <li>Check database records for corrupted data</li>
                  <li>Restart the MCP server if needed</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      ),
    },
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5"/>
            Custom Tools Documentation
          </DialogTitle>
          <DialogDescription>
            Comprehensive guide for creating, managing, and troubleshooting custom MCP tools.
          </DialogDescription>
        </DialogHeader>

        <Tabs.Root value={activeTab} onValueChange={setActiveTab} className="w-full">
          <Tabs.List className="grid w-full grid-cols-3 md:grid-cols-6 gap-1 bg-muted p-1 rounded-lg">
            {Object.entries(documentation).map(([key, {title, icon: Icon}]) => (
              <Tabs.Trigger
                key={key}
                value={key}
                className="flex items-center justify-center gap-1 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md py-2 text-sm font-medium transition-all"
              >
                <Icon className="h-3.5 w-3.5"/>
                <span className="hidden sm:inline">{title}</span>
              </Tabs.Trigger>
            ))}
          </Tabs.List>

          <div className="mt-4">
            {Object.entries(documentation).map(([key, {title, content}]) => (
              <Tabs.Content key={key} value={key} className="space-y-4">
                <Separator/>
                <div className="prose prose-sm max-w-none">
                  {content}
                </div>
              </Tabs.Content>
            ))}
          </div>
        </Tabs.Root>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/**
 * Dialog component for testing a custom tool with specific arguments.
 *
 * @example
 * // Example usage:
 * <TestDialog
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 *   tool={selectedTool}
 *   onTest={async (args) => {
 *     return await testCustomTool(selectedTool.id, args);
 *   }}
 * />
 */
const TestDialog: React.FC<TestDialogProps> = ({open, onOpenChange, tool, onTest}) => {
  const [args, setArgs] = useState('');
  const [result, setResult] = useState<TestCustomToolResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open && tool) {
      setArgs('{}');
      setResult(null);
    }
  }, [open, tool]);

  const handleTest = async () => {
    if (!tool) return;

    setLoading(true);
    try {
      const parsedArgs = JSON.parse(args);
      const testResult = await onTest(parsedArgs);
      setResult(testResult);
    } catch (err) {
      setResult({
        success: false,
        result: {
          content: [{type: 'text', text: `Error: ${err instanceof Error ? err.message : String(err)}`}],
          isError: true,
        },
      });
    } finally {
      setLoading(false);
    }
  };

  const copyResult = () => {
    if (result) {
      navigator.clipboard.writeText(JSON.stringify(result, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatText = (text: string) => {
    const lines = text.split('\n');
    return (
      <div className="whitespace-pre-wrap">
        {lines.map((line, i) => (
          <div key={i} className="break-all">{line}</div>
        ))}
      </div>
    );
  };

  if (!tool) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Play className="h-5 w-5"/>
            Test: {tool.displayName}
          </DialogTitle>
          <DialogDescription>
            Test the tool by providing input arguments.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="testArgs">Input Arguments (JSON)</Label>
            <CodeEditor
              editorProps={{id: 'testArgs'}}
              language="json"
              value={args}
              onChange={setArgs}
            />
          </div>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button onClick={handleTest} disabled={loading} className="w-full">
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                  <Play className="mr-2 h-4 w-4"/>
                  Run Test
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Execute the tool with the provided JSON arguments</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {result && (
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span>
                    {result.success ? (
                      <Badge className="bg-green-500 hover:bg-green-600">Success</Badge>
                    ) : (
                      <Badge variant="destructive">Error</Badge>
                    )}
                  </span>
                  <Button variant="ghost" size="sm" onClick={copyResult} className="h-6">
                    {copied ? <Check className="h-3 w-3 mr-1"/> : <Copy className="h-3 w-3 mr-1"/>}
                    {copied ? 'Copied' : 'Copy'}
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="py-2">
                <div className="max-h-[300px] overflow-y-auto">
                  <pre className="text-xs font-mono bg-muted p-3 rounded">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

/**
 * Dialog component for selecting a tool template to create a new tool.
 *
 * @example
 * // Example usage:
 * <TemplateDialog
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 *   templates={availableTemplates}
 *   templateData={currentTemplateData}
 *   setTemplateData={setCurrentTemplateData}
 *   onSelectTemplate={(template) => {
 *     // Open create dialog with template data
 *   }}
 * />
 */
const TemplateDialog: React.FC<TemplateDialogProps> = ({open, onOpenChange, templates, onSelectTemplate, templateData, setTemplateData}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<CustomToolTemplate | null>(null);

  const handleSelect = (template: CustomToolTemplate) => {
    setSelectedTemplate(template);
    setTemplateData(template);
  };

  const handleUseTemplate = () => {
    if (selectedTemplate) {
      onSelectTemplate(selectedTemplate);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tool Templates</DialogTitle>
          <DialogDescription>
            Choose from example templates to get started quickly.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.map((template) => (
              <Card
                key={template.name}
                className={`cursor-pointer transition-all ${
                  selectedTemplate?.name === template.name
                    ? 'border-primary ring-2 ring-primary'
                    : 'hover:border-primary/50'
                }`}
                onClick={() => handleSelect(template)}
              >
                <CardHeader className="py-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <span className="text-xl">{template.code.icon}</span>
                    {template.code.displayName}
                  </CardTitle>
                  <CardDescription className="text-xs">{template.description}</CardDescription>
                </CardHeader>
                <CardContent className="py-2">
                  <Badge variant="secondary" className="text-xs">{template.code.category}</Badge>
                </CardContent>
              </Card>
            ))}
          </div>

          {selectedTemplate && (
            <Alert>
              <AlertTitle className="text-sm">Preview: {selectedTemplate.code.displayName}</AlertTitle>
              <AlertDescription className="text-xs">
                {selectedTemplate.code.description}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleUseTemplate} disabled={!selectedTemplate}>
            <Copy className="mr-2 h-4 w-4"/>
            Use Template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/**
 * Main page component for managing custom tools.
 *
 * Features:
 * - Lists all custom tools with filtering and search capabilities.
 * - Provides statistics (total, enabled, disabled).
 * - Handles creation, editing, testing, enabling/disabling, and deletion of tools.
 * - Manages template selection for new tools.
 *
 * @example
 * // Render the page:
 * <CustomTools />
 */
const CustomTools: React.FC = () => {
  // State
  const [tools, setTools] = useState<CustomToolSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Info dialog state
  const [infoDialogOpen, setInfoDialogOpen] = useState(false);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showDisabled, setShowDisabled] = useState(true);

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [templates, setTemplates] = useState<CustomToolTemplate[]>([]);
  const [templateData, setTemplateData] = useState<CustomToolTemplate | null>(null);

  // Selected items
  const [selectedTool, setSelectedTool] = useState<CustomToolSummary | null>(null);
  const [editToolDetail, setEditToolDetail] = useState<CustomToolDetailResponse | null>(null);
  const [deletingTool, setDeletingTool] = useState<number | null>(null);

  // Fetch tools
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await listCustomTools({
        enabled: !showDisabled ? true : undefined,
        category: selectedCategory === 'all' ? undefined : selectedCategory,
        search: searchQuery || undefined,
      });
      setTools(response.tools);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tools');
    } finally {
      setLoading(false);
    }
  }, [showDisabled, selectedCategory, searchQuery]);

  // Fetch templates
  const fetchTemplates = useCallback(async () => {
    try {
      const response = await getCustomToolTemplates();
      setTemplates(response.templates);
    } catch (err) {
      console.error('Failed to load templates:', err);
    }
  }, []);

  useEffect(() => {
    fetchData();
    fetchTemplates();
  }, [fetchData, fetchTemplates]);

  // Get unique categories
  const categories = ['all', ...Array.from(new Set(tools.map((t) => t.category || 'custom')))];

  // Filtered tools
  const filteredTools = tools.filter((tool) => {
    const matchesSearch =
      !searchQuery ||
      tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || tool.category === selectedCategory;
    const matchesDisabled = showDisabled || tool.enabled;
    return matchesSearch && matchesCategory && matchesDisabled;
  });

  // Handlers
  const handleCreate = () => {
    setSelectedTool(null);
    setCreateDialogOpen(true);
  };

  const handleEdit = async (tool: CustomToolSummary) => {
    setSelectedTool(tool);
    try {
      const detail = await getCustomTool(tool.id);
      setEditToolDetail(detail);
      setEditDialogOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tool details');
    }
  };

  const handleTest = (tool: CustomToolSummary) => {
    setSelectedTool(tool);
    setTestDialogOpen(true);
  };

  const handleToggle = async (tool: CustomToolSummary) => {
    try {
      const newEnabled = !tool.enabled;
      const response = await toggleCustomTool(tool.id, newEnabled);

      setTools((prev) =>
        prev.map((t) => (t.id === tool.id ? {...t, enabled: newEnabled} : t)),
      );

      setSuccessMessage(`Tool "${tool.displayName}" ${newEnabled ? 'enabled' : 'disabled'} successfully`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle tool');
    }
  };

  const handleDelete = async (tool: CustomToolSummary) => {
    if (!window.confirm(`Are you sure you want to delete "${tool.displayName}"?`)) return;

    setDeletingTool(tool.id);
    try {
      await deleteCustomTool(tool.id);
      setTools((prev) => prev.filter((t) => t.id !== tool.id));
      setSuccessMessage(`Tool "${tool.displayName}" deleted successfully`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete tool');
    } finally {
      setDeletingTool(null);
    }
  };

  const handleSave = async (
    data: CreateCustomToolRequest | UpdateCustomToolRequest,
  ) => {
    if (editDialogOpen && editToolDetail) {
      await updateCustomTool(editToolDetail.id, data as UpdateCustomToolRequest);
      setSuccessMessage(`Tool "${data.displayName}" updated successfully`);
    } else {
      await createCustomTool(data as CreateCustomToolRequest);
      setSuccessMessage(`Tool "${data.displayName}" created successfully`);
    }
    await fetchData();
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleRunTest = async (args: Record<string, unknown>) => {
    if (!selectedTool) throw new Error('No tool selected');
    return await testCustomTool(selectedTool.id, args);
  };

  const handleSelectTemplate = (template: CustomToolTemplate) => {
      // Template data is already set by TemplateDialog via setTemplateData
      setCreateDialogOpen(true);
    };

  // Stats
  const totalTools = tools.length;
  const enabledTools = tools.filter((t) => t.enabled).length;
  const disabledTools = tools.length - enabledTools;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Code className="h-8 w-8"/>
            Custom Tools
          </h1>
          <p className="text-muted-foreground mt-1">
            Create, manage, and test custom MCP tools
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setInfoDialogOpen(true)}
            className="mt-2 text-muted-foreground hover:text-foreground"
          >
            <BookOpen className="h-4 w-4 mr-2"/>
            Documentation
          </Button>
        </div>

        <div className="flex gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" onClick={() => setTemplateDialogOpen(true)}>
                  <Download className="mr-2 h-4 w-4"/>
                  Templates
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Browse 40+ pre-built tool templates</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button onClick={handleCreate}>
                  <Plus className="mr-2 h-4 w-4"/>
                  Create Tool
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Create a new custom MCP tool</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="cursor-help">
                <CardHeader className="py-3">
                  <CardTitle className="text-sm font-medium">Total Tools</CardTitle>
                </CardHeader>
                <CardContent className="py-2">
                  <div className="text-2xl font-bold">{totalTools}</div>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent>
              <p>Total number of custom tools created</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="cursor-help">
                <CardHeader className="py-3">
                  <CardTitle className="text-sm font-medium">Enabled</CardTitle>
                </CardHeader>
                <CardContent className="py-2">
                  <div className="text-2xl font-bold text-green-500">{enabledTools}</div>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent>
              <p>Tools currently available to MCP clients</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="cursor-help">
                <CardHeader className="py-3">
                  <CardTitle className="text-sm font-medium">Disabled</CardTitle>
                </CardHeader>
                <CardContent className="py-2">
                  <div className="text-2xl font-bold text-muted-foreground">{disabledTools}</div>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent>
              <p>Tools currently not available to MCP clients</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Notifications */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4"/>
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {successMessage && (
        <Alert className="bg-green-50 border-green-200">
          <Check className="h-4 w-4 text-green-600"/>
          <AlertTitle className="text-green-800">Success</AlertTitle>
          <AlertDescription className="text-green-700">{successMessage}</AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground"/>
                <Input
                  placeholder="Search tools..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Select.Root value={selectedCategory?.toString?.() ?? ''} onValueChange={setSelectedCategory}>
                      <Select.Trigger className="w-[180px]"/>
                      <Select.Content>
                        {categories.filter((c) => c !== 'all').map(cat => (
                          <Select.Item value={cat}>{cat}</Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Root>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Filter tools by category</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={showDisabled ? 'default' : 'outline'}
                      onClick={() => setShowDisabled(!showDisabled)}
                      className="whitespace-nowrap"
                    >
                      Show Disabled: {showDisabled ? 'On' : 'Off'}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Toggle visibility of disabled tools</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tools List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary"/>
        </div>
      ) : filteredTools.length === 0 ? (
        <Card className="p-12 text-center">
          <FileCode className="h-12 w-12 mx-auto text-muted-foreground"/>
          <h3 className="mt-4 text-lg font-semibold">No custom tools found</h3>
          <p className="text-muted-foreground mt-2">
            {searchQuery || selectedCategory !== 'all'
              ? 'Try adjusting your search or filters.'
              : 'Create your first custom tool to get started.'}
          </p>
          {!searchQuery && selectedCategory === 'all' && (
            <Button className="mt-4" onClick={handleCreate}>
              <Plus className="mr-2 h-4 w-4"/>
              Create Tool
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredTools.map((tool) => (
            <Card key={tool.id}>
              <CardHeader className="py-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{tool.icon}</span>
                      <CardTitle className="text-lg">{tool.displayName}</CardTitle>
                      <code className="text-sm font-mono bg-muted px-2 py-0.5 rounded">
                        {tool.name}
                      </code>
                    </div>
                    <CardDescription className="mt-1">{tool.description}</CardDescription>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant={tool.enabled ? 'default' : 'secondary'}>
                        {tool.enabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                      <Badge variant="outline">{tool.category}</Badge>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTest(tool)}
                      title="Test Tool"
                    >
                      <Play className="h-4 w-4"/>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(tool)}
                      title="Edit Tool"
                    >
                      <Edit className="h-4 w-4"/>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggle(tool)}
                      title={tool.enabled ? 'Disable Tool' : 'Enable Tool'}
                    >
                      {tool.enabled ? (
                        <ToggleRight className="h-4 w-4"/>
                      ) : (
                        <ToggleLeft className="h-4 w-4"/>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(tool)}
                      disabled={deletingTool === tool.id}
                      title="Delete Tool"
                    >
                      {deletingTool === tool.id ? (
                        <Loader2 className="h-4 w-4 animate-spin"/>
                      ) : (
                        <Trash2 className="h-4 w-4"/>
                      )}
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      {/* Dialogs */}
      <CreateEditDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        templateData={templateData}
        onSave={handleSave}
        isEditing={false}
      />

      <CreateEditDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        tool={editToolDetail}
        onSave={handleSave}
        isEditing={true}
      />

      <TestDialog
        open={testDialogOpen}
        onOpenChange={setTestDialogOpen}
        tool={selectedTool}
        onTest={handleRunTest}
      />

      <TemplateDialog
        open={templateDialogOpen}
        onOpenChange={setTemplateDialogOpen}
        templates={templates}
        templateData={templateData}
        setTemplateData={setTemplateData}
        onSelectTemplate={handleSelectTemplate}
      />

      <InfoDialog
        open={infoDialogOpen}
        onOpenChange={setInfoDialogOpen}
      />
    </div>
  );
};

export default CustomTools
