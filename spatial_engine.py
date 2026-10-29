"""
Project: GeoSentinel Spatial Engine
Core Algorithms: 
  - Ray-Casting Algorithm for Point-in-Polygon (PIP)
  - Haversine Great-Circle Geodesic Distance
  - Anomaly Kinematics Filter for GPS Spoofing Detection
"""

import math

def ray_casting_pip(point, polygon):
    """
    Determines if point (lat, lng) is inside an n-sided arbitrary polygon.
    Based on Jordan Curve Theorem (counting horizontal ray intersections).
    """
    lat, lng = point
    inside = False
    n = len(polygon)
    
    j = n - 1
    for i in range(n):
        xi, yi = polygon[i]
        xj, yj = polygon[j]
        
        intersect = ((yi > lng) != (yj > lng)) and \
                    (lat < (xj - xi) * (lng - yi) / (yj - yi) + xi)
        if intersect:
            inside = not inside
        j = i
        
    return inside

def haversine_distance_km(lat1, lon1, lat2, lon2):
    """Calculates spherical distance between two geodesic coordinates."""
    R = 6371.0 # Earth's radius in kilometers
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

# 1. Define Restricted Zone Polygon (e.g. Airport Airspace)
restricted_zone = [
    (28.6250, 77.2000),
    (28.6300, 77.2250),
    (28.6100, 77.2350),
    (28.6000, 77.2100)
]

# 2. Test Targets
target_inside = (28.6150, 77.2150)
target_outside = (28.5900, 77.1900)

print(f"Target Inside Test: {ray_casting_pip(target_inside, restricted_zone)} (Expected: True)")
print(f"Target Outside Test: {ray_casting_pip(target_outside, restricted_zone)} (Expected: False)")

# 3. Test Impossible Kinematic Velocity (GPS Spoofing Jump)
dist = haversine_distance_km(28.6139, 77.2090, 19.0760, 72.8777)
print(f"\nDistance between Delhi and Mumbai: {dist:.2f} km")
if dist > 500:
    print("Verdict: Teleportation Anomaly Flagged. Unrealistic physical velocity detected.")
