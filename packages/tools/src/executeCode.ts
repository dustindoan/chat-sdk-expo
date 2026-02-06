/**
 * Code Execution Tool
 *
 * Allows AI to execute Python or JavaScript code in a sandboxed environment.
 * Execution happens client-side (Pyodide for Python) or server-side.
 */

import { tool } from 'ai';
import { z } from 'zod';

/**
 * Supported programming languages
 */
export const supportedLanguages = ['python', 'javascript'] as const;
export type SupportedLanguage = (typeof supportedLanguages)[number];

/**
 * Code execution input schema
 */
export const executeCodeInputSchema = z.object({
  code: z.string().describe('The code to execute'),
  language: z
    .enum(supportedLanguages)
    .describe('Programming language (python or javascript)'),
});

export type ExecuteCodeInput = z.infer<typeof executeCodeInputSchema>;

/**
 * Code execution result
 */
export interface ExecuteCodeResult {
  success: boolean;
  output: string;
  error?: string;
  executionTime: number;
  language: string;
  code: string;
}

/**
 * Execute code tool options
 */
export interface ExecuteCodeToolOptions {
  /** Whether tool requires user approval before execution */
  needsApproval?: boolean;
  /**
   * Custom execution handler
   * If provided, this will be called instead of returning a pending result
   */
  executeHandler?: (input: ExecuteCodeInput) => Promise<ExecuteCodeResult>;
}

/**
 * Create an execute code tool
 *
 * @param options - Tool configuration options
 * @returns AI SDK tool definition
 */
export function createExecuteCodeTool(options: ExecuteCodeToolOptions = {}) {
  const { needsApproval = true, executeHandler } = options;

  return tool({
    description: `Execute Python or JavaScript code in a sandboxed environment.
Use this tool to run code and see the output. Perfect for:
- Demonstrating code functionality
- Performing calculations
- Data processing
- Testing algorithms

The code runs in an isolated sandbox with no filesystem or network access.
Console output (print/console.log) and return values are captured.

Supported languages:
- python: Full Python with standard library (numpy, pandas available on web)
- javascript: Standard JavaScript/ES6+`,
    inputSchema: executeCodeInputSchema,
    needsApproval,
    execute: async (input): Promise<ExecuteCodeResult> => {
      // Use custom handler if provided
      if (executeHandler) {
        return executeHandler(input);
      }

      // Default behavior: return pending result
      // The actual execution happens client-side for web platforms
      // or via server API for mobile platforms.
      // This tool just returns the input parameters - the UI component
      // or API route handles the actual execution.
      return {
        success: true,
        output: '(execution pending)',
        executionTime: 0,
        language: input.language,
        code: input.code,
      };
    },
  });
}

/**
 * Default execute code tool with approval required
 * For backwards compatibility
 */
export const executeCodeTool = createExecuteCodeTool({ needsApproval: true });
