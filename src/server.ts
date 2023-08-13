import express, { Request, Response } from "express";
import { HOST, PROJECT, URL } from "./constants";
import { fetchAuditsRuns } from "./logic";

const app = express();
const PORT: number = 3000;

const host = HOST;
const project = PROJECT;

app.get("/", async (req: Request, res: Response) => {
  const audits = await fetchAuditsRuns({ host, project, url: URL });
  res.json(audits);
});

app.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
});
