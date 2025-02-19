import { Octokit } from '@octokit/rest';
import { createLRU } from 'lru.min';
import { create } from '../server/comments/create.js';
import { find } from '../server/comments/find.js';
import { update } from '../server/comments/update.js';
import {
  getAppToken,
  getInstallationId,
} from '../server/services/get-token.js';
import { isPayload, safePayload } from '../server/services/validate-payload.js';

export interface Env {
  APP_ID: string;
  PRIVATE_KEY: string;
  WEBHOOK_SECRET: string;
}

const MAX_REQUESTS_PER_MINUTE = 10;

const LRU = createLRU<string, number>({ max: 100 });

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      if (request.method !== 'POST')
        return new Response('Method Not Allowed', { status: 405 });

      const rawBody = await request.text();
      const body = JSON.parse(rawBody);

      if (!isPayload(body))
        return new Response('Invalid payload fields.', { status: 400 });

      const payload = safePayload(body);
      if (!payload)
        return new Response('Invalid payload data.', { status: 400 });

      const [owner, repo] = payload.repository.split('/');

      const count = LRU.get(payload.repository) || 0;

      if (count >= MAX_REQUESTS_PER_MINUTE) {
        return new Response(
          `Too many requests for repository "${payload.repository}". Try again later.`,
          { status: 429 }
        );
      }

      LRU.set(payload.repository, count + 1);

      const installationId = await getInstallationId({
        repo,
        owner,
        privateKey: env.PRIVATE_KEY,
        appId: env.APP_ID,
      });

      const token = await getAppToken({
        appId: env.APP_ID,
        installationId,
        privateKey: env.PRIVATE_KEY,
      });

      const octokit = new Octokit({ auth: token });
      await octokit.repos.get({ owner, repo });

      const commentId = payload.updateIfIncludes
        ? await find(payload, token)
        : false;

      if (typeof commentId === 'number') {
        await update(payload, commentId, token);
        return new Response('Comment updated.', { status: 200 });
      }

      await create(payload, token);
      return new Response('Comment created.', { status: 200 });
    } catch {
      return new Response('Forbidden', { status: 403 });
    }
  },
};
