
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

export const fetchPlexHistory = async (serverUrl: string, token: string): Promise<PlayHistoryItem[]> => {
  // normalize URL (remove trailing slash)
  const cleanUrl = serverUrl.replace(/\/$/, '');
  
  // Construct the API URL
  const targetUrl = `${cleanUrl}/status/sessions/history/all?sort=viewedAt:desc&limit=5000&X-Plex-Token=${token}`;

  let response: Response;
  let usedProxy = false;

  try {
    // Attempt 1: Direct Connection
    try {
        response = await fetch(targetUrl);
    } catch (directError) {
        // If direct fetch fails (likely CORS), throw to catch block below to trigger proxy
        throw new Error("Direct connection failed");
    }

    // Check if response is ok, if not (and it's a CORS issue disguised as a network error), throw
    if (!response.ok && response.status === 0) {
        throw new Error("CORS Opaque");
    }

  } catch (e) {
    // Attempt 2: Proxy Fallback
    // If the browser blocked the direct connection, we route it through a standard CORS proxy.
    // This adds the necessary headers to satisfy the browser's security requirements.
    console.log("Direct connection failed, attempting proxy fallback...");
    usedProxy = true;
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;
    
    try {
        response = await fetch(proxyUrl);
    } catch (proxyError) {
        // If even the proxy fails, we are out of options
        throw new Error("Connection failed. Your server is not reachable directly or via proxy. Ensure it is accessible from the internet.");
    }
  }

  if (!response.ok) {
    if (response.status === 401) throw new Error("Invalid Plex Token.");
    if (response.status === 404) throw new Error("Server not found. Check URL.");
    throw new Error(`Connection failed: ${response.statusText}`);
  }

  const text = await response.text();
  let data: PlexMetadata[] = [];

  try {
      const jsonData: PlexResponse = JSON.parse(text);
      if (jsonData.MediaContainer?.Metadata) {
          data = jsonData.MediaContainer.Metadata;
      }
  } catch (e) {
      // If the proxy returns raw text/xml, handle it here
      if (text.trim().startsWith('<')) {
          data = parsePlexXML(text);
      } else {
          throw new Error("Invalid response format from server.");
      }
  }
  
  if (data.length === 0) {
    return [];
  }

  return data.map((item) => {
      // Map Plex types to our types
      let type: 'movie' | 'episode' | 'track' | 'unknown' = 'unknown';
      if (item.type === 'movie') type = 'movie';
      else if (item.type === 'episode') type = 'episode';
      else if (item.type === 'track') type = 'track';

      // Calculate duration safely
      let durationMs = item.duration;
      
      if (!durationMs || durationMs === 0) {
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
};

const parsePlexXML = (xmlText: string): PlexMetadata[] => {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "text/xml");
    const videos = xmlDoc.getElementsByTagName("Video");
    const tracks = xmlDoc.getElementsByTagName("Track");
    
    const items: PlexMetadata[] = [];
    
    const extract = (nodes: HTMLCollectionOf<Element>) => {
        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            const viewedAt = parseInt(node.getAttribute('viewedAt') || '0');
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
