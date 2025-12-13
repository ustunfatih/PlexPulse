
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
    id?: number | string;
    title?: string;
  };
}

interface PlexResponse {
  MediaContainer: {
    Metadata?: PlexMetadata[];
  };
}

// Helper to check for private IPs (cannot be accessed via public proxies)
const isPrivateIP = (url: string) => {
    // Regex for 192.168.x.x, 10.x.x.x, 172.16-31.x.x, 127.0.0.1, localhost
    const privateRegex = /(^127\.)|(^10\.)|(^172\.1[6-9]\.)|(^172\.2[0-9]\.)|(^172\.3[0-1]\.)|(^192\.168\.)|(localhost)/;
    try {
        const hostname = new URL(url).hostname;
        return privateRegex.test(hostname);
    } catch {
        return false;
    }
};

// Connectivity Strategies
const CONNECTION_STRATEGIES = [
    {
        name: 'Secure Routing (Fast)',
        // corsproxy.io is generally fastest but sometimes blocked
        getUrl: (baseUrl: string, params: string) => `https://corsproxy.io/?${encodeURIComponent(`${baseUrl}${params}`)}`
    },
    {
        name: 'Secure Routing (Reliable)',
        // allorigins handles raw content well
        getUrl: (baseUrl: string, params: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(`${baseUrl}${params}`)}&disableCache=${Date.now()}`
    },
    {
        name: 'Secure Routing (Backup)',
        // CodeTabs is a good fallback
        getUrl: (baseUrl: string, params: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(`${baseUrl}${params}`)}`
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
      cleanUrl = `http://${cleanUrl}`;
  }

  // 2. Environment Check
  const isProd = window.location.protocol === 'https:' && window.location.hostname !== 'localhost';
  if (isProd && isPrivateIP(cleanUrl)) {
      throw new Error(
          "Private Network Restriction: You are using a public website to access a local IP address (192.168...). " +
          "Browsers block this for security. Please use your server's Public URL (e.g., https://plex.mydomain.com) or run the app locally."
      );
  }

  const endpoint = '/status/sessions/history/all';
  
  // 3. PING STEP: Fetch 1 item to verify connection without timing out
  if (onStatusUpdate) onStatusUpdate("Verifying connection...");
  let activeStrategyIndex = -1;
  
  // We try strategies to find a working one using a lightweight request
  for (let i = 0; i < CONNECTION_STRATEGIES.length; i++) {
      const strategy = CONNECTION_STRATEGIES[i];
      try {
          // Small limit for ping
          const pingUrl = strategy.getUrl(cleanUrl + endpoint, `?sort=viewedAt:desc&limit=1&X-Plex-Token=${token}`);
          const res = await fetch(pingUrl, { signal: AbortSignal.timeout(8000) }); // 8s timeout for ping
          if (res.ok) {
              const text = await res.text();
              // Simple validation it's not a proxy error page
              if (!text.includes('Proxy Error') && !text.includes('403 Forbidden')) {
                  activeStrategyIndex = i;
                  break; 
              }
          }
      } catch (e) {
          console.warn(`Strategy ${strategy.name} failed ping.`);
      }
  }

  if (activeStrategyIndex === -1) {
      // If all proxies failed, try Direct as a last resort (likely fails CORS but worth a shot)
      try {
        const directUrl = `${cleanUrl}${endpoint}?sort=viewedAt:desc&limit=1&X-Plex-Token=${token}`;
        await fetch(directUrl, { method: 'HEAD' });
        // If we get here, direct works (rare)
        return fetchFullData(cleanUrl, endpoint, token, 'Direct', (url) => url, onStatusUpdate);
      } catch(e) {
        throw new Error("Unable to connect. Ensure your Plex URL is publicly accessible and the token is valid.");
      }
  }

  // 4. DOWNLOAD STEP: Fetch data using the winning strategy
  const winner = CONNECTION_STRATEGIES[activeStrategyIndex];
  return fetchFullData(cleanUrl, endpoint, token, winner.name, winner.getUrl, onStatusUpdate);
};

const fetchFullData = async (
    baseUrl: string, 
    endpoint: string, 
    token: string, 
    strategyName: string,
    urlBuilder: (base: string, params: string) => string,
    onStatusUpdate?: (status: string) => void
): Promise<PlayHistoryItem[]> => {
    
    if (onStatusUpdate) onStatusUpdate(`Downloading history via ${strategyName}...`);

    // Limit set to 2500 to prevent proxy timeouts. 
    // Pagination could be added later, but 2500 covers most recent analytics needs.
    const params = `?sort=viewedAt:desc&limit=2500&X-Plex-Token=${token}`;
    const targetUrl = urlBuilder(baseUrl + endpoint, params);

    try {
        const response = await fetch(targetUrl);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const text = await response.text();
        let data: PlexMetadata[] = [];

        try {
            const jsonData: PlexResponse = JSON.parse(text);
            if (jsonData.MediaContainer?.Metadata) {
                data = jsonData.MediaContainer.Metadata;
            }
        } catch (e) {
            if (text.trim().startsWith('<')) {
                data = parsePlexXML(text);
            } else {
                throw new Error("Invalid response format.");
            }
        }

        return data.map((item) => {
            let type: 'movie' | 'episode' | 'track' | 'unknown' = 'unknown';
            if (item.type === 'movie') type = 'movie';
            else if (item.type === 'episode') type = 'episode';
            else if (item.type === 'track') type = 'track';

            let durationMs = item.duration;
            if (!durationMs || durationMs === 0) {
                if (type === 'movie') durationMs = 120 * 60 * 1000; 
                else if (type === 'episode') durationMs = 30 * 60 * 1000;
                else if (type === 'track') durationMs = 3 * 60 * 1000;
                else durationMs = 0;
            }

            const durationMinutes = Math.round(durationMs / 60000);
            
            // Resolve Username
            // Priority: User.title (friendly name) -> Account.title (if string) -> Account ID mapping -> "Server Owner"
            let userName = item.User?.title;
            const accountId = item.Account?.id || item.Account?.title; // Sometimes title holds the ID in sloppy parsing

            if (!userName) {
                // Common ID for admin is 1
                if (accountId === 1 || accountId === '1') {
                    userName = 'Server Owner';
                } else if (typeof item.Account?.title === 'string' && isNaN(Number(item.Account.title))) {
                    // If Account.title is a string and NOT a number, use it
                    userName = item.Account.title;
                } else {
                    // Fallback if we really can't find a name, but try to avoid raw IDs
                    userName = accountId ? `User ${accountId}` : 'Server Owner';
                }
            }

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
        throw new Error(`Data fetch failed: ${error.message}`);
    }
};

const parsePlexXML = (xmlText: string): PlexMetadata[] => {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "text/xml");
    
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

            // Plex XML Username Logic:
            // 1. 'userName' attribute (most common for history)
            // 2. 'user' attribute (older versions)
            // 3. 'sourceTitle' (sometimes used for shared users)
            const userName = node.getAttribute('userName') || node.getAttribute('user') || node.getAttribute('sourceTitle') || '';
            const accountId = node.getAttribute('accountID') || '';

            items.push({
                title: node.getAttribute('title') || 'Unknown',
                grandparentTitle: node.getAttribute('grandparentTitle') || undefined,
                parentTitle: node.getAttribute('parentTitle') || undefined,
                type: node.getAttribute('type') || 'unknown',
                viewedAt: viewedAt,
                duration: parseInt(node.getAttribute('duration') || '0'),
                User: { title: userName },
                Account: { id: accountId, title: accountId } 
            });
        }
    };

    extract(videos);
    extract(tracks);
    
    return items;
};
