const origin = process.env.NEXORA_TEST_ORIGIN;
if (!origin) throw Error("NEXORA_TEST_ORIGIN required");
for (const path of ["/login", "/register", "/verify-email"]) {
  const response = await fetch(new URL(path, origin), { redirect: "manual" });
  if (response.status !== 200) throw Error(path + ": HTTP " + response.status);
  if (path === "/verify-email" && !(await response.text()).includes("Check your inbox."))
    throw Error("Expected Nexora verification screen missing");
  console.log("PASS", path);
}
