/**
 * Stateful Agent Factory
 *
 * Creates an agent instance that follows a defined workflow,
 * with state-based model routing, tool restriction, and prompts.
 *
 * Uses ToolLoopAgent with prepareStep for per-step state control.
 */

import { ToolLoopAgent, stepCountIs, hasToolCall, convertToModelMessages } from 'ai';
import type { ToolSet, StopCondition } from 'ai';

import type {
  WorkflowDefinition,
  WorkflowContext,
  StatefulAgent,
  AgentCallParams,
  AgentResult,
  CreateStatefulAgentOptions,
  ToolResult,
  Message,
} from './types';
import { getModel } from './models';
import { deriveState, buildStateHistory, isWorkflowComplete } from './deriveState';

/**
 * Build a WorkflowContext from the current state of execution
 */
function buildContext<TStates extends string>(
  workflow: WorkflowDefinition<TStates>,
  currentState: TStates,
  toolResults: ToolResult[],
  stepNumber: number,
  messages: Message[],
  collectedData: Record<string, unknown>,
  initialPrompt: string
): WorkflowContext {
  return {
    currentState,
    stateHistory: buildStateHistory(workflow, toolResults),
    toolResults,
    collectedData,
    initialPrompt,
    stepNumber,
    messages,
  };
}

/**
 * Extract collected data from tool results
 *
 * This looks for common patterns like 'collectData' tool calls
 * and aggregates them into a single record.
 */
function extractCollectedData(toolResults: ToolResult[]): Record<string, unknown> {
  const collected: Record<string, unknown> = {};

  for (const result of toolResults) {
    // Handle static tool results which have 'result' property
    if ('result' in result && result.result && typeof result.result === 'object') {
      const data = result.result as Record<string, unknown>;
      if (data.fieldName && data.value !== undefined) {
        collected[data.fieldName as string] = data.value;
      }
    }

    // Handle args-based collection (for static tools)
    if ('args' in result && result.args && typeof result.args === 'object') {
      const args = result.args as Record<string, unknown>;
      if (args.fieldName && args.value !== undefined) {
        collected[args.fieldName as string] = args.value;
      }
    }
  }

  return collected;
}

/**
 * Create a stateful agent from a workflow definition
 *
 * @param workflow - The workflow definition
 * @param allTools - All tools available to the agent (will be filtered per-state)
 * @param options - Additional configuration options
 * @returns A StatefulAgent instance
 */
export function createStatefulAgent<TStates extends string>(
  workflow: WorkflowDefinition<TStates>,
  allTools: ToolSet,
  options?: CreateStatefulAgentOptions
): StatefulAgent<TStates> {
  // Internal state tracking
  let internalContext: WorkflowContext = {
    currentState: workflow.initialState,
    stateHistory: [],
    toolResults: [],
    collectedData: {},
    initialPrompt: '',
    stepNumber: 0,
    messages: [],
  };

  // Build stop conditions from terminal states
  const stopConditions: StopCondition<typeof allTools>[] = [];

  // Add tool-based stop conditions for terminal states
  // Stop when any tool in a terminal state is called
  for (const state of workflow.terminalStates) {
    const stateConfig = workflow.states[state];
    for (const toolName of stateConfig.tools) {
      stopConditions.push(hasToolCall(toolName));
    }
  }

  // Add step limit
  stopConditions.push(stepCountIs(workflow.maxSteps || 50));

  // Default model
  const defaultModel = getModel(
    workflow.defaultModel || options?.defaultModel,
    options?.apiKey
  );

  // Create the ToolLoopAgent with prepareStep for per-step state control
  const agent = new ToolLoopAgent({
    model: defaultModel,
    tools: allTools,
    stopWhen: stopConditions,

    // Per-step configuration based on current workflow state
    prepareStep: ({ stepNumber, steps }) => {
      // Extract tool results from all previous steps
      const allToolResults: ToolResult[] = steps.flatMap(
        (step) => (step.toolResults || []) as ToolResult[]
      );

      // Derive current state from tool results
      const currentState = deriveState(workflow, allToolResults);
      const stateConfig = workflow.states[currentState];

      // Build context for dynamic instructions
      const stepContext = buildContext(
        workflow,
        currentState,
        allToolResults,
        stepNumber,
        internalContext.messages,
        extractCollectedData(allToolResults),
        internalContext.initialPrompt
      );

      // Resolve instructions (static string or function)
      const system =
        typeof stateConfig.instructions === 'function'
          ? stateConfig.instructions(stepContext)
          : stateConfig.instructions;

      // Return state-specific configuration
      // Note: prepareStep returns 'system' for per-step instructions
      return {
        model: stateConfig.model
          ? getModel(stateConfig.model, options?.apiKey)
          : undefined,
        activeTools: stateConfig.tools as Array<keyof typeof allTools>,
        toolChoice: stateConfig.toolChoice,
        system,
      };
    },

    onStepFinish: async (step) => {
      // Extract tool results from this step
      const toolResults = (step.toolResults || []) as ToolResult[];

      // Update internal context
      const currentState = deriveState(workflow, toolResults);
      internalContext = buildContext(
        workflow,
        currentState,
        toolResults,
        internalContext.stepNumber + 1,
        internalContext.messages,
        extractCollectedData(toolResults),
        internalContext.initialPrompt
      );

      // Call options callback for persistence
      if (options?.onPersist) {
        await options.onPersist(internalContext);
      }

      // Check if complete
      if (isWorkflowComplete(workflow, currentState as TStates)) {
        if (options?.onComplete) {
          await options.onComplete(internalContext);
        }
      }
    },
  });

  // Return the StatefulAgent interface
  return {
    workflow,

    async generate(params: AgentCallParams): Promise<AgentResult> {
      // Store initial prompt
      if (params.prompt) {
        internalContext.initialPrompt = params.prompt;
      } else if (params.messages?.length) {
        const userMessages = params.messages.filter((m) => m.role === 'user');
        const lastUserMessage = userMessages[userMessages.length - 1];
        if (lastUserMessage && 'content' in lastUserMessage) {
          internalContext.initialPrompt =
            typeof lastUserMessage.content === 'string'
              ? lastUserMessage.content
              : '';
        }
      }

      // Call the agent
      // Note: prompt and messages are mutually exclusive in AI SDK
      // Convert UI messages to model messages format (parts -> content)
      const modelMessages = params.messages
        ? await convertToModelMessages(params.messages)
        : undefined;

      const result = params.prompt
        ? await agent.generate({ prompt: params.prompt })
        : await agent.generate({ messages: modelMessages as any });

      // Collect all tool results from all steps
      const allToolResults: ToolResult[] =
        result.steps?.flatMap((step) => (step.toolResults || []) as ToolResult[]) || [];

      // Build final context
      const finalState = deriveState(workflow, allToolResults);
      const finalContext = buildContext(
        workflow,
        finalState,
        allToolResults,
        result.steps?.length || 0,
        (result.response?.messages || []) as unknown as Message[],
        extractCollectedData(allToolResults),
        internalContext.initialPrompt
      );

      // Call user's onStepFinish if provided (for final state)
      if (params.onStepFinish) {
        await params.onStepFinish(finalContext);
      }

      return {
        text: result.text,
        toolCalls: (result.toolCalls || []).map((tc) => ({
          toolName: tc.toolName,
          args: 'args' in tc ? (tc.args as Record<string, unknown>) : {},
        })),
        toolResults: allToolResults,
        context: finalContext,
        isComplete: isWorkflowComplete(workflow, finalState as TStates),
      };
    },

    async stream(params: AgentCallParams): Promise<Response> {
      // Store initial prompt
      if (params.prompt) {
        internalContext.initialPrompt = params.prompt;
      }

      // Call the agent with streaming
      // Note: prompt and messages are mutually exclusive
      // Convert UI messages to model messages format (parts -> content)
      const modelMessages = params.messages
        ? await convertToModelMessages(params.messages)
        : undefined;

      const result = params.prompt
        ? await agent.stream({ prompt: params.prompt })
        : await agent.stream({ messages: modelMessages as any });

      // If no onFinish callback, return the stream directly
      if (!params.onFinish) {
        return result.toUIMessageStreamResponse();
      }

      // With onFinish callback, consume the response.messages after stream ends
      // Use consumeStream to ensure the stream is fully processed, then get messages
      const responsePromise = result.response;

      // Start consuming messages in the background
      // Note: response.messages is only available after the stream completes
      // Wrap in an async IIFE with try/catch since PromiseLike doesn't have .catch
      (async () => {
        try {
          const response = await responsePromise;
          // response.messages contains the assistant and tool messages from this call
          const messages = response.messages as unknown as Message[];
          await params.onFinish!(messages);
        } catch (error) {
          console.error('Error getting response messages for onFinish:', error);
        }
      })();

      // Return the stream immediately so client can consume it
      return result.toUIMessageStreamResponse();
    },

    getContext(): WorkflowContext {
      return { ...internalContext };
    },

    resume(savedContext: Partial<WorkflowContext>): void {
      internalContext = {
        ...internalContext,
        ...savedContext,
      };
    },

    reset(): void {
      internalContext = {
        currentState: workflow.initialState,
        stateHistory: [],
        toolResults: [],
        collectedData: {},
        initialPrompt: '',
        stepNumber: 0,
        messages: [],
      };
    },
  };
}
