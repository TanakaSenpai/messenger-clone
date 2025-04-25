import { createContext } from "react";

import { User } from "app/api/auth";

type AuthContextType = {
  user: User | null;
  setUser: (user: User | null) => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  setUser: () => {},
  loading: true,
});

export {AuthContext};
