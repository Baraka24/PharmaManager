# PharmaManager (démo)

Application de démonstration côté client (HTML/JS) pour la gestion de pharmacie: Inventaire, Commandes, Reçus et Factures, avec rapports entre deux dates. Aucune base de données: les données sont stockées dans le localStorage du navigateur.

## Lancer

Placez le dossier dans votre `Apache24/htdocs` puis ouvrez:

- http://localhost/PharmaManager/

Ou ouvrez directement `index.html` dans un navigateur récent.

## Technologies

- Bootstrap 5.3.3 (CDN) + Bootstrap Icons
- JavaScript pur (localStorage)

## Fonctionnalités

- Navigation: Tableau de bord, Inventaire, Commandes, Reçus, Factures, Rapports
- Icônes cliquables sur le menu, le tableau de bord et les boutons
- Formulaires d'ajout pour chaque module, édition et suppression en ligne
- Actions par ligne: Éditer, Supprimer, Imprimer PDF (sauf Rapports)
- Impressions PDF: fiche d'un enregistrement et tableau filtré
- Inventaire: alertes de stock bas et d'expiration (paramètres configurables: seuil et mois)
- Listes avec filtres par période (Du/Au)
- Rapports entre deux dates avec totaux
- Chargement de données de démonstration
- Bouton de réinitialisation des données

## Limites

- Démonstration sans serveur: pas d'authentification ni de base de données
- Données perdues si vous videz le stockage du navigateur

## Structure

- `index.html` — Application SPA simple avec sections et navigation
- `assets/js/app.js` — Logique de l'application (stockage, rendu, actions, impressions, alertes)
- `assets/css/styles.css` — Styles légers
