import Dagre from '@dagrejs/dagre';
import { Node, Edge } from '@xyflow/react';

export type LayoutDirection = 'TB' | 'LR' | 'BT' | 'RL';

interface LayoutOptions {
  direction?: LayoutDirection;
  rankSep?: number;
  nodeSep?: number;
}

export function applyAutoLayout(
  nodes: Node[],
  edges: Edge[],
  options: LayoutOptions = {}
): { nodes: Node[]; edges: Edge[] } {
  if (!nodes.length) return { nodes, edges };

  const { direction = 'LR', rankSep = 100, nodeSep = 60 } = options;

  const g = new Dagre.graphlib.Graph({ compound: false, multigraph: true });
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: direction, ranksep: rankSep, nodesep: nodeSep, marginx: 40, marginy: 40 });

  nodes.forEach((node) => {
    const w = (node.width ?? node.measured?.width ?? 248) as number;
    const h = (node.height ?? node.measured?.height ?? 120) as number;
    g.setNode(node.id, { width: w, height: h });
  });

  edges.forEach((edge, i) => {
    g.setEdge(edge.source, edge.target, {}, `${edge.id}-${i}`);
  });

  Dagre.layout(g);

  const layoutedNodes = nodes.map((node) => {
    const placed = g.node(node.id);
    if (!placed) return node;
    const w = (node.width ?? node.measured?.width ?? 248) as number;
    const h = (node.height ?? node.measured?.height ?? 120) as number;
    return {
      ...node,
      position: {
        x: placed.x - w / 2,
        y: placed.y - h / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
}
