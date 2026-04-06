async function getStatus(auth, key, secret, data) {
  const keyId = data.id;
  const [owner, repo] = auth.realm.repository.split("/");
  const baseUrl = auth.grantApi.baseUrl;
  const endpoint = `${baseUrl}/repos/${owner}/${repo}/keys/${keyId}`;

  const response = await fetch(endpoint, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${secret}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    }
  });

  const result = await response.json();
  if (!response.ok) {
    return { status: "invalid"  };
  }

  return { status: "active" };
}
