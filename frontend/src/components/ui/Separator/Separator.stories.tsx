import type {Meta, StoryObj} from '@storybook/react-vite';
import Separator, {type SeparatorProps} from './index';

const Component = ({...props}: SeparatorProps) => {
  return <Separator {...props} />;
};

const meta = {
  title: 'UI/Separator',
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs', 'ui'],
  argTypes: {
    orientation: {
      control: 'select',
      options: ['horizontal', 'vertical'],
      description: 'Orientation of the separator.',
      table: {
        defaultValue: {summary: 'horizontal'},
      },
    },
    decorative: {
      control: 'boolean',
      description: 'If true, the separator is hidden from screen readers.',
      table: {
        defaultValue: {summary: 'false'},
      },
    },
    label: {
      control: 'text',
      description: 'Optional label rendered in the center of the separator.',
    },
    variant: {
      control: 'select',
      options: ['solid', 'dashed', 'dotted'],
      description: 'Line style variant.',
      table: {
        defaultValue: {summary: 'solid'},
      },
    },
    size: {
      control: 'select',
      options: ['thin', 'default', 'thick'],
      description: 'Line thickness. "thin" uses reduced opacity.',
      table: {
        defaultValue: {summary: 'default'},
      },
    },
    color: {
      control: 'select',
      options: ['muted', 'primary', 'secondary', 'accent', 'destructive'],
      description: 'Color theme of the separator line.',
      table: {
        defaultValue: {summary: 'muted'},
      },
    },
  },
  args: {
    orientation: 'horizontal',
    decorative: false,
    variant: 'solid',
    size: 'default',
    color: 'muted',
    label: '',
  },
  component: Component,
} satisfies Meta<typeof Separator>;

export default meta;

type Story = StoryObj<typeof meta>;

/* --- Interactive Playground --- */
export const Default: Story = {
  render: (args) => (
    <div className={args.orientation === 'vertical' ? 'flex h-48 items-center' : 'w-96'}>
      <p className={args.orientation === 'vertical' ? 'pr-4' : 'pb-2'}>Content Above / Left</p>
      <Separator {...args} className={args.orientation === 'vertical' ? 'h-full' : 'w-full'}/>
      <p className={args.orientation === 'vertical' ? 'pl-4' : 'pt-2'}>Content Below / Right</p>
    </div>
  ),
};

/* --- Orientation Variants --- */
export const Horizontal: Story = {
  args: {
    orientation: 'horizontal',
  },
  render: (args) => (
    <div className="w-96">
      <p>Paragraph above the separator.</p>
      <Separator {...args} />
      <p>Paragraph below the separator.</p>
    </div>
  ),
};

export const Vertical: Story = {
  args: {
    orientation: 'vertical',
  },
  render: (args) => (
    <div className="flex h-24 items-center">
      <span>Left</span>
      <Separator {...args} className="h-full mx-4"/>
      <span>Right</span>
    </div>
  ),
};

/* --- Label Variants --- */
export const WithLabel: Story = {
  args: {
    label: 'OR',
    orientation: 'horizontal',
  },
  render: (args) => (
    <div className="w-96">
      <button className="w-full rounded bg-primary p-2 text-primary-foreground">Primary Action</button>
      <Separator {...args} className="my-4"/>
      <button className="w-full rounded bg-secondary p-2 text-secondary-foreground">Secondary Action</button>
    </div>
  ),
};

export const VerticalWithLabel: Story = {
  args: {
    label: 'AND',
    orientation: 'vertical',
  },
  render: (args) => (
    <div className="flex h-40 items-center">
      <div className="w-20 text-center">Section A</div>
      <Separator {...args} className="h-full mx-4"/>
      <div className="w-20 text-center">Section B</div>
    </div>
  ),
};

/* --- Variant & Style Showcases --- */
export const Variants: Story = {
  render: () => (
    <div className="flex flex-col w-96 gap-4">
      <span>Solid</span>
      <Separator variant="solid"/>
      <span>Dashed</span>
      <Separator variant="dashed"/>
      <span>Dotted</span>
      <Separator variant="dotted"/>
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="flex flex-col w-96 gap-4">
      <span>Thin</span>
      <Separator size="thin"/>
      <span>Default</span>
      <Separator size="default"/>
      <span>Thick</span>
      <Separator size="thick"/>
    </div>
  ),
};

export const Colors: Story = {
  render: () => (
    <div className="flex flex-col w-96 gap-4">
      <span>Muted (Default)</span>
      <Separator color="muted"/>
      <span>Primary</span>
      <Separator color="primary"/>
      <span>Secondary</span>
      <Separator color="secondary"/>
      <span>Accent</span>
      <Separator color="accent"/>
      <span>Destructive</span>
      <Separator color="destructive"/>
    </div>
  ),
};
