"use client";

import { Trash2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { RequireOwner } from "@/components/auth/guards";
import { BasicsFields, DetailsFields } from "@/components/owner/property-form";
import { PhotoUploader } from "@/components/owner/photo-uploader";
import { AppDialog } from "@/components/ui/app-dialog";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import { PageSpinner } from "@/components/ui/page-spinner";
import { ErrorNote, StatusBadge } from "@/components/ui/primitives";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { api, errorMessage } from "@/lib/client/api";
import { PROPERTY_TYPE_LABEL, SHARING_LABEL } from "@/lib/domain/catalog";
import { checkPropertyInput, type PropertyInput } from "@/lib/domain/validation";
import type { EditableProperty } from "@/types/api";

function EditProperty({ id }: { id: string }) {
  const router = useRouter();
  const toast = useToast();
  const [data, setData] = useState<EditableProperty | null>(null);
  const [input, setInput] = useState<PropertyInput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const [tab, setTab] = useState("basics");
  const [busy, setBusy] = useState<"save" | "publish" | "delete" | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    api
      .editable(id)
      .then((d) => {
        setData(d);
        setInput(d.input);
      })
      .catch((e) => setError(errorMessage(e)));
  }, [id]);

  if (error) return <div className="container-page py-10"><ErrorNote>{error}</ErrorNote></div>;
  if (!data || !input) return <PageSpinner />;

  const mode = data.status === "draft" ? "draft" : "publish";
  const errors = showErrors ? checkPropertyInput(input, mode).errors : {};
  const set = (patch: Partial<PropertyInput>) => setInput((i) => (i ? { ...i, ...patch } : i));
  const formProps = { input, set, errors, contactPhone: data.contactPhone };

  const save = async (publish = false) => {
    const check = checkPropertyInput(input, publish ? "publish" : mode).errors;
    const first = Object.values(check)[0];
    if (first) {
      setShowErrors(true);
      setTab(check.photos ? "photos" : ["deposit"].some((k) => k in check) ? "details" : "basics");
      return toast(first, "error");
    }
    setBusy(publish ? "publish" : "save");
    try {
      await api.updateProperty(id, input);
      if (publish) {
        await api.listingAction(id, "publish");
        router.push(`/my-listings/${id}/published`);
      } else {
        toast("Changes saved");
        router.push("/my-listings");
      }
    } catch (e) {
      toast(errorMessage(e), "error");
      setBusy(null);
    }
  };

  const remove = async () => {
    setBusy("delete");
    try {
      await api.deleteProperty(id);
      toast("Property deleted");
      router.push("/my-listings");
    } catch (e) {
      toast(errorMessage(e), "error");
      setBusy(null);
    }
  };

  return (
    <div className="mx-auto flex max-w-[760px] flex-col gap-6 px-4 pt-5 pb-32 sm:px-6 md:py-10">
      <PageHeader
        back="/my-listings"
        title={data.status === "draft" ? "Finish your listing" : "Edit property"}
        subtitle={`${input.title || "Untitled"} · ${input.locality || "No locality"}`}
        action={<StatusBadge status={data.status} />}
      />

      <Tabs value={tab} onValueChange={setTab} className="gap-6">
        <TabsList className="h-auto! w-full rounded-[14px] bg-surface p-1">
          {[
            ["basics", "Basics"],
            ["photos", `Photos (${input.photos.length})`],
            ["details", "More details"],
          ].map(([v, l]) => (
            <TabsTrigger key={v} value={v} className="h-10 rounded-[10px] text-[13px] font-semibold data-active:font-bold data-active:text-brand">
              {l}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="basics">
          <BasicsFields {...formProps} />
        </TabsContent>
        <TabsContent value="photos" className="flex flex-col gap-2">
          <PhotoUploader photos={input.photos} onChange={(photos) => set({ photos })} invalid={!!errors.photos} />
          <FieldError>{errors.photos}</FieldError>
        </TabsContent>
        <TabsContent value="details" className="flex flex-col gap-5">
          <p className="rounded-[14px] bg-surface px-3.5 py-3 text-[13px] text-muted-2">
            <b className="text-ink">
              {PROPERTY_TYPE_LABEL[input.type]} · {SHARING_LABEL[input.sharing]}
            </b>
            <br />
            Type and sharing are required — change them in Basics.
          </p>
          <DetailsFields {...formProps} />
        </TabsContent>
      </Tabs>

      <Button variant="text" className="self-start text-brand-dark" onClick={() => setConfirmDelete(true)}>
        <Trash2 aria-hidden />
        Delete property
      </Button>

      <div className="fixed inset-x-0 bottom-0 z-40 flex justify-end gap-3 border-t border-line bg-white px-5 pt-3.5 pb-6 md:static md:border-0 md:p-0">
        {data.status === "draft" ? (
          <>
            <Button variant="neutral" size="lg" loading={busy === "save"} onClick={() => save(false)}>
              Save draft
            </Button>
            <Button size="lg" className="flex-1 md:flex-none" loading={busy === "publish"} onClick={() => save(true)}>
              Publish property
            </Button>
          </>
        ) : (
          <Button size="lg" className="flex-1 md:flex-none" loading={busy === "save"} onClick={() => save(false)}>
            Save changes
          </Button>
        )}
      </div>

      <AppDialog open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Delete this property?">
        <div className="mt-3 flex flex-col gap-5">
          <p className="text-sm leading-relaxed text-muted-2">
            The listing, its photos and view history are removed for good. Ratings on it are no longer shown. To hide it for a while,
            pause it or mark it as rented instead.
          </p>
          <Button size="lg" block loading={busy === "delete"} onClick={remove}>
            Delete permanently
          </Button>
          <Button variant="neutral" block onClick={() => setConfirmDelete(false)}>
            Keep it
          </Button>
        </div>
      </AppDialog>
    </div>
  );
}

/** 19 · Edit property */
export default function EditPropertyPage() {
  const { id } = useParams<{ id: string }>();
  return <RequireOwner>{() => <EditProperty id={id} />}</RequireOwner>;
}
