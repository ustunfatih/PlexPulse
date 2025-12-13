import { PlayHistoryItem } from '../types';

export type PlexServiceErrorCode =
  | 'INVALID_URL'
  | 'MIXED_CONTENT'
  | 'UNAUTHORIZED'
  | 'NOT_FOUND'
  | 'NETWORK'
  | 'CORS'
  | 'BAD_RESPONSE'
  | 'UNKNOWN';

export class PlexServiceError extends Error {
  code: PlexServiceErrorCode;
  details?: string;

  constructor(code: PlexServiceErrorCode, message: string, details?: string) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

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
  viewedAt: number | string; // Unix timestamp
  duration?: number; // milliseconds
  accountTitle?: string;
  accountUsername?: string;
  accountFriendlyName?: string;
  userTitle?: string;
  userName?: string;
  user?: string;
  username?: string;
  friendlyName?: string;
  User?: PlexUserInfo | PlexUserInfo[];
  Account?: PlexUserInfo | PlexUserInfo[];
  account?: PlexUserInfo | PlexUserInfo[];
  Player?: { title?: string };
}

interface PlexResponse {
  MediaContainer?: {
    Metadata?: PlexMetadata[];
  };
}

interface FetchOptions {
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT = 15000;

const ensureUrl = (serverUrl: string): URL => {
  const cleanUrl = serverUrl.replace(/\/$/, '');
  try {
    return new URL(cleanUrl);
  } catch (error) {
    throw new PlexServiceError('INVALID_URL', 'Invalid server URL. Include http:// or https://');
  }
};

const assertNoMixedContent = (parsedUrl: URL) => {
  if (typeof window !== 'undefined' && window.location.protocol === 'https:' && parsedUrl.protocol === 'http:') {
    throw new PlexServiceError('MIXED_CONTENT', 'Browsers block HTTP Plex servers when the app is on HTTPS.');
  }
};

const buildHistoryUrl = (base: URL, token: string, includeAllAccounts: boolean): string => {
  const url = new URL('/status/sessions/history/all', base);
  url.searchParams.set('sort', 'viewedAt:desc');
  url.searchParams.set('limit', '5000');
  url.searchParams.set('X-Plex-Token', token);
  if (includeAllAccounts) {
    url.searchParams.set('accountID', 'all');
  }
  return url.toString();
};

const fetchWithTimeout = async (url: string, timeoutMs: number, signal?: AbortSignal) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const signals = [controller.signal];
  if (signal) signals.push(signal);

  const merged = signals.length === 1 ? signals[0] : AbortSignal.any(signals);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json, text/xml;q=0.9, */*;q=0.8' },
      mode: 'cors',
      signal: merged
    });
    return response;
  } finally {
    clearTimeout(timer);
  }
};

const parseAsJson = (rawBody: string): PlexMetadata[] => {
  const parsed: PlexResponse = JSON.parse(rawBody);
  return parsed?.MediaContainer?.Metadata || [];
};

const parseAsXml = (rawBody: string): PlexMetadata[] => {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(rawBody, 'text/xml');
  const nodes = Array.from(xmlDoc.getElementsByTagName('Video')).concat(
    Array.from(xmlDoc.getElementsByTagName('Track'))
  );

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

  return nodes
    .map((node) => {
      const viewedAt = parseInt(node.getAttribute('viewedAt') || '0', 10);
      if (!viewedAt) return null;

      const userFromUserNode = readUserFromElement(node.getElementsByTagName('User')[0]);
      const userFromAccountNode = readUserFromElement(node.getElementsByTagName('Account')[0]);

      return {
        title: node.getAttribute('title') || 'Unknown',
        grandparentTitle: node.getAttribute('grandparentTitle') || undefined,
        parentTitle: node.getAttribute('parentTitle') || undefined,
        type: node.getAttribute('type') || 'unknown',
        viewedAt,
        duration: parseInt(node.getAttribute('duration') || '0', 10),
        user: userFromUserNode || userFromAccountNode,
        User: { title: userFromUserNode },
        Account: { title: userFromAccountNode }
      } as PlexMetadata;
    })
    .filter((item): item is PlexMetadata => item !== null);
};

const normalizeUserInfo = (user: PlexUserInfo | PlexUserInfo[] | undefined): PlexUserInfo | undefined => {
  if (!user) return undefined;
  return Array.isArray(user) ? user[0] : user;
};

const extractUserName = (item: PlexMetadata): string => {
  const normalizedUser = normalizeUserInfo(item.User);
  const normalizedAccount = normalizeUserInfo(item.Account ?? item.account);

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
    normalizedAccount?.name
  ].filter((value): value is string => typeof value === 'string' && value.trim().length > 0);

  return candidates[0]?.trim() || 'Server Owner';
};

const coerceDurationMinutes = (item: PlexMetadata): number => {
  const durationMs = typeof item.duration === 'number' ? item.duration : 0;
  if (durationMs > 0) return Math.round(durationMs / 60000);

  const fallbackMinutes = item.type === 'movie' ? 120 : item.type === 'episode' ? 30 : item.type === 'track' ? 3 : 0;
  return fallbackMinutes;
};

const mapToHistory = (metadata: PlexMetadata[]): PlayHistoryItem[] =>
  metadata.map((item) => {
    const viewedAtSeconds = typeof item.viewedAt === 'string' ? parseInt(item.viewedAt, 10) : item.viewedAt;
    const date = new Date((viewedAtSeconds || 0) * 1000);

    let type: PlayHistoryItem['type'] = 'unknown';
    if (item.type === 'movie') type = 'movie';
    else if (item.type === 'episode') type = 'episode';
    else if (item.type === 'track') type = 'track';

    return {
      title: item.title,
      grandparentTitle: item.grandparentTitle,
      parentTitle: item.parentTitle,
      date,
      durationMinutes: coerceDurationMinutes(item),
      type,
      user: extractUserName(item),
      player: item.Player?.title
    };
  });

export const fetchPlexHistory = async (
  serverUrl: string,
  token: string,
  options: FetchOptions = {}
): Promise<PlayHistoryItem[]> => {
  const parsedUrl = ensureUrl(serverUrl);
  assertNoMixedContent(parsedUrl);

  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT;

  const attempt = async (includeAllAccounts: boolean, externalSignal?: AbortSignal) => {
    const historyUrl = buildHistoryUrl(parsedUrl, token, includeAllAccounts);
    const response = await fetchWithTimeout(historyUrl, timeoutMs, externalSignal);
    return { response, includeAllAccounts };
  };

  try {
    let { response, includeAllAccounts } = await attempt(true, options as unknown as AbortSignal);

    if (response.status === 400 || response.status === 422) {
      ({ response, includeAllAccounts } = await attempt(false, options as unknown as AbortSignal));
    }

    if (!response.ok) {
      if (response.status === 401) throw new PlexServiceError('UNAUTHORIZED', 'Invalid Plex token.');
      if (response.status === 404) throw new PlexServiceError('NOT_FOUND', 'Server not found. Check URL.');
      throw new PlexServiceError('BAD_RESPONSE', `Connection failed: ${response.status} ${response.statusText}`);
    }

    const rawBody = (await response.text()).trim();
    if (!rawBody) return [];

    let metadata: PlexMetadata[] = [];

    try {
      metadata = parseAsJson(rawBody);
    } catch (jsonError) {
      if (rawBody.startsWith('<')) {
        metadata = parseAsXml(rawBody);
      } else {
        throw new PlexServiceError('BAD_RESPONSE', 'Invalid response format from server.');
      }
    }

    if (!Array.isArray(metadata)) {
      throw new PlexServiceError('BAD_RESPONSE', 'Unexpected response shape from Plex server.');
    }

    return mapToHistory(metadata);
  } catch (error: unknown) {
    if (error instanceof PlexServiceError) {
      throw error;
    }

    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new PlexServiceError('NETWORK', 'Request timed out. Try again or reduce result size.');
    }

    if (error instanceof TypeError) {
      // Browsers surface CORS/mixed content as TypeError without status codes
      throw new PlexServiceError('CORS', 'Network blocked by CORS or mixed-content policy.');
    }

    throw new PlexServiceError('UNKNOWN', 'Unexpected error connecting to Plex.', (error as Error)?.message);
  }
};
