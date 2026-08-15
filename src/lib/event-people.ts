import type { PeopleGroup, PersonItem } from "@/components/people/PeopleList";

function parsePersonEntry(entry: string): PersonItem | null {
  const parts = entry.split(":").map((p) => p.trim());
  const username = parts[0]?.toLowerCase();
  if (!username) return null;

  const fallbackName = parts[1] || undefined;
  const fallbackTitle = parts[2] || undefined;

  return {
    username,
    fallbackName,
    fallbackTitle,
  };
}

function normalizePeople(entries?: string[]): PersonItem[] {
  const seen = new Set<string>();
  const people: PersonItem[] = [];
  for (const entry of entries ?? []) {
    const person = parsePersonEntry(entry);
    if (!person || seen.has(person.username)) continue;
    seen.add(person.username);
    people.push(person);
  }
  return people;
}

export function buildPeopleGroups(
  organizers?: string[],
  volunteers?: string[]
): PeopleGroup[] {
  const groups: PeopleGroup[] = [
    { label: "Organizers", people: normalizePeople(organizers) },
    { label: "Volunteers", people: normalizePeople(volunteers) },
  ];
  return groups.filter((group) => group.people.length > 0);
}
