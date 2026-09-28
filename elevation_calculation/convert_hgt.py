import numpy as np
import struct
import os
import gzip
import shutil
import urllib.request

def ensure_hgt_file(tile_name):
    dir_path = os.path.dirname(__file__)
    hgt_path = os.path.join(dir_path, f"{tile_name}.hgt")
    gz_path = os.path.join(dir_path, f"{tile_name}.hgt.gz")
    
    if os.path.exists(hgt_path):
        return hgt_path
        
    if os.path.exists(gz_path):
        print(f"Extracting existing {tile_name}.hgt.gz...")
        with gzip.open(gz_path, 'rb') as f_in, open(hgt_path, 'wb') as f_out:
            shutil.copyfileobj(f_in, f_out)
        return hgt_path
        
    url = f"https://s3.amazonaws.com/elevation-tiles-prod/skadi/N18/{tile_name}.hgt.gz"
    print(f"Downloading {tile_name}.hgt.gz from AWS...")
    urllib.request.urlretrieve(url, gz_path)
    print(f"Extracting {gz_path}...")
    with gzip.open(gz_path, 'rb') as f_in, open(hgt_path, 'wb') as f_out:
        shutil.copyfileobj(f_in, f_out)
    return hgt_path

def load_hgt(hgt_file):
    num_samples = 3601
    with open(hgt_file, 'rb') as f:
        data = f.read()
    values = struct.unpack(f'>{num_samples*num_samples}h', data)
    arr = np.array(values).reshape((num_samples, num_samples))
    return np.where(arr == -32768, 0, arr)

def convert_and_save():
    hgt73_path = ensure_hgt_file('N18E073')
    hgt74_path = ensure_hgt_file('N18E074')
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

