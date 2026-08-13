export type LocaleCode = string;

export type LocaleRef = {
  code: LocaleCode;
  member: string;
};

export type TokenType = "string" | "number" | "Date";

export type Tokens = Record<string, TokenType>;

export type Analysis = {
  hasArguments: boolean;
  tokens: Tokens;
};

export type CopyMap = Record<string, string>;

export type ConstantEntry = {
  kind: "constant";
  key: string;
  id: string;
  variants: Record<LocaleCode, string>;
};

export type TemplateEntry = {
  kind: "template";
  key: string;
  id: string;
  typeName: string;
  tokens: Tokens;
  variants: Record<LocaleCode, string>;
};

export type Entry = ConstantEntry | TemplateEntry;

export type Component = {
  directory: string;
  entries: Entry[];
  locales: LocaleRef[];
  templateCount: number;
};

export type ApplyOptions = {
  cwd: string;
  copyFile: string;
  tsFile: string;
  typeFile: string;
  sourceLocale: LocaleCode;
  localePath: string;
  i18nPath: string;
  commonPath?: string;
};

export type CompileRequest = {
  entry: TemplateEntry;
  locales: readonly LocaleRef[];
};

export type IcuCompiler = {
  compile(request: CompileRequest): Promise<string | null>;
};

export type OllamaOptions = {
  model?: string;
  endpoint?: string;
  maxAttempts?: number;
  fetchImpl?: typeof fetch;
  validate?: (source: string) => string[];
};

export type ApplyDeps = {
  discover(pattern: string, cwd: string): Promise<string[]>;
  loadComponent(directory: string, options: ApplyOptions): Promise<Component>;
  readFileOrNull(path: string): Promise<string | null>;
  writeFile(path: string, content: string): Promise<void>;
  format?(source: string, path: string): Promise<string>;
};

export type ComponentResult = {
  directory: string;
  tsFile: string;
  typeFile: string | null;
  constants: number;
  templates: number;
  compiledTemplates: number;
};

export type ApplyResult = {
  components: ComponentResult[];
};

export type ParsedCommand = {
  command: "apply";
  options: ApplyOptions;
};
