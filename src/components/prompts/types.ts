export interface Node {
  id: string;
  type: 'system' | 'prompt';
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  content: string;
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
