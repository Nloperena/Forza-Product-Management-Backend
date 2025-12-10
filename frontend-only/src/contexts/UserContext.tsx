import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  name: string;
}

interface UserContextType {
  user: User | null;
  login: (name: string, password: string) => boolean;
  logout: () => void;
  isAuthenticated: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

const VALID_USERS = ['Nico', 'Rick', 'Sydney', 'Randy', 'Whitney'];
const PASSWORD = 'Glue123!';

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    // Check localStorage for saved user
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        return JSON.parse(savedUser);
      } catch {
        return null;
      }
    }
    return null;
  });

  useEffect(() => {
    // Save user to localStorage when it changes
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('user');
    }
  }, [user]);

  const login = (name: string, password: string): boolean => {
    if (VALID_USERS.includes(name) && password === PASSWORD) {
      setUser({ name });
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <UserContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = (): UserContextType => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

