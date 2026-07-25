# Lotoquine Assistant - Architecture Technique

## 1. Vision architecture

L'application est un outil local-first permettant de suivre des parties de Lotoquine en temps réel.

Principes :

* Priorité à la vitesse.
* Fonctionnement fiable pendant une partie en direct.
* Calculs temps réel en mémoire.
* Base de données utilisée pour persistance.
* Architecture évolutive vers un SaaS.

---

# 2. Architecture générale

```
                 USER
                  |
                  |
             Next.js App
                  |
        ---------------------
        |                   |
   UI Components       Game Engine
        |                   |
        |              Memory State
        |                   |
        |
          Drizzle ORM
              |
          SQLite DB
```

---

# 3. Frontend

## Framework

Next.js 15 App Router.

Responsabilités :

* affichage interface ;
* navigation ;
* interactions utilisateur ;
* gestion état UI.

---

## UI Stack

Utiliser :

* Tailwind CSS
* shadcn/ui
* Lucide Icons

Objectif :

Créer une interface professionnelle type logiciel métier.

---

# 4. Gestion état application

Utiliser Zustand.

Etat global :

```typescript
GameState {
 currentGame
 drawnNumbers[]
 topCards[]
 winner
 status
}
```

---

# 5. Game Engine

Le moteur de jeu est séparé de l'interface.

Dossier :

```
src/engine/
```

Contient :

```
game-engine.ts
card-index.ts
score-calculator.ts
winner-detector.ts
```

---

# 6. Chargement des cartons

Au lancement d'une partie :

Process :

```
SQLite
 |
Chargement cartons actifs
 |
Création index mémoire
 |
Partie prête
```

---

# 7. Index inversé

Objectif :

Eviter de parcourir tous les cartons.

Structure :

```typescript
{
 12: [ card1, card2, card3 ],
 45: [ card7, card9 ]
}
```

Lorsqu'un numéro sort :

```
Numéro reçu
 |
Recherche index
 |
Mise à jour uniquement des cartons concernés
 |
Tri meilleurs scores
```

---

# 8. Communication UI / Engine

Flux :

```
Utilisateur saisit numéro
        |
Game Engine
        |
Update Zustand
        |
React re-render
```

---

# 9. Performance

Objectifs :

10 000 cartons : <100 ms

100 000 cartons : <1 seconde

---

# 10. Evolution SaaS

Architecture future :

```
Next.js
    |
Supabase Auth
    |
PostgreSQL
    |
Realtime
```

Le moteur de calcul pourra être déplacé dans :

* Web Worker
* Edge Function
* Worker Cloudflare

---

# 11. Déploiement MVP

Local :

```
Mac utilisateur
Next.js
SQLite
```

Commande :

```
npm run dev
```

ou

```
npm run start
```

---

# 12. Principes de code

Obligatoire :

* TypeScript strict
* composants petits
* logique métier hors React
* tests du moteur
* pas de logique dans les pages
