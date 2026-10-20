import type { Metadata } from "next";
import Image from "next/image";
import { Suspense } from "react";
import { Images, MapPin, Trash2 } from "lucide-react";
import { ActionForm } from "@/components/ui/action-form";
import { buttonClasses } from "@/components/ui/button";
import { Disclosure } from "@/components/ui/disclosure";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Select } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import { ListSkeleton } from "@/components/ui/skeleton";
import { SubmitButton } from "@/components/ui/submit-button";
import { getCoupleContext } from "@/lib/dal";
import { MEMORIES_BUCKET } from "@/lib/env";
import { formatLongDate, todayInTimezone } from "@/lib/format";
import type { MemoryRow } from "@/lib/supabase/database.types";
import { deleteMemory } from "./actions";
import { MemoryForm } from "./memory-form";

export const metadata: Metadata = { title: "Souvenirs" };

export default function MemoriesPage({ searchParams }: PageProps<"/souvenirs">) {
  return (
    <>
      <PageHeader title="Souvenirs" intro="Vos photos et vos petits mots, rangés le long du temps." />
      <Suspense fallback={<ListSkeleton />}>
        <MemoriesContent searchParams={searchParams} />
      </Suspense>
    </>
  );
}

type Filters = { lieu?: string; du?: string; au?: string; album?: string };

function readFilters(sp: Record<string, string | string[] | undefined>): Filters {
  const one = (k: string) => {
    const v = sp[k];
    const s = (Array.isArray(v) ? v[0] : v)?.trim();
    return s ? s.slice(0, 100) : undefined;
  };
  const date = (k: string) => {
    const v = one(k);
    return v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined;
  };
  const album = one("album");
  return { lieu: one("lieu"), du: date("du"), au: date("au"), album: album && /^[0-9a-f-]{36}$/i.test(album) ? album : undefined };
}

async function MemoriesContent({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const filters = readFilters(await searchParams);
  const { supabase, couple } = await getCoupleContext();

  let query = supabase.from("memories").select("*").order("happened_on", { ascending: false }).order("created_at", { ascending: false });
  if (filters.lieu) query = query.ilike("location_name", `%${filters.lieu.replace(/[%_\\]/g, (c) => `\\${c}`)}%`);
  if (filters.du) query = query.gte("happened_on", filters.du);
  if (filters.au) query = query.lte("happened_on", filters.au);
  if (filters.album) query = query.eq("album_id", filters.album);

  const [{ data: memories, error }, { data: albums }] = await Promise.all([
    query.limit(100),
    supabase.from("albums").select("id, name").order("name"),
  ]);
  if (error) throw new Error(error.message);

  const memoryIds = memories.map((m) => m.id);
  const { data: photos } = memoryIds.length
    ? await supabase.from("memory_photos").select("*").in("memory_id", memoryIds).order("position")
    : { data: [] };

  // URLs signées (bucket privé), valables 1 heure
  const paths = (photos ?? []).map((p) => p.storage_path);
  const { data: signed } = paths.length
    ? await supabase.storage.from(MEMORIES_BUCKET).createSignedUrls(paths, 3600)
    : { data: [] };
  const urlByPath = new Map((signed ?? []).filter((s) => s.signedUrl).map((s) => [s.path, s.signedUrl]));
  const photosBy = new Map<string, string[]>();
  for (const p of photos ?? []) {
    const url = urlByPath.get(p.storage_path);
    if (url) photosBy.set(p.memory_id, [...(photosBy.get(p.memory_id) ?? []), url]);
  }

  const albumName = new Map((albums ?? []).map((a) => [a.id, a.name]));
  const hasFilters = Object.values(filters).some(Boolean);
  const months = groupByMonth(memories);

  return (
    <>
      <Disclosure label="Ajouter un souvenir">
        <MemoryForm coupleId={couple.id} albums={albums ?? []} today={todayInTimezone()} />
      </Disclosure>

      <form
        className="mb-8 grid grid-cols-2 items-end gap-3 rounded-[1.75rem] bg-sunken/60 p-4 sm:grid-cols-[minmax(0,1fr)_9.5rem_9.5rem] lg:grid-cols-[minmax(0,1fr)_9.5rem_9.5rem_11rem_auto]"
        role="search"
        aria-label="Filtrer les souvenirs"
      >
        <FilterField label="Lieu" className="col-span-2 sm:col-span-1">
          <Input name="lieu" placeholder="Étretat, Paris…" defaultValue={filters.lieu} aria-label="Lieu" />
        </FilterField>
        <FilterField label="Du">
          <Input name="du" type="date" defaultValue={filters.du} aria-label="Depuis le" />
        </FilterField>
        <FilterField label="Au">
          <Input name="au" type="date" defaultValue={filters.au} aria-label="Jusqu'au" />
        </FilterField>
        <FilterField label="Album">
          <Select name="album" defaultValue={filters.album ?? ""} aria-label="Album">
            <option value="">Tous</option>
            {(albums ?? []).map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
        </FilterField>
        <button type="submit" className={buttonClasses("soft", "md")}>
          Filtrer
        </button>
      </form>

      {memories.length === 0 ? (
        <EmptyState icon={Images} title={hasFilters ? "Aucun souvenir ne correspond" : "Votre album est encore vide"}>
          {hasFilters
            ? "Élargissez les dates ou retirez un filtre."
            : "Ajoutez une photo de votre dernière sortie et un petit mot pour vous en souvenir."}
        </EmptyState>
      ) : (
        <div className="space-y-12">
          {months.map(([month, items]) => (
            <section key={month}>
              <h2 className="sticky top-0 z-10 -mx-2 mb-4 bg-paper/90 px-2 py-2 font-display text-xl capitalize text-ink backdrop-blur">
                {month}
              </h2>
              <ol className="space-y-6 border-l-2 border-accent-soft pl-5">
                {items.map((m) => (
                  <MemoryItem key={m.id} memory={m} photos={photosBy.get(m.id) ?? []} album={m.album_id ? albumName.get(m.album_id) : undefined} />
                ))}
              </ol>
            </section>
          ))}
        </div>
      )}
    </>
  );
}

function MemoryItem({ memory, photos, album }: { memory: MemoryRow; photos: string[]; album?: string }) {
  const mapUrl =
    memory.latitude != null && memory.longitude != null
      ? `https://www.openstreetmap.org/?mlat=${memory.latitude}&mlon=${memory.longitude}#map=16/${memory.latitude}/${memory.longitude}`
      : null;

  return (
    <li className="relative">
      <span className="absolute top-2 -left-[1.6rem] size-3 rounded-full border-2 border-paper bg-accent" aria-hidden />
      <article className="neon-panel rounded-[1.75rem] border border-line bg-surface p-5">
        {photos.length > 0 && (
          <div className={photos.length === 1 ? "mb-4" : "mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3"}>
            {photos.map((url, i) => (
              <a key={url} href={url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-2xl bg-sunken">
                <Image
                  src={url}
                  alt={`${memory.title}, photo ${i + 1}`}
                  width={800}
                  height={600}
                  unoptimized
                  className={photos.length === 1 ? "max-h-[28rem] w-full object-cover" : "aspect-square w-full object-cover"}
                />
              </a>
            ))}
          </div>
        )}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-lg text-ink">{memory.title}</h3>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-sm text-ink-soft">
              <time dateTime={memory.happened_on}>{formatLongDate(memory.happened_on)}</time>
              {memory.location_name &&
                (mapUrl ? (
                  <a href={mapUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline-offset-2 hover:underline">
                    <MapPin className="size-3.5" aria-hidden />
                    {memory.location_name}
                  </a>
                ) : (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="size-3.5" aria-hidden />
                    {memory.location_name}
                  </span>
                ))}
              {album && <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs text-ink">{album}</span>}
            </p>
          </div>
          <ActionForm action={deleteMemory} confirmMessage="Supprimer ce souvenir et ses photos ?">
            <input type="hidden" name="memory_id" value={memory.id} />
            <SubmitButton variant="ghost" size="sm" aria-label={`Supprimer ${memory.title}`}>
              <Trash2 className="size-4" aria-hidden />
            </SubmitButton>
          </ActionForm>
        </div>
        {memory.note && <p className="mt-3 font-hand text-2xl leading-snug whitespace-pre-line text-accent-strong">{memory.note}</p>}
      </article>
    </li>
  );
}

function FilterField({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={className}>
      <span className="mb-1 block px-1 text-xs text-ink-soft" aria-hidden>
        {label}
      </span>
      {children}
    </div>
  );
}

function groupByMonth(memories: MemoryRow[]) {
  const fmt = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" });
  const groups = new Map<string, MemoryRow[]>();
  for (const m of memories) {
    const key = fmt.format(new Date(`${m.happened_on}T00:00:00Z`));
    groups.set(key, [...(groups.get(key) ?? []), m]);
  }
  return [...groups.entries()];
}
