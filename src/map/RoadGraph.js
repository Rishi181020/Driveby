import * as THREE from 'three';
<<<<<<< HEAD
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
        
=======
import { worldToMapbox } from './sfLayer.js';

const ROUTE_COORDS = [
  [
    [-122.4005, 37.7916],
    [-122.3988, 37.7916],
    [-122.3975, 37.7916],
    [-122.3962, 37.7924],
    [-122.3968, 37.7940],
    [-122.3972, 37.7955],
    [-122.3983, 37.7948],
    [-122.3997, 37.7943],
    [-122.4000, 37.7945],
    [-122.4005, 37.7916],
  ],
  [
    [-122.3988, 37.7916],
    [-122.3995, 37.7930],
    [-122.3980, 37.7935],
    [-122.3985, 37.7950],
    [-122.3983, 37.7948],
  ],
  [
    [-122.3975, 37.7916],
    [-122.3978, 37.7928],
    [-122.3970, 37.7953],
    [-122.3958, 37.7960],
  ],
  [
    [-122.4005, 37.7916],
    [-122.3993, 37.7922],
    [-122.4010, 37.7938],
    [-122.4002, 37.7963],
  ],
];

export class RoadGraph {
  constructor(routes = ROUTE_COORDS) {
    this.nodes = [];
    this.adjacency = [];
    this._buildGraph(routes.map((route) => route.map(([lng, lat]) => worldToMapbox(lng, lat, 0))));

    if (this.nodes.length < 2) {
      throw new Error('RoadGraph requires at least two road nodes.');
    }
  }

  _buildGraph(roads) {
    const threshold = 8;

    for (const polyline of roads) {
      let prevIdx = -1;

      for (const pt of polyline) {
        let nodeIdx = this._findCloseNode(pt, threshold);

>>>>>>> origin/ui-merged
        if (nodeIdx === -1) {
          this.nodes.push(pt.clone());
          nodeIdx = this.nodes.length - 1;
          this.adjacency.push([]);
        }
<<<<<<< HEAD
        
        if (prevIdx !== -1 && prevIdx !== nodeIdx) {
          // Add bidirectional edge
          if (!this.adjacency[prevIdx].includes(nodeIdx)) {
            this.adjacency[prevIdx].push(nodeIdx);
          }
          if (!this.adjacency[nodeIdx].includes(prevIdx)) {
            this.adjacency[nodeIdx].push(prevIdx);
          }
        }
        
=======

        if (prevIdx !== -1 && prevIdx !== nodeIdx) {
          if (!this.adjacency[prevIdx].includes(nodeIdx)) this.adjacency[prevIdx].push(nodeIdx);
          if (!this.adjacency[nodeIdx].includes(prevIdx)) this.adjacency[nodeIdx].push(prevIdx);
        }

>>>>>>> origin/ui-merged
        prevIdx = nodeIdx;
      }
    }
  }

  _findCloseNode(pt, threshold) {
    for (let i = 0; i < this.nodes.length; i++) {
<<<<<<< HEAD
      if (this.nodes[i].distanceTo(pt) < threshold) {
        return i;
      }
=======
      if (this.nodes[i].distanceTo(pt) < threshold) return i;
>>>>>>> origin/ui-merged
    }
    return -1;
  }

<<<<<<< HEAD
  // A* Pathfinding from node index A to node index B
  findPath(startIdx, endIdx) {
    if (startIdx < 0 || startIdx >= this.nodes.length || endIdx < 0 || endIdx >= this.nodes.length) {
      return null;
=======
  findPath(startIdx, endIdx) {
    if (startIdx < 0 || startIdx >= this.nodes.length || endIdx < 0 || endIdx >= this.nodes.length) {
      throw new Error(`Invalid RoadGraph path indices: ${startIdx} -> ${endIdx}.`);
>>>>>>> origin/ui-merged
    }

    const openSet = [startIdx];
    const cameFrom = new Map();
<<<<<<< HEAD

    const gScore = new Map();
    gScore.set(startIdx, 0.0);

    const fScore = new Map();
    fScore.set(startIdx, this.nodes[startIdx].distanceTo(this.nodes[endIdx]));
=======
    const gScore = new Map([[startIdx, 0]]);
    const fScore = new Map([[startIdx, this.nodes[startIdx].distanceTo(this.nodes[endIdx])]]);
>>>>>>> origin/ui-merged

    while (openSet.length > 0) {
      let current = openSet[0];
      let lowestF = fScore.get(current) ?? Infinity;
      let lowestIdx = 0;

      for (let i = 1; i < openSet.length; i++) {
        const f = fScore.get(openSet[i]) ?? Infinity;
        if (f < lowestF) {
<<<<<<< HEAD
          lowestF = f;
          current = openSet[i];
=======
          current = openSet[i];
          lowestF = f;
>>>>>>> origin/ui-merged
          lowestIdx = i;
        }
      }

      if (current === endIdx) {
<<<<<<< HEAD
        // Reconstruct path
=======
>>>>>>> origin/ui-merged
        const path = [current];
        while (cameFrom.has(current)) {
          current = cameFrom.get(current);
          path.unshift(current);
        }
<<<<<<< HEAD
        return path.map(idx => this.nodes[idx]);
      }

      // Remove current from openSet
      openSet.splice(lowestIdx, 1);

      const neighbors = this.adjacency[current] || [];
      for (const neighbor of neighbors) {
        const dist = this.nodes[current].distanceTo(this.nodes[neighbor]);
        const tentativeG = (gScore.get(current) ?? 0) + dist;

=======
        return path.map((idx) => this.nodes[idx]);
      }

      openSet.splice(lowestIdx, 1);

      for (const neighbor of this.adjacency[current]) {
        const tentativeG = (gScore.get(current) ?? 0) + this.nodes[current].distanceTo(this.nodes[neighbor]);
>>>>>>> origin/ui-merged
        if (tentativeG < (gScore.get(neighbor) ?? Infinity)) {
          cameFrom.set(neighbor, current);
          gScore.set(neighbor, tentativeG);
          fScore.set(neighbor, tentativeG + this.nodes[neighbor].distanceTo(this.nodes[endIdx]));
<<<<<<< HEAD

          if (!openSet.includes(neighbor)) {
            openSet.push(neighbor);
          }
=======
          if (!openSet.includes(neighbor)) openSet.push(neighbor);
>>>>>>> origin/ui-merged
        }
      }
    }

<<<<<<< HEAD
    return null; // Path not found
=======
    throw new Error(`RoadGraph could not find a path from node ${startIdx} to node ${endIdx}.`);
>>>>>>> origin/ui-merged
  }

  getRandomNodeIdx() {
    return Math.floor(Math.random() * this.nodes.length);
  }

<<<<<<< HEAD
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
=======
  getValidRoute() {
    for (let tries = 0; tries < 100; tries++) {
      const startIdx = this.getRandomNodeIdx();
      const endIdx = this.getRandomNodeIdx();
      if (startIdx === endIdx) continue;
      if (this.nodes[startIdx].distanceTo(this.nodes[endIdx]) <= 60) continue;

      const path = this.findPath(startIdx, endIdx);
      if (path.length >= 2) return { startIdx, endIdx, path };
    }

    throw new Error('RoadGraph could not produce a valid route after 100 attempts.');
  }
}

export function samplePathToWaypoints(path, count = 20) {
  if (!Array.isArray(path) || path.length < 2) {
    throw new Error('samplePathToWaypoints requires a path with at least two points.');
  }
>>>>>>> origin/ui-merged

  const segments = [];
  let totalLength = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i];
    const b = path[i + 1];
    const len = a.distanceTo(b);
<<<<<<< HEAD
=======
    if (len <= 0) throw new Error(`RoadGraph path has a zero-length segment at index ${i}.`);
>>>>>>> origin/ui-merged
    segments.push({ a, b, len, startDist: totalLength });
    totalLength += len;
  }

  const step = totalLength / (count - 1);
  const waypoints = [];

  for (let i = 0; i < count; i++) {
    const targetDist = i * step;
<<<<<<< HEAD
    
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
=======
    const seg = segments.find((candidate) => targetDist <= candidate.startDist + candidate.len) ?? segments[segments.length - 1];
    const t = (targetDist - seg.startDist) / seg.len;
    waypoints.push(new THREE.Vector3().lerpVectors(seg.a, seg.b, t));
>>>>>>> origin/ui-merged
  }

  return waypoints;
}
