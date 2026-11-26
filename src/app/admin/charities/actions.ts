"use server";
// Admin charity management (PRD §11.3). Charities live in the database, so adding or
// editing one needs no redeploy (PRD §14).
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { slugify } from "@/lib/charities";
import { detectImageType } from "@/lib/winners";

export type CharityAdminState = { error?: string; success?: string } | null;
const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const BUCKET = "charity-media";
const uuid = z.string().uuid();

const schema = z.object({
  id: z.union([uuid, z.literal("new")]),
  name: z.string().trim().min(2, "Enter the charity name").max(100),
  slug: z.string().trim().max(60),
  category: z.string().trim().max(40),
  description: z.string().trim().max(4000),
  image_url: z.union([z.literal(""), z.string().trim().url("Image link must be a valid URL").startsWith("https://", "Image link must start with https://")]),
});

function refreshPublic(slug?: string) {
  revalidatePath("/charities");
  revalidatePath("/admin/charities");
  if (slug) revalidatePath(`/charities/${slug}`);
}

export async function saveCharity(_prev: CharityAdminState, formData: FormData): Promise<CharityAdminState> {
  await requireAdmin();
  const p = schema.safeParse({
    id: formData.get("id"), name: formData.get("name"), slug: formData.get("slug") ?? "",
    category: formData.get("category") ?? "", description: formData.get("description") ?? "", image_url: formData.get("image_url") ?? "",
  });
  if (!p.success) return { error: p.error.issues[0].message };

  const slug = slugify(p.data.slug || p.data.name);
  if (!slug) return { error: "Use letters or numbers in the name." };
  const row = {
    name: p.data.name, slug, category: p.data.category || null, description: p.data.description || null,
    image_url: p.data.image_url || null,
    is_featured: formData.get("is_featured") === "on", is_active: formData.get("is_active") === "on",
  };

  const admin = createAdminClient();
  let id = p.data.id;
  if (id === "new") {
    const { data, error } = await admin.from("charities").insert(row).select("id").single();
    if (error?.code === "23505") return { error: "That web address (slug) is already used by another charity." };
    if (error || !data) return { error: "Couldn't create the charity." };
    id = data.id;
  } else {
    const { error } = await admin.from("charities").update(row).eq("id", id);
    if (error?.code === "23505") return { error: "That web address (slug) is already used by another charity." };
    if (error) return { error: "Couldn't save the charity." };
  }

  // Optional picture upload (checked by its first bytes, not the file name). Replaces the link above.
  const file = formData.get("image");
  if (file instanceof File && file.size > 0) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const type = detectImageType(bytes);
    if (!type) return { error: "Saved, but the picture was not added: use a PNG, JPG or WebP image." };
    if (bytes.length > MAX_IMAGE_BYTES) return { error: "Saved, but the picture was not added: it is larger than 3 MB." };
    const path = `${id}/${Date.now()}.${type.ext}`;
    const up = await admin.storage.from(BUCKET).upload(path, bytes, { contentType: type.mime, upsert: true });
    if (up.error) return { error: "Saved, but the picture upload failed. Please try again." };
    await admin.from("charities").update({ image_url: admin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl }).eq("id", id);
  }

  refreshPublic(slug);
  if (p.data.id === "new") redirect(`/admin/charities/${id}`);
  return { success: "Saved." };
}

export async function deleteCharity(formData: FormData) {
  await requireAdmin();
  const id = uuid.safeParse(formData.get("id"));
  if (!id.success) return;
  const { error } = await createAdminClient().from("charities").delete().eq("id", id.data);
  // Charities with donations are kept for the records: hide them instead.
  if (error) redirect(`/admin/charities/${id.data}?error=delete`);
  refreshPublic();
  redirect("/admin/charities");
}

const eventSchema = z.object({
  charityId: uuid,
  title: z.string().trim().min(2, "Enter an event title").max(120),
  event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date"),
  location: z.string().trim().max(120),
  description: z.string().trim().max(600),
});

export async function addEvent(_prev: CharityAdminState, formData: FormData): Promise<CharityAdminState> {
  await requireAdmin();
  const p = eventSchema.safeParse(Object.fromEntries(formData));
  if (!p.success) return { error: p.error.issues[0].message };
  const { error } = await createAdminClient().from("charity_events").insert({
    charity_id: p.data.charityId, title: p.data.title, event_date: p.data.event_date,
    location: p.data.location || null, description: p.data.description || null,
  });
  if (error) return { error: "Couldn't add the event." };
  revalidatePath(`/admin/charities/${p.data.charityId}`);
  refreshPublic();
  return { success: "Event added." };
}

export async function deleteEvent(formData: FormData) {
  await requireAdmin();
  const id = uuid.safeParse(formData.get("id"));
  const charityId = uuid.safeParse(formData.get("charityId"));
  if (!id.success || !charityId.success) return;
  await createAdminClient().from("charity_events").delete().eq("id", id.data).eq("charity_id", charityId.data);
  revalidatePath(`/admin/charities/${charityId.data}`);
  refreshPublic();
}
