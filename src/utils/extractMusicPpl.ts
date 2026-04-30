import { CrewMemberInfo } from "@/app/services/tmdb";

export function extractMusicPeople(crew: CrewMemberInfo[]): string[] {
  const strongJobs = [
    "Original Music Composer",
    "Composer",
    "Music",
    "Score",
  ];

  const mediumJobs = [
    "Conductor",
    "Music Director",
    "Orchestrator",
  ];

  const names: string[] = [];

  for (const member of crew) {
    const job = member.job.toLowerCase();

    if (strongJobs.some(j => job.includes(j.toLowerCase()))) {
      names.push(member.name);
      continue;
    }

    if (mediumJobs.some(j => job.includes(j.toLowerCase()))) {
      names.push(member.name);
    }
  }

  return Array.from(new Set(names));
}