/**
 * ArtifactContext
 *
 * Global state management for artifacts.
 * Replaces chat-sdk's SWR-based useArtifact hook with React Context.
 *
 * Supports multiple concurrent document streams by tracking each document
 * independently via streamingDocsRef, then displaying the most recent one
 * in the artifact panel.
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  type ReactNode,
  type Dispatch,
  type SetStateAction,
} from 'react';
import {
  type UIArtifact,
  type ArtifactDataType,
  type ArtifactKind,
  initialArtifact,
  isArtifactDataType,
  extractDataValue,
} from '../lib/artifacts/types';

/**
 * Stored document data
 */
interface StoredDocument {
  id: string;
  title: string;
  kind: ArtifactKind;
  content: string;
  language?: string;
}

/**
 * Streaming document state (tracked per-document)
 */
interface StreamingDocument {
  id: string;
  title: string;
  kind: ArtifactKind;
  content: string;
  language?: string;
  status: 'streaming' | 'idle';
}

/**
 * Context value interface
 */
interface ArtifactContextValue {
  /** Current artifact state */
  artifact: UIArtifact;
  /** Update artifact state */
  setArtifact: Dispatch<SetStateAction<UIArtifact>>;
  /** Artifact-specific metadata (generic) */
  metadata: any;
  /** Update metadata */
  setMetadata: Dispatch<SetStateAction<any>>;
  /** Show the artifact panel */
  showArtifact: () => void;
  /** Hide the artifact panel */
  hideArtifact: () => void;
  /** Process a streaming data part */
  processStreamPart: (part: any) => void;
  /** Reset artifact to initial state */
  resetArtifact: () => void;
  /** Get a stored document by ID */
  getDocument: (id: string) => StoredDocument | undefined;
  /** Get a streaming document by ID or title (for concurrent stream support) */
  getStreamingDocument: (idOrTitle: string) => StreamingDocument | undefined;
  /** Open the first completed document (call when streaming ends) */
  openFirstDocument: () => void;
}

const ArtifactContext = createContext<ArtifactContextValue | null>(null);

/**
 * ArtifactProvider component
 * Wrap your app with this to enable artifact functionality
 */
export function ArtifactProvider({ children }: { children: ReactNode }) {
  const [artifact, setArtifact] = useState<UIArtifact>(initialArtifact);
  const [metadata, setMetadata] = useState<any>(null);

  // Store completed documents by ID for retrieval after streaming completes
  const documentsRef = useRef<Map<string, StoredDocument>>(new Map());

  // Track streaming documents by ID to handle concurrent streams
  const streamingDocsRef = useRef<Map<string, StreamingDocument>>(new Map());

  // Track which document ID was most recently updated (for panel display)
  const lastActiveDocIdRef = useRef<string | null>(null);

  // Track document IDs in the order they were created (for auto-open first)
  const documentOrderRef = useRef<string[]>([]);

  const showArtifact = useCallback(() => {
    setArtifact((prev) => ({ ...prev, isVisible: true }));
  }, []);

  const hideArtifact = useCallback(() => {
    setArtifact((prev) => ({ ...prev, isVisible: false }));
  }, []);

  const resetArtifact = useCallback(() => {
    setArtifact(initialArtifact);
    setMetadata(null);
    streamingDocsRef.current.clear();
    lastActiveDocIdRef.current = null;
    documentOrderRef.current = [];
  }, []);

  const getDocument = useCallback((id: string): StoredDocument | undefined => {
    return documentsRef.current.get(id);
  }, []);

  const getStreamingDocument = useCallback((idOrTitle: string): StreamingDocument | undefined => {
    // First try by ID
    const byId = streamingDocsRef.current.get(idOrTitle);
    if (byId) return byId;

    // Then search by title
    for (const doc of streamingDocsRef.current.values()) {
      if (doc.title === idOrTitle) return doc;
    }
    return undefined;
  }, []);

  /**
   * Open the first document created in this session
   * Call this when streaming completes to auto-open the panel
   */
  const openFirstDocument = useCallback(() => {
    const firstDocId = documentOrderRef.current[0];
    if (!firstDocId) return;

    const doc = documentsRef.current.get(firstDocId);
    if (doc) {
      setArtifact({
        documentId: doc.id,
        title: doc.title,
        kind: doc.kind,
        content: doc.content,
        language: doc.language,
        status: 'idle',
        isVisible: true,
      });
    }
    // Clear the order tracking for next message
    documentOrderRef.current = [];
  }, []);

  /**
   * Update the visible artifact state from a streaming document
   */
  const updateArtifactFromStreamingDoc = useCallback(
    (doc: StreamingDocument, isVisible?: boolean) => {
      setArtifact((prev) => ({
        documentId: doc.id,
        title: doc.title,
        kind: doc.kind,
        content: doc.content,
        language: doc.language,
        status: doc.status,
        isVisible: isVisible ?? prev.isVisible,
      }));
    },
    []
  );

  /**
   * Helper to extract docId from compound data format
   */
  const getDocIdFromData = (data: any): string | undefined => {
    if (data && typeof data === 'object' && 'docId' in data) {
      return data.docId;
    }
    return undefined;
  };

  /**
   * Process incoming stream parts for artifact data
   * Uses docId from compound data format to support concurrent document streams
   */
  const processStreamPart = useCallback(
    (part: any) => {
      if (!isArtifactDataType(part)) return;

      const dataPart = part as ArtifactDataType;

      switch (dataPart.type) {
        case 'data-id': {
          // New document starting - create entry in streaming map
          // data-id's data IS the document ID (not compound format)
          const newDocId = dataPart.data as string;
          lastActiveDocIdRef.current = newDocId;

          if (!streamingDocsRef.current.has(newDocId)) {
            streamingDocsRef.current.set(newDocId, {
              id: newDocId,
              title: '',
              kind: 'text',
              content: '',
              status: 'streaming',
            });
            // Track document order for auto-open first
            documentOrderRef.current.push(newDocId);
          }

          // Update artifact metadata (but don't auto-show panel)
          const doc = streamingDocsRef.current.get(newDocId)!;
          updateArtifactFromStreamingDoc(doc);
          break;
        }

        case 'data-title': {
          const { value, docId } = extractDataValue(dataPart.data);
          const targetId = docId || lastActiveDocIdRef.current;
          if (targetId && streamingDocsRef.current.has(targetId)) {
            const doc = streamingDocsRef.current.get(targetId)!;
            doc.title = value;
            updateArtifactFromStreamingDoc(doc);
          }
          break;
        }

        case 'data-kind': {
          const { value, docId } = extractDataValue(dataPart.data);
          const targetId = docId || lastActiveDocIdRef.current;
          if (targetId && streamingDocsRef.current.has(targetId)) {
            const doc = streamingDocsRef.current.get(targetId)!;
            doc.kind = value;
            updateArtifactFromStreamingDoc(doc);
          }
          break;
        }

        case 'data-language': {
          const { value, docId } = extractDataValue(dataPart.data);
          const targetId = docId || lastActiveDocIdRef.current;
          if (targetId && streamingDocsRef.current.has(targetId)) {
            const doc = streamingDocsRef.current.get(targetId)!;
            doc.language = value;
            updateArtifactFromStreamingDoc(doc);
          }
          break;
        }

        case 'data-clear': {
          // data-clear uses { docId } format when docId is present
          const targetId = getDocIdFromData(dataPart.data) || lastActiveDocIdRef.current;
          if (targetId && streamingDocsRef.current.has(targetId)) {
            const doc = streamingDocsRef.current.get(targetId)!;
            doc.content = '';
            doc.status = 'streaming';
            updateArtifactFromStreamingDoc(doc);
          }
          break;
        }

        case 'data-textDelta':
        case 'data-codeDelta': {
          const { value, docId } = extractDataValue(dataPart.data);
          const targetId = docId || lastActiveDocIdRef.current;
          if (targetId && streamingDocsRef.current.has(targetId)) {
            const doc = streamingDocsRef.current.get(targetId)!;
            // REPLACE content (not append) - each delta contains full content
            // This matches chat-sdk's behavior for handling concurrent streams
            doc.content = value;
            doc.status = 'streaming';
            // Don't auto-show panel during streaming - wait until end
            updateArtifactFromStreamingDoc(doc);
          }
          break;
        }

        case 'data-finish': {
          // data-finish uses { docId } format when docId is present
          const targetId = getDocIdFromData(dataPart.data) || lastActiveDocIdRef.current;
          if (targetId && streamingDocsRef.current.has(targetId)) {
            const doc = streamingDocsRef.current.get(targetId)!;
            doc.status = 'idle';

            // Store completed document for later retrieval
            if (doc.content) {
              documentsRef.current.set(targetId, {
                id: doc.id,
                title: doc.title,
                kind: doc.kind,
                content: doc.content,
                language: doc.language,
              });
            }

            updateArtifactFromStreamingDoc(doc);

            // Clean up streaming entry
            streamingDocsRef.current.delete(targetId);
            if (lastActiveDocIdRef.current === targetId) {
              lastActiveDocIdRef.current = null;
            }
          }
          break;
        }
      }
    },
    [updateArtifactFromStreamingDoc]
  );

  const value: ArtifactContextValue = {
    artifact,
    setArtifact,
    metadata,
    setMetadata,
    showArtifact,
    hideArtifact,
    processStreamPart,
    resetArtifact,
    getDocument,
    getStreamingDocument,
    openFirstDocument,
  };

  return (
    <ArtifactContext.Provider value={value}>{children}</ArtifactContext.Provider>
  );
}

/**
 * useArtifact hook
 * Access artifact state from any component
 */
export function useArtifact() {
  const context = useContext(ArtifactContext);
  if (!context) {
    throw new Error('useArtifact must be used within an ArtifactProvider');
  }
  return context;
}
