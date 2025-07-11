export const getApiBaseUrl = (): string => {
  return process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';
};

export const apiUrl = (endpoint: string): string => {
  return `${getApiBaseUrl()}${endpoint}`;
};