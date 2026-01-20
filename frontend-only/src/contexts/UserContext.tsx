import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  name: string;
  isAdmin: boolean;
}

interface UserContextType {
  user: User | null;
  login: (name: string, password: string) => boolean;
  logout: () => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

const VALID_USERS = ['Nico', 'Rick', 'Sydney', 'Randy', 'Whitney'];
const ADMIN_USERS = ['Nico', 'Whitney'];
const PASSWORD = 'Glue123!';

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    // Check localStorage for saved user
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        // Ensure isAdmin is up to date based on the name
        return {
          ...parsed,
          isAdmin: ADMIN_USERS.includes(parsed.name)
        };
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
      setUser({ 
        name, 
        isAdmin: ADMIN_USERS.includes(name)
      });
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <UserContext.Provider value={{ 
      user, 
      login, 
      logout, 
      isAuthenticated: !!user,
      isAdmin: user?.isAdmin || false
    }}>
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

