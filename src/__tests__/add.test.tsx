import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AddPage from "../app/add/page";

// Mock next/navigation
const mockBack = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    back: mockBack,
    push: jest.fn(),
    refresh: jest.fn(),
  }),
}));

// Mock next/link
jest.mock("next/link", () => {
  return function MockLink({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  };
});

describe("Add Something page", () => {
  beforeEach(() => {
    mockBack.mockClear();
    render(<AddPage />);
  });

  it('renders "What\'s on your mind?" heading', () => {
    expect(screen.getByText("What's on your mind?")).toBeInTheDocument();
  });

  it("renders text area with placeholder", () => {
    expect(
      screen.getByPlaceholderText(
        "Write your thought, idea, decision, or update..."
      )
    ).toBeInTheDocument();
  });

  it("renders three destination buttons", () => {
    expect(screen.getByText("My Lane")).toBeInTheDocument();
    expect(screen.getByText("My Brainstorm")).toBeInTheDocument();
    expect(screen.getByText("Watch Email")).toBeInTheDocument();
  });

  it("Watch Email button is disabled with Phase 2 badge", () => {
    const watchBtn = screen.getByText("Watch Email").closest("button");
    expect(watchBtn).toBeDisabled();
    expect(screen.getByText("Phase 2")).toBeInTheDocument();
  });

  it("My Lane is pre-selected (has active styling)", () => {
    const laneBtn = screen.getByText("My Lane").closest("button");
    expect(laneBtn?.className).toContain("bg-[#2b8a88]");
  });

  it("can switch destination to Brainstorm", async () => {
    const user = userEvent.setup();
    await user.click(screen.getByText("My Brainstorm"));
    const brainstormBtn = screen.getByText("My Brainstorm").closest("button");
    expect(brainstormBtn?.className).toContain("bg-[#e85d4e]");
  });

  it("Save button is disabled when textarea is empty", () => {
    const saveBtn = screen.getByText("Save");
    expect(saveBtn).toBeDisabled();
  });

  it("Save button enables when text is entered", async () => {
    const user = userEvent.setup();
    const textarea = screen.getByPlaceholderText(
      "Write your thought, idea, decision, or update..."
    );
    await user.type(textarea, "Test thought");
    const saveBtn = screen.getByText("Save");
    expect(saveBtn).not.toBeDisabled();
  });

  it("renders Cancel link back to home", () => {
    const cancelLink = screen.getByText("Cancel").closest("a");
    expect(cancelLink).toHaveAttribute("href", "/");
  });

  it("renders back link", () => {
    const backLink = screen.getByText("← Back");
    expect(backLink.closest("a")).toHaveAttribute("href", "/");
  });
});
