import type { KitchenStaffRole } from "@/lib/kuhinja-roles";
import { getStaffMemberByEmail } from "@/lib/admin-system-store";

export const KUHINJA_STAFF_STORAGE_KEY = "emenza-kuhinja-staff";

export type KitchenEmployeeRole = Extract<KitchenStaffRole, "kuvar" | "salter">;

export type KitchenEmployee = {
  id: string;
  email: string;
  displayName: string;
  role: KitchenEmployeeRole;
  active: boolean;
  password?: string;
  mustChangePassword?: boolean;
};

type KitchenStaffState = {
  employees: KitchenEmployee[];
};

const listeners = new Set<() => void>();

function createSeedEmployees(): KitchenEmployee[] {
  return [
    {
      id: "kitchen-employee-1",
      email: "kuvar@emenza.rs",
      displayName: "Marko Kuvar",
      role: "kuvar",
      active: true,
    },
    {
      id: "kitchen-employee-2",
      email: "salter@emenza.rs",
      displayName: "Jovana Operater",
      role: "salter",
      active: true,
    },
  ];
}

function cloneState(state: KitchenStaffState): KitchenStaffState {
  return {
    employees: state.employees.map((employee) => ({ ...employee })),
  };
}

let memoryState: KitchenStaffState | null = null;

function readFromStorage(): KitchenStaffState {
  if (typeof window === "undefined") {
    return { employees: createSeedEmployees() };
  }

  try {
    const raw = localStorage.getItem(KUHINJA_STAFF_STORAGE_KEY);
    if (!raw) {
      return { employees: createSeedEmployees() };
    }

    const parsed = JSON.parse(raw) as Partial<KitchenStaffState>;
    if (!Array.isArray(parsed.employees) || parsed.employees.length === 0) {
      return { employees: createSeedEmployees() };
    }

    return {
      employees: parsed.employees.map((employee) => ({
        id: employee.id,
        email: employee.email.toLowerCase(),
        displayName: employee.displayName,
        role: employee.role === "salter" ? "salter" : "kuvar",
        active: employee.active !== false,
        password: employee.password,
        mustChangePassword: employee.mustChangePassword,
      })),
    };
  } catch {
    return { employees: createSeedEmployees() };
  }
}

function persist(state: KitchenStaffState) {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(KUHINJA_STAFF_STORAGE_KEY, JSON.stringify(state));
}

function notify() {
  listeners.forEach((listener) => listener());
}

export function hydrateKitchenStaffFromStorage() {
  if (typeof window === "undefined" || memoryState) {
    return;
  }

  memoryState = readFromStorage();
}

export function loadKitchenStaffState(): KitchenStaffState {
  if (typeof window === "undefined") {
    return { employees: createSeedEmployees() };
  }

  if (!memoryState) {
    memoryState = readFromStorage();
  }

  return cloneState(memoryState);
}

export function subscribeKitchenStaff(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getKitchenEmployees(): KitchenEmployee[] {
  return loadKitchenStaffState().employees.filter((employee) => employee.active);
}

export function getKitchenEmployeeByEmail(email: string): KitchenEmployee | null {
  const normalizedEmail = email.trim().toLowerCase();
  return (
    getKitchenEmployees().find((employee) => employee.email === normalizedEmail) ?? null
  );
}

/** Keep in sync with `KUHINJA_MOCK_ACCOUNTS` in `kuhinja-mock.ts`. */
const KITCHEN_MOCK_ROLE_BY_EMAIL: Record<string, KitchenStaffRole> = {
  "moderator@emenza.rs": "moderator",
  "kuvar@emenza.rs": "kuvar",
  "salter@emenza.rs": "salter",
  "kuhinja@emenza.rs": "moderator",
};

export function resolveKitchenStaffRole(
  email: string,
  fallback: KitchenStaffRole,
): KitchenStaffRole {
  const normalizedEmail = email.trim().toLowerCase();

  const adminStaff = getStaffMemberByEmail(normalizedEmail);
  if (
    adminStaff &&
    (adminStaff.role === "moderator" ||
      adminStaff.role === "kuvar" ||
      adminStaff.role === "salter")
  ) {
    return adminStaff.role;
  }

  const mockRole = KITCHEN_MOCK_ROLE_BY_EMAIL[normalizedEmail];
  if (mockRole) {
    return mockRole;
  }

  const employee = getKitchenEmployeeByEmail(normalizedEmail);
  if (employee) {
    return employee.role;
  }

  if (fallback === "moderator" || fallback === "kuvar" || fallback === "salter") {
    return fallback;
  }

  return "moderator";
}

export function updateKitchenEmployeeRole(id: string, role: KitchenEmployeeRole) {
  const state = loadKitchenStaffState();
  const nextState: KitchenStaffState = {
    employees: state.employees.map((employee) =>
      employee.id === id ? { ...employee, role } : employee,
    ),
  };

  memoryState = nextState;
  persist(nextState);
  notify();
}

export function updateKitchenEmployeePassword(
  email: string,
  newPassword: string,
): boolean {
  const state = loadKitchenStaffState();
  const idx = state.employees.findIndex(
    (e) => e.email.toLowerCase() === email.trim().toLowerCase(),
  );
  if (idx === -1) return false;

  const updated = {
    ...state.employees[idx],
    password: newPassword,
    mustChangePassword: false,
  };

  const nextState: KitchenStaffState = {
    employees: state.employees.map((e, i) => (i === idx ? updated : e)),
  };

  memoryState = nextState;
  persist(nextState);
  notify();

  return true;
}

export function createKitchenEmployee(input: {
  email: string;
  displayName: string;
  role: KitchenEmployeeRole;
  password: string;
  mustChangePassword?: boolean;
}): KitchenEmployee {
  const employee: KitchenEmployee = {
    id: `kitchen-employee-${Date.now()}`,
    email: input.email.trim().toLowerCase(),
    displayName: input.displayName.trim(),
    role: input.role,
    active: true,
    password: input.password,
    mustChangePassword: input.mustChangePassword,
  };

  const state = loadKitchenStaffState();
  const nextState: KitchenStaffState = {
    employees: [employee, ...state.employees],
  };

  memoryState = nextState;
  persist(nextState);
  notify();

  return employee;
}

export function deleteKitchenEmployee(email: string) {
  const normalized = email.trim().toLowerCase();
  const state = loadKitchenStaffState();
  const nextState: KitchenStaffState = {
    employees: state.employees.filter((e) => e.email !== normalized),
  };
  memoryState = nextState;
  persist(nextState);
  notify();
}

export function findKitchenEmployeeByCredentials(
  email: string,
  password: string,
): KitchenEmployee | null {
  const normalizedEmail = email.trim().toLowerCase();
  const employee = getKitchenEmployeeByEmail(normalizedEmail);
  if (employee && employee.password === password) {
    return employee;
  }
  return null;
}
