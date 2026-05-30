import bpy, sys
from pathlib import Path
path=Path(sys.argv[sys.argv.index('--')+1])
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete()
bpy.ops.import_scene.gltf(filepath=str(path))
for o in bpy.data.objects:
    print(o.name, o.type, 'loc', tuple(round(v,3) for v in o.location), 'scale', tuple(round(v,3) for v in o.scale), 'dim', tuple(round(v,3) for v in o.dimensions), 'parent', o.parent.name if o.parent else None)
    if o.type=='MESH':
        print('  verts', len(o.data.vertices), 'mats', [m.name if m else None for m in o.data.materials])
for m in bpy.data.materials:
    print('MAT', m.name, 'alpha', m.diffuse_color[3], 'blend', m.blend_method)
