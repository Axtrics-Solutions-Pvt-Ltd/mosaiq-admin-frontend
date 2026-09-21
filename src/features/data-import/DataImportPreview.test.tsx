import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

import { DataImportPreview } from "./DataImportPreview";

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function () {
    this.open = false;
  };
});
afterEach(cleanup);

describe("DataImportPreview", () => {
  it("keeps invalid sample validation from reaching confirmation", async () => {
    const user = userEvent.setup();
    render(<DataImportPreview />);

    await user.click(
      screen.getByRole("button", { name: /show sample validation/i }),
    );
    await user.selectOptions(
      screen.getByLabelText("Validation example"),
      "invalid",
    );

    expect(screen.getByText("Import blocked")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /review confirmation/i }),
    ).toBeDisabled();
    expect(screen.getAllByText("Required column is missing.")).toHaveLength(2);
  });

  it("shows a labelled completion preview after the replacement consequence", async () => {
    const user = userEvent.setup();
    render(<DataImportPreview />);

    await user.click(
      screen.getByRole("button", { name: /show sample validation/i }),
    );
    await user.click(screen.getByRole("radio", { name: /replace dataset/i }));
    expect(
      screen.getByText(/existing dataset rows would be replaced/i),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /review confirmation/i }),
    );
    const dialog = screen.getByRole("dialog");
    expect(
      within(dialog).getByText(/no data will change/i),
    ).toBeInTheDocument();
    await user.click(
      within(dialog).getByRole("button", { name: /show sample completion/i }),
    );

    expect(
      screen.getByRole("heading", { name: "Completion preview" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/no upload, import, or activation occurred/i),
    ).toBeInTheDocument();
  });
});
