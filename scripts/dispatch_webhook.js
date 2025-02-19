import { readFile } from 'node:fs/promises';
import { request } from 'node:https';
import { join } from 'node:path';
import { env, exit } from 'node:process';

const webhookUrl = 'https://bot.w-eslley6456.workers.dev';

const eventPath = env.GITHUB_EVENT_PATH;
const eventData = JSON.parse(await readFile(eventPath, 'utf8'));

const updateIfIncludes = env['INPUT_UPDATE-IF-INCLUDES'] || null;
const comment = env['INPUT_COMMENT'] || null;
const commentPath = env['INPUT_COMMENT-FROM-FILE'] || null;

if (!comment && !commentPath) {
  console.error('Error: You must provide `comment` or `comment-from-file`.');
  exit(1);
}

const commentContent = await (async () => {
  if (comment) return comment;

  try {
    return (
      await readFile(join(env.GITHUB_WORKSPACE || '', commentPath), 'utf8')
    ).trim();
  } catch (error) {
    console.error(
      `Error when reading the file in "${commentPath}":`,
      error.message
    );
    exit(1);
  }
})();

const payload = {
  repository: env.GITHUB_REPOSITORY || null,
  prNumber: eventData.pull_request?.number || null,
  prTitle: eventData.pull_request?.title || null,
  prUser: env.GITHUB_ACTOR || null,
  updateIfIncludes,
  comment: commentContent,
};

const data = JSON.stringify(payload);
const options = new URL(webhookUrl);

const req = request(
  {
    hostname: options.hostname,
    port: options.port,
    path: options.pathname,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  },
  (res) => {
    let body = '';

    res.on('data', (chunk) => (body += chunk));
    res.on('end', () => console.log(body));
  }
);

req.on('error', (error) => {
  console.error(error);
  exit(1);
});

req.write(data);
req.end();
