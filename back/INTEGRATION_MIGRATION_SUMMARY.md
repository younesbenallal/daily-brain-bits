# Migration vers le système d'intégrations

## Résumé des changements

### 1. Nouvelle architecture

- **Avant** : Le token Notion était stocké directement dans la table `user` via le champ `notion_token`
- **Après** : Les intégrations sont stockées dans une table séparée `integrations` qui permet de gérer plusieurs intégrations par utilisateur

### 2. Nouvelle table `integrations`

```sql
CREATE TABLE integrations (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,  -- 'notion', 'obsidian', etc.
  name VARCHAR(255) NOT NULL, -- Nom personnalisé de l'intégration
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMP,
  metadata JSONB,             -- Données spécifiques à l'intégration
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);
```

### 3. Fichiers créés/modifiés

#### Nouveaux fichiers :

- `back/src/db/schemas/integrations.schema.ts` - Schéma Drizzle pour les intégrations
- `back/src/modules/integrations/integration.service.ts` - Service pour gérer les intégrations
- `back/src/modules/integrations/integration.controller.ts` - Contrôleur pour les endpoints d'intégrations
- `back/src/modules/database/migrations/create_integrations_table.sql` - Migration SQL

#### Fichiers modifiés :

- `back/src/modules/auth/auth.service.ts` - Méthode `notionCallback` mise à jour
- `back/src/modules/users/user.service.ts` - Nouvelles méthodes pour inclure les intégrations
- `back/src/modules/users/user.controller.ts` - Utilise les nouvelles méthodes avec intégrations
- `back/src/modules/database/schemas/index.ts` - Export du schéma integrations

### 4. Fonctionnalités du nouveau système

#### IntegrationService :

- `createIntegration()` - Créer une nouvelle intégration
- `getUserIntegrations()` - Récupérer toutes les intégrations d'un utilisateur
- `getUserActiveIntegrations()` - Récupérer les intégrations actives
- `getUserIntegrationByType()` - Récupérer une intégration par type
- `updateIntegration()` - Mettre à jour une intégration
- `deactivateIntegration()` - Désactiver une intégration (soft delete)
- `deleteIntegration()` - Supprimer définitivement une intégration
- `createNotionIntegration()` - Méthode spécifique pour Notion
- `getNotionIntegration()` - Récupérer l'intégration Notion d'un utilisateur
- `hasActiveIntegration()` - Vérifier si un utilisateur a une intégration active

#### Compatibilité :

- Les utilisateurs existants gardent leur intégration Notion
- L'API `/users` retourne maintenant `hasNotionIntegration: boolean`
- Le champ `notionToken` est maintenu pour la compatibilité (valeur: 'integrated' si présent)

### 5. Avantages du nouveau système

1. **Extensibilité** : Facile d'ajouter de nouvelles intégrations (Obsidian, Google Drive, etc.)
2. **Flexibilité** : Chaque utilisateur peut avoir plusieurs intégrations du même type
3. **Métadonnées** : Stockage de données spécifiques à chaque intégration (workspace info, etc.)
4. **Gestion avancée** : Soft delete, gestion des tokens de rafraîchissement, expiration
5. **Sécurité** : Isolation des tokens par intégration

### 6. Prochaines étapes

1. Tester le système avec le frontend
2. Ajouter les routes pour le contrôleur d'intégrations
3. Supprimer le champ `notion_token` de la table `user` (après validation)
4. Implémenter d'autres intégrations (Obsidian, etc.)

### 7. Migration des données

✅ **Terminé** : Les données existantes ont été migrées automatiquement lors de l'exécution de la migration SQL.

### 8. Endpoints disponibles

Les nouveaux endpoints d'intégrations peuvent être ajoutés :

- `GET /integrations/user/:userId` - Toutes les intégrations d'un utilisateur
- `GET /integrations/user/:userId/active` - Intégrations actives
- `GET /integrations/user/:userId/type/:type` - Intégration par type
- `POST /integrations` - Créer une intégration
- `PUT /integrations/:id` - Mettre à jour une intégration
- `DELETE /integrations/:id` - Supprimer une intégration
- `POST /integrations/:id/deactivate` - Désactiver une intégration
