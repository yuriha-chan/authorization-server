async function grant({ id, realm, grantApi, key }) {
  const [owner, repo] = realm.repository.split("/");
  const baseURL = grantApi.baseURL;
  const endpoint = `${baseURL}/repos/${owner}/${repo}/keys`;

  const payload = {
    title: `auth-server-${id}`,
    key: key,
    read_only: !realm.write
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${grantApi.secret}`,
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
