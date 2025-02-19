import { createAppAuth } from '@octokit/auth-app';

export const appName = 'wellwelwel-bot';

export const getHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
  Accept: 'application/vnd.github+json',
  'User-Agent': appName,
});

export const getInstallationId = async (options: {
  owner: string;
  repo: string;
  appId: string;
  privateKey: string;
}): Promise<number> => {
  const { appId, owner, privateKey, repo } = options;

  const auth = createAppAuth({
    appId,
    privateKey,
  });

  const jwt = (await auth({ type: 'app' })).token;
  const url = `https://api.github.com/repos/${owner}/${repo}/installation`;

  console.log(url);

  const response = await fetch(url, {
    method: 'GET',
    headers: getHeaders(jwt),
  });

  const data = (await response.json()) as { id: number };

  console.log('GitHub:', JSON.stringify(data, null, 2));

  if (!response.ok) {
    console.error('GitHub API:', response.status, data);
  }

  return data.id;
};

export const getAppToken = async (options: {
  appId: string;
  privateKey: string;
  installationId: number;
}) => {
  const { appId, installationId, privateKey } = options;
  const auth = createAppAuth({
    appId,
    privateKey,
    installationId,
  });

  const authResponse = await auth({ type: 'installation' });

  return authResponse.token;
};
