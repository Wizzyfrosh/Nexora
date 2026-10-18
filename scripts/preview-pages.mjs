const origin = process.env.NEXORA_TEST_ORIGIN;
if (!origin) throw Error("NEXORA_TEST_ORIGIN required");
for (const path of ["/login", "/register", "/verify-email"]) {
  const response = await fetch(new URL(path, origin));
  if (!response.ok) throw Error(path + " returned " + response.status);
  console.log("PASS", path);
}
