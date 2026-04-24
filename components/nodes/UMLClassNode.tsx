'use client';

import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { UMLClassNodeData } from '@/types';

function visibilityIcon(v: string): string {
  if (v === '+') return '+';
  if (v === '-') return '−';
  if (v === '#') return '#';
  if (v === '~') return '~';
  return v;
}

function UMLClassNode({ data, selected }: NodeProps) {
  const { label, attributes, methods, isInterface, isAbstract } = data as UMLClassNodeData;

  return (
    <div
      className={`uml-node ${selected ? 'uml-node--selected' : ''} ${isInterface ? 'uml-node--interface' : ''}`}
      style={{ minWidth: 220 }}
    >
      <Handle type="target" position={Position.Left} style={{ background: '#3b82f6', border: '2px solid #1e3a5f' }} />
      <Handle type="source" position={Position.Right} style={{ background: '#3b82f6', border: '2px solid #1e3a5f' }} />
      <Handle type="target" position={Position.Top} style={{ background: '#3b82f6', border: '2px solid #1e3a5f' }} />
      <Handle type="source" position={Position.Bottom} style={{ background: '#3b82f6', border: '2px solid #1e3a5f' }} />

      {/* Header */}
      <div className="uml-node__header">
        {isInterface && <div className="uml-node__stereotype">«interface»</div>}
        {isAbstract && !isInterface && <div className="uml-node__stereotype">«abstract»</div>}
        <div className={`uml-node__title ${isAbstract && !isInterface ? 'italic' : ''}`}>
          {label}
        </div>
      </div>

      {/* Attributes section */}
      <div className="uml-node__section">
        {attributes.map((attr, i) => (
          <div key={`a-${i}`} className="uml-node__row">
            <span className="uml-node__visibility">{visibilityIcon(attr.visibility)}</span>
            {attr.type && <span className="uml-node__type">{attr.type}</span>}
            <span className="uml-node__name">{attr.name}</span>
          </div>
        ))}
        {attributes.length === 0 && (
          <div className="uml-node__empty">—</div>
        )}
      </div>

      {/* Divider */}
      <div className="uml-node__divider" />

      {/* Methods section */}
      <div className="uml-node__section">
        {methods.map((method, i) => (
          <div key={`m-${i}`} className={`uml-node__row ${method.isAbstract ? 'italic' : ''}`}>
            <span className="uml-node__visibility">{visibilityIcon(method.visibility)}</span>
            <span className="uml-node__name">{method.name}</span>
            <span className="uml-node__params">({method.params})</span>
            {method.returnType && method.returnType !== 'void' && (
              <span className="uml-node__return">: {method.returnType}</span>
            )}
          </div>
        ))}
        {methods.length === 0 && (
          <div className="uml-node__empty">—</div>
        )}
      </div>
    </div>
  );
}

export default memo(UMLClassNode);
