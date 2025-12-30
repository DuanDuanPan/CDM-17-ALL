/**
 * Clipboard hooks and utilities.
 * Story 7.4: Extracted from useClipboard for single responsibility.
 */

export { serializeSelection } from './clipboardSerializer';
export type { SerializeSelectionOptions } from './clipboardSerializer';

export { pasteFromClipboard } from './clipboardPaste';
export type { PasteOptions } from './clipboardPaste';

export { cutToClipboard, findAllDescendants } from './clipboardCut';
export type { CutOptions } from './clipboardCut';

export { softDeleteNodes, hardDeleteNodes } from './clipboardDelete';
export type { DeleteNodesOptions, HardDeleteNodesOptions } from './clipboardDelete';
