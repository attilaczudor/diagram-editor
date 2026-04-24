'use client';

import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { ERDNodeData } from '@/types';
import { KeyRound, Link } from 'lucide-react';

function ERDNode({ data, selected }: NodeProps) {
  const { label, attributes } = data as ERDNodeData;

  return (
    <div
      className={`erd-node ${selected ? 'erd-node--selected' : ''}`}
      style={{ minWidth: 220 }}
    >
      {/* Connection handles */}
      <Handle type="target" position={Position.Left} style={{ background: '#6366f1', border: '2px solid #1e1b4b' }} />
      <Handle type="source" position={Position.Right} style={{ background: '#6366f1', border: '2px solid #1e1b4b' }} />
      <Handle type="target" position={Position.Top} style={{ background: '#6366f1', border: '2px solid #1e1b4b' }} />
      <Handle type="source" position={Position.Bottom} style={{ background: '#6366f1', border: '2px solid #1e1b4b' }} />

      {/* Header */}
      <div className="erd-node__header">
        <span className="erd-node__title">{label}</span>
      </div>

      {/* Attributes */}
      {attributes.length > 0 && (
        <div className="erd-node__body">
          {attributes.map((attr, i) => (
            <div
              key={`${attr.name}-${i}`}
              className={`erd-node__row ${attr.isPK ? 'erd-node__row--pk' : ''} ${attr.isFK ? 'erd-node__row--fk' : ''}`}
            >
              <div className="erd-node__row-icon">
                {attr.isPK && <KeyRound size={11} className="text-yellow-400" />}
                {attr.isFK && !attr.isPK && <Link size={11} className="text-blue-400" />}
              </div>
              <span className="erd-node__row-type">{attr.type}</span>
              <span className="erd-node__row-name">{attr.name}</span>
              {(attr.isPK || attr.isFK || attr.isUnique) && (
                <span className="erd-node__row-badge">
                  {attr.isPK ? 'PK' : attr.isFK ? 'FK' : 'UK'}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default memo(ERDNode);
