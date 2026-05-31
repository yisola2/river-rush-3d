# River Rush 3D

**River Rush 3D** est un petit jeu web en 3D inspiré de l’esprit de *Kinect Adventures*. On dirige un radeau sur une rivière, on évite les rochers, on saute, on se baisse sous les obstacles et on ramasse des pièces.

Le jeu a été développé avec **Babylon.js** et **TypeScript**, avec une attention particulière sur les contrôles corporels, l’IA du bot et l’ambiance arcade/familiale.

J’ai choisi cette idée parce qu’elle me rappelle beaucoup mon enfance : les heures passées sur les jeux de la **Wii** et sur **Kinect** avec la Xbox 360. Je voulais retrouver ce côté jeu physique, immédiat, un peu chaotique, où le corps devient la manette.

> Équipe : **Yassin Es Saim** — Master MIAGE IA2, Université Côte d’Azur

---

## Jouer au jeu

Liens à compléter après déploiement :

- Version web : https://yisola2.itch.io/river-rush-3d
- Vidéo YouTube : https://youtu.be/ggPOP_gAf3U

Le jeu fonctionne directement dans un navigateur moderne. Aucun gamepad n’est nécessaire.

---

## Contrôles

### Mode clavier

Le mode clavier est le mode le plus simple pour tester le jeu.

| Action | Touches |
|---|---|
| Aller à gauche | `Q` / `A` / flèche gauche |
| Aller à droite | `D` / flèche droite |
| Sauter | `Espace` / `W` / `Z` |
| Se baisser | `S` / flèche bas |
| Mode caméra | `C` |
| Mode bot | `B` |
| Mute audio | `M` |
| Pause/menu | `Échap` |
| Debug | `H` |

Les touches ont été pensées pour fonctionner autant que possible avec des claviers **AZERTY** et **QWERTY**.

### Mode caméra

Le mode caméra utilise la webcam et **MediaPipe** pour contrôler le radeau avec le corps.

- pencher le corps à gauche/droite : déplacer le radeau
- lever les bras ou faire un mouvement de saut : sauter
- s’accroupir : se baisser
- taper dans les mains : calibrer / démarrer / redémarrer après une collision

Ce mode demande une webcam, un peu de recul et une pièce suffisamment éclairée. C’est clairement le mode le plus fun du projet : grâce à **MediaPipe**, on peut utiliser la reconnaissance de pose directement dans le navigateur, avec accélération GPU quand elle est disponible, sans installer d’application native.

### Mode bot

Le mode bot laisse une IA jouer automatiquement. C’est utile pour observer la logique de jeu, tester les obstacles et montrer la partie IA du projet.

Je trouve aussi ce mode assez drôle à regarder : on voit le bot prendre ses décisions, éviter les obstacles, parfois enchaîner les mouvements avec une sorte de logique absurde. Dans l’esprit, ça peut faire penser à ces vidéos “brain rot” sur les réseaux où l’on regarde un système jouer tout seul.

En appuyant sur `H`, on peut afficher un mode debug avec les capteurs, les hitboxes et les informations de steering.

---

## Lien avec le thème IA

Le projet utilise plusieurs idées liées à l’IA et au contrôle intelligent :

1. **Bot autonome basé sur des steering behaviours**  
   Le bot ne triche pas en téléportant le radeau. Il lit des informations sur l’environnement, choisit une intention, puis déplace le radeau avec des forces de steering.

2. **Architecture inspirée de Craig Reynolds / ia_buffa**  
   Le bot est organisé autour d’un `Vehicle`, d’un `BehaviorManager` et de comportements comme l’évitement, le retour vers une cible et la protection contre les bords de la rivière.

3. **Perception par capteurs**  
   Le radeau possède des rayons virtuels qui détectent les obstacles devant lui. Ces informations servent au planner du bot.

4. **Contrôle corporel avec MediaPipe**  
   Le mode caméra transforme la pose du joueur en commandes de jeu. Le corps devient l’interface.

Une idée que je n’ai pas eu le temps d’accomplir, mais qui me semble vraiment intéressante, serait d’enregistrer les parties jouées en mode caméra, puis d’entraîner un petit réseau de neurones sur ces données. L’objectif ne serait pas de contrôler directement la position du radeau, mais de produire des décisions de haut niveau : poids des steering behaviours, choix d’une cible, saut ou duck. Cela permettrait d’avoir un bot qui apprend à partir de vraies parties humaines, tout en gardant une base de mouvement explicable.

---

## Description technique

Le jeu est construit avec :

- **Babylon.js** pour la scène 3D, la caméra, les matériaux, les particules et l’interface en jeu
- **TypeScript** pour structurer le code
- **MediaPipe Tasks Vision** pour la reconnaissance de pose dans le mode caméra
- **Blender / Mixamo** pour intégrer un personnage animé
- **Web Audio API** pour les sons générés et l’ambiance audio

Les hitboxes de gameplay restent simples et contrôlées dans le code. Les modèles 3D et animations sont surtout visuels, afin de garder des collisions lisibles et prévisibles.

---

## Ce que j’ai aimé construire

La partie la plus satisfaisante du projet a été de transformer une idée assez simple — un radeau qui avance sur une rivière — en une expérience plus complète, avec plusieurs façons de jouer.

Le **mode caméra** est clairement ce que je préfère. C’est celui qui se rapproche le plus de l’inspiration Wii/Kinect : on n’appuie plus seulement sur des touches, on se met physiquement dans le jeu. Le fait de taper dans les mains pour calibrer ou redémarrer rend aussi l’expérience plus naturelle.

J’ai aussi beaucoup aimé travailler sur le **bot**. Même si ce n’est pas un réseau de neurones, il donne déjà l’impression d’un système intelligent : il perçoit les obstacles, choisit une cible, décide quand sauter ou se baisser, puis agit avec des steering behaviours. Le mode debug permet de voir cette logique fonctionner, ce qui rend la partie IA plus lisible.

Enfin, je suis content d’avoir poussé le projet au-delà d’une simple démo technique : il y a maintenant un menu, une mascotte, de l’audio, des animations, un début de mise en scène, et plusieurs modes de jeu.

---

## Problèmes rencontrés et choix de conception

Le projet a demandé beaucoup d’allers-retours, surtout parce que plusieurs systèmes devaient fonctionner ensemble : gameplay, animation, caméra, IA, interface et audio.

Un des premiers problèmes a été le **timing des animations**. Par exemple, le saut du radeau et le saut du personnage Mixamo n’avaient pas naturellement la même durée. Il a donc fallu ajuster la durée du saut en gameplay pour que l’animation ait l’air cohérente, plutôt que simplement accélérer ou couper l’animation.

Le **duck** a aussi été plus compliqué que prévu. Au clavier, il fallait que l’action soit lisible et contrôlable. En caméra, il fallait plutôt détecter une posture tenue, car le joueur reste réellement accroupi. J’ai donc dû faire attention à ne pas traiter tous les modes de contrôle exactement de la même manière.

Le **mode caméra** a posé des problèmes très concrets : distance à l’écran, lisibilité de l’interface, sensibilité du lean, luminosité de la pièce, fiabilité du clap. C’est pour cela que l’interface devient plus grande en mode caméra et que le jeu affiche clairement “clap to restart” après une collision.

Pour le bot, la difficulté était différente : il ne fallait pas seulement qu’il évite les obstacles, il fallait aussi que son comportement reste compréhensible. J’ai donc beaucoup ajusté les forces, les priorités et les poids des comportements pour éviter que le bot fasse des mouvements trop brusques ou trop artificiels.

Enfin, l’audio a aussi demandé des ajustements à cause des règles du navigateur : le son ne peut pas démarrer avant une action de l’utilisateur. C’est une des raisons pour lesquelles le jeu commence par un écran d’accueil avec un bouton de démarrage.

---

## Lancer le projet en local

```bash
npm install
npm start
```

Puis ouvrir :

```text
http://127.0.0.1:4174
```

Pour construire le projet :

```bash
npm run build
```

---

## Conseils pour le jury

Pour tester rapidement :

1. commencer avec le mode **Keyboard**
2. essayer ensuite le mode **Bot**
3. appuyer sur `H` en mode Bot pour voir le debug
4. passer en mode **Camera** si une webcam est disponible
5. en mode Camera, se placer devant la webcam puis taper dans les mains pour calibrer et démarrer

Le mode caméra est plus lisible si l’on recule un peu de l’écran, mais il faut rester bien visible par la webcam.
