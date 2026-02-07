/**
 * Code Execution Service
 *
 * Provides sandboxed code execution for Python (via Pyodide) and JavaScript.
 * Web-first with server-side fallback for mobile platforms.
 */

import { Platform } from 'react-native';

export interface ExecutionResult {
  success: boolean;
  output: string;
  error?: string;
  executionTime: number;
}

export interface CodeExecutionOptions {
  code: string;
  language: 'python' | 'javascript';
  timeout?: number;
}

// Pyodide instance (lazy loaded on web)
let pyodideInstance: any = null;
let pyodideLoading: Promise<any> | null = null;

/**
 * Load Pyodide for Python execution (web only)
 */
async function loadPyodide(): Promise<any> {
  if (pyodideInstance) {
    return pyodideInstance;
  }

  if (pyodideLoading) {
    return pyodideLoading;
  }

  pyodideLoading = (async () => {
    if (Platform.OS !== 'web') {
      throw new Error('Pyodide is only available on web');
    }

    // Dynamically load Pyodide from CDN
    const pyodideUrl = 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.mjs';
    // @ts-ignore - CDN import not resolvable by TypeScript
    const { loadPyodide: loadPyodideFromCDN } = await import(/* webpackIgnore: true */ pyodideUrl);

    pyodideInstance = await loadPyodideFromCDN({
      indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/',
    });

    return pyodideInstance;
  })();

  return pyodideLoading;
}

/**
 * Execute Python code using Pyodide (web only)
 */
async function executePythonWeb(
  code: string,
  timeout: number
): Promise<ExecutionResult> {
  const startTime = Date.now();

  try {
    const pyodide = await loadPyodide();

    // Capture stdout/stderr
    let output = '';
    pyodide.setStdout({
      batched: (text: string) => {
        output += text + '\n';
      },
    });
    pyodide.setStderr({
      batched: (text: string) => {
        output += '[stderr] ' + text + '\n';
      },
    });

    // Execute with timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Execution timed out')), timeout);
    });

    const executePromise = (async () => {
      const result = await pyodide.runPythonAsync(code);
      return result;
    })();

    const result = await Promise.race([executePromise, timeoutPromise]);

    // If there's a return value, append it to output
    if (result !== undefined && result !== null) {
      const resultStr = pyodide.isPyProxy(result) ? result.toString() : String(result);
      if (resultStr !== 'None' && resultStr.trim()) {
        output += resultStr;
      }
    }

    return {
      success: true,
      output: output.trim() || '(no output)',
      executionTime: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      output: '',
      error: error instanceof Error ? error.message : String(error),
      executionTime: Date.now() - startTime,
    };
  }
}

/**
 * Execute JavaScript code in a sandboxed context (web)
 */
async function executeJavaScriptWeb(
  code: string,
  timeout: number
): Promise<ExecutionResult> {
  const startTime = Date.now();

  return new Promise((resolve) => {
    try {
      // Create a sandboxed iframe for execution
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.sandbox.add('allow-scripts');
      document.body.appendChild(iframe);

      const outputs: string[] = [];
      let hasResolved = false;

      // Set up timeout
      const timeoutId = setTimeout(() => {
        if (!hasResolved) {
          hasResolved = true;
          document.body.removeChild(iframe);
          resolve({
            success: false,
            output: outputs.join('\n'),
            error: 'Execution timed out',
            executionTime: Date.now() - startTime,
          });
        }
      }, timeout);

      // Listen for messages from the iframe
      const messageHandler = (event: MessageEvent) => {
        if (event.source !== iframe.contentWindow) return;

        if (event.data.type === 'console') {
          outputs.push(event.data.text);
        } else if (event.data.type === 'result') {
          if (!hasResolved) {
            hasResolved = true;
            clearTimeout(timeoutId);
            window.removeEventListener('message', messageHandler);
            document.body.removeChild(iframe);

            if (event.data.error) {
              resolve({
                success: false,
                output: outputs.join('\n'),
                error: event.data.error,
                executionTime: Date.now() - startTime,
              });
            } else {
              let output = outputs.join('\n');
              if (event.data.value !== undefined && event.data.value !== 'undefined') {
                if (output) output += '\n';
                output += event.data.value;
              }
              resolve({
                success: true,
                output: output || '(no output)',
                executionTime: Date.now() - startTime,
              });
            }
          }
        }
      };

      window.addEventListener('message', messageHandler);

      // Inject the code into the iframe
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) {
        throw new Error('Could not access iframe document');
      }

      const script = `
        (function() {
          const outputs = [];
          const originalConsole = console;

          // Override console methods
          console = {
            log: (...args) => {
              const text = args.map(a => {
                try {
                  return typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a);
                } catch {
                  return String(a);
                }
              }).join(' ');
              parent.postMessage({ type: 'console', text }, '*');
            },
            error: (...args) => {
              const text = '[error] ' + args.map(a => String(a)).join(' ');
              parent.postMessage({ type: 'console', text }, '*');
            },
            warn: (...args) => {
              const text = '[warn] ' + args.map(a => String(a)).join(' ');
              parent.postMessage({ type: 'console', text }, '*');
            },
            info: (...args) => console.log(...args),
          };

          try {
            const result = eval(${JSON.stringify(code)});
            parent.postMessage({
              type: 'result',
              value: result !== undefined ? String(result) : undefined
            }, '*');
          } catch (e) {
            parent.postMessage({
              type: 'result',
              error: e.message || String(e)
            }, '*');
          }
        })();
      `;

      iframeDoc.open();
      iframeDoc.write(`<script>${script}</script>`);
      iframeDoc.close();
    } catch (error) {
      resolve({
        success: false,
        output: '',
        error: error instanceof Error ? error.message : String(error),
        executionTime: Date.now() - startTime,
      });
    }
  });
}

/**
 * Execute code via server-side API (for mobile platforms)
 */
async function executeOnServer(
  code: string,
  language: 'python' | 'javascript',
  timeout: number
): Promise<ExecutionResult> {
  const startTime = Date.now();

  try {
    const response = await fetch('/api/execute-code', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code, language, timeout }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        output: '',
        error: errorData.error || `Server error: ${response.status}`,
        executionTime: Date.now() - startTime,
      };
    }

    const result = await response.json();
    return {
      success: result.success,
      output: result.output || '(no output)',
      error: result.error,
      executionTime: result.executionTime || Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      output: '',
      error: error instanceof Error ? error.message : String(error),
      executionTime: Date.now() - startTime,
    };
  }
}

/**
 * Execute code in the appropriate environment
 */
export async function executeCode(
  options: CodeExecutionOptions
): Promise<ExecutionResult> {
  const { code, language, timeout = 10000 } = options;

  // Validate inputs
  if (!code.trim()) {
    return {
      success: false,
      output: '',
      error: 'No code provided',
      executionTime: 0,
    };
  }

  if (!['python', 'javascript'].includes(language)) {
    return {
      success: false,
      output: '',
      error: `Unsupported language: ${language}. Supported: python, javascript`,
      executionTime: 0,
    };
  }

  // Web platform: use browser-based execution
  if (Platform.OS === 'web') {
    if (language === 'python') {
      return executePythonWeb(code, timeout);
    } else {
      return executeJavaScriptWeb(code, timeout);
    }
  }

  // Mobile platforms: use server-side execution
  return executeOnServer(code, language, timeout);
}

/**
 * Check if Pyodide is loaded (for status display)
 */
export function isPyodideLoaded(): boolean {
  return pyodideInstance !== null;
}

/**
 * Check if we're on a platform that supports in-browser execution
 */
export function supportsInBrowserExecution(): boolean {
  return Platform.OS === 'web';
}
