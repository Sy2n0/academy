import { createContext, useContext } from 'react';

export type ToolPanel = {
  /** Human label for the panel header. */
  title: string;
  /** Page to load in the panel iframe. */
  url: string;
  /** Called when the viewer closes the panel — tear the session down here. */
  onClose?: () => void | Promise<void>;
};

type ToolPanelApi = {
  open: (panel: ToolPanel) => void;
  close: () => void;
  /** The panel currently shown, if any. */
  current: ToolPanel | null;
};

/**
 * Lets content rendered inside a module's markdown open the page's split panel.
 *
 * Blocks like the terminal are rendered many levels below the page that owns
 * the split view, and passing callbacks down through the markdown renderer is
 * not possible — the content is parsed into fragments at runtime.
 *
 * Null outside a module page; consumers fall back to a new tab.
 */
export const ToolPanelContext = createContext<ToolPanelApi | null>(null);

export function useToolPanel() {
  return useContext(ToolPanelContext);
}
