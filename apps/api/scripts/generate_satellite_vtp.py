import math
import os

def generate_satellite_vtp(output_path):
    # --- 1. Define Geometry (Box Body + 2 Solar Panels) ---
    # Body: 2x2x2 cube centered at origin
    # Solar Panels: 6x2 flat plates extending from X axis
    
    points = []
    
    # helper to add point
    def add_point(x, y, z):
        points.append((x, y, z))
        return len(points) - 1

    # --- Body Vertices (Cube) ---
    # z=1 face
    p0 = add_point(-1, -1, 1)
    p1 = add_point( 1, -1, 1)
    p2 = add_point( 1,  1, 1)
    p3 = add_point(-1,  1, 1)
    # z=-1 face
    p4 = add_point(-1, -1, -1)
    p5 = add_point( 1, -1, -1)
    p6 = add_point( 1,  1, -1)
    p7 = add_point(-1,  1, -1)

    # --- Solar Panel 1 (Left, -X side) ---
    # Extending from x=-1 to x=-7, width y=-1 to 1, z=0 plane (thin)
    # We make it slightly thick for visualization: z=-0.05 to 0.05
    sp1_min_x, sp1_max_x = -7.0, -1.0
    sp1_min_y, sp1_max_y = -1.0,  1.0
    sp1_z_thick = 0.05
    
    sp1_0 = add_point(sp1_min_x, sp1_min_y,  sp1_z_thick)
    sp1_1 = add_point(sp1_max_x, sp1_min_y,  sp1_z_thick)
    sp1_2 = add_point(sp1_max_x, sp1_max_y,  sp1_z_thick)
    sp1_3 = add_point(sp1_min_x, sp1_max_y,  sp1_z_thick)
    sp1_4 = add_point(sp1_min_x, sp1_min_y, -sp1_z_thick)
    sp1_5 = add_point(sp1_max_x, sp1_min_y, -sp1_z_thick)
    sp1_6 = add_point(sp1_max_x, sp1_max_y, -sp1_z_thick)
    sp1_7 = add_point(sp1_min_x, sp1_max_y, -sp1_z_thick)

    # --- Solar Panel 2 (Right, +X side) ---
    # Extending from x=1 to x=7
    sp2_min_x, sp2_max_x = 1.0, 7.0
    sp2_min_y, sp2_max_y = -1.0, 1.0
    sp2_z_thick = 0.05

    sp2_0 = add_point(sp2_min_x, sp2_min_y,  sp2_z_thick)
    sp2_1 = add_point(sp2_max_x, sp2_min_y,  sp2_z_thick)
    sp2_2 = add_point(sp2_max_x, sp2_max_y,  sp2_z_thick)
    sp2_3 = add_point(sp2_min_x, sp2_max_y,  sp2_z_thick)
    sp2_4 = add_point(sp2_min_x, sp2_min_y, -sp2_z_thick)
    sp2_5 = add_point(sp2_max_x, sp2_min_y, -sp2_z_thick)
    sp2_6 = add_point(sp2_max_x, sp2_max_y, -sp2_z_thick)
    sp2_7 = add_point(sp2_min_x, sp2_max_y, -sp2_z_thick)

    # --- Topology (Connectivity) ---
    polys = []
    
    # Helper for adding quad face
    def add_quad(idx0, idx1, idx2, idx3):
        polys.append([idx0, idx1, idx2, idx3])

    # Body Faces
    add_quad(p0, p1, p2, p3) # Front (+Z)
    add_quad(p5, p4, p7, p6) # Back (-Z)
    add_quad(p4, p5, p1, p0) # Bottom (-Y)
    add_quad(p3, p2, p6, p7) # Top (+Y)
    add_quad(p4, p0, p3, p7) # Left (-X)
    add_quad(p1, p5, p6, p2) # Right (+X)

    # SP1 Faces
    add_quad(sp1_0, sp1_1, sp1_2, sp1_3) # +Z
    add_quad(sp1_5, sp1_4, sp1_7, sp1_6) # -Z
    add_quad(sp1_4, sp1_5, sp1_1, sp1_0) # -Y
    add_quad(sp1_3, sp1_2, sp1_6, sp1_7) # +Y
    add_quad(sp1_4, sp1_0, sp1_3, sp1_7) # Left (-X side of panel)
    add_quad(sp1_1, sp1_5, sp1_6, sp1_2) # Right (+X side of panel)

    # SP2 Faces
    add_quad(sp2_0, sp2_1, sp2_2, sp2_3) # +Z
    add_quad(sp2_5, sp2_4, sp2_7, sp2_6) # -Z
    add_quad(sp2_4, sp2_5, sp2_1, sp2_0) # -Y
    add_quad(sp2_3, sp2_2, sp2_6, sp2_7) # +Y
    add_quad(sp2_4, sp2_0, sp2_3, sp2_7) # Left
    add_quad(sp2_1, sp2_5, sp2_6, sp2_2) # Right

    # --- 2. Calculate Data (Temperature) ---
    # Simulate a Sun Vector coming from (+1, +0.5, +1) direction (normalized)
    sun_x, sun_y, sun_z = 1.0, 0.5, 1.0
    norm = math.sqrt(sun_x**2 + sun_y**2 + sun_z**2)
    sun_vec = (sun_x/norm, sun_y/norm, sun_z/norm)

    temperatures = []
    min_temp = 200.0 # Kelvin (Shadow)
    max_temp = 350.0 # Kelvin (Sunlit)

    for px, py, pz in points:
        # Simple lighting model: dot product of position normal (approx for convex shapes) with sun vector
        # For a more "field-like" look, we can just use the dot product of the point coordinate direction
        # This makes one side of the satellite hot and the other cold.
        
        # Normalize point vector to get a direction
        p_norm = math.sqrt(px**2 + py**2 + pz**2)
        if p_norm == 0:
            dir_x, dir_y, dir_z = 0, 0, 1
        else:
            dir_x, dir_y, dir_z = px/p_norm, py/p_norm, pz/p_norm
        
        dot = dir_x*sun_vec[0] + dir_y*sun_vec[1] + dir_z*sun_vec[2]
        
        # Map dot product (-1 to 1) to temperature
        # -1 -> min_temp, 1 -> max_temp
        t = min_temp + (dot + 1.0) / 2.0 * (max_temp - min_temp)
        
        # Add some noise/variation based on component type?
        # Let's make solar panels slightly hotter on average if facing sun
        if abs(px) > 2.0: # Solar panel vertices
             t += 10.0 if dot > 0 else -10.0

        temperatures.append(f"{t:.2f}")

    # --- 3. Write VTP File (XML PolyData) ---
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write('<?xml version="1.0"?>\n')
        f.write('<VTKFile type="PolyData" version="0.1" byte_order="LittleEndian">\n')
        f.write('  <PolyData>\n')
        f.write(f'    <Piece NumberOfPoints="{len(points)}" NumberOfPolys="{len(polys)}">\n')
        
        # Points
        f.write('      <Points>\n')
        f.write('        <DataArray type="Float32" NumberOfComponents="3" format="ascii">\n')
        # format: x y z x y z ...
        coords_str = " ".join([f"{p[0]} {p[1]} {p[2]}" for p in points])
        f.write(f'          {coords_str}\n')
        f.write('        </DataArray>\n')
        f.write('      </Points>\n')
        
        # Polys (Connectivity)
        f.write('      <Polys>\n')
        f.write('        <DataArray type="Int32" Name="connectivity" format="ascii">\n')
        conn_str = " ".join([" ".join(map(str, poly)) for poly in polys])
        f.write(f'          {conn_str}\n')
        f.write('        </DataArray>\n')
        f.write('        <DataArray type="Int32" Name="offsets" format="ascii">\n')
        # offsets are cumulative counts: 4, 8, 12...
        offsets = []
        curr = 0
        for poly in polys:
            curr += len(poly)
            offsets.append(curr)
        offsets_str = " ".join(map(str, offsets))
        f.write(f'          {offsets_str}\n')
        f.write('        </DataArray>\n')
        f.write('      </Polys>\n')
        
        # Point Data (Temperature)
        f.write('      <PointData Scalars="Temperature">\n')
        f.write('        <DataArray type="Float32" Name="Temperature" format="ascii">\n')
        temp_str = " ".join(temperatures)
        f.write(f'          {temp_str}\n')
        f.write('        </DataArray>\n')
        f.write('      </PointData>\n')
        
        f.write('    </Piece>\n')
        f.write('  </PolyData>\n')
        f.write('</VTKFile>\n')

    print(f"Successfully generated VTP file at: {output_path}")

if __name__ == "__main__":
    target_file = "apps/web/public/mock/storage/热控系统温度场.vtp"
    abs_path = os.path.abspath(target_file)
    # Ensure directory exists
    os.makedirs(os.path.dirname(abs_path), exist_ok=True)
    generate_satellite_vtp(abs_path)
