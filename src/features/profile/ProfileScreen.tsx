"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { ConfirmationDialog } from "@/components/shared/ConfirmationDialog";
import { PageStack } from "@/components/shared/LayoutPatterns";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatePanel } from "@/components/shared/StatePanel";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { AuthAlert } from "@/features/auth/AuthAlert";
import type { CurrentUser } from "@/features/auth/contracts";
import { authKeys, useCurrentUser } from "@/features/auth/queries";
import { useUpdateAgencyUser } from "@/features/users/queries";
import { roleLabels } from "@/features/users/role-labels";
import { ApiError } from "@/lib/api/errors";

import { ChangePasswordForm } from "./ChangePasswordForm";
import { type EditProfilePayload, editProfileSchema } from "./contracts";

function roleLabel(user: CurrentUser) {
  if (user.platformRoleCode === "SUPER_ADMIN") return "Super Admin";
  const role = user.membership?.roleCode;
  return role && Object.hasOwn(roleLabels, role)
    ? roleLabels[role as keyof typeof roleLabels]
    : "Account";
}

function NameForm({
  user,
}: {
  user: CurrentUser & { membership: NonNullable<CurrentUser["membership"]> };
}) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const mutation = useUpdateAgencyUser();
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isDirty },
  } = useForm<EditProfilePayload>({
    resolver: zodResolver(editProfileSchema),
    defaultValues: { name: user.name },
  });

  useEffect(() => {
    if (!isDirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);

  useEffect(() => {
    if (!isDirty) return;
    const guardNavigation = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        !(event.target instanceof Element)
      )
        return;
      const link = event.target.closest<HTMLAnchorElement>("a[href]");
      if (!link || link.hasAttribute("download") || link.getAttribute("target"))
        return;
      const destination = new URL(link.href, window.location.href);
      if (
        destination.origin !== window.location.origin ||
        (destination.pathname === window.location.pathname &&
          destination.search === window.location.search)
      )
        return;
      event.preventDefault();
      event.stopPropagation();
      setPendingHref(
        destination.pathname + destination.search + destination.hash,
      );
    };
    document.addEventListener("click", guardNavigation, true);
    return () => document.removeEventListener("click", guardNavigation, true);
  }, [isDirty]);

  const onSubmit = handleSubmit(async (values) => {
    setIsSuccess(false);
    try {
      const record = await mutation.mutateAsync({
        agencyId: user.membership.agencyId,
        userId: user.id,
        payload: { name: values.name },
      });
      queryClient.setQueryData<CurrentUser>(authKeys.me(), (current) =>
        current ? { ...current, name: record.name } : current,
      );
      reset({ name: record.name });
      setIsSuccess(true);
    } catch (error) {
      if (error instanceof ApiError && error.fieldErrors.name) {
        setError("name", { message: error.fieldErrors.name });
      }
    }
  });

  return (
    <>
      <form className="max-w-lg space-y-5" noValidate onSubmit={onSubmit}>
        {isSuccess && (
          <AuthAlert tone="success">Your name has been updated.</AuthAlert>
        )}
        {mutation.isError && !isSuccess && (
          <AuthAlert tone="danger">
            {mutation.error instanceof ApiError
              ? mutation.error.message
              : "We could not update your name. Please try again."}
          </AuthAlert>
        )}
        <FormField
          error={errors.name?.message}
          id="profile-name"
          label="Name"
          required
        >
          <Input
            aria-describedby={errors.name ? "profile-name-error" : undefined}
            aria-invalid={Boolean(errors.name)}
            autoComplete="name"
            id="profile-name"
            {...register("name")}
          />
        </FormField>
        <Button disabled={!isDirty || mutation.isPending} type="submit">
          {mutation.isPending && (
            <LoaderCircle aria-hidden className="size-4 animate-spin" />
          )}
          {mutation.isPending ? "Saving..." : "Save name"}
        </Button>
      </form>
      <ConfirmationDialog
        body="Your unsaved name change will be discarded."
        confirmLabel="Discard changes"
        description="Your name has not been saved."
        isOpen={pendingHref !== null}
        onCancel={() => setPendingHref(null)}
        onConfirm={() => {
          if (!pendingHref) return;
          const destination = pendingHref;
          setPendingHref(null);
          router.push(destination);
        }}
        title="Discard changes?"
      />
    </>
  );
}

export function ProfileScreen() {
  const currentUser = useCurrentUser();
  if (currentUser.isPending) {
    return (
      <StatePanel
        kind="unavailable"
        title="Loading profile"
        description="Loading your account details."
      />
    );
  }
  if (!currentUser.data) {
    return (
      <StatePanel
        kind="error"
        title="Profile unavailable"
        description="We could not load your account details."
      />
    );
  }
  const user = currentUser.data;
  return (
    <PageStack className="mx-auto max-w-4xl">
      <PageHeader
        title="Your profile"
        description="Manage your account details and password."
      />
      <Card>
        <CardHeader>
          <CardTitle>Account details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground text-sm">Email</dt>
              <dd className="text-strong mt-1 font-medium break-all">
                {user.email}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-sm">Role</dt>
              <dd className="text-strong mt-1 font-medium">
                {roleLabel(user)}
              </dd>
            </div>
          </dl>
          {user.membership ? (
            <NameForm
              key={user.id}
              user={{ ...user, membership: user.membership }}
            />
          ) : (
            <div className="space-y-2">
              <div>
                <span className="text-muted-foreground text-sm">Name</span>
                <p className="text-strong font-medium">{user.name}</p>
              </div>
              <p className="text-muted-foreground text-sm">
                Super Admin profile editing is unavailable because the API has
                no agency-independent self-edit endpoint.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
      <Card id="change-password" className="scroll-mt-20">
        <CardHeader>
          <CardTitle>Change password</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="text-muted-foreground text-sm">
            Changing your password signs out your other sessions and devices.
            This session stays active.
          </p>
          <ChangePasswordForm />
        </CardContent>
      </Card>
    </PageStack>
  );
}
