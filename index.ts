import axios from "axios";
import express, { Request, Response } from "express";

const app = express();
const PORT: number = 3000;

const HOST: string = "https://gil-hanan-lhci-server.azurewebsites.net";
const PROJECT: string = "a8a658fb-36e9-4104-8ecf-b4bafbccaf9d";
const AUDIT_IDS: string[] = [
  "page-load-time-response-start",
  "page-load-time-response-end",
  "page-load-time-assets-loaded",
  "page-load-time-app-rendered",
];
const URL =
  "https://smp-euap-pb-cus.azurewebsites.net/embed/en-US/product/power-bi-visuals/WA104380756?product=power-bi-visuals";
const PARALLEL_REQUESTS_COUNT: number = 3;

interface AuditValue {
  numericValue: number;
}

type Audits = Record<string, AuditValue>;

interface LHR {
  audits: Audits;
}

interface Build {
  id: string;
}

interface RawRun {
  buildId: string;
  url: string;
  lhr: string;
}

type Run = Omit<RawRun, "lhr"> & {
  lhr: LHR;
};

type AuditId = keyof typeof AUDIT_IDS;
type GroupedAudits = Record<AuditId, number[]>;
type GroupedAuditsByBuild = Record<string, GroupedAudits>;

interface RunAudit {
  buildId: string;
  auditId: AuditId;
  value: number;
}

async function fetchBuilds(): Promise<Build[]> {
  const { data } = await axios.get<Build[]>(
    `${HOST}/v1/projects/${PROJECT}/builds`
  );
  return data;
}

async function fetchRuns({
  build: { id },
  url,
}: {
  build: Build;
  url: string;
}): Promise<Run[]> {
  const { data } = await axios.get<RawRun[]>(
    `${HOST}/v1/projects/${PROJECT}/builds/${id}/Runs?url=${url}`
  );

  return data.map<Run>((run) => ({
    ...run,
    lhr: JSON.parse(run.lhr),
  }));
}

async function fetchAllRuns({
  builds,
  url,
}: {
  builds: Build[];
  url: string;
}): Promise<Run[]> {
  const chunks: Build[][] = Array.from(
    { length: Math.ceil(builds.length / PARALLEL_REQUESTS_COUNT) },
    (_, i) =>
      builds.slice(
        i * PARALLEL_REQUESTS_COUNT,
        i * PARALLEL_REQUESTS_COUNT + PARALLEL_REQUESTS_COUNT
      )
  );

  let allRuns: Run[] = [];
  for (const chunk of chunks) {
    const chunkRuns: Run[][] = await Promise.all(
      chunk.map((build) => fetchRuns({ build, url }))
    );
    allRuns = allRuns.concat(...chunkRuns);
  }

  return allRuns;
}

function groupByBuildAndAudits({
  runs,
}: {
  runs: Run[];
}): GroupedAuditsByBuild {
  return runs.reduce<GroupedAuditsByBuild>(
    (acc, { buildId, lhr: { audits } }) => {
      if (!acc[buildId]) {
        acc[buildId] = AUDIT_IDS.reduce<GroupedAudits>(
          (acc, auditId) => ({
            ...acc,
            [auditId]: [],
          }),
          {} as GroupedAudits
        );
      }

      AUDIT_IDS.forEach((auditId) => {
        const numericValue = audits[auditId]?.numericValue || -1;
        acc[buildId][auditId as AuditId].push(numericValue);
      });

      return acc;
    },
    {}
  );
}

function getRunAudits({ runs }: { runs: Run[] }): RunAudit[] {
  return runs.reduce<RunAudit[]>((acc, { buildId, lhr: { audits } }) => {
    AUDIT_IDS.forEach((auditId) => {
      const numericValue = audits[auditId]?.numericValue || -1;
      acc.push({
        buildId,
        auditId: auditId as AuditId,
        value: numericValue,
      });
    });

    return acc;
  }, []);
}

app.get("/fetchAudits", async (req: Request, res: Response) => {
  const builds: Build[] = (await fetchBuilds()).slice(0, 10);
  const runs: Run[] = await fetchAllRuns({ builds, url: URL });
  const audits: RunAudit[] = getRunAudits({ runs });
  res.json(audits);
});

app.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
});
