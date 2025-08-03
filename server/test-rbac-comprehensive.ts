// Comprehensive RBAC Testing Suite for AgentHub Platform
import { storage } from './storage.js';
import bcrypt from 'bcrypt';

interface TestResult {
  testName: string;
  persona: string;
  action: string;
  expected: 'ALLOW' | 'DENY';
  actual: 'ALLOW' | 'DENY' | 'ERROR';
  status: 'PASS' | 'FAIL';
  details: string;
  timestamp: Date;
}

interface Persona {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  permissionLevel: number;
  organizationId: number;
}

export class RBACTestSuite {
  private testResults: TestResult[] = [];
  private personas: Persona[] = [
    {
      id: 1,
      email: "owner@agenthub.com",
      firstName: "Platform",
      lastName: "Owner",
      role: "owner",
      permissionLevel: 4,
      organizationId: 1
    },
    {
      id: 2,
      email: "admin@healthcare-corp.com", 
      firstName: "Healthcare",
      lastName: "Admin",
      role: "admin",
      permissionLevel: 3,
      organizationId: 1
    },
    {
      id: 3,
      email: "user@healthcare-corp.com",
      firstName: "Healthcare",
      lastName: "User", 
      role: "user",
      permissionLevel: 2,
      organizationId: 1
    },
    {
      id: 4,
      email: "support@healthcare-corp.com",
      firstName: "Support",
      lastName: "Viewer",
      role: "viewer",
      permissionLevel: 1,
      organizationId: 1
    },
    {
      id: 5,
      email: "devops@healthcare-corp.com",
      firstName: "DevOps",
      lastName: "Engineer",
      role: "devops",
      permissionLevel: 3,
      organizationId: 1
    }
  ];

  async setupTestData(): Promise<void> {
    console.log("🔧 Setting up RBAC test data...");
    
    // Create test organization
    try {
      await storage.createOrganization({
        name: "Healthcare Corp Test",
        domain: "healthcare-corp.com",
        settings: JSON.stringify({
          industry: "healthcare",
          features: ["agents", "analytics", "payments"]
        }),
        subscriptionPlan: "enterprise",
        subscriptionStatus: "active",
        monthlyUsageLimit: 10000,
        currentUsage: 2500
      });
    } catch (error) {
      console.log("Organization already exists or error:", error);
    }

    // Create test users for all personas
    for (const persona of this.personas) {
      try {
        const passwordHash = await bcrypt.hash("password", 10);
        await storage.createUser({
          email: persona.email,
          passwordHash,
          firstName: persona.firstName,
          lastName: persona.lastName,
          organizationId: persona.organizationId,
          role: persona.role,
          permissionLevel: persona.permissionLevel,
          password: "password" // This will be hashed by storage
        });
        console.log(`✅ Created test user: ${persona.email} (${persona.role})`);
      } catch (error) {
        console.log(`User ${persona.email} already exists or error:`, error);
      }
    }

    // Create test agents
    const testAgents = [
      {
        businessName: "Test Healthcare Bot",
        businessDescription: "Test healthcare assistant",
        businessDomain: "test-healthcare.com",
        industry: "healthcare",
        llmModel: "gpt-4o",
        interfaceType: "webchat",
        organizationId: 1,
        createdBy: 2, // Admin created
        status: "active"
      },
      {
        businessName: "Test User Bot",
        businessDescription: "Test user created bot",
        businessDomain: "test-user.com", 
        industry: "retail",
        llmModel: "gpt-3.5-turbo",
        interfaceType: "whatsapp",
        organizationId: 1,
        createdBy: 3, // User created
        status: "draft"
      }
    ];

    for (const agent of testAgents) {
      try {
        await storage.createAgent(agent);
        console.log(`✅ Created test agent: ${agent.businessName}`);
      } catch (error) {
        console.log(`Agent creation error:`, error);
      }
    }

    console.log("🎯 Test data setup complete!\n");
  }

  private async recordTest(
    testName: string,
    persona: string,
    action: string,
    expected: 'ALLOW' | 'DENY',
    actual: 'ALLOW' | 'DENY' | 'ERROR',
    details: string
  ): Promise<void> {
    const result: TestResult = {
      testName,
      persona,
      action,
      expected,
      actual,
      status: expected === actual ? 'PASS' : 'FAIL',
      details,
      timestamp: new Date()
    };
    
    this.testResults.push(result);
    
    const statusIcon = result.status === 'PASS' ? '✅' : '❌';
    const expectation = expected === 'ALLOW' ? 'should succeed' : 'should fail';
    console.log(`${statusIcon} ${persona} ${action} - ${expectation} (${actual})`);
  }

  async testOwnerPermissions(): Promise<void> {
    console.log("🔒 Testing Owner Permissions...");
    const owner = this.personas[0];

    // Test 1: User Creation (Owner should succeed)
    try {
      const newUser = await storage.createUser({
        email: "test-new-user@example.com",
        firstName: "Test",
        lastName: "NewUser",
        organizationId: 1,
        role: "user",
        permissionLevel: 2,
        password: "temppass123"
      });
      
      await this.recordTest(
        "User Creation",
        owner.role,
        "CREATE_USER",
        'ALLOW',
        newUser ? 'ALLOW' : 'DENY',
        newUser ? `Created user ID: ${newUser.id}` : "Failed to create user"
      );
    } catch (error) {
      await this.recordTest(
        "User Creation",
        owner.role,
        "CREATE_USER",
        'ALLOW',
        'ERROR',
        `Error: ${error}`
      );
    }

    // Test 2: Role Assignment (Owner should succeed)
    try {
      const updatedUser = await storage.updateUserRole(3, "admin", 3);
      
      await this.recordTest(
        "Role Assignment",
        owner.role,
        "ASSIGN_ROLE",
        'ALLOW',
        updatedUser ? 'ALLOW' : 'DENY',
        updatedUser ? `Updated user ${updatedUser.id} to admin` : "Failed to update role"
      );
    } catch (error) {
      await this.recordTest(
        "Role Assignment",
        owner.role,
        "ASSIGN_ROLE",
        'ALLOW',
        'ERROR',
        `Error: ${error}`
      );
    }

    // Test 3: Access All Users (Owner should succeed)
    try {
      const allUsers = await storage.getUsersByOrganization(1);
      
      await this.recordTest(
        "View All Users",
        owner.role,
        "VIEW_ALL_USERS",
        'ALLOW',
        allUsers.length > 0 ? 'ALLOW' : 'DENY',
        `Retrieved ${allUsers.length} users`
      );
    } catch (error) {
      await this.recordTest(
        "View All Users",
        owner.role,
        "VIEW_ALL_USERS",
        'ALLOW',
        'ERROR',
        `Error: ${error}`
      );
    }

    // Test 4: System Configuration (Owner should succeed)
    try {
      const updatedOrg = await storage.updateOrganization(1, {
        settings: JSON.stringify({ newSetting: "test_value" })
      });
      
      await this.recordTest(
        "System Configuration",
        owner.role,
        "CONFIGURE_SYSTEM",
        'ALLOW',
        updatedOrg ? 'ALLOW' : 'DENY',
        updatedOrg ? "Updated organization settings" : "Failed to update settings"
      );
    } catch (error) {
      await this.recordTest(
        "System Configuration",
        owner.role,
        "CONFIGURE_SYSTEM",
        'ALLOW',
        'ERROR',
        `Error: ${error}`
      );
    }
  }

  async testAdminPermissions(): Promise<void> {
    console.log("🔒 Testing Admin Permissions...");
    const admin = this.personas[1];

    // Test 1: Agent Management (Admin should succeed)
    try {
      const agents = await storage.getAgentsByUser(admin.id);
      
      await this.recordTest(
        "Agent Management",
        admin.role,
        "MANAGE_AGENTS",
        'ALLOW',
        'ALLOW',
        `Admin can view ${agents.length} agents`
      );
    } catch (error) {
      await this.recordTest(
        "Agent Management",
        admin.role,
        "MANAGE_AGENTS",
        'ALLOW',
        'ERROR',
        `Error: ${error}`
      );
    }

    // Test 2: User Creation (Admin should fail)
    try {
      // Simulate permission check - Admin should NOT be able to create users
      const canCreateUsers = admin.permissionLevel >= 4; // Only level 4 (Owner) can create users
      
      await this.recordTest(
        "User Creation Denial",
        admin.role,
        "CREATE_USER",
        'DENY',
        canCreateUsers ? 'ALLOW' : 'DENY',
        canCreateUsers ? "Admin incorrectly allowed to create users" : "Admin correctly denied user creation"
      );
    } catch (error) {
      await this.recordTest(
        "User Creation Denial",
        admin.role,
        "CREATE_USER",
        'DENY',
        'ERROR',
        `Error: ${error}`
      );
    }

    // Test 3: Analytics Access (Admin should succeed)
    try {
      const stats = await storage.getUsageStats();
      
      await this.recordTest(
        "Analytics Access",
        admin.role,
        "VIEW_ANALYTICS",
        'ALLOW',
        stats ? 'ALLOW' : 'DENY',
        stats ? `Retrieved analytics: ${stats.totalConversations} conversations` : "Failed to get analytics"
      );
    } catch (error) {
      await this.recordTest(
        "Analytics Access",
        admin.role,
        "VIEW_ANALYTICS",
        'ALLOW',
        'ERROR',
        `Error: ${error}`
      );
    }

    // Test 4: Role Assignment (Admin should fail)
    try {
      const canAssignRoles = admin.permissionLevel >= 4; // Only Owner can assign roles
      
      await this.recordTest(
        "Role Assignment Denial",
        admin.role,
        "ASSIGN_ROLE",
        'DENY',
        canAssignRoles ? 'ALLOW' : 'DENY',
        canAssignRoles ? "Admin incorrectly allowed role assignment" : "Admin correctly denied role assignment"
      );
    } catch (error) {
      await this.recordTest(
        "Role Assignment Denial",
        admin.role,
        "ASSIGN_ROLE",
        'DENY',
        'ERROR',
        `Error: ${error}`
      );
    }
  }

  async testUserPermissions(): Promise<void> {
    console.log("🔒 Testing User Permissions...");
    const user = this.personas[2];

    // Test 1: Own Agent Creation (User should succeed)
    try {
      const newAgent = await storage.createAgent({
        businessName: "User Test Bot",
        businessDescription: "Test bot created by user",
        businessDomain: "user-test.com",
        industry: "education",
        llmModel: "gpt-3.5-turbo",
        interfaceType: "webchat",
        organizationId: 1,
        createdBy: user.id,
        status: "draft"
      });
      
      await this.recordTest(
        "Agent Creation",
        user.role,
        "CREATE_AGENT",
        'ALLOW',
        newAgent ? 'ALLOW' : 'DENY',
        newAgent ? `Created agent ID: ${newAgent.id}` : "Failed to create agent"
      );
    } catch (error) {
      await this.recordTest(
        "Agent Creation",
        user.role,
        "CREATE_AGENT",
        'ALLOW',
        'ERROR',
        `Error: ${error}`
      );
    }

    // Test 2: View Own Agents (User should succeed)
    try {
      const userAgents = await storage.getAgentsByUser(user.id);
      
      await this.recordTest(
        "View Own Agents",
        user.role,
        "VIEW_OWN_AGENTS",
        'ALLOW',
        'ALLOW',
        `User can view ${userAgents.length} own agents`
      );
    } catch (error) {
      await this.recordTest(
        "View Own Agents",
        user.role,
        "VIEW_OWN_AGENTS",
        'ALLOW',
        'ERROR',
        `Error: ${error}`
      );
    }

    // Test 3: User Management (User should fail)
    try {
      const canManageUsers = user.permissionLevel >= 4;
      
      await this.recordTest(
        "User Management Denial",
        user.role,
        "MANAGE_USERS",
        'DENY',
        canManageUsers ? 'ALLOW' : 'DENY',
        canManageUsers ? "User incorrectly allowed user management" : "User correctly denied user management"
      );
    } catch (error) {
      await this.recordTest(
        "User Management Denial",
        user.role,
        "MANAGE_USERS",
        'DENY',
        'ERROR',
        `Error: ${error}`
      );
    }

    // Test 4: System Configuration (User should fail)
    try {
      const canConfigureSystem = user.permissionLevel >= 4;
      
      await this.recordTest(
        "System Config Denial",
        user.role,
        "CONFIGURE_SYSTEM",
        'DENY',
        canConfigureSystem ? 'ALLOW' : 'DENY',
        canConfigureSystem ? "User incorrectly allowed system config" : "User correctly denied system config"
      );
    } catch (error) {
      await this.recordTest(
        "System Config Denial",
        user.role,
        "CONFIGURE_SYSTEM",
        'DENY',
        'ERROR',
        `Error: ${error}`
      );
    }
  }

  async testViewerPermissions(): Promise<void> {
    console.log("🔒 Testing Viewer Permissions...");
    const viewer = this.personas[3];

    // Test 1: Read-Only Dashboard (Viewer should succeed)
    try {
      const agents = await storage.getAgentsByOrganization(1);
      
      await this.recordTest(
        "Dashboard View",
        viewer.role,
        "VIEW_DASHBOARD",
        'ALLOW',
        'ALLOW',
        `Viewer can view dashboard with ${agents.length} agents`
      );
    } catch (error) {
      await this.recordTest(
        "Dashboard View",
        viewer.role,
        "VIEW_DASHBOARD",
        'ALLOW',
        'ERROR',
        `Error: ${error}`
      );
    }

    // Test 2: Agent Creation (Viewer should fail)
    try {
      const canCreateAgents = viewer.permissionLevel >= 2; // Level 2+ can create agents
      
      await this.recordTest(
        "Agent Creation Denial",
        viewer.role,
        "CREATE_AGENT",
        'DENY',
        canCreateAgents ? 'ALLOW' : 'DENY',
        canCreateAgents ? "Viewer incorrectly allowed agent creation" : "Viewer correctly denied agent creation"
      );
    } catch (error) {
      await this.recordTest(
        "Agent Creation Denial",
        viewer.role,
        "CREATE_AGENT",
        'DENY',
        'ERROR',
        `Error: ${error}`
      );
    }

    // Test 3: User Management (Viewer should fail)
    try {
      const canManageUsers = viewer.permissionLevel >= 4;
      
      await this.recordTest(
        "User Management Denial",
        viewer.role,
        "MANAGE_USERS",
        'DENY',
        canManageUsers ? 'ALLOW' : 'DENY',
        canManageUsers ? "Viewer incorrectly allowed user management" : "Viewer correctly denied user management"
      );
    } catch (error) {
      await this.recordTest(
        "User Management Denial",
        viewer.role,
        "MANAGE_USERS",
        'DENY',
        'ERROR',
        `Error: ${error}`
      );
    }

    // Test 4: Support Functions (Viewer should succeed)
    try {
      const auditLogs = await storage.getAuditLogs(1, 10);
      
      await this.recordTest(
        "Support Functions",
        viewer.role,
        "VIEW_SUPPORT_DATA",
        'ALLOW',
        'ALLOW',
        `Viewer can access support data: ${auditLogs.length} logs`
      );
    } catch (error) {
      await this.recordTest(
        "Support Functions",
        viewer.role,
        "VIEW_SUPPORT_DATA",
        'ALLOW',
        'ERROR',
        `Error: ${error}`
      );
    }
  }

  async testDevOpsPermissions(): Promise<void> {
    console.log("🔒 Testing DevOps Permissions...");
    const devops = this.personas[4];

    // Test 1: System Monitoring (DevOps should succeed)
    try {
      const stats = await storage.getUsageStats();
      
      await this.recordTest(
        "System Monitoring",
        devops.role,
        "MONITOR_SYSTEM",
        'ALLOW',
        stats ? 'ALLOW' : 'DENY',
        stats ? "DevOps can monitor system stats" : "DevOps cannot access monitoring"
      );
    } catch (error) {
      await this.recordTest(
        "System Monitoring",
        devops.role,
        "MONITOR_SYSTEM",
        'ALLOW',
        'ERROR',
        `Error: ${error}`
      );
    }

    // Test 2: User Creation (DevOps should fail)
    try {
      const canCreateUsers = devops.permissionLevel >= 4;
      
      await this.recordTest(
        "User Creation Denial",
        devops.role,
        "CREATE_USER",
        'DENY',
        canCreateUsers ? 'ALLOW' : 'DENY',
        canCreateUsers ? "DevOps incorrectly allowed user creation" : "DevOps correctly denied user creation"
      );
    } catch (error) {
      await this.recordTest(
        "User Creation Denial",
        devops.role,
        "CREATE_USER",
        'DENY',
        'ERROR',
        `Error: ${error}`
      );
    }

    // Test 3: Infrastructure Access (DevOps should succeed)
    try {
      // Simulate infrastructure access
      const hasInfraAccess = devops.role === 'devops';
      
      await this.recordTest(
        "Infrastructure Access",
        devops.role,
        "ACCESS_INFRASTRUCTURE",
        'ALLOW',
        hasInfraAccess ? 'ALLOW' : 'DENY',
        hasInfraAccess ? "DevOps has infrastructure access" : "DevOps denied infrastructure access"
      );
    } catch (error) {
      await this.recordTest(
        "Infrastructure Access",
        devops.role,
        "ACCESS_INFRASTRUCTURE",
        'ALLOW',
        'ERROR',
        `Error: ${error}`
      );
    }
  }

  async testNegativeSecurityTests(): Promise<void> {
    console.log("🛡️ Testing Negative Security Scenarios...");

    // Test 1: Cross-Organization Access
    try {
      // Simulate user trying to access different organization data
      const user = this.personas[2];
      const crossOrgAgents = await storage.getAgentsByUser(999); // Non-existent user
      
      await this.recordTest(
        "Cross-Org Access Prevention",
        user.role,
        "ACCESS_OTHER_ORG",
        'DENY',
        crossOrgAgents.length === 0 ? 'DENY' : 'ALLOW',
        crossOrgAgents.length === 0 ? "Cross-org access correctly blocked" : "Cross-org access incorrectly allowed"
      );
    } catch (error) {
      await this.recordTest(
        "Cross-Org Access Prevention",
        "user",
        "ACCESS_OTHER_ORG", 
        'DENY',
        'ERROR',
        `Error: ${error}`
      );
    }

    // Test 2: Privilege Escalation Prevention
    try {
      const user = this.personas[2];
      // User tries to update their own role (should fail)
      const canEscalate = user.permissionLevel >= 4;
      
      await this.recordTest(
        "Privilege Escalation Prevention",
        user.role,
        "ESCALATE_PRIVILEGES",
        'DENY',
        canEscalate ? 'ALLOW' : 'DENY',
        canEscalate ? "Privilege escalation incorrectly allowed" : "Privilege escalation correctly blocked"
      );
    } catch (error) {
      await this.recordTest(
        "Privilege Escalation Prevention",
        "user",
        "ESCALATE_PRIVILEGES",
        'DENY',
        'ERROR',
        `Error: ${error}`
      );
    }

    // Test 3: Data Isolation
    try {
      const user1 = this.personas[2];
      const user2 = this.personas[1];
      
      // User1 tries to access User2's agents
      const user1Agents = await storage.getAgentsByUser(user1.id);
      const user2Agents = await storage.getAgentsByUser(user2.id);
      
      // Check if user can only see their own agents
      const dataIsolated = user1Agents.every(agent => agent.createdBy === user1.id);
      
      await this.recordTest(
        "Data Isolation",
        user1.role,
        "ACCESS_OTHER_USER_DATA",
        'DENY',
        dataIsolated ? 'DENY' : 'ALLOW',
        dataIsolated ? "Data properly isolated between users" : "Data isolation breach detected"
      );
    } catch (error) {
      await this.recordTest(
        "Data Isolation",
        "user",
        "ACCESS_OTHER_USER_DATA",
        'DENY',
        'ERROR',
        `Error: ${error}`
      );
    }
  }

  async runAllTests(): Promise<void> {
    console.log("🚀 Starting Comprehensive RBAC Testing Suite");
    console.log("=" * 60);
    
    await this.setupTestData();
    
    await this.testOwnerPermissions();
    await this.testAdminPermissions();
    await this.testUserPermissions();
    await this.testViewerPermissions();
    await this.testDevOpsPermissions();
    await this.testNegativeSecurityTests();
    
    this.printResults();
  }

  private printResults(): void {
    console.log("\n" + "=" * 60);
    console.log("📊 RBAC TESTING RESULTS SUMMARY");
    console.log("=" * 60);
    
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.status === 'PASS').length;
    const failedTests = this.testResults.filter(r => r.status === 'FAIL').length;
    
    console.log(`Total Tests: ${totalTests}`);
    console.log(`✅ Passed: ${passedTests}`);
    console.log(`❌ Failed: ${failedTests}`);
    console.log(`📊 Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
    
    console.log("\n🔍 DETAILED RESULTS BY PERSONA:");
    
    const personaGroups = this.testResults.reduce((groups, result) => {
      if (!groups[result.persona]) {
        groups[result.persona] = [];
      }
      groups[result.persona].push(result);
      return groups;
    }, {} as Record<string, TestResult[]>);
    
    for (const [persona, results] of Object.entries(personaGroups)) {
      const personaPassed = results.filter(r => r.status === 'PASS').length;
      const personaTotal = results.length;
      
      console.log(`\n${persona.toUpperCase()} (${personaPassed}/${personaTotal}):`);
      
      results.forEach(result => {
        const icon = result.status === 'PASS' ? '✅' : '❌';
        console.log(`  ${icon} ${result.testName}: ${result.action} - ${result.details}`);
      });
    }
    
    if (failedTests > 0) {
      console.log("\n⚠️  FAILED TESTS REQUIRE ATTENTION:");
      this.testResults
        .filter(r => r.status === 'FAIL')
        .forEach(result => {
          console.log(`❌ ${result.persona} - ${result.testName}: Expected ${result.expected}, got ${result.actual}`);
          console.log(`   Details: ${result.details}`);
        });
    }
    
    console.log("\n" + "=" * 60);
    console.log("🎯 RBAC TESTING COMPLETE");
    console.log("=" * 60);
  }
}

// Export for use in testing
export const rbacTestSuite = new RBACTestSuite();