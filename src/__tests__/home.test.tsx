import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import HomeClient from "../app/components/HomeClient";
import {
  radarItems,
  groupTableItems,
  laneItems,
  taskItems,
  toolItems,
  businessStateSentence,
} from "../lib/data";

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

const defaultProps = {
  radarItems,
  groupTableItems,
  laneItems,
  taskItems,
  toolItems,
  businessStateSentence,
};

describe("Home page", () => {
  beforeEach(() => {
    render(<HomeClient {...defaultProps} />);
  });

  it("renders the TriBe logo", () => {
    expect(screen.getByText("Tri")).toBeInTheDocument();
    expect(screen.getByText("Be")).toBeInTheDocument();
  });

  it("renders the subtitle", () => {
    expect(screen.getByText("Trifecta Founders")).toBeInTheDocument();
  });

  it("renders the business state sentence", () => {
    expect(
      screen.getByText(/Three founders.*Florida Medicare/)
    ).toBeInTheDocument();
  });

  it("renders Meet button linking to meeting page", () => {
    const btns = screen.getAllByText("Meet");
    const meetLink = btns.find(
      (el) => el.closest("a")?.getAttribute("href") === "/meeting"
    );
    expect(meetLink).toBeTruthy();
  });

  it("renders Radar section with items", () => {
    expect(screen.getByText("Radar")).toBeInTheDocument();
    expect(screen.getByText("Florida insurance license")).toBeInTheDocument();
    expect(screen.getByText("Humana contract negotiation")).toBeInTheDocument();
  });

  it("renders Group Table section", () => {
    expect(screen.getByText("Group Table")).toBeInTheDocument();
    expect(
      screen.getByText("Confirm Pod 1 launch date (June 15?)")
    ).toBeInTheDocument();
  });

  it("renders all three founder lanes", () => {
    expect(screen.getByText("Lanes")).toBeInTheDocument();
    expect(screen.getAllByText("Shawn").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Mark").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Michael").length).toBeGreaterThanOrEqual(1);
  });

  it("renders Tasks section with To Do / Done tabs", () => {
    expect(screen.getByText("Tasks")).toBeInTheDocument();
    expect(screen.getByText(/To Do/)).toBeInTheDocument();
    expect(screen.getByText(/Done/)).toBeInTheDocument();
  });

  it("shows todo tasks by default", () => {
    expect(screen.getByText("Review carrier applications")).toBeInTheDocument();
    expect(
      screen.getByText("Finalize LLC operating agreement")
    ).toBeInTheDocument();
  });

  it("switches to Done tab on click", async () => {
    const user = userEvent.setup();
    const doneTab = screen.getByText(/Done/);
    await user.click(doneTab);
    expect(screen.getByText("Setup Google Workspace domain")).toBeInTheDocument();
  });

  it("renders Full Wiki link", () => {
    const wikiLink = screen.getByText("Full Wiki");
    expect(wikiLink).toBeInTheDocument();
    expect(wikiLink.closest("a")).toHaveAttribute("href", "/wiki");
  });

  it("renders This Week timeline", () => {
    expect(screen.getByText("This Week")).toBeInTheDocument();
    expect(
      screen.getByText(/Carrier meeting \(Humana\)/)
    ).toBeInTheDocument();
  });

  it("renders the + FAB linking to /add", () => {
    const fab = screen.getByText("+");
    expect(fab.closest("a")).toHaveAttribute("href", "/add");
  });
});
