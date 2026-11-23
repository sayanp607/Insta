import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Button } from "../../components/ui/button.jsx";

describe("UI Component: Button unit tests", () => {
  it("should render button with child text", () => {
    render(<Button>Click Me</Button>);
    expect(screen.getByRole("button", { name: /click me/i })).toBeInTheDocument();
  });

  it("should trigger onClick handler when clicked", () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Submit</Button>);

    const btn = screen.getByRole("button", { name: /submit/i });
    fireEvent.click(btn);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("should be disabled when disabled prop is provided", () => {
    const handleClick = vi.fn();
    render(<Button disabled onClick={handleClick}>Disabled Button</Button>);

    const btn = screen.getByRole("button", { name: /disabled button/i });
    expect(btn).toBeDisabled();

    fireEvent.click(btn);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it("should apply variant classes correctly", () => {
    render(<Button variant="destructive">Delete</Button>);
    const btn = screen.getByRole("button", { name: /delete/i });
    expect(btn.className).toContain("bg-red-500");
  });
});
