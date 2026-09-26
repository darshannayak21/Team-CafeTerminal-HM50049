import numpy as np
import struct
import os

def load_hgt(hgt_file):
    num_samples = 3601
    with open(hgt_file, 'rb') as f:
        data = f.read()
    values = struct.unpack(f'>{num_samples*num_samples}h', data)
    arr = np.array(values).reshape((num_samples, num_samples))
    return np.where(arr == -32768, 0, arr)

def convert_and_save():
    hgt73_path = os.path.join(os.path.dirname(__file__), 'N18E073.hgt')
    hgt74_path = os.path.join(os.path.dirname(__file__), 'N18E074.hgt')
    npy_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'backend', 'data', 'pune_elevation_merged.npy')
    
    print("Loading N18E073...")
    data73 = load_hgt(hgt73_path)
    
    print("Loading N18E074...")
    data74 = load_hgt(hgt74_path)
    
    print("Merging arrays (73.0E to 75.0E)...")
    merged = np.hstack((data73[:, :-1], data74))
    
    print(f"Saving merged array of shape {merged.shape} to {npy_path}...")
    os.makedirs(os.path.dirname(npy_path), exist_ok=True)
    np.save(npy_path, merged)
    print("Conversion complete!")

if __name__ == "__main__":
    convert_and_save()
