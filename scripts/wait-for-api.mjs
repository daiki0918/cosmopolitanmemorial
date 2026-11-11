const url = "http://localhost:4000/health";

for (let attempt = 0; attempt < 60; attempt += 1) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(1000) });
    if (response.ok) process.exit(0);
  } catch {
    // The API is still starting; retry until it responds or the startup deadline expires.
  }
  await new Promise((resolve) => setTimeout(resolve, 500));
}

console.error("The API did not become ready at http://localhost:4000. Check the API startup logs.");
process.exit(1);
