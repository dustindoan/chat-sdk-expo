/**
 * Server-side code execution endpoint
 *
 * Provides sandboxed code execution for mobile platforms
 * that can't run Pyodide or browser JavaScript sandboxes.
 */

import { requireAuth } from '../../lib/auth/api';
import vm from 'vm';

// Simple timeout wrapper
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Execution timed out')), ms)
    ),
  ]);
}

/**
 * Execute JavaScript code in a sandboxed VM context
 */
function executeJavaScript(
  code: string,
  timeout: number
): { success: boolean; output: string; error?: string } {
  const outputs: string[] = [];

  // Create a sandbox with limited globals
  const sandbox = {
    console: {
      log: (...args: any[]) => {
        outputs.push(
          args
            .map((a) => {
              try {
                return typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a);
              } catch {
                return String(a);
              }
            })
            .join(' ')
        );
      },
      error: (...args: any[]) => {
        outputs.push('[error] ' + args.map((a) => String(a)).join(' '));
      },
      warn: (...args: any[]) => {
        outputs.push('[warn] ' + args.map((a) => String(a)).join(' '));
      },
      info: (...args: any[]) => {
        outputs.push(args.map((a) => String(a)).join(' '));
      },
    },
    // Safe built-ins
    Math,
    Date,
    JSON,
    Array,
    Object,
    String,
    Number,
    Boolean,
    RegExp,
    Map,
    Set,
    Promise,
    parseInt,
    parseFloat,
    isNaN,
    isFinite,
    encodeURIComponent,
    decodeURIComponent,
  };

  try {
    const context = vm.createContext(sandbox);
    const script = new vm.Script(code, { timeout });
    const result = script.runInContext(context, { timeout });

    let output = outputs.join('\n');
    if (result !== undefined) {
      const resultStr =
        typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result);
      if (output) output += '\n';
      output += resultStr;
    }

    return {
      success: true,
      output: output || '(no output)',
    };
  } catch (error) {
    return {
      success: false,
      output: outputs.join('\n'),
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Execute Python code (limited server-side support)
 *
 * Note: Full Python execution requires Pyodide on web.
 * Server-side Python execution is limited and not recommended
 * for production without proper sandboxing (e.g., Docker containers).
 */
function executePython(
  _code: string,
  _timeout: number
): { success: boolean; output: string; error?: string } {
  // For security, we don't execute Python server-side without proper sandboxing
  // In production, you would use a Docker container or similar isolation

  return {
    success: false,
    output: '',
    error:
      'Python execution is only available on web platforms using Pyodide. ' +
      'Please use the web version of the app for Python code execution.',
  };
}

export async function POST(request: Request) {
  // Require authentication
  const { error } = await requireAuth(request);
  if (error) return error;

  const startTime = Date.now();

  try {
    const body = await request.json();
    const { code, language, timeout = 10000 } = body;

    // Validate inputs
    if (!code || typeof code !== 'string') {
      return Response.json(
        { success: false, error: 'Code is required', output: '', executionTime: 0 },
        { status: 400 }
      );
    }

    if (!['python', 'javascript'].includes(language)) {
      return Response.json(
        {
          success: false,
          error: `Unsupported language: ${language}. Supported: python, javascript`,
          output: '',
          executionTime: 0,
        },
        { status: 400 }
      );
    }

    // Limit timeout to 30 seconds max
    const safeTimeout = Math.min(Math.max(timeout, 1000), 30000);

    // Execute code based on language
    const result =
      language === 'javascript'
        ? executeJavaScript(code, safeTimeout)
        : executePython(code, safeTimeout);

    return Response.json({
      ...result,
      executionTime: Date.now() - startTime,
    });
  } catch (error) {
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        output: '',
        executionTime: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}
