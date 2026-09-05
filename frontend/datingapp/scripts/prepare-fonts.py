"""One-off asset preparation: pip install fonttools brotli, then run from the frontend root.

Retains basic Latin, punctuation and the weights used by the English website.
Font licences are shipped alongside the generated assets. Not needed for ordinary builds.
"""
from pathlib import Path
import re
import urllib.request
from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

output = Path('public/fonts')
output.mkdir(parents=True, exist_ok=True)
for family, filename, source in [
    ('DynaPuff', 'dynapuff', 'https://raw.githubusercontent.com/google/fonts/main/ofl/dynapuff/DynaPuff%5Bwdth,wght%5D.ttf'),
    ('Playpen Sans', 'playpen-sans', 'https://raw.githubusercontent.com/google/fonts/main/ofl/playpensans/PlaypenSans%5Bwght%5D.ttf'),
]:
    data = urllib.request.urlopen(source, timeout=30).read()
    original = Path('tmp') / (filename + '.ttf')
    original.write_bytes(data)
    font = TTFont(original)
    axes = {axis.axisTag: axis for axis in font['fvar'].axes}
    limits = {'wght': (400, 700)}
    if 'wdth' in axes:
        limits['wdth'] = axes['wdth'].defaultValue
    options = subset.Options()
    options.flavor = 'woff2'
    options.layout_features = ['*']
    subsetter = subset.Subsetter(options=options)
    ranges = [(0, 0x100), (0x2000, 0x2070), (0x20A0, 0x20D0), (0x2100, 0x2200)]
    subsetter.populate(unicodes=[code for start, end in ranges for code in range(start, end)])
    subsetter.subset(font)
    font = instantiateVariableFont(font, limits, inplace=True)
    font.flavor = 'woff2'
    font.save(output / (filename + '-latin.woff2'))
    license_url = source.rsplit('/', 1)[0] + '/OFL.txt'
    (output / (filename + '-OFL.txt')).write_bytes(urllib.request.urlopen(license_url, timeout=30).read())
    print(f'{family}: {len(data)} -> {(output / (filename + "-latin.woff2")).stat().st_size} bytes')
