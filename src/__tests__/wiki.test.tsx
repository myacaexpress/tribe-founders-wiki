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
    render(<WikiPage />);
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

  it("renders all four wiki sections as headings", () => {
    // These appear both in TOC and as section headings, so use getAllByText
    expect(screen.getAllByText("Founders").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("Operations").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("Financial Model").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("Ideas").length).toBeGreaterThanOrEqual(2);
  });

  it("renders founder wiki links", () => {
    const shawnLink = screen.getByText("Shawn").closest("a");
    expect(shawnLink).toHaveAttribute("href", "/wiki/founders/shawn");

    const markLink = screen.getByText("Mark").closest("a");
    expect(markLink).toHaveAttribute("href", "/wiki/founders/mark");

    const michaelLink = screen.getByText("Michael").closest("a");
    expect(michaelLink).toHaveAttribute("href", "/wiki/founders/michael");
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
