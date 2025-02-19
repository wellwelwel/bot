import type { Payload } from '../@types/payload.js';
import { getHeaders } from '../services/get-token.js';

export const create = async (payload: Payload, token: string) => {
  const [owner, repo] = payload.repository.split('/');
  const user = payload.prUser;
  const comment = payload.comment.replace(/@user/g, `@${user}`);
  const url = `https://api.github.com/repos/${owner}/${repo}/issues/${payload.prNumber}/comments`;

  const response = await fetch(url, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify({ body: comment }),
  });

  return response.json();
};
