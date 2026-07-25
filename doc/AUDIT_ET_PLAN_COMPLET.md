# Audit des specs + Plan d'implémentation complet

Audit réalisé avec : Clean Architecture, Clean Code, Code Complete, Refactoring, Domain-Driven Design, Designing Data-Intensive Applications, The Pragmatic Programmer, UI-UX-Pro-Max.

---

## 1. Audit des specs existantes

### 1.1 PRODUCT_SPEC.md — Ce qui est bon

- Vision métier claire, langage ubiquitaire cohérent (carton, partie, tirage, numéro)
- Cas d'usage explicites : import, création partie, saisie directe, détection gagnant
- Contraintes UX fortes : clavier uniquement, plein écran, mode sombre
- Raccourcis clavier obligatoires documentés
- Critères de succès mesurables

### 1.2 PRODUCT_SPEC.md — Ce qui manque

| Manque | Impact | Correction |
|---|---|---|
| Plage de numéros valides non définie | Comportement indéfini à l'import | Ajouter 1-90 (Lotoquine) |
| Nombre exact de numéros par carton | Validation impossible | 15 numéros par carton |
| Gestion doublon tirage (même numéro sorti 2×) | Corruption état partie | L'index doit ignorer les doublons |
| Format des séries non spécifié | Regex validation impossible | `FD` suivi de 6 chiffres |
| Pas de mention undo/redo explicite dans le flux | Récupération erreur opérateur | Chaque action = event, undo = replay sans le dernier |
| Pas de scénario de panne radio | L'utilisateur ne sait pas quoi faire | Mode "attente" avec reprise |
| Pas de définition du nombre max de numéros par tirage | L'UI doit arrêter la partie à 15 |

### 1.3 ARCHITECTURE.md — Ce qui est bon

- Séparation UI ↔ Engine claire
- Index inversé correct pour les performances
- Zustand pour l'état global
- Drizzle pour l'abstraction DB
- Principe "pas de logique dans les pages"

### 1.4 ARCHITECTURE.md — Ce qui manque

| Manque | Référence Skill | Correction |
|---|---|---|
| Pas de couche Use Cases entre UI et Engine | Clean Architecture | Ajouter `src/use-cases/` |
| Pas de Repository interface | Clean Architecture / DDD | `CardRepository`, `GameRepository` derrière interface |
| Zustand mélange état UI + état domaine | Clean Architecture | Séparer `GameState` (domaine) et `UIState` (affichage) |
| Pas de composition root | Clean Architecture | `src/di/` pour le wiring |
| Pas de sens de dépendance explicite | Clean Architecture | Engine ne doit pas importer Next.js, Drizzle, Zustand |
| Pas de stratégie de test | Clean Code / Code Complete | Tests unitaires engine, tests intégration repositories |
| Pas de gestion d'erreur centralisée | Code Complete | Error boundary, validation pipeline, messages utilisateur |
| `card_progress` optionnel = dangereux | DDIAT | Rendre obligatoire pour crash recovery |
| Pas de stratégie de snapshot mémoire | DDIAT | Sauvegarde périodique du MemoryState dans card_progress |
| Pas de Web Worker pour l'engine | DDIAT | Option future pour éviter de bloquer le main thread |

### 1.5 DATABASE_SCHEMA.md — Ce qui est bon

- Tables correctement identifiées
- Relations claires
- Index identifiés
- Format CSV documenté

### 1.6 DATABASE_SCHEMA.md — Ce qui manque

| Manque | Correction |
|---|---|
| Pas de contraintes SQL (UNIQUE, NOT NULL, CHECK) | Ajouter `serial_number UNIQUE`, `number BETWEEN 1 AND 90` |
| `card_progress` pas d'ID, pas de PK composite | Ajouter PK composite `(game_id, card_id)` |
| Pas de cascade delete | `ON DELETE CASCADE` sur `card_numbers`, `games_cards` |
| Pas de champ `total_numbers` sur cards | Évite de compter à chaque fois, varie selon loto |
| Pas d'index composite sur `draws(game_id, position)` | Requête de replay partie |
| Pas de trigger/contrainte sur status (RUNNING → pas de nouveau WINNER possible sans FINISHED) | Contrainte applicative forte |

### 1.7 IMPLEMENTATION_PLAN.md — Ce qui est bon

- Phases séquentielles claires
- Progression logique : projet → DB → cartons → moteur → live → optimisation

### 1.8 IMPLEMENTATION_PLAN.md — Ce qui manque

| Manque | Référence Skill | Correction |
|---|---|---|
| Pas de phase de test du moteur avant l'UI | Refactoring / Pragmatic Programmer | Tester l'index avant de builder l'UI live |
| Phase 6 "Optimisation" sans mesure préalable | Pragmatic Programmer | Mesurer AVANT d'optimiser, benchmark-driven |
| Pas de gates/checkpoints entre phases | Pragmatic Programmer | Chaque phase doit avoir un critère de "done" vérifiable |
| Pas de prototype/tracer bullet | Pragmatic Programmer | Faire un POC de l'index inversé avec 100k cartons factices |
| Phase SaaS trop vague | Clean Architecture | Migrer DB d'abord, ajouter auth ensuite, realtime après |
| Pas de phase de tests après chaque phase | Code Complete | Chaque phase inclut "tests" dans sa définition de done |
| Pas de phase de refactoring post-MVP | Refactoring | Phase "Polissage" avant d'ajouter des features |
| Pas d'intégration continue | Pragmatic Programmer | Ajouter les scripts CI après Phase 2 |
| Pas de gestion des migrations DB | Code Complete | Intégrer Drizzle Kit migrations dans le build |

---

### 1.9 UI-UX-Pro-Max — Ce qui manque sur l'UI/UX

La spec actuelle dit "mode sombre, gros chiffres, shadcn/ui" — c'est insuffisant pour une interface pro.

#### Design System absent

| Manque | Recommandation UI-UX-Pro-Max |
|---|---|
| Pas de palette couleur définie | OLED Dark mode : fond `#000000`, cartes `#121212`, accents `#0F766E` (teal) |
| Pas de typographie | Police système monospace pour les chiffres, Inter pour l'interface |
| Pas de système de spacing | Définir un scale 4/8/12/16/24/32/48px |
| Pas d'effets/transitions | Glow minimal sur le dernier numéro, transition 200ms sur les cartes |
| Pas de hiérarchie visuelle pour les tailles | Dernier numéro = 96px, historique = 24px, top cartons = 18px |

#### Choix de style inadapté pour une console live

Le search `ui-ux-pro-max` a matché **Dark Mode (OLED)** comme premier choix — mais il a aussi suggéré **Cyberpunk UI** qui colle mieux à l'esprit "console de jeu radio live" :

```
Style recommandé : Cyberpunk UI
Palette : #0D0D0D (fond), #00FF00 (accent), #00FFFF (cyan data)
Effets : Neon glow, animations de transition, scanlines optionnelles
Police : Monospace pour les chiffres
```

Le design actuel ("teal + professional blue") est trop corporate. Pour une app de loto radio, il faut une vibe "écran de contrôle broadcast".

#### Accessibilité clavier incomplète

La spec liste 3 raccourcis (ENTER, ESC, SPACE). C'est insuffisant pour une utilisation 100% clavier :

| Raccourci manquant | Raison |
|---|---|
| `F` ou `F11` | Plein écran — obligatoire pour une console live |
| `N` | Nouvelle partie (après victoire) |
| `?` ou `H` | Aide des raccourcis |
| `↑` / `↓` | Navigation dans l'historique des numéros |
| `Tab` | DOIT être désactivé (focus trap) en mode live |
| `Ctrl+Z` | Undo (alternative à ESC + plus standard) |

#### Patterns spécifiques au jeu en direct manquants

| Pattern UI-UX-Pro-Max | Appliqué à Lotoquine |
|---|---|
| **Streaming / typewriter** | Le dernier numéro devrait apparaître avec une animation de "révélation" |
| **Count-up animation** | Le compteur de numéros trouvés pour chaque carton top |
| **Focus states visibles** | `focus-visible:ring-2 ring-teal-500` sur tous les éléments clavier |
| **Toast notifications** | Avec shadcn Sonner (Toaster dans le layout racine) |
| **Skeleton loading** | Pendant le chargement des cartons au démarrage |
| **Semantic HTML** | `<main>`, `<section>`, `<article>` pour chaque zone live |
| **inputmode='numeric'** | Sur le champ de saisie du numéro |

#### shadcn/ui — Mauvaises pratiques documentées

La spec dit "shadcn/ui" mais ne suit pas les guidelines du skill :

| Erreur anticipée | Correction UI-UX-Pro-Max |
|---|---|
| Ignorer `npx shadcn@latest init` avant d'ajouter des composants | Faire `init` en Phase 0 |
| Couleurs en dur (`bg-blue-500`) au lieu de CSS variables | Utiliser `bg-primary`, `bg-card` via `globals.css` |
| Page live buildée entièrement à la main | Partir du block `dashboard-01` shadcn |
| Pas de `Toaster` dans le layout racine | Ajouter `<Toaster />` dans `app/layout.tsx` |
| Composants custom sans `cn()` helper | Utiliser `cn()` pour tous les composants |

#### Anti-patterns UI-UX-Pro-Max présents dans les specs

- ❌ "Emojis comme 🥇 🥈 🥉" → Remplacer par des badges shadcn ou SVG Lucide
- ❌ "Gros chiffres" sans système de taille → Définir un typography scale token
- ❌ "Boutons accessibles" sans specs → Préciser : min 44×44px touch target
- ❌ "Mode sombre" sans thème clair alternatif → Même si mode sombre par défaut, prévoir le thème clair
- ❌ Pas de `cursor-pointer` spécifié sur les éléments interactifs

### 1.10 Synthèse des ajouts UI-UX-Pro-Max au plan

Les phases existantes (surtout Phase 11 — UX Pro) doivent être enrichies avec :

1. Un **design system** complet avant toute implémentation UI (palette, typo, spacing, effets)
2. Un **focus keyboard total** : focus trap en live, raccourcis étendus, `inputmode='numeric'`
3. Les **patterns shadcn** : init avant tout, composants compound, CSS variables, Toaster racine
4. Les **micro-interactions** : révélation du numéro, count-up, transitions, glow
5. Le remplacement des **emojis par des icônes SVG** (Lucide)
6. Un **mode plein écran natif** via Fullscreen API

---

## 2. Plan d'implémentation complet

### Convention

Chaque phase contient :
- **Objectif** : résultat attendu vérifiable
- **Tâches** : actions précises
- **Tests** : comment valider la phase
- **Gate** : critère pour passer à la suite

---

### Phase 0 — Setup du projet + Architecture

**Objectif** : Projet Next.js 15 fonctionnel avec toute la toolchain, les dossiers, et l'architecture propre en place. Rien ne tourne encore, mais la fondation est solide.

**Tâches** :

1. Initialiser Next.js 15 avec TypeScript strict
2. Configurer Tailwind CSS + shadcn/ui
3. Configurer Drizzle ORM + SQLite (better-sqlite3)
4. Créer la structure de dossiers complète :

```
src/
  app/           # Next.js App Router pages
    (dashboard)/ # layout group pour les pages admin
    live/        # page live unique
  components/    # UI components (shadcn + custom)
    ui/          # shadcn/ui primitives
    features/    # feature-specific components
  lib/           # utilities, constants, validation
  db/            # Drizzle schema, migrations, client
    schema/      # tables definitions
    migrations/  # auto-generated
  engine/        # domain logic (PURE, pas de dépendances externes)
    card-index.ts
    score-calculator.ts
    winner-detector.ts
    game-engine.ts
  repositories/  # interfaces + implémentations Drizzle
    interfaces/
    drizzle/
  use-cases/     # orchestration métier
  di/            # composition root (wiring)
  stores/        # Zustand stores (UI uniquement)
  types/         # TypeScript types partagés
```

5. Ajouter les scripts npm : `dev`, `build`, `start`, `lint`, `typecheck`, `test`
6. Configurer ESLint + Prettier
7. Ajouter les constantes métier dans `src/lib/constants.ts` :
   - `MIN_NUMBER = 1`
   - `MAX_NUMBER = 90`
   - `NUMBERS_PER_CARD = 15`
   - `SERIAL_REGEX = /^FD\d{6}$/`
   - `GAME_STATUS = ['WAITING', 'RUNNING', 'FINISHED']`
8. Installer Vitest pour les tests

**Tests** : `npm run dev` démarre, `npm run build` passe, `npm run lint` sans erreur

**Gate** : `npm run build && npm run lint && npm run typecheck` ✅

---

### Phase 1 — Domain Model + Types

**Objectif** : Définir les types domaine et les entités sans aucune dépendance framework. Ce code ne doit JAMAIS importer Next.js, Drizzle ou Zustand.

**Tâches** :

1. Créer les types dans `src/types/domain.ts` :

```typescript
export type GameStatus = 'WAITING' | 'RUNNING' | 'FINISHED'

export interface Card {
  id: number
  serialNumber: string
  numbers: number[]
  active: boolean
  createdAt: Date
}

export interface Game {
  id: number
  name: string
  status: GameStatus
  createdAt: Date
  startedAt: Date | null
  finishedAt: Date | null
  winnerCardId: number | null
  cardIds: number[]
}

export interface Draw {
  id: number
  gameId: number
  number: number
  position: number
  createdAt: Date
}

export interface CardProgress {
  gameId: number
  cardId: number
  foundCount: number
  updatedAt: Date
}
```

2. Créer les value objects dans `src/types/vo.ts` :
   - `SerialNumber` : value object avec validation du format
   - `NumberDraw` : value object (1-90)
   - `GameName` : value object (non vide, max 200 chars)

3. Créer les constantes dans `src/lib/constants.ts`

4. Créer `src/lib/errors.ts` : hiérarchie d'erreurs métier
   - `GameError` (base)
   - `GameNotFoundError`
   - `CardNotFoundError`
   - `InvalidNumberError`
   - `GameNotRunningError`
   - `DuplicateDrawError`

**Tests** : Tests unitaires sur les value objects (validation), tests sur les types

**Gate** : `npm test` passe, types compilent sans `any`

---

### Phase 2 — Repositories (interfaces + implémentation Drizzle)

**Objectif** : Couche de persistance avec interface pure côté domaine, implémentation Drizzle derrière. La règle : le domaine ne dépend PAS de Drizzle. Drizzle implémente ce que le domaine définit.

**Tâches** :

1. Écrire les interfaces dans `src/repositories/interfaces/` :

```typescript
// IGameRepository
export interface IGameRepository {
  create(data: CreateGameDTO): Promise<Game>
  findById(id: number): Promise<Game | null>
  findByStatus(status: GameStatus): Promise<Game[]>
  updateStatus(id: number, status: GameStatus): Promise<void>
  setWinner(id: number, cardId: number): Promise<void>
}

// ICardRepository
export interface ICardRepository {
  create(data: CreateCardDTO): Promise<Card>
  bulkCreate(data: CreateCardDTO[]): Promise<Card[]>
  findById(id: number): Promise<Card | null>
  findBySerialNumber(serial: string): Promise<Card | null>
  findActive(): Promise<Card[]>
  deactivate(id: number): Promise<void>
  search(query: string): Promise<Card[]>
}

// IDrawRepository
export interface IDrawRepository {
  add(gameId: number, number: number, position: number): Promise<Draw>
  findByGame(gameId: number): Promise<Draw[]>
  getLastDraw(gameId: number): Promise<Draw | null>
}

// IGameCardRepository
export interface IGameCardRepository {
  addCardsToGame(gameId: number, cardIds: number[]): Promise<void>
  getCardIdsForGame(gameId: number): Promise<number[]>
}

// ICardProgressRepository
export interface ICardProgressRepository {
  upsert(gameId: number, cardId: number, foundCount: number): Promise<void>
  getTopByGame(gameId: number, limit: number): Promise<CardProgress[]>
  findByGame(gameId: number): Promise<CardProgress[]>
  deleteByGame(gameId: number): Promise<void>
}
```

2. Implémenter Drizzle dans `src/repositories/drizzle/` :
   - `DrizzleGameRepository`
   - `DrizzleCardRepository`
   - `DrizzleDrawRepository`
   - `DrizzleGameCardRepository`
   - `DrizzleCardProgressRepository`

3. Écrire le schema Drizzle dans `src/db/schema/` :
   - `games.ts`, `cards.ts`, `cardNumbers.ts`, `gamesCards.ts`, `draws.ts`, `cardProgress.ts`, `winners.ts`

4. Ajouter les contraintes SQL :
   - `cards.serial_number` UNIQUE
   - `card_numbers.card_id` + `number` UNIQUE (pas de doublon dans un carton)
   - `card_numbers.number` CHECK 1-90
   - `draws.game_id` + `position` UNIQUE
   - `card_progress` PK composite `(game_id, card_id)`

5. Générer la migration initiale

6. Écrire le client Drizzle et l'initialisation SQLite

**Tests** : Tests d'intégration sur chaque repository (insert/read/update), seed de 1000 cartons

**Gate** : `npm test` passe, 1000 cartons insérés en < 2s ✅

---

### Phase 3 — Moteur de calcul (Game Engine)

**Objectif** : Cœur du système. L'engine ne dépend de RIEN d'autre que les types domaine. Il reçoit des données en entrée, produit des résultats en sortie. Pas de DB, pas d'UI, pas de framework.

**Tâches** :

1. `src/engine/card-index.ts` : Index inversé

```typescript
export class CardIndex {
  // Map: number -> Set<cardId>
  private index: Map<number, Set<number>>
  // Total numbers per card (varie selon loto)
  private cardTotalNumbers: Map<number, number>

  constructor(cards: Card[]) { /* build index from Card[] */ }
  getCardIdsByNumber(number: number): Set<number>
  getTotalNumbers(cardId: number): number
}
```

2. `src/engine/score-calculator.ts` : Calcul des scores

```typescript
export class ScoreCalculator {
  // Map: cardId -> foundCount
  private scores: Map<number, number>
  // Combien de numéros il reste à trouver
  getFoundCount(cardId: number): number
  getRemainingCount(cardId: number): number
  getProgress(cardId: number): number // 0-100%
  getTopCards(limit: number): Array<{cardId: number, foundCount: number, totalCount: number}>
  markNumber(cardIds: Set<number>): void  // appelé quand un numéro sort
  unmarkNumber(cardIds: Set<number>): void // pour undo
}
```

3. `src/engine/winner-detector.ts` : Détection gagnant

```typescript
export class WinnerDetector {
  checkWinner(cardId: number, foundCount: number, totalCount: number): boolean
  // Retourne le premier gagnant, ou null
  findWinner(scores: ScoreCalculator): number | null
}
```

4. `src/engine/game-engine.ts` : Orchestrateur

```typescript
export class GameEngine {
  private index: CardIndex
  private calculator: ScoreCalculator
  private detector: WinnerDetector
  private drawnNumbers: number[]
  private status: 'idle' | 'running' | 'finished'

  loadCards(cards: Card[]): void
  startGame(): void
  drawNumber(number: number): DrawResult
  undoLastDraw(): DrawResult | null
  getTopCards(limit?: number): CardRanking[]
  getWinner(): number | null
  getState(): GameState
}
```

5. Gestion des cas critiques :
   - Ignorer un numéro déjà tiré (idempotence)
   - Annulation du dernier tirage (undo)
   - Détection de victoire immédiate (early exit)
   - Gestion des égalités (plusieurs gagnants)

**Tests** : TESTS CRITIQUES — couvrir 100% du engine :
- Construction index avec 100k cartons
- Ajout numéros et vérification scores
- Undo et retour à l'état précédent
- Détection gagnant au bon moment
- Performance : <50ms avec 10k cartons, <500ms avec 100k
- Idempotence : même numéro 2× → pas d'erreur
- Carton vide, carton invalide

**Gate** : `npm test` engine coverage >90%, 100k cartons <500ms après 15 tirages ✅

---

### Phase 4 — Use Cases (orchestration métier)

**Objectif** : La couche qui orchestre le domaine. Chaque use case est une fonction pure qui appelle repositories + engine.

**Tâches** :

1. `src/use-cases/game.usecase.ts` :

```typescript
// startGame(gameId): charge cartons, crée index, démarre
export async function startGame(
  gameRepo: IGameRepository,
  cardRepo: ICardRepository,
  gameCardRepo: IGameCardRepository,
  progressRepo: ICardProgressRepository,
  cardIndex: CardIndex
): Promise<GameEngine>

// drawNumber(gameId, number): enregistre tirage + met à jour progress
export async function drawNumber(
  gameId: number,
  number: number,
  engine: GameEngine,
  drawRepo: IDrawRepository,
  progressRepo: ICardProgressRepository
): Promise<DrawResult>

// undoLastDraw(gameId): annule + restaure progress
export async function undoLastDraw(
  gameId: number,
  engine: GameEngine,
  drawRepo: IDrawRepository,
  progressRepo: ICardProgressRepository
): Promise<DrawResult | null>
```

2. `src/use-cases/card.usecase.ts` :
   - `importCards(csvContent)`: validation + bulk insert
   - `searchCards(query)`: recherche
   - `deleteCard(id)`: désactivation

3. `src/use-cases/export.usecase.ts` : export des données

4. Validation métier dans chaque use case (erreurs typées)

**Tests** : Tests d'intégration avec repositories réels (SQLite mémoire) + engine

**Gate** : `npm test` passe, use cases couvrent tous les scénarios métier ✅

---

### Phase 5 — Zustand Store (séparation UI/Domaine)

**Objectif** : Un store Zustand qui ne contient QUE l'état nécessaire à l'affichage. L'engine vit en dehors.

**Tâches** :

1. `src/stores/game-store.ts` :

```typescript
interface GameUIState {
  // Engine reference (hors React)
  engine: GameEngine | null
  // UI state
  lastNumber: number | null
  drawnHistory: number[]
  topCards: Array<{serialNumber: string, foundCount: number, totalCount: number}>
  winner: {serialNumber: string, foundCount: number} | null
  status: 'idle' | 'running' | 'finished' | 'paused'
  activeCardCount: number
  currentGameId: number | null

  // Actions
  loadGame: (gameId: number) => Promise<void>
  drawNumber: (number: number) => Promise<void>
  undoLastDraw: () => Promise<void>
  reset: () => void
}
```

2. Séparation stricte : l'engine ne vit PAS dans Zustand, il est stocké dans une référence module (hors React).
   - Évite de sérialiser l'index à chaque render
   - L'engine est synchrone et vit dans le même process

**Tests** : Tests de store avec engine mock

**Gate** : Store fonctionnel avec engine, pas de re-render sauvage ✅

---

### Phase 6 — Composition Root (DI)

**Objectif** : Un seul endroit où tout est câblé ensemble. Les pages ne créent pas leurs dépendances.

**Tâches** :

1. `src/di/container.ts` :

```typescript
export function createContainer() {
  const db = getDb()
  
  // Repositories
  const gameRepo = new DrizzleGameRepository(db)
  const cardRepo = new DrizzleCardRepository(db)
  // ...

  // Engine factory
  const createEngine = () => new GameEngine()

  // Use cases
  const gameUseCases = createGameUseCases(gameRepo, cardRepo, drawRepo, progressRepo)
  const cardUseCases = createCardUseCases(cardRepo)

  return { gameUseCases, cardUseCases, gameRepo, createEngine }
}
```

2. Provider React (Context) pour le container

**Tests** : Test d'intégration du container complet

**Gate** : Container créé et utilisable dans les pages ✅

---

### Phase 7 — Import CSV + Page Cartons

**Objectif** : Interface fonctionnelle pour gérer les cartons.

**Tâches** :

1. Page `/cards` :
   - Liste paginée des cartons
   - Recherche par numéro de série
   - Suppression (désactivation)
   - Statistiques (total cartons, actifs, inactifs)

2. Page `/import` :
   - Drag & drop CSV
   - Validation côté client + serveur
   - Preview avant import
   - Barre de progression pour import massif
   - Rapport d'erreurs (lignes invalides)

3. Validation CSV :
   - Parse avec papaparse
   - Validation : série unique, 15 numéros, 1-90, pas de doublons
   - Transaction : tout ou rien (rollback si échec)

4. Composants shadcn/ui : Table, Dialog, Form, Input, Button, Pagination

**Tests** : Tester import avec fichier valide, fichier invalide, 10k cartons

**Gate** : Import 10k cartons < 5s, recherche instantanée ✅

---

### Phase 8 — Page Dashboard

**Objectif** : Vue d'ensemble des parties.

**Tâches** :

1. Page `/dashboard` (page d'accueil) :
   - Liste des parties avec statut
   - Bouton "Nouvelle partie"
   - Dernière partie en cours mise en avant
   - Stats : nombre total de parties, cartons, etc.

2. Modal/Page création partie :
   - Nom de la partie
   - Sélection des cartons (tous actifs par défaut)
   - Validation

**Tests** : Création partie, navigation, dashboard réactif

**Gate** : CRUD parties complet ✅

---

### Phase 9 — Interface Live (jeu en direct)

**Objectif** : L'écran principal utilisé pendant l'émission.

**Tâches** :

1. Page `/live/[gameId]` :
   - Mode plein écran (Fullscreen API)
   - Mode sombre par défaut
   - Layout sobre, très grands caractères

2. Affichages obligatoires :
   - **Dernier numéro** : immense, centré
   - **Historique** : grille des numéros tirés
   - **TOP 3 cartons** : série + score
   - **Compteur** : nombre total de tirages
   - **Nombre de cartons actifs**

3. Raccourcis clavier :
   - `ENTER` : valider le numéro saisi
   - `ESC` : annuler le dernier tirage
   - `SPACE` : pause/reprise
   - `F` : plein écran
   - `N` : nouvelle partie (après victoire)
   - Saisie directe du numéro (input caché, focus auto)

4. Écran de victoire :
   - Animation/Pulsation sur le gagnant
   - Son de notification (optionnel, configurable)
   - Bouton "Nouvelle partie"

5. État "en pause" :
   - Afficher l'écran grisé avec le statut "EN PAUSE"
   - REPRENDRE avec SPACE

6. Sauvegarde automatique :
   - Après chaque tirage : upsert card_progress
   - Après chaque tirage : insert draw
   - Si le navigateur ferme, la partie reprend avec l'historique DB

**Tests** : Simulation de partie complète avec 1000 cartons, test undo, test crash recovery

**Gate** : Partie complète jouable du début à la victoire, undo fonctionnel ✅

---

### Phase 10 — Tests de performance

**Objectif** : Vérifier les objectifs de performance.

**Tâches** :

1. Créer des benchmarks automatisés dans `src/engine/__benchmarks__/` :
   - Construction index avec 10k, 50k, 100k cartons
   - Ajout de 15 numéros et mesure du temps cumulé
   - Undo de 15 numéros
   - Recherche top cartons

2. Seuils :
   - 10k cartons : index < 200ms, draw < 10ms
   - 50k cartons : index < 1s, draw < 20ms
   - 100k cartons : index < 2s, draw < 50ms

3. Si les seuils ne sont pas atteints :
   - Vérifier l'utilisation de Set/Map (vs Array)
   - Vérifier l'allocation mémoire
   - Envisager Web Worker si > 50ms pour un draw

**Gate** : Tous les seuils atteints, rapport de benchmark ✅

---

### Phase 11 — Design System + Thème

**Objectif** : Définir et appliquer le design system complet avant le polissage UX.

**Tâches** :

1. Définir la palette dans `globals.css` (CSS variables shadcn, pas de couleurs en dur) :
   ```css
   /* Convient à une console broadcast : fond profond, accents vifs */
   :root {
     --background: 0 0% 100%
     --foreground: 222.2 84% 4.9%
     --card: 0 0% 100%
     --primary: 183 100% 35%      /* Teal vif */
     --accent: 0 0% 96%
   }
   .dark {
     --background: 0 0% 0%        /* OLED #000000 */
     --card: 0 0% 7%              /* #121212 */
     --primary: 183 80% 40%       /* Teal néon */
     --accent: 183 60% 15%
   }
   ```

2. Définir les tokens de typographie :
   - Chiffres live : `text-[96px] font-bold tabular-nums`
   - Historique : `text-2xl font-mono`
   - Top cartons : `text-lg font-semibold`
   - Corps : `text-sm font-normal`

3. Définir les tokens de spacing : 4/8/12/16/24/32/48px

4. Définir les animations/tokens de transition :
   - Révélation numéro : `animate-in fade-in zoom-in-50 duration-200`
   - Highlight top card : `transition-colors duration-150`
   - Glow sur dernier numéro : `drop-shadow(0 0 12px hsl(var(--primary)))`

5. Appliquer le thème à tous les composants existants :
   - Remplacer les classes Tailwind en dur par `bg-card`, `text-card-foreground`, etc.
   - Vérifier que tous les composants utilisent les CSS variables

6. Ajouter `color-scheme: dark` dans le `<html>` pour le mode sombre natif

7. Installer les composants shadcn manquants via CLI : `npx shadcn@latest add card dialog toast sonner skeleton`

8. Ajouter `<Toaster />` dans le layout racine pour les notifications

9. Créer un composant `ThemeProvider` avec `next-themes` pour le toggle clair/sombre

**Tests** : Vérifier que tous les composants utilisent les tokens, pas de couleur en dur, mode sombre/clair fonctionnel

**Gate** : `globals.css` propre, pas de `bg-blue-500` ou `text-gray-900` nulle part ✅

---

### Phase 12 — UX Pro (polissage)

**Objectif** : Interface digne d'un logiciel métier, optimisée pour le direct radio.

**Tâches** :

1. Layout responsive optimisé desktop (1280×720 minimum) avec point de rupture mobile à 768px

2. Micro-interactions live :
   - Animation de révélation du dernier numéro (scale + fade)
   - Count-up animation sur les scores des top cartons
   - Highlight pulsé sur le 1er du top quand il progresse
   - Transition fluide du fond de carte (found vs pending)

3. Plein écran natif :
   - Fullscreen API au clic ou `F`
   - Curseur caché après 3s d'inactivité en plein écran
   - Scrollbar masquée en mode live

4. Accessibilité clavier étendue :
   - `F` / `F11` : plein écran
   - `N` : nouvelle partie (après victoire)
   - `?` / `H` : aide des raccourcis (overlay modal)
   - `Ctrl+Z` : undo (en plus de ESC)
   - `↑` / `↓` : navigation dans l'historique des numéros (optionnel)
   - Focus trap actif en mode live (Tab ne sort pas de l'app)
   - `inputmode='numeric'` sur le champ de saisie
   - `autofocus` sur l'input live au chargement

5. Gestion des erreurs utilisateur :
   - Toast Sonner pour "Numéro déjà tiré"
   - Toast Sonner pour "Numéro invalide (1-90)"
   - Toast Sonner pour "Partie sauvegardée"
   - Confirmation dialog avant nouvelle partie si partie en cours
   - Son d'erreur court (optionnel, désactivable)

6. Remplacer les émojis par des icônes SVG Lucide :
   - `🥇🥈🥉` → `<Trophy />` avec couleurs or/argent/bronze
   - `🎉` → `<Sparkles />` + `<PartyPopper />`
   - `✅` → `<CheckCircle2 />`
   - `❌` → `<XCircle />`

7. État "en pause" amélioré :
   - Overlay semi-transparent avec glow pulsé "EN PAUSE — SPACE pour reprendre"
   - Horloge du temps écoulé (optionnel)

8. Écran de victoire :
   - Confettis canvas (optionnel, léger)
   - Highlight pulsé du carton gagnant dans la liste
   - Toast "🎉 GAGNANT !" avec le numéro de série
   - Bouton "Nouvelle partie" focusé automatiquement

9. Export des résultats :
   - CSV ou JSON des tirages + gagnant
   - Résumé text pour impression rapide

10. Page d'aide (`/help` ou modal `?`) :
    - Liste complète des raccourcis clavier
    - Instructions rapides (1. Créer partie 2. Charger cartons 3. Jouer)

11. Curseur :
    - `cursor-pointer` sur les cartons cliquables, boutons
    `cursor-none` en plein écran live après inactivité

12. `prefers-reduced-motion` respecté : désactiver toutes les animations si l'utilisateur le demande

**Tests** : Test utilisateur complet sans souris, test fullscreen, test animations reduced-motion

**Gate** : L'opérateur peut jouer une partie complète sans souris, en plein écran, avec retour visuel ✅

---

### Phase 13 — Sauvegarde + Récupération

**Objectif** : L'application ne perd JAMAIS une partie.

**Tâches** :

1. Sauvegarde auto toutes les 5 secondes pendant une partie (card_progress)
2. Au démarrage d'une partie, avant de commencer :
   - Vérifier si des card_progress existent pour cette partie
   - Si oui : restaurer l'état mémoire et demander "Reprendre la partie ?"
3. Export SQLite (backup vers fichier horodaté)
4. Log des actions utilisateur dans la console (debug)

**Tests** : Crash simulation (kill process), reprise exacte

**Gate** : Reprise de partie après crash sans perte de données ✅

---

### Phase 14 — Refactoring post-MVP

**Objectif** : Nettoyer avant d'ajouter des features.

**Tâches** :

1. Vérifier les principes Clean Architecture :
   - Engine ne dépend de rien d'externe ✅
   - Pages ne contiennent pas de logique métier ✅
   - Repositories derrière interfaces ✅
2. Supprimer le code mort
3. Uniformiser les noms (vérifier le langage ubiquitaire)
4. Vérifier la couverture de test (viser 80%+ sur engine, 60%+ sur repositories)
5. Documenter les décisions d'architecture

**Gate** : `npm run lint`, `npm run typecheck`, `npm test` passent sans warning ✅

---

### Phase 15 — Évolution SaaS (préparation)

**Objectif** : Architecture prête pour la migration cloud.

**Tâches** :

1. Migrer Drizzle SQLite → PostgreSQL :
   - Changer le driver Drizzle
   - Vérifier les types (SQLite n'a pas de boolean, PostgreSQL oui)
   - Vérifier les migrations
2. Ajouter Supabase Auth :
   - Connexion email/mot de passe
   - Protection des routes
3. Multi-tenant :
   - Ajouter `user_id` ou `organization_id` aux tables
   - Isoler les données
4. Realtime :
   - Optionnel : Supabase Realtime pour synchronisation multi-appareils

---

## 3. Résumé des corrections par rapport au plan original

| Original | Corrigé |
|---|---|
| Phase 1 : Init projet | **Phase 0** : Setup + structure complète + toolchain |
| Phase 2 : Base de données | **Phase 1** : Domain Model (pur), **Phase 2** : Repositories + Drizzle |
| Phase 3 : Gestion cartons | **Phase 7** : Import + page cartons (après le moteur !) |
| Phase 4 : Moteur Lotoquine | **Phase 3** : Engine (tests avant UI) |
| (manquant) | **Phase 4** : Use Cases |
| (manquant) | **Phase 5** : Zustand Store |
| (manquant) | **Phase 6** : Composition Root |
| Phase 5 : Interface Live | **Phase 9** : Live |
| Phase 6 : Optimisation | **Phase 10** : Benchmarks (mesure avant optimisation) |
| Phase 7 : UX pro (insuffisant) | **Phase 11** : Design System (tokens, thème, CSS variables) |
| (manquant) | **Phase 12** : UX Pro (micro-interactions, fullscreen, a11y clavier, icônes Lucide) |
| Phase 8 : Sécurité | **Phase 13** : Sauvegarde + récupération |
| (manquant) | **Phase 14** : Refactoring post-MVP |
| Phase 9 : SaaS | **Phase 15** : Évolution SaaS |

---

## 4. Règles pour l'agent IA

### Priorités absolues

1. **L'engine ne DOIT PAS dépendre de Next.js, Drizzle ou Zustand.** Il doit pouvoir tourner dans Node.js, un Web Worker, ou une Edge Function.
2. **Chaque phase doit produire quelque chose de testable.** Pas de "ça compile" comme seul critère.
3. **Tout ajout de feature commence par le test.**
4. **L'architecture doit rester locale-first.** Le SaaS est une évolution, pas le design initial.
5. **Le clavier est roi.** Toute fonctionnalité doit être accessible sans souris.

### Anti-patterns à éviter

- ❌ `Zustand store` qui contient l'engine
- ❌ `Repository` qui dépend du type Drizzle plutôt que du type domaine
- ❌ `Page` qui appelle Drizzle directement
- ❌ `Engine` qui importe something from `next/*` ou `zustand`
- ❌ Optimisation avant d'avoir mesuré
- ❌ Complexité inutile au MVP (WebSocket, Redis, etc.)
- ❌ Émojis comme icônes UI (🥇🎉✅) → utiliser Lucide SVG
- ❌ Couleurs en dur (`bg-blue-500`) → utiliser CSS variables shadcn
- ❌ Pas de `cursor-pointer` sur les éléments interactifs
- ❌ `outline-none` sans `focus-visible:ring` de remplacement
- ❌ Ignorer `npx shadcn@latest init` avant d'ajouter des composants
- ❌ Page live sans focus trap (Tab qui sort de l'application)
- ❌ Mode sombre uniquement sans prévoir le thème clair

### Arbre de décision pour les compromis

```
Le changement risque de casser l'architecture ?
├── OUI -> Peut-on le reporter ?
│   ├── OUI -> Reporter en phase post-MVP
│   └── NON -> Faire le minimum, documenter la dette
└── NON -> Implementer proprement
```

### Structure de fichier finale attendue

```
src/
  app/                    # Next.js App Router
    (dashboard)/
      dashboard/page.tsx
      cards/page.tsx
      import/page.tsx
    live/
      [gameId]/page.tsx
  components/
    ui/                   # shadcn/ui
    features/             # Composants métier
      card-table.tsx
      game-live.tsx
      number-display.tsx
      top-cards.tsx
      game-history.tsx
  lib/
    constants.ts
    errors.ts
    validation.ts
  db/
    schema/
      games.ts
      cards.ts
      card-numbers.ts
      games-cards.ts
      draws.ts
      card-progress.ts
      winners.ts
    client.ts
    migrations/
  engine/
    card-index.ts
    score-calculator.ts
    winner-detector.ts
    game-engine.ts
    __tests__/
    __benchmarks__/
  repositories/
    interfaces/
      igame-repository.ts
      icard-repository.ts
      idraw-repository.ts
      igame-card-repository.ts
      icard-progress-repository.ts
    drizzle/
      drizzle-game-repository.ts
      drizzle-card-repository.ts
      drizzle-draw-repository.ts
      drizzle-game-card-repository.ts
      drizzle-card-progress-repository.ts
  use-cases/
    game.usecase.ts
    card.usecase.ts
    export.usecase.ts
  stores/
    game-store.ts
    ui-store.ts
  di/
    container.ts
    provider.tsx
  types/
    domain.ts
    vo.ts
    dto.ts
```
