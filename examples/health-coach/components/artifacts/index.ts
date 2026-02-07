/**
 * Artifacts Components
 *
 * ArtifactPanel and ArtifactHeader stay local (app-specific extensions).
 * All other artifact UI components are re-exported from @chat-sdk-expo/ui.
 */

export { ArtifactPanel } from './ArtifactPanel';
export { ArtifactHeader } from './ArtifactHeader';
export { TrainingBlockContent } from './TrainingBlockContent';
export {
  TextContent,
  CodeContent,
  DocumentPreview,
  DiffView,
  VersionNavigation,
  VersionFooter,
} from '@chat-sdk-expo/ui/artifacts';
