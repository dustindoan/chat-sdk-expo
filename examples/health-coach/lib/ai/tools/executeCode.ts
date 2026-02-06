import { tool } from 'ai';
import { z } from 'zod';

/**
 * Code execution input schema
 */
export const executeCodeInputSchema = z.object({
  code: z.string().describe('The code to execute'),
  language: z
    .enum(['python', 'javascript'])
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
 * Execute code tool definition
 *
 * This tool allows the AI to execute Python or JavaScript code
 * in a sandboxed environment. Execution happens client-side on web
 * (using Pyodide for Python) or server-side on mobile platforms.
 *
 * Requires user approval before execution for security.
 */
export const executeCodeTool = tool({
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
  needsApproval: true,
  execute: async (input): Promise<ExecuteCodeResult> => {
    // The actual execution happens client-side for web platforms
    // or via server API for mobile platforms.
    // This tool just returns the input parameters - the UI component
    // or API route handles the actual execution.
    //
    // For tool approval flow, we pass through the parameters
    // and let the client/server handle execution after approval.

    return {
      success: true,
      output: '(execution pending)',
      executionTime: 0,
      language: input.language,
      code: input.code,
    };
  },
});
