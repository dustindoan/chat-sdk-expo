/**
 * Artifacts Components
 *
 * ArtifactPanel stays local (depends on app-specific ArtifactContext).
 * All other artifact UI components are re-exported from @chat-sdk-expo/ui.
 */

export { ArtifactPanel } from './ArtifactPanel';
export {
  ArtifactHeader,
  TextContent,
  CodeContent,
  DocumentPreview,
  DiffView,
  VersionNavigation,
  VersionFooter,
} from '@chat-sdk-expo/ui/artifacts';
