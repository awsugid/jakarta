import type { PeopleGroup } from "@/components/people/PeopleList";

function normalizeEmails(emails?: string[]): { email: string }[] {
  const seen = new Set<string>();
  const people: { email: string }[] = [];
  for (const email of emails ?? []) {
    const normalized = email.trim().toLowerCase();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    people.push({ email: normalized });
  }
  return people;
}

export function buildPeopleGroups(
  organizers?: string[],
  volunteers?: string[]
): PeopleGroup[] {
  const groups: PeopleGroup[] = [
    { label: "Organizers", people: normalizeEmails(organizers) },
    { label: "Volunteers", people: normalizeEmails(volunteers) },
  ];
  return groups.filter((group) => group.people.length > 0);
}
