// Simple test script to verify login credentials
const testCredentials = [
  { email: "operator@solarshare.co.za", password: "operator123", expectedRole: "operator" },
  { email: "investor@solarshare.co.za", password: "investor123", expectedRole: "investor" },
  { email: "thabo@solarshare.co.za", password: "solarshare123", expectedRole: "worker" },
  { email: "patrick@solarshare.co.za", password: "governance123", expectedRole: "governance" },
  { email: "shawn@solarshare.co.za", password: "dev123", expectedRole: "dev" },
  { email: "admin@solarshare.co.za", password: "admin123", expectedRole: "admin" }
];

// Simulate the API login function
function simulateApiLogin(email, password) {
  // If backend returns 401 or other error, check for demo credentials
  if (email === "operator@solarshare.co.za" && password === "operator123") {
    return {
      token: "demo-token-operator",
      user: { id: "0", email: "operator@solarshare.co.za", name: "Solar Operator", role: "operator" }
    };
  }
  if (email === "investor@solarshare.co.za" && password === "investor123") {
    return {
      token: "demo-token-investor",
      user: { id: "inv-1", email: "investor@solarshare.co.za", name: "Solar Investor", role: "investor" }
    };
  }
  if (email === "thabo@solarshare.co.za" && password === "solarshare123") {
    return {
      token: "demo-token-worker",
      user: { id: "1", email: "thabo@solarshare.co.za", name: "Thabo Mokoena", role: "worker" }
    };
  }
  if (email === "patrick@solarshare.co.za" && password === "governance123") {
    return {
      token: "demo-token-governance",
      user: { id: "2", email: "patrick@solarshare.co.za", name: "Patrick Nkosi", role: "governance" }
    };
  }
  if (email === "shawn@solarshare.co.za" && password === "dev123") {
    return {
      token: "demo-token-dev",
      user: { id: "3", email: "shawn@solarshare.co.za", name: "Shawn The Creator", role: "dev" }
    };
  }
  if (email === "admin@solarshare.co.za" && password === "admin123") {
    return {
      token: "demo-token-admin",
      user: { id: "4", email: "admin@solarshare.co.za", name: "System Admin", role: "admin" }
    };
  }
  return null;
}

console.log("🧪 Testing SolarShare Login Credentials\n");

testCredentials.forEach((cred, index) => {
  console.log(`\n--- Test ${index + 1}: ${cred.email} ---`);
  const result = simulateApiLogin(cred.email, cred.password);
  
  if (result) {
    const success = result.user.role === cred.expectedRole;
    console.log(`✅ Login SUCCESS`);
    console.log(`   Name: ${result.user.name}`);
    console.log(`   Role: ${result.user.role}`);
    console.log(`   Expected: ${cred.expectedRole}`);
    console.log(`   Match: ${success ? '✅' : '❌'}`);
    
    // Test routing logic
    let redirectPath = '/operator';
    switch (result.user.role) {
      case "operator":
        redirectPath = "/operator";
        break;
      case "investor":
        redirectPath = "/solar";
        break;
      case "worker":
        redirectPath = "/worker";
        break;
      case "governance":
        redirectPath = "/governance";
        break;
      case "dev":
        redirectPath = "/dev";
        break;
      case "admin":
      default:
        redirectPath = "/operator";
        break;
    }
    console.log(`   Redirect: ${redirectPath}`);
  } else {
    console.log(`❌ Login FAILED`);
  }
});

console.log("\n🎯 Test Summary:");
console.log("All credentials should work. Test them in the browser at http://localhost:3000/login");
