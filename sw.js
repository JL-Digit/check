// Service Worker pour l'application Check!
const CACHE_NAME = 'habit-tracker-v1';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './icon-192x192.png',
  './icon-512x512.png'
];

// Installation du Service Worker
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installation en cours...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Mise en cache des fichiers');
        return cache.addAll(urlsToCache.map(url => {
          // Gérer les URLs relatives
          return new Request(url, { cache: 'reload' });
        }));
      })
      .catch((error) => {
        console.error('Service Worker: Erreur lors de la mise en cache:', error);
      })
  );
  
  // Forcer l'activation immédiate
  self.skipWaiting();
});

// Activation du Service Worker
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activation en cours...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Supprimer les anciens caches
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Suppression de l\'ancien cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Prendre le contrôle de tous les clients
      return self.clients.claim();
    })
  );
});

// Interception des requêtes réseau
self.addEventListener('fetch', (event) => {
  // Ignorer les requêtes non-HTTP/HTTPS
  if (!event.request.url.startsWith('http')) {
    return;
  }
  
  // Ignorer les requêtes POST (pour les formulaires)
  if (event.request.method !== 'GET') {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Retourner la réponse du cache si elle existe
        if (response) {
          console.log('Service Worker: Réponse depuis le cache pour:', event.request.url);
          return response;
        }
        
        // Sinon, faire la requête réseau
        console.log('Service Worker: Requête réseau pour:', event.request.url);
        return fetch(event.request)
          .then((response) => {
            // Vérifier si la réponse est valide
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Cloner la réponse car elle ne peut être consommée qu'une fois
            const responseToCache = response.clone();
            
            // Ajouter la réponse au cache pour les futures requêtes
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });
            
            return response;
          })
          .catch((error) => {
            console.error('Service Worker: Erreur de requête réseau:', error);
            
            // En cas d'erreur réseau, essayer de retourner une page de fallback
            if (event.request.destination === 'document') {
              return caches.match('./index.html');
            }
            
            // Pour les autres ressources, retourner une erreur
            throw error;
          });
      })
  );
});

// Gestion des messages du client
self.addEventListener('message', (event) => {
  console.log('Service Worker: Message reçu:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});

// Gestion de la synchronisation en arrière-plan (optionnel)
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Synchronisation en arrière-plan:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Ici, vous pourriez synchroniser les données avec un serveur
      console.log('Service Worker: Synchronisation des données...')
    );
  }
});

// Gestion des notifications push (optionnel pour une future extension)
self.addEventListener('push', (event) => {
  console.log('Service Worker: Notification push reçue');
  
  const options = {
    body: event.data ? event.data.text() : 'Nouvelle notification',
    icon: './icon-192x192.png',
    badge: './icon-192x192.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Ouvrir l\'application',
        icon: './icon-192x192.png'
      },
      {
        action: 'close',
        title: 'Fermer',
        icon: './icon-192x192.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('Check!', options)
  );
});

// Gestion des clics sur les notifications
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Clic sur notification:', event.action);
  
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('./')
    );
  }
});

console.log('Service Worker: Chargé et prêt!');

