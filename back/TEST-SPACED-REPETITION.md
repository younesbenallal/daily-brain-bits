# 🧠 Test Spaced Repetition System

Ce dossier contient des outils de test pour vérifier le bon fonctionnement du système de spaced-repetition adapté aux intégrations Notion.

## 🛠️ Outils de test disponibles

### 1. 🌐 Interface Web de Test (`test-spaced-repetition.html`)

Une interface web simple et intuitive pour tester tous les endpoints du système.

**Comment utiliser :**

1. Démarrez le serveur backend :

   ```bash
   npm start
   ```

2. Ouvrez le fichier HTML dans votre navigateur :

   ```bash
   open test-spaced-repetition.html
   # ou double-cliquez sur le fichier
   ```

3. Configurez les paramètres :
   - **User ID** : Identifiant utilisateur (par défaut : `test-user-123`)
   - **API URL** : URL de l'API (par défaut : `http://localhost:3001`)

4. Testez les fonctionnalités :
   - ✅ **Test de connexion API** (automatique au chargement)
   - 📝 **Créer des cartes** depuis les pages Notion stockées
   - 🔄 **Synchroniser** (méthode legacy)
   - 📅 **Cartes du jour**

### 2. 🖥️ Script en ligne de commande (`test-spaced-repetition.js`)

Un script Node.js pour des tests automatisés rapides.

**Comment utiliser :**

```bash
# Démarrer le serveur backend
npm start

# Dans un autre terminal, exécuter les tests
cd back
node test-spaced-repetition.js
# ou
./test-spaced-repetition.js
```

**Sortie exemple :**

```
🚀 Démarrage des tests Spaced Repetition
==================================================

📋 Test 1: Vérification de la santé de l'API
🔄 GET http://localhost:3001/health
📊 Status: 200
📥 Response: {
  "status": "healthy",
  "database": "connected"
}

📋 Test 2: Créer des cartes depuis les pages stockées
🔄 POST http://localhost:3001/users/test-user-123/spaced-repetition/cards/create
📤 Body: {
  "databaseIds": ["1d5fb477-920c-8019-a199-d9ce62148156"]
}
📊 Status: 200
📥 Response: {
  "message": "Cartes créées à partir des pages stockées",
  "cardsCount": 5,
  "cards": [...]
}

==================================================
📊 RÉSUMÉ DES TESTS
==================================================
✅ PASS Health Check
✅ PASS Create Cards
✅ PASS Sync Cards
✅ PASS Today Cards

🎯 Résultat: 4/4 tests réussis
🎉 Tous les tests sont passés ! Le système fonctionne correctement.
```

## 🎯 Endpoints testés

| Endpoint                                        | Méthode | Description                                |
| ----------------------------------------------- | ------- | ------------------------------------------ |
| `/health`                                       | GET     | Vérification de la santé de l'API          |
| `/users/:userId/spaced-repetition/cards/create` | POST    | Créer des cartes depuis les pages stockées |
| `/users/:userId/spaced-repetition/sync`         | POST    | Synchroniser (méthode legacy)              |
| `/users/:userId/spaced-repetition/today`        | GET     | Obtenir les cartes du jour                 |

## 🔧 Configuration des tests

### Database IDs par défaut

Les tests utilisent ces IDs de bases de données Notion par défaut :

```json
["1d5fb477-920c-8019-a199-d9ce62148156", "1d5fb477-920c-803d-8d73-e7ce190ba375"]
```

### User ID de test

- **Par défaut** : `test-user-123`
- **Modifiable** dans l'interface web ou dans le script

## 🚨 Prérequis

1. **Serveur backend** démarré sur le port 3001
2. **Base de données** configurée et accessible
3. **Pages Notion** stockées dans la base pour l'utilisateur de test
4. **Node.js 18+** (pour le support natif de `fetch`)

## 🐛 Dépannage

### ❌ Erreur de connexion

```
Error: fetch failed
```

**Solution** : Vérifiez que le serveur backend est démarré :

```bash
npm start
```

### ❌ Erreur "Notion integration not found"

```json
{
  "error": "Notion integration not found for user"
}
```

**Solutions** :

1. Vérifiez que l'utilisateur a une intégration Notion active
2. Utilisez un User ID valide existant dans la base
3. Vérifiez les données dans la table `integrations`

### ❌ Erreur "No pages found"

```json
{
  "cardsCount": 0,
  "cards": []
}
```

**Solutions** :

1. Vérifiez que des pages sont stockées dans la table `notion_pages`
2. Exécutez d'abord l'endpoint `/notion-page/all-notes` pour récupérer les pages
3. Vérifiez que les Database IDs correspondent aux bases de données de l'utilisateur

## 📊 Interprétation des résultats

### ✅ Succès

- **Status 200** : Requête réussie
- **cardsCount > 0** : Des cartes ont été trouvées/créées
- **Données retournées** : Le système fonctionne correctement

### ❌ Échec

- **Status 400** : Erreur de paramètres (User ID manquant, etc.)
- **Status 404** : Endpoint non trouvé
- **Status 500** : Erreur serveur (vérifiez les logs backend)

## 🔄 Workflow de test recommandé

1. **Démarrer le backend** : `npm start`
2. **Tester la connexion** : Interface web ou script
3. **Vérifier les données** : S'assurer que l'utilisateur a des pages Notion
4. **Créer des cartes** : Utiliser l'endpoint principal
5. **Tester les autres fonctionnalités** : Cartes du jour, etc.

---

💡 **Tip** : Utilisez l'interface web pour des tests interactifs et le script pour des tests automatisés dans votre workflow de développement !
