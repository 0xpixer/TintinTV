export function getAuthenticatedLoginDestination(
  requestedPath: string | null
): string {
  if (
    requestedPath &&
    requestedPath.startsWith('/') &&
    !requestedPath.startsWith('//') &&
    !requestedPath.startsWith('/login')
  ) {
    return requestedPath;
  }
  return '/';
}
