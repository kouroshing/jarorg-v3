/**
 * Utility to parse notification templates by replacing curly braces placeholders
 * with real user metadata.
 */
export function parseTemplate(content: string, variables: Record<string, string>): string {
  let result = content;
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "g");
    result = result.replace(placeholder, value);
  }
  return result;
}
