// Catalogue des structures : nom français, catégorie, description courte.
// Les clés correspondent au champ « key » de data/meshes.json.

export const CATEGORIES = [
  { id: 'frontal',    name: 'Lobe frontal',                  color: '#e07a5f' },
  { id: 'parietal',   name: 'Lobe pariétal',                 color: '#5fa8d3' },
  { id: 'temporal',   name: 'Lobe temporal',                 color: '#81b29a' },
  { id: 'occipital',  name: 'Lobe occipital',                color: '#b48ead' },
  { id: 'limbic',     name: 'Lobe limbique',                 color: '#f2cc8f' },
  { id: 'insula',     name: 'Insula',                        color: '#e5989b' },
  { id: 'basal',      name: 'Noyaux gris centraux',          color: '#4f9d9d' },
  { id: 'dienc',      name: 'Diencéphale',                   color: '#c97b9b' },
  { id: 'limbicDeep', name: 'Système limbique (profond)',    color: '#d4a24c' },
  { id: 'ventricle',  name: 'Système ventriculaire',         color: '#6aa9e0' },
  { id: 'white',      name: 'Substance blanche et commissures', color: '#d9d4c7' },
  { id: 'hindbrain',  name: 'Tronc cérébral et cervelet',    color: '#a3a86b' },
];

// [nom, catégorie, description]
export const STRUCTURES = {
  // ---------- Lobe frontal ----------
  superiorfrontal: ['Gyrus frontal supérieur', 'frontal',
    "Partie la plus haute du lobe frontal, longeant la scissure interhémisphérique. Contient l'aire motrice supplémentaire ; impliqué dans la mémoire de travail et le contrôle de l'action."],
  rostralmiddlefrontal: ['Gyrus frontal moyen (partie rostrale)', 'frontal',
    "Partie antérieure du gyrus frontal moyen, cœur du cortex préfrontal dorsolatéral : planification, raisonnement, fonctions exécutives."],
  caudalmiddlefrontal: ['Gyrus frontal moyen (partie caudale)', 'frontal',
    "Partie postérieure du gyrus frontal moyen, juste en avant du gyrus précentral. Contient le champ oculomoteur frontal (mouvements volontaires des yeux)."],
  parsopercularis: ['Pars operculaire (gyrus frontal inférieur)', 'frontal',
    "Partie postérieure du gyrus frontal inférieur. Avec la pars triangulaire, elle forme l'aire de Broca (production du langage), surtout à gauche."],
  parstriangularis: ['Pars triangulaire (gyrus frontal inférieur)', 'frontal',
    "Partie moyenne, triangulaire, du gyrus frontal inférieur. Composante de l'aire de Broca (langage, sémantique)."],
  parsorbitalis: ['Pars orbitaire (gyrus frontal inférieur)', 'frontal',
    "Partie antérieure et inférieure du gyrus frontal inférieur, en continuité avec la face orbitaire du lobe frontal."],
  lateralorbitofrontal: ['Cortex orbitofrontal latéral', 'frontal',
    "Face inférieure (orbitaire) du lobe frontal, partie latérale. Évaluation de la récompense et de la punition, prise de décision."],
  medialorbitofrontal: ['Cortex orbitofrontal médial', 'frontal',
    "Face orbitaire médiale du lobe frontal (dont le gyrus droit). Valeur des choix, régulation émotionnelle."],
  precentral: ['Gyrus précentral', 'frontal',
    "Situé juste en avant du sillon central. Cortex moteur primaire (aire 4) : commande motrice volontaire, organisée en homonculus moteur."],
  paracentral: ['Lobule paracentral', 'frontal',
    "Face médiale de l'hémisphère, autour de l'extrémité du sillon central. Contrôle moteur et sensitif du membre inférieur ; rôle dans la continence."],
  frontalpole: ['Pôle frontal', 'frontal',
    "Extrémité antérieure du lobe frontal (aire 10). Pensée abstraite, gestion de plusieurs buts à la fois."],

  // ---------- Lobe pariétal ----------
  postcentral: ['Gyrus postcentral', 'parietal',
    "Situé juste en arrière du sillon central. Cortex somatosensoriel primaire (aires 3, 1, 2) : toucher, douleur, température, proprioception."],
  superiorparietal: ['Lobule pariétal supérieur', 'parietal',
    "Partie haute du lobe pariétal, au-dessus du sillon intrapariétal. Intégration visuo-motrice, orientation dans l'espace."],
  inferiorparietal: ['Lobule pariétal inférieur (gyrus angulaire)', 'parietal',
    "Partie postérieure du lobule pariétal inférieur, surtout le gyrus angulaire. Lecture, calcul, intégration multimodale."],
  supramarginal: ['Gyrus supramarginal', 'parietal',
    "Partie antérieure du lobule pariétal inférieur, coiffant l'extrémité de la scissure latérale (de Sylvius). Phonologie, praxies."],
  precuneus: ['Précunéus', 'parietal',
    "Face médiale du lobe pariétal, en avant du cunéus. Imagerie mentale, mémoire épisodique, conscience de soi."],

  // ---------- Lobe temporal ----------
  superiortemporal: ['Gyrus temporal supérieur', 'temporal',
    "Gyrus le plus haut du lobe temporal, sous la scissure latérale. Cortex auditif associatif ; sa partie postérieure gauche contient l'aire de Wernicke (compréhension du langage)."],
  middletemporal: ['Gyrus temporal moyen', 'temporal',
    "Gyrus intermédiaire de la face latérale du lobe temporal. Sémantique, perception du mouvement visuel (aire MT/V5 à sa partie postérieure)."],
  inferiortemporal: ['Gyrus temporal inférieur', 'temporal',
    "Bord inférolatéral du lobe temporal. Reconnaissance visuelle des objets (voie ventrale « quoi »)."],
  bankssts: ['Berges du sillon temporal supérieur', 'temporal',
    "Parois de la partie postérieure du sillon temporal supérieur. Perception des mouvements biologiques, de la voix et des visages."],
  fusiform: ['Gyrus fusiforme', 'temporal',
    "Face inférieure du lobe temporo-occipital. Reconnaissance des visages (aire fusiforme des visages) et des mots écrits."],
  transversetemporal: ['Gyrus temporal transverse (de Heschl)', 'temporal',
    "Caché dans la scissure latérale, sur la face supérieure du lobe temporal. Cortex auditif primaire (aires 41, 42)."],
  temporalpole: ['Pôle temporal', 'temporal',
    "Extrémité antérieure du lobe temporal. Mémoire sémantique, reconnaissance des personnes, émotions sociales."],

  // ---------- Lobe occipital ----------
  lateraloccipital: ['Cortex occipital latéral', 'occipital',
    "Face latérale du lobe occipital. Aires visuelles associatives : reconnaissance des formes et des objets."],
  lingual: ['Gyrus lingual', 'occipital',
    "Face médiale et inférieure du lobe occipital, sous la scissure calcarine. Vision (champ visuel supérieur), couleurs, lecture."],
  cuneus: ['Cunéus', 'occipital',
    "Face médiale du lobe occipital, entre la scissure calcarine et la scissure pariéto-occipitale. Traitement visuel (champ visuel inférieur)."],
  pericalcarine: ['Cortex péricalcarin', 'occipital',
    "Berges de la scissure calcarine. Cortex visuel primaire (V1, aire 17), qui reçoit les informations venant du thalamus (corps géniculé latéral)."],

  // ---------- Lobe limbique ----------
  rostralanteriorcingulate: ['Cortex cingulaire antérieur (partie rostrale)', 'limbic',
    "Partie la plus antérieure du gyrus cingulaire, autour du genou du corps calleux. Émotions, régulation de l'humeur."],
  caudalanteriorcingulate: ['Cortex cingulaire antérieur (partie caudale)', 'limbic',
    "Partie moyenne du gyrus cingulaire antérieur, au-dessus du corps calleux. Détection des conflits et des erreurs, motivation, douleur."],
  posteriorcingulate: ['Cortex cingulaire postérieur', 'limbic',
    "Partie postérieure du gyrus cingulaire, au-dessus du corps calleux. Nœud du réseau du mode par défaut ; mémoire autobiographique."],
  isthmuscingulate: ['Isthme du gyrus cingulaire', 'limbic',
    "Partie rétrécie du gyrus cingulaire qui contourne le splénium du corps calleux et rejoint le gyrus parahippocampique. Mémoire, navigation spatiale."],
  parahippocampal: ['Gyrus parahippocampique', 'limbic',
    "Face médiale et inférieure du lobe temporal, le long de l'hippocampe. Mémoire des lieux et des scènes."],
  entorhinal: ['Cortex entorhinal', 'limbic',
    "Partie antérieure du gyrus parahippocampique. Principale porte d'entrée de l'hippocampe ; parmi les premières régions touchées dans la maladie d'Alzheimer."],

  // ---------- Insula ----------
  insula: ['Insula', 'insula',
    "Lobe caché au fond de la scissure latérale, recouvert par les opercules frontal, pariétal et temporal. Intéroception, goût, dégoût, conscience corporelle."],

  // ---------- Noyaux gris centraux ----------
  Caudate: ['Noyau caudé', 'basal',
    "Noyau en forme de « C » qui longe le ventricule latéral (tête, corps, queue). Partie du striatum : apprentissage, contrôle moteur et cognitif."],
  Putamen: ['Putamen', 'basal',
    "Noyau latéral du striatum, en dehors du globus pallidus. Contrôle et apprentissage moteurs ; touché dans la maladie de Parkinson (perte des afférences dopaminergiques)."],
  Pallidum: ['Globus pallidus (pallidum)', 'basal',
    "Noyau situé en dedans du putamen (avec lequel il forme le noyau lenticulaire). Principale sortie des noyaux gris centraux vers le thalamus."],
  Accumbens: ['Noyau accumbens', 'basal',
    "Partie ventrale du striatum, à la jonction de la tête du noyau caudé et du putamen. Circuit de la récompense, motivation, addiction."],

  // ---------- Diencéphale ----------
  Thalamus: ['Thalamus', 'dienc',
    "Volumineux noyau ovoïde de part et d'autre du 3e ventricule. Relais de presque toutes les informations sensorielles vers le cortex ; régule la vigilance."],
  VentralDC: ['Diencéphale ventral', 'dienc',
    "Région sous le thalamus regroupant hypothalamus, noyau sous-thalamique, corps mamillaires et partie haute du mésencéphale (selon FreeSurfer). Fonctions végétatives et hormonales."],

  // ---------- Système limbique profond ----------
  Hippocampus: ['Hippocampe', 'limbicDeep',
    "Structure enroulée dans la paroi médiale de la corne temporale du ventricule latéral. Formation des nouveaux souvenirs, mémoire spatiale."],
  Amygdala: ['Amygdale', 'limbicDeep',
    "Noyau en amande dans le lobe temporal médial, en avant de l'hippocampe. Émotions, en particulier la peur ; mémoire émotionnelle."],

  // ---------- Ventricules ----------
  LateralVentricle: ['Ventricule latéral', 'ventricle',
    "Cavité contenant le liquide cérébrospinal dans chaque hémisphère (corne frontale, corps, carrefour, corne occipitale)."],
  InfLatVent: ['Corne temporale du ventricule latéral', 'ventricle',
    "Prolongement inférieur du ventricule latéral dans le lobe temporal, bordé en dedans par l'hippocampe."],
  ThirdVentricle: ['Troisième ventricule', 'ventricle',
    "Cavité médiane étroite entre les deux thalamus. Communique avec les ventricules latéraux (foramens interventriculaires) et le 4e ventricule (aqueduc du mésencéphale)."],
  FourthVentricle: ['Quatrième ventricule', 'ventricle',
    "Cavité entre le tronc cérébral (pont et bulbe) en avant et le cervelet en arrière. Se draine vers les espaces sous-arachnoïdiens."],

  // ---------- Substance blanche et commissures ----------
  CerebralWhiteMatter: ['Substance blanche cérébrale', 'white',
    "Faisceaux de fibres myélinisées sous le cortex : relient les aires corticales entre elles et avec les structures profondes. Masquée par défaut."],
  CC_Anterior: ['Corps calleux – genou et rostre', 'white',
    "Partie antérieure, recourbée, du corps calleux. Relie les deux lobes frontaux (surtout préfrontaux)."],
  CC_MidAnterior: ['Corps calleux – tronc (partie antérieure)', 'white',
    "Partie antérieure du tronc du corps calleux. Relie les aires prémotrices et motrices des deux hémisphères."],
  CC_Central: ['Corps calleux – tronc (partie centrale)', 'white',
    "Partie moyenne du tronc du corps calleux. Relie les aires motrices et somatosensorielles des deux hémisphères."],
  CC_MidPosterior: ['Corps calleux – isthme', 'white',
    "Partie rétrécie entre le tronc et le splénium. Relie les régions pariétales et temporales supérieures (dont auditives)."],
  CC_Posterior: ['Corps calleux – splénium', 'white',
    "Extrémité postérieure épaissie du corps calleux. Relie les lobes occipitaux (vision) et temporaux inférieurs."],
  OpticChiasm: ['Chiasma optique', 'white',
    "Croisement des nerfs optiques sous l'hypothalamus : les fibres des hémirétines nasales passent du côté opposé."],

  // ---------- Tronc cérébral et cervelet ----------
  BrainStem: ['Tronc cérébral', 'hindbrain',
    "Mésencéphale, pont (protubérance) et bulbe rachidien, représentés ici d'un seul bloc. Contient les noyaux des nerfs crâniens et les centres vitaux (respiration, rythme cardiaque)."],
  CerebellumCortex: ['Cortex cérébelleux', 'hindbrain',
    "Écorce plissée (en lamelles) du cervelet, sous les lobes occipitaux. Coordination des mouvements, équilibre, apprentissage moteur."],
  CerebellumWhiteMatter: ['Substance blanche du cervelet', 'hindbrain',
    "Centre médullaire du cervelet (« arbre de vie »), contenant les noyaux cérébelleux profonds et les fibres des pédoncules cérébelleux."],
};

export const HEMI_NAME = { L: 'gauche', R: 'droit', M: '' };
export const HEMI_LONG = { L: 'Hémisphère gauche', R: 'Hémisphère droit', M: 'Structure médiane' };

// Structures masquées au démarrage
export const HIDDEN_BY_DEFAULT = new Set(['CerebralWhiteMatter', 'CerebellumWhiteMatter']);
