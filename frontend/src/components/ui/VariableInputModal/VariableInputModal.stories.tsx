import type {Meta, StoryObj} from '@storybook/react-vite';

import VariableInputModal, {type VariableInputModalProps, type VariablesProp} from '@/components/ui/VariableInputModal';
import {fn} from 'storybook/test';

// Wrapper to handle the open/close state for Storybook
const Component = ({variables, onSubmit, ...props}: VariableInputModalProps) => {
  return (
    <>
      <VariableInputModal
        isOpen={true}
        {...props}
        variables={variables}
        onSubmit={(values) => {
          console.log('Submitted Values:', values);
          onSubmit?.(values);
        }}
      />
    </>
  );
};

const meta = {
  title: 'UI/VariableInputModal',
  tags: ['autodocs'],
  argTypes: {
    title: {
      control: 'text',
      description: 'The title displayed in the modal header.',
    },
    subtitle: {
      control: 'text',
      description: 'The subtitle displayed in the modal header.',
    },
    variables: {
      control: 'object',
      description: 'Array of variable objects to render inputs for.',
    },
    prefillValues: {
      control: 'object',
      description: 'Initial values to prefill the inputs with.',
    },
    // @ts-expect-error skip
    key: {
      control: 'text',
      description: 'Key to persist form data in local storage.',
    },
    searchable: {
      control: 'boolean',
      description: 'Whether to show a search bar to filter variables.',
    },
    templateString: {
      control: 'text',
      description: 'Template string to preview the result.',
    },
    customValidator: {
      description: 'Custom validation function.',
    },
    onReset: {
      action: 'reset',
      description: 'Callback when the form is reset.',
    },
    onValueChange: {
      action: 'valueChange',
      description: 'Callback when a value changes.',
    },
    onValidate: {
      action: 'validate',
      description: 'Callback when validation runs.',
    },
    className: {
      control: 'text',
      description: 'Additional class names for the modal container.',
    },
    headerClassName: {
      control: 'text',
      description: 'Additional class names for the modal header.',
    },
    bodyClassName: {
      control: 'text',
      description: 'Additional class names for the modal body.',
    },
    footerClassName: {
      control: 'text',
      description: 'Additional class names for the modal footer.',
    },
    fieldClassName: {
      control: 'text',
      description: 'Additional class names for the input fields.',
    },
  },
  component: Component,
} satisfies Meta<typeof VariableInputModal>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    onValueChange: fn(),
    onSubmit: fn(),
    title: 'Configuration',
    // @ts-expect-error skip
    variables: [
      {name: 'username', label: 'Username', placeholder: 'Enter username', required: true},
      {name: 'email', label: 'Email Address', placeholder: 'user@example.com', required: true},
      {name: 'role', label: 'Role', placeholder: 'admin, user, guest'},
    ] as unknown as VariablesProp[],
  },
};

export const WithPrefill: Story = {
  args: {
    ...Default.args,
    prefillValues: {
      username: 'jdoe',
      email: 'jdoe@example.com',
    },
  },
};

export const WithGroups: Story = {
  args: {
    ...Default.args,
    variables: [
      {
        name: 'api_key',
        label: 'API Key',
        type: 'password',
        required: true,
        group: 'Authentication',
      },
      {
        name: 'endpoint',
        label: 'API Endpoint',
        placeholder: 'https://api.example.com',
        group: 'Authentication',
      },
      {
        name: 'timeout',
        label: 'Timeout (ms)',
        type: 'number',
        group: 'Advanced',
      },
      {
        name: 'retries',
        label: 'Retries',
        type: 'number',
        group: 'Advanced',
      },
    ],
  },
};

export const WithValidation: Story = {
  args: {
    ...Default.args,
    variables: [
      {
        name: 'port',
        label: 'Port',
        type: 'number',
        required: true,
        validation: {
          // @ts-expect-error skip
          min: 1,
          max: 65535,
        },
      },
      {
        name: 'url',
        label: 'Website URL',
        type: 'url',
        required: true,
      },
    ],
  },
};

export const WithSelect: Story = {
  args: {
    ...Default.args,
    variables: [
      {
        name: 'model',
        label: 'Model',
        type: 'select',
        required: true,
        options: [
          {label: 'GPT-4', value: 'gpt-4'},
          {label: 'GPT-3.5 Turbo', value: 'gpt-3.5-turbo'},
          {label: 'Claude 3', value: 'claude-3'},
        ],
      },
      {
        name: 'temperature',
        label: 'Temperature',
        type: 'select',
        options: [
          {label: 'Low (0.2)', value: '0.2'},
          {label: 'Medium (0.5)', value: '0.5'},
          {label: 'High (0.8)', value: '0.8'},
        ],
      },
    ],
  },
};

export const WithTemplatePreview: Story = {
  args: {
    ...Default.args,
    templateString: 'Hello {{username}}, your role is {{role}}. Contact us at {{email}}.',
    variables: [
      {name: 'username', label: 'Username', required: true},
      {name: 'role', label: 'Role', required: true},
      {name: 'email', label: 'Email', type: 'email', required: true},
    ],
  },
};

export const Searchable: Story = {
  args: {
    ...Default.args,
    searchable: true,
    variables: Array.from({length: 20}, (_, i) => ({
      name: `field_${i}`,
      label: `Field ${i + 1}`,
      placeholder: `Value for field ${i + 1}`,
    })),
  },
};

export const WithCustomValidator: Story = {
  args: {
    ...Default.args,
    // @ts-expect-error skip
    async customValidator(values) {
      const errors: Record<string, string> = {};
      if (values.password && values.password.length < 8) {
        errors.password = 'Password must be at least 8 characters';
      }
      if (values.confirmPassword !== values.password) {
        errors.confirmPassword = 'Passwords do not match';
      }
      return Object.keys(errors).length > 0 ? errors : null;
    },
    variables: [
      {name: 'password', label: 'Password', type: 'password', required: true},
      {name: 'confirmPassword', label: 'Confirm Password', type: 'password', required: true},
    ],
  },
};

export const ComplexForm: Story = {
  // @ts-expect-error skip
  args: {
    title: 'Server Configuration',
    subtitle: 'Please configure your MCP server connection',
    searchable: true,
    templateString: 'Connecting to {{host}}:{{port}} as {{user}}',
    variables: [
      {
        name: 'host',
        label: 'Host Address',
        placeholder: 'localhost',
        required: true,
        group: 'Connection',
      },
      {
        name: 'port',
        label: 'Port',
        type: 'number',
        required: true,
        group: 'Connection',
      },
      {
        name: 'user',
        label: 'Username',
        required: true,
        group: 'Authentication',
      },
      {
        name: 'password',
        label: 'Password',
        type: 'password',
        required: true,
        group: 'Authentication',
      },
      {
        name: 'protocol',
        label: 'Protocol',
        type: 'select',
        options: [
          {label: 'HTTP', value: 'http'},
          {label: 'HTTPS', value: 'https'},
          {label: 'WS', value: 'ws'},
          {label: 'WSS', value: 'wss'},
        ],
        group: 'Connection',
      },
      {
        name: 'timeout',
        label: 'Timeout (seconds)',
        type: 'number',
        group: 'Advanced',
      },
      {
        name: 'debug',
        label: 'Debug Mode',
        type: 'select',
        options: [
          {label: 'Enabled', value: 'true'},
          {label: 'Disabled', value: 'false'},
        ],
        group: 'Advanced',
      },
    ],
  },
};
