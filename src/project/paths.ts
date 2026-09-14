import { existsSync, lstatSync, realpathSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";

export function normalizeManagedPath(path: string): string {
  if (!path || path.includes("\0") || isAbsolute(path)) throw new Error(`Unsafe managed path: ${JSON.stringify(path)}`);
  const segments = path.split(/[\\/]+/).filter(Boolean);
  if (segments.length === 0 || segments.some((segment) => segment === ".." || segment === ".")) throw new Error(`Unsafe managed path: ${JSON.stringify(path)}`);
  return segments.join("/");
}

export function resolveProjectPath(projectDirectory: string, path: string): string {
  const root = resolve(projectDirectory);
  const normalized = normalizeManagedPath(path);
  const target = resolve(root, ...normalized.split("/"));
  const fromRoot = relative(root, target);
  if (fromRoot === "" || fromRoot.startsWith(`..${sep}`) || fromRoot === ".." || isAbsolute(fromRoot)) throw new Error(`Managed path escapes project root: ${path}`);
  let cursor = root;
  for (const segment of normalized.split("/")) {
    cursor = resolve(cursor, segment);
    if (existsSync(cursor) && lstatSync(cursor).isSymbolicLink()) throw new Error(`Refusing to mutate symbolic-link path: ${path}`);
  }
  if (existsSync(root)) {
    const realRoot = realpathSync(root);
    let current = dirname(target);
    while (!existsSync(current) && current !== realRoot) current = dirname(current);
    if (existsSync(current)) {
      const relativeParent = relative(realRoot, realpathSync(current));
      if (relativeParent.startsWith(`..${sep}`) || relativeParent === ".." || isAbsolute(relativeParent)) throw new Error(`Managed path resolves outside project root: ${path}`);
    }
  }
  return target;
}
