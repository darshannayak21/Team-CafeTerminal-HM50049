import urllib.request
import gzip
import shutil
import os

print('Downloading...')
urllib.request.urlretrieve('https://s3.amazonaws.com/elevation-tiles-prod/skadi/N18/N18E073.hgt.gz', 'N18E073.hgt.gz')
print('Extracting...')
with gzip.open('N18E073.hgt.gz', 'rb') as f_in, open('N18E073.hgt', 'wb') as f_out:
    shutil.copyfileobj(f_in, f_out)
    
print('Downloading N18E074...')
urllib.request.urlretrieve('https://s3.amazonaws.com/elevation-tiles-prod/skadi/N18/N18E074.hgt.gz', 'N18E074.hgt.gz')
print('Extracting...')
with gzip.open('N18E074.hgt.gz', 'rb') as f_in, open('N18E074.hgt', 'wb') as f_out:
    shutil.copyfileobj(f_in, f_out)
print('Done!')
