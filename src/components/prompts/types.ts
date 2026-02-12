export interface Node {
  id: string;
  type: 'system' | 'prompt' | 'user';
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  content: string;
  hidden?: boolean; // For system messages - hidden from users but visible to AI
}

export interface NodeComponentProps {
  node: Node;
  onUpdate: (id: string, updates: Partial<Node>) => void;
  onDelete: (id: string) => void;
  isMobile: boolean;
}

export interface PromptNodeDialogProps {
  open: boolean;
  node: Node;
  onClose: () => void;
  onSave: (id: string, updates: Partial<Node>) => void;
}
