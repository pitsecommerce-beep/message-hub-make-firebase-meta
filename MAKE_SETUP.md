# Configuración de Make (Integromat) para MessageHub

## Resumen de la Arquitectura

```
[yCloud] → [Make Webhook] → [Firebase Firestore] → [MessageHub UI]
                                  ↓
                            [AI Agent (OpenAI/Anthropic)]
                                  ↓
                            [yCloud → WhatsApp]
```

## Paso 1: Importar el Blueprint

1. Abre [Make](https://www.make.com/) y crea un nuevo escenario.
2. Haz clic en el menú "..." → "Import Blueprint".
3. Sube el archivo `make-blueprint.json` de este repositorio.

## Paso 2: Configurar Conexiones

### Firebase (Firestore)
1. En cada módulo de Firebase, crea una nueva conexión.
2. Usa las credenciales de tu proyecto de Firebase (Service Account JSON).
3. Reemplaza `__TEAM_ID__` en todos los módulos con el ID de tu equipo (es el UID del usuario admin que se crea al registrarte).

### yCloud
1. Reemplaza `__YCLOUD_API_KEY__` con tu API Key de yCloud.
2. Reemplaza `__PHONE_NUMBER__` con tu número de WhatsApp Business registrado en yCloud.

### OpenAI (para agente IA)
1. En el módulo de OpenAI, crea una conexión con tu API Key.
2. El modelo y system prompt se leen dinámicamente de Firebase (configurados desde la UI).

## Paso 3: Configurar Webhooks

### Webhook de mensajes entrantes (yCloud → Make)
1. Al importar el blueprint, Make generará una URL de webhook automáticamente.
2. Copia esa URL.
3. Ve a [yCloud Dashboard](https://dashboard.ycloud.com/) → Webhooks.
4. Agrega un nuevo webhook con la URL de Make.
5. Selecciona el evento: `whatsapp.inbound_message.received`.

### Webhook de mensajes salientes (CRM → Make → yCloud)
1. El segundo webhook del blueprint maneja mensajes enviados desde el CRM.
2. Copia la URL del segundo webhook de Make.
3. En la UI de MessageHub → Configuración → Webhooks, pega esta URL.

## Paso 4: Configurar Firebase

### Reglas de Firestore

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId ||
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    // Teams
    match /teams/{teamId} {
      allow read: if request.auth != null &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.teamId == teamId;
      allow write: if request.auth != null && (
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'manager']
      );

      // Subcollections
      match /{subcollection}/{docId} {
        allow read: if request.auth != null &&
          get(/databases/$(database)/documents/users/$(request.auth.uid)).data.teamId == teamId;
        allow write: if request.auth != null &&
          get(/databases/$(database)/documents/users/$(request.auth.uid)).data.teamId == teamId;
      }
    }

    // Invites
    match /invites/{inviteId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'manager'];
    }
  }
}
```

## Paso 5: Variables de entorno (GitHub Secrets)

Para el deploy en GitHub Pages, configura estos secrets en tu repositorio:

| Secret | Descripción |
|--------|-------------|
| `VITE_FIREBASE_API_KEY` | API Key de Firebase |
| `VITE_FIREBASE_AUTH_DOMAIN` | Auth domain (ej: tu-proyecto.firebaseapp.com) |
| `VITE_FIREBASE_PROJECT_ID` | Project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Messaging sender ID |
| `VITE_FIREBASE_APP_ID` | App ID |

## Paso 6: Flujo de datos

### Mensaje entrante (cliente → agente):
1. Cliente envía mensaje por WhatsApp/Messenger/Instagram.
2. yCloud recibe el mensaje y dispara el webhook de Make.
3. Make busca/crea el contacto en Firebase.
4. Make crea/actualiza la conversación en Firebase.
5. Make guarda el mensaje en Firebase.
6. Si hay un agente IA activo, Make genera una respuesta con OpenAI/Anthropic.
7. Make envía la respuesta vía yCloud y la guarda en Firebase.
8. El CRM muestra todo en tiempo real (Firestore listeners).

### Mensaje saliente (agente → cliente):
1. Agente escribe mensaje en el CRM.
2. El CRM guarda el mensaje en Firebase.
3. El CRM hace POST al webhook de Make con los datos.
4. Make envía el mensaje al contacto vía yCloud.

## Solución de problemas

- **No llegan mensajes**: Verifica que el webhook de yCloud apunte a la URL correcta de Make.
- **El agente IA no responde**: Verifica que haya al menos un agente IA activo en el CRM y que la conexión de OpenAI esté configurada.
- **Errores de Firebase**: Verifica las reglas de Firestore y que el Service Account tenga los permisos correctos.
