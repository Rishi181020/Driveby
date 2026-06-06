import * as THREE from 'three';
import { mercatorScale } from './sfLayer.js';

export class RoadGraph {
  constructor(roads) {
    this.nodes = [];       // Array of THREE.Vector3
    this.adjacency = [];   // Node Index -> Array of neighbor indices
    
    this._buildGraph(roads);
    console.log(`[RoadGraph] Extracted ${this.nodes.length} nodes with road connectivity.`);
  }

  _buildGraph(roads) {
    const m = mercatorScale();
    const threshold = 14.0 * m; // Merge vertices within 14 meters to connect junctions across wide streets

    for (const polyline of roads) {
      let prevIdx = -1;
      
      for (const pt of polyline) {
        let nodeIdx = this._findCloseNode(pt, threshold);
        
        if (nodeIdx === -1) {
          this.nodes.push(pt.clone());
          nodeIdx = this.nodes.length - 1;
          this.adjacency.push([]);
        }
        
        if (prevIdx !== -1 && prevIdx !== nodeIdx) {
          // Add bidirectional edge
          if (!this.adjacency[prevIdx].includes(nodeIdx)) {
            this.adjacency[prevIdx].push(nodeIdx);
          }
          if (!this.adjacency[nodeIdx].includes(prevIdx)) {
            this.adjacency[nodeIdx].push(prevIdx);
          }
        }
        
        prevIdx = nodeIdx;
      }
    }
  }

  _findCloseNode(pt, threshold) {
    for (let i = 0; i < this.nodes.length; i++) {
      if (this.nodes[i].distanceTo(pt) < threshold) {
        return i;
      }
    }
    return -1;
  }

  // A* Pathfinding from node index A to node index B
  findPath(startIdx, endIdx) {
    if (startIdx < 0 || startIdx >= this.nodes.length || endIdx < 0 || endIdx >= this.nodes.length) {
      return null;
    }

    const openSet = [startIdx];
    const cameFrom = new Map();

    const gScore = new Map();
    gScore.set(startIdx, 0.0);

    const fScore = new Map();
    fScore.set(startIdx, this.nodes[startIdx].distanceTo(this.nodes[endIdx]));

    while (openSet.length > 0) {
      let current = openSet[0];
      let lowestF = fScore.get(current) ?? Infinity;
      let lowestIdx = 0;

      for (let i = 1; i < openSet.length; i++) {
        const f = fScore.get(openSet[i]) ?? Infinity;
        if (f < lowestF) {
          lowestF = f;
          current = openSet[i];
          lowestIdx = i;
        }
      }

      if (current === endIdx) {
        // Reconstruct path
        const path = [current];
        while (cameFrom.has(current)) {
          current = cameFrom.get(current);
          path.unshift(current);
        }
        return path.map(idx => this.nodes[idx]);
      }

      // Remove current from openSet
      openSet.splice(lowestIdx, 1);

      const neighbors = this.adjacency[current] || [];
      for (const neighbor of neighbors) {
        const dist = this.nodes[current].distanceTo(this.nodes[neighbor]);
        const tentativeG = (gScore.get(current) ?? 0) + dist;

        if (tentativeG < (gScore.get(neighbor) ?? Infinity)) {
          cameFrom.set(neighbor, current);
          gScore.set(neighbor, tentativeG);
          fScore.set(neighbor, tentativeG + this.nodes[neighbor].distanceTo(this.nodes[endIdx]));

          if (!openSet.includes(neighbor)) {
            openSet.push(neighbor);
          }
        }
      }
    }

    return null; // Path not found
  }

  getRandomNodeIdx() {
    return Math.floor(Math.random() * this.nodes.length);
  }

  // BFS search to find all reachable nodes from a starting index
  _getReachableNodes(startIdx) {
    const visited = new Set();
    const queue = [startIdx];
    visited.add(startIdx);

    while (queue.length > 0) {
      const curr = queue.shift();
      const neighbors = this.adjacency[curr] || [];
      for (const n of neighbors) {
        if (!visited.has(n)) {
          visited.add(n);
          queue.push(n);
        }
      }
    }
    return Array.from(visited);
  }

  getValidRoute() {
    let tries = 100;
    const m = mercatorScale();
    const minDistance = 150.0 * m; // Guarantee paths are at least 150 meters long

    while (tries-- > 0) {
      const startIdx = this.getRandomNodeIdx();
      
      // Perform a BFS to gather all connected road vertices
      const reachable = this._getReachableNodes(startIdx);
      if (reachable.length < 15) continue; // Skip small, disconnected segments

      // Filter nodes in the same component that are far enough away
      const farNodes = reachable.filter(idx => this.nodes[startIdx].distanceTo(this.nodes[idx]) > minDistance);
      if (farNodes.length === 0) continue;

      const endIdx = farNodes[Math.floor(Math.random() * farNodes.length)];
      const path = this.findPath(startIdx, endIdx);
      if (path && path.length >= 5) {
        return { startIdx, endIdx, path };
      }
    }
    
    // Fallback if component routing fails: connect start and a distant node index
    return { 
      startIdx: 0, 
      endIdx: Math.min(20, this.nodes.length - 1), 
      path: [this.nodes[0], this.nodes[Math.min(20, this.nodes.length - 1)]] 
    };
  }
}

// Samples a path into exactly count waypoints using linear interpolation
export function samplePathToWaypoints(path, count = 20) {
  if (!path || path.length === 0) return [];
  if (path.length === 1) return Array(count).fill().map(() => path[0].clone());

  const segments = [];
  let totalLength = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i];
    const b = path[i + 1];
    const len = a.distanceTo(b);
    segments.push({ a, b, len, startDist: totalLength });
    totalLength += len;
  }

  const step = totalLength / (count - 1);
  const waypoints = [];

  for (let i = 0; i < count; i++) {
    const targetDist = i * step;
    
    let seg = segments[segments.length - 1];
    for (let j = 0; j < segments.length; j++) {
      if (targetDist <= segments[j].startDist + segments[j].len) {
        seg = segments[j];
        break;
      }
    }
    
    const t = seg.len > 0 ? (targetDist - seg.startDist) / seg.len : 0;
    const pt = new THREE.Vector3().lerpVectors(seg.a, seg.b, t);
    waypoints.push(pt);
  }

  return waypoints;
}
