
import { PlayHistoryItem } from '../types';

interface PlexMetadata {
  title: string;
  grandparentTitle?: string;
  parentTitle?: string;
  type: string;
  viewedAt: number; // Unix timestamp
  duration?: number; // ms, optional
  User?: {
    title: string;
  };
  Account?: {
    title: string;
  };
}

interface PlexResponse {
  MediaContainer: {
    Metadata?: PlexMetadata[];
  };
}

// Connectivity Strategies
// The service will attempt these in order until one succeeds.
const CONNECTION_STRATEGIES = [
    {
        name: 'Direct Connection',
        getUrl: (baseUrl: string, params: string) => `${baseUrl}${params}`
    },
    {
        name: 'Secure Routing (Primary)',
        getUrl: (baseUrl: string, params: string) => `https://corsproxy.io/?${encodeURIComponent(`${baseUrl}${params}`)}`
    },
    {
        name: 'Secure Routing (Backup)',
        // allorigins is a reliable backup that handles raw content well
        getUrl: (baseUrl: string, params: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(`${baseUrl}${params}`)}&disableCache=${Date.now()}`
    }
];

export const fetchPlexHistory = async (
    serverUrl: string, 
    token: string, 
    onStatusUpdate?: (status: string) => void
): Promise<PlayHistoryItem[]> => {
  
  // 1. URL Normalization
  let cleanUrl = serverUrl.trim().replace(/\/$/, '');
  if (!cleanUrl.startsWith('http')) {
      cleanUrl = `http://${cleanUrl}`; // Default to http if missing, though https is preferred
  }

  // 2. Construct Query Parameters
  // We explicitly ask for 5000 items. 
  const endpoint = '/status/sessions/history/all';
  const queryParams = `?sort=viewedAt:desc&limit=5000&X-Plex-Token=${token}`;
  
  let lastError: Error | null = null;

  // 3. Execution Loop
  for (const strategy of CONNECTION_STRATEGIES) {
      try {
          if (onStatusUpdate) onStatusUpdate(strategy.name === 'Direct Connection' ? 'Attempting direct connection...' : `Bypassing firewall via ${strategy.name}...`);
          
          const targetUrl = strategy.getUrl(cleanUrl + endpoint, queryParams);
          console.log(`[PlexPulse] Trying strategy: ${strategy.name}`);

          const response = await fetch(targetUrl, {
              method: 'GET',
              // We do NOT set custom headers here to avoid triggering strict CORS preflights on some proxies
          });

          // Check for specific HTTP errors
          if (!response.ok) {
              if (response.status === 401) throw new Error("Unauthorized: Invalid X-Plex-Token.");
              if (response.status === 404) throw new Error("Server endpoint not found. Check your URL.");
              // For other errors (500, 403), we throw to trigger the next strategy
              throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const text = await response.text();
          
          // validate content is not a proxy error page
          if (text.includes('403 Forbidden') || text.includes('Proxy Error')) {
              throw new Error("Proxy rejected request");
          }

          // 4. Parse Response
          let data: PlexMetadata[] = [];
          
          // Try JSON first
          try {
              const jsonData: PlexResponse = JSON.parse(text);
              if (jsonData.MediaContainer?.Metadata) {
                  data = jsonData.MediaContainer.Metadata;
              }
          } catch (e) {
              // Fallback to XML
              if (text.trim().startsWith('<')) {
                  data = parsePlexXML(text);
              } else {
                  throw new Error("Invalid response format received.");
              }
          }

          if (data.length === 0) {
              // It connected but returned empty array. This is a success case, just no history.
              return [];
          }

          // 5. Transformation
          return data.map((item) => {
              let type: 'movie' | 'episode' | 'track' | 'unknown' = 'unknown';
              if (item.type === 'movie') type = 'movie';
              else if (item.type === 'episode') type = 'episode';
              else if (item.type === 'track') type = 'track';

              let durationMs = item.duration;
              if (!durationMs || durationMs === 0) {
                 // Estimation fallback
                 if (type === 'movie') durationMs = 120 * 60 * 1000; 
                 else if (type === 'episode') durationMs = 30 * 60 * 1000;
                 else if (type === 'track') durationMs = 3 * 60 * 1000;
                 else durationMs = 0;
              }

              const durationMinutes = Math.round(durationMs / 60000);
              const userName = item.User?.title || item.Account?.title || 'Server Owner';

              return {
                  title: item.title,
                  grandparentTitle: item.grandparentTitle,
                  parentTitle: item.parentTitle,
                  date: new Date(item.viewedAt * 1000), 
                  durationMinutes: isNaN(durationMinutes) ? 0 : durationMinutes,
                  type: type,
                  user: userName
              };
          });

      } catch (error: any) {
          console.warn(`[PlexPulse] Strategy ${strategy.name} failed:`, error.message);
          lastError = error;
          // Continue to next strategy...
      }
  }

  // If we exit the loop, all strategies failed
  throw lastError || new Error("Unable to connect to Plex Media Server after multiple attempts.");
};

const parsePlexXML = (xmlText: string): PlexMetadata[] => {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "text/xml");
    
    // Check for standard Plex XML errors
    const errorNode = xmlDoc.getElementsByTagName("Response")[0];
    if (errorNode && errorNode.getAttribute('code') !== '200') {
        throw new Error(`Plex API Error: ${errorNode.getAttribute('status') || 'Unknown Error'}`);
    }

    const videos = xmlDoc.getElementsByTagName("Video");
    const tracks = xmlDoc.getElementsByTagName("Track");
    
    const items: PlexMetadata[] = [];
    
    const extract = (nodes: HTMLCollectionOf<Element>) => {
        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            const viewedAtStr = node.getAttribute('viewedAt');
            if (!viewedAtStr) continue;

            const viewedAt = parseInt(viewedAtStr);
            if (viewedAt === 0) continue;

            items.push({
                title: node.getAttribute('title') || 'Unknown',
                grandparentTitle: node.getAttribute('grandparentTitle') || undefined,
                parentTitle: node.getAttribute('parentTitle') || undefined,
                type: node.getAttribute('type') || 'unknown',
                viewedAt: viewedAt,
                duration: parseInt(node.getAttribute('duration') || '0'),
                User: { title: node.getAttribute('user') || '' },
                Account: { title: node.getAttribute('accountID') || 'User' } 
            });
        }
    };

    extract(videos);
    extract(tracks);
    
    return items;
};
