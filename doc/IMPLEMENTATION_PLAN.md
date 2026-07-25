# Lotoquine Assistant - Plan d'implémentation

Objectif : Construire progressivement un MVP fonctionnel.

---

# Phase 1 - Initialisation projet

## Tâches

Créer :

* Next.js 15
* TypeScript
* Tailwind
* shadcn/ui
* Drizzle ORM
* SQLite

Résultat : Application démarrable.

---

# Phase 2 - Base de données

Créer :

* schema Drizzle
* migrations
* connexion SQLite

Tables :

* games
* cards
* card_numbers
* draws
* winners

Tester insertion lecture.

---

# Phase 3 - Gestion cartons

Créer interface :

```
/cards
```

Fonctions :

* liste cartons
* recherche
* ajout manuel

---

Créer :

```
/import
```

Fonctions :

* upload CSV
* validation
* import massif

Tester avec 10 000 cartons.

---

# Phase 4 - Moteur Lotoquine

Créer :

```
src/engine
```

Modules :

## Card Index

Créer index numéro -> cartons.

## Score Calculator

Calculer :

* numéros trouvés
* numéros restants
* pourcentage

## Winner Detector

Détecter score maximum.

---

# Phase 5 - Interface Live

Créer :

```
/live
```

Fonctions :

* démarrer partie
* saisir numéro
* historique tirage
* top cartons
* gagnant

Raccourcis :

* ENTER : valider
* ESC : annuler

---

# Phase 6 - Optimisation

Tester :

* 10 000 cartons
* 100 000 cartons

Mesurer temps après ajout numéro. Objectif : instantané.

---

# Phase 7 - UX professionnelle

Ajouter :

* mode plein écran
* mode sombre
* animations
* sons
* notifications
* sauvegarde automatique

---

# Phase 8 - Sécurité

Ajouter :

* backup SQLite
* export données
* journal actions

---

# Phase 9 - Evolution SaaS

Migration :

SQLite -> Supabase PostgreSQL

Ajouter :

* comptes utilisateurs
* organisations
* partage parties
* cloud sync

---

# Règles pour l'agent IA

Toujours :

* expliquer avant gros changements
* créer des composants réutilisables
* garder moteur indépendant
* écrire du code propre
* tester les fonctions critiques

Ne jamais :

* mettre toute la logique dans les composants React
* scanner tous les cartons à chaque numéro
* créer une architecture trop complexe au MVP
