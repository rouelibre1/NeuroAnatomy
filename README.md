# Atlas cérébral 3D

Outil web pour apprendre le nom et la position des structures du cerveau humain.
Il affiche en 3D 103 structures (56 noms différents, côtés gauche et droit séparés).

## Fonctions

- **Clic sur une structure** : elle passe en surbrillance (couleur or, pulsation). Son nom s'affiche
  dans la scène, et une fiche donne sa catégorie, son hémisphère, une description et ses coordonnées MNI.
- **Survol** : le nom de la structure sous la souris apparaît en infobulle.
- **Liste par catégorie** (lobes, noyaux gris centraux, diencéphale, ventricules…) :
  - clic sur un nom : sélection des deux côtés ; boutons `G` / `D` : un seul côté ;
  - bouton ◎ : surligne toute la catégorie et affiche le nom de chaque structure ;
  - bouton œil : affiche ou masque.
- **Noms** : affiche l'étiquette de toutes les structures visibles depuis le point de vue courant
  (les structures cachées n'ont pas d'étiquette).
- **Autres structures** pendant une sélection : transparentes (pour voir une structure profonde
  dans son contexte), normales ou masquées.
- **Hémisphères** : masquer un côté pour voir la face médiale de l'autre.
- **Coupes** sagittale, coronale et axiale, avec un curseur de position.
- **Vues** : gauche, droite, avant, arrière, dessus, dessous.
- **Quiz** :
  - *Trouver* : cliquer sur la structure demandée.
  - *Nommer* : choisir le nom de la structure en surbrillance parmi 4 propositions.

  Les questions portent sur les structures visibles : masquez des catégories pour cibler la révision.

## Lancer en local

Les fichiers sont statiques, mais il faut un serveur web (le chargement ne marche pas en `file://`).

```bash
python3 -m http.server 8000
```

Puis ouvrir http://localhost:8000.

Pour mettre l'outil en ligne avec GitHub Pages : *Settings → Pages → Deploy from a branch*, puis choisir la branche et la racine `/`.

## Données anatomiques

Les maillages (`data/meshes.bin`, `data/meshes.json`) sont générés par `tools/build_meshes.py` à partir de
l'atlas **Desikan-Killiany + segmentation sous-corticale** de FreeSurfer 6.0 (`aparc+aseg` du cerveau moyen
`cvs_avg35_inMNI152`, distribué dans le paquet PyPI `atlasreader`). Pour chaque structure, le script applique
un lissage gaussien, puis les marching cubes, un lissage de Taubin et une décimation.

```bash
pip install numpy scipy scikit-image nibabel trimesh fast-simplification
python3 tools/build_meshes.py      # télécharge atlasreader depuis PyPI
```

Les noms français et les descriptions se trouvent dans `js/catalog.js`.

Limites de l'atlas :
- le tronc cérébral forme un seul bloc (mésencéphale, pont et bulbe ne sont pas séparés) ;
- l'hypothalamus fait partie du « diencéphale ventral » ;
- le découpage cortical suit les gyri de Desikan-Killiany (34 régions par hémisphère).

Références : Desikan et al., *NeuroImage* 31 (2006) 968-980 ; Fischl, *NeuroImage* 62 (2012) 774-781.
Licence des données : [FreeSurfer Software License](https://surfer.nmr.mgh.harvard.edu/fswiki/FreeSurferSoftwareLicense).

## Code tiers

`vendor/` contient three.js 0.170.0 (licence MIT, `vendor/three-LICENSE`). Dans
`vendor/addons/OrbitControls.js`, l'import `'three'` a été remplacé par un chemin relatif, pour que la page
fonctionne sans import map.
