import type { Payload } from '../@types/payload.js';

const regex = {
  repository: /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/,
};

export const isPayload = (payload: unknown): payload is Payload => {
  if (!payload) return false;
  if (typeof payload !== 'object') return false;
  if (!('repository' in payload && typeof payload.repository === 'string'))
    return false;
  if (!('prNumber' in payload && typeof payload.prNumber === 'number'))
    return false;
  if (!('prTitle' in payload && typeof payload.prTitle === 'string'))
    return false;
  if (!('prUser' in payload && typeof payload.prUser === 'string'))
    return false;
  if (!('comment' in payload && typeof payload.comment === 'string'))
    return false;

  if (
    'updateIfIncludes' in payload &&
    payload.updateIfIncludes !== undefined &&
    typeof payload.updateIfIncludes !== 'string'
  )
    return false;

  return true;
};

export const safePayload = (payload: Payload): Readonly<Payload> | false => {
  if (payload.repository.length > 128) return false;
  if (payload.prTitle.length > 256) return false;
  if (payload.prUser.length > 64) return false;
  if (payload.comment.length > 65536) return false;
  if (payload.updateIfIncludes && payload.updateIfIncludes.length > 64)
    return false;

  const safe: Payload = Object.create(null);

  safe.repository = payload.repository.trim();
  safe.prTitle = payload.prTitle.trim();
  safe.prUser = payload.prUser.trim();
  safe.comment = payload.comment.trim();
  safe.prNumber = payload.prNumber;

  if (payload.updateIfIncludes)
    safe.updateIfIncludes = payload.updateIfIncludes;

  if (safe.repository.length === 0) return false;
  if (safe.prTitle.length === 0) return false;
  if (safe.prUser.length === 0) return false;

  if (!regex.repository.test(safe.repository)) return false;
  if (!(Number.isSafeInteger(safe.prNumber) && safe.prNumber > 0)) return false;

  return Object.freeze(safe);
};
