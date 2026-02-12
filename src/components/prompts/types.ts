export interface Node {
  id: string;
  type: 'system' | 'user';
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  content: string;
  hidden?: boolean; // For system messages - hidden from users but visible to AI
}

export interface Connection {
  id: string;
  sourceId: string; // Node ID
  targetId: string; // Node ID
}

export interface NodeComponentProps {
  node: Node;
  onUpdate: (id: string, updates: Partial<Node>) => void;
  onDelete: (id: string) => void;
  isMobile: boolean;
  onConnectionStart?: (nodeId: string) => void;
  isConnecting?: boolean;
}

export interface PromptNodeDialogProps {
  open: boolean;
  node: Node;
  onClose: () => void;
  onSave: (id: string, updates: Partial<Node>) => void;
}
