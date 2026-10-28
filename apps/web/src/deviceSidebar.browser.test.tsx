import { createMemoryHistory } from "@tanstack/react-router";
import { DEFAULT_CLIENT_SETTINGS } from "@t3tools/contracts/settings";
import type * as Context from "effect/Context";
import { expect, it, vi } from "vite-plus/test";
import { page } from "vite-plus/test/browser";
import "./index.css";
import { AppRoot } from "./AppRoot";
import { __setClientSettingsForTests, updateClientSettings } from "./hooks/useSettings";
import { getRouter } from "./router";
import {
  ENVIRONMENT_ID,
  installFakeEnvironment,
  threadWithHistory,
  type FakeDriver,
} from "../test/fakeEnvironment";
import { act, render } from "../test/render";

vi.mock("../../../packages/client-runtime/src/connection/driver.ts", async (importOriginal) => {
  const [actual, { fakeDriver }, Layer] = await Promise.all([
    importOriginal<{ readonly ConnectionDriver: Context.Key<unknown, FakeDriver> }>(),
    import("../test/fakeEnvironment"),
    import("effect/Layer"),
  ]);
  return { ...actual, layer: Layer.succeed(actual.ConnectionDriver, fakeDriver) };
});
vi.mock(import("./rpc/requestLatencyState"), async (original) => ({
  ...(await original()),
  trackRpcRequestSent: () => {},
}));

it("shows device identity without renaming the project or replacing its branch", async () => {
  const thread = threadWithHistory("device-check", 1);
  using _environment = installFakeEnvironment([thread]);
  await page.viewport(1280, 850);
  __setClientSettingsForTests({
    ...DEFAULT_CLIENT_SETTINGS,
    onboardingCompletedAt: "2026-01-01T00:00:00.000Z",
  });
  const router = getRouter(
    createMemoryHistory({ initialEntries: [`/${ENVIRONMENT_ID}/${thread.id}`] }),
  );
  await router.load();
  const container = document.createElement("div");
  container.style.cssText = "height: 850px; width: 1280px;";
  // AppRoot owns the real router, as the production entry point does.
  await using screen = await render(<AppRoot router={router} />, { container, router: false });
  await expect.element(screen.getByText("Thread device-check").first()).toBeVisible();
  document
    .querySelector('[data-sidebar="sidebar"]')!
    .setAttribute("data-testid", "device-test-sidebar");
  const sidebar = page.getByTestId("device-test-sidebar");
  await sidebar.screenshot({ path: "../../../.t3/device-before.png" });
  await act(() =>
    updateClientSettings({ sidebarGroupByDevice: true, sidebarShowDeviceNames: true }),
  );
  await expect.element(sidebar.getByText("Render scenarios").first()).toBeVisible();
  await expect.element(sidebar.getByText("main", { exact: true }).first()).toBeVisible();
  await sidebar.screenshot({ path: "../../../.t3/device-after.png" });
  await act(() =>
    updateClientSettings({ sidebarGroupByDevice: false, sidebarShowDeviceNames: false }),
  );
  await expect
    .element(sidebar.getByText("Render scenarios", { exact: true }))
    .not.toBeInTheDocument();
});
