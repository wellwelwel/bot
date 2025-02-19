import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { env } from 'node:process';
import helmet from '@fastify/helmet';
import fastifyRateLimit from '@fastify/rate-limit';
import Fastify from 'fastify';
import fastifyRawBody from 'fastify-raw-body';
import { create } from './comments/create.js';
import { find } from './comments/find.js';
import { update } from './comments/update.js';
import { getAppToken, getInstallationId } from './services/get-token.js';
import { validateSignature } from './services/hmac.js';
import { isPayload, safePayload } from './services/validate-payload.js';

const appId = String(env.APP_ID).trim();
const privateKeyPath = join('private-key.pem').trim();
const port = Number(String(env.PORT).trim());
const secret = String(env.WEBHOOK_SECRET).trim();
const privateKey =
  env.PRIVATE_KEY?.replace(/\\n/gm, '\n') ||
  (await readFile(privateKeyPath, 'utf8')).trim();

const fastify = Fastify();

fastify.register(fastifyRateLimit, {
  max: 100,
  timeWindow: 1000 * 60,
});

fastify.register(helmet);

await fastify.register(fastifyRawBody, {
  runFirst: true,
  global: false,
  field: 'rawBody',
  encoding: 'utf8',
});

fastify.post(
  '/webhook',
  {
    config: {
      rawBody: true,
    },
  },
  async (request, reply) => {
    const { body } = request;

    const signature = request.headers['x-hub-signature-256'] as
      | string
      | undefined;
    const rawBody = request.rawBody as string | undefined;

    if (!rawBody || !validateSignature(rawBody, signature, secret)) {
      reply.code(403).send('Invalid signature.');
      return;
    }

    if (!isPayload(body)) {
      reply.code(400).send('Invalid payload fields.');
      return;
    }

    const payload = safePayload(body);

    if (!payload) {
      reply.code(400).send('Invalid payload data.');
      return;
    }

    const [owner, repo] = payload.repository.split('/');
    const installationId = await getInstallationId({
      repo,
      owner,
      privateKey,
      appId,
    });

    const token = await getAppToken({
      appId,
      installationId,
      privateKey,
    });

    const commentId = payload.updateIfIncludes
      ? await find(payload, token)
      : false;

    if (typeof commentId === 'number') {
      await update(payload, commentId, token);
      reply.code(200).send('Comment updated.');

      return;
    }

    await create(payload, token);
    reply.code(200).send('Comment created.');
  }
);

fastify.listen({ port }, () => {
  console.log('Listening');
});
