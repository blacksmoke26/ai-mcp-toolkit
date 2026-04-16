/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

// tools
import {arraySampleTool, arrayShuffleTool} from './array-random';
import {arrayFilterTool, arraySortTool} from './array-sort';
import {arrayMinMaxTool, arraySumTool} from './array-stats';
import {base64DecodeTool, base64EncodeTool} from './base64';
import {hexToRgbTool, rgbToHexTool} from './color-convert';
import {csvToJsonTool, jsonToCsvTool} from './csv';
import {currencyConvertTool, exchangeRatesTool} from './currency-convert';
import {ageCalculateTool, dateDiffTool} from './date-diff';
import {checksumVerifyTool, hashTool} from './hash';
import {jsonParseTool, jsonStringifyTool} from './json';
import {exponentTool, moduloTool} from './math-advanced';
import {additionTool, subtractionTool} from './math-basics';
import {divideTool, multiplyTool} from './math-multiply';
import {numberPrecisionTool, numberRoundTool} from './number-round';
import {numberValidateTool, typeCheckTool} from './number-validate';
import {passwordGenerateTool, randomStringTool} from './password-gen';
import {randomNumberTool, diceRollTool} from './random-number';
import {stringConcatTool, stringSplitTool} from './string-ops';
import {stringFindTool, stringReplaceTool} from './string-replace';
import {stringLengthTool, substringTool} from './string-sub';
import {textTransformTool, wordCountTool} from '@/tools/text-analysis';
import {urlDecodeTool, urlEncodeTool} from './url-encode';
import {guidGenerateTool, uuidGenerateTool} from './uuid';
import {weatherTool} from './weather';

// types
import type {MCPTool} from '@/mcp/types';

const predefinedTools: MCPTool[] = [
  arraySampleTool, arrayShuffleTool,
  arrayFilterTool, arraySortTool,
  arrayMinMaxTool, arraySumTool,
  base64DecodeTool, base64EncodeTool,
  hexToRgbTool, rgbToHexTool,
  csvToJsonTool, jsonToCsvTool,
  currencyConvertTool, exchangeRatesTool,
  ageCalculateTool, dateDiffTool,
  checksumVerifyTool, hashTool,
  jsonParseTool, jsonStringifyTool,
  exponentTool, moduloTool,
  additionTool, subtractionTool,
  divideTool, multiplyTool,
  numberPrecisionTool, numberRoundTool,
  numberValidateTool, typeCheckTool,
  passwordGenerateTool, randomStringTool,
  randomNumberTool, diceRollTool,
  stringConcatTool, stringSplitTool,
  stringFindTool, stringReplaceTool,
  stringLengthTool, substringTool,
  urlDecodeTool, urlEncodeTool,
  guidGenerateTool, uuidGenerateTool,
  weatherTool,
  wordCountTool, textTransformTool,
];

export default predefinedTools;
