/**
 * Artifact Registry
 *
 * Defines artifact types and their configurations.
 * Following chat-sdk's Artifact class pattern.
 */

import type {
  ArtifactDefinition,
  ArtifactKind,
  ArtifactDataType,
  UIArtifact,
} from './types';
import { extractDataValue } from './types';
import type { Dispatch, SetStateAction } from 'react';

// Import content components (to be created)
import { TextContent } from '../../components/artifacts/TextContent';
import { CodeContent } from '../../components/artifacts/CodeContent';

/**
 * Text artifact definition
 * For written content like essays, stories, emails
 */
export const textArtifact: ArtifactDefinition<'text'> = {
  kind: 'text',
  description: 'Create text documents like essays, stories, emails, or documentation',
  content: TextContent,
  actions: [
    {
      id: 'copy',
      label: 'Copy',
      icon: 'copy',
      execute: ({ copyToClipboard }) => {
        copyToClipboard();
      },
    },
  ],
  onStreamPart: ({ streamPart, setArtifact }) => {
    processTextStreamPart(streamPart, setArtifact);
  },
};

/**
 * Code artifact definition
 * For programming code with syntax highlighting
 */
export const codeArtifact: ArtifactDefinition<'code'> = {
  kind: 'code',
  description: 'Create code files with syntax highlighting',
  content: CodeContent,
  actions: [
    {
      id: 'copy',
      label: 'Copy',
      icon: 'copy',
      execute: ({ copyToClipboard }) => {
        copyToClipboard();
      },
    },
  ],
  onStreamPart: ({ streamPart, setArtifact }) => {
    processCodeStreamPart(streamPart, setArtifact);
  },
};

/**
 * Training block artifact definition
 * For structured workout training plans (JSON rendered as code)
 */
export const trainingBlockArtifact: ArtifactDefinition<'training-block'> = {
  kind: 'training-block',
  description: 'Create structured training blocks with weekly workout schedules',
  content: CodeContent, // Render JSON with syntax highlighting for now
  actions: [
    {
      id: 'copy',
      label: 'Copy',
      icon: 'copy',
      execute: ({ copyToClipboard }) => {
        copyToClipboard();
      },
    },
  ],
  onStreamPart: ({ streamPart, setArtifact }) => {
    processCodeStreamPart(streamPart, setArtifact);
  },
};

/**
 * All artifact definitions
 */
export const artifactDefinitions: ArtifactDefinition[] = [
  textArtifact,
  codeArtifact,
  trainingBlockArtifact,
];

/**
 * Map artifact kinds to their definitions
 */
export const artifactDefinitionsByKind: Record<ArtifactKind, ArtifactDefinition> = {
  text: textArtifact,
  code: codeArtifact,
  'training-block': trainingBlockArtifact,
};

/**
 * Get artifact definition by kind
 */
export function getArtifactDefinition(kind: ArtifactKind): ArtifactDefinition {
  return artifactDefinitionsByKind[kind] || textArtifact;
}

/**
 * Process text artifact stream parts
 */
function processTextStreamPart(
  streamPart: ArtifactDataType,
  setArtifact: Dispatch<SetStateAction<UIArtifact>>
) {
  switch (streamPart.type) {
    case 'data-textDelta': {
      const { value } = extractDataValue(streamPart.data);
      setArtifact((prev) => {
        const newContent = prev.content + value;
        return {
          ...prev,
          content: newContent,
          status: 'streaming',
          // Auto-show panel after sufficient content
          isVisible: newContent.length > 400 ? true : prev.isVisible,
        };
      });
      break;
    }
  }
}

/**
 * Process code artifact stream parts
 */
function processCodeStreamPart(
  streamPart: ArtifactDataType,
  setArtifact: Dispatch<SetStateAction<UIArtifact>>
) {
  switch (streamPart.type) {
    case 'data-codeDelta': {
      const { value } = extractDataValue(streamPart.data);
      setArtifact((prev) => {
        const newContent = prev.content + value;
        return {
          ...prev,
          content: newContent,
          status: 'streaming',
          // Auto-show panel after sufficient content
          isVisible: newContent.length > 200 ? true : prev.isVisible,
        };
      });
      break;
    }
    case 'data-language': {
      const { value } = extractDataValue(streamPart.data);
      setArtifact((prev) => ({
        ...prev,
        language: value,
      }));
      break;
    }
  }
}
