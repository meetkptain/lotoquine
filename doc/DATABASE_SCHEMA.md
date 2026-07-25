# Lotoquine Assistant - Database Schema

Base MVP : SQLite + Drizzle ORM

---

# Table games

Stocke les parties.

```sql
games
 id
 name
 status        -- WAITING | RUNNING | FINISHED
 created_at
 started_at
 finished_at
 winner_card_id
```

Exemple :

```
id: 1
name: Lotoquine Free Dom 21/07
status: RUNNING
```

---

# Table cards

Stocke les cartons.

```sql
cards
 id
 serial_number
 active
 created_at
```

Exemple :

```
id: 12345
serial_number: FD458921
active: true
```

---

# Table card_numbers

Relation carton -> numéros.

```sql
card_numbers
 id
 card_id
 number
```

Exemple :

```
card_id: 12345
number: 45
```

---

# Table games_cards

Association partie/cartons.

Permet de choisir quels cartons participent.

```sql
games_cards
 id
 game_id
 card_id
```

---

# Table draws

Historique des numéros tirés.

```sql
draws
 id
 game_id
 number
 position
 created_at
```

Exemple :

```
game: 1
number: 45
position: 12
```

---

# Table card_progress

Etat pendant une partie. Optionnel. Permet sauvegarde rapide.

```sql
card_progress
 game_id
 card_id
 found_count
 score
 updated_at
```

---

# Table winners

Historique des gagnants.

```sql
winners
 id
 game_id
 card_id
 created_at
```

---

# Relations

```
GAME
 |
 +---- DRAW
 |
 +---- GAME_CARDS
          |
        CARDS
          |
        CARD_NUMBERS
```

---

# Index SQL importants

Créer :

* cards.serial_number
* card_numbers.number
* draws.game_id
* games.status

---

# Import cartons

Format CSV attendu :

```
serial_number,n1,n2,n3,n4,...,n15
FD0001,12,34,45,67
FD0002,2,18,44,90
```

---

# Validation

Lors import :

Vérifier :

* série unique
* nombre correct de numéros
* numéros compris dans plage autorisée
* pas de doublons internes
