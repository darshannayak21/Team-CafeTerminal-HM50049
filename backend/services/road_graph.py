"""Pune District Road Graph Service using NetworkX + osmnx.

Loads, caches, and maintains the live OpenStreetMap road network for Pune District
as a directed NetworkX graph. Each edge carries hazard attributes that are updated
in-memory as conditions change.
"""

import logging
import os
import pickle
import threading
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

import networkx as nx
import osmnx as ox

logger = logging.getLogger(__name__)

# Bounding box for central Pune
# (left, bottom, right, top) -> (min_lon, min_lat, max_lon, max_lat)
# Using: West, South, East, North
PUNE_CORE_BBOX = (73.70, 18.42, 74.00, 18.70) 

class RoadGraphManager:
    """Manages the in-memory NetworkX road graph for routing."""

    def __init__(self, cache_dir: str):
        self.cache_dir = cache_dir
        self.graph_path = os.path.join(self.cache_dir, "pune_road_graph.pkl")
        self.G: Optional[nx.MultiDiGraph] = None
        self._lock = threading.RLock()
        
        # Ensure cache dir exists
        os.makedirs(self.cache_dir, exist_ok=True)

    def load_graph(self) -> nx.MultiDiGraph:
        """Load the graph from pickle cache, or fetch from OSM if not found."""
        with self._lock:
            if self.G is not None:
                return self.G

            if os.path.exists(self.graph_path):
                logger.info("[RoadGraph] Loading graph from local pickle cache...")
                try:
                    with open(self.graph_path, "rb") as f:
                        self.G = pickle.load(f)
                    logger.info(f"[RoadGraph] Graph loaded. Nodes: {len(self.G.nodes)}, Edges: {len(self.G.edges)}")
                    return self.G
                except Exception as e:
                    logger.warning(f"[RoadGraph] Cache load failed: {e}. Re-fetching...")

            logger.info("[RoadGraph] Fetching graph from OSM (this may take a minute)...")
            
            # Use osmnx to fetch the drive network within the bounding box
            ox.settings.use_cache = True
            left, bottom, right, top = PUNE_CORE_BBOX
            
            try:
                # Need to use bounds in format (left, bottom, right, top)
                self.G = ox.graph_from_bbox(bbox=(left, bottom, right, top), network_type="drive", simplify=True)
                
                # Pre-calculate edge lengths and travel times if not present
                self.G = ox.add_edge_speeds(self.G)
                self.G = ox.add_edge_travel_times(self.G)
                
                # Initialize custom hazard attributes on all edges
                for u, v, key, data in self.G.edges(keys=True, data=True):
                    data["flood_penalty"] = 0.0
                    data["accessibility"] = "PASSABLE"
                    data["evidence"] = []
                    data["risk_score"] = 0.0
                    data["safety_status"] = "CLEAR"
                
                logger.info(f"[RoadGraph] Graph fetched from OSM. Nodes: {len(self.G.nodes)}, Edges: {len(self.G.edges)}")
                
                # Save to cache
                with open(self.graph_path, "wb") as f:
                    pickle.dump(self.G, f)
                    
            except Exception as e:
                logger.error(f"[RoadGraph] Failed to fetch graph from OSM: {e}")
                raise e

            return self.G

    def update_edge_hazards(self, u: int, v: int, key: int, risk_score: float, accessibility: str, evidence: List[str], safety_status: str):
        """Update the hazard attributes for a specific edge in-memory."""
        with self._lock:
            if self.G and self.G.has_edge(u, v, key):
                self.G[u][v][key]["risk_score"] = risk_score
                self.G[u][v][key]["accessibility"] = accessibility
                self.G[u][v][key]["evidence"] = evidence
                self.G[u][v][key]["safety_status"] = safety_status
                
                # Assign flood penalty multiplier based on accessibility
                # Normal travel time * (1 + penalty)
                penalty = 0.0
                if accessibility == "CONFIRMED_BLOCKED":
                    penalty = 1000000.0 # effectively impassable, but finite for Dijkstra math
                elif accessibility == "SUSPECT":
                    penalty = 5.0 # Very slow / dangerous
                elif accessibility == "ELEVATED_RISK":
                    penalty = 2.0 # Slow down
                
                self.G[u][v][key]["flood_penalty"] = penalty

    def reset_all_hazards(self):
        """Clear all temporary hazard data from the graph."""
        with self._lock:
            if not self.G:
                return
            for u, v, key, data in self.G.edges(keys=True, data=True):
                data["flood_penalty"] = 0.0
                data["accessibility"] = "PASSABLE"
                data["evidence"] = []
                data["risk_score"] = 0.0
                data["safety_status"] = "CLEAR"

    def get_nearest_node(self, lat: float, lon: float) -> int:
        """Find the nearest graph node to a lat/lon coordinate."""
        if self.G is None:
            self.load_graph()
        return ox.distance.nearest_nodes(self.G, X=lon, Y=lat)
        
    def get_route(self, origin_lat: float, origin_lon: float, dest_lat: float, dest_lon: float) -> Optional[List[int]]:
        """Calculate the shortest path considering hazard penalties."""
        with self._lock:
            if self.G is None:
                self.load_graph()
                
            orig_node = self.get_nearest_node(origin_lat, origin_lon)
            dest_node = self.get_nearest_node(dest_lat, dest_lon)
            
            # Weight function for A* / Dijkstra
            def weight_func(u, v, d):
                # We expect a MultiDiGraph, so d is a dict of edge keys -> attributes
                # Find the edge with the minimum cost
                min_cost = float('inf')
                for key, data in d.items():
                    base_time = data.get("travel_time", data.get("length", 1.0))
                    penalty = data.get("flood_penalty", 0.0)
                    cost = base_time * (1.0 + penalty)
                    if cost < min_cost:
                        min_cost = cost
                return min_cost
                
            try:
                # Use Dijkstra/A* with custom weight
                route = nx.shortest_path(self.G, orig_node, dest_node, weight=weight_func)
                return route
            except nx.NetworkXNoPath:
                logger.warning(f"[RoadGraph] No path found between {orig_node} and {dest_node}")
                return None
            except Exception as e:
                logger.error(f"[RoadGraph] Routing error: {e}")
                return None
                
    def get_route_geometry_and_stats(self, route_nodes: List[int]) -> Dict[str, Any]:
        """Convert a list of node IDs into lat/lon waypoints and aggregate stats."""
        if not route_nodes or self.G is None:
            return {"waypoints": [], "distance_m": 0.0, "duration_s": 0.0, "blocked_segments": 0, "avg_risk": 0.0, "evidence": []}
            
        waypoints = []
        distance_m = 0.0
        duration_s = 0.0
        blocked = 0
        total_risk = 0.0
        all_evidence = []
        
        # Add the first node's coordinate
        first_node = self.G.nodes[route_nodes[0]]
        waypoints.append([first_node["y"], first_node["x"]])
        
        for i in range(len(route_nodes) - 1):
            u = route_nodes[i]
            v = route_nodes[i+1]
            
            # Get the edge data for the chosen key (assuming minimum weight key)
            edge_data = min(self.G[u][v].values(), key=lambda d: d.get("travel_time", d.get("length", 1.0)) * (1.0 + d.get("flood_penalty", 0.0)))
            
            # Geometry: if the edge has a defined geometry, use its internal points
            if "geometry" in edge_data:
                # Shapely LineString -> list of (lon, lat)
                coords = list(edge_data["geometry"].coords)
                # Convert to (lat, lon) and skip the first point to avoid duplication
                waypoints.extend([[lat, lon] for lon, lat in coords[1:]])
            else:
                # Just use the target node's coordinate
                target_node = self.G.nodes[v]
                waypoints.append([target_node["y"], target_node["x"]])
                
            distance_m += edge_data.get("length", 0.0)
            duration_s += edge_data.get("travel_time", 0.0)
            
            risk = edge_data.get("risk_score", 0.0)
            total_risk += risk
            
            if edge_data.get("accessibility") == "CONFIRMED_BLOCKED":
                blocked += 1
                
            all_evidence.extend(edge_data.get("evidence", []))
            
        avg_risk = total_risk / max(1, len(route_nodes) - 1)
        unique_evidence = list(dict.fromkeys(all_evidence))[:10]
        
        return {
            "waypoints": waypoints,
            "distance_m": distance_m,
            "duration_s": duration_s,
            "blocked_segments_count": blocked,
            "overall_risk_score": avg_risk,
            "evidence_summary": unique_evidence,
        }

# Global instance
graph_manager = RoadGraphManager(cache_dir=os.path.join(os.path.dirname(__file__), "..", "data", "cache"))
