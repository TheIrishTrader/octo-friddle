const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${path}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(error.message ?? `Request failed: ${response.status}`);
  }

  return response.json();
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path),

  post: <T>(path: string, body: unknown) =>
    request<T>(path, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  patch: <T>(path: string, body: unknown) =>
    request<T>(path, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  delete: <T>(path: string) =>
    request<T>(path, {
      method: "DELETE",
    }),

  upload: async <T>(path: string, formData: FormData): Promise<T> => {
    const url = `${API_BASE_URL}${path}`;
    const response = await fetch(url, {
      method: "POST",
      body: formData,
      // No Content-Type header — browser sets multipart boundary automatically
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(error.message ?? `Upload failed: ${response.status}`);
    }

    return response.json();
  },
};
