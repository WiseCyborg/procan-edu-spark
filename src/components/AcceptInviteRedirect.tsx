import { Navigate, useSearchParams } from 'react-router-dom';

/** Forwards the legacy `/accept-invite` path to the canonical acceptance page. */
export const AcceptInviteRedirect = () => {
  const [params] = useSearchParams();
  const token = params.get('token');
  const target = token
    ? `/accept-invitation?token=${encodeURIComponent(token)}`
    : '/accept-invitation';
  return <Navigate to={target} replace />;
};

export default AcceptInviteRedirect;
