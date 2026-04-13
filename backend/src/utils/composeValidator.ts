import axios from 'axios';
import * as yaml from 'js-yaml';

const DB_IMAGES = [
  'postgres', 'postgresql',
  'mysql', 'mariadb',
  'mongo', 'mongodb',
  'redis',
  'mssql', 'sqlserver', 'mcr.microsoft.com/mssql',
  'cassandra',
  'elasticsearch',
  'influxdb',
  'couchdb',
  'cockroachdb',
  'timescaledb',
  'neo4j',
  'dynamodb',
];

// Paths de contenedor que son exclusivos de motores de base de datos
const DB_VOLUME_PATHS = [
  '/var/lib/postgresql',   // postgres
  '/var/lib/mysql',        // mysql
  '/var/lib/mariadb',      // mariadb
  '/data/db',              // mongodb
  '/var/lib/mongodb',      // mongodb alternativo
  '/var/lib/redis',        // redis
  '/data',                 // redis con config custom
  '/var/lib/elasticsearch', // elasticsearch
  '/var/lib/influxdb',     // influxdb
  '/var/lib/cassandra',    // cassandra
  '/var/lib/neo4j',        // neo4j
  '/cockroach/cockroach-data', // cockroachdb
  '/var/lib/couchdb',      // couchdb
  '/var/opt/mssql',        // mssql
  '/var/lib/timescaledb',  // timescaledb
];

function isDbImage(image: string): boolean {
  const normalized = image.toLowerCase();
  return DB_IMAGES.some(
    (db) => normalized === db || normalized.startsWith(`${db}:`) || normalized.includes(`/${db}:`)
  );
}

function extractVolumePaths(service: any): string[] {
  const volumes: any[] = service?.volumes ?? [];
  return volumes.map((v: any) => {
    if (typeof v === 'string') {
      // formato "source:target" o solo "target"
      const parts = v.split(':');
      return parts.length >= 2 ? parts[1] : parts[0];
    }
    // formato largo: { source, target }
    return v?.target ?? '';
  });
}

function hasDbVolumePath(service: any): string | null {
  const paths = extractVolumePaths(service);
  for (const path of paths) {
    const normalized = path.toLowerCase();
    const match = DB_VOLUME_PATHS.find((dbPath) => normalized === dbPath || normalized.startsWith(dbPath + '/'));
    if (match) return path;
  }
  return null;
}

function parseGithubRepo(repositorioGit: string): { owner: string; repo: string } | null {
  // https://github.com/owner/repo or https://github.com/owner/repo.git
  const httpsMatch = repositorioGit.match(/github\.com\/([^/]+)\/([^/\s.]+?)(?:\.git)?$/);
  if (httpsMatch) return { owner: httpsMatch[1], repo: httpsMatch[2] };

  // git@github.com:owner/repo.git
  const sshMatch = repositorioGit.match(/git@github\.com:([^/]+)\/([^/\s.]+?)(?:\.git)?$/);
  if (sshMatch) return { owner: sshMatch[1], repo: sshMatch[2] };

  return null;
}

async function fetchComposeFile(owner: string, repo: string, branch: string): Promise<{ content: string; filename: string } | null> {
  const filenames = ['docker-compose.yml', 'docker-compose.yaml', 'compose.yml', 'compose.yaml'];
  for (const filename of filenames) {
    try {
      const url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filename}`;
      console.log(`🔍 Trying compose file: ${url}`);
      const response = await axios.get<string>(url, { timeout: 8000, responseType: 'text' });
      console.log(`✅ Found compose file: ${filename}`);
      return { content: response.data, filename };
    } catch (err: any) {
      console.log(`⚠️ Not found: ${filename} (${err.response?.status ?? err.message})`);
    }
  }
  return null;
}

export interface ComposeValidationResult {
  valid: boolean;
  error?: string;
  dbServicesFound?: string[];
  serviceNames?: string[]; // servicios válidos (no BD)
  composeFilename?: string; // nombre del archivo encontrado (ej: 'docker-compose.yml')
}

export async function validateComposeHasNoDB(
  repositorioGit: string,
  branch: string
): Promise<ComposeValidationResult> {
  // Solo aplica a repos de GitHub
  const parsed = parseGithubRepo(repositorioGit);
  if (!parsed) {
    return { valid: false, error: 'Only GitHub repositories are supported for Docker Compose deployments.' };
  }

  const composeFile = await fetchComposeFile(parsed.owner, parsed.repo, branch);
  if (!composeFile) {
    return { valid: false, error: 'No docker-compose.yml found in the repository root.' };
  }

  const { content: rawYaml, filename: composeFilename } = composeFile;

  let compose: any;
  try {
    compose = yaml.load(rawYaml);
  } catch {
    return { valid: false, error: 'Could not parse docker-compose.yml. Make sure it is valid YAML.' };
  }

  const services: Record<string, any> = compose?.services ?? {};
  const dbServices: string[] = [];
  const validServices: string[] = [];

  for (const [serviceName, service] of Object.entries(services)) {
    const image: string = (service as any)?.image ?? '';

    if (image && isDbImage(image)) {
      dbServices.push(`${serviceName} (image: ${image})`);
      continue;
    }

    // Segunda señal: path de volumen exclusivo de BD (cubre imágenes custom que envuelven una BD)
    const dbVolumePath = hasDbVolumePath(service);
    if (dbVolumePath) {
      dbServices.push(`${serviceName} (volume path: ${dbVolumePath})`);
      continue;
    }

    validServices.push(serviceName);
  }

  if (dbServices.length > 0) {
    return {
      valid: false,
      dbServicesFound: dbServices,
      error:
        `Your docker-compose.yml contains database services that are not allowed: ${dbServices.join(', ')}. ` +
        `Please remove them and use an external database service instead.`,
    };
  }

  return { valid: true, serviceNames: validServices, composeFilename };
}
