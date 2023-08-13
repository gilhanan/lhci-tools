import axios from "axios";
import { PARALLEL_REQUESTS_COUNT } from "./config";
import { Build, RawBuild, Run, RawRun } from "./model";

export async function fetchBuilds({
  host,
  project,
}: {
  host: string;
  project: string;
}): Promise<Build[]> {
  const { data } = await axios.get<RawBuild[]>(
    `${host}/v1/projects/${project}/builds?limit=30`
  );

  return data.map<Build>((build) => ({
    ...build,

    committedAt: new Date(build.committedAt),
  }));
}

export async function fetchRuns({
  host,
  project,
  build: { id },
  url,
}: {
  host: string;
  project: string;
  build: Build;
  url: string;
}): Promise<Run[]> {
  const { data } = await axios.get<RawRun[]>(
    `${host}/v1/projects/${project}/builds/${id}/Runs?url=${url}`
  );

  return data.map<Run>((run) => ({
    ...run,
    lhr: JSON.parse(run.lhr),
  }));
}

export async function fetchAllRuns({
  host,
  project,
  builds,
  url,
}: {
  host: string;
  project: string;
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
      chunk.map((build) => fetchRuns({ host, project, build, url }))
    );
    allRuns = allRuns.concat(...chunkRuns);
  }

  return allRuns;
}
