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
  // We use standard JSON request headers. 
  const url = `${cleanUrl}/status/sessions/history/all?sort=viewedAt:desc&limit=5000&X-Plex-Token=${token}`;

  try {
    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Accept': 'application/json'
        },
        mode: 'cors'
    });

    if (!response.ok) {
      if (response.status === 401) throw new Error("Invalid Plex Token.");
      if (response.status === 404) throw new Error("Server not found. Check URL.");
      throw new Error(`Connection failed: ${response.statusText}`);
    }

    const text = await response.text();
    let data: PlexMetadata[] = [];

    // Attempt to parse as JSON first
    try {
        const jsonData: PlexResponse = JSON.parse(text);
        if (jsonData.MediaContainer?.Metadata) {
            data = jsonData.MediaContainer.Metadata;
        }
    } catch (e) {
        // If JSON parsing fails, fallback to XML parsing logic just in case the server ignored the Accept header
        if (text.trim().startsWith('<')) {
            data = parsePlexXML(text);
        } else {
            // It wasn't JSON and it wasn't XML
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
        
        // FALLBACK: If duration is missing or 0 (common in some Plex history logs),
        // estimate based on type to prevent "NaN" or "0 hours" reports.
        if (!durationMs || durationMs === 0) {
           if (type === 'movie') durationMs = 120 * 60 * 1000; // Assume 2 hours
           else if (type === 'episode') durationMs = 30 * 60 * 1000; // Assume 30 mins
           else if (type === 'track') durationMs = 3 * 60 * 1000; // Assume 3 mins
           else durationMs = 0;
        }

        const durationMinutes = Math.round(durationMs / 60000);

        // Map User safely (Check User object, then Account object, then default)
        const userName = item.User?.title || item.Account?.title || 'Server Owner';

        return {
            title: item.title,
            grandparentTitle: item.grandparentTitle,
            parentTitle: item.parentTitle,
            // viewedAt is unix timestamp in seconds
            date: new Date(item.viewedAt * 1000), 
            durationMinutes: isNaN(durationMinutes) ? 0 : durationMinutes,
            type: type,
            user: userName
        };
    });

  } catch (error: any) {
    // Specifically identify CORS/Network errors to update UI accordingly
    if (error.name === 'TypeError' && (error.message === 'Failed to fetch' || error.message.includes('NetworkError'))) {
      throw new Error("CORS_BLOCK");
    }
    throw error;
  }
};

// Helper function to parse XML response if JSON fails
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