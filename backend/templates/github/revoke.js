async function revoke(auth, key, secret, data) {
  const keyId = data.id;
  const [owner, repo] = auth.realm.repository.split("/");
  const baseUrl = auth.grantApi.baseUrl;
  const endpoint = `${baseUrl}/repos/${owner}/${repo}/keys/${keyId}`;

  const response = await fetch(endpoint, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${secret}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    }
  });

  if (response.status === 204) {
    return {};
  }

  throw Error(`fetch failed: status: ${response.status}, error: ${result}`);
}
