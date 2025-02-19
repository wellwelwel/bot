import { create } from '../server/comments/create.js';
import { find } from '../server/comments/find.js';
import { update } from '../server/comments/update.js';
import {
  getAppToken,
  getInstallationId,
} from '../server/services/get-token.js';
import { isPayload, safePayload } from '../server/services/validate-payload.js';
import { validateSignature } from './services/hmac.js';

export interface Env {
  APP_ID: string;
  PRIVATE_KEY: string;
  WEBHOOK_SECRET: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    const signature = request.headers.get('x-hub-signature-256')!;
    const rawBody = await request.text();

    if (!validateSignature(rawBody, signature, env.WEBHOOK_SECRET)) {
      return new Response('Invalid signature.', { status: 403 });
    }

    const body = JSON.parse(rawBody);

    if (!isPayload(body)) {
      return new Response('Invalid payload fields.', { status: 400 });
    }

    const payload = safePayload(body);
    if (!payload) {
      return new Response('Invalid payload data.', { status: 400 });
    }

    const [owner, repo] = payload.repository.split('/');
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

    const commentId = payload.updateIfIncludes
      ? await find(payload, token)
      : false;

    if (typeof commentId === 'number') {
      await update(payload, commentId, token);
      return new Response('Comment updated.', { status: 200 });
    }

    await create(payload, token);
    return new Response('Comment created.', { status: 200 });
  },
};
