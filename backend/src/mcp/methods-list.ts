/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

import * as mcpMethods from './methods';

const methodsList = Object.values(mcpMethods).map(info => ({
  method: info.name,
  description: info.description,
  params: info.params,
})) as {
  method: string;
  description: string;
  params: string;
}[];

export default methodsList;
