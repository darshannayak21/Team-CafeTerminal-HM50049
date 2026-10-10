import sys
sys.path.insert(0, ".")
import unittest
from shapely.geometry import LineString
from backend.services.road_graph import graph_manager
import networkx as nx

class DummySTRtree:
    def __init__(self, incidents):
        self.incidents = incidents
        
    def query(self, geom):
        # returns indices of all incidents (just for mocking)
        return list(range(len(self.incidents)))

class TestTrafficRouting(unittest.TestCase):
    def setUp(self):
        self.G = nx.MultiDiGraph()
        # Path 1: 1 -> 2 -> 3 (Shorter length, but congested)
        self.G.add_node(1, x=73.8, y=18.5)
        self.G.add_node(2, x=73.81, y=18.51)
        self.G.add_node(3, x=73.82, y=18.52)
        
        # Path 2: 1 -> 4 -> 3 (Longer length, but free-flowing)
        self.G.add_node(4, x=73.81, y=18.49)
        
        self.G.add_edge(1, 2, key=0, length=1000, travel_time=100, flood_penalty=0.0)
        self.G.add_edge(2, 3, key=0, length=1000, travel_time=100, flood_penalty=0.0)
        
        self.G.add_edge(1, 4, key=0, length=2000, travel_time=200, flood_penalty=0.0)
        self.G.add_edge(4, 3, key=0, length=2000, travel_time=200, flood_penalty=0.0)
        
        graph_manager.G = self.G
        self.orig = 1
        self.dest = 3
        
        # Mock get_nearest_node
        graph_manager.get_nearest_node = lambda lat, lon: 1 if lat == 18.5 else 3

    def test_baseline_no_traffic(self):
        route = graph_manager.get_route(18.5, 73.8, 18.52, 73.82, traffic_data=None)
        # Should prefer Path 1 (travel time 200 vs 400)
        self.assertEqual(route, [1, 2, 3])
        
    def test_congested_route_vs_faster_alternative(self):
        # Traffic jam on 1 -> 2
        incidents = [
            {"id": "jam1", "delay": 500, "geometry": LineString([(73.8, 18.5), (73.81, 18.51)])}
        ]
        tree = DummySTRtree(incidents)
        route = graph_manager.get_route(18.5, 73.8, 18.52, 73.82, traffic_data=(incidents, tree))
        # Path 1 now costs 100 + 500 + 100 = 700. Path 2 costs 400.
        # Should prefer Path 2!
        self.assertEqual(route, [1, 4, 3])

    def test_fast_but_flood_blocked_road(self):
        # Path 1 has flood penalty on 1->2
        self.G[1][2][0]["flood_penalty"] = 10000.0
        # No traffic
        route = graph_manager.get_route(18.5, 73.8, 18.52, 73.82, traffic_data=None)
        self.assertEqual(route, [1, 4, 3])
        self.G[1][2][0]["flood_penalty"] = 0.0

    def test_flood_overrides_traffic(self):
        # Path 2 is faster under traffic (Path 1 is jammed)
        # BUT Path 2 is flooded!
        incidents = [
            {"id": "jam1", "delay": 500, "geometry": LineString([(73.8, 18.5), (73.81, 18.51)])}
        ]
        tree = DummySTRtree(incidents)
        self.G[1][4][0]["flood_penalty"] = 10000.0
        
        route = graph_manager.get_route(18.5, 73.8, 18.52, 73.82, traffic_data=(incidents, tree))
        # Path 2 is 400 * 10001 = 4000400.
        # Path 1 is 100 + 500 + 100 = 700.
        # Should prefer Path 1 despite traffic!
        self.assertEqual(route, [1, 2, 3])

if __name__ == '__main__':
    unittest.main()
