'use client';

import { useCallback, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Node,
  Edge,
  Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useApp } from '@/context/AppContext';
import ERDNode from './nodes/ERDNode';
import UMLClassNode from './nodes/UMLClassNode';
import { LayoutGrid } from 'lucide-react';
import { t } from '@/lib/i18n';

const nodeTypes = {
  erd: ERDNode,
  uml: UMLClassNode,
};

const proOptions = { hideAttribution: true };

export default function DiagramCanvas() {
  const { nodes: ctxNodes, edges: ctxEdges, setNodes: ctxSetNodes, setEdges: ctxSetEdges, runAutoLayout, lang } = useApp();

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(ctxNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(ctxEdges);

  // Sync from context into local RF state when context changes
  useEffect(() => {
    setNodes(ctxNodes);
  }, [ctxNodes, setNodes]);

  useEffect(() => {
    setEdges(ctxEdges);
  }, [ctxEdges, setEdges]);

  // Propagate local RF changes back to context (so they persist)
  const handleNodesChange = useCallback(
    (changes: Parameters<typeof onNodesChange>[0]) => {
      onNodesChange(changes);
      // After position changes settle, sync back
      setNodes((current) => {
        ctxSetNodes(current);
        return current;
      });
    },
    [onNodesChange, setNodes, ctxSetNodes]
  );

  const handleEdgesChange = useCallback(
    (changes: Parameters<typeof onEdgesChange>[0]) => {
      onEdgesChange(changes);
      setEdges((current) => {
        ctxSetEdges(current);
        return current;
      });
    },
    [onEdgesChange, setEdges, ctxSetEdges]
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => {
        const next = addEdge({ ...connection, type: 'smoothstep', style: { stroke: '#4b5563' } }, eds);
        ctxSetEdges(next);
        return next;
      });
    },
    [setEdges, ctxSetEdges]
  );

  const isEmpty = nodes.length === 0;

  return (
    <div className="relative w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        proOptions={proOptions}
        fitView
        fitViewOptions={{ padding: 0.15, maxZoom: 1 }}
        minZoom={0.1}
        maxZoom={2.5}
        defaultEdgeOptions={{ type: 'smoothstep', animated: false }}
        style={{ background: '#080b14' }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1}
          color="#1f2937"
        />
        <Controls
          style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 8 }}
          showInteractive={false}
        />
        <MiniMap
          style={{ background: '#0d1117', border: '1px solid #1f2937' }}
          nodeColor={(n) => {
            const t = n.type;
            if (t === 'erd') return '#4f46e5';
            if (t === 'uml') return '#2563eb';
            return '#374151';
          }}
          maskColor="rgba(0,0,0,0.6)"
        />

        {/* Auto-layout button */}
        <Panel position="top-right">
          <button
            onClick={runAutoLayout}
            className="flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white transition-all"
            title={t(lang, 'autoLayout')}
          >
            <LayoutGrid size={14} />
            {t(lang, 'autoLayout')}
          </button>
        </Panel>

        {/* Empty state hint */}
        {isEmpty && (
          <Panel position="top-center">
            <div className="mt-16 flex flex-col items-center gap-2 text-center pointer-events-none select-none">
              <div className="text-4xl opacity-20">⬡</div>
              <p className="text-sm text-gray-500">Use the chat panel to generate a diagram</p>
            </div>
          </Panel>
        )}
      </ReactFlow>
    </div>
  );
}
