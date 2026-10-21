// In-memory API only. Fixture Vite config replaces production @/lib/api.
const date = "2026-10-31";
const time = (value: string) => `${date}T${value}:00+07:00`;
let revision = 1;
export const rooms = [{ id: "room-1", name: "Main Hall", displayOrder: 0, archived: false, revision: 1 }];
export const formats = [{ id: "format-1", name: "Talk", displayOrder: 0, archived: false, revision: 1 }];
export const speakers = ["Arief Nugraha", "Dewi Lestari", "Budi Santoso"].map((name, i) => ({ id: `speaker-${i}`, name, role: "Engineer", company: "Example", photoUrl: "" }));
let items: any[] = [{ id: "session-1", title: "Opening Keynote", sessionId: null, roomIds: ["room-1"], allRooms: false, rooms: [], track: null, startsAt: time("09:00"), endsAt: time("09:30"), sessionType: null, formatId: "format-1", isServiceSession: false, isActive: true, displayOrder: 0, revision: 1, createdAt: "", updatedAt: "", description: "Welcome", speakerIds: ["speaker-0"], speakers: [] }];
const wait = (ms = 20) => new Promise((resolve) => setTimeout(resolve, ms));
export async function fetchAdminSchedule() { await wait(); return { schedule: items, revision, publishedAt: null }; }
export async function fetchScheduleRooms() { await wait(); return { rooms }; }
export async function fetchScheduleFormats() { await wait(); return { formats }; }
export async function fetchAdminSpeakers() { await wait(); return { speakers }; }
export async function updateAdminScheduleItem(_slug: string, id: string, patch: any) { await wait(); if (patch.forceFail) throw Error("Mock save failure"); const item = items.find((entry) => entry.id === id); if (!item) throw Error("Missing session"); Object.assign(item, patch); item.revision++; revision++; return item; }
export async function createAdminScheduleItem(_slug: string, item: any) { await wait(); if (item.title.includes("FAIL")) throw Error("Mock save failure"); const created = { id: "session-new", revision: 1, displayOrder: items.length, createdAt: "", updatedAt: "", ...item }; items = [...items, created]; revision++; return created; }
export async function createAdminSpeaker(_slug: string, speaker: any) { return { id: "speaker-new", photoUrl: "", ...speaker }; }
export async function deleteAdminScheduleItem() { return { success: true }; }
export async function createScheduleRoom(_slug: string, room: any) { return { id: "room-new", archived: false, revision: 1, ...room }; }
export async function updateScheduleRoom(_slug: string, id: string, patch: any) { const room = rooms.find((entry) => entry.id === id)!; Object.assign(room, patch); room.revision++; return room; }
export async function createScheduleFormat(_slug: string, format: any) { const created = { id: "format-new", archived: false, revision: 1, ...format }; formats.push(created); return created; }
export async function updateScheduleFormat(_slug: string, id: string, patch: any) { const format = formats.find((entry) => entry.id === id)!; Object.assign(format, patch); format.revision++; return format; }
export async function reviewSchedule() { return { canPublish: false, includedCount: items.length, excluded: [], conflicts: [], added: [], updated: [], removed: [], revision, publishedAt: null }; }
export async function publishSchedule() { return { publishedAt: new Date().toISOString(), itemCount: items.length, revision }; }
export async function fetchSessionizeData() { return { sessions: [], metadata: { rooms: [], jobTitles: [] } }; }
export async function syncSessionizeSchedule() { return { imported: 0, updated: 0 }; }
