"use client";

import { LoaderCircle, Plus } from "lucide-react";
import { type FormEvent, useCallback, useState } from "react";

import { PaginatedCombobox } from "@/components/shared/PaginatedCombobox";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { ApiError } from "@/lib/api/errors";
import { cn } from "@/lib/utils/cn";

import { useInfiniteAgencies, useQuickCreateAgency } from "./queries";

export type AgencyOption = {
  displayName: string;
  id: number;
  status: "active" | "inactive";
};

function uniqueOptions(options: AgencyOption[]) {
  return [...new Map(options.map((option) => [option.id, option])).values()];
}

export function AgencyCombobox({
  ariaDescribedBy,
  canCreate = true,
  id,
  isInvalid,
  onChange,
  value,
}: {
  ariaDescribedBy?: string;
  canCreate?: boolean;
  id: string;
  isInvalid?: boolean;
  onChange: (option: AgencyOption) => void;
  value?: AgencyOption;
}) {
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [createError, setCreateError] = useState<string>();
  const query = useInfiniteAgencies(search);
  const createMutation = useQuickCreateAgency();
  const options = uniqueOptions(
    (query.data?.pages.flatMap((page) => page.data) ?? []).map((agency) => ({
      id: agency.id,
      displayName: agency.display_name,
      status: agency.status,
    })),
  );
  const changeSearch = useCallback((nextSearch: string) => {
    setSearch(nextSearch);
  }, []);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreateError(undefined);
    const name = displayName.trim();
    if (!name) {
      setCreateError("Enter an agency display name.");
      return;
    }
    try {
      const agency = await createMutation.mutateAsync({ display_name: name });
      onChange({
        id: agency.id,
        displayName: agency.display_name,
        status: agency.status,
      });
      setDisplayName("");
      setIsCreateOpen(false);
    } catch (error) {
      setCreateError(
        error instanceof ApiError
          ? (error.fieldErrors.display_name ?? error.message)
          : "The agency could not be created. Please try again.",
      );
    }
  }

  return (
    <>
      <PaginatedCombobox
        action={
          canCreate ? (
            <Button
              className="w-full justify-start"
              onClick={() => setIsCreateOpen(true)}
              size="sm"
              type="button"
              variant="ghost"
            >
              <Plus aria-hidden className="size-4" /> Add agency
            </Button>
          ) : undefined
        }
        ariaDescribedBy={ariaDescribedBy}
        errorMessage={
          query.isError ? "Agencies could not be loaded." : undefined
        }
        getKey={(option) => String(option.id)}
        getLabel={(option) => `#${option.id} ${option.displayName}`}
        hasNextPage={query.hasNextPage}
        id={id}
        isFetchingNextPage={query.isFetchingNextPage}
        isInvalid={isInvalid}
        isLoading={query.isPending}
        loadNextPage={() => void query.fetchNextPage()}
        mode="single"
        onChange={onChange}
        onRetry={() => void query.refetch()}
        onSearchChange={changeSearch}
        options={options}
        placeholder="Select an agency"
        renderOption={(option) => (
          <span
            className={cn(
              "flex items-center justify-between gap-3",
              option.status === "inactive" && "text-muted-foreground",
            )}
          >
            <span className="truncate">
              <span className="font-mono text-xs">#{option.id}</span>{" "}
              {option.displayName}
            </span>
            <Badge tone={option.status === "active" ? "success" : "neutral"}>
              {option.status === "active" ? "Active" : "Inactive"}
            </Badge>
          </span>
        )}
        searchPlaceholder="Search agency name"
        value={value}
      />
      {canCreate && (
        <Dialog
          description="Create a minimal active agency now. Its complete profile can be updated from Agencies."
          footer={
            <>
              <Button
                onClick={() => setIsCreateOpen(false)}
                type="button"
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                disabled={createMutation.isPending}
                form="quick-create-agency"
                type="submit"
              >
                {createMutation.isPending && (
                  <LoaderCircle aria-hidden className="size-4 animate-spin" />
                )}
                {createMutation.isPending ? "Creating..." : "Create agency"}
              </Button>
            </>
          }
          isOpen={isCreateOpen}
          onClose={() => {
            if (!createMutation.isPending) setIsCreateOpen(false);
          }}
          title="Add agency"
        >
          <form id="quick-create-agency" onSubmit={create}>
            <FormField
              error={createError}
              id="quick-agency-name"
              label="Display name"
              required
            >
              <Input
                autoComplete="organization"
                autoFocus
                id="quick-agency-name"
                maxLength={255}
                onChange={(event) => setDisplayName(event.target.value)}
                value={displayName}
              />
            </FormField>
          </form>
        </Dialog>
      )}
    </>
  );
}
