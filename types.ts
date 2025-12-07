export enum TreeState {
  CHAOS = 'CHAOS',
  FORMED = 'FORMED'
}

export interface HandData {
  gesture: 'OPEN' | 'CLOSED' | 'NONE';
  x: number; // 0 to 1
  y: number; // 0 to 1
}

export interface TreeConfig {
  foliageCount: number;
  ornamentCount: number;
  polaroidCount: number;
  treeHeight: number;
  treeRadius: number;
}