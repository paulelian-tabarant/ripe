export interface ProjectRegistrationResult {
  status: 201 | 409;
  projectId: string;
  message?: string;
}

export async function registerProject(
  serverUrl: string,
  name: string
): Promise<ProjectRegistrationResult> {
  const url = new URL('/api/projects', serverUrl);
  const body = JSON.stringify({ name });

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });

  if (res.status !== 201 && res.status !== 409) {
    throw new Error(`Unexpected response status: ${String(res.status)}`);
  }

  const parsed = (await res.json()) as { projectId: string; message?: string };

  return {
    status: res.status,
    projectId: parsed.projectId,
    message: parsed.message,
  };
}
