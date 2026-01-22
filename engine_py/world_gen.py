import sys
import struct
import math

# Constants
CHUNK_SIZE = 32
VOXEL_AIR = 0
VOXEL_STONE = 1
VOXEL_DIRT = 2
VOXEL_GRASS = 3

def noise(x, z):
    # Simple pseudo-random noise
    n = math.sin(x * 0.1 + z * 0.1) * 2 + math.cos(x * 0.3 + z * 0.2) * 2
    return int(n)

def generate_chunk(x_off, y_off, z_off, seed):
    # Flattened array: 32*32*32 = 32768 integers
    voxels = []
    
    BASE_HEIGHT = 10 # Lift world so Y=0 is deep underground
    
    for lx in range(CHUNK_SIZE):
        for ly in range(CHUNK_SIZE):
            for lz in range(CHUNK_SIZE):
                wx = x_off * CHUNK_SIZE + lx
                wy = y_off * CHUNK_SIZE + ly
                wz = z_off * CHUNK_SIZE + lz
                
                # Heightmap
                h = BASE_HEIGHT + noise(wx, wz)
                
                block_id = VOXEL_AIR
                
                if wy < h - 3:
                     block_id = VOXEL_STONE
                elif wy < h:
                     block_id = VOXEL_DIRT
                elif wy == h:
                     block_id = VOXEL_GRASS
                
                # Solid bedrock at Y=0 prevents falling through if Y-offset goes low
                if wy == 0:
                    block_id = VOXEL_STONE

                voxels.append(block_id)
                
    return voxels

def run_loop():
    # Input format: 4 integers (4 bytes each) = 16 bytes
    # x, y, z, seed (Big Endian)
    header_struct = struct.Struct('>iiii')
    
    while True:
        try:
            data = sys.stdin.buffer.read(16)
            if not data or len(data) < 16:
                break
                
            x, y, z, seed = header_struct.unpack(data)
            
            # Generate
            voxels = generate_chunk(x, y, z, seed)
            
            # Serialize: 32768 * 2 bytes (Uint16) = 65KB uncompressed
            # For simplicity in Phase 1, we send raw Uint16 array
            out_data = struct.pack(f'>{len(voxels)}H', *voxels)
            
            # Output format:
            # [Size: 4 bytes] [Payload: N bytes]
            size_header = struct.pack('>I', len(out_data))
            
            sys.stdout.buffer.write(size_header)
            sys.stdout.buffer.write(out_data)
            sys.stdout.buffer.flush()
            
        except Exception as e:
            sys.stderr.write(f"Error: {e}\n")
            sys.stderr.flush()

if __name__ == "__main__":
    run_loop()
