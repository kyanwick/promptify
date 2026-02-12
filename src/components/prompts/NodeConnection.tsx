'use client';
import { Box } from '@mui/material';
import { Node, Connection } from './types';

interface NodeConnectionProps {
  connection: Connection;
  nodes: Node[];
  zoom: number;
}

export default function NodeConnection({ connection, nodes, zoom }: NodeConnectionProps) {
  const sourceNode = nodes.find((n) => n.id === connection.sourceId);
  const targetNode = nodes.find((n) => n.id === connection.targetId);

  if (!sourceNode || !targetNode) return null;

  // Calculate connection points (center bottom of source to center top of target)
  const sourceX = sourceNode.x + sourceNode.width / 2;
  const sourceY = sourceNode.y + sourceNode.height;
  const targetX = targetNode.x + targetNode.width / 2;
  const targetY = targetNode.y;

  // Create curved path for better visual flow
  const controlPointOffset = Math.abs(targetY - sourceY) * 0.5;
  const path = `M ${sourceX} ${sourceY} C ${sourceX} ${sourceY + controlPointOffset}, ${targetX} ${targetY - controlPointOffset}, ${targetX} ${targetY}`;

  return (
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    >
      <defs>
        <marker
          id={`arrowhead-${connection.id}`}
          markerWidth="10"
          markerHeight="10"
          refX="9"
          refY="3"
          orient="auto"
        >
          <polygon points="0 0, 10 3, 0 6" fill="#ffc600" />
        </marker>
      </defs>
      <path
        d={path}
        stroke="#ffc600"
        strokeWidth={3 / zoom}
        fill="none"
        markerEnd={`url(#arrowhead-${connection.id})`}
        strokeLinecap="round"
      />
    </svg>
  );
}
