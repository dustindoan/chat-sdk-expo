/**
 * Tool UI Registry
 *
 * Maps tool names to their custom UI components.
 * Tools without a custom component will use DefaultTool.
 */

import { WeatherTool } from './WeatherTool';
import { TemperatureTool } from './TemperatureTool';
import { DocumentTool } from './DocumentTool';
import { DefaultTool } from './DefaultTool';
import type { ToolUIRegistry, ToolUIComponent } from './types';

/**
 * Registry of tool-specific UI components
 */
export const toolRegistry: ToolUIRegistry = {
  weather: WeatherTool,
  convertTemperature: TemperatureTool,
  createDocument: DocumentTool,
  updateDocument: DocumentTool,
};

/**
 * Get the UI component for a tool by name
 * Falls back to DefaultTool if no custom component exists
 */
export function getToolComponent(toolName: string): ToolUIComponent {
  return toolRegistry[toolName] || DefaultTool;
}

// Re-export types and components
export type { ToolUIProps, ToolState, ToolUIComponent, ToolUIRegistry, ToolApproval } from './types';
export { WeatherTool } from './WeatherTool';
export { TemperatureTool } from './TemperatureTool';
export { DocumentTool } from './DocumentTool';
export { DefaultTool } from './DefaultTool';
export { ToolApprovalCard, ToolApprovedCard, ToolDeniedCard } from './ToolApprovalCard';
