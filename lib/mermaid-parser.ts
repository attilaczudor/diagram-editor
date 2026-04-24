import { Node, Edge, MarkerType } from '@xyflow/react';
import {
  DiagramType,
  ERDAttribute,
  ERDEdgeData,
  ERDNodeData,
  UMLAttribute,
  UMLClassNodeData,
  UMLEdgeData,
  UMLMethod,
  UMLRelType,
} from '@/types';

export interface ParseResult {
  diagramType: DiagramType;
  nodes: Node[];
  edges: Edge[];
}

// ─── Dimension estimates for dagre ───────────────────────────────────────────

const ERD_NODE_WIDTH = 248;
const ERD_ROW_HEIGHT = 28;
const ERD_HEADER_HEIGHT = 40;
const ERD_PADDING = 8;

const UML_NODE_WIDTH = 248;
const UML_ROW_HEIGHT = 24;
const UML_HEADER_HEIGHT = 44;
const UML_DIVIDER = 8;
const UML_PADDING = 8;

function erdNodeHeight(attrCount: number): number {
  return ERD_HEADER_HEIGHT + attrCount * ERD_ROW_HEIGHT + ERD_PADDING;
}

function umlNodeHeight(attrCount: number, methodCount: number): number {
  return (
    UML_HEADER_HEIGHT +
    attrCount * UML_ROW_HEIGHT +
    UML_DIVIDER +
    methodCount * UML_ROW_HEIGHT +
    UML_PADDING
  );
}

// ─── Entry point ─────────────────────────────────────────────────────────────

export function parseMermaid(code: string): ParseResult {
  const cleaned = code.trim();
  const lines = cleaned
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('%%'));

  if (!lines.length) return { diagramType: 'unknown', nodes: [], edges: [] };

  const first = lines[0].toLowerCase().replace(/\s+/g, '');

  if (first === 'erdiagram') return parseERD(lines.slice(1));
  if (first === 'classdiagram') return parseUML(lines.slice(1));

  return { diagramType: 'unknown', nodes: [], edges: [] };
}

// ─── ERD Parser ──────────────────────────────────────────────────────────────

interface ERDRelationship {
  from: string;
  to: string;
  relToken: string;
  label: string;
}

function parseERDAttributeLine(line: string): ERDAttribute | null {
  // Pattern: type name [PK|FK|UK] ["optional comment"]
  const match = line.match(
    /^(\w[\w<>[\]()]*)\s+([\w_]+)(?:\s+(PK|FK|UK)(?:,\s*(PK|FK|UK))?)?(?:\s+"[^"]*")?$/
  );
  if (!match) return null;

  const keys = [match[3], match[4]].filter(Boolean);
  return {
    type: match[1],
    name: match[2],
    isPK: keys.includes('PK'),
    isFK: keys.includes('FK'),
    isUnique: keys.includes('UK'),
  };
}

function parseERDCardinality(token: string): { left: string; right: string } {
  const parts = token.split('--');
  if (parts.length !== 2) return { left: '?', right: '?' };

  const card = (s: string): string => {
    const n = s.replace(/[^|o{}]/g, '');
    if (n === '||') return '1';
    if (n === '|o' || n === 'o|') return '0..1';
    if (n === '|{' || n === '{|' || n === '}|' || n === '|}') return '1..*';
    if (n === 'o{' || n === '{o' || n === '}o' || n === 'o}') return '0..*';
    return n || '?';
  };

  return { left: card(parts[0]), right: card(parts[1]) };
}

function parseERD(lines: string[]): ParseResult {
  const entities = new Map<string, ERDAttribute[]>();
  const relationships: ERDRelationship[] = [];
  let currentEntity: string | null = null;

  for (const line of lines) {
    if (currentEntity !== null) {
      if (line === '}') {
        currentEntity = null;
      } else {
        const attr = parseERDAttributeLine(line);
        if (attr) entities.get(currentEntity)?.push(attr);
      }
      continue;
    }

    // Relationship line: EntityA REL EntityB : "label"
    const relMatch = line.match(
      /^(\w[\w-]*)\s+([|o{}]+-{1,2}[|o{}]+)\s+(\w[\w-]*)\s*:\s*(.+)$/
    );
    if (relMatch) {
      const from = relMatch[1];
      const to = relMatch[3];
      relationships.push({
        from,
        to,
        relToken: relMatch[2],
        label: relMatch[4].trim().replace(/^["']|["']$/g, ''),
      });
      if (!entities.has(from)) entities.set(from, []);
      if (!entities.has(to)) entities.set(to, []);
      continue;
    }

    // Entity block start: EntityName {
    const entityMatch = line.match(/^(\w[\w-]*)\s*\{/);
    if (entityMatch) {
      const name = entityMatch[1];
      if (!entities.has(name)) entities.set(name, []);
      currentEntity = name;
    }
  }

  const nodes: Node<ERDNodeData>[] = [];
  entities.forEach((attributes, name) => {
    nodes.push({
      id: name,
      type: 'erd',
      position: { x: 0, y: 0 },
      data: { label: name, attributes, nodeType: 'erd' },
      width: ERD_NODE_WIDTH,
      height: erdNodeHeight(attributes.length),
    });
  });

  const edges: Edge<ERDEdgeData>[] = relationships.map((rel, i) => {
    const { left, right } = parseERDCardinality(rel.relToken);
    return {
      id: `e-${rel.from}-${rel.to}-${i}`,
      source: rel.from,
      target: rel.to,
      type: 'smoothstep',
      label: rel.label,
      data: { label: rel.label, leftCard: left, rightCard: right, relToken: rel.relToken },
      style: { stroke: '#4b5563', strokeWidth: 1.5 },
      labelStyle: { fill: '#d1d5db', fontSize: 11, fontFamily: 'monospace' },
      labelBgStyle: { fill: '#111827', fillOpacity: 0.85, rx: 4 },
      labelBgPadding: [4, 4] as [number, number],
      markerEnd: { type: MarkerType.Arrow, color: '#4b5563', width: 16, height: 16 },
    };
  });

  return { diagramType: 'erd', nodes, edges };
}

// ─── UML Parser ──────────────────────────────────────────────────────────────

interface UMLClassEntry {
  attributes: UMLAttribute[];
  methods: UMLMethod[];
  isInterface: boolean;
  isAbstract: boolean;
}

interface UMLRelationship {
  from: string;
  to: string;
  relType: UMLRelType;
  isDashed: boolean;
  label: string;
}

function parseUMLMember(
  str: string
): ({ isMethod: false } & UMLAttribute) | ({ isMethod: true } & UMLMethod) | null {
  const trimmed = str.trim();
  if (!trimmed || trimmed.startsWith('<<')) return null;

  const visMatch = trimmed.match(/^([+\-#~]?)\s*(.+)$/);
  if (!visMatch) return null;

  const visibility = (visMatch[1] || '+') as '+' | '-' | '#' | '~';
  const rest = visMatch[2].trim();

  // Method: name(params) [returnType] or name() [returnType]
  const methodMatch = rest.match(/^(\w+)\s*\(([^)]*)\)(?:\s+([\w<>[\], ]+))?(?:\s*\*)?$/);
  if (methodMatch) {
    return {
      isMethod: true,
      visibility,
      name: methodMatch[1],
      params: methodMatch[2].trim(),
      returnType: methodMatch[3]?.trim() || 'void',
      isStatic: rest.endsWith('$') || str.includes('<<static>>'),
      isAbstract: str.includes('*'),
    };
  }

  // Attribute: [type] name  OR  type name
  const attrMatch = rest.match(/^(\w[\w<>[\], ]*)\s+(\w+)$/) || rest.match(/^(\w+)$/);
  if (attrMatch) {
    if (attrMatch.length === 2) {
      // single token — treat as name with no type
      return { isMethod: false, visibility, type: '', name: attrMatch[1], isStatic: false };
    }
    return {
      isMethod: false,
      visibility,
      type: attrMatch[1].trim(),
      name: attrMatch[2].trim(),
      isStatic: false,
    };
  }

  return null;
}

function parseUMLRelationship(line: string): UMLRelationship | null {
  // Must contain -- or ..
  if (!line.includes('--') && !line.includes('..')) return null;

  const match = line.match(/^(\w+)\s+(.+?)\s+(\w+)(?:\s*:\s*(.*))?$/);
  if (!match) return null;

  const [, from, relToken, to, label = ''] = match;

  // Guard: don't mis-classify "ClassName : member" lines
  if (relToken === ':') return null;
  if (!relToken.includes('--') && !relToken.includes('..')) return null;

  const t = relToken.trim();
  let relType: UMLRelType = 'association';
  let isDashed = t.includes('..');

  if (t.includes('<|') || t.includes('|>')) {
    relType = 'inheritance';
  } else if (t.includes('*')) {
    relType = 'composition';
  } else if (t.match(/^o--|--o$/)) {
    relType = 'aggregation';
  } else if (t.includes('..|>') || t.includes('<|..')) {
    relType = 'realization';
    isDashed = true;
  } else if (isDashed && (t.includes('>') || t.includes('<'))) {
    relType = 'dependency';
  } else if (t === '--' || t === '..') {
    relType = 'link';
  } else if (t.includes('>') || t.includes('<')) {
    relType = 'association';
  }

  return { from, to, relType, isDashed, label: label.trim().replace(/^["']|["']$/g, '') };
}

const UML_EDGE_COLORS: Record<UMLRelType, string> = {
  inheritance: '#818cf8',
  composition: '#f472b6',
  aggregation: '#34d399',
  association: '#9ca3af',
  realization: '#60a5fa',
  dependency: '#fbbf24',
  link: '#6b7280',
};

function parseUML(lines: string[]): ParseResult {
  const classes = new Map<string, UMLClassEntry>();
  const relationships: UMLRelationship[] = [];
  let currentClass: string | null = null;

  const ensureClass = (name: string) => {
    if (!classes.has(name)) {
      classes.set(name, { attributes: [], methods: [], isInterface: false, isAbstract: false });
    }
  };

  for (const line of lines) {
    if (currentClass !== null) {
      if (line === '}') {
        currentClass = null;
        continue;
      }

      // Annotation inside class block
      if (line === '<<interface>>') {
        classes.get(currentClass)!.isInterface = true;
        continue;
      }
      if (line === '<<abstract>>') {
        classes.get(currentClass)!.isAbstract = true;
        continue;
      }

      const member = parseUMLMember(line);
      if (member) {
        const cls = classes.get(currentClass)!;
        if (member.isMethod) {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { isMethod, ...m } = member;
          cls.methods.push(m as UMLMethod);
        } else {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { isMethod, ...a } = member;
          cls.attributes.push(a as UMLAttribute);
        }
      }
      continue;
    }

    // class ClassName { or class ClassName["display"] {
    const classMatch = line.match(/^class\s+(\w+)(?:\s*\["[^"]*"\])?\s*(\{)?/);
    if (classMatch) {
      const name = classMatch[1];
      ensureClass(name);
      if (classMatch[2]) currentClass = name; // has opening brace
      continue;
    }

    // <<interface>> ClassName  or  <<abstract>> ClassName
    const annotationMatch = line.match(/^<<(\w+)>>\s+(\w+)/);
    if (annotationMatch) {
      const [, ann, name] = annotationMatch;
      ensureClass(name);
      if (ann === 'interface') classes.get(name)!.isInterface = true;
      if (ann === 'abstract') classes.get(name)!.isAbstract = true;
      continue;
    }

    // Standalone member: ClassName : member
    const standaloneMatch = line.match(/^(\w+)\s*:\s*(.+)$/);
    if (standaloneMatch) {
      const [, className, memberStr] = standaloneMatch;
      ensureClass(className);
      const member = parseUMLMember(memberStr);
      if (member) {
        const cls = classes.get(className)!;
        if (member.isMethod) {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { isMethod, ...m } = member;
          cls.methods.push(m as UMLMethod);
        } else {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { isMethod, ...a } = member;
          cls.attributes.push(a as UMLAttribute);
        }
      }
      continue;
    }

    // Relationship
    const rel = parseUMLRelationship(line);
    if (rel) {
      relationships.push(rel);
      ensureClass(rel.from);
      ensureClass(rel.to);
    }
  }

  const nodes: Node<UMLClassNodeData>[] = [];
  classes.forEach((cls, name) => {
    nodes.push({
      id: name,
      type: 'uml',
      position: { x: 0, y: 0 },
      data: {
        label: name,
        attributes: cls.attributes,
        methods: cls.methods,
        nodeType: 'uml',
        isInterface: cls.isInterface,
        isAbstract: cls.isAbstract,
      },
      width: UML_NODE_WIDTH,
      height: umlNodeHeight(cls.attributes.length, cls.methods.length),
    });
  });

  const edges: Edge<UMLEdgeData>[] = relationships.map((rel, i) => {
    const color = UML_EDGE_COLORS[rel.relType];
    return {
      id: `e-${rel.from}-${rel.to}-${i}`,
      source: rel.from,
      target: rel.to,
      type: 'smoothstep',
      label: rel.label || undefined,
      data: { label: rel.label, relType: rel.relType, isDashed: rel.isDashed },
      style: {
        stroke: color,
        strokeWidth: 1.5,
        strokeDasharray: rel.isDashed ? '6 3' : undefined,
      },
      labelStyle: { fill: color, fontSize: 11 },
      labelBgStyle: { fill: '#111827', fillOpacity: 0.85, rx: 4 },
      labelBgPadding: [4, 4] as [number, number],
      markerEnd: {
        type: rel.relType === 'composition' ? MarkerType.ArrowClosed : MarkerType.Arrow,
        color,
        width: 18,
        height: 18,
      },
    };
  });

  return { diagramType: 'uml', nodes, edges };
}
