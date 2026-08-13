import * as ts from "typescript";

export function validateSyntax(templateSource: string): string[] {
  const wrapped = `const __tradurreCandidate = ${templateSource};`;
  const output = ts.transpileModule(wrapped, {
    reportDiagnostics: true,
    compilerOptions: {
      target: ts.ScriptTarget.ES2020,
      isolatedModules: true,
    },
  });
  /* v8 ignore next -- reportDiagnostics guarantees `diagnostics` is defined */
  const diagnostics = output.diagnostics ?? [];
  return diagnostics.map((diagnostic) =>
    ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"),
  );
}
