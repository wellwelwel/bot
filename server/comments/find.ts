import type { Payload } from '../@types/payload.js';
import { appName, getHeaders } from '../services/get-token.js';

export const find = async (
  payload: Payload,
  token: string
): Promise<number | false> => {
  const [owner, repo] = payload.repository.split('/');
  const url = `https://api.github.com/repos/${owner}/${repo}/issues/${payload.prNumber}/comments`;

  const response = await fetch(url, {
    method: 'GET',
    headers: getHeaders(token),
  });

  const comments = (await response.json()) as {
    body: string;
    user?: {
      login: string;
    };
    id: number;
  }[];

  for (const comment of comments) {
    if (
      typeof comment.body === 'string' &&
      comment.user &&
      comment.user?.login === `${appName}[bot]` &&
      comment.body.includes(payload.updateIfIncludes!)
    )
      return comment.id;
  }

  return false;
};
