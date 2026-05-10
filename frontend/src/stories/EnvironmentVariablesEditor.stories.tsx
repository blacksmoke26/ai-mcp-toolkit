/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

import {fn} from 'storybook/test';
import EnvironmentVariablesEditor, {
  type EnvironmentVariablesEditorProps,
} from '@/pages/AdminMCPServers/EnvironmentVariablesEditor';
import type {Meta, StoryObj} from '@storybook/react-vite';

const Component = ({...props}: EnvironmentVariablesEditorProps) => {
  return (
    <EnvironmentVariablesEditor {...props}/>
  );
};

const meta = {
  title: 'UI/EnvironmentVariablesEditor',
  parameters: {},
  // This component will have an automatically generated Autodocs entry: https://storybook.js.org/docs/writing-docs/autodocs
  tags: ['!autodocs', 'ui'],
  // More on argTypes: https://storybook.js.org/docs/api/argtypes
  argTypes: {
    //backgroundColor: { control: 'color' },
  },
  // Use `fn` to spy on the onClick arg, which will appear in the actions panel once invoked: https://storybook.js.org/docs/essentials/actions#action-args
  args: {
    onChange: fn(),
    value: '{"port": 3001}',
  },
  // 👇 The component you're working on
  component: Component,
} satisfies Meta<typeof EnvironmentVariablesEditor>;

export default meta;
// 👇 Type helper to reduce boilerplate
type Story = StoryObj<typeof meta>;

// 👇 A story named Primary that renders `<Button primary label="Button" />`
export const Default: Story = {
};
