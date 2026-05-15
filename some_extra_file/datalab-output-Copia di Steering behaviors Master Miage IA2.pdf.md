

Comportements évolutifs,  
algorithmes neuro-évolutionnaires

# Comportement évolutifs (génétique)

[DEMO](#) + [exemples de la communauté](#)

Idée : on crée des individus qui ont certaines caractéristiques pour manger de la nourriture et de temps en temps du poison (sans faire exprès) :

- Leur vie diminue au cours du temps,
- Manger de la bonne nourriture augmenter leur vie,
- Manger du poison diminue leur vie,
- Lorsque la vie est à zéro ils meurent et à leur place on trouve de la vie
- Ils possèdent un “champ de vision” pour détecter la nourriture la plus proche et aller la manger (*seek*)
- Ils possèdent un champ de vision pour être attirés par le le poison (*seek*)
- Et ils ont des “poids” pour la force d’attraction vers la nourriture et pour la force d’attraction vers le poison.
- Quels individus vont survivre le plus longtemps?
  - En d’autres termes : quels sont les meilleurs champs de vision pour bonne/mauvaise nourriture?

## Comportement évolutifs (algorithme génétique)

**THE CODING TRAIN** THURSDAY / NOV 23RD, 2023 GET STARTED VIDEOS COMMUNITY ABOUT

Challenges > Evolutionary S Disconnect Behaviors

## #69 — Evolutionary Steering Behaviors

Languages JavaScript, p5.js  
Topics genetic algorithms, steering behaviors, [and 3 more](#)

![YouTube video thumbnail for 'Coding Challenge #69: Evolutionary Steering Behaviors - Part 1' by The Coding Train. The thumbnail features a man with glasses and a beard, a p5.js logo, a Processing logo, and a sun character. The title 'CODING CHALLENGE EVOLUTIONARY STEERING BEHAVIORS PART 1' is overlaid in large purple text. A play button is visible in the center.](90b72a2399b1982a0f0b7a8676dcfc8d_img.jpg)

Coding Challenge #69: Evolutionary Steering Behaviors - Part 1

À regarder · 12:47

Regarder sur YouTube

| PARTS                            | TIMESTAMPS                                               |
|----------------------------------|----------------------------------------------------------|
| <input checked="" type="radio"/> | Part 1 - Vehicle Attracted to Nearest Dots               |
| <input type="radio"/>            | Part 2 - Weights and Health of Vehicles                  |
| <input type="radio"/>            | Part 3 - Boundaries and Perception Radius                |
| <input type="radio"/>            | Part 4 - Fixing Bug, Cloning Vechicles and Mutation Rate |
| <input type="radio"/>            | Part 5 - Bonus! Adding a Debug Checkbox                  |

Next

## Exercices !

Il y a une correction dans le dossier “**8-EvolutionarySteeringBehavior**” du repo GitHub, mais je vous conseille de le faire vous-mêmes...

1. **Suivre les vidéos et coder vous-mêmes ce comportement,**
2. **On peut voir que certains individus survivent et pas d'autres...**
  - Dans l’exemple on copie l’ADN de ces individus en ajoutant un peu de randomisation
  - On pourrait les faire se reproduire plus rapidement... ?
3. **On pourrait mettre des prédateurs (pursue) qui mangent des individus** (et ceux-ci pourraient fuir plus ou moins vite en fonction de leur santé/vie)
4. **On pourrait mettre des sliders pour régler divers paramètres ?**
5. **Cliquez pour ajouter des individus ? Des prédateurs ?**

### Algo génétique avec tensorflow.js, exemple 1 -Smart Rockets (missiles à tête chercheuse)

![Video player showing a tutorial on genetic algorithms with tensorflow.js. The video displays a simulation of 'Smart Rockets' on a black canvas with a white dot (target) and a white horizontal bar (obstacle). A mouse cursor is visible on the canvas. The video player interface shows a progress bar at 46:09/48:16 and a 'Lire (k)' button.](e236d1893811a6c5ad2d17439e3819c8_img.jpg)

- HTML
- CSS
- JS

```
144     this.acc
145   }
146
147   this.calcF
148     var d =
149
150     this.fit
151     if (this
152       this.f
153     }
154     if (this
```

DEMO: Exemple 10  
du repository du  
cours.

A voir aussi: ml5js package Machine Learning pour p5

Vidéos ici:

<https://www.youtube.com/@TheCodingTrain/search?query=ml5js>

### Algo génétique avec tensorflow.js, exemple 2 -suivi de circuit par une voiture

![Screenshot of a YouTube video showing a genetic algorithm simulation. A car is shown on a track, and the interface displays 'next generation' and 'ga.js:33'.](9ebd85380ef496499e5f23ec0d9cd744_img.jpg)

A screenshot of a web browser displaying a YouTube video. The video shows a simulation of a genetic algorithm for steering vehicles. A car is positioned on a track, and the interface includes a 'next generation' label and 'ga.js:33'. The video is titled 'Continuing The Neuroevolution Steering Vehicles'.

Screenshot of a YouTube video showing a genetic algorithm simulation. A car is shown on a track, and the interface displays 'next generation' and 'ga.js:33'.

DÉMO de la vidéo: Exemple 9 du repository du cours.

ICI [un exemple P5 en ligne sans doute plus simple](#)

Et ici les explications

<https://codeheir.com/2021/04/03/genetic-algorithms-in-javascript/>

Voir aussi un exemple de fusée qui apprend à atterrir (spaceX) :

<https://codeheir.com/2021/05/08/spacex-rockets-learn-to-land-%f0%9f%9a%80-javascript/>

## Comportement de groupe 8 : “Suivre un leader” (non naïf)

1. **Le leader a par exemple un comportement *arrive* et suit la souris**
2. **Rester avec le leader** : comportement *arriver sur une cible* (*le leader, ou plutôt un point derrière le leader est la cible*)
3. **Ne pas se mettre devant le leader**: comportement *évasion* quand on est dans la zone devant le leader
4. **Garder ses distances avec les autres**: comportement *séparation* quand on est derrière.

![Diagram illustrating group behavior with a leader and followers.](32a03202e95ff09a974e12e4be687885_img.jpg)

A diagram illustrating group behavior. A central brown dot represents the leader. To its right is a brown rectangular box with a yellow triangle inside, representing a target or obstacle. Several green triangles, representing followers, are scattered around. Each green triangle has a red arrow pointing towards the leader or the target. Some followers are positioned behind the leader, while others are to the sides. The background is light blue.

Diagram illustrating group behavior with a leader and followers.

## Comportement de groupe 8 : “Suivre un leader” (non naïf)

1. **Le leader a par exemple un comportement *arrive* et suit la souris**
2. **Restez avec le leader** : comportement arriver sur une cible (*le leader, ou plutôt un point derrière le leader est la cible*)
3. **Ne pas se mettre devant le leader**: comportement *évasion* quand on est dans la zone devant le leader
4. **Gardez vos distances avec les autres**: comportement *séparation* quand on est derrière.

![Diagram illustrating group behavior with a leader and followers.](0ba998c66ef6a980bac9c0c12e9452bf_img.jpg)

A diagram illustrating group behavior within a rectangular boundary. A central black dot represents the leader, with a brown line extending from it to a yellow triangle representing a mouse. Several green triangles, representing followers, are positioned around the leader. Each follower has a red arrow pointing towards the leader, indicating a following behavior. Some followers are positioned behind the leader, while others are to the sides. The followers' arrows are generally oriented towards the leader or the mouse, showing their intent to follow. The diagram is set against a light blue background.

Diagram illustrating group behavior with a leader and followers.

## Projets Master IA2 Nice 2025-2026

Deux parties :

### 1 TP individuel à rendre avant le dimanche 5 avril minuit

- Utilisation de steering behaviors multiples
- Tous les objets animés sont des sous-classes de Vehicle, tous les comportements de base sont dans Vehicle, seuls les comportements personnalisés ou multiples sont dans les sous-classes
- Fournir fichiers .md utilisés par les assistants IA
- Readme doit contenir obligatoirement une section personnelle “MON EXPERIENCE” qui indique pourquoi vous avez fait ce jeu, quels comportements vous avez choisi, comment vous les avez réglé, quelles difficultés vous avez rencontrée et comment vous avez trouvé la résolution.
- Indiquer IDE utilisé + quels modèles IA, je suis curieux...
- Vous m’envoyez par mail le repo GitHub. Jeu hébergé sur github pages ou [itch.io](https://itch.io) OBLIGATOIRE! Mettre le lien dans le [README.md](#) du repo.
- OPTIONNEL MAIS BIEN APPRÉCIÉ : concevoir un “BehaviorManager”, un “gestionnaire de comportements” et Vehicle aura par défaut une propriété de ce type, avec des méthodes pour ajouter/supprimer des comportements, activer/désactiver des comportements, etc. Sauver / charger des comportements complexes (utilisants plusieurs comportements de base) etc.
- VIDÉO OBLIGATOIRE SUR YOUTUBE (1/2mns)

### 1 Mini projet à rendre pour le dimanche 26 Avril minuit: voir page suivante !

## Projets Master IA2 Nice 2025-2026

### Mini projet à rendre (binôme autorisé)

- Utilisation de réseau de neurones + algorithme neuro-évolutif comme celui vu dans l'exemple des voitures qui apprennent à suivre un circuit.
- Vous documenterez précisément l'objectif de votre projet et comment vous avez décidé sa mise en oeuvre, sa conception etc.
- Documenter la fonction de fitness (ex: pour les voitures c'est la distance parcourue, mais je vous ai suggéré plutôt un score mélangeant distance et temps pour favoriser les voitures rapides)
- Pour l'entraînement : mettre des curseurs pour régler la topologie du réseau de neurones:
  - nombre de neurones en entrée (dans le cas des voitures : nombre de capteurs / rayons par exemple, mais j'ai suggéré d'ajouter d'autres informations comme le prochain waypoint ou les 2 / 3 prochains waypoints, la distance de freinage etc.)
  - Nombre de couches internes
  - Nombre de neurones dans chaque couche interne
  - Fonction d'activation (sigmoid / relu)
  - etc.
- VOIR PAGE SUIVANTE!

## Projets Master IA2 Nice 2025-2026

### Mini projet à rendre suite...

- Définir condition d'arrêt de l'entraînement (ex: 60% des voitures font au moins un tour de circuit sans se planter)
- Réfléchir à entraîner le cerveau vers un comportement généralisable (ex: une fois que le cerveau est entraîné sur un circuit, générer un autre circuit, peut-être en augmentant légèrement la complexité du circuit)
- Générateur / éditeur de circuit, possibilité de sauvegarder / restaurer un circuit ou un tableau de circuits (ex: circuits faciles, moyens, difficiles, tueurs)
- Possibilité de sauvegarder un "cerveau" entraîné pour le mettre plus tard en compétition avec d'autres cerveaux (ex: je charge un circuit, je charge 20 voitures avec des cerveaux différents, je lance la course)
- Pendant la course, les véhicules utiliseront en plus d'autres comportements (ex: séparation par exemple, évitement d'obstacles -possibilité de cliquer à la souris pour ajouter des obstacles, etc.)
- Si vous avez le temps : arbres de décision. Un véhicule n'a plus d'essence, il s'arrêtera aux stands (détecter quand on est près de la sortie vers les stands, là arrêter certains comportements et passer en "suivi de chemin" avec des points pour aller au stand, s'arrêter, repartir, puis re-activer les comportements de course etc.)

**Voir page suivante!**

## Projets Master IA2 Nice 2025-2026

**Obligatoire : utiliser la librairie ML5js (voir slide 48)**

- Soit pour agir sur certains contrôles de votre jeu (via mouvements des mains, de la tête, gestures, bouche ouverte/fermée, yeux, orientation de la tête etc.)
- Soit dans un mini projet à côté

**FAIRE QUELQUE CHOSE DE CREATIF!**

Mêmes contraintes que pour le TP:

- README, GitHub, assistants IA etc. pareil !
- HEBERGEMENT OBLIGATOIRE SUR Github pages ou [itch.io](https://itch.io)
- VIDEO OBLIGATOIRE SUR YOUTUBE (1/2mns)