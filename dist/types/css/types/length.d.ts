import { CSSValue } from '../syntax/parser';
import { DimensionToken, NumberValueToken } from '../syntax/tokenizer';
export type Length = DimensionToken | NumberValueToken;
export declare const isLength: (token: CSSValue) => token is Length;
