export type { ToolUIProps, ToolState, ToolUIComponent, ToolUIRegistry, ToolApproval } from './types';
export { DefaultTool } from './DefaultTool';
export { Confirmation, ConfirmationApproved, ConfirmationDenied } from './Confirmation';

import { DefaultTool } from './DefaultTool';
import type { ToolUIRegistry, ToolUIComponent } from './types';

/**
 * Create a tool registry by merging app-specific tools with optional defaults.
 * Apps provide their own tool mappings; this merges them together.
 */
export function createToolRegistry(...registries: ToolUIRegistry[]): ToolUIRegistry {
  return Object.assign({}, ...registries);
}

/**
 * Get the UI component for a tool by name from a registry.
 * Falls back to DefaultTool if no custom component exists.
 */
export function getToolComponent(toolName: string, registry: ToolUIRegistry): ToolUIComponent {
  return registry[toolName] || DefaultTool;
}
