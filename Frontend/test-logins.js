// Simple test script to verify login credentials
const testCredentials = [
  { email: "thabo@gridguard.co.za", password: "gridguard123", expectedRole: "worker" },
  { email: "patrick@gridguard.co.za", password: "governance123", expectedRole: "governance" },
  { email: "shawn@gridguard.co.za", password: "dev123", expectedRole: "dev" },
  { email: "admin@gridguard.co.za", password: "admin123", expectedRole: "admin" }
];

// Simulate the API login function
function simulateApiLogin(email, password) {
  // If backend returns 401 or other error, check for demo credentials
  if (email === "thabo@gridguard.co.za" && password === "gridguard123") {
    return {
      token: "demo-token-admin",
      user: { id: "1", email: "thabo@gridguard.co.za", name: "Thabo Mokoena", role: "worker" }
    };
  }
  if (email === "patrick@gridguard.co.za" && password === "governance123") {
    return {
      token: "demo-token-governance",
      user: { id: "2", email: "patrick@gridguard.co.za", name: "Patrick Nkosi", role: "governance" }
    };
  }
  if (email === "shawn@gridguard.co.za" && password === "dev123") {
    return {
      token: "demo-token-dev",
      user: { id: "3", email: "shawn@gridguard.co.za", name: "Shawn The Creator", role: "dev" }
    };
  }
  if (email === "admin@gridguard.co.za" && password === "admin123") {
    return {
      token: "demo-token-admin",
      user: { id: "4", email: "admin@gridguard.co.za", name: "System Admin", role: "admin" }
    };
  }
  return null;
}

console.log("🧪 Testing GridGuard AI Login Credentials\n");

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
    let redirectPath = '/admin';
    switch (result.user.role) {
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
        redirectPath = "/admin";
        break;
    }
    console.log(`   Redirect: ${redirectPath}`);
  } else {
    console.log(`❌ Login FAILED`);
  }
});

console.log("\n🎯 Test Summary:");
console.log("All credentials should work. Test them in the browser at http://localhost:3000/login");
console.log("\n📋 Expected Routes:");
console.log("Worker → http://localhost:3000/worker");
console.log("Governance → http://localhost:3000/governance"); 
console.log("Developer → http://localhost:3000/dev");
console.log("Admin → http://localhost:3000/admin");
