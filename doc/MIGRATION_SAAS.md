# Migration SaaS — Guide technique

## Architecture actuelle (MVP)

```
Client (React)
  ↓ Server Actions
Server (Next.js)
  ↓ Drizzle ORM
SQLite (better-sqlite3)
```

## Architecture cible (SaaS)

```
Client (React)
  ↓ Server Actions / API
Server (Next.js)
  ↓ Drizzle ORM
PostgreSQL (Supabase)
  ↓
Supabase Auth
Supabase Realtime
```

## Étapes de migration

### 1. Base de données

Remplacer `drizzle-orm/better-sqlite3` par `drizzle-orm/postgres-js` ou `drizzle-orm/@supabase/supabase-js`.

```diff
- import { drizzle } from "drizzle-orm/better-sqlite3"
- import Database from "better-sqlite3"
+ import { drizzle } from "drizzle-orm/postgres-js"
+ import postgres from "postgres"
```

Modifier `drizzle.config.ts` :

```diff
- dialect: "sqlite"
+ dialect: "postgresql"
- url: "./data/lotoquine.db"
+ url: process.env.DATABASE_URL!
```

### 2. Schema Drizzle

Les types SQLite → PostgreSQL changent légèrement :

| SQLite | PostgreSQL |
|---|---|
| `integer("id").primaryKey({ autoIncrement: true })` | `serial("id").primaryKey()` |
| `text("created_at")` avec ISO string | `timestamp("created_at").defaultNow()` |
| `integer("active", { mode: "boolean" })` | `boolean("active").default(true)` |

### 3. Authentification

Ajouter Supabase Auth :

```bash
npm install @supabase/supabase-js @supabase/ssr
```

Créer `src/lib/supabase.ts` avec le client serveur/client.

Ajouter `userId` aux tables `games` et `cards`.

### 4. Realtime

Pour synchronisation multi-appareils (radio + régie) :
- Utiliser Supabase Realtime sur la table `draws`
- Le moteur de jeu reçoit les événements Realtime au lieu de l'input clavier local

### 5. Déploiement

```bash
# Build
npm run build

# Démarrer avec PostgreSQL
DATABASE_URL=postgresql://... npm run start
```

## Ce qui ne change PAS

- `src/engine/` — pur TypeScript, zéro dépendance
- `src/types/` — interfaces domaine
- `src/lib/validation.ts` — validation métier
- `src/lib/errors.ts` — hiérarchie d'erreurs
- `src/lib/constants.ts` — constantes
- Composants UI (shadcn)
