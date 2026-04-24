import type { Node, Edge } from '@xyflow/react';

export type Lang = 'en' | 'hu';
export type ModelMode = 'cloud' | 'local';
export type DiagramType = 'erd' | 'uml' | 'unknown';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  mermaidCode?: string;
  timestamp: number;
  error?: boolean;
}

export interface Project {
  id: string;
  name: string;
  mermaidCode: string;
  nodes: Node[];
  edges: Edge[];
  chatHistory: ChatMessage[];
  preferredDiagramType: 'erd' | 'uml';
  pinned: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface ERDAttribute {
  name: string;
  type: string;
  isPK: boolean;
  isFK: boolean;
  isUnique: boolean;
}

export interface ERDNodeData extends Record<string, unknown> {
  label: string;
  attributes: ERDAttribute[];
  nodeType: 'erd';
}

export interface UMLAttribute {
  name: string;
  type: string;
  visibility: '+' | '-' | '#' | '~';
  isStatic: boolean;
}

export interface UMLMethod {
  name: string;
  params: string;
  returnType: string;
  visibility: '+' | '-' | '#' | '~';
  isStatic: boolean;
  isAbstract: boolean;
}

export interface UMLClassNodeData extends Record<string, unknown> {
  label: string;
  attributes: UMLAttribute[];
  methods: UMLMethod[];
  nodeType: 'uml';
  isInterface: boolean;
  isAbstract: boolean;
}

export interface ERDEdgeData extends Record<string, unknown> {
  label: string;
  leftCard: string;
  rightCard: string;
  relToken: string;
}

export interface UMLEdgeData extends Record<string, unknown> {
  label: string;
  relType: UMLRelType;
  isDashed: boolean;
}

export type UMLRelType =
  | 'inheritance'
  | 'composition'
  | 'aggregation'
  | 'association'
  | 'realization'
  | 'dependency'
  | 'link';
