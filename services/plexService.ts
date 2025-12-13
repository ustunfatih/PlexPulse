import { PlayHistoryItem } from '../types';

interface PlexUserInfo {
  title?: string;
  username?: string;
  friendlyName?: string;
  name?: string;
}

interface PlexMetadata {
  title: string;
  grandparentTitle?: string;
  parentTitle?: string;
  type: string;
  viewedAt: number; // Unix timestamp
  duration?: number; // ms, optional
  accountTitle?: string;
  accountUsername?: string;
  accountFriendlyName?: string;
  userTitle?: string;
  userName?: string;
  user?: string; // Direct field
  username?: string; // Direct field
  friendlyName?: string; // Direct field
  User?: PlexUserInfo | PlexUserInfo[];
  Account?: PlexUserInfo | PlexUserInfo[];
  account?: PlexUserInfo | PlexUserInfo[];
}

interface PlexResponse {
  MediaContainer: {
    Metadata?: PlexMetadata[];
  };
}

export const fetchPlexHistory = async (serverUrl: string, token: string): Promise<PlayHistoryItem[]> => {
  // normalize URL (remove trailing slash)
  const cleanUrl = serverUrl.replace(/\/$/, '');

  const buildHistoryUrl = (includeAllAccounts: boolean) => {
    const params = new URLSearchParams({
      sort: 'viewedAt:desc',
      limit: '5000',
      'X-Plex-Token': token
    });

    if (includeAllAccounts) {
      params.append('accountID', 'all');
    }

    return `${cleanUrl}/status/sessions/history/all?${params.toString()}`;
  };

  const requestHistory = async (includeAllAccounts: boolean) =>
    fetch(buildHistoryUrl(includeAllAccounts), {
      method: 'GET',
      headers: {
        'Accept': 'application/json, text/xml;q=0.9, */*;q=0.8'
      },
      mode: 'cors'
    });

  try {
    // Some Plex deployments reject accountID=all with 400. Try that first and gracefully
    // fall back to the legacy request if needed so the user can still sign in.
    let response = await requestHistory(true);
    if (response.status === 400) {
      response = await requestHistory(false);
    }

    if (!response.ok) {
      if (response.status === 401) throw new Error("Invalid Plex Token.");
      if (response.status === 404) throw new Error("Server not found. Check URL.");
      throw new Error(`Connection failed: ${response.statusText}`);
    }

    const rawBody = (await response.text()).trim();
    if (!rawBody) {
      return [];
    }

    let data: PlexMetadata[] = [];

    // Attempt to parse as JSON first
    try {
      const jsonData: PlexResponse = JSON.parse(rawBody);
      if (jsonData.MediaContainer?.Metadata) {
        data = jsonData.MediaContainer.Metadata;
      }
    } catch (e) {
      // If JSON parsing fails, fallback to XML parsing logic just in case the server ignored the Accept header
      if (rawBody.startsWith('<')) {
        data = parsePlexXML(rawBody);
      } else {
        // It wasn't JSON and it wasn't XML
        throw new Error("Invalid response format from server.");
      }
    }
    
    if (data.length === 0) {
      return [];
    }

    const normalizeUserInfo = (user: PlexUserInfo | PlexUserInfo[] | undefined): PlexUserInfo | undefined => {
      if (!user) return undefined;
      return Array.isArray(user) ? user[0] : user;
    };

    const extractUserName = (item: PlexMetadata): string => {
      const normalizedUser = normalizeUserInfo(item.User);
      const normalizedAccount = normalizeUserInfo(item.Account || item.account);

      const candidates = [
        item.user,
        item.username,
        item.friendlyName,
        item.userTitle,
        item.userName,
        item.accountTitle,
        item.accountUsername,
        item.accountFriendlyName,
        normalizedUser?.title,
        normalizedUser?.username,
        normalizedUser?.friendlyName,
        normalizedUser?.name,
        normalizedAccount?.title,
        normalizedAccount?.username,
        normalizedAccount?.friendlyName,
        normalizedAccount?.name,
      ].filter((name): name is string => typeof name === 'string' && name.trim().length > 0);

      if (candidates.length > 0) {
        return candidates[0].trim();
      }

      return 'Server Owner';
    };

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

        const userName = extractUserName(item);

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

    const collectNodes = (tag: string) => Array.from(xmlDoc.getElementsByTagName(tag));

    const readUserFromElement = (element: Element | undefined | null): string | undefined => {
      if (!element) return undefined;
      const attributeCandidates = [
        element.getAttribute('title'),
        element.getAttribute('username'),
        element.getAttribute('friendlyName'),
        element.textContent?.trim()
      ];

      const found = attributeCandidates.find((value) => value && value.trim().length > 0);
      return found?.trim();
    };

    const resolveUserName = (node: Element): string => {
      const directCandidates = [
        node.getAttribute('username'),
        node.getAttribute('user'),
        node.getAttribute('accountTitle'),
        node.getAttribute('friendlyName')
      ];

      const direct = directCandidates.find((value) => value && value.trim().length > 0);
      if (direct) return direct.trim();

      const nestedUser = readUserFromElement(node.getElementsByTagName('User')[0]);
      if (nestedUser) return nestedUser;

      const nestedAccount = readUserFromElement(node.getElementsByTagName('Account')[0]);
      return nestedAccount ?? 'Server Owner';
    };

    const buildItem = (node: Element): PlexMetadata | null => {
      const viewedAt = parseInt(node.getAttribute('viewedAt') || '0');
      if (viewedAt === 0) return null;

      const resolvedUser = resolveUserName(node);

      return {
        title: node.getAttribute('title') || 'Unknown',
        grandparentTitle: node.getAttribute('grandparentTitle') || undefined,
        parentTitle: node.getAttribute('parentTitle') || undefined,
        type: node.getAttribute('type') || 'unknown',
        viewedAt,
        duration: parseInt(node.getAttribute('duration') || '0'),
        user: resolvedUser,
        User: { title: resolvedUser },
        Account: { title: resolvedUser }
      };
    };

    return [...collectNodes('Video'), ...collectNodes('Track')]
      .map(buildItem)
      .filter((item): item is PlexMetadata => item !== null);
};