import { render, screen } from "@testing-library/react";
import LoginPage from "../app/login/page";

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
  }),
}));

describe("Login page", () => {
  beforeEach(() => {
    render(<LoginPage />);
  });

  it("renders the TriBe logo", () => {
    expect(screen.getByText("Tri")).toBeInTheDocument();
    expect(screen.getByText("Be")).toBeInTheDocument();
  });

  it("renders Trifecta Founders subtitle", () => {
    expect(screen.getByText("Trifecta Founders")).toBeInTheDocument();
  });

  it("renders password input", () => {
    const input = screen.getByPlaceholderText("Enter password");
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("type", "password");
  });

  it("renders Enter button", () => {
    expect(screen.getByText("Enter")).toBeInTheDocument();
  });

  it("renders Password label", () => {
    expect(screen.getByText("Password")).toBeInTheDocument();
  });
});
