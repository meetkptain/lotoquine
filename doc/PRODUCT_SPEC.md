# Lotoquine Assistant - Vision Produit

## Contexte

Créer une application d'assistance pour jouer au Lotoquine Radio Free Dom.

L'utilisateur possède un grand nombre de cartons papier. Chaque carton possède :

* un numéro de série unique ;
* une grille de numéros ;
* une combinaison gagnante potentielle.

Pendant une partie diffusée à la radio :

* les numéros sont annoncés en direct ;
* l'utilisateur saisit les numéros sortis dans l'application ;
* l'application analyse instantanément tous les cartons ;
* elle indique les cartons les plus proches de gagner ;
* elle détecte automatiquement un gagnant.

L'application est un outil d'aide au joueur/opérateur.

---

# Objectif principal

Permettre à une personne de suivre une partie de Lotoquine avec plusieurs milliers de cartons sans faire de calcul manuel.

Le logiciel doit :

1. Importer les cartons.
2. Créer une partie.
3. Recevoir les numéros tirés.
4. Calculer la progression de chaque carton.
5. Afficher les meilleurs cartons.
6. Détecter le gagnant.
7. Relancer rapidement une nouvelle partie.

---

# Philosophie UX

L'application doit être pensée comme une console professionnelle.

Priorités :

1. Rapidité
2. Simplicité
3. Zéro erreur
4. Utilisable pendant une émission radio

L'opérateur doit pouvoir utiliser l'application principalement au clavier.

---

# Fonctionnement métier

## Avant la partie

L'utilisateur charge ses cartons.

Exemple :

Carton :

```
Numéro série : FD458921

Numéros :
12
23
45
67
89
...
```

Les cartons sont stockés dans la base.

---

## Pendant la partie

La radio annonce :

```
Numéro 45
```

L'utilisateur saisit :

```
45 + ENTER
```

Le système :

* ajoute le numéro au tirage ;
* met à jour les scores ;
* recalcule les cartons proches ;
* vérifie les gagnants.

---

## Fin de partie

Lorsqu'un carton possède tous ses numéros :

Afficher :

```
🎉 GAGNANT

Carton :
FD458921

15/15 numéros trouvés
```

Puis possibilité :

```
Nouvelle partie
```

---

# Fonctionnalités MVP

## Gestion des cartons

* Ajouter un carton manuellement
* Import CSV
* Liste des cartons
* Recherche par numéro de série
* Suppression
* Validation des données

---

## Gestion des parties

Créer une partie :

* nom
* date
* cartons associés
* statut

Statuts :

```
WAITING
RUNNING
FINISHED
```

---

## Jeu en direct

Interface principale :

Afficher :

* dernier numéro
* historique des numéros
* nombre de cartons actifs
* top cartons
* gagnant

---

## Classement des cartons

Afficher les cartons les plus avancés.

Exemple :

```
TOP CARTONS

🥇 FD458921
14/15 numéros

🥈 FD222222
13/15 numéros

🥉 FD999999
12/15 numéros
```

---

# Architecture technique

## Stack

Frontend :

* Next.js 15
* TypeScript
* Tailwind CSS
* shadcn/ui

Backend :

* Next.js Server Actions / API routes

ORM :

* Drizzle ORM

Base de données MVP :

* SQLite local

Evolution :

* PostgreSQL Supabase

---

# Structure projet

```
src/

app/
    dashboard/
    cards/
    import/
    games/
    live/

components/

lib/

db/

engine/
```

---

# Base de données

## games

Table des parties.

Champs :

```
id
name
status
created_at
started_at
finished_at
winner_card_id
```

---

## cards

Table des cartons.

Champs :

```
id
serial_number
active
created_at
```

---

## card_numbers

Numéros associés aux cartons.

Champs :

```
id
card_id
number
```

---

## draws

Numéros tirés pendant une partie.

Champs :

```
id
game_id
number
position
created_at
```

---

# Moteur de calcul

Point critique.

Ne pas scanner tous les cartons après chaque numéro.

Utiliser un index inversé.

Exemple :

```
Numéro 45

index :

45 :
[
 carton_001,
 carton_045,
 carton_999
]
```

Quand un numéro sort :

```
45
|
Recherche index
|
Mise à jour uniquement des cartons concernés
```

Objectif :

Supporter :

* 10 000 cartons
* 100 000 cartons
* calcul instantané

---

# Etat mémoire

Au démarrage d'une partie :

Charger les cartons actifs en mémoire.

Structure :

```typescript
{
 id:"FD458921",

 numbers:[
 12,
 34,
 45
 ],

 found:10
}
```

---

# UX Interface

## Dashboard

Afficher :

* parties en cours
* nombre cartons
* dernières actions

---

## Page Cartons

Fonctions :

* import
* ajout
* recherche

---

## Page Live

Interface principale.

Design :

* plein écran
* mode sombre
* gros chiffres
* boutons accessibles

Exemple :

```
--------------------------------

LOTOQUINE LIVE


Dernier numéro

45


Historique

12 67 89 45


TOP CARTONS

FD458921
14/15


--------------------------------
```

---

# Raccourcis clavier

Obligatoires :

```
ENTER
Valider numéro

ESC
Annuler dernier numéro

SPACE
Pause/reprise
```

---

# Sécurité

Prévoir :

* sauvegarde automatique
* historique des actions
* récupération après fermeture

---

# Evolutions futures

## OCR

Scanner les cartons papier.

## QR Code

Identifier rapidement un carton.

## Reconnaissance vocale

L'application écoute la radio et détecte les numéros.

## SaaS

Version multi-clients :

* radios
* associations
* CSE
* organisateurs de loto

---

# Critères de réussite

L'application est réussie si :

* l'import de milliers de cartons est rapide ;
* chaque numéro saisi met à jour les résultats instantanément ;
* le gagnant est détecté automatiquement ;
* l'opérateur n'a besoin que du clavier ;
* une nouvelle partie peut être lancée en quelques secondes.
