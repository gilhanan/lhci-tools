import { fetchBuilds, fetchAllRuns } from "./client";
import { AUDIT_IDS } from "./config";
import {
  Run,
  GroupedAuditsByBuild,
  GroupedAudits,
  AuditId,
  Build,
  AuditRun,
} from "./model";

export async function fetchAuditsRuns({
  host,
  project,
  url,
}: {
  host: string;
  project: string;
  url: string;
}): Promise<AuditRun[]> {
  const builds: Build[] = await fetchBuilds({ host, project });
  const runs: Run[] = await fetchAllRuns({ host, project, builds, url });
  const audits: AuditRun[] = calcRunAudits({ builds, runs });
  return audits;
}

export function groupByBuildAndAudits({
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

export function calcRunAudits({
  builds,
  runs,
}: {
  builds: Build[];
  runs: Run[];
}): AuditRun[] {
  const buildMap: Record<string, Build> = Object.fromEntries(
    builds.map((build) => [build.id, build])
  );

  return runs.reduce<AuditRun[]>((acc, { buildId, lhr: { audits } }) => {
    AUDIT_IDS.forEach((auditId) => {
      const numericValue = audits[auditId]?.numericValue || -1;
      const { commitMessage, committedAt } = buildMap[buildId];

      acc.push({
        buildId,
        commitMessage,
        committedAt,
        auditId: auditId as AuditId,
        value: numericValue,
      });
    });

    return acc;
  }, []);
}
