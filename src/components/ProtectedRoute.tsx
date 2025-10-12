interface ProtectedRouteProps {
  children: React.ReactNode;
  featureCode?: string;
  requiredRoles?: string[];
  projectId?: string;
}

export const ProtectedRoute = ({
  children,
}: ProtectedRouteProps) => {
  // No permission checks - all users can access everything
  return <>{children}</>;
};
