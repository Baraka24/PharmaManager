# PharmaManager (démo)

Application de démonstration côté client (HTML/JS) pour la gestion de pharmacie: Inventaire, Commandes, Reçus et Factures, avec rapports entre deux dates. Aucune base de données: les données sont stockées dans le localStorage du navigateur.

## Lancer

Placez le dossier dans votre `Apache24/htdocs` puis ouvrez:

- http://localhost/PharmaManager/

Ou ouvrez directement `index.html` dans un navigateur récent.

## Technologies

- Bootstrap 5.3.3 (CDN)
- JavaScript pur (localStorage)

## Fonctionnalités

- Navigation: Tableau de bord, Inventaire, Commandes, Reçus, Factures, Rapports
- Formulaires d'ajout pour chaque module
- Listes avec filtres par période (Du/Au)
- Rapports entre deux dates avec totaux
- Export CSV des tableaux
- Chargement de données de démonstration
- Bouton de réinitialisation des données

## Limites

- Démonstration sans serveur: pas d'authentification ni de base de données
- Données perdues si vous videz le stockage du navigateur

## Structure

- `index.html` — Application SPA simple avec sections et navigation
- `assets/js/app.js` — Logique de l'application (stockage, rendu, rapports)
- `assets/css/styles.css` — Styles légers
