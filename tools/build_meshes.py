#!/usr/bin/env python3
"""Génère les maillages 3D des structures cérébrales à partir de l'atlas
Desikan-Killiany (aparc+aseg, cvs_avg35_inMNI152, FreeSurfer 6.0) distribué
dans le paquet PyPI `atlasreader`.

Sortie :
  data/meshes.bin   positions (uint16 quantifiées) + indices (uint16)
  data/meshes.json  index : clé, hémisphère, décalages, centre, boîte englobante

Dépendances : numpy scipy scikit-image nibabel trimesh fast-simplification
Usage : python3 tools/build_meshes.py [chemin/vers/atlas_desikan_killiany.nii.gz]
"""
import io
import json
import os
import subprocess
import sys
import tempfile
import zipfile

import fast_simplification
import nibabel as nib
import numpy as np
import trimesh
from scipy import ndimage
from skimage import measure

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(ROOT, "data")

# label FreeSurfer -> (clé, hémisphère)  ; hémisphère : L, R ou M (médian)
SUBCORTICAL = {
    2: ("CerebralWhiteMatter", "L"), 41: ("CerebralWhiteMatter", "R"),
    4: ("LateralVentricle", "L"), 43: ("LateralVentricle", "R"),
    5: ("InfLatVent", "L"), 44: ("InfLatVent", "R"),
    7: ("CerebellumWhiteMatter", "L"), 46: ("CerebellumWhiteMatter", "R"),
    8: ("CerebellumCortex", "L"), 47: ("CerebellumCortex", "R"),
    10: ("Thalamus", "L"), 49: ("Thalamus", "R"),
    11: ("Caudate", "L"), 50: ("Caudate", "R"),
    12: ("Putamen", "L"), 51: ("Putamen", "R"),
    13: ("Pallidum", "L"), 52: ("Pallidum", "R"),
    14: ("ThirdVentricle", "M"), 15: ("FourthVentricle", "M"),
    16: ("BrainStem", "M"),
    17: ("Hippocampus", "L"), 53: ("Hippocampus", "R"),
    18: ("Amygdala", "L"), 54: ("Amygdala", "R"),
    26: ("Accumbens", "L"), 58: ("Accumbens", "R"),
    28: ("VentralDC", "L"), 60: ("VentralDC", "R"),
    85: ("OpticChiasm", "M"),
    251: ("CC_Posterior", "M"), 252: ("CC_MidPosterior", "M"),
    253: ("CC_Central", "M"), 254: ("CC_MidAnterior", "M"),
    255: ("CC_Anterior", "M"),
}

CORTICAL = [
    "bankssts", "caudalanteriorcingulate", "caudalmiddlefrontal", None,
    "cuneus", "entorhinal", "fusiform", "inferiorparietal", "inferiortemporal",
    "isthmuscingulate", "lateraloccipital", "lateralorbitofrontal", "lingual",
    "medialorbitofrontal", "middletemporal", "parahippocampal", "paracentral",
    "parsopercularis", "parsorbitalis", "parstriangularis", "pericalcarine",
    "postcentral", "posteriorcingulate", "precentral", "precuneus",
    "rostralanteriorcingulate", "rostralmiddlefrontal", "superiorfrontal",
    "superiorparietal", "superiortemporal", "supramarginal", "frontalpole",
    "temporalpole", "transversetemporal", "insula",
]

LABELS = dict(SUBCORTICAL)
for i, name in enumerate(CORTICAL, start=1):
    if name:
        LABELS[1000 + i] = (name, "L")
        LABELS[2000 + i] = (name, "R")

# Paramètres par type de structure : (sigma du lissage gaussien, seuil, nb max de triangles)
def params(key):
    if key == "CerebralWhiteMatter":
        return 1.0, 0.5, 30000
    if key.startswith("CC_") or key in ("OpticChiasm",):
        return 0.8, 0.4, 2500
    if key in ("CerebellumCortex",):
        return 0.9, 0.45, 22000
    if key in LABELS_CORTICAL_KEYS:
        return 0.75, 0.38, 9000
    return 0.9, 0.45, 7000


LABELS_CORTICAL_KEYS = {n for n in CORTICAL if n}


def fetch_atlas():
    """Télécharge atlasreader depuis PyPI et extrait l'atlas en mémoire."""
    tmp = tempfile.mkdtemp()
    subprocess.check_call([sys.executable, "-m", "pip", "download", "--no-deps",
                           "atlasreader==0.3.2", "-d", tmp, "-q"])
    whl = [f for f in os.listdir(tmp) if f.endswith(".whl")][0]
    with zipfile.ZipFile(os.path.join(tmp, whl)) as z:
        data = z.read("atlasreader/data/atlases/atlas_desikan_killiany.nii.gz")
    path = os.path.join(tmp, "atlas_desikan_killiany.nii.gz")
    with open(path, "wb") as f:
        f.write(data)
    return path


# labels dans lesquels le ruban cortical peut être épaissi (fond, substance blanche)
CORTEX_GROW_INTO = (0, 2, 41)


def build_mesh(vol, label, affine, sigma, level, max_faces):
    mask = vol == label
    if not mask.any():
        return None
    if label >= 1000:
        # le ruban cortical fait 2-3 voxels : on l'épaissit d'un voxel vers la
        # substance blanche et l'extérieur pour éviter les trous après lissage
        grow = ndimage.binary_dilation(mask) & np.isin(vol, CORTEX_GROW_INTO)
        mask = mask | grow
    idx = np.argwhere(mask)
    lo = np.maximum(idx.min(0) - 4, 0)
    hi = np.minimum(idx.max(0) + 5, vol.shape)
    crop = mask[lo[0]:hi[0], lo[1]:hi[1], lo[2]:hi[2]].astype(np.float32)
    crop = np.pad(crop, 2)
    sm = ndimage.gaussian_filter(crop, sigma)
    if sm.max() <= level:
        level = sm.max() * 0.6
    verts, faces, _, _ = measure.marching_cubes(sm, level)
    verts = verts + lo - 2
    verts = nib.affines.apply_affine(affine, verts)
    mesh = trimesh.Trimesh(verts, faces, process=True)
    # retire les petits fragments isolés
    parts = mesh.split(only_watertight=False)
    if len(parts) > 1:
        sizes = np.array([len(p.faces) for p in parts])
        keep = [p for p, s in zip(parts, sizes) if s >= max(60, 0.02 * sizes.max())]
        mesh = trimesh.util.concatenate(keep)
    trimesh.smoothing.filter_taubin(mesh, lamb=0.5, nu=-0.53, iterations=12)
    if len(mesh.faces) > max_faces:
        v, f = fast_simplification.simplify(
            mesh.vertices.astype(np.float32), mesh.faces.astype(np.int32),
            target_reduction=1 - max_faces / len(mesh.faces))
        mesh = trimesh.Trimesh(v, f, process=True)
    # MNI (x droite, y antérieur, z supérieur) -> three.js (x, y haut, z)
    # rotation propre : (x, z, -y)
    v = mesh.vertices
    v = np.stack([v[:, 0], v[:, 2], -v[:, 1]], axis=1)
    centroid = np.argwhere(vol == label).mean(0)
    c = nib.affines.apply_affine(affine, centroid)
    c = [float(c[0]), float(c[2]), float(-c[1])]
    return v.astype(np.float32), mesh.faces.astype(np.uint32), c


def main():
    path = sys.argv[1] if len(sys.argv) > 1 else fetch_atlas()
    img = nib.load(path)
    vol = np.asarray(img.dataobj).astype(np.int32)
    affine = img.affine

    os.makedirs(OUT_DIR, exist_ok=True)
    buf = io.BytesIO()
    index = []
    total_faces = 0
    for label in sorted(LABELS):
        key, hemi = LABELS[label]
        sigma, level, max_faces = params(key)
        res = build_mesh(vol, label, affine, sigma, level, max_faces)
        if res is None:
            print("absent :", label, key)
            continue
        v, f, c = res
        bmin, bmax = v.min(0), v.max(0)
        span = np.maximum(bmax - bmin, 1e-6)
        q = np.round((v - bmin) / span * 65535).astype(np.uint16)
        pos_off = buf.tell()
        buf.write(q.tobytes())
        idx_off = buf.tell()
        assert len(v) < 65536
        buf.write(f.astype(np.uint16).tobytes())
        total_faces += len(f)
        index.append({
            "id": f"{key}_{hemi}", "key": key, "hemi": hemi, "label": label,
            "posOffset": pos_off, "vertCount": int(len(v)),
            "idxOffset": idx_off, "triCount": int(len(f)),
            "min": [round(float(x), 3) for x in bmin],
            "max": [round(float(x), 3) for x in bmax],
            "center": [round(x, 2) for x in c],
        })
        # aligne sur 4 octets
        pad = (-buf.tell()) % 4
        buf.write(b"\0" * pad)
        print(f"{label:5d} {key:28s} {hemi} {len(f):6d} triangles")

    with open(os.path.join(OUT_DIR, "meshes.bin"), "wb") as fh:
        fh.write(buf.getvalue())
    with open(os.path.join(OUT_DIR, "meshes.json"), "w") as fh:
        json.dump({"source": "Desikan-Killiany aparc+aseg, cvs_avg35_inMNI152 (FreeSurfer 6.0)",
                   "space": "MNI152 (mm), axes three.js = (x, z, -y)",
                   "structures": index}, fh, separators=(",", ":"))
    print(f"{len(index)} structures, {total_faces} triangles, "
          f"{buf.tell() / 1e6:.2f} Mo")


if __name__ == "__main__":
    main()
