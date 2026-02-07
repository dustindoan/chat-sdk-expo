/**
 * Tool UI Registry
 *
 * Maps tool names to their custom UI components.
 * Generic tools (DefaultTool, Confirmation) come from @chat-sdk-expo/ui.
 * App-specific tools are defined locally.
 */

import {
  createToolRegistry,
  getToolComponent as getToolComponentBase,
  type ToolUIRegistry,
  type ToolUIComponent,
} from '@chat-sdk-expo/ui/tools';
import { WeatherTool } from './WeatherTool';
import { TemperatureTool } from './TemperatureTool';
import { DocumentTool } from './DocumentTool';
import { CodeExecutionTool } from './CodeExecutionTool';
import { SessionsTool } from './SessionsTool';

/**
 * App tool registry with all tool UI mappings
 */
const appTools: ToolUIRegistry = {
  weather: WeatherTool,
  convertTemperature: TemperatureTool,
  createDocument: DocumentTool,
  updateDocument: DocumentTool,
  executeCode: CodeExecutionTool,
  getTodaySessions: SessionsTool,
};

export const toolRegistry = createToolRegistry(appTools);

/**
 * Get the UI component for a tool by name
 * Falls back to DefaultTool if no custom component exists
 */
export function getToolComponent(toolName: string): ToolUIComponent {
  return getToolComponentBase(toolName, toolRegistry);
}

// Re-export types and shared generic components
export type { ToolUIProps, ToolState, ToolUIComponent, ToolUIRegistry, ToolApproval } from '@chat-sdk-expo/ui/tools';
export {
  DefaultTool,
  Confirmation,
  ConfirmationApproved,
  ConfirmationDenied,
} from '@chat-sdk-expo/ui/tools';
export { WeatherTool } from './WeatherTool';
export { TemperatureTool } from './TemperatureTool';
export { DocumentTool } from './DocumentTool';
export { CodeExecutionTool } from './CodeExecutionTool';
export { SessionsTool } from './SessionsTool';
