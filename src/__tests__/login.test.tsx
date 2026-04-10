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

  it("renders FOUNDERS — FLORIDA subtitle", () => {
    expect(screen.getByText("FOUNDERS — FLORIDA")).toBeInTheDocument();
  });

  it("renders password input", () => {
    const input = screen.getByLabelText("Password");
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("type", "password");
  });

  it("renders Enter button", () => {
    expect(screen.getByText("Enter")).toBeInTheDocument();
  });

  it("password input has placeholder text", () => {
    expect(screen.getByPlaceholderText("Enter password")).toBeInTheDocument();
  });
});
