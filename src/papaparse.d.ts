declare module 'papaparse' {
  interface ParseConfig {
    header?: boolean;
    skipEmptyLines?: boolean;
    transformHeader?: (header: string) => string;
    complete?: (results: ParseResult) => void;
    error?: (error: ParseError) => void;
  }

  interface ParseResult {
    data: unknown[];
    errors: ParseError[];
    meta: {
      fields?: string[];
      delimiter: string;
      linebreak: string;
      aborted: boolean;
      truncated: boolean;
    };
  }

  interface ParseError {
    type: string;
    code: string;
    message: string;
    row?: number;
  }

  function parse(input: File | string, config?: ParseConfig): void;

  export default { parse };
  export { parse, ParseConfig, ParseResult, ParseError };
}
