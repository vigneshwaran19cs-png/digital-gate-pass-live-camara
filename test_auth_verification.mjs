const API_BASE = "http://127.0.0.1:5000/api";

async function testAuthFlow() {
  console.log("=== STARTING AUTHENTICATION INTEGRATION TESTS ===");

  // Test 1: First-Time Student Setup (Valid Student: 731225AU005 / KIRUBASANKAR P)
  console.log("\n[Test 1] First-Time Setup Check for Student (731225AU005)...");
  let res = await fetch(`${API_BASE}/auth/setup-check`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier: "731225AU005", role: "student" })
  });
  let json = await res.json();
  console.log("Setup Check Response:", json);
  if (!json.eligible) throw new Error("Student setup check failed");

  console.log("\n[Test 1b] First-Time Setup Create Password for Student...");
  res = await fetch(`${API_BASE}/auth/first-time-setup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      identifier: "731225AU005",
      password: "mySecretPassword123",
      role: "student"
    })
  });
  json = await res.json();
  console.log("Student Setup Response:", json);
  if (!json.success || !json.token) throw new Error("Student setup failed");

  // Test 2: Student Login with Register Number + New Password
  console.log("\n[Test 2] Student Login with Register Number + New Password...");
  res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      identifier: "731225AU005",
      password: "mySecretPassword123"
    })
  });
  json = await res.json();
  console.log("Student Login Response:", json.user?.name, "| Token present:", !!json.token);
  if (!json.token) throw new Error("Student login failed");

  // Test 3: First-Time Staff Setup (e.g. Warden)
  console.log("\n[Test 3] First-Time Staff Setup (warden_new@example.com)...");
  res = await fetch(`${API_BASE}/auth/first-time-setup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      identifier: "warden_new@example.com",
      email: "warden_new@example.com",
      password: "wardenPassWord123!",
      role: "warden",
      name: "Dr. A. Warden"
    })
  });
  json = await res.json();
  console.log("Staff Setup Response:", json);
  if (!json.success) throw new Error("Staff setup failed");

  // Test 4: Staff Login
  console.log("\n[Test 4] Staff Login (warden_new@example.com)...");
  res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      identifier: "warden_new@example.com",
      password: "wardenPassWord123!"
    })
  });
  json = await res.json();
  console.log("Staff Login Response:", json.user?.name, "| Role:", json.user?.role);
  if (!json.token) throw new Error("Staff login failed");

  // Test 5: Forgot Password Flow
  console.log("\n[Test 5] Request Forgot Password OTP for 731225AU005...");
  res = await fetch(`${API_BASE}/auth/forgot-password/request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier: "731225AU005" })
  });
  json = await res.json();
  console.log("Forgot Password Request Response:", json);
  const otp = json.otpPreview;
  if (!otp) throw new Error("OTP request failed");

  console.log("\n[Test 5b] Reset Password with OTP...");
  res = await fetch(`${API_BASE}/auth/forgot-password/reset`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      identifier: "731225AU005",
      otp: otp,
      newPassword: "brandNewResetPassword456"
    })
  });
  json = await res.json();
  console.log("Reset Password Response:", json);
  if (!json.success) throw new Error("Reset password failed");

  console.log("\n[Test 5c] Login with Restored New Password...");
  res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      identifier: "731225AU005",
      password: "brandNewResetPassword456"
    })
  });
  json = await res.json();
  console.log("Re-login Response:", json.user?.name, "| Token present:", !!json.token);
  if (!json.token) throw new Error("Re-login after reset failed");

  // Test 6: Invalid Credentials Validation
  console.log("\n[Test 6] Testing Invalid Password...");
  res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      identifier: "731225AU005",
      password: "wrongPassword!!!"
    })
  });
  console.log("Invalid Password Status:", res.status);
  if (res.status !== 401) throw new Error("Should have returned 401 Unauthorized");

  // Test 7: Non-existent Register Number Validation
  console.log("\n[Test 7] Testing Non-existent Student Register Number...");
  res = await fetch(`${API_BASE}/auth/setup-check`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier: "INVALID99999", role: "student" })
  });
  json = await res.json();
  console.log("Non-existent Register Number Response:", json);
  if (res.status !== 400) throw new Error("Should have blocked invalid register number");

  console.log("\n=================================================");
  console.log("🎉 ALL AUTHENTICATION INTEGRATION TESTS PASSED!");
  console.log("=================================================");
}

testAuthFlow().catch((e) => {
  console.error("Test execution failed:", e);
  process.exit(1);
});
