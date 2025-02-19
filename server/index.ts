import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { env } from 'node:process';
import helmet from '@fastify/helmet';
import fastifyRateLimit from '@fastify/rate-limit';
import { Octokit } from '@octokit/rest';
import Fastify from 'fastify';
import { createLRU } from 'lru.min';
import { create } from './comments/create.js';
import { find } from './comments/find.js';
import { update } from './comments/update.js';
import { getAppToken, getInstallationId } from './services/get-token.js';
import { isPayload, safePayload } from './services/validate-payload.js';

const appId = String(env.APP_ID).trim();
const privateKeyPath = join('private-key.pem').trim();
const port = Number(String(env.PORT).trim());
const privateKey =
  env.PRIVATE_KEY?.replace(/\\n/gm, '\n') ||
  (await readFile(privateKeyPath, 'utf8')).trim();
const MAX_REQUESTS_PER_MINUTE = 10;

const LRU = createLRU<string, number>({ max: 100 });

const fastify = Fastify();

fastify.register(fastifyRateLimit, {
  max: 100,
  timeWindow: 1000 * 60,
});

fastify.register(helmet);

fastify.post('/webhook', async (request, reply) => {
  try {
    const { body } = request;

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

    const count = LRU.get(payload.repository) || 0;

    if (count >= MAX_REQUESTS_PER_MINUTE) {
      reply
        .code(429)
        .send(
          `Too many requests for repository "${payload.repository}". Try again later.`
        );
      return;
    }

    LRU.set(payload.repository, count + 1);

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

    const octokit = new Octokit({ auth: token });
    await octokit.repos.get({ owner, repo });

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
  } catch {
    reply.code(403).send('Forbidden.');
  }
});

fastify.listen({ port }, () => {
  console.log('Listening');
});
