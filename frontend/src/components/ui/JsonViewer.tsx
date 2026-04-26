/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

import React from 'react';
import JsonView, {type JsonViewProps} from '@uiw/react-json-view';
import {githubDarkTheme} from '@uiw/react-json-view/githubDark';
import {githubLightTheme} from '@uiw/react-json-view/githubLight';
import {useTheme} from '@/context/ThemeContext';

/**
 * Props for the JsonViewer component.
 * Extends the props from @uiw/react-json-view's JsonViewProps.
 */
interface JsonViewerProps extends JsonViewProps<object> {
}

/**
 * JsonViewer component to display JSON data with syntax highlighting.
 * Automatically adapts to the current application theme (dark/light).
 *
 * @param props - The component properties.
 * @returns The rendered JsonView component.
 */
const JsonViewer: React.FC<JsonViewerProps> = (props) => {
  const {theme} = useTheme();

  // Determine effective theme
  const viewerTheme = theme === 'dark' ? githubDarkTheme : githubLightTheme;

  return <JsonView
    displayDataTypes={false}
    displayObjectSize={false}
    enableClipboard={false}
    style={{...viewerTheme, backgroundColor: 'transparent'}}
    value={props.value}
    {...props}/>;
};

export default JsonViewer;
