/**
 * Artifact Registry
 *
 * Defines artifact types and their configurations.
 * Following chat-sdk's Artifact class pattern.
 */

import type { Dispatch, SetStateAction } from 'react';
import { extractDataValue } from '@chat-sdk-expo/artifacts';
import type { ArtifactKind, ArtifactDataType, UIArtifact } from '@chat-sdk-expo/artifacts';
import type { ArtifactDefinition } from './types';

// Import content components from shared UI package
import { TextContent, CodeContent } from '@chat-sdk-expo/ui/artifacts';

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
 * All artifact definitions
 */
export const artifactDefinitions: ArtifactDefinition[] = [
  textArtifact,
  codeArtifact,
];

/**
 * Map artifact kinds to their definitions
 */
export const artifactDefinitionsByKind: Record<ArtifactKind, ArtifactDefinition> = {
  text: textArtifact,
  code: codeArtifact,
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
