async function grant(auth, key, secret) {
  const [owner, repo] = auth.realm.repository.split("/");
  const baseUrl = auth.grantApi.baseUrl;
  const endpoint = `${baseUrl}/repos/${owner}/${repo}/keys`;

  const payload = {
    title: `auth-server-${auth.id}`,
    key: publicKey,
    read_only: !auth.realm.write
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${secret}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const result = await response.json();

  if (!response.ok) {
    throw Error(`fetch failed: status: ${response.status}, error: ${result}`);
  }

  return { data: result, autoExpiry: false };
}
