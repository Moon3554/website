# AniGuess - De quel anime vient ce personnage ?

Une Web App moderne, rapide et épurée de **quiz d'animes** avec système complet de **profil de joueur**, progression de niveaux, modes de jeu variés et **espace administrateur**.

---

## Comment Lancer et Jouer

### Option 1 : Directement dans le navigateur (Instantané)
Double-cliquez simplement sur le fichier **`index.html`** dans votre explorateur de fichiers.

### Option 2 : Via Node.js
Dans votre terminal :
```bash
npm start
```
Puis ouvrez : **`http://localhost:3000`**

---

## Fonctionnalités Incluses

### 1. Système de Profil Joueur
* **Pseudo personnalisable** à tout moment.
* **Avatar au choix** parmi une galerie de personnages d'anime officiels.
* **Progression par Niveau & XP** : Chaque bonne réponse rapporte de l'XP pour monter de niveau.
* **Titres & Rangs évolutifs** :
  - *Apprenti* (Niv. 1)
  - *Lecteur Assidu* (Niv. 2)
  - *Initié Confirmé* (Niv. 5)
  - *Capitaine du Bataillon* (Niv. 10)
  - *Chasseur de Fléaux* (Niv. 15)
  - *Seigneur Pirate* (Niv. 20)
  - *Hokage Suprême* (Niv. 25+)
* **Statistiques complètes** : Taux de réussite (%), Total de parties jouées, Meilleure série (Streak), Historique récent des parties.
* **Sauvegarde automatique** dans le navigateur (`localStorage`).

### 2. Modes de Jeu
* **Personnages — Classique (10 questions)** : 10 personnages tirés au sort avec 4 propositions d'anime.
* **Personnages — Contre-la-montre** : 60 secondes, avec +2 secondes par bonne réponse.
* **Personnages — Survie** : 3 vies ; chaque erreur vous en coûte une.
* **Personnages — Image mystère** : Une image se clarifie progressivement pour vous aider à retrouver l'anime.
* **OST, openings et endings** : Écoutez un extrait audio puis devinez l'anime. Les parties comptent 10 questions par catégorie.

### 3. Espace Administrateur
* Gestion séparée des personnages et de la bibliothèque musicale.
* Ajout de personnages avec titres d'anime en Romaji et en anglais, plus une URL d'image.
* Recherche automatique instantanée via l'API AniList pour préremplir les données en 1 clic.
* Recherche automatique d'animes dans le catalogue AnimeThemes, avec préécoute des openings/endings et ajout au quiz en un clic.
* Titres Romaji/anglais préremplis via AniList lorsque disponibles.
* Ajout manuel de musiques, notamment les OST, avec une URL audio directe.
* Préécoute et suppression des médias audio/vidéo ; les ressources trouvées restent hébergées par leur source et sont utilisées selon ses conditions.
* Le bouton « Vider tous les personnages » supprime le catalogue intégré et les ajouts personnalisés ; la base reste vide après rechargement. Les nouveaux personnages peuvent ensuite être ajoutés manuellement.
* Persistance des ajouts dans le navigateur (`localStorage`).

Le sélecteur Romaji/anglais change le titre de l'anime utilisé dans les choix du quiz. Pour les entrées personnalisées, renseignez les deux titres dans l'admin ; pour les anciennes entrées qui n'en ont qu'un, le même titre sert dans les deux langues. Le catalogue AnimeThemes fournit des openings/endings, pas les OST : ces dernières se saisissent avec une URL directe.

### 4. Images & Audio
* Plus de 50 personnages cultes intégrés en local (One Piece, Naruto, JJK, Berserk, Frieren, Chainsaw Man, Demon Slayer, AoT, HxH, etc.).
* Intégration en temps réel de l'API GraphQL **AniList** pour alimenter continuellement le jeu en nouveaux personnages avec images HD.
* Sons synthétisés intégrés (Web Audio API) : notes de réussite, buzzer d'erreur, fanfare de montée de niveau.
