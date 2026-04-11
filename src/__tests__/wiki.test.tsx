import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import WikiPage from "../app/wiki/page";

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

describe("Wiki page", () => {
  beforeEach(() => {
    // Mock fetch for the meetings list API call
    global.fetch = jest.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve({ meetings: [] }),
      })
    ) as jest.Mock;
    render(<WikiPage />);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("renders the Wiki heading", () => {
    expect(screen.getByText("Wiki")).toBeInTheDocument();
  });

  it("renders back link to home", () => {
    const backLink = screen.getByText("← Back");
    expect(backLink.closest("a")).toHaveAttribute("href", "/");
  });

  it("renders search input", () => {
    expect(screen.getByPlaceholderText("Search wiki...")).toBeInTheDocument();
  });

  it("renders At a Glance section", () => {
    expect(screen.getByText("At a Glance")).toBeInTheDocument();
    expect(
      screen.getByText(/Florida Medicare distribution agency/)
    ).toBeInTheDocument();
  });

  it("renders all wiki sections as headings", () => {
    // These appear both in TOC and as section headings, so use getAllByText
    expect(screen.getAllByText("Founders").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("Active Partners").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("Operations & Licensing").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("Financial Model").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("Recent Decisions").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("Ideas & Brainstorms").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("Tracking").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("Reference").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("Archived").length).toBeGreaterThanOrEqual(2);
  });

  it("renders founder wiki links", () => {
    const shawnLink = screen.getByText("Shawn").closest("a");
    expect(shawnLink).toHaveAttribute("href", "/wiki/people/shawn");

    const markLink = screen.getByText("Mark").closest("a");
    expect(markLink).toHaveAttribute("href", "/wiki/people/mark");

    const michaelLink = screen.getByText("Michael").closest("a");
    expect(michaelLink).toHaveAttribute("href", "/wiki/people/michael");
  });

  it("renders tracking pages", () => {
    expect(screen.getByText("Tasks")).toBeInTheDocument();
    expect(screen.getByText("Radar")).toBeInTheDocument();
    expect(screen.getByText("Reimbursements")).toBeInTheDocument();
    expect(screen.getByText("Expenses")).toBeInTheDocument();
    expect(screen.getByText("Parked Intentions")).toBeInTheDocument();
  });

  it("renders decision and reference sections", () => {
    expect(screen.getByText("Group Table")).toBeInTheDocument();
    expect(screen.getByText("State of the Business")).toBeInTheDocument();
    expect(screen.getByText("Tools")).toBeInTheDocument();
  });

  it("filters results when searching", async () => {
    const user = userEvent.setup();
    const searchInput = screen.getByPlaceholderText("Search wiki...");
    await user.type(searchInput, "shawn");

    // Shawn should still be visible
    expect(screen.getByText("Shawn")).toBeInTheDocument();

    // Other items should be filtered out
    expect(screen.queryByText("Projections")).not.toBeInTheDocument();
  });

  it("shows no results message for gibberish search", async () => {
    const user = userEvent.setup();
    const searchInput = screen.getByPlaceholderText("Search wiki...");
    await user.type(searchInput, "zzzznothing");

    expect(
      screen.getByText(/No wiki pages match/)
    ).toBeInTheDocument();
  });

  it("renders Contents TOC", () => {
    expect(screen.getByText("Contents")).toBeInTheDocument();
  });
});
