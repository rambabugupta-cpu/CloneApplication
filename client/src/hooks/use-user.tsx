import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";

interface User {
  id: string;
  email: string;
  fullName?: string;
  name?: string;
  role: "owner" | "admin" | "staff" | "customer";
}

interface UserContextType {
  user: User | null;
  isLoading: boolean;
  refetch: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const { data: user, isLoading, refetch } = useQuery({
    queryKey: ["/api/auth/me"],
    retry: false,
  });

  return (
    <UserContext.Provider value={{ user, isLoading, refetch }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}